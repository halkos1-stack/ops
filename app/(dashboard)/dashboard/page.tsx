"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type Ακίνητο = {
  id: string
  code?: string
  name: string
  address?: string | null
  city?: string | null
  region?: string | null
  status?: string | null
}

type Εργασία = {
  id: string
  title: string
  description?: string | null
  status: string
  priority?: string | null
  taskType?: string | null
  scheduledDate: string
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  alertEnabled?: boolean
  alertAt?: string | null
  createdAt: string
  propertyId?: string | null
  property?: Ακίνητο | null
}

type ΦίλτροΠίνακαΕλέγχου =
  | "all_open"
  | "today"
  | "pending"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "alerts"

type ΚανονικήΚατάστασηΕργασίας =
  | "NEW"
  | "PENDING"
  | "ASSIGNED"
  | "WAITING_ACCEPTANCE"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "UNKNOWN"

function normalizeTaskStatus(
  status: string | null | undefined
): ΚανονικήΚατάστασηΕργασίας {
  const value = String(status || "").trim().toLowerCase()

  if (value === "new") return "NEW"
  if (value === "pending") return "PENDING"
  if (value === "assigned") return "ASSIGNED"
  if (value === "waiting_acceptance" || value === "waiting-acceptance") {
    return "WAITING_ACCEPTANCE"
  }
  if (value === "accepted") return "ACCEPTED"
  if (value === "in_progress" || value === "in-progress") return "IN_PROGRESS"
  if (value === "completed") return "COMPLETED"
  if (value === "cancelled" || value === "canceled") return "CANCELLED"

  return "UNKNOWN"
}

