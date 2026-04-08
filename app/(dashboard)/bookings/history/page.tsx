"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { TaskAlertPanel } from "@/components/tasks/TaskAlertPanel"
import { TaskChecklistPanel } from "@/components/tasks/TaskChecklistPanel"
import { getBookingsModuleTexts } from "@/lib/i18n/translations"
import {
  getPriorityLabel,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from "@/lib/i18n/labels"
import { normalizePriority } from "@/lib/i18n/normalizers"

type BookingTask = {
  id: string
  title: string
  taskType: string
  status: string
  source: string
  priority: string
  scheduledDate: string
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  dueDate?: string | null
  alertEnabled: boolean
  alertAt?: string | null
  createdAt: string
  assignments?: Array<{
    id: string
    status: string
  }>
}

type BookingRow = {
  id: string
  sourcePlatform: string
  externalBookingId: string
  externalListingId?: string | null
  externalListingName?: string | null
  guestName?: string | null
  guestPhone?: string | null
  guestEmail?: string | null
  checkInDate: string
  checkOutDate: string
  checkInTime?: string | null
  checkOutTime?: string | null
  status: string
  syncStatus: string
  needsMapping: boolean
  notes?: string | null
  taskStatus?: "no_task" | "created" | "assigned" | "completed" | string
  property?: {
    id: string
    code: string
    name: string
    address?: string | null
    city?: string | null
    region?: string | null
    status?: string | null
    defaultPartner?: {
      id: string
      code: string
      name: string
      email?: string | null
    } | null
  } | null
  tasks: BookingTask[]
}

type WorkWindowRow = {
  id: string
  booking: BookingRow
  nextBooking: BookingRow | null
  windowStartDateTime: Date
  windowEndDateTime: Date | null
  windowDurationMinutes: number | null
  propertyFilterKey: string
  propertyFilterLabel: string
  hasTask: boolean
}

type ModeKey = "active" | "with_task" | "without_task"
type CalendarViewMode = "month" | "day"

type TaskCreateModalState = {
  open: boolean
  windowRow: WorkWindowRow | null
}

type PartnerOption = {
  id: string
  name: string
  code?: string | null
  email?: string | null
  status?: string | null
  specialty?: string | null
}

function normalizeModeQuery(value: string | null): ModeKey {
  if (value === "with_task") return "with_task"
  if (value === "without_task") return "without_task"
  if (value === "history") return "with_task"
  return "active"
}

function isValidTimeString(value?: string | null) {
  if (!value) return false
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim())
}

function formatTime(value?: string | null) {
  if (!value || !isValidTimeString(value)) return ""
  return value.trim().slice(0, 5)
}

function combineDateTime(dateValue: string, timeValue?: string | null) {
  const datePart = new Date(dateValue).toISOString().slice(0, 10)
  const timePart = formatTime(timeValue) || "00:00"
  return new Date(`${datePart}T${timePart}:00`)
}

function formatDateTime(
  value: Date | string | null | undefined,
  locale: string,
  emptyText: string
) {
  if (!value) return emptyText
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return emptyText

  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isOpenTaskStatus(status: string | null | undefined) {
  return [
    "new",
    "pending",
    "assigned",
    "waiting_acceptance",
    "accepted",
    "in_progress",
  ].includes(String(status || "").trim().toLowerCase())
}

function isTaskAlertActive(task: BookingTask | null | undefined) {
  if (!task?.alertEnabled || !task.alertAt) return false
  if (!isOpenTaskStatus(task.status)) return false

  const alertDate = new Date(task.alertAt)
  if (Number.isNaN(alertDate.getTime())) return false

  return alertDate.getTime() <= Date.now()
}

function toDateInputValue(value?: string | Date | null) {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Date(date).toISOString().slice(0, 10)
}

function toTimeInputValue(value?: string | Date | null) {
  if (!value) return ""

  if (typeof value === "string") {
    return formatTime(value)
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hours = String(value.getHours()).padStart(2, "0")
    const minutes = String(value.getMinutes()).padStart(2, "0")
    return `${hours}:${minutes}`
  }

  return ""
}

function toDateTimeLocalValue(date?: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function getMonthLabel(date: Date, locale: string) {
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  })
}

function buildMonthDays(cursor: Date) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const start = new Date(firstDay)
  const dayOfWeek = (firstDay.getDay() + 6) % 7
  start.setDate(firstDay.getDate() - dayOfWeek)

  const end = new Date(lastDay)
  const endDayOfWeek = (lastDay.getDay() + 6) % 7
  end.setDate(lastDay.getDate() + (6 - endDayOfWeek))

  const days: Date[] = []
  const current = new Date(start)

  while (current <= end) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return days
}

function sameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function getWeekdayLabels(language: "el" | "en") {
  return language === "en"
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"]
}

function normalizeDateOnlyValue(value?: string | Date | null) {
  if (!value) return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString().slice(0, 10)
  }

  const text = String(value).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  return text
}

function isDateInRange(
  targetDate?: string | Date | null,
  fromDate?: string,
  toDate?: string
) {
  const normalizedTarget = normalizeDateOnlyValue(targetDate)
  if (!normalizedTarget) return false

  if (fromDate && normalizedTarget < fromDate) return false
  if (toDate && normalizedTarget > toDate) return false

  return true
}

function isCancelledBooking(status: string) {
  return String(status || "").trim().toLowerCase() === "cancelled"
}

function getBadgeClassName(kind: "neutral" | "success" | "warning" | "danger") {
  if (kind === "success") {
    return "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
  }

  if (kind === "warning") {
    return "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
  }

  if (kind === "danger") {
    return "rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700"
  }

  return "rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
}

function normalizeSourcePlatform(
  sourcePlatform: string,
  texts: ReturnType<typeof getBookingsModuleTexts>
) {
  const normalized = sourcePlatform.trim().toUpperCase()

  if (normalized === "AIRBNB") return texts.platforms.airbnb
  if (normalized === "BOOKING_COM") return texts.platforms.booking
  if (normalized === "VRBO") return texts.platforms.vrbo
  if (normalized === "DIRECT") return texts.platforms.direct
  if (normalized === "MANUAL") return texts.platforms.manual

  return sourcePlatform
}

function getSyncLabel(
  syncStatus: string,
  needsMapping: boolean,
  texts: ReturnType<typeof getBookingsModuleTexts>
) {
  if (syncStatus === "CANCELLED") return texts.statuses.cancelled
  if (needsMapping) return texts.statuses.needsMapping
  if (syncStatus === "READY_FOR_ACTION") return texts.statuses.readyForAction
  if (syncStatus === "ERROR") return texts.statuses.error
  if (syncStatus === "PENDING_MATCH") return texts.statuses.pendingMatch
  return syncStatus
}

