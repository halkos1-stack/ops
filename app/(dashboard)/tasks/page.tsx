"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type Property = {
  id: string
  code: string
  name: string
  city?: string
}

type Partner = {
  id: string
  code: string
  name: string
  email: string
  specialty: string
  status: string
}

type TaskAssignment = {
  id: string
  status: string
  assignedAt?: string | null
  acceptedAt?: string | null
  rejectedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  partner: {
    id: string
    name: string
    email: string
    specialty?: string | null
  }
}

type Task = {
  id: string
  title: string
  description?: string | null
  taskType: string
  source?: string | null
  priority?: string | null
  status?: string | null
  scheduledDate: string
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  dueDate?: string | null
  completedAt?: string | null
  requiresPhotos?: boolean
  requiresChecklist?: boolean
  requiresApproval?: boolean
  alertEnabled?: boolean
  alertAt?: string | null
  notes?: string | null
  resultNotes?: string | null
  property?: Property | null
  assignments?: TaskAssignment[]
  checklistRun?: {
    id: string
    status: string
    startedAt?: string | null
    completedAt?: string | null
    template?: {
      id: string
      title: string
      templateType?: string | null
    } | null
    answers?: Array<{ id: string }>
  } | null
  issues?: Array<{
    id: string
    issueType: string
    title: string
    severity?: string | null
    status?: string | null
  }>
}

type MetricFilter = "all" | "pending" | "assigned" | "accepted" | "completed"