function normalizeDateOnly(dateValue: string | Date | null | undefined) {
  if (!dateValue) return null

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDate(
  dateValue: string | Date | null | undefined,
  locale: string
) {
  const normalized = normalizeDateOnly(dateValue)
  if (!normalized) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(normalized)
}

function formatDateTime(
  dateValue: string | Date | null | undefined,
  locale: string
) {
  if (!dateValue) return "—"

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function toDateInputValue(dateValue: Date) {
  const local = new Date(
    dateValue.getTime() - dateValue.getTimezoneOffset() * 60000
  )
  return local.toISOString().slice(0, 10)
}

function είναιΑνοιχτήΕργασία(εργασία: Εργασία) {
  const κατάσταση = normalizeTaskStatus(εργασία.status)

  return [
    "NEW",
    "PENDING",
    "ASSIGNED",
    "WAITING_ACCEPTANCE",
    "ACCEPTED",
    "IN_PROGRESS",
  ].includes(κατάσταση)
}

function είναιΣήμερα(dateValue: string | null | undefined) {
  const today = normalizeDateOnly(new Date())
  const target = normalizeDateOnly(dateValue)

  if (!today || !target) return false

  return target.getTime() === today.getTime()
}

function είναιΕνεργόAlert(εργασία: Εργασία) {
  if (!εργασία.alertEnabled) return false
  if (!εργασία.alertAt) return false
  if (!είναιΑνοιχτήΕργασία(εργασία)) return false

  const alertDate = new Date(εργασία.alertAt)
  if (Number.isNaN(alertDate.getTime())) return false

  return alertDate.getTime() <= Date.now()
}

function είναιΜέσαΣεΕύροςΗμερομηνίας(
  εργασία: Εργασία,
  από: string,
  έως: string
) {
  const target = normalizeDateOnly(εργασία.scheduledDate)
  if (!target) return false

  const fromDate = από ? normalizeDateOnly(από) : null
  const toDate = έως ? normalizeDateOnly(έως) : null

  if (fromDate && target.getTime() < fromDate.getTime()) {
    return false
  }

  if (toDate && target.getTime() > toDate.getTime()) {
    return false
  }

  return true
}

function getTaskStatusClasses(status: string) {
  const normalized = normalizeTaskStatus(status)

  switch (normalized) {
    case "NEW":
    case "PENDING":
      return "border border-amber-200 bg-amber-100 text-amber-700"
    case "ASSIGNED":
    case "WAITING_ACCEPTANCE":
      return "border border-orange-200 bg-orange-100 text-orange-700"
    case "ACCEPTED":
      return "border border-sky-200 bg-sky-100 text-sky-700"
    case "IN_PROGRESS":
      return "border border-blue-200 bg-blue-100 text-blue-700"
    default:
      return "border border-slate-200 bg-slate-100 text-slate-700"
  }
}

function getPriorityClasses(priority?: string | null) {
  switch (String(priority || "").toLowerCase()) {
    case "urgent":
    case "critical":
      return "border border-red-200 bg-red-100 text-red-700"
    case "high":
      return "border border-amber-200 bg-amber-100 text-amber-700"
    case "medium":
    case "normal":
      return "border border-sky-200 bg-sky-100 text-sky-700"
    case "low":
      return "border border-slate-200 bg-slate-100 text-slate-700"
    default:
      return "border border-slate-200 bg-slate-100 text-slate-700"
  }
}

function getCardClasses(
  active: boolean,
  tone: "default" | "amber" | "orange" | "sky" | "blue" | "red"
) {
  if (active) {
    switch (tone) {
      case "amber":
        return "border-amber-300 bg-amber-50 ring-2 ring-amber-200"
      case "orange":
        return "border-orange-300 bg-orange-50 ring-2 ring-orange-200"
      case "sky":
        return "border-sky-300 bg-sky-50 ring-2 ring-sky-200"
      case "blue":
        return "border-blue-300 bg-blue-50 ring-2 ring-blue-200"
      case "red":
        return "border-red-300 bg-red-50 ring-2 ring-red-200"
      default:
        return "border-slate-300 bg-slate-50 ring-2 ring-slate-200"
    }
  }

  return "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
}

function getDashboardTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      locale: "en-GB",
      title: "Task control board",
      subtitle:
        "Operational control view with open tasks, active alerts and date filters.",
      newTask: "New task",
      loadError: "Dashboard data could not be loaded.",
      loadingTasks: "Failed to load tasks",

      openTasks: "Open tasks",
      openTasksHint: "Only active tasks that still require action",

      tasksToday: "Tasks today",
      tasksTodayHint: "Open tasks scheduled for today",

      alertsNow: "Active alerts",
      alertsNowHint: "Open tasks with active alert time",

      pendingTasks: "New / pending",
      pendingTasksHint: "Open tasks waiting for assignment or first action",

      assignedTasks: "Assigned / waiting",
      assignedTasksHint: "Tasks assigned and waiting for acceptance",

      acceptedTasks: "Accepted",
      acceptedTasksHint: "Tasks accepted and ready for execution",

      inProgressTasks: "In progress",
      inProgressTasksHint: "Tasks currently being executed",

      recentOpenTasks: "Open tasks",
      recentOpenTasksHint:
        "Operational list filtered by status and date range.",

      noTasks: "No open tasks found.",
      noTasksHint: "Try another filter or create a new task.",

      propertyFilter: "Property",
      allProperties: "All properties",
      fromDate: "From",
      toDate: "To",
      clearDates: "Clear dates",

      filterAllOpen: "All open",
      filterToday: "Today",
      filterPending: "New / pending",
      filterAssigned: "Assigned / waiting",
      filterAccepted: "Accepted",
      filterInProgress: "In progress",
      filterAlerts: "Alerts",

      withoutProperty: "Without property",
      scheduledDate: "Date",
      scheduledTime: "Time",
      alertTime: "Alert",
      noAlert: "No alert",
      openTask: "Open task",
      openTasksPage: "Open tasks page",
      noDescription: "No description available.",

      status: {
        new: "New",
        pending: "Pending",
        assigned: "Assigned",
        waiting_acceptance: "Waiting acceptance",
        accepted: "Accepted",
        in_progress: "In progress",
      },

      priority: {
        low: "Low",
        normal: "Normal",
        medium: "Medium",
        high: "High",
        urgent: "Urgent",
      },
    }
  }

  return {
    locale: "el-GR",
    title: "Πίνακας ελέγχου εργασιών",
    subtitle:
      "Λειτουργική εικόνα ελέγχου με ανοιχτές εργασίες, ενεργά alert και φίλτρα ημερομηνιών.",
    newTask: "Νέα εργασία",
    loadError: "Δεν ήταν δυνατή η φόρτωση του πίνακα ελέγχου.",
    loadingTasks: "Αποτυχία φόρτωσης εργασιών",

    openTasks: "Ανοιχτές εργασίες",
    openTasksHint: "Μόνο ενεργές εργασίες που απαιτούν ακόμη ενέργεια",

    tasksToday: "Εργασίες σήμερα",
    tasksTodayHint: "Ανοιχτές εργασίες προγραμματισμένες για σήμερα",

    alertsNow: "Ενεργά alert",
    alertsNowHint: "Ανοιχτές εργασίες με ενεργή ώρα alert",

    pendingTasks: "Νέες / εκκρεμείς",
    pendingTasksHint: "Ανοιχτές εργασίες που περιμένουν ανάθεση ή πρώτη ενέργεια",

    assignedTasks: "Ανατεθειμένες / αναμονή",
    assignedTasksHint: "Εργασίες που έχουν ανατεθεί και περιμένουν αποδοχή",

    acceptedTasks: "Αποδεκτές",
    acceptedTasksHint:
      "Εργασίες που έχουν αποδεχτεί και είναι έτοιμες για εκτέλεση",

    inProgressTasks: "Σε εξέλιξη",
    inProgressTasksHint: "Εργασίες που εκτελούνται τώρα",

    recentOpenTasks: "Ανοιχτές εργασίες",
    recentOpenTasksHint:
      "Λειτουργική λίστα εργασιών με φίλτρα κατάστασης και εύρους ημερομηνιών.",

    noTasks: "Δεν βρέθηκαν ανοιχτές εργασίες.",
    noTasksHint: "Δοκίμασε άλλο φίλτρο ή δημιούργησε νέα εργασία.",

    fromDate: "Από",
    toDate: "Έως",
    clearDates: "Καθαρισμός ημερομηνιών",

    filterAllOpen: "Όλες οι ανοιχτές",
    filterToday: "Σήμερα",
    filterPending: "Νέες / εκκρεμείς",
    filterAssigned: "Ανατεθειμένες / αναμονή",
    filterAccepted: "Αποδεκτές",
    filterInProgress: "Σε εξέλιξη",
    filterAlerts: "Alert",

    withoutProperty: "Χωρίς ακίνητο",
    scheduledDate: "Ημερομηνία",
    scheduledTime: "Ώρα",
    alertTime: "Alert",
    noAlert: "Χωρίς alert",
    openTask: "Άνοιγμα εργασίας",
    openTasksPage: "Σελίδα εργασιών",
    noDescription: "Δεν υπάρχει διαθέσιμη περιγραφή.",

    status: {
      new: "Νέα",
      pending: "Εκκρεμής",
      assigned: "Ανατεθειμένη",
      waiting_acceptance: "Αναμονή αποδοχής",
      accepted: "Αποδεκτή",
      in_progress: "Σε εξέλιξη",
    },

    priority: {
      low: "Χαμηλή",
      normal: "Κανονική",
      medium: "Μεσαία",
      high: "Υψηλή",
      urgent: "Επείγουσα",
    },
  }
}