function getGroupingKey(booking: BookingRow) {
  if (booking.property?.id) return `property:${booking.property.id}`

  const listingId = String(booking.externalListingId || "").trim()
  if (listingId) return `listing:${booking.sourcePlatform}:${listingId}`

  const listingName = String(booking.externalListingName || "")
    .trim()
    .toLowerCase()
  if (listingName) return `listing-name:${booking.sourcePlatform}:${listingName}`

  return `booking:${booking.id}`
}

function getPropertyFilterKey(booking: BookingRow) {
  if (booking.property?.id) return `property:${booking.property.id}`

  const listingId = String(booking.externalListingId || "").trim()
  if (listingId) return `listing:${booking.sourcePlatform}:${listingId}`

  const listingName = String(booking.externalListingName || "").trim()
  if (listingName) return `listing-name:${booking.sourcePlatform}:${listingName}`

  return `booking:${booking.id}`
}

function getPropertyFilterLabel(
  booking: BookingRow,
  fallbackText: string
) {
  if (booking.property?.name) return booking.property.name
  if (booking.property?.code) return booking.property.code
  if (booking.externalListingName) return booking.externalListingName
  if (booking.externalListingId) return booking.externalListingId
  return fallbackText
}

function buildWorkWindows(
  bookings: BookingRow[],
  propertyFallbackText: string
) {
  const grouped = new Map<string, BookingRow[]>()

  for (const booking of bookings) {
    const key = getGroupingKey(booking)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(booking)
  }

  const windows: WorkWindowRow[] = []

  for (const group of grouped.values()) {
    const sorted = [...group].sort((a, b) => {
      const aTime = combineDateTime(a.checkOutDate, a.checkOutTime).getTime()
      const bTime = combineDateTime(b.checkOutDate, b.checkOutTime).getTime()
      return aTime - bTime
    })

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i]
      const currentCheckout = combineDateTime(
        current.checkOutDate,
        current.checkOutTime
      )

      let nextBooking: BookingRow | null = null

      for (let j = i + 1; j < sorted.length; j++) {
        const candidate = sorted[j]
        const candidateCheckIn = combineDateTime(
          candidate.checkInDate,
          candidate.checkInTime
        )

        if (candidateCheckIn.getTime() > currentCheckout.getTime()) {
          nextBooking = candidate
          break
        }
      }

      const windowEndDateTime = nextBooking
        ? combineDateTime(nextBooking.checkInDate, nextBooking.checkInTime)
        : null

      let windowDurationMinutes: number | null = null

      if (windowEndDateTime) {
        const diff = Math.floor(
          (windowEndDateTime.getTime() - currentCheckout.getTime()) / 60000
        )
        windowDurationMinutes = diff > 0 ? diff : 0
      }

      windows.push({
        id: current.id,
        booking: current,
        nextBooking,
        windowStartDateTime: currentCheckout,
        windowEndDateTime,
        windowDurationMinutes,
        propertyFilterKey: getPropertyFilterKey(current),
        propertyFilterLabel: getPropertyFilterLabel(current, propertyFallbackText),
        hasTask: current.tasks.length > 0,
      })
    }
  }

  return windows.sort((a, b) => {
    return a.windowStartDateTime.getTime() - b.windowStartDateTime.getTime()
  })
}

function getWindowDurationLabel(
  durationMinutes: number | null | undefined,
  language: "el" | "en"
) {
  if (!durationMinutes || durationMinutes <= 0) {
    return language === "en" ? "Open window" : "Ανοιχτό παράθυρο"
  }

  const totalHours = durationMinutes / 60

  if (totalHours >= 24) {
    const days = totalHours / 24
    const rounded = Number.isInteger(days) ? String(days) : days.toFixed(1)
    return language === "en"
      ? `${rounded} days`
      : `${rounded} ημέρες`
  }

  const roundedHours = Number.isInteger(totalHours)
    ? String(totalHours)
    : totalHours.toFixed(1)

  return language === "en"
    ? `${roundedHours} hours`
    : `${roundedHours} ώρες`
}

