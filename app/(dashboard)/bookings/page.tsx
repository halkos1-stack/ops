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
    assignedAt?: string | null
    acceptedAt?: string | null
    partner?: {
      id: string
      code: string
      name: string
      email?: string | null
      specialty?: string | null
      status?: string | null
    } | null
  }>
}

type BookingWorkWindow = {
  nextCheckInDate?: string | null
  nextCheckInTime?: string | null
  windowStart?: string | null
  windowEnd?: string | null
  windowDurationMinutes?: number | null
  windowDurationCompact?: string | null
}

type BookingRow = {
  id: string
  sourcePlatform: string
  externalBookingId: string
  externalListingId?: string | null
  externalListingName?: string | null
  externalPropertyAddress?: string | null
  externalPropertyCity?: string | null
  externalPropertyRegion?: string | null
  externalPropertyPostalCode?: string | null
  externalPropertyCountry?: string | null
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
  workWindow?: BookingWorkWindow | null
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

type PropertyOption = {
  id: string
  code: string
  name: string
  address?: string | null
  city?: string | null
  region?: string | null
  type?: string | null
  status?: string | null
}

type FilterKey =
  | "all"
  | "active"
  | "withoutTasks"
  | "withTasks"
  | "needsMapping"
  | "cancelled"
  | "todayCheckout"
  | "next3Days"

type TaskCreateModalState = {
  open: boolean
  booking: BookingRow | null
}

type MappingModalState = {
  open: boolean
  booking: BookingRow | null
}

type BookingStateTone = "neutral" | "success" | "warning" | "danger"

type BookingStateBlock = {
  tone: BookingStateTone
  title: string
  description: string
  helper?: string
  nextStep?: string
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

function formatDate(value: string | null | undefined, locale: string) {
  if (!value || !isValidDate(value)) return "-"
  return new Date(value).toLocaleDateString(locale)
}

function formatTime(value?: string | null) {
  if (!value || !isValidTimeString(value)) return ""
  return value.trim().slice(0, 5)
}

function formatDateAndTime(
  dateValue: string | null | undefined,
  timeValue: string | null | undefined,
  locale: string,
  emptyText: string
) {
  if (!dateValue || !isValidDate(dateValue)) return emptyText

  const dateText = formatDate(dateValue, locale)
  const timeText = formatTime(timeValue)

  return timeText ? `${dateText} · ${timeText}` : dateText
}

function toDateInputValue(value?: string | null) {
  if (!value || !isValidDate(value)) return ""
  return new Date(value).toISOString().slice(0, 10)
}

function toDateTimeLocalValue(
  dateString?: string | null,
  timeString?: string | null
) {
  if (!dateString || !isValidDate(dateString)) return ""
  const base = new Date(dateString).toISOString().slice(0, 10)
  const time = formatTime(timeString)
  return `${base}T${time || "09:00"}`
}

function getTodayDateOnly() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getDateOnly(value: string) {
  const date = new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isCancelledBooking(status: string) {
  return status.toLowerCase() === "cancelled"
}

function isActiveBooking(booking: BookingRow) {
  return !isCancelledBooking(booking.status)
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

function getTaskSummaryLabel(
  tasks: BookingTask[],
  language: "el" | "en",
  texts: ReturnType<typeof getBookingsModuleTexts>
) {
  if (tasks.length === 0) return texts.statuses.noTask

  if (language === "en") {
    return tasks.length === 1 ? "1 task" : `${tasks.length} tasks`
  }

  return tasks.length === 1 ? "1 εργασία" : `${tasks.length} εργασίες`
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

function getStatePanelClassName(tone: BookingStateTone) {
  if (tone === "success") {
    return "rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
  }

  if (tone === "warning") {
    return "rounded-2xl border border-amber-200 bg-amber-50 p-4"
  }

  if (tone === "danger") {
    return "rounded-2xl border border-rose-200 bg-rose-50 p-4"
  }

  return "rounded-2xl border border-slate-200 bg-slate-50 p-4"
}

function getStateTitleClassName(tone: BookingStateTone) {
  if (tone === "success") return "text-sm font-semibold text-emerald-900"
  if (tone === "warning") return "text-sm font-semibold text-amber-900"
  if (tone === "danger") return "text-sm font-semibold text-rose-900"
  return "text-sm font-semibold text-slate-900"
}

function getStateTextClassName(tone: BookingStateTone) {
  if (tone === "success") return "mt-1 text-sm text-emerald-800"
  if (tone === "warning") return "mt-1 text-sm text-amber-800"
  if (tone === "danger") return "mt-1 text-sm text-rose-800"
  return "mt-1 text-sm text-slate-700"
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

function getTaskCoverageLabel(
  value: string | undefined,
  language: "el" | "en",
  texts: ReturnType<typeof getBookingsModuleTexts>
) {
  const normalized = String(value || "").trim().toLowerCase()

  if (normalized === "completed") {
    return language === "en" ? "Completed" : "Ολοκληρώθηκε"
  }

  if (normalized === "assigned") {
    return language === "en" ? "Assigned" : "Ανατέθηκε"
  }

  if (normalized === "created") {
    return language === "en" ? "Created" : "Δημιουργήθηκε"
  }

  return texts.statuses.noTask
}

function getTaskCoverageBadgeClass(value: string | undefined) {
  const normalized = String(value || "").trim().toLowerCase()

  if (normalized === "completed") return getBadgeClassName("neutral")
  if (normalized === "assigned") return getBadgeClassName("success")
  if (normalized === "created") return getBadgeClassName("neutral")
  return getBadgeClassName("warning")
}

function getWindowRangeLabel(
  booking: BookingRow,
  locale: string,
  texts: ReturnType<typeof getBookingsModuleTexts>
) {
  const start = formatDateAndTime(
    booking.checkOutDate,
    booking.checkOutTime,
    locale,
    texts.common.notAvailable
  )

  const end = booking.workWindow?.nextCheckInDate
    ? formatDateAndTime(
        booking.workWindow.nextCheckInDate,
        booking.workWindow.nextCheckInTime,
        locale,
        texts.common.notAvailable
      )
    : texts.list.noNextBooking

  return `${start} → ${end}`
}

function getExternalPropertyDisplay(booking: BookingRow) {
  return [
    booking.externalPropertyAddress,
    booking.externalPropertyCity,
    booking.externalPropertyRegion,
    booking.externalPropertyPostalCode,
    booking.externalPropertyCountry,
  ]
    .filter((value) => String(value || "").trim())
    .join(" · ")
}

function getExternalPropertyCountryFallback(language: "el" | "en") {
  return language === "en" ? "Greece" : "Ελλάδα"
}

function getBookingStateBlock(
  booking: BookingRow,
  language: "el" | "en",
  texts: ReturnType<typeof getBookingsModuleTexts>
): BookingStateBlock {
  const firstTask = booking.tasks[0] || null

  if (isCancelledBooking(booking.status)) {
    return {
      tone: "danger",
      title:
        language === "en"
          ? "This booking is cancelled"
          : "Η κράτηση είναι ακυρωμένη",
      description:
        language === "en"
          ? "This booking is no longer active. Review it only if you need history or verification."
          : "Η κράτηση αυτή δεν είναι πλέον ενεργή. Την ελέγχεις μόνο για ιστορικό ή επιβεβαίωση.",
      nextStep:
        language === "en" ? "Review details only" : "Μόνο προβολή λεπτομερειών",
    }
  }

  if (booking.needsMapping) {
    return {
      tone: "warning",
      title:
        language === "en"
          ? "Property mapping is required"
          : "Χρειάζεται αντιστοίχιση ακινήτου",
      description:
        language === "en"
          ? "This booking was imported from a platform but is not yet linked to a property in the system."
          : "Η κράτηση εισήχθη από πλατφόρμα αλλά δεν έχει ακόμη συνδεθεί με ακίνητο στο σύστημα.",
      helper:
        language === "en"
          ? "You cannot create a task before the booking is mapped to a property."
          : "Δεν μπορείς να δημιουργήσεις εργασία πριν η κράτηση αντιστοιχιστεί με ακίνητο.",
      nextStep:
        language === "en"
          ? "Map existing property or create a new one"
          : "Αντιστοίχιση υπάρχοντος ακινήτου ή δημιουργία νέου",
    }
  }

  if (!firstTask) {
    return {
      tone: "neutral",
      title:
        language === "en"
          ? "Ready for task creation"
          : "Έτοιμη για δημιουργία εργασίας",
      description:
        language === "en"
          ? "The booking is already linked to a property and can now continue to operations."
          : "Η κράτηση έχει ήδη συνδεθεί με ακίνητο και μπορεί τώρα να περάσει στη λειτουργική ροή.",
      helper:
        language === "en"
          ? "Create the task using the available work window between check-out and next check-in."
          : "Δημιούργησε την εργασία με βάση το διαθέσιμο παράθυρο μεταξύ check-out και επόμενου check-in.",
      nextStep:
        language === "en" ? "Create task" : "Δημιουργία εργασίας",
    }
  }

  const normalizedTaskStatus = String(firstTask.status || "").trim().toLowerCase()

  if (normalizedTaskStatus === "completed") {
    return {
      tone: "success",
      title:
        language === "en"
          ? "A related task has been completed"
          : "Έχει ολοκληρωθεί σχετική εργασία",
      description:
        language === "en"
          ? "This booking already has a completed linked task."
          : "Αυτή η κράτηση έχει ήδη ολοκληρωμένη συνδεδεμένη εργασία.",
      nextStep:
        language === "en" ? "Review task details" : "Προβολή στοιχείων εργασίας",
    }
  }

  return {
    tone: "success",
    title:
      language === "en"
        ? "A related task already exists"
        : "Υπάρχει ήδη συνδεδεμένη εργασία",
    description:
      language === "en"
        ? "This booking is already connected to an active task."
        : "Η κράτηση αυτή έχει ήδη συνδεθεί με ενεργή εργασία.",
    helper:
      language === "en"
        ? "Open the task to continue assignment, checklist or execution."
        : "Άνοιξε την εργασία για να συνεχίσεις με ανάθεση, λίστες ή εκτέλεση.",
    nextStep:
      language === "en" ? "Open task" : "Άνοιγμα εργασίας",
  }
}

export default function BookingsPage() {
  const { language } = useAppLanguage()
  const texts = getBookingsModuleTexts(language)
  const locale = language === "en" ? "en-GB" : "el-GR"

  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<FilterKey>("active")

  const [modal, setModal] = useState<TaskCreateModalState>({
    open: false,
    booking: null,
  })

  const [mappingModal, setMappingModal] = useState<MappingModalState>({
    open: false,
    booking: null,
  })

  const [submittingTask, setSubmittingTask] = useState(false)
  const [submittingMapping, setSubmittingMapping] = useState(false)

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

  const [mappingMode, setMappingMode] = useState<"existing" | "new">("existing")
  const [propertySearch, setPropertySearch] = useState("")
  const [selectedPropertyId, setSelectedPropertyId] = useState("")
  const [newPropertyName, setNewPropertyName] = useState("")
  const [newPropertyAddress, setNewPropertyAddress] = useState("")
  const [newPropertyCity, setNewPropertyCity] = useState("")
  const [newPropertyRegion, setNewPropertyRegion] = useState("")
  const [newPropertyPostalCode, setNewPropertyPostalCode] = useState("")
  const [newPropertyCountry, setNewPropertyCountry] = useState(
    getExternalPropertyCountryFallback(language)
  )
  const [newPropertyType, setNewPropertyType] = useState("apartment")

  async function loadBookings() {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/bookings", {
        cache: "no-store",
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || texts.list.loadError)
      }

      setBookings(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.list.loadError)
    } finally {
      setLoading(false)
    }
  }

  async function loadProperties() {
    try {
      const response = await fetch("/api/properties", {
        cache: "no-store",
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) return

      if (Array.isArray(data)) {
        setProperties(data)
        return
      }

      if (Array.isArray(data?.properties)) {
        setProperties(data.properties)
      }
    } catch {
      setProperties([])
    }
  }

  useEffect(() => {
    loadBookings()
    loadProperties()
  }, [language])

  function openCreateTaskModal(booking: BookingRow) {
    setTaskType("cleaning")
    setTitle("")
    setDescription("")
    setScheduledDate(toDateInputValue(booking.checkOutDate))
    setScheduledStartTime(formatTime(booking.checkOutTime))
    setScheduledEndTime(formatTime(booking.workWindow?.nextCheckInTime))
    setDueDate(
      toDateInputValue(booking.workWindow?.nextCheckInDate || booking.checkOutDate)
    )
    setPriority("normal")
    setNotes(booking.notes || "")
    setAlertEnabled(false)
    setAlertAt(
      toDateTimeLocalValue(
        booking.workWindow?.nextCheckInDate || booking.checkOutDate,
        booking.workWindow?.nextCheckInTime || booking.checkOutTime
      )
    )
    setSendCleaningChecklist(true)
    setSendSuppliesChecklist(true)

    setModal({
      open: true,
      booking,
    })
  }

  function closeCreateTaskModal() {
    setModal({
      open: false,
      booking: null,
    })
  }

  function openMappingModal(booking: BookingRow) {
    setMappingMode("existing")
    setPropertySearch("")
    setSelectedPropertyId("")

    setNewPropertyName(booking.externalListingName || booking.externalListingId || "")
    setNewPropertyAddress(booking.externalPropertyAddress || "")
    setNewPropertyCity(booking.externalPropertyCity || "")
    setNewPropertyRegion(booking.externalPropertyRegion || "")
    setNewPropertyPostalCode(booking.externalPropertyPostalCode || "")
    setNewPropertyCountry(
      booking.externalPropertyCountry || getExternalPropertyCountryFallback(language)
    )
    setNewPropertyType("apartment")

    setMappingModal({
      open: true,
      booking,
    })
  }

  function closeMappingModal() {
    setMappingModal({
      open: false,
      booking: null,
    })
  }

  async function handleCreateTask() {
    if (!modal.booking) return

    setSubmittingTask(true)

    try {
      const response = await fetch(`/api/bookings/${modal.booking.id}/create-task`, {
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
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || texts.list.createTaskError)
      }

      closeCreateTaskModal()
      await loadBookings()
      alert(texts.list.taskCreatedSuccess)
    } catch (err) {
      alert(err instanceof Error ? err.message : texts.list.createTaskError)
    } finally {
      setSubmittingTask(false)
    }
  }

  async function handleConfirmMapping() {
    if (!mappingModal.booking) return

    const externalListingId = String(
      mappingModal.booking.externalListingId || ""
    ).trim()

    if (!externalListingId) {
      alert(
        language === "en"
          ? "This booking has no external listing id, so it cannot be mapped yet."
          : "Αυτή η κράτηση δεν έχει external listing id, οπότε δεν μπορεί ακόμα να αντιστοιχιστεί."
      )
      return
    }

    setSubmittingMapping(true)

    try {
      let propertyIdToMap = ""

      if (mappingMode === "existing") {
        if (!selectedPropertyId) {
          throw new Error(
            language === "en" ? "Select a property first." : "Επίλεξε πρώτα ακίνητο."
          )
        }

        propertyIdToMap = selectedPropertyId
      } else {
        if (!newPropertyName.trim()) {
          throw new Error(
            language === "en"
              ? "Property name is required."
              : "Το όνομα ακινήτου είναι υποχρεωτικό."
          )
        }

        if (!newPropertyAddress.trim()) {
          throw new Error(
            language === "en"
              ? "Address is required."
              : "Η διεύθυνση είναι υποχρεωτική."
          )
        }

        if (!newPropertyCity.trim()) {
          throw new Error(
            language === "en" ? "City is required." : "Η πόλη είναι υποχρεωτική."
          )
        }

        if (!newPropertyRegion.trim()) {
          throw new Error(
            language === "en"
              ? "Region is required."
              : "Η περιοχή είναι υποχρεωτική."
          )
        }

        if (!newPropertyPostalCode.trim()) {
          throw new Error(
            language === "en"
              ? "Postal code is required."
              : "Ο ταχυδρομικός κώδικας είναι υποχρεωτικός."
          )
        }

        if (!newPropertyCountry.trim()) {
          throw new Error(
            language === "en" ? "Country is required." : "Η χώρα είναι υποχρεωτική."
          )
        }

        const createPropertyResponse = await fetch("/api/properties", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newPropertyName.trim(),
            address: newPropertyAddress.trim(),
            city: newPropertyCity.trim(),
            region: newPropertyRegion.trim(),
            postalCode: newPropertyPostalCode.trim(),
            country: newPropertyCountry.trim(),
            type: newPropertyType,
            status: "active",
            bedrooms: 0,
            bathrooms: 0,
            maxGuests: 0,
          }),
        })

        const createPropertyData = await createPropertyResponse.json().catch(() => null)

        if (!createPropertyResponse.ok) {
          throw new Error(
            createPropertyData?.error ||
              (language === "en"
                ? "Failed to create property."
                : "Αποτυχία δημιουργίας ακινήτου.")
          )
        }

        propertyIdToMap = String(createPropertyData?.property?.id || "").trim()

        if (!propertyIdToMap) {
          throw new Error(
            language === "en"
              ? "Property was created but no property id was returned."
              : "Το ακίνητο δημιουργήθηκε αλλά δεν επιστράφηκε property id."
          )
        }
      }

      const mappingResponse = await fetch("/api/bookings/mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId: propertyIdToMap,
          sourcePlatform: mappingModal.booking.sourcePlatform,
          externalListingId,
          externalListingName: mappingModal.booking.externalListingName || null,
          notes:
            language === "en"
              ? "Created from bookings page mapping flow."
              : "Δημιουργήθηκε από τη ροή αντιστοίχισης της σελίδας κρατήσεων.",
        }),
      })

      const mappingData = await mappingResponse.json().catch(() => null)

      if (!mappingResponse.ok) {
        throw new Error(
          mappingData?.error ||
            (language === "en"
              ? "Failed to save property mapping."
              : "Αποτυχία αποθήκευσης αντιστοίχισης ακινήτου.")
        )
      }

      closeMappingModal()
      await loadBookings()
      await loadProperties()

      alert(
        language === "en"
          ? "Property mapping completed successfully."
          : "Η αντιστοίχιση ακινήτου ολοκληρώθηκε επιτυχώς."
      )
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : language === "en"
            ? "Mapping failed."
            : "Η αντιστοίχιση απέτυχε."
      )
    } finally {
      setSubmittingMapping(false)
    }
  }

  const counters = useMemo(() => {
    const today = getTodayDateOnly()
    const next3 = new Date(today)
    next3.setDate(next3.getDate() + 3)

    return {
      all: bookings.length,
      active: bookings.filter((booking) => isActiveBooking(booking)).length,
      withoutTasks: bookings.filter(
        (booking) => booking.tasks.length === 0 && isActiveBooking(booking)
      ).length,
      withTasks: bookings.filter(
        (booking) => booking.tasks.length > 0 && isActiveBooking(booking)
      ).length,
      needsMapping: bookings.filter((booking) => booking.needsMapping).length,
      cancelled: bookings.filter((booking) => isCancelledBooking(booking.status)).length,
      todayCheckout: bookings.filter((booking) => {
        const checkout = getDateOnly(booking.checkOutDate)
        return checkout.getTime() === today.getTime()
      }).length,
      next3Days: bookings.filter((booking) => {
        const checkout = getDateOnly(booking.checkOutDate)
        return checkout >= today && checkout <= next3
      }).length,
    }
  }, [bookings])

  const filteredBookings = useMemo(() => {
    const today = getTodayDateOnly()
    const next3 = new Date(today)
    next3.setDate(next3.getDate() + 3)

    const normalizedSearch = search.trim().toLowerCase()

    let result = [...bookings]

    if (activeFilter === "active") {
      result = result.filter((booking) => isActiveBooking(booking))
    }

    if (activeFilter === "withoutTasks") {
      result = result.filter(
        (booking) => booking.tasks.length === 0 && isActiveBooking(booking)
      )
    }

    if (activeFilter === "withTasks") {
      result = result.filter(
        (booking) => booking.tasks.length > 0 && isActiveBooking(booking)
      )
    }

    if (activeFilter === "needsMapping") {
      result = result.filter((booking) => booking.needsMapping)
    }

    if (activeFilter === "cancelled") {
      result = result.filter((booking) => isCancelledBooking(booking.status))
    }

    if (activeFilter === "todayCheckout") {
      result = result.filter((booking) => {
        const checkout = getDateOnly(booking.checkOutDate)
        return checkout.getTime() === today.getTime()
      })
    }

    if (activeFilter === "next3Days") {
      result = result.filter((booking) => {
        const checkout = getDateOnly(booking.checkOutDate)
        return checkout >= today && checkout <= next3
      })
    }

    if (normalizedSearch) {
      result = result.filter((booking) => {
        const haystack = [
          booking.externalBookingId,
          booking.externalListingId,
          booking.externalListingName,
          booking.externalPropertyAddress,
          booking.externalPropertyCity,
          booking.externalPropertyRegion,
          booking.externalPropertyPostalCode,
          booking.externalPropertyCountry,
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
    }

    return result
  }, [bookings, activeFilter, search])

  const filterButtons: Array<{
    key: FilterKey
    label: string
    count: number
  }> = [
    { key: "all", label: texts.list.all, count: counters.all },
    { key: "active", label: texts.list.active, count: counters.active },
    {
      key: "withoutTasks",
      label: texts.list.withoutTasks,
      count: counters.withoutTasks,
    },
    { key: "withTasks", label: texts.list.withTasks, count: counters.withTasks },
    {
      key: "needsMapping",
      label: texts.list.needsMapping,
      count: counters.needsMapping,
    },
    { key: "cancelled", label: texts.list.cancelled, count: counters.cancelled },
    {
      key: "todayCheckout",
      label: texts.list.todayCheckout,
      count: counters.todayCheckout,
    },
    {
      key: "next3Days",
      label: texts.list.next3Days,
      count: counters.next3Days,
    },
  ]

  const filteredPropertyOptions = useMemo(() => {
    const normalizedSearch = propertySearch.trim().toLowerCase()

    if (!normalizedSearch) return properties

    return properties.filter((property) => {
      const haystack = [
        property.code,
        property.name,
        property.address,
        property.city,
        property.region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [properties, propertySearch])

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {texts.list.title}
          </h1>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
            {language === "en"
              ? "Bookings are imported first. The system stores the external listing and external property data from the platform. If a booking has no property mapping, you must first match it to an existing property or create a new property before task creation."
              : "Οι κρατήσεις εισάγονται πρώτα. Το σύστημα αποθηκεύει τα εξωτερικά στοιχεία listing και τα εξωτερικά στοιχεία ακινήτου από την πλατφόρμα. Αν μια κράτηση δεν έχει αντιστοίχιση με ακίνητο, πρέπει πρώτα να αντιστοιχιστεί με υπάρχον ακίνητο ή να δημιουργηθεί νέο ακίνητο πριν από τη δημιουργία εργασίας."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/bookings/history"
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
          >
            {texts.list.historyButton}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filterButtons.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveFilter(item.key)}
            className={
              activeFilter === item.key
                ? "rounded-3xl border border-slate-950 bg-slate-950 p-5 text-left text-white shadow-sm transition"
                : "rounded-3xl border border-slate-200 bg-white p-5 text-left text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            }
          >
            <div className="text-sm font-medium opacity-80">{item.label}</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">
              {item.count}
            </div>
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {texts.list.listTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {language === "en"
                ? "Review imported bookings, see the real period from check-out to next check-in, inspect the imported property data only when needed, and continue with mapping or task creation."
                : "Έλεγξε τις εισαγόμενες κρατήσεις, δες το πραγματικό διάστημα από check-out έως επόμενο check-in, εξέτασε τα εισαγόμενα στοιχεία μόνο όπου χρειάζεται και συνέχισε με αντιστοίχιση ή δημιουργία εργασίας."}
            </p>
          </div>

          <div className="w-full lg:w-[340px]">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              placeholder={texts.common.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">{texts.common.loading}</div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-600">{error}</div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{texts.list.noBookings}</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredBookings.map((booking) => {
              const syncBadgeClass = booking.needsMapping
                ? getBadgeClassName("warning")
                : isCancelledBooking(booking.status)
                  ? getBadgeClassName("danger")
                  : getBadgeClassName("success")

              const taskBadgeClass = getTaskCoverageBadgeClass(booking.taskStatus)
              const firstTask = booking.tasks[0] || null
              const stateBlock = getBookingStateBlock(booking, language, texts)

              const propertyDisplay = booking.property
                ? `${booking.property.code} · ${booking.property.name}`
                : texts.list.propertyNotMapped

              const externalPropertyDisplay =
                getExternalPropertyDisplay(booking) || texts.common.notAvailable

              const checkOutDateTimeText = formatDateAndTime(
                booking.checkOutDate,
                booking.checkOutTime,
                locale,
                texts.common.notAvailable
              )

              const nextCheckInDateTimeText = booking.workWindow?.nextCheckInDate
                ? formatDateAndTime(
                    booking.workWindow.nextCheckInDate,
                    booking.workWindow.nextCheckInTime,
                    locale,
                    texts.common.notAvailable
                  )
                : texts.list.noNextBooking

              return (
                <article key={booking.id} className="p-5">
                  <div className="space-y-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-semibold text-slate-950">
                            {booking.property
                              ? booking.property.name
                              : booking.externalListingName ||
                                booking.externalListingId ||
                                texts.list.propertyNotMapped}
                          </div>

                          <span className={getBadgeClassName("neutral")}>
                            {normalizeSourcePlatform(booking.sourcePlatform, texts)}
                          </span>

                          <span className={syncBadgeClass}>
                            {getSyncLabel(booking.syncStatus, booking.needsMapping, texts)}
                          </span>

                          <span className={taskBadgeClass}>
                            {getTaskCoverageLabel(booking.taskStatus, language, texts)}
                          </span>
                        </div>

                        <div className="text-sm text-slate-500">
                          {language === "en"
                            ? `Booking ID: ${booking.externalBookingId}`
                            : `Κωδικός κράτησης: ${booking.externalBookingId}`}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/bookings/${booking.id}`}
                          className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                        >
                          {texts.common.view}
                        </Link>

                        {firstTask ? (
                          <Link
                            href={`/tasks/${firstTask.id}`}
                            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            {texts.common.viewTask}
                          </Link>
                        ) : null}

                        {booking.needsMapping ? (
                          <button
                            type="button"
                            onClick={() => openMappingModal(booking)}
                            disabled={!String(booking.externalListingId || "").trim()}
                            className="inline-flex items-center rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300"
                          >
                            {language === "en"
                              ? "Map property"
                              : "Αντιστοίχιση ακινήτου"}
                          </button>
                        ) : firstTask ? (
                          <Link
                            href={`/tasks/${firstTask.id}`}
                            className="inline-flex items-center rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                          >
                            {language === "en"
                              ? "Open task"
                              : "Άνοιγμα εργασίας"}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openCreateTaskModal(booking)}
                            disabled={isCancelledBooking(booking.status)}
                            className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {texts.common.createTask}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={getStatePanelClassName(stateBlock.tone)}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className={getStateTitleClassName(stateBlock.tone)}>
                            {stateBlock.title}
                          </div>

                          <div className={getStateTextClassName(stateBlock.tone)}>
                            {stateBlock.description}
                          </div>

                          {stateBlock.helper ? (
                            <div className={getStateTextClassName(stateBlock.tone)}>
                              {stateBlock.helper}
                            </div>
                          ) : null}
                        </div>

                        {stateBlock.nextStep ? (
                          <div className="shrink-0 rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm font-medium text-slate-900">
                            {language === "en" ? "Next step:" : "Επόμενο βήμα:"}{" "}
                            <span className="font-semibold">{stateBlock.nextStep}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {language === "en"
                            ? "Booking identity"
                            : "Ταυτότητα κράτησης"}
                        </div>

                        <div className="mt-4 space-y-4">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {language === "en"
                                ? "Property in system"
                                : "Ακίνητο στο σύστημα"}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-950">
                              {propertyDisplay}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {language === "en"
                                ? "Platform listing"
                                : "Listing πλατφόρμας"}
                            </div>
                            <div className="mt-1 text-sm font-medium text-slate-900">
                              {booking.externalListingName ||
                                booking.externalListingId ||
                                "-"}
                            </div>
                          </div>

                          {booking.needsMapping ? (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                {language === "en"
                                  ? "Platform property"
                                  : "Ακίνητο πλατφόρμας"}
                              </div>
                              <div className="mt-1 text-sm font-medium text-slate-900">
                                {externalPropertyDisplay}
                              </div>
                              <div className="mt-2 text-xs text-amber-700">
                                {language === "en"
                                  ? "These are the imported address details from the platform that are waiting to be linked to a property in the system."
                                  : "Αυτά είναι τα εισαγμένα στοιχεία διεύθυνσης από την πλατφόρμα που περιμένουν να συνδεθούν με ακίνητο του συστήματος."}
                              </div>
                            </div>
                          ) : booking.property?.address ||
                            booking.property?.city ||
                            booking.property?.region ? (
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {language === "en"
                                  ? "Mapped property location"
                                  : "Τοποθεσία αντιστοιχισμένου ακινήτου"}
                              </div>
                              <div className="mt-1 text-sm font-medium text-slate-900">
                                {[
                                  booking.property?.address,
                                  booking.property?.city,
                                  booking.property?.region,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || texts.common.notAvailable}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {texts.list.windowLabel}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {language === "en"
                            ? "Available time for work between check-out and next check-in."
                            : "Διαθέσιμος χρόνος για εργασία μεταξύ check-out και επόμενου check-in."}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {texts.labels.checkOut}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-950">
                              {checkOutDateTimeText}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {texts.labels.nextCheckIn}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-950">
                              {nextCheckInDateTimeText}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {language === "en"
                              ? "Available work window"
                              : "Διαθέσιμο παράθυρο εργασίας"}
                          </div>

                          <div className="mt-2 text-sm font-semibold text-slate-950">
                            {getWindowRangeLabel(booking, locale, texts)}
                          </div>

                          {booking.workWindow?.windowDurationCompact ? (
                            <div className="mt-2 text-sm text-slate-600">
                              {language === "en"
                                ? `Available duration: ${booking.workWindow.windowDurationCompact}`
                                : `Διαθέσιμη διάρκεια: ${booking.workWindow.windowDurationCompact}`}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-950">
                          {texts.list.linkedTasks}
                        </div>
                        <div className="text-sm text-slate-500">
                          {getTaskSummaryLabel(booking.tasks, language, texts)}
                        </div>
                      </div>

                      {firstTask ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-950">
                                {normalizeTaskTitle(firstTask.title, language)}
                              </div>
                              <div className="mt-1 text-sm text-slate-600">
                                {getTaskTypeDisplay(firstTask.taskType, language, texts)} ·{" "}
                                {getTaskStatusDisplay(firstTask.status, language)} ·{" "}
                                {getPriorityDisplay(firstTask.priority, language)}
                              </div>
                            </div>

                            <Link
                              href={`/tasks/${firstTask.id}`}
                              className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              {texts.common.viewTask}
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                          {language === "en"
                            ? "No task has been created for this booking yet."
                            : "Δεν έχει δημιουργηθεί ακόμη εργασία για αυτή την κράτηση."}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {modal.open && modal.booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  {texts.modal.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {modal.booking.property?.name ||
                    modal.booking.externalListingName ||
                    modal.booking.externalBookingId}
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
                      {texts.labels.checkOut}
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {formatDateAndTime(
                        modal.booking.checkOutDate,
                        modal.booking.checkOutTime,
                        locale,
                        texts.common.notAvailable
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {texts.labels.nextCheckIn}
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {modal.booking.workWindow?.nextCheckInDate
                        ? formatDateAndTime(
                            modal.booking.workWindow.nextCheckInDate,
                            modal.booking.workWindow.nextCheckInTime,
                            locale,
                            texts.common.notAvailable
                          )
                        : texts.list.noNextBooking}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-white p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {texts.list.windowLabel}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {getWindowRangeLabel(modal.booking, locale, texts)}
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
                disabled={submittingTask}
                className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submittingTask ? texts.common.creating : texts.common.createTask}
              </button>
            </div>
          </div>
        </div>
      )}

      {mappingModal.open && mappingModal.booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  {language === "en"
                    ? "Property mapping"
                    : "Αντιστοίχιση ακινήτου"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {mappingModal.booking.externalListingName ||
                    mappingModal.booking.externalListingId ||
                    mappingModal.booking.externalBookingId}
                </p>
              </div>

              <button
                type="button"
                onClick={closeMappingModal}
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {texts.common.close}
              </button>
            </div>

            <div className="space-y-6 p-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {language === "en" ? "Listing" : "Listing"}
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {mappingModal.booking.externalListingName ||
                        mappingModal.booking.externalListingId ||
                        "-"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {texts.labels.checkOut}
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {formatDateAndTime(
                        mappingModal.booking.checkOutDate,
                        mappingModal.booking.checkOutTime,
                        locale,
                        texts.common.notAvailable
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-3 md:col-span-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {language === "en"
                        ? "Imported platform property"
                        : "Εισαγόμενο ακίνητο πλατφόρμας"}
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {getExternalPropertyDisplay(mappingModal.booking) ||
                        texts.common.notAvailable}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMappingMode("existing")}
                  className={
                    mappingMode === "existing"
                      ? "rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                      : "rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
                  }
                >
                  {language === "en"
                    ? "Match existing property"
                    : "Αντιστοίχιση με υπάρχον ακίνητο"}
                </button>

                <button
                  type="button"
                  onClick={() => setMappingMode("new")}
                  className={
                    mappingMode === "new"
                      ? "rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                      : "rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
                  }
                >
                  {language === "en"
                    ? "Create new property"
                    : "Δημιουργία νέου ακινήτου"}
                </button>
              </div>

              {mappingMode === "existing" ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      {language === "en"
                        ? "Search property"
                        : "Αναζήτηση ακινήτου"}
                    </label>
                    <input
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      value={propertySearch}
                      onChange={(e) => setPropertySearch(e.target.value)}
                      placeholder={
                        language === "en"
                          ? "Search by code, name, address..."
                          : "Αναζήτηση με κωδικό, όνομα, διεύθυνση..."
                      }
                    />
                  </div>

                  <div className="max-h-[320px] space-y-3 overflow-y-auto">
                    {filteredPropertyOptions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                        {language === "en"
                          ? "No properties found."
                          : "Δεν βρέθηκαν ακίνητα."}
                      </div>
                    ) : (
                      filteredPropertyOptions.map((property) => {
                        const isSelected = selectedPropertyId === property.id

                        return (
                          <button
                            key={property.id}
                            type="button"
                            onClick={() => setSelectedPropertyId(property.id)}
                            className={
                              isSelected
                                ? "w-full rounded-2xl border border-slate-950 bg-slate-950 p-4 text-left text-white"
                                : "w-full rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                            }
                          >
                            <div className="font-semibold">
                              {property.code} · {property.name}
                            </div>
                            <div className="mt-1 text-sm opacity-90">
                              {[property.address, property.city, property.region]
                                .filter(Boolean)
                                .join(" · ") || "-"}
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 rounded-3xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-sm font-semibold text-amber-900">
                      {language === "en"
                        ? "The form is already prefilled with the imported property data from the platform."
                        : "Η φόρμα είναι ήδη προσυμπληρωμένη με τα εισαγόμενα στοιχεία ακινήτου από την πλατφόρμα."}
                    </div>
                    <div className="mt-1 text-sm text-amber-800">
                      {language === "en"
                        ? "Adjust anything you want before creating the new property."
                        : "Προσαρμόζεις ό,τι θέλεις πριν δημιουργήσεις το νέο ακίνητο."}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      {language === "en"
                        ? "Property name"
                        : "Όνομα ακινήτου"}
                    </label>
                    <input
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      value={newPropertyName}
                      onChange={(e) => setNewPropertyName(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      {language === "en"
                        ? "Address"
                        : "Διεύθυνση"}
                    </label>
                    <input
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      value={newPropertyAddress}
                      onChange={(e) => setNewPropertyAddress(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      {language === "en" ? "City" : "Πόλη"}
                    </label>
                    <input
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      value={newPropertyCity}
                      onChange={(e) => setNewPropertyCity(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      {language === "en" ? "Region" : "Περιοχή"}
                    </label>
                    <input
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      value={newPropertyRegion}
                      onChange={(e) => setNewPropertyRegion(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      {language === "en"
                        ? "Postal code"
                        : "Ταχυδρομικός κώδικας"}
                    </label>
                    <input
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      value={newPropertyPostalCode}
                      onChange={(e) => setNewPropertyPostalCode(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      {language === "en" ? "Country" : "Χώρα"}
                    </label>
                    <input
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      value={newPropertyCountry}
                      onChange={(e) => setNewPropertyCountry(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      {language === "en" ? "Type" : "Τύπος"}
                    </label>
                    <select
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      value={newPropertyType}
                      onChange={(e) => setNewPropertyType(e.target.value)}
                    >
                      <option value="apartment">
                        {language === "en" ? "Apartment" : "Διαμέρισμα"}
                      </option>
                      <option value="house">
                        {language === "en" ? "House" : "Κατοικία"}
                      </option>
                      <option value="villa">
                        {language === "en" ? "Villa" : "Βίλα"}
                      </option>
                      <option value="studio">
                        {language === "en" ? "Studio" : "Στούντιο"}
                      </option>
                      <option value="other">
                        {language === "en" ? "Other" : "Άλλο"}
                      </option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={closeMappingModal}
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {texts.common.cancel}
              </button>

              <button
                type="button"
                onClick={handleConfirmMapping}
                disabled={submittingMapping}
                className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submittingMapping
                  ? language === "en"
                    ? "Saving..."
                    : "Αποθήκευση..."
                  : language === "en"
                    ? "Confirm"
                    : "Επιβεβαίωση"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}