function getTaskStatusLabel(language: "el" | "en", status: string) {
  const texts = getDashboardTexts(language)
  const normalized = normalizeTaskStatus(status)

  switch (normalized) {
    case "NEW":
      return texts.status.new
    case "PENDING":
      return texts.status.pending
    case "ASSIGNED":
      return texts.status.assigned
    case "WAITING_ACCEPTANCE":
      return texts.status.waiting_acceptance
    case "ACCEPTED":
      return texts.status.accepted
    case "IN_PROGRESS":
      return texts.status.in_progress
    default:
      return status
  }
}

function getPriorityLabel(language: "el" | "en", priority?: string | null) {
  const texts = getDashboardTexts(language)

  switch (String(priority || "").toLowerCase()) {
    case "low":
      return texts.priority.low
    case "normal":
      return texts.priority.normal
    case "medium":
      return texts.priority.medium
    case "high":
      return texts.priority.high
    case "urgent":
      return texts.priority.urgent
    default:
      return priority || "—"
  }
}

function normalizeTaskDescription(
  description: string | null | undefined,
  language: "el" | "en"
) {
  if (!description || !description.trim()) {
    return null
  }

  let text = description.trim()

  if (language === "en") {
    text = text
      .replace(
        /Εργασία που δημιουργήθηκε χειροκίνητα από κράτηση\./gi,
        "Task created manually from booking."
      )
      .replace(/Πηγή:/gi, "Source:")
      .replace(/Κωδικός κράτησης:/gi, "Booking code:")
      .replace(/Επισκέπτης:/gi, "Guest:")
      .replace(/Άφιξη:/gi, "Check-in:")
      .replace(/Αναχώρηση:/gi, "Check-out:")
      .replace(/Καθαρισμός μετά από check-out/gi, "Cleaning after check-out")
      .replace(/Καθαρισμός/gi, "Cleaning")
      .replace(/Επιθεώρηση/gi, "Inspection")
      .replace(/Τεχνικός έλεγχος/gi, "Technical check")
      .replace(/Αναλώσιμα/gi, "Supplies")
      .replace(/Βλάβη/gi, "Issue")
      .replace(/Ζημιά/gi, "Damage")
  } else {
    text = text
      .replace(
        /Task created manually from booking\./gi,
        "Εργασία που δημιουργήθηκε χειροκίνητα από κράτηση."
      )
      .replace(/\bSource:/gi, "Πηγή:")
      .replace(/\bBooking code:/gi, "Κωδικός κράτησης:")
      .replace(/\bGuest:/gi, "Επισκέπτης:")
      .replace(/\bCheck-in:/gi, "Άφιξη:")
      .replace(/\bCheck-out:/gi, "Αναχώρηση:")
      .replace(/Cleaning after check-out/gi, "Καθαρισμός μετά από check-out")
      .replace(/\bCleaning\b/gi, "Καθαρισμός")
      .replace(/\bInspection\b/gi, "Επιθεώρηση")
      .replace(/Technical check/gi, "Τεχνικός έλεγχος")
      .replace(/\bSupplies\b/gi, "Αναλώσιμα")
      .replace(/\bIssue\b/gi, "Βλάβη")
      .replace(/\bDamage\b/gi, "Ζημιά")
  }

  return text
}

