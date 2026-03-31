"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
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

type ModeKey = "active" | "history"
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

function isValidDate(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
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

function formatDate(value: string | Date | null | undefined, locale: string) {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString(locale)
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
  if (booking.property?.code && booking.property?.name) {
    return `${booking.property.code} · ${booking.property.name}`
  }

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

function doesWindowOverlapDay(windowRow: WorkWindowRow, day: Date) {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0)
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999)

  const start = windowRow.windowStartDateTime
  const end = windowRow.windowEndDateTime

  if (!end) {
    return start <= dayEnd
  }

  return start <= dayEnd && end >= dayStart
}

function getWindowDurationLabel(
  durationMinutes: number | null | undefined,
  language: "el" | "en"
) {
  if (!durationMinutes || durationMinutes <= 0) {
    return language === "en" ? "No duration" : "Χωρίς διάρκεια"
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
    windowRow.booking.property?.code ||
    windowRow.booking.property?.name ||
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

  return `${propertyText} · ${start} → ${end}`
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
      title: "Booking work windows",
      description:
        "The calendar shows the real available work period from check-out date/time until the next check-in date/time.",
      active: "Active",
      history: "History",
      monthView: "Month view",
      dayView: "Day view",
      noSelection: "Select a window from the calendar.",
      noResults: "No windows found.",
      propertyCounters: "Window counters by property",
      allProperties: "All properties",
      selectedWindow: "Selected window",
      selectedDay: "Selected day",
      searchPlaceholder: "Search by property, guest, listing, booking...",
      openCreateTask: "Create task",
      viewBooking: "View booking",
      checkoutDateTime: "Check-out",
      nextCheckinDateTime: "Next check-in",
      timeRange: "Window period",
      noNextCheckin: "No next check-in",
      viewOnlySelected:
        "The list below shows only the window selected from the calendar.",
      historyHint:
        "History shows windows where a task has already been created.",
      activeHint:
        "Active shows only windows where no task has been created yet.",
      assignNowTitle: "Immediate assignment",
      assignNowDescription:
        "Optionally assign the task directly to a partner during creation.",
      assignNow: "Assign immediately to partner",
      partnerLabel: "Partner",
      defaultPartnerHint: "Default property partner selected automatically.",
      noPartners: "No partners found.",
      taskCreatedBadge: "Task created",
      taskNotCreatedBadge: "No task yet",
      duration: "Duration",
      from: "From",
      to: "To",
      dayWindows: "Windows for selected day",
      allWindows: "All windows",
    }
  }

  return {
    title: "Ιστορικό παραθύρων κρατήσεων",
    description:
      "Το ημερολόγιο δείχνει το πραγματικό διαθέσιμο διάστημα εργασίας από την ημερομηνία/ώρα check-out μέχρι την επόμενη ημερομηνία/ώρα check-in.",
    active: "Ενεργές",
    history: "Ιστορικό",
    monthView: "Προβολή μήνα",
    dayView: "Προβολή ημέρας",
    noSelection: "Επίλεξε ένα παράθυρο από το ημερολόγιο.",
    noResults: "Δεν βρέθηκαν παράθυρα.",
    propertyCounters: "Μετρητής παραθύρων ανά ακίνητο",
    allProperties: "Όλα τα ακίνητα",
    selectedWindow: "Επιλεγμένο παράθυρο",
    selectedDay: "Επιλεγμένη ημέρα",
    searchPlaceholder: "Αναζήτηση με ακίνητο, επισκέπτη, listing, κράτηση...",
    openCreateTask: "Δημιουργία εργασίας",
    viewBooking: "Προβολή κράτησης",
    checkoutDateTime: "Check-out",
    nextCheckinDateTime: "Επόμενο check-in",
    timeRange: "Διάστημα παραθύρου",
    noNextCheckin: "Δεν υπάρχει επόμενο check-in",
    viewOnlySelected:
      "Η λίστα κάτω δείχνει μόνο το παράθυρο που επιλέγεται από το ημερολόγιο.",
    historyHint:
      "Το Ιστορικό δείχνει παράθυρα για τα οποία έχει ήδη δημιουργηθεί εργασία.",
    activeHint:
      "Οι Ενεργές δείχνουν μόνο παράθυρα για τα οποία δεν έχει δημιουργηθεί ακόμα εργασία.",
    assignNowTitle: "Άμεση ανάθεση",
    assignNowDescription:
      "Προαιρετικά μπορείς να αναθέσεις απευθείας την εργασία σε συνεργάτη κατά τη δημιουργία.",
    assignNow: "Άμεση ανάθεση σε συνεργάτη",
    partnerLabel: "Συνεργάτης",
    defaultPartnerHint:
      "Ο προεπιλεγμένος συνεργάτης του ακινήτου επιλέχθηκε αυτόματα.",
    noPartners: "Δεν βρέθηκαν συνεργάτες.",
    taskCreatedBadge: "Η εργασία δημιουργήθηκε",
    taskNotCreatedBadge: "Χωρίς εργασία",
    duration: "Διάρκεια",
    from: "Από",
    to: "Έως",
    dayWindows: "Παράθυρα επιλεγμένης ημέρας",
    allWindows: "Όλα τα παράθυρα",
  }
}