function cls(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function normalizeDateOnly(value?: string | null) {
  const date = normalizeDate(value)
  if (!date) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDate(value: string | null | undefined, locale: string) {
  const date = normalizeDate(value)
  if (!date) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value: string | null | undefined, locale: string) {
  const date = normalizeDate(value)
  if (!date) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getLatestAssignment(task: Task) {
  if (!task.assignments || task.assignments.length === 0) return null

  return [...task.assignments].sort((a, b) => {
    const first = a.assignedAt ? new Date(a.assignedAt).getTime() : 0
    const second = b.assignedAt ? new Date(b.assignedAt).getTime() : 0
    return second - first
  })[0]
}

function calculateDuration(
  start?: string | null,
  end?: string | null,
  language: "el" | "en" = "el"
) {
  if (!start || !end) return "—"

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate.getTime() < startDate.getTime()
  ) {
    return "—"
  }

  const diffMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60

  if (language === "en") {
    if (hours === 0) return `${minutes}m`
    if (minutes === 0) return `${hours}h`
    return `${hours}h ${minutes}m`
  }

  if (hours === 0) return `${minutes}λ`
  if (minutes === 0) return `${hours}ω`
  return `${hours}ω ${minutes}λ`
}

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      locale: "en-GB",
      pageEyebrow: "History and management",
      pageTitle: "Tasks",
      pageSubtitle:
        "Full visibility of tasks by category, partner, property and status.",
      newTask: "New task",

      total: "Total",
      pending: "Pending",
      assigned: "Assigned",
      accepted: "Accepted",
      completed: "Completed",

      filtersTitle: "Filters",
      filtersSubtitle:
        "Use the filters below to narrow the results and monitor task volume.",
      resultsCount: "Filtered results",
      groupedResultsCount: "Tasks returned by current filters",

      property: "Property",
      partner: "Partner",
      category: "Category",
      status: "Status",
      dateFrom: "From date",
      dateTo: "To date",
      allProperties: "All properties",
      allPartners: "All partners",
      allCategories: "All categories",
      allStatuses: "All statuses",

      loading: "Loading tasks...",
      empty: "No tasks found with the current filters.",

      task: "Task",
      propertyCol: "Property",
      partnerCol: "Partner",
      dateCol: "Date",
      statusCol: "Status",
      assignmentCol: "Assignment",
      checklistCol: "Checklist",
      durationCol: "Duration",
      issuesCol: "Issues",

      noAssignment: "Not assigned",
      assignmentAt: "Assignment",
      acceptanceAt: "Acceptance",
      answers: "Answers",
      checklist: "Checklist",
      checklistTag: "Checklist",
      photosTag: "Photos",

      viewTask: "View task",
      viewProperty: "View property",
      details: "Details",
      resultsNotes: "Result notes",
      taskCategoryTotal: "Category tasks total",
      noProperty: "No property",
      noChecklist: "No checklist",

      taskTypeCleaning: "Cleaning",
      taskTypeInspection: "Inspection",
      taskTypeDamage: "Damages",
      taskTypeRepair: "Repairs",
      taskTypeSupplies: "Supplies",
      taskTypePhotos: "Photo documentation",

      statusPending: "Pending",
      statusAssigned: "Assigned",
      statusAccepted: "Accepted",
      statusInProgress: "In progress",
      statusCompleted: "Completed",
      statusRejected: "Rejected",
      statusCancelled: "Cancelled",

      priorityLow: "Low",
      priorityNormal: "Normal",
      priorityMedium: "Medium",
      priorityHigh: "High",
      priorityUrgent: "Urgent",
      priorityCritical: "Critical",

      source: "Source",
      bookingCode: "Booking code",
      guest: "Guest",
      checkIn: "Check-in",
      checkOut: "Check-out",
      taskCreatedFromBooking: "Task created manually from booking.",
      propertyMainChecklist: "Property main checklist",
      propertyTasksChecklist: "Property tasks checklist",
      basicChecklist: "Basic checklist",
    }
  }

  return {
    locale: "el-GR",
    pageEyebrow: "Ιστορικό και διαχείριση",
    pageTitle: "Εργασίες",
    pageSubtitle:
      "Πλήρης εικόνα εργασιών ανά κατηγορία, συνεργάτη, ακίνητο και κατάσταση.",
    newTask: "Νέα εργασία",

    total: "Σύνολο",
    pending: "Σε αναμονή",
    assigned: "Ανατεθειμένες",
    accepted: "Αποδεκτές",
    completed: "Ολοκληρωμένες",

    filtersTitle: "Φίλτρα",
    filtersSubtitle:
      "Χρησιμοποίησε τα φίλτρα για να περιορίσεις τα αποτελέσματα και να βλέπεις τον όγκο εργασιών.",
    resultsCount: "Αποτελέσματα φίλτρων",
    groupedResultsCount: "Εργασίες που επιστρέφουν τα τρέχοντα φίλτρα",

    property: "Ακίνητο",
    partner: "Συνεργάτης",
    category: "Κατηγορία",
    status: "Κατάσταση",
    dateFrom: "Από ημερομηνία",
    dateTo: "Έως ημερομηνία",
    allProperties: "Όλα τα ακίνητα",
    allPartners: "Όλοι οι συνεργάτες",
    allCategories: "Όλες οι κατηγορίες",
    allStatuses: "Όλες οι καταστάσεις",

    loading: "Φόρτωση εργασιών...",
    empty: "Δεν βρέθηκαν εργασίες με τα τρέχοντα φίλτρα.",

    task: "Εργασία",
    propertyCol: "Ακίνητο",
    partnerCol: "Συνεργάτης",
    dateCol: "Ημερομηνία",
    statusCol: "Κατάσταση",
    assignmentCol: "Ανάθεση",
    checklistCol: "Checklist",
    durationCol: "Διάρκεια",
    issuesCol: "Συμβάντα",

    noAssignment: "Δεν έχει ανατεθεί",
    assignmentAt: "Ανάθεση",
    acceptanceAt: "Αποδοχή",
    answers: "Απαντήσεις",
    checklist: "Checklist",
    checklistTag: "Checklist",
    photosTag: "Φωτογραφίες",

    viewTask: "Προβολή εργασίας",
    viewProperty: "Προβολή ακινήτου",
    details: "Λεπτομέρειες",
    resultsNotes: "Σημειώσεις αποτελέσματος",
    taskCategoryTotal: "Σύνολο εργασιών κατηγορίας",
    noProperty: "Χωρίς ακίνητο",
    noChecklist: "Χωρίς checklist",

    taskTypeCleaning: "Καθαρισμός",
    taskTypeInspection: "Επιθεώρηση",
    taskTypeDamage: "Ζημιές",
    taskTypeRepair: "Βλάβες",
    taskTypeSupplies: "Αναλώσιμα",
    taskTypePhotos: "Φωτογραφική τεκμηρίωση",

    statusPending: "Σε αναμονή",
    statusAssigned: "Ανατεθειμένη",
    statusAccepted: "Αποδεκτή",
    statusInProgress: "Σε εξέλιξη",
    statusCompleted: "Ολοκληρωμένη",
    statusRejected: "Απορρίφθηκε",
    statusCancelled: "Ακυρώθηκε",

    priorityLow: "Χαμηλή",
    priorityNormal: "Κανονική",
    priorityMedium: "Μεσαία",
    priorityHigh: "Υψηλή",
    priorityUrgent: "Επείγουσα",
    priorityCritical: "Κρίσιμη",

    source: "Πηγή",
    bookingCode: "Κωδικός κράτησης",
    guest: "Επισκέπτης",
    checkIn: "Άφιξη",
    checkOut: "Αναχώρηση",
    taskCreatedFromBooking: "Εργασία που δημιουργήθηκε χειροκίνητα από κράτηση.",
    propertyMainChecklist: "Κύρια λίστα ακινήτου",
    propertyTasksChecklist: "Βασική λίστα εργασιών ακινήτου",
    basicChecklist: "Βασική λίστα",
  }
}