function normalizeTaskTitle(
  title: string | null | undefined,
  language: "el" | "en"
) {
  if (!title || !title.trim()) return "—"

  let text = title.trim()

  if (language === "en") {
    text = text
      .replace(/Καθαρισμός μετά από check-out/gi, "Cleaning after check-out")
      .replace(/\bΚαθαρισμός\b/gi, "Cleaning")
      .replace(/Επιθεώρηση/gi, "Inspection")
      .replace(/Τεχνικός έλεγχος/gi, "Technical check")
      .replace(/Αναλώσιμα/gi, "Supplies")
      .replace(/Βλάβη/gi, "Issue")
      .replace(/Ζημιά/gi, "Damage")
  } else {
    text = text
      .replace(/Cleaning after check-out/gi, "Καθαρισμός μετά από check-out")
      .replace(/\bCleaning\b/gi, "Καθαρισμός")
      .replace(/\bInspection\b/gi, "Επιθεώρηση")
      .replace(/Technical check/gi, "Τεχνικός έλεγχος")
      .replace(/\bSupplies\b/gi, "Αναλώσιμα")
      .replace(/\bIssue\b/gi, "Βλάβη")
      .replace(/\bDamage\b/gi, "Ζημιά")
  }

  return text
}

export default function DashboardPage() {
  const { language } = useAppLanguage()
  const texts = getDashboardTexts(language)
  const propertyFilterLabel = language === "en" ? "Property" : "Ακίνητο"
  const allPropertiesLabel = language === "en" ? "All properties" : "Όλα τα ακίνητα"

  const σήμερα = useMemo(() => new Date(), [])
  const [εργασίες, setΕργασίες] = useState<Εργασία[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeFilter, setActiveFilter] =
    useState<ΦίλτροΠίνακαΕλέγχου>("all_open")
  const [selectedPropertyId, setSelectedPropertyId] = useState("")

  const [ημερομηνίαΑπό, setΗμερομηνίαΑπό] = useState(
    toDateInputValue(σήμερα)
  )
  const [ημερομηνίαΈως, setΗμερομηνίαΈως] = useState("")

  async function loadDashboardData() {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams()
      params.set("openOnly", "true")

      const response = await fetch(`/api/tasks?${params.toString()}`, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(texts.loadingTasks)
      }

      const data = await response.json()
      setΕργασίες(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Dashboard load error:", err)
      setError(texts.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  const openTasks = useMemo(() => {
    return εργασίες.filter((εργασία) => είναιΑνοιχτήΕργασία(εργασία))
  }, [εργασίες])

  const propertyOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code?: string }>()

    openTasks.forEach((εργασία) => {
      const property = εργασία.property
      if (!property?.id) return
      map.set(property.id, {
        id: property.id,
        name: property.name,
        code: property.code,
      })
    })

    return [...map.values()].sort((a, b) =>
      `${a.name} ${a.code || ""}`.localeCompare(`${b.name} ${b.code || ""}`, texts.locale)
    )
  }, [openTasks, texts.locale])

  const propertyFilteredOpenTasks = useMemo(() => {
    if (!selectedPropertyId) return openTasks
    return openTasks.filter((εργασία) => εργασία.propertyId === selectedPropertyId)
  }, [openTasks, selectedPropertyId])

  const dateFilteredOpenTasks = useMemo(() => {
    return propertyFilteredOpenTasks.filter((εργασία) =>
      είναιΜέσαΣεΕύροςΗμερομηνίας(εργασία, ημερομηνίαΑπό, ημερομηνίαΈως)
    )
  }, [propertyFilteredOpenTasks, ημερομηνίαΑπό, ημερομηνίαΈως])

  const tasksToday = useMemo(() => {
    return dateFilteredOpenTasks.filter((εργασία) =>
      είναιΣήμερα(εργασία.scheduledDate)
    )
  }, [dateFilteredOpenTasks])

  const alertTasks = useMemo(() => {
    return dateFilteredOpenTasks.filter((εργασία) => είναιΕνεργόAlert(εργασία))
  }, [dateFilteredOpenTasks])

  const pendingTasks = useMemo(() => {
    return dateFilteredOpenTasks.filter((εργασία) => {
      const status = normalizeTaskStatus(εργασία.status)
      return status === "NEW" || status === "PENDING"
    })
  }, [dateFilteredOpenTasks])

  const assignedTasks = useMemo(() => {
    return dateFilteredOpenTasks.filter((εργασία) => {
      const status = normalizeTaskStatus(εργασία.status)
      return status === "ASSIGNED" || status === "WAITING_ACCEPTANCE"
    })
  }, [dateFilteredOpenTasks])

  const acceptedTasks = useMemo(() => {
    return dateFilteredOpenTasks.filter(
      (εργασία) => normalizeTaskStatus(εργασία.status) === "ACCEPTED"
    )
  }, [dateFilteredOpenTasks])

  const inProgressTasks = useMemo(() => {
    return dateFilteredOpenTasks.filter(
      (εργασία) => normalizeTaskStatus(εργασία.status) === "IN_PROGRESS"
    )
  }, [dateFilteredOpenTasks])

  const filteredTasks = useMemo(() => {
    let result = [...dateFilteredOpenTasks]

    switch (activeFilter) {
      case "today":
        result = result.filter((εργασία) => είναιΣήμερα(εργασία.scheduledDate))
        break
      case "pending":
        result = result.filter((εργασία) => {
          const status = normalizeTaskStatus(εργασία.status)
          return status === "NEW" || status === "PENDING"
        })
        break
      case "assigned":
        result = result.filter((εργασία) => {
          const status = normalizeTaskStatus(εργασία.status)
          return status === "ASSIGNED" || status === "WAITING_ACCEPTANCE"
        })
        break
      case "accepted":
        result = result.filter(
          (εργασία) => normalizeTaskStatus(εργασία.status) === "ACCEPTED"
        )
        break
      case "in_progress":
        result = result.filter(
          (εργασία) => normalizeTaskStatus(εργασία.status) === "IN_PROGRESS"
        )
        break
      case "alerts":
        result = result.filter((εργασία) => είναιΕνεργόAlert(εργασία))
        break
      case "all_open":
      default:
        break
    }

    return [...result].sort((a, b) => {
      const aIsAlert = είναιΕνεργόAlert(a) ? 1 : 0
      const bIsAlert = είναιΕνεργόAlert(b) ? 1 : 0

      if (aIsAlert !== bIsAlert) return bIsAlert - aIsAlert

      const aDate = new Date(a.scheduledDate).getTime()
      const bDate = new Date(b.scheduledDate).getTime()

      if (aDate !== bDate) return aDate - bDate

      const aAlert = a.alertAt
        ? new Date(a.alertAt).getTime()
        : Number.MAX_SAFE_INTEGER
      const bAlert = b.alertAt
        ? new Date(b.alertAt).getTime()
        : Number.MAX_SAFE_INTEGER

      return aAlert - bAlert
    })
  }, [dateFilteredOpenTasks, activeFilter])

  if (loading) {
    return (
      <div className="space-y-8">
        <section>
          <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-96 animate-pulse rounded bg-slate-200" />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 h-8 w-20 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-3 w-40 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 space-y-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-3 w-80 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {texts.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{texts.subtitle}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/tasks/new"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {texts.newTask}
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setActiveFilter("all_open")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${getCardClasses(
            activeFilter === "all_open",
            "default"
          )}`}
        >
          <p className="text-sm font-medium text-slate-500">
            {texts.openTasks}
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {dateFilteredOpenTasks.length}
          </p>
          <p className="mt-2 text-xs text-slate-500">{texts.openTasksHint}</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("today")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${getCardClasses(
            activeFilter === "today",
            "blue"
          )}`}
        >
          <p className="text-sm font-medium text-slate-500">
            {texts.tasksToday}
          </p>
          <p className="mt-3 text-3xl font-bold text-blue-600">
            {tasksToday.length}
          </p>
          <p className="mt-2 text-xs text-slate-500">{texts.tasksTodayHint}</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("alerts")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${getCardClasses(
            activeFilter === "alerts",
            "red"
          )}`}
        >
          <p className="text-sm font-medium text-slate-500">
            {texts.alertsNow}
          </p>
          <p className="mt-3 text-3xl font-bold text-red-600">
            {alertTasks.length}
          </p>
          <p className="mt-2 text-xs text-slate-500">{texts.alertsNowHint}</p>
        </button>

        <div className="hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            {texts.fromDate} – {texts.toDate}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <input
              type="date"
              value={ημερομηνίαΑπό}
              onChange={(e) => setΗμερομηνίαΑπό(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />

            <input
              type="date"
              value={ημερομηνίαΈως}
              onChange={(e) => setΗμερομηνίαΈως(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />

            <button
              type="button"
              onClick={() => {
                setΗμερομηνίαΑπό(toDateInputValue(new Date()))
                setΗμερομηνίαΈως("")
              }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.clearDates}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setActiveFilter("pending")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${getCardClasses(
            activeFilter === "pending",
            "amber"
          )}`}
        >
          <p className="text-sm font-medium text-slate-500">
            {texts.pendingTasks}
          </p>
          <p className="mt-3 text-3xl font-bold text-amber-600">
            {pendingTasks.length}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {texts.pendingTasksHint}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("assigned")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${getCardClasses(
            activeFilter === "assigned",
            "orange"
          )}`}
        >
          <p className="text-sm font-medium text-slate-500">
            {texts.assignedTasks}
          </p>
          <p className="mt-3 text-3xl font-bold text-orange-600">
            {assignedTasks.length}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {texts.assignedTasksHint}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("accepted")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${getCardClasses(
            activeFilter === "accepted",
            "sky"
          )}`}
        >
          <p className="text-sm font-medium text-slate-500">
            {texts.acceptedTasks}
          </p>
          <p className="mt-3 text-3xl font-bold text-sky-600">
            {acceptedTasks.length}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {texts.acceptedTasksHint}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("in_progress")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${getCardClasses(
            activeFilter === "in_progress",
            "blue"
          )}`}
        >
          <p className="text-sm font-medium text-slate-500">
            {texts.inProgressTasks}
          </p>
          <p className="mt-3 text-3xl font-bold text-blue-600">
            {inProgressTasks.length}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {texts.inProgressTasksHint}
          </p>
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1.2fr)_1fr_1fr_auto]">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {propertyFilterLabel}
            </span>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="">{allPropertiesLabel}</option>
              {propertyOptions.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} {property.code ? `· ${property.code}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.fromDate}
            </span>
            <input
              type="date"
              value={ημερομηνίαΑπό}
              onChange={(e) => setΗμερομηνίαΑπό(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.toDate}
            </span>
            <input
              type="date"
              value={ημερομηνίαΈως}
              onChange={(e) => setΗμερομηνίαΈως(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setSelectedPropertyId("")
              setΗμερομηνίαΑπό(toDateInputValue(new Date()))
              setΗμερομηνίαΈως("")
            }}
            className="mt-auto inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {texts.clearDates}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {texts.recentOpenTasks}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {texts.recentOpenTasksHint}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter("all_open")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeFilter === "all_open"
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterAllOpen}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("today")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeFilter === "today"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterToday}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("pending")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeFilter === "pending"
                  ? "bg-amber-500 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterPending}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("assigned")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeFilter === "assigned"
                  ? "bg-orange-500 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterAssigned}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("accepted")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeFilter === "accepted"
                  ? "bg-sky-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterAccepted}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("in_progress")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeFilter === "in_progress"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterInProgress}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("alerts")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeFilter === "alerts"
                  ? "bg-red-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterAlerts}
            </button>
          </div>
        </div>

        <div className="p-6">
          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                {texts.noTasks}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {texts.noTasksHint}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((εργασία) => {
                const normalizedDescription = normalizeTaskDescription(
                  εργασία.description,
                  language
                )
                const isActiveAlert = είναιΕνεργόAlert(εργασία)

                const normalizedTitle = normalizeTaskTitle(
                  εργασία.title,
                  language
                )

                return (
                  <div
                    key={εργασία.id}
                    className={`rounded-2xl border p-4 ${
                      isActiveAlert
                        ? "border-red-200 bg-red-50/40"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {normalizedTitle}
                          </p>

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getTaskStatusClasses(
                              εργασία.status
                            )}`}
                          >
                            {getTaskStatusLabel(language, εργασία.status)}
                          </span>

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPriorityClasses(
                              εργασία.priority
                            )}`}
                          >
                            {getPriorityLabel(language, εργασία.priority)}
                          </span>

                          {isActiveAlert ? (
                            <span className="inline-flex rounded-full border border-red-200 bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                              {texts.filterAlerts}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 truncate text-sm text-slate-500">
                          {εργασία.property?.name || texts.withoutProperty}
                        </p>

                        <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
                          {normalizedDescription || texts.noDescription}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/tasks/${εργασία.id}`}
                          className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                            isActiveAlert
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-slate-900 hover:bg-slate-800"
                          }`}
                        >
                          {texts.openTask}
                        </Link>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <InfoBox
                        label={texts.scheduledDate}
                        value={formatDate(εργασία.scheduledDate, texts.locale)}
                      />

                      <InfoBox
                        label={texts.scheduledTime}
                        value={`${εργασία.scheduledStartTime || "—"}${
                          εργασία.scheduledEndTime
                            ? ` - ${εργασία.scheduledEndTime}`
                            : ""
                        }`}
                      />

                      <InfoBox
                        label={texts.alertTime}
                        value={
                          εργασία.alertEnabled && εργασία.alertAt
                            ? formatDateTime(εργασία.alertAt, texts.locale)
                            : texts.noAlert
                        }
                      />
                    </div>
                  </div>
                )
              })}

              <div className="pt-2">
                <Link
                  href="/tasks"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {texts.openTasksPage}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function InfoBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  )
}