function getWindowCalendarLabel(
  windowRow: WorkWindowRow,
  locale: string,
  language: "el" | "en"
) {
  const propertyText =
    windowRow.booking.property?.name ||
    windowRow.booking.property?.code ||
    windowRow.booking.externalListingName ||
    windowRow.booking.externalListingId ||
    (language === "en" ? "Property" : "Ακίνητο")

  const start = windowRow.windowStartDateTime.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

  const end = windowRow.windowEndDateTime
    ? windowRow.windowEndDateTime.toLocaleString(locale, {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : language === "en"
      ? "No next check-in"
      : "Χωρίς επόμενο check-in"

  return `${propertyText} · ${start} - ${end}`
}

function getBookingAddressDisplay(
  booking: BookingRow,
  fallbackText: string
) {
  if (!booking.needsMapping && booking.property) {
    return [booking.property.address, booking.property.city, booking.property.region]
      .filter(Boolean)
      .join(" · ") || fallbackText
  }

  return booking.externalListingName || booking.externalListingId || fallbackText
}

function normalizeTaskTitle(
  title: string | null | undefined,
  language: "el" | "en"
) {
  if (!title || !title.trim()) return "-"

  let text = title.trim()

  if (language === "en") {
    text = text
      .replace(/^Καθαρισμός μετά από check-out\s*-\s*/i, "Cleaning after check-out - ")
      .replace(/^Καθαρισμος μετά από check-out\s*-\s*/i, "Cleaning after check-out - ")
      .replace(/^Επιθεώρηση μετά από check-out\s*-\s*/i, "Inspection after check-out - ")
      .replace(/^Επιθεωρηση μετά από check-out\s*-\s*/i, "Inspection after check-out - ")
      .replace(/^Συντήρηση μετά από check-out\s*-\s*/i, "Maintenance after check-out - ")
      .replace(/^Συντηρηση μετά από check-out\s*-\s*/i, "Maintenance after check-out - ")
      .replace(/^Καθαρισμός\s*-\s*/i, "Cleaning - ")
      .replace(/^Καθαρισμος\s*-\s*/i, "Cleaning - ")
      .replace(/^Επιθεώρηση\s*-\s*/i, "Inspection - ")
      .replace(/^Επιθεωρηση\s*-\s*/i, "Inspection - ")
      .replace(/^Συντήρηση\s*-\s*/i, "Maintenance - ")
      .replace(/^Συντηρηση\s*-\s*/i, "Maintenance - ")
    return text
  }

  text = text
    .replace(/^Cleaning after check-out\s*-\s*/i, "Καθαρισμός μετά από check-out - ")
    .replace(/^Inspection after check-out\s*-\s*/i, "Επιθεώρηση μετά από check-out - ")
    .replace(/^Maintenance after check-out\s*-\s*/i, "Συντήρηση μετά από check-out - ")
    .replace(/^Cleaning\s*-\s*/i, "Καθαρισμός - ")
    .replace(/^Inspection\s*-\s*/i, "Επιθεώρηση - ")
    .replace(/^Maintenance\s*-\s*/i, "Συντήρηση - ")

  return text
}

function getTaskTypeDisplay(
  taskType: string | null | undefined,
  language: "el" | "en",
  texts: ReturnType<typeof getBookingsModuleTexts>
) {
  const normalized = String(taskType || "").trim().toLowerCase()

  if (normalized === "maintenance") {
    return texts.modal.taskTypes.maintenance
  }

  if (normalized === "custom") {
    return texts.modal.taskTypes.custom
  }

  return getTaskTypeLabel(language, taskType)
}

function getTaskStatusDisplay(
  status: string | null | undefined,
  language: "el" | "en"
) {
  return getTaskStatusLabel(language, status)
}

function getPriorityDisplay(
  priority: string | null | undefined,
  language: "el" | "en"
) {
  const normalized = normalizePriority(priority)

  if (normalized === "NORMAL") {
    return language === "en" ? "Normal" : "Κανονική"
  }

  return getPriorityLabel(language, priority)
}

function getLocalTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      title: "Bookings calendar",
      description:
        "The calendar shows clean operational work windows from check-out until the next check-in. Open-ended windows are shown only on their start day, so the month stays readable.",
      monthView: "Month view",
      dayView: "Day view",
      noSelection: "Select a window from the calendar.",
      noResults: "No windows found.",
      propertyCounters: "Window counters by property",
      propertyCountersHelp:
        "Counts the filtered work windows per property after search and date filters.",
      allProperties: "All properties",
      selectedWindow: "Selected window",
      selectedWindowHelp:
        "Shows the operational details of the currently selected work window without repeating the same information twice.",
      selectedDay: "Selected day",
      searchPlaceholder: "Search by property, guest, listing, booking...",
      searchHelp:
        "Search by property, guest, listing or booking code.",
      createTask: "Create task",
      createTaskHelp:
        "Create a new task for this work window.",
      viewBooking: "View booking",
      viewBookingHelp:
        "Open the details page of the booking that generated this window.",
      viewProperty: "View property",
      viewPropertyHelp:
        "Open the mapped property of this booking.",
      viewPropertyTasks: "View property tasks",
      viewPropertyTasksHelp:
        "Open the global tasks page filtered only for this property.",
      checkoutDateTime: "Check-out",
      checkoutDateTimeHelp:
        "The exact check-out date and time that starts this work window.",
      nextCheckinDateTime: "Next check-in",
      nextCheckinDateTimeHelp:
        "The next check-in that closes this work window. If there is none, the window remains open.",
      duration: "Duration",
      durationHelp:
        "The total available time between check-out and the next check-in.",
      systemProperty: "Property in system",
      systemPropertyHelp:
        "The property currently linked to this booking inside the OPS system.",
      rangeTitle: "Window period",
      rangeTitleHelp:
        "The exact operational range from the start of the window until its closing check-in.",
      from: "From",
      fromHelp:
        "The start of the work window.",
      to: "To",
      toHelp:
        "The end of the work window or an open state when no next check-in exists.",
      noNextCheckin: "No next check-in",
      openWindowShort: "Open window",
      activeHint:
        "All visible operational windows after the current filters.",
      withTaskHint:
        "Filtered windows that already have a linked task.",
      withoutTaskHint:
        "Filtered windows that still do not have a linked task.",
      assignNowTitle: "Immediate assignment",
      assignNowDescription:
        "Optionally assign the task directly to a partner during creation.",
      assignNow: "Assign immediately to partner",
      partnerLabel: "Partner",
      defaultPartnerHint: "Default property partner selected automatically.",
      noPartners: "No partners found.",
      withTaskBadge: "With task",
      withoutTaskBadge: "No task yet",
      needsMappingBadge: "Needs mapping",
      backToBookings: "Back to bookings",
      dateFrom: "From date",
      dateTo: "To date",
      dateRangeHelp:
        "Filter windows by check-out date.",
      propertyFilter: "Property",
      propertyFilterHelp:
        "Filter the calendar and the selected window by property.",
      clearFilters: "Clear filters",
      clearFiltersHelp:
        "Reset search, property filter and date range.",
      monthViewHelp:
        "Month view shows each window only on its check-out day, so the calendar stays clean.",
      dayViewHelp:
        "Day view shows only the windows that start on the selected day.",
      allWindowsCounter: "Active windows",
      withTaskCounter: "Windows with task",
      withoutTaskCounter: "Windows without task",
      listTaskTitle: "Linked task",
      noPropertyMessage:
        "This booking is not mapped to a property yet.",
      viewSelectedOnly:
        "The panel below shows only the selected window.",
    }
  }

  return {
    title: "Ημερολόγιο κρατήσεων",
    description:
      "Το ημερολόγιο δείχνει καθαρά τα λειτουργικά παράθυρα εργασίας από το check-out μέχρι το επόμενο check-in. Τα ανοιχτά παράθυρα εμφανίζονται μόνο στην ημέρα εκκίνησης ώστε ο μήνας να μένει καθαρός.",
    monthView: "Προβολή μήνα",
    dayView: "Προβολή ημέρας",
    noSelection: "Επίλεξε ένα παράθυρο από το ημερολόγιο.",
    noResults: "Δεν βρέθηκαν παράθυρα.",
    propertyCounters: "Παράθυρα ανά ακίνητο",
    propertyCountersHelp:
      "Μετρά τα φιλτραρισμένα παράθυρα εργασίας ανά ακίνητο μετά την αναζήτηση και τα φίλτρα ημερομηνίας.",
    allProperties: "Όλα τα ακίνητα",
    selectedWindow: "Επιλεγμένο παράθυρο",
    selectedWindowHelp:
      "Δείχνει τα λειτουργικά στοιχεία του παραθύρου που έχεις επιλέξει χωρίς διπλές πληροφορίες.",
    selectedDay: "Επιλεγμένη ημέρα",
    searchPlaceholder: "Αναζήτηση με ακίνητο, επισκέπτη, listing, κράτηση...",
    searchHelp:
      "Αναζήτηση με ακίνητο, επισκέπτη, listing ή κωδικό κράτησης.",
    createTask: "Δημιουργία εργασίας",
    createTaskHelp:
      "Δημιουργεί νέα εργασία για αυτό το παράθυρο εργασίας.",
    viewBooking: "Προβολή κράτησης",
    viewBookingHelp:
      "Ανοίγει τη σελίδα λεπτομερειών της κράτησης που δημιούργησε αυτό το παράθυρο.",
    viewProperty: "Προβολή ακινήτου",
    viewPropertyHelp:
      "Ανοίγει το αντιστοιχισμένο ακίνητο αυτής της κράτησης.",
    viewPropertyTasks: "Προβολή εργασιών ακινήτου",
    viewPropertyTasksHelp:
      "Ανοίγει τη global σελίδα εργασιών φιλτραρισμένη μόνο για το συγκεκριμένο ακίνητο.",
    checkoutDateTime: "Check-out",
    checkoutDateTimeHelp:
      "Η ακριβής ημερομηνία και ώρα check-out που ξεκινά αυτό το παράθυρο εργασίας.",
    nextCheckinDateTime: "Επόμενο check-in",
    nextCheckinDateTimeHelp:
      "Το επόμενο check-in που κλείνει αυτό το παράθυρο εργασίας. Αν δεν υπάρχει, το παράθυρο παραμένει ανοιχτό.",
    duration: "Διάρκεια",
    durationHelp:
      "Ο συνολικός διαθέσιμος χρόνος ανάμεσα στο check-out και το επόμενο check-in.",
    systemProperty: "Ακίνητο",
    systemPropertyHelp:
      "Το ακίνητο που είναι σήμερα συνδεδεμένο με αυτή την κράτηση μέσα στο OPS.",
    rangeTitle: "Παράθυρο εργασίας",
    rangeTitleHelp:
      "Το ακριβές λειτουργικό διάστημα από την έναρξη του παραθύρου μέχρι το check-in που το κλείνει.",
    from: "Από",
    fromHelp:
      "Η αρχή του παραθύρου εργασίας.",
    to: "Έως",
    toHelp:
      "Το τέλος του παραθύρου ή κατάσταση ανοιχτού παραθύρου όταν δεν υπάρχει επόμενο check-in.",
    noNextCheckin: "Δεν υπάρχει επόμενο check-in",
    openWindowShort: "Ανοιχτό παράθυρο",
    activeHint:
      "Όλα τα ορατά λειτουργικά παράθυρα μετά τα τρέχοντα φίλτρα.",
    withTaskHint:
      "Τα φιλτραρισμένα παράθυρα που έχουν ήδη συνδεδεμένη εργασία.",
    withoutTaskHint:
      "Τα φιλτραρισμένα παράθυρα που δεν έχουν ακόμη συνδεδεμένη εργασία.",
    assignNowTitle: "Άμεση ανάθεση",
    assignNowDescription:
      "Προαιρετικά μπορείς να αναθέσεις απευθείας την εργασία σε συνεργάτη κατά τη δημιουργία.",
    assignNow: "Άμεση ανάθεση σε συνεργάτη",
    partnerLabel: "Συνεργάτης",
    defaultPartnerHint:
      "Ο προεπιλεγμένος συνεργάτης του ακινήτου επιλέχθηκε αυτόματα.",
    noPartners: "Δεν βρέθηκαν συνεργάτες.",
    withTaskBadge: "Με εργασία",
    withoutTaskBadge: "Χωρίς εργασία",
    needsMappingBadge: "Χρειάζεται αντιστοίχιση",
    backToBookings: "Επιστροφή στις κρατήσεις",
    dateFrom: "Από",
    dateTo: "Έως",
    dateRangeHelp:
      "Φιλτράρει τα παράθυρα με βάση την ημερομηνία check-out.",
    propertyFilter: "Ακίνητο",
    propertyFilterHelp:
      "Φιλτράρει ημερολόγιο και επιλεγμένο παράθυρο ανά ακίνητο.",
    clearFilters: "Καθαρισμός φίλτρων",
    clearFiltersHelp:
      "Καθαρίζει αναζήτηση, φίλτρο ακινήτου και εύρος ημερομηνιών.",
    monthViewHelp:
      "Η προβολή μήνα δείχνει κάθε παράθυρο μόνο στην ημέρα του check-out ώστε το ημερολόγιο να μένει καθαρό.",
    dayViewHelp:
      "Η προβολή ημέρας δείχνει μόνο τα παράθυρα που ξεκινούν την επιλεγμένη ημέρα.",
    allWindowsCounter: "Ενεργά παράθυρα",
    withTaskCounter: "Παράθυρα με εργασία",
    withoutTaskCounter: "Παράθυρα χωρίς εργασία",
    listTaskTitle: "Συνδεδεμένη εργασία",
    noPropertyMessage:
      "Η κράτηση δεν έχει αντιστοιχιστεί ακόμη με ακίνητο.",
    viewSelectedOnly:
      "Το πεδίο παρακάτω δείχνει μόνο το επιλεγμένο παράθυρο.",
  }
}