export default function BookingsHistoryPage() {
  const { language } = useAppLanguage()
  const texts = getBookingsModuleTexts(language)
  const ui = getLocalTexts(language)
  const locale = language === "en" ? "en-GB" : "el-GR"

  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [monthCursor, setMonthCursor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [mode, setMode] = useState<ModeKey>("active")
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>("month")
  const [selectedPropertyFilterKey, setSelectedPropertyFilterKey] = useState("all")
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null)

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

  const modeWindows = useMemo(() => {
    return allWindows.filter((windowRow) => {
      if (isCancelledBooking(windowRow.booking.status)) return false
      return mode === "active" ? !windowRow.hasTask : windowRow.hasTask
    })
  }, [allWindows, mode])

  const searchedWindows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return modeWindows.filter((windowRow) => {
      if (!normalizedSearch) return true

      const booking = windowRow.booking
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
  }, [modeWindows, search])

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

  const calendarFilteredWindows = useMemo(() => {
    if (calendarViewMode === "day" && selectedDay) {
      return propertyFilteredWindows.filter((windowRow) =>
        doesWindowOverlapDay(windowRow, selectedDay)
      )
    }

    return propertyFilteredWindows
  }, [propertyFilteredWindows, calendarViewMode, selectedDay])

  useEffect(() => {
    if (calendarFilteredWindows.length === 0) {
      setSelectedWindowId(null)
      return
    }

    const exists = calendarFilteredWindows.some((row) => row.id === selectedWindowId)
    if (!exists) {
      setSelectedWindowId(calendarFilteredWindows[0].id)
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

    for (const windowRow of propertyFilteredWindows) {
      const cursor = new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth(),
        1
      )
      const monthEnd = new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth() + 1,
        0
      )

      while (cursor <= monthEnd) {
        if (doesWindowOverlapDay(windowRow, cursor)) {
          const key = cursor.toISOString().slice(0, 10)
          if (!map.has(key)) map.set(key, [])
          map.get(key)!.push(windowRow)
        }

        cursor.setDate(cursor.getDate() + 1)
      }
    }

    for (const entry of map.values()) {
      entry.sort((a, b) => {
        return a.windowStartDateTime.getTime() - b.windowStartDateTime.getTime()
      })
    }

    return map
  }, [propertyFilteredWindows, monthCursor])

  const selectedDayWindows = useMemo(() => {
    if (!selectedDay) return []
    return propertyFilteredWindows.filter((windowRow) =>
      doesWindowOverlapDay(windowRow, selectedDay)
    )
  }, [propertyFilteredWindows, selectedDay])

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
      setMode("history")
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
            {texts.common.backToBookings}
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
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode("active")}
                className={
                  mode === "active"
                    ? "rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                    : "rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                }
              >
                {ui.active}
              </button>

              <button
                type="button"
                onClick={() => setMode("history")}
                className={
                  mode === "history"
                    ? "rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                    : "rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                }
              >
                {ui.history}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
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
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
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
                ←
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

            <div className="w-full xl:w-[360px]">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                placeholder={ui.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  {ui.propertyCounters}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {mode === "active" ? ui.activeHint : ui.historyHint}
                </div>
              </div>

              {selectedDay ? (
                <div className="text-xs font-medium text-slate-500">
                  {ui.selectedDay}: {selectedDay.toLocaleDateString(locale)}
                </div>
              ) : null}
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
                                : mode === "active"
                                  ? "w-full rounded-xl border border-sky-200 bg-sky-50 px-2 py-2 text-left text-[11px] font-medium text-sky-800 transition hover:bg-sky-100"
                                  : "w-full rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-left text-[11px] font-medium text-emerald-800 transition hover:bg-emerald-100"
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
                            <div className="mt-1 truncate">
                              {windowRow.windowStartDateTime.toLocaleTimeString(locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              →{" "}
                              {windowRow.windowEndDateTime
                                ? windowRow.windowEndDateTime.toLocaleString(locale, {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ui.noNextCheckin}
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
                  {ui.dayWindows}
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
                            →{" "}
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

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {ui.selectedWindow}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {ui.viewOnlySelected}
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
              const nextBooking = windowRow.nextBooking
              const firstTask = booking.tasks[0] || null

              const syncBadgeClass = booking.needsMapping
                ? getBadgeClassName("warning")
                : isCancelledBooking(booking.status)
                  ? getBadgeClassName("danger")
                  : getBadgeClassName("success")

              return (
                <article key={windowRow.id} className="space-y-4 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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
                            windowRow.hasTask
                              ? getBadgeClassName("success")
                              : getBadgeClassName("warning")
                          }
                        >
                          {windowRow.hasTask
                            ? ui.taskCreatedBadge
                            : ui.taskNotCreatedBadge}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {texts.labels.property}
                          </div>
                          <div className="mt-1 font-medium text-slate-900">
                            {booking.property
                              ? `${booking.property.code} · ${booking.property.name}`
                              : texts.list.propertyNotMapped}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {ui.checkoutDateTime}
                          </div>
                          <div className="mt-1 font-medium text-slate-900">
                            {formatDateTime(
                              windowRow.windowStartDateTime,
                              locale,
                              texts.common.notAvailable
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {ui.nextCheckinDateTime}
                          </div>
                          <div className="mt-1 font-medium text-slate-900">
                            {formatDateTime(
                              windowRow.windowEndDateTime,
                              locale,
                              ui.noNextCheckin
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {ui.duration}
                          </div>
                          <div className="mt-1 font-medium text-slate-900">
                            {getWindowDurationLabel(
                              windowRow.windowDurationMinutes,
                              language
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {ui.timeRange}
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {ui.from}
                            </div>
                            <div className="mt-1 text-sm font-medium text-slate-900">
                              {formatDateTime(
                                windowRow.windowStartDateTime,
                                locale,
                                "-"
                              )}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {ui.to}
                            </div>
                            <div className="mt-1 text-sm font-medium text-slate-900">
                              {formatDateTime(
                                windowRow.windowEndDateTime,
                                locale,
                                ui.noNextCheckin
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                      >
                        {ui.viewBooking}
                      </Link>

                      {!windowRow.hasTask && (
                        <button
                          type="button"
                          onClick={() => openCreateTaskModal(windowRow)}
                          disabled={booking.needsMapping || isCancelledBooking(booking.status)}
                          className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {ui.openCreateTask}
                        </button>
                      )}

                      {windowRow.hasTask && firstTask ? (
                        <Link
                          href={`/tasks/${firstTask.id}`}
                          className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                        >
                          {texts.common.viewTask}
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {windowRow.hasTask && firstTask && (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 text-sm font-semibold text-slate-950">
                        {texts.list.linkedTasks}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0 text-sm">
                            <div className="font-semibold text-slate-950">
                              {normalizeTaskTitle(firstTask.title, language)}
                            </div>
                            <div className="mt-1 text-slate-600">
                              {getTaskTypeDisplay(firstTask.taskType, language, texts)} ·{" "}
                              {getTaskStatusDisplay(firstTask.status, language)} ·{" "}
                              {getPriorityDisplay(firstTask.priority, language)}
                            </div>
                          </div>

                          <Link
                            href={`/tasks/${firstTask.id}`}
                            className="text-sm font-medium text-slate-700 underline underline-offset-4"
                          >
                            {texts.common.viewTask}
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
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

                <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-950">
                        {texts.modal.alertTitle}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {texts.modal.alertDescription}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={alertEnabled}
                        onChange={(e) => setAlertEnabled(e.target.checked)}
                      />
                      {texts.modal.alertEnabled}
                    </label>
                  </div>

                  {alertEnabled && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        {texts.modal.alertAt}
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                        value={alertAt}
                        onChange={(e) => setAlertAt(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 font-semibold text-slate-950">
                    {texts.modal.checklistsTitle}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={sendCleaningChecklist}
                        onChange={(e) => setSendCleaningChecklist(e.target.checked)}
                      />
                      {texts.modal.sendCleaningChecklist}
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={sendSuppliesChecklist}
                        onChange={(e) => setSendSuppliesChecklist(e.target.checked)}
                      />
                      {texts.modal.sendSuppliesChecklist}
                    </label>
                  </div>
                </div>

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