function mapTaskTypeToUi(taskType: string | null | undefined, language: "el" | "en") {
  const value = (taskType || "").toLowerCase()
  const t = getTexts(language)

  switch (value) {
    case "cleaning":
      return t.taskTypeCleaning
    case "inspection":
      return t.taskTypeInspection
    case "damage":
      return t.taskTypeDamage
    case "repair":
      return t.taskTypeRepair
    case "supplies":
      return t.taskTypeSupplies
    case "photos":
      return t.taskTypePhotos
    default:
      return taskType || "-"
  }
}

function mapTaskStatusToUi(status: string | null | undefined, language: "el" | "en") {
  const value = (status || "").toLowerCase()
  const t = getTexts(language)

  switch (value) {
    case "pending":
      return t.statusPending
    case "assigned":
      return t.statusAssigned
    case "accepted":
      return t.statusAccepted
    case "in_progress":
      return t.statusInProgress
    case "completed":
      return t.statusCompleted
    case "rejected":
      return t.statusRejected
    case "cancelled":
      return t.statusCancelled
    default:
      return status || "—"
  }
}

function mapPriorityToUi(priority: string | null | undefined, language: "el" | "en") {
  const value = (priority || "").toLowerCase()
  const t = getTexts(language)

  switch (value) {
    case "low":
      return t.priorityLow
    case "normal":
      return t.priorityNormal
    case "medium":
      return t.priorityMedium
    case "high":
      return t.priorityHigh
    case "urgent":
      return t.priorityUrgent
    case "critical":
      return t.priorityCritical
    default:
      return priority || t.priorityNormal
  }
}

function getStatusBadgeClasses(status?: string | null) {
  const value = (status || "").toLowerCase()

  if (value === "completed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }

  if (value === "pending") {
    return "bg-amber-50 text-amber-700 border-amber-200"
  }

  if (value === "assigned") {
    return "bg-orange-50 text-orange-700 border-orange-200"
  }

  if (value === "accepted") {
    return "bg-sky-50 text-sky-700 border-sky-200"
  }

  if (value === "in_progress") {
    return "bg-blue-50 text-blue-700 border-blue-200"
  }

  if (value === "rejected" || value === "cancelled") {
    return "bg-red-50 text-red-700 border-red-200"
  }

  return "bg-slate-50 text-slate-700 border-slate-200"
}

function getPriorityBadgeClasses(priority?: string | null) {
  const value = (priority || "").toLowerCase()

  if (value === "urgent" || value === "critical") {
    return "bg-red-50 text-red-700 border-red-200"
  }

  if (value === "high") {
    return "bg-amber-50 text-amber-700 border-amber-200"
  }

  if (value === "normal" || value === "medium") {
    return "bg-sky-50 text-sky-700 border-sky-200"
  }

  if (value === "low") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }

  return "bg-slate-50 text-slate-700 border-slate-200"
}