export default function BookingsHistoryPage() {
  const { language } = useAppLanguage()
  const texts = getBookingsModuleTexts(language)
  const ui = getLocalTexts(language)
  const locale = language === "en" ? "en-GB" : "el-GR"

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentQuery = searchParams.toString()

  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [monthCursor, setMonthCursor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [mode, setMode] = useState<ModeKey>(
    normalizeModeQuery(searchParams.get("mode"))
  )
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>(
    (searchParams.get("view") as CalendarViewMode) || "month"
  )
  const [selectedPropertyFilterKey, setSelectedPropertyFilterKey] = useState(
    searchParams.get("propertyId") || "all"
  )
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "")
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "")

  const [modal, setModal] = useState<TaskCreateModalState>({
    open: false,
    windowRow: null,
  })
  const [submittingTask, setSubmittingTask] = useState(false)

  const [taskType, setTaskType] = useState("cleaning")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledStartTime, setScheduledStartTime] = useState("")
  const [scheduledEndTime, setScheduledEndTime] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [priority, setPriority] = useState("normal")
  const [notes, setNotes] = useState("")
  const [alertEnabled, setAlertEnabled] = useState(false)
  const [alertAt, setAlertAt] = useState("")
  const [sendCleaningChecklist, setSendCleaningChecklist] = useState(true)
  const [sendSuppliesChecklist, setSendSuppliesChecklist] = useState(true)

  const [assignImmediately, setAssignImmediately] = useState(false)
  const [assignPartnerId, setAssignPartnerId] = useState("")

  useEffect(() => {
    setSearch(searchParams.get("search") || "")
    setMode(normalizeModeQuery(searchParams.get("mode")))
    setCalendarViewMode(
      (searchParams.get("view") as CalendarViewMode) || "month"
    )
    setSelectedPropertyFilterKey(searchParams.get("propertyId") || "all")
    setDateFrom(searchParams.get("dateFrom") || "")
    setDateTo(searchParams.get("dateTo") || "")
  }, [currentQuery, searchParams])

  useEffect(() => {
    const params = new URLSearchParams()

    if (search.trim()) params.set("search", search.trim())
    if (mode !== "active") params.set("mode", mode)
    if (calendarViewMode !== "month") params.set("view", calendarViewMode)
    if (selectedPropertyFilterKey !== "all") {
      params.set("propertyId", selectedPropertyFilterKey)
    }
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)

    const nextQuery = params.toString()

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      })
    }
  }, [
    search,
    mode,
    calendarViewMode,
    selectedPropertyFilterKey,
    dateFrom,
    dateTo,
    pathname,
    router,
    currentQuery,
  ])

  async function loadBookings() {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/bookings", { cache: "no-store" })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || texts.history.loadError)
      }

      setBookings(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.history.loadError)
    } finally {
      setLoading(false)
    }
  }

  async function loadPartners() {
    try {
      const response = await fetch("/api/partners", { cache: "no-store" })
      if (!response.ok) return

      const data = await response.json()

      if (Array.isArray(data)) {
        setPartners(data)
        return
      }

      if (Array.isArray(data?.partners)) {
        setPartners(data.partners)
      }
    } catch {
      setPartners([])
    }
  }

  useEffect(() => {
    loadBookings()
    loadPartners()
  }, [language])

  const allWindows = useMemo(
    () => buildWorkWindows(bookings, texts.list.propertyNotMapped),
    [bookings, texts.list.propertyNotMapped]
  )

  const nonCancelledWindows = useMemo(() => {
    return allWindows.filter((windowRow) => !isCancelledBooking(windowRow.booking.status))
  }, [allWindows])

  const searchedWindows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return nonCancelledWindows.filter((windowRow) => {
      const booking = windowRow.booking

      const matchesDate = isDateInRange(
        booking.checkOutDate,
        dateFrom || undefined,
        dateTo || undefined
      )

      if (!matchesDate) return false

      if (!normalizedSearch) return true

      const haystack = [
        booking.externalBookingId,
        booking.externalListingId,
        booking.externalListingName,
        booking.guestName,
        booking.property?.name,
        booking.property?.code,
        booking.property?.address,
        booking.property?.city,
        booking.property?.region,
        booking.sourcePlatform,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [nonCancelledWindows, search, dateFrom, dateTo])

  const propertyCounters = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string
        label: string
        count: number
      }
    >()

    for (const windowRow of searchedWindows) {
      const existing = map.get(windowRow.propertyFilterKey)
      if (existing) {
        existing.count += 1
      } else {
        map.set(windowRow.propertyFilterKey, {
          key: windowRow.propertyFilterKey,
          label: windowRow.propertyFilterLabel,
          count: 1,
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.label.localeCompare(b.label, locale)
    })
  }, [searchedWindows, locale])

  const propertyFilteredWindows = useMemo(() => {
    if (selectedPropertyFilterKey === "all") return searchedWindows
    return searchedWindows.filter(
      (windowRow) => windowRow.propertyFilterKey === selectedPropertyFilterKey
    )
  }, [searchedWindows, selectedPropertyFilterKey])

  const modeCounts = useMemo(() => {
    return {
      active: propertyFilteredWindows.length,
      with_task: propertyFilteredWindows.filter((row) => row.hasTask).length,
      without_task: propertyFilteredWindows.filter((row) => !row.hasTask).length,
    }
  }, [propertyFilteredWindows])

  const modeFilteredWindows = useMemo(() => {
    if (mode === "with_task") {
      return propertyFilteredWindows.filter((row) => row.hasTask)
    }

    if (mode === "without_task") {
      return propertyFilteredWindows.filter((row) => !row.hasTask)
    }

    return propertyFilteredWindows
  }, [propertyFilteredWindows, mode])

  const calendarFilteredWindows = useMemo(() => {
    if (calendarViewMode === "day" && selectedDay) {
      return modeFilteredWindows.filter((windowRow) =>
        sameDate(windowRow.windowStartDateTime, selectedDay)
      )
    }

    return modeFilteredWindows
  }, [modeFilteredWindows, calendarViewMode, selectedDay])

  useEffect(() => {
    if (calendarFilteredWindows.length === 0) {
      setSelectedWindowId(null)
      return
    }

    const exists = calendarFilteredWindows.some((row) => row.id === selectedWindowId)
    if (!exists) {
      setSelectedWindowId(calendarFilteredWindows[0].id)
      setSelectedDay(calendarFilteredWindows[0].windowStartDateTime)
    }
  }, [calendarFilteredWindows, selectedWindowId])

  const selectedWindow = useMemo(() => {
    if (!selectedWindowId) return null
    return calendarFilteredWindows.find((row) => row.id === selectedWindowId) || null
  }, [calendarFilteredWindows, selectedWindowId])

  const calendarDays = useMemo(() => buildMonthDays(monthCursor), [monthCursor])
  const weekdayLabels = getWeekdayLabels(language)

  const monthWindowsMap = useMemo(() => {
    const map = new Map<string, WorkWindowRow[]>()

    for (const windowRow of modeFilteredWindows) {
      const key = windowRow.windowStartDateTime.toISOString().slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(windowRow)
    }

    for (const entry of map.values()) {
      entry.sort((a, b) => {
        return a.windowStartDateTime.getTime() - b.windowStartDateTime.getTime()
      })
    }

    return map
  }, [modeFilteredWindows])

  const selectedDayWindows = useMemo(() => {
    if (!selectedDay) return []
    return modeFilteredWindows.filter((windowRow) =>
      sameDate(windowRow.windowStartDateTime, selectedDay)
    )
  }, [modeFilteredWindows, selectedDay])

  function openCreateTaskModal(windowRow: WorkWindowRow) {
    const booking = windowRow.booking
    const defaultPartnerId = booking.property?.defaultPartner?.id || ""

    setTaskType("cleaning")
    setTitle("")
    setDescription("")
    setScheduledDate(toDateInputValue(windowRow.windowStartDateTime))
    setScheduledStartTime(toTimeInputValue(windowRow.windowStartDateTime))
    setScheduledEndTime(toTimeInputValue(windowRow.windowEndDateTime))
    setDueDate(
      toDateInputValue(windowRow.windowEndDateTime || windowRow.windowStartDateTime)
    )
    setPriority("normal")
    setNotes(booking.notes || "")
    setAlertEnabled(false)
    setAlertAt(
      toDateTimeLocalValue(
        windowRow.windowEndDateTime || windowRow.windowStartDateTime
      )
    )
    setSendCleaningChecklist(true)
    setSendSuppliesChecklist(true)

    setAssignImmediately(Boolean(defaultPartnerId))
    setAssignPartnerId(defaultPartnerId)

    setModal({
      open: true,
      windowRow,
    })
  }

  function closeCreateTaskModal() {
    setModal({
      open: false,
      windowRow: null,
    })
  }

  async function handleCreateTask() {
    const booking = modal.windowRow?.booking
    if (!booking) return

    setSubmittingTask(true)

    try {
      const response = await fetch(`/api/bookings/${booking.id}/create-task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          taskType,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          scheduledDate,
          scheduledStartTime: scheduledStartTime || null,
          scheduledEndTime: scheduledEndTime || null,
          dueDate,
          priority,
          notes: notes.trim() || null,
          alertEnabled,
          alertAt: alertEnabled ? alertAt : null,
          sendCleaningChecklist,
          sendSuppliesChecklist,
          assignImmediately,
          assignPartnerId:
            assignImmediately && assignPartnerId ? assignPartnerId : null,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || texts.list.createTaskError)
      }

      closeCreateTaskModal()
      await loadBookings()
      setMode("with_task")
      alert(texts.list.taskCreatedSuccess)
    } catch (err) {
      alert(err instanceof Error ? err.message : texts.list.createTaskError)
    } finally {
      setSubmittingTask(false)
    }
  }

  const selectedWindowArray = selectedWindow ? [selectedWindow] : []

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link
            href="/bookings"
            className="mb-4 inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
          >
            {ui.backToBookings}
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {ui.title}
          </h1>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
            {ui.description}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <button
              type="button"
              title={ui.activeHint}
              onClick={() => setMode("active")}
              className={
                mode === "active"
                  ? "rounded-3xl border border-slate-950 bg-slate-950 p-5 text-left text-white shadow-sm"
                  : "rounded-3xl border border-slate-200 bg-white p-5 text-left text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              }
            >
              <div className="text-sm font-medium opacity-80">
                {ui.allWindowsCounter}
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">
                {modeCounts.active}
              </div>
            </button>

            <button
              type="button"
              title={ui.withTaskHint}
              onClick={() => setMode("with_task")}
              className={
                mode === "with_task"
                  ? "rounded-3xl border border-slate-950 bg-slate-950 p-5 text-left text-white shadow-sm"
                  : "rounded-3xl border border-slate-200 bg-white p-5 text-left text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              }
            >
              <div className="text-sm font-medium opacity-80">
                {ui.withTaskCounter}
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">
                {modeCounts.with_task}
              </div>
            </button>

            <button
              type="button"
              title={ui.withoutTaskHint}
              onClick={() => setMode("without_task")}
              className={
                mode === "without_task"
                  ? "rounded-3xl border border-slate-950 bg-slate-950 p-5 text-left text-white shadow-sm"
                  : "rounded-3xl border border-slate-200 bg-white p-5 text-left text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              }
            >
              <div className="text-sm font-medium opacity-80">
                {ui.withoutTaskCounter}
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">
                {modeCounts.without_task}
              </div>
            </button>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                title={ui.monthViewHelp}
                onClick={() => setCalendarViewMode("month")}
                className={
                  calendarViewMode === "month"
                    ? "rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                    : "rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                }
              >
                {ui.monthView}
              </button>

              <button
                type="button"
                title={ui.dayViewHelp}
                onClick={() => setCalendarViewMode("day")}
                className={
                  calendarViewMode === "day"
                    ? "rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                    : "rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                }
              >
                {ui.dayView}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() =>
                  setMonthCursor(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                  )
                }
              >
                β†
              </button>

              <div className="min-w-[190px] text-center text-base font-semibold text-slate-950">
                {getMonthLabel(monthCursor, locale)}
              </div>

              <button
                type="button"
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() =>
                  setMonthCursor(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                  )
                }
              >
                →
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                title={ui.searchHelp}
              >
                {language === "en" ? "Search" : "Αναζήτηση"}
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                placeholder={ui.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                title={ui.propertyFilterHelp}
              >
                {ui.propertyFilter}
              </label>
              <select
                value={selectedPropertyFilterKey}
                onChange={(e) => setSelectedPropertyFilterKey(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option value="all">{ui.allProperties}</option>
                {propertyCounters.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                title={ui.dateRangeHelp}
              >
                {ui.dateFrom}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                title={ui.dateRangeHelp}
              >
                {ui.dateTo}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div
                  className="text-sm font-semibold text-slate-950"
                  title={ui.propertyCountersHelp}
                >
                  {ui.propertyCounters}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {mode === "active"
                    ? ui.activeHint
                    : mode === "with_task"
                      ? ui.withTaskHint
                      : ui.withoutTaskHint}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {selectedDay ? (
                  <div className="text-xs font-medium text-slate-500">
                    {ui.selectedDay}: {selectedDay.toLocaleDateString(locale)}
                  </div>
                ) : null}

                <button
                  type="button"
                  title={ui.clearFiltersHelp}
                  onClick={() => {
                    setSearch("")
                    setSelectedPropertyFilterKey("all")
                    setDateFrom("")
                    setDateTo("")
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {ui.clearFilters}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedPropertyFilterKey("all")}
                className={
                  selectedPropertyFilterKey === "all"
                    ? "rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                    : "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                }
              >
                {ui.allProperties} · {searchedWindows.length}
              </button>

              {propertyCounters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedPropertyFilterKey(item.key)}
                  className={
                    selectedPropertyFilterKey === item.key
                      ? "rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      : "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  }
                >
                  {item.label} · {item.count}
                </button>
              ))}
            </div>
          </div>
        </div>

        {calendarViewMode === "month" ? (
          <>
            <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              {weekdayLabels.map((label) => (
                <div
                  key={label}
                  className="border-r border-slate-200 px-2 py-3 last:border-r-0"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const key = day.toISOString().slice(0, 10)
                const dayWindows = monthWindowsMap.get(key) || []
                const isCurrentMonth = day.getMonth() === monthCursor.getMonth()
                const isSelectedDay = selectedDay ? sameDate(day, selectedDay) : false

                return (
                  <div
                    key={key}
                    className={
                      isSelectedDay
                        ? "min-h-[170px] border-r border-b border-slate-200 bg-slate-950/5 p-3 last:border-r-0"
                        : "min-h-[170px] border-r border-b border-slate-200 bg-white p-3 last:border-r-0"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`text-left text-sm font-semibold ${
                        !isCurrentMonth ? "opacity-40" : "text-slate-950"
                      }`}
                    >
                      {day.getDate()}
                    </button>

                    <div className="mt-3 space-y-2">
                      {dayWindows.slice(0, 2).map((windowRow) => {
                        const isWindowSelected = selectedWindowId === windowRow.id
                        const firstTask = windowRow.booking.tasks[0] || null
                        const hasActiveAlert = isTaskAlertActive(firstTask)
                        const tone = windowRow.booking.needsMapping
                          ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                          : hasActiveAlert
                            ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
                          : windowRow.hasTask
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            : "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"

                        return (
                          <button
                            key={`${windowRow.id}-${key}`}
                            type="button"
                            onClick={() => {
                              setSelectedDay(day)
                              setSelectedWindowId(windowRow.id)
                            }}
                            className={
                              isWindowSelected
                                ? "w-full rounded-xl border border-slate-900 bg-slate-900 px-2 py-2 text-left text-[11px] font-medium text-white transition"
                                : `w-full rounded-xl border px-2 py-2 text-left text-[11px] font-medium transition ${tone}`
                            }
                            title={getWindowCalendarLabel(windowRow, locale, language)}
                          >
                            <div className="truncate font-semibold">
                              {windowRow.booking.property?.code ||
                                windowRow.booking.property?.name ||
                                windowRow.booking.externalListingName ||
                                windowRow.booking.externalListingId ||
                                texts.list.propertyNotMapped}
                            </div>
                            {hasActiveAlert ? (
                              <div className="mt-1 truncate text-[10px] font-semibold">
                                {language === "en" ? "Active alert" : "Ενεργό alert"}
                              </div>
                            ) : null}
                            <div className="mt-1 truncate">
                              {windowRow.windowStartDateTime.toLocaleTimeString(locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {windowRow.windowEndDateTime ? (
                                <>
                                  {" "}
                                  -{" "}
                                  {windowRow.windowEndDateTime.toLocaleString(locale, {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </>
                              ) : (
                                <>
                                  {" "}
                                  · {ui.openWindowShort}
                                </>
                              )}
                            </div>
                          </button>
                        )
                      })}

                      {dayWindows.length > 2 ? (
                        <div className="text-[11px] text-slate-500">
                          +{dayWindows.length - 2}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-950">
                  {language === "en"
                    ? "Windows of selected day"
                    : "Παράθυρα επιλεγμένης ημέρας"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {selectedDay
                    ? selectedDay.toLocaleDateString(locale)
                    : ui.noSelection}
                </div>
              </div>
            </div>

            {selectedDayWindows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                {ui.noResults}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayWindows.map((windowRow) => {
                  const isSelected = selectedWindowId === windowRow.id
                  return (
                    <button
                      key={windowRow.id}
                      type="button"
                      onClick={() => setSelectedWindowId(windowRow.id)}
                      className={
                        isSelected
                          ? "w-full rounded-2xl border border-slate-950 bg-slate-950 p-4 text-left text-white"
                          : "w-full rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                      }
                    >
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="font-semibold">
                            {windowRow.booking.property?.code
                              ? `${windowRow.booking.property.code} · ${windowRow.booking.property?.name || ""}`
                              : windowRow.booking.property?.name ||
                                windowRow.booking.externalListingName ||
                                texts.list.propertyNotMapped}
                          </div>
                          <div className="mt-1 text-sm opacity-90">
                            {formatDateTime(
                              windowRow.windowStartDateTime,
                              locale,
                              "-"
                            )}{" "}
                            -{" "}
                            {formatDateTime(
                              windowRow.windowEndDateTime,
                              locale,
                              ui.noNextCheckin
                            )}
                          </div>
                        </div>

                        <div className="text-sm">
                          {ui.duration}:{" "}
                          {getWindowDurationLabel(
                            windowRow.windowDurationMinutes,
                            language
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <section
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        title={ui.selectedWindowHelp}
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {ui.selectedWindow}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {ui.viewSelectedOnly}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">{texts.common.loading}</div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-600">{error}</div>
        ) : selectedWindowArray.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{ui.noSelection}</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {selectedWindowArray.map((windowRow) => {
              const booking = windowRow.booking
              const firstTask = booking.tasks[0] || null

              const syncBadgeClass = booking.needsMapping
                ? getBadgeClassName("warning")
                : isCancelledBooking(booking.status)
                  ? getBadgeClassName("danger")
                  : getBadgeClassName("success")

              const propertyAddressDisplay = getBookingAddressDisplay(
                booking,
                ui.noPropertyMessage
              )
              const checkoutText = formatDateTime(
                windowRow.windowStartDateTime,
                locale,
                texts.common.notAvailable
              )
              const nextCheckinText = formatDateTime(
                windowRow.windowEndDateTime,
                locale,
                ui.noNextCheckin
              )
              const durationText = getWindowDurationLabel(
                windowRow.windowDurationMinutes,
                language
              )

              return (
                <article key={windowRow.id} className="p-5">
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-semibold text-slate-950">
                            {booking.property?.name ||
                              booking.externalListingName ||
                              booking.externalListingId ||
                              texts.list.propertyNotMapped}
                          </div>

                          <span className={getBadgeClassName("neutral")}>
                            {normalizeSourcePlatform(booking.sourcePlatform, texts)}
                          </span>

                          <span className={syncBadgeClass}>
                            {getSyncLabel(booking.syncStatus, booking.needsMapping, texts)}
                          </span>

                          <span
                            className={
                              booking.needsMapping
                                ? getBadgeClassName("warning")
                                : windowRow.hasTask
                                  ? getBadgeClassName("success")
                                  : getBadgeClassName("neutral")
                            }
                          >
                            {booking.needsMapping
                              ? ui.needsMappingBadge
                              : windowRow.hasTask
                                ? ui.withTaskBadge
                                : ui.withoutTaskBadge}
                          </span>

                          {isTaskAlertActive(firstTask) ? (
                            <span className={getBadgeClassName("danger")}>
                              {language === "en" ? "Active alert" : "Ενεργό alert"}
                            </span>
                          ) : null}
                        </div>

                        <div className="text-sm text-slate-500">
                          {propertyAddressDisplay}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Link
                          href={`/bookings/${booking.id}`}
                          title={ui.viewBookingHelp}
                          className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                        >
                          {ui.viewBooking}
                        </Link>

                        {booking.property ? (
                          <Link
                            href={`/properties/${booking.property.id}`}
                            title={ui.viewPropertyHelp}
                            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            {ui.viewProperty}
                          </Link>
                        ) : null}

                        {booking.property ? (
                          <Link
                            href={`/tasks?propertyId=${booking.property.id}&scope=open`}
                            title={ui.viewPropertyTasksHelp}
                            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            {ui.viewPropertyTasks}
                          </Link>
                        ) : null}

                        {!windowRow.hasTask ? (
                          <button
                            type="button"
                            title={ui.createTaskHelp}
                            onClick={() => openCreateTaskModal(windowRow)}
                            disabled={booking.needsMapping || isCancelledBooking(booking.status)}
                            className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {ui.createTask}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div
                      className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 xl:flex-row xl:items-center xl:justify-between"
                      title={ui.rangeTitleHelp}
                    >
                      <div className="min-w-0 text-sm text-slate-700" title={ui.checkoutDateTimeHelp}>
                        <span className="font-semibold text-slate-950">{ui.checkoutDateTime}:</span>{" "}
                        {checkoutText}
                      </div>

                      <div className="min-w-0 text-sm text-slate-700" title={ui.nextCheckinDateTimeHelp}>
                        <span className="font-semibold text-slate-950">{ui.nextCheckinDateTime}:</span>{" "}
                        {nextCheckinText}
                      </div>

                      <div className="min-w-0 text-sm text-slate-700" title={ui.durationHelp}>
                        <span className="font-semibold text-slate-950">{ui.rangeTitle}:</span>{" "}
                        {checkoutText} - {nextCheckinText}
                        <span className="ml-2 text-xs text-slate-500">({durationText})</span>
                      </div>
                    </div>

                    {firstTask ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 text-sm font-semibold text-slate-950">
                          {ui.listTaskTitle}
                        </div>

                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-semibold text-slate-950">
                                {normalizeTaskTitle(firstTask.title, language)}
                              </div>
                              {isTaskAlertActive(firstTask) ? (
                                <span className="rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                                  {language === "en" ? "Active alert" : "Ενεργό alert"}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-slate-600">
                              {getTaskTypeDisplay(firstTask.taskType, language, texts)} ·{" "}
                              {getTaskStatusDisplay(firstTask.status, language)} ·{" "}
                              {getPriorityDisplay(firstTask.priority, language)}
                              {isTaskAlertActive(firstTask) && firstTask.alertAt
                                ? ` · Alert: ${formatDateTime(firstTask.alertAt, locale, "-")}`
                                : ""}
                            </div>
                          </div>

                          <Link
                            href={`/tasks/${firstTask.id}`}
                            title={ui.viewBookingHelp}
                            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            {texts.common.viewTask}
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {modal.open && modal.windowRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  {texts.modal.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {modal.windowRow.booking.property?.name ||
                    modal.windowRow.booking.externalListingName ||
                    modal.windowRow.booking.externalBookingId}
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateTaskModal}
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {texts.common.close}
              </button>
            </div>

            <div className="space-y-6 p-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-950">
                  {texts.modal.windowTitle}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {ui.checkoutDateTime}
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {formatDateTime(
                        modal.windowRow.windowStartDateTime,
                        locale,
                        texts.common.notAvailable
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {ui.nextCheckinDateTime}
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {formatDateTime(
                        modal.windowRow.windowEndDateTime,
                        locale,
                        ui.noNextCheckin
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-white p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {ui.duration}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {getWindowDurationLabel(
                      modal.windowRow.windowDurationMinutes,
                      language
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.taskType}
                  </label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                  >
                    <option value="cleaning">{texts.modal.taskTypes.cleaning}</option>
                    <option value="inspection">{texts.modal.taskTypes.inspection}</option>
                    <option value="maintenance">{texts.modal.taskTypes.maintenance}</option>
                    <option value="custom">{texts.modal.taskTypes.custom}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.priority}
                  </label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="low">{texts.modal.priorities.low}</option>
                    <option value="normal">{texts.modal.priorities.normal}</option>
                    <option value="high">{texts.modal.priorities.high}</option>
                    <option value="urgent">{texts.modal.priorities.urgent}</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.titleLabel}
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={texts.modal.titlePlaceholder}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.descriptionLabel}
                  </label>
                  <textarea
                    className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={texts.modal.descriptionPlaceholder}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.scheduledDate}
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.dueDate}
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.scheduledStartTime}
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    value={scheduledStartTime}
                    onChange={(e) => setScheduledStartTime(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.scheduledEndTime}
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    value={scheduledEndTime}
                    onChange={(e) => setScheduledEndTime(e.target.value)}
                  />
                </div>

                <TaskAlertPanel
                  className="md:col-span-2"
                  title={texts.modal.alertTitle}
                  description={texts.modal.alertDescription}
                  enabledLabel={texts.modal.alertEnabled}
                  timeLabel={texts.modal.alertAt}
                  enabled={alertEnabled}
                  value={alertAt}
                  onEnabledChange={setAlertEnabled}
                  onValueChange={setAlertAt}
                />

                <TaskChecklistPanel
                  className="md:col-span-2"
                  title={texts.modal.checklistsTitle}
                  options={[
                    {
                      label: texts.modal.sendCleaningChecklist,
                      checked: sendCleaningChecklist,
                      onChange: setSendCleaningChecklist,
                    },
                    {
                      label: texts.modal.sendSuppliesChecklist,
                      checked: sendSuppliesChecklist,
                      onChange: setSendSuppliesChecklist,
                    },
                  ]}
                />

                <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3">
                    <div className="font-semibold text-slate-950">
                      {ui.assignNowTitle}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {ui.assignNowDescription}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={assignImmediately}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setAssignImmediately(checked)

                          if (
                            checked &&
                            !assignPartnerId &&
                            modal.windowRow?.booking.property?.defaultPartner?.id
                          ) {
                            setAssignPartnerId(
                              modal.windowRow.booking.property.defaultPartner.id
                            )
                          }
                        }}
                      />
                      {ui.assignNow}
                    </label>

                    {assignImmediately && (
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          {ui.partnerLabel}
                        </label>

                        <select
                          className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                          value={assignPartnerId}
                          onChange={(e) => setAssignPartnerId(e.target.value)}
                        >
                          <option value="">
                            {language === "en"
                              ? "Select partner"
                              : "Επίλεξε συνεργάτη"}
                          </option>

                          {partners.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                              {partner.code
                                ? `${partner.code} · ${partner.name}`
                                : partner.name}
                            </option>
                          ))}
                        </select>

                        {modal.windowRow.booking.property?.defaultPartner?.id &&
                          assignPartnerId ===
                            modal.windowRow.booking.property.defaultPartner.id && (
                            <p className="mt-2 text-xs text-slate-500">
                              {ui.defaultPartnerHint}
                            </p>
                          )}

                        {partners.length === 0 && (
                          <p className="mt-2 text-xs text-amber-600">
                            {ui.noPartners}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.common.internalNotes}
                  </label>
                  <textarea
                    className="min-h-[100px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={texts.modal.notesPlaceholder}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={closeCreateTaskModal}
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {texts.common.cancel}
              </button>

              <button
                type="button"
                onClick={handleCreateTask}
                disabled={submittingTask || (assignImmediately && !assignPartnerId)}
                className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submittingTask ? texts.common.creating : texts.common.createTask}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