function normalizeTaskTitle(title: string | null | undefined, language: "el" | "en") {
  if (!title || !title.trim()) return "—"

  let text = title.trim()

  if (language === "en") {
    text = text
      .replace(/^Καθαρισμός μετά από check-out\s*-\s*/i, "Cleaning after check-out - ")
      .replace(/^Επιθεώρηση μετά από check-out\s*-\s*/i, "Inspection after check-out - ")
      .replace(/^Συντήρηση μετά από check-out\s*-\s*/i, "Maintenance after check-out - ")
      .replace(/^καθαρισμός$/i, "Cleaning")
      .replace(/^Καθαρισμός$/i, "Cleaning")
      .replace(/^επιθεώρηση$/i, "Inspection")
      .replace(/^Επιθεώρηση$/i, "Inspection")
      .replace(/^βλάβη$/i, "Repair")
      .replace(/^Βλάβη$/i, "Repair")
      .replace(/^ζημιά$/i, "Damage")
      .replace(/^Ζημιά$/i, "Damage")
    return text
  }

  text = text
    .replace(/^Cleaning after check-out\s*-\s*/i, "Καθαρισμός μετά από check-out - ")
    .replace(/^Inspection after check-out\s*-\s*/i, "Επιθεώρηση μετά από check-out - ")
    .replace(/^Maintenance after check-out\s*-\s*/i, "Συντήρηση μετά από check-out - ")
    .replace(/^Cleaning$/i, "Καθαρισμός")
    .replace(/^Inspection$/i, "Επιθεώρηση")
    .replace(/^Repair$/i, "Βλάβη")
    .replace(/^Damage$/i, "Ζημιά")

  return text
}

function normalizeChecklistTitle(title: string | null | undefined, language: "el" | "en") {
  if (!title || !title.trim()) {
    return language === "en" ? "Checklist" : "Checklist"
  }

  const t = getTexts(language)
  let text = title.trim()

  if (language === "en") {
    text = text
      .replace(/^Βασική λίστα εργασιών ακινήτου$/i, t.propertyTasksChecklist)
      .replace(/^Κύρια λίστα ακινήτου$/i, t.propertyMainChecklist)
      .replace(/^Βασική λίστα$/i, t.basicChecklist)
    return text
  }

  text = text
    .replace(/^Property tasks checklist$/i, t.propertyTasksChecklist)
    .replace(/^Property main checklist$/i, t.propertyMainChecklist)
    .replace(/^Basic checklist$/i, t.basicChecklist)

  return text
}

function normalizeTaskDescription(
  description: string | null | undefined,
  language: "el" | "en"
) {
  if (!description || !description.trim()) return null

  const t = getTexts(language)
  let text = description.trim()

  if (language === "en") {
    text = text
      .replace(/Εργασία που δημιουργήθηκε χειροκίνητα από κράτηση\./gi, t.taskCreatedFromBooking)
      .replace(/Πηγή:/gi, `${t.source}:`)
      .replace(/Κωδικός κράτησης:/gi, `${t.bookingCode}:`)
      .replace(/Επισκέπτης:/gi, `${t.guest}:`)
      .replace(/Άφιξη:/gi, `${t.checkIn}:`)
      .replace(/Αναχώρηση:/gi, `${t.checkOut}:`)
    return text
  }

  text = text
    .replace(/Task created manually from booking\./gi, t.taskCreatedFromBooking)
    .replace(/\bSource:/gi, `${t.source}:`)
    .replace(/\bBooking code:/gi, `${t.bookingCode}:`)
    .replace(/\bGuest:/gi, `${t.guest}:`)
    .replace(/\bCheck-in:/gi, `${t.checkIn}:`)
    .replace(/\bCheck-out:/gi, `${t.checkOut}:`)

  return text
}

function getMetricTone(filter: MetricFilter) {
  switch (filter) {
    case "pending":
      return "amber"
    case "assigned":
      return "orange"
    case "accepted":
      return "sky"
    case "completed":
      return "emerald"
    case "all":
    default:
      return "slate"
  }
}

function getMetricCardClasses(
  active: boolean,
  tone: "slate" | "amber" | "orange" | "sky" | "emerald"
) {
  if (active) {
    switch (tone) {
      case "amber":
        return "border-amber-300 bg-amber-50 ring-2 ring-amber-200"
      case "orange":
        return "border-orange-300 bg-orange-50 ring-2 ring-orange-200"
      case "sky":
        return "border-sky-300 bg-sky-50 ring-2 ring-sky-200"
      case "emerald":
        return "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200"
      case "slate":
      default:
        return "border-slate-300 bg-slate-50 ring-2 ring-slate-200"
    }
  }

  return "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
}

export default function TasksPage() {
  const { language } = useAppLanguage()
  const texts = getTexts(language)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [partners, setPartners] = useState<Partner[]>([])

  const [propertyId, setPropertyId] = useState("")
  const [partnerId, setPartnerId] = useState("")
  const [taskType, setTaskType] = useState("")
  const [status, setStatus] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("all")

  async function loadFilters() {
    const [propertiesRes, partnersRes] = await Promise.all([
      fetch("/api/properties", { cache: "no-store" }),
      fetch("/api/partners", { cache: "no-store" }),
    ])

    const propertiesData = await propertiesRes.json().catch(() => [])
    const partnersData = await partnersRes.json().catch(() => [])

    setProperties(Array.isArray(propertiesData) ? propertiesData : [])
    setPartners(Array.isArray(partnersData) ? partnersData : [])
  }

  async function loadTasks() {
    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/tasks", { cache: "no-store" })
      const data = await res.json().catch(() => [])

      if (!res.ok) {
        throw new Error(
          data?.error ||
            (language === "en"
              ? "Failed to load tasks."
              : "Αποτυχία φόρτωσης εργασιών.")
        )
      }

      setAllTasks(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Σφάλμα φόρτωσης εργασιών:", err)
      setError(
        err instanceof Error
          ? err.message
          : language === "en"
            ? "An error occurred while loading."
            : "Παρουσιάστηκε σφάλμα κατά τη φόρτωση."
      )
      setAllTasks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function init() {
      await loadFilters()
      await loadTasks()
    }

    void init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const metrics = useMemo(() => {
    return {
      total: allTasks.length,
      pending: allTasks.filter((task) => (task.status || "").toLowerCase() === "pending").length,
      assigned: allTasks.filter((task) => (task.status || "").toLowerCase() === "assigned").length,
      accepted: allTasks.filter((task) => (task.status || "").toLowerCase() === "accepted").length,
      completed: allTasks.filter((task) => (task.status || "").toLowerCase() === "completed").length,
    }
  }, [allTasks])

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const taskStatus = String(task.status || "").toLowerCase()
      const taskTypeValue = String(task.taskType || "").toLowerCase()
      const propertyMatch = !propertyId || task.property?.id === propertyId

      const latestAssignment = getLatestAssignment(task)
      const partnerMatch = !partnerId || latestAssignment?.partner?.id === partnerId

      const categoryMatch = !taskType || taskTypeValue === taskType.toLowerCase()
      const statusMatch = !status || taskStatus === status.toLowerCase()

      const taskDate = normalizeDateOnly(task.scheduledDate)
      const fromDateValue = dateFrom ? normalizeDateOnly(dateFrom) : null
      const toDateValue = dateTo ? normalizeDateOnly(dateTo) : null

      let dateMatch = true

      if (fromDateValue && taskDate && taskDate.getTime() < fromDateValue.getTime()) {
        dateMatch = false
      }

      if (toDateValue && taskDate && taskDate.getTime() > toDateValue.getTime()) {
        dateMatch = false
      }

      if ((fromDateValue || toDateValue) && !taskDate) {
        dateMatch = false
      }

      let metricMatch = true

      switch (metricFilter) {
        case "pending":
          metricMatch = taskStatus === "pending"
          break
        case "assigned":
          metricMatch = taskStatus === "assigned"
          break
        case "accepted":
          metricMatch = taskStatus === "accepted"
          break
        case "completed":
          metricMatch = taskStatus === "completed"
          break
        case "all":
        default:
          metricMatch = true
          break
      }

      return propertyMatch && partnerMatch && categoryMatch && statusMatch && dateMatch && metricMatch
    })
  }, [allTasks, propertyId, partnerId, taskType, status, dateFrom, dateTo, metricFilter])

  const groupedByType = useMemo(() => {
    const map = new Map<string, Task[]>()

    for (const task of filteredTasks) {
      const key = task.taskType || "unknown"
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(task)
    }

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredTasks])

  const categoryOptions = useMemo(() => {
    return [
      { value: "", label: texts.allCategories },
      { value: "cleaning", label: mapTaskTypeToUi("cleaning", language) },
      { value: "inspection", label: mapTaskTypeToUi("inspection", language) },
      { value: "damage", label: mapTaskTypeToUi("damage", language) },
      { value: "repair", label: mapTaskTypeToUi("repair", language) },
      { value: "supplies", label: mapTaskTypeToUi("supplies", language) },
      { value: "photos", label: mapTaskTypeToUi("photos", language) },
    ]
  }, [language, texts.allCategories])

  const statusOptions = useMemo(() => {
    return [
      { value: "", label: texts.allStatuses },
      { value: "pending", label: mapTaskStatusToUi("pending", language) },
      { value: "assigned", label: mapTaskStatusToUi("assigned", language) },
      { value: "accepted", label: mapTaskStatusToUi("accepted", language) },
      { value: "in_progress", label: mapTaskStatusToUi("in_progress", language) },
      { value: "completed", label: mapTaskStatusToUi("completed", language) },
      { value: "rejected", label: mapTaskStatusToUi("rejected", language) },
    ]
  }, [language, texts.allStatuses])

  const filteredCount = filteredTasks.length

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">{texts.pageEyebrow}</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">{texts.pageTitle}</h1>
            <p className="mt-2 text-sm text-slate-500">{texts.pageSubtitle}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/tasks/new"
              className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              {texts.newTask}
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { key: "all" as MetricFilter, label: texts.total, value: metrics.total },
          { key: "pending" as MetricFilter, label: texts.pending, value: metrics.pending },
          { key: "assigned" as MetricFilter, label: texts.assigned, value: metrics.assigned },
          { key: "accepted" as MetricFilter, label: texts.accepted, value: metrics.accepted },
          { key: "completed" as MetricFilter, label: texts.completed, value: metrics.completed },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMetricFilter(item.key)}
            className={cls(
              "rounded-3xl border p-5 text-left shadow-sm transition",
              getMetricCardClasses(metricFilter === item.key, getMetricTone(item.key))
            )}
          >
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <p
              className={cls(
                "mt-3 text-4xl font-bold",
                item.key === "all" && "text-slate-950",
                item.key === "pending" && "text-amber-600",
                item.key === "assigned" && "text-orange-600",
                item.key === "accepted" && "text-sky-600",
                item.key === "completed" && "text-emerald-700"
              )}
            >
              {item.value}
            </p>
          </button>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">{texts.filtersTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">{texts.filtersSubtitle}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.resultsCount}
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-950">{filteredCount}</div>
            <div className="mt-1 text-xs text-slate-500">{texts.groupedResultsCount}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.property}
            </label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            >
              <option value="">{texts.allProperties}</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} • {property.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.partner}
            </label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            >
              <option value="">{texts.allPartners}</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name} • {partner.specialty}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.category}
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            >
              {categoryOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.status}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.dateFrom}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.dateTo}
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
            {texts.loading}
          </div>
        ) : groupedByType.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 shadow-sm">
            {texts.empty}
          </div>
        ) : (
          groupedByType.map(([type, typeTasks]) => (
            <section
              key={type}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">
                    {mapTaskTypeToUi(type, language)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {texts.taskCategoryTotal}: {typeTasks.length}
                  </p>
                </div>
              </div>

              <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        {texts.task}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        {texts.propertyCol}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        {texts.partnerCol}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        {texts.dateCol}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        {texts.statusCol}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        {texts.assignmentCol}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        {texts.checklistCol}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        {texts.durationCol}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        {texts.issuesCol}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        {texts.details}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {typeTasks.map((task) => {
                      const latestAssignment = getLatestAssignment(task)
                      const duration = calculateDuration(
                        latestAssignment?.startedAt || task.checklistRun?.startedAt,
                        latestAssignment?.completedAt || task.checklistRun?.completedAt,
                        language
                      )

                      const normalizedTitle = normalizeTaskTitle(task.title, language)
                      const normalizedDescription = normalizeTaskDescription(task.description, language)
                      const translatedChecklistTitle = normalizeChecklistTitle(
                        task.checklistRun?.template?.title,
                        language
                      )

                      return (
                        <tr key={task.id} className="border-t border-slate-200 align-top">
                          <td className="px-4 py-4">
                            <div>
                              <Link
                                href={`/tasks/${task.id}`}
                                className="text-sm font-semibold text-slate-900 hover:text-blue-600"
                              >
                                {normalizedTitle}
                              </Link>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {task.requiresChecklist ? (
                                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                                    {texts.checklistTag}
                                  </span>
                                ) : null}

                                {task.requiresPhotos ? (
                                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700">
                                    {texts.photosTag}
                                  </span>
                                ) : null}

                                <span
                                  className={cls(
                                    "rounded-full border px-2 py-1 text-[11px] font-semibold",
                                    getPriorityBadgeClasses(task.priority)
                                  )}
                                >
                                  {mapPriorityToUi(task.priority, language)}
                                </span>
                              </div>

                              {normalizedDescription ? (
                                <p className="mt-2 whitespace-pre-line text-xs text-slate-500">
                                  {normalizedDescription}
                                </p>
                              ) : null}

                              {task.resultNotes ? (
                                <p className="mt-2 text-xs text-slate-500">
                                  {texts.resultsNotes}: {task.resultNotes}
                                </p>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            <div>{task.property?.name || texts.noProperty}</div>
                            <div className="text-xs text-slate-500">{task.property?.code || ""}</div>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {latestAssignment?.partner?.name || texts.noAssignment}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            <div>{formatDate(task.scheduledDate, texts.locale)}</div>
                            <div className="text-xs text-slate-500">
                              {task.scheduledStartTime || "—"}
                              {task.scheduledEndTime ? ` - ${task.scheduledEndTime}` : ""}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm">
                            <span
                              className={cls(
                                "rounded-full border px-3 py-1 text-xs font-semibold",
                                getStatusBadgeClasses(task.status)
                              )}
                            >
                              {mapTaskStatusToUi(task.status, language)}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-sm">
                            {latestAssignment ? (
                              <div className="space-y-2">
                                <span
                                  className={cls(
                                    "rounded-full border px-3 py-1 text-xs font-semibold",
                                    getStatusBadgeClasses(latestAssignment.status)
                                  )}
                                >
                                  {mapTaskStatusToUi(latestAssignment.status, language)}
                                </span>

                                <div className="text-xs text-slate-500">
                                  {texts.assignmentAt}: {formatDateTime(latestAssignment.assignedAt, texts.locale)}
                                </div>

                                {latestAssignment.acceptedAt ? (
                                  <div className="text-xs text-slate-500">
                                    {texts.acceptanceAt}: {formatDateTime(latestAssignment.acceptedAt, texts.locale)}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {task.checklistRun ? (
                              <div className="space-y-2">
                                <div className="font-medium">{translatedChecklistTitle}</div>
                                <div className="text-xs text-slate-500">
                                  {texts.statusCol}: {mapTaskStatusToUi(task.checklistRun.status, language)}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {texts.answers}: {task.checklistRun.answers?.length || 0}
                                </div>
                              </div>
                            ) : (
                              texts.noChecklist
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">{duration}</td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {task.issues?.length || 0}
                          </td>

                          <td className="px-4 py-4 text-sm">
                            <div className="flex flex-col gap-2">
                              <Link
                                href={`/tasks/${task.id}`}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                {texts.viewTask}
                              </Link>

                              {task.property?.id ? (
                                <Link
                                  href={`/properties/${task.property.id}`}
                                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                  {texts.viewProperty}
                                </Link>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 xl:hidden">
                {typeTasks.map((task) => {
                  const latestAssignment = getLatestAssignment(task)
                  const duration = calculateDuration(
                    latestAssignment?.startedAt || task.checklistRun?.startedAt,
                    latestAssignment?.completedAt || task.checklistRun?.completedAt,
                    language
                  )

                  const normalizedTitle = normalizeTaskTitle(task.title, language)
                  const normalizedDescription = normalizeTaskDescription(task.description, language)
                  const translatedChecklistTitle = normalizeChecklistTitle(
                    task.checklistRun?.template?.title,
                    language
                  )

                  return (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="text-base font-semibold text-slate-900 hover:text-blue-600"
                          >
                            {normalizedTitle}
                          </Link>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span
                              className={cls(
                                "rounded-full border px-3 py-1 text-xs font-semibold",
                                getStatusBadgeClasses(task.status)
                              )}
                            >
                              {mapTaskStatusToUi(task.status, language)}
                            </span>

                            <span
                              className={cls(
                                "rounded-full border px-3 py-1 text-xs font-semibold",
                                getPriorityBadgeClasses(task.priority)
                              )}
                            >
                              {mapPriorityToUi(task.priority, language)}
                            </span>

                            {task.requiresChecklist ? (
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                {texts.checklistTag}
                              </span>
                            ) : null}

                            {task.requiresPhotos ? (
                              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                                {texts.photosTag}
                              </span>
                            ) : null}
                          </div>

                          {normalizedDescription ? (
                            <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
                              {normalizedDescription}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {texts.viewTask}
                          </Link>

                          {task.property?.id ? (
                            <Link
                              href={`/properties/${task.property.id}`}
                              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                              {texts.viewProperty}
                            </Link>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {texts.propertyCol}
                          </div>
                          <div className="mt-1 text-sm text-slate-900">
                            {task.property?.name || texts.noProperty}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {task.property?.code || ""}
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {texts.partnerCol}
                          </div>
                          <div className="mt-1 text-sm text-slate-900">
                            {latestAssignment?.partner?.name || texts.noAssignment}
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {texts.dateCol}
                          </div>
                          <div className="mt-1 text-sm text-slate-900">
                            {formatDate(task.scheduledDate, texts.locale)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {task.scheduledStartTime || "—"}
                            {task.scheduledEndTime ? ` - ${task.scheduledEndTime}` : ""}
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {texts.assignmentCol}
                          </div>
                          {latestAssignment ? (
                            <>
                              <div className="mt-1 text-sm text-slate-900">
                                {mapTaskStatusToUi(latestAssignment.status, language)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {texts.assignmentAt}: {formatDateTime(latestAssignment.assignedAt, texts.locale)}
                              </div>
                              {latestAssignment.acceptedAt ? (
                                <div className="mt-1 text-xs text-slate-500">
                                  {texts.acceptanceAt}: {formatDateTime(latestAssignment.acceptedAt, texts.locale)}
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <div className="mt-1 text-sm text-slate-900">—</div>
                          )}
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {texts.checklistCol}
                          </div>
                          {task.checklistRun ? (
                            <>
                              <div className="mt-1 text-sm text-slate-900">
                                {translatedChecklistTitle}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {texts.statusCol}: {mapTaskStatusToUi(task.checklistRun.status, language)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {texts.answers}: {task.checklistRun.answers?.length || 0}
                              </div>
                            </>
                          ) : (
                            <div className="mt-1 text-sm text-slate-900">{texts.noChecklist}</div>
                          )}
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {texts.details}
                          </div>
                          <div className="mt-1 text-sm text-slate-900">
                            {texts.durationCol}: {duration}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {texts.issuesCol}: {task.issues?.length || 0}
                          </div>
                        </div>
                      </div>

                      {task.resultNotes ? (
                        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                          <span className="font-medium">{texts.resultsNotes}: </span>
                          {task.resultNotes}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </section>
    </div>
  )
}