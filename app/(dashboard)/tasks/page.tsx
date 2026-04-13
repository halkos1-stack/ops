"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { TaskCard } from "@/components/tasks/TaskCard"
import {
  buildCanonicalTaskInfoItems,
  getAssignmentStatusBadgeClasses,
  getTaskStatusBadgeClasses,
  getTaskSurfaceTone,
  isTaskAlertActive,
} from "@/components/tasks/task-ui"
import {
  getAssignmentStatusLabel,
  getChecklistStatusLabel,
  getTaskStatusLabel,
} from "@/lib/i18n/labels"
import {
  normalizeChecklistStatus,
  normalizeTaskStatus,
  normalizeTaskTitleText,
} from "@/lib/i18n/normalizers"

type ScopeFilter = "all" | "open"

type CounterFilter =
  | "all"
  | "open"
  | "completed"
  | "cancelled"
  | "without_partner"
  | "attention"

type PropertyOption = {
  id: string
  code: string
  name: string
}

type PartnerOption = {
  id: string
  code: string
  name: string
}

type TaskRow = {
  id: string
  title: string
  description?: string | null
  taskType: string
  priority: string
  status: string
  scheduledDate?: string | null
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  alertEnabled?: boolean | null
  alertAt?: string | null
  property?: {
    id: string
    code: string
    name: string
    nextCheckInAt?: string | null
  } | null
  booking?: {
    id: string
    checkOutDate?: string | null
    checkInDate?: string | null
  } | null
  assignments?: Array<{
    id: string
    status: string
    assignedAt?: string | null
    acceptedAt?: string | null
    partner?: {
      id: string
      code: string
      name: string
    } | null
  }>
  cleaningChecklistRun?: {
    id: string
    status: string
    completedAt?: string | null
    template?: {
      id: string
      title?: string | null
    } | null
  } | null
  suppliesChecklistRun?: {
    id: string
    status: string
    completedAt?: string | null
  } | null
  checklistRun?: {
    id: string
    status: string
    completedAt?: string | null
    template?: {
      id: string
      title?: string | null
    } | null
  } | null
  sendCleaningChecklist?: boolean
  sendSuppliesChecklist?: boolean
  propertyReadiness?: {
    status: string | null
    nextCheckInAt?: string | null
  } | null
}

type TaskStateTone = "neutral" | "success" | "warning" | "danger"

type TaskStateBlock = {
  tone: TaskStateTone
  title: string
  description: string
  helper?: string
  nextStep?: string
}

function getTasksPageTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      title: "Tasks",
      subtitle:
        "Use the filters below to narrow the results and monitor task volume.",
      filtersTitle: "Filters",
      filteredResults: "Filtered results",
      returnedByFilters: "Tasks returned by current filters",
      property: "Property",
      partner: "Partner",
      status: "Status",
      category: "Category",
      viewScope: "View scope",
      fromDate: "From date",
      toDate: "To date",
      allProperties: "All properties",
      allPartners: "All partners",
      allStatuses: "All statuses",
      allCategories: "All categories",
      allTasks: "All tasks",
      openTasksOnly: "Open tasks only",
      clearFilters: "Clear filters",
      activePropertyFilter: "Active property filter",
      noTasks: "No tasks found",
      noTasksSubtitle: "Try changing the filters.",
      viewTask: "View task",
      viewProperty: "View property",
      none: "—",
      openScopeChip: "Open tasks",
      allScopeChip: "All tasks",
      stateAllTitle: "All tasks view",
      stateAllDescription:
        "This view includes the full task history across all statuses.",
      stateAllNext: "Use filters",
      stateOpenTitle: "Open tasks view",
      stateOpenDescription:
        "This view focuses only on tasks that still need operational follow-up.",
      stateOpenNext: "Monitor active work",
      statePropertyTitle: "Property filter is active",
      statePropertyDescription:
        "The list has been narrowed to tasks of the selected property.",
      statePropertyNext: "Review property workload",
      tableTitle: "Task list",
      tableSubtitle:
        "Unified task display across operational list and dashboard views.",
      nextStepLabel: "Next step:",
      countsTitle: "Operational volume",
      totalTasks: "Total tasks",
      openTasks: "Open tasks",
      completedTasks: "Completed tasks",
      cancelledTasks: "Cancelled tasks",
      tasksWithoutPartner: "Without partner",
      tasksWithAlerts: "Need attention",
      filtersSummaryText:
        "Use property, scope, partner, category, status and date filters together.",
      taskNeedsAssignment: "Needs assignment",
      taskWaitingAcceptance: "Waiting acceptance",
      taskAccepted: "Accepted",
      taskInProgress: "In progress",
      taskCompleted: "Completed",
      taskCancelled: "Cancelled",
      taskUnknown: "Unknown",
      checklistNotSent: "Not sent",
      checklistPending: "Pending",
      checklistSubmitted: "Submitted",
      checklistCompleted: "Completed",
      checklistCleaning: "Cleaning",
      checklistSupplies: "Supplies",
      statusTooltip:
        "The current status of the task in the OPS lifecycle.",
      assignmentTooltip:
        "The current assignment status of the latest partner assignment.",
      alertTooltip:
        "An active alert means this task needs immediate operational attention.",
      stateTooltip:
        "This panel explains the current state and the next operational step.",
    }
  }

  return {
    title: "Εργασίες",
    subtitle:
      "Χρησιμοποίησε τα φίλτρα για να περιορίσεις τα αποτελέσματα και να παρακολουθείς τον όγκο εργασιών.",
    filtersTitle: "Φίλτρα",
    filteredResults: "Φιλτραρισμένα αποτελέσματα",
    returnedByFilters: "Εργασίες που επέστρεψαν με τα τρέχοντα φίλτρα",
    property: "Ακίνητο",
    partner: "Συνεργάτης",
    status: "Κατάσταση",
    category: "Κατηγορία",
    viewScope: "Εύρος προβολής",
    fromDate: "Από ημερομηνία",
    toDate: "Έως ημερομηνία",
    allProperties: "Όλα τα ακίνητα",
    allPartners: "Όλοι οι συνεργάτες",
    allStatuses: "Όλες οι καταστάσεις",
    allCategories: "Όλες οι κατηγορίες",
    allTasks: "Όλες οι εργασίες",
    openTasksOnly: "Μόνο ανοικτές εργασίες",
    clearFilters: "Καθαρισμός φίλτρων",
    activePropertyFilter: "Ενεργό φίλτρο ακινήτου",
    noTasks: "Δεν βρέθηκαν εργασίες",
    noTasksSubtitle: "Δοκίμασε να αλλάξεις τα φίλτρα.",
    viewTask: "Προβολή εργασίας",
    viewProperty: "Προβολή ακινήτου",
    none: "—",
    openScopeChip: "Ανοικτές εργασίες",
    allScopeChip: "Όλες οι εργασίες",
    stateAllTitle: "Προβολή όλων των εργασιών",
    stateAllDescription:
      "Η προβολή περιλαμβάνει όλο το ιστορικό εργασιών, ανεξάρτητα από κατάσταση.",
    stateAllNext: "Χρήση φίλτρων",
    stateOpenTitle: "Προβολή ανοικτών εργασιών",
    stateOpenDescription:
      "Η προβολή εστιάζει μόνο σε εργασίες που χρειάζονται ακόμη λειτουργική παρακολούθηση.",
    stateOpenNext: "Παρακολούθηση ενεργών εργασιών",
    statePropertyTitle: "Υπάρχει ενεργό φίλτρο ακινήτου",
    statePropertyDescription:
      "Η λίστα έχει περιοριστεί μόνο στις εργασίες του επιλεγμένου ακινήτου.",
    statePropertyNext: "Έλεγχος φόρτου ακινήτου",
    tableTitle: "Λίστα εργασιών",
    tableSubtitle:
      "Ενιαία προβολή εργασιών σε λειτουργική λίστα και πίνακα ελέγχου.",
    nextStepLabel: "Επόμενο βήμα:",
    countsTitle: "Λειτουργικός όγκος",
    totalTasks: "Σύνολο εργασιών",
    openTasks: "Ανοικτές εργασίες",
    completedTasks: "Ολοκληρωμένες",
    cancelledTasks: "Ακυρωμένες",
    tasksWithoutPartner: "Χωρίς συνεργάτη",
    tasksWithAlerts: "Θέλουν έλεγχο",
    filtersSummaryText:
      "Χρησιμοποίησε μαζί φίλτρα ακινήτου, εύρους, συνεργάτη, κατηγορίας, κατάστασης και ημερομηνιών.",
    taskNeedsAssignment: "Χρειάζεται ανάθεση",
    taskWaitingAcceptance: "Αναμονή αποδοχής",
    taskAccepted: "Αποδεκτή",
    taskInProgress: "Σε εξέλιξη",
    taskCompleted: "Ολοκληρώθηκε",
    taskCancelled: "Ακυρώθηκε",
    taskUnknown: "Άγνωστη",
    checklistNotSent: "Δεν στάλθηκε",
    checklistPending: "Εκκρεμεί",
    checklistSubmitted: "Υποβλήθηκε",
    checklistCompleted: "Ολοκληρώθηκε",
    checklistCleaning: "Καθαριότητα",
    checklistSupplies: "Αναλώσιμα",
    statusTooltip:
      "Η τρέχουσα κατάσταση της εργασίας στον κύκλο ζωής του OPS.",
    assignmentTooltip:
      "Η κατάσταση της τελευταίας ανάθεσης προς συνεργάτη.",
    alertTooltip:
      "Το ενεργό alert δείχνει ότι η εργασία χρειάζεται άμεση λειτουργική προσοχή.",
    stateTooltip:
      "Αυτό το πλαίσιο εξηγεί την τρέχουσα κατάσταση και το επόμενο βήμα.",
  }
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
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

function isOpenTaskStatus(status: string | null | undefined) {
  const normalized = normalizeTaskStatus(status)
  return [
    "PENDING",
    "NEW",
    "ASSIGNED",
    "WAITING_ACCEPTANCE",
    "ACCEPTED",
    "IN_PROGRESS",
  ].includes(normalized)
}

function getLatestAssignment(task: TaskRow) {
  return safeArray(task.assignments)[0] || null
}

function getChecklistShortState(
  language: "el" | "en",
  status?: string | null,
  completedAt?: string | null
) {
  const normalized = normalizeChecklistStatus(status, {
    enabled: true,
    submitted: Boolean(completedAt),
    completed: Boolean(completedAt),
  })

  return getChecklistStatusLabel(language, normalized, {
    enabled: true,
    submitted: normalized === "SUBMITTED" || normalized === "COMPLETED",
    completed: normalized === "COMPLETED",
  })
}

function getChecklistBadgeClass(status?: string | null, completedAt?: string | null) {
  const normalized = normalizeChecklistStatus(status, {
    enabled: true,
    submitted: Boolean(completedAt),
    completed: Boolean(completedAt),
  })

  if (normalized === "SUBMITTED" || normalized === "COMPLETED") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (normalized === "PENDING") {
    return "border border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border border-slate-200 bg-slate-100 text-slate-700"
}

function getStatePanelClassName(tone: TaskStateTone) {
  if (tone === "success") {
    return "rounded-3xl border border-emerald-200 bg-emerald-50 p-4"
  }

  if (tone === "warning") {
    return "rounded-3xl border border-amber-200 bg-amber-50 p-4"
  }

  if (tone === "danger") {
    return "rounded-3xl border border-red-200 bg-red-50 p-4"
  }

  return "rounded-3xl border border-slate-200 bg-slate-50 p-4"
}

function getStateTitleClassName(tone: TaskStateTone) {
  if (tone === "success") return "text-sm font-semibold text-emerald-900"
  if (tone === "warning") return "text-sm font-semibold text-amber-900"
  if (tone === "danger") return "text-sm font-semibold text-red-900"
  return "text-sm font-semibold text-slate-900"
}

function getStateTextClassName(tone: TaskStateTone) {
  if (tone === "success") return "mt-1 text-sm text-emerald-800"
  if (tone === "warning") return "mt-1 text-sm text-amber-800"
  if (tone === "danger") return "mt-1 text-sm text-red-800"
  return "mt-1 text-sm text-slate-700"
}

function getTaskRowStateBlock(
  task: TaskRow,
  language: "el" | "en"
): TaskStateBlock {
  const texts = getTasksPageTexts(language)
  const normalized = normalizeTaskStatus(task.status)
  const latestAssignment = getLatestAssignment(task)

  if (normalized === "CANCELLED") {
    return {
      tone: "danger",
      title: texts.taskCancelled,
      description:
        language === "en"
          ? "This task is cancelled and remains visible only for history and review."
          : "Η εργασία έχει ακυρωθεί και παραμένει ορατή μόνο για ιστορικό και έλεγχο.",
      nextStep: language === "en" ? "Open task" : "Άνοιγμα εργασίας",
    }
  }

  if (normalized === "COMPLETED") {
    return {
      tone: "success",
      title: texts.taskCompleted,
      description:
        language === "en"
          ? "The task has been completed and its operational result is already recorded."
          : "Η εργασία έχει ολοκληρωθεί και το λειτουργικό της αποτέλεσμα έχει ήδη καταγραφεί.",
      nextStep:
        language === "en" ? "Review result" : "Έλεγχος αποτελέσματος",
    }
  }

  if (!latestAssignment) {
    return {
      tone: "warning",
      title: texts.taskNeedsAssignment,
      description:
        language === "en"
          ? "The task exists but no current partner assignment has been defined yet."
          : "Η εργασία υπάρχει αλλά δεν έχει οριστεί ακόμη τρέχουσα ανάθεση σε συνεργάτη.",
      nextStep: language === "en" ? "Assign partner" : "Ανάθεση συνεργάτη",
    }
  }

  if (normalized === "ASSIGNED" || normalized === "WAITING_ACCEPTANCE") {
    return {
      tone: "warning",
      title: texts.taskWaitingAcceptance,
      description:
        language === "en"
          ? "The task is assigned and currently waiting for partner response."
          : "Η εργασία είναι ανατεθειμένη και αυτή τη στιγμή περιμένει απάντηση από τον συνεργάτη.",
      helper: latestAssignment.partner?.name || undefined,
      nextStep:
        language === "en" ? "Monitor acceptance" : "Παρακολούθηση αποδοχής",
    }
  }

  if (normalized === "ACCEPTED") {
    return {
      tone: "success",
      title: texts.taskAccepted,
      description:
        language === "en"
          ? "The task has been accepted and is ready for execution."
          : "Η εργασία έχει αποδεχτεί και είναι έτοιμη για εκτέλεση.",
      helper: latestAssignment.partner?.name || undefined,
      nextStep:
        language === "en" ? "Track execution" : "Παρακολούθηση εκτέλεσης",
    }
  }

  if (normalized === "IN_PROGRESS") {
    return {
      tone: "success",
      title: texts.taskInProgress,
      description:
        language === "en"
          ? "The task is currently in progress and needs operational follow-up."
          : "Η εργασία βρίσκεται σε εξέλιξη και χρειάζεται λειτουργική παρακολούθηση.",
      helper: latestAssignment.partner?.name || undefined,
      nextStep:
        language === "en" ? "Review execution" : "Έλεγχος εκτέλεσης",
    }
  }

  return {
    tone: "neutral",
    title: texts.taskUnknown,
    description:
      language === "en"
        ? "Review the task details for the latest operational state."
        : "Έλεγξε τις λεπτομέρειες της εργασίας για την πιο πρόσφατη λειτουργική κατάσταση.",
    nextStep: language === "en" ? "Open task" : "Άνοιγμα εργασίας",
  }
}

function CounterButton({
  label,
  value,
  active,
  onClick,
  tone = "slate",
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
  tone?: "slate" | "amber" | "emerald" | "red" | "blue"
}) {
  const tones = {
    slate: active
      ? "border-slate-900 bg-slate-900 text-white"
      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
    amber: active
      ? "border-amber-500 bg-amber-500 text-white"
      : "border-amber-200 bg-white text-amber-800 hover:bg-amber-50",
    emerald: active
      ? "border-emerald-600 bg-emerald-600 text-white"
      : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
    red: active
      ? "border-red-600 bg-red-600 text-white"
      : "border-red-200 bg-white text-red-800 hover:bg-red-50",
    blue: active
      ? "border-sky-600 bg-sky-600 text-white"
      : "border-sky-200 bg-white text-sky-800 hover:bg-sky-50",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left shadow-sm transition ${tones[tone]}`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
    </button>
  )
}

export default function TasksPage() {
  const { language } = useAppLanguage()
  const texts = getTasksPageTexts(language)
  const locale = language === "en" ? "en-GB" : "el-GR"

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlPropertyId = searchParams.get("propertyId") || ""
  const urlScope = searchParams.get("scope") === "open" ? "open" : "all"

  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [propertyFilter, setPropertyFilter] = useState(urlPropertyId)
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>(urlScope)
  const [counterFilter, setCounterFilter] = useState<CounterFilter>("all")
  const [partnerFilter, setPartnerFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [taskTypeFilter, setTaskTypeFilter] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  useEffect(() => {
    setPropertyFilter(urlPropertyId)
  }, [urlPropertyId])

  useEffect(() => {
    setScopeFilter(urlScope)
  }, [urlScope])

  function updateUrl(next: { propertyId?: string; scope?: ScopeFilter }) {
    const params = new URLSearchParams(searchParams.toString())
    const nextPropertyId =
      next.propertyId !== undefined ? next.propertyId : propertyFilter
    const nextScope = next.scope !== undefined ? next.scope : scopeFilter

    if (nextPropertyId) {
      params.set("propertyId", nextPropertyId)
    } else {
      params.delete("propertyId")
    }

    if (nextScope === "open") {
      params.set("scope", "open")
    } else {
      params.delete("scope")
    }

    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const [tasksRes, propertiesRes, partnersRes] = await Promise.all([
          fetch("/api/tasks", { cache: "no-store" }),
          fetch("/api/properties", { cache: "no-store" }),
          fetch("/api/partners", { cache: "no-store" }),
        ])

        const tasksJson = await tasksRes.json().catch(() => null)
        const propertiesJson = await propertiesRes.json().catch(() => null)
        const partnersJson = await partnersRes.json().catch(() => null)

        if (!tasksRes.ok) {
          throw new Error(tasksJson?.error || "Failed to load tasks")
        }

        const normalizedTasks = Array.isArray(tasksJson)
          ? tasksJson
          : Array.isArray(tasksJson?.tasks)
            ? tasksJson.tasks
            : Array.isArray(tasksJson?.data)
              ? tasksJson.data
              : []

        const normalizedProperties = Array.isArray(propertiesJson)
          ? propertiesJson
          : Array.isArray(propertiesJson?.properties)
            ? propertiesJson.properties
            : Array.isArray(propertiesJson?.data)
              ? propertiesJson.data
              : []

        const normalizedPartners = Array.isArray(partnersJson)
          ? partnersJson
          : Array.isArray(partnersJson?.partners)
            ? partnersJson.partners
            : Array.isArray(partnersJson?.data)
              ? partnersJson.data
              : []

        if (cancelled) return

        setTasks(normalizedTasks as TaskRow[])
        setProperties(normalizedProperties as PropertyOption[])
        setPartners(normalizedPartners as PartnerOption[])
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Load error")
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const counters = useMemo(() => {
    const openRows = tasks.filter((task) => isOpenTaskStatus(task.status))
    const completedRows = tasks.filter(
      (task) => normalizeTaskStatus(task.status) === "COMPLETED"
    )
    const cancelledRows = tasks.filter(
      (task) => normalizeTaskStatus(task.status) === "CANCELLED"
    )
    const withoutPartnerRows = tasks.filter((task) => !getLatestAssignment(task))
    const attentionRows = tasks.filter((task) => isTaskAlertActive(task))

    return {
      all: tasks.length,
      open: openRows.length,
      completed: completedRows.length,
      cancelled: cancelledRows.length,
      without_partner: withoutPartnerRows.length,
      attention: attentionRows.length,
    }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    let rows = [...tasks]

    if (propertyFilter) {
      rows = rows.filter((task) => task.property?.id === propertyFilter)
    }

    if (scopeFilter === "open") {
      rows = rows.filter((task) => isOpenTaskStatus(task.status))
    }

    if (counterFilter === "open") {
      rows = rows.filter((task) => isOpenTaskStatus(task.status))
    }

    if (counterFilter === "completed") {
      rows = rows.filter(
        (task) => normalizeTaskStatus(task.status) === "COMPLETED"
      )
    }

    if (counterFilter === "cancelled") {
      rows = rows.filter(
        (task) => normalizeTaskStatus(task.status) === "CANCELLED"
      )
    }

    if (counterFilter === "without_partner") {
      rows = rows.filter((task) => !getLatestAssignment(task))
    }

    if (counterFilter === "attention") {
      rows = rows.filter((task) => isTaskAlertActive(task))
    }

    if (partnerFilter) {
      rows = rows.filter((task) => getLatestAssignment(task)?.partner?.id === partnerFilter)
    }

    if (statusFilter) {
      rows = rows.filter(
        (task) => normalizeTaskStatus(task.status) === normalizeTaskStatus(statusFilter)
      )
    }

    if (taskTypeFilter) {
      rows = rows.filter((task) => task.taskType === taskTypeFilter)
    }

    if (fromDate) {
      rows = rows.filter((task) => {
        if (!task.scheduledDate) return false
        return String(task.scheduledDate).slice(0, 10) >= fromDate
      })
    }

    if (toDate) {
      rows = rows.filter((task) => {
        if (!task.scheduledDate) return false
        return String(task.scheduledDate).slice(0, 10) <= toDate
      })
    }

    rows.sort((a, b) => {
      const aAlert = isTaskAlertActive(a) ? 1 : 0
      const bAlert = isTaskAlertActive(b) ? 1 : 0
      if (aAlert !== bAlert) return bAlert - aAlert

      const aDate = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0
      const bDate = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0
      return bDate - aDate
    })

    return rows
  }, [
    tasks,
    propertyFilter,
    scopeFilter,
    counterFilter,
    partnerFilter,
    statusFilter,
    taskTypeFilter,
    fromDate,
    toDate,
  ])

  const taskTypeOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        tasks
          .map((task) => String(task.taskType || "").trim())
          .filter(Boolean)
      )
    )

    return values.sort((a, b) => a.localeCompare(b))
  }, [tasks])

  const propertyNameByFilter = useMemo(() => {
    return properties.find((row) => row.id === propertyFilter) || null
  }, [properties, propertyFilter])

  const pageStateBlock = useMemo(() => {
    if (propertyFilter && propertyNameByFilter) {
      return {
        tone: "warning" as TaskStateTone,
        title: texts.statePropertyTitle,
        description: texts.statePropertyDescription,
        helper: `${propertyNameByFilter.name} · ${propertyNameByFilter.code}`,
        nextStep: texts.statePropertyNext,
      }
    }

    if (scopeFilter === "open" || counterFilter === "open") {
      return {
        tone: "success" as TaskStateTone,
        title: texts.stateOpenTitle,
        description: texts.stateOpenDescription,
        nextStep: texts.stateOpenNext,
      }
    }

    return {
      tone: "neutral" as TaskStateTone,
      title: texts.stateAllTitle,
      description: texts.stateAllDescription,
      nextStep: texts.stateAllNext,
    }
  }, [propertyFilter, propertyNameByFilter, scopeFilter, counterFilter, texts])

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">
          {language === "en" ? "Loading..." : "Φόρτωση..."}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-red-700">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {texts.title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">{texts.subtitle}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {scopeFilter === "open" ? texts.openScopeChip : texts.allScopeChip}
              </span>

              {propertyNameByFilter ? (
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                  {texts.activePropertyFilter}: {propertyNameByFilter.name} · {propertyNameByFilter.code}
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.filteredResults}
            </div>
            <div className="mt-1 text-3xl font-bold text-slate-950">{filteredTasks.length}</div>
            <div className="text-xs text-slate-500">{texts.returnedByFilters}</div>
          </div>
        </div>
      </section>

      <section className={getStatePanelClassName(pageStateBlock.tone)} title={texts.stateTooltip}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className={getStateTitleClassName(pageStateBlock.tone)}>{pageStateBlock.title}</div>
            <div className={getStateTextClassName(pageStateBlock.tone)}>{pageStateBlock.description}</div>
            {pageStateBlock.helper ? (
              <div className={getStateTextClassName(pageStateBlock.tone)}>{pageStateBlock.helper}</div>
            ) : null}
          </div>

          {pageStateBlock.nextStep ? (
            <div className="shrink-0 rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm font-medium text-slate-900">
              {texts.nextStepLabel} <span className="font-semibold">{pageStateBlock.nextStep}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">{texts.countsTitle}</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <CounterButton label={texts.totalTasks} value={counters.all} active={counterFilter === "all"} onClick={() => setCounterFilter("all")} tone="slate" />
          <CounterButton label={texts.openTasks} value={counters.open} active={counterFilter === "open"} onClick={() => setCounterFilter("open")} tone="blue" />
          <CounterButton label={texts.completedTasks} value={counters.completed} active={counterFilter === "completed"} onClick={() => setCounterFilter("completed")} tone="emerald" />
          <CounterButton label={texts.cancelledTasks} value={counters.cancelled} active={counterFilter === "cancelled"} onClick={() => setCounterFilter("cancelled")} tone="red" />
          <CounterButton label={texts.tasksWithoutPartner} value={counters.without_partner} active={counterFilter === "without_partner"} onClick={() => setCounterFilter("without_partner")} tone="amber" />
          <CounterButton label={texts.tasksWithAlerts} value={counters.attention} active={counterFilter === "attention"} onClick={() => setCounterFilter("attention")} tone="amber" />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">{texts.filtersTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">{texts.filtersSummaryText}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{texts.property}</label>
            <select value={propertyFilter} onChange={(e) => { const nextValue = e.target.value; setPropertyFilter(nextValue); updateUrl({ propertyId: nextValue }) }} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900">
              <option value="">{texts.allProperties}</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>{property.name} · {property.code}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{texts.viewScope}</label>
            <select value={scopeFilter} onChange={(e) => { const nextValue = e.target.value === "open" ? "open" : "all"; setScopeFilter(nextValue); updateUrl({ scope: nextValue }) }} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900">
              <option value="all">{texts.allTasks}</option>
              <option value="open">{texts.openTasksOnly}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{texts.partner}</label>
            <select value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900">
              <option value="">{texts.allPartners}</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>{partner.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{texts.category}</label>
            <select value={taskTypeFilter} onChange={(e) => setTaskTypeFilter(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900">
              <option value="">{texts.allCategories}</option>
              {taskTypeOptions.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{texts.status}</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900">
              <option value="">{texts.allStatuses}</option>
              {[
                "PENDING",
                "ASSIGNED",
                "WAITING_ACCEPTANCE",
                "ACCEPTED",
                "IN_PROGRESS",
                "COMPLETED",
                "CANCELLED",
              ].map((status) => (
                <option key={status} value={status}>{getTaskStatusLabel(language, status)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{texts.fromDate}</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{texts.toDate}</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900" />
          </div>

          <div className="flex items-end">
            <button type="button" onClick={() => { setPropertyFilter(""); setScopeFilter("all"); setCounterFilter("all"); setPartnerFilter(""); setStatusFilter(""); setTaskTypeFilter(""); setFromDate(""); setToDate(""); updateUrl({ propertyId: "", scope: "all" }) }} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {texts.clearFilters}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{texts.tableTitle}</h2>
            <p className="text-sm text-slate-500">{texts.tableSubtitle}</p>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="text-base font-semibold text-slate-900">{texts.noTasks}</div>
            <div className="mt-1 text-sm text-slate-500">{texts.noTasksSubtitle}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((task) => {
              const latestAssignment = getLatestAssignment(task)
              const taskTitle = normalizeTaskTitleText(task.title, language)
              const taskStatusLabel = getTaskStatusLabel(language, task.status)
              const taskState = getTaskRowStateBlock(task, language)
              const alertActive = isTaskAlertActive(task)
              const tone = getTaskSurfaceTone(task)

              const cleaningRun = task.cleaningChecklistRun || (task.sendCleaningChecklist ? task.checklistRun : null)
              const suppliesRun = task.suppliesChecklistRun

              const checklistItems = [
                {
                  id: `cleaning-${task.id}`,
                  label: `${texts.checklistCleaning} ${task.sendCleaningChecklist || cleaningRun ? getChecklistShortState(language, cleaningRun?.status || "pending", cleaningRun?.completedAt || null) : texts.checklistNotSent}`,
                  className: getChecklistBadgeClass(cleaningRun?.status || null, cleaningRun?.completedAt || null),
                  tooltip: language === "en" ? "Cleaning checklist state for this task." : "Κατάσταση λίστας καθαριότητας για αυτή την εργασία.",
                },
                {
                  id: `supplies-${task.id}`,
                  label: `${texts.checklistSupplies} ${task.sendSuppliesChecklist || suppliesRun ? getChecklistShortState(language, suppliesRun?.status || "pending", suppliesRun?.completedAt || null) : texts.checklistNotSent}`,
                  className: getChecklistBadgeClass(suppliesRun?.status || null, suppliesRun?.completedAt || null),
                  tooltip: language === "en" ? "Supplies checklist state for this task." : "Κατάσταση λίστας αναλωσίμων για αυτή την εργασία.",
                },
              ]

              const badges = [
                {
                  id: `task-status-${task.id}`,
                  label: taskStatusLabel,
                  className: getTaskStatusBadgeClasses(task.status),
                  tooltip: texts.statusTooltip,
                },
              ] as Array<{ id: string; label: string; className: string; tooltip?: string }>

              const assignmentStatus = latestAssignment?.status || null
              if (
                assignmentStatus &&
                normalizeTaskStatus(assignmentStatus) !== normalizeTaskStatus(task.status)
              ) {
                badges.push({
                  id: `assignment-status-${task.id}`,
                  label: getAssignmentStatusLabel(language, assignmentStatus),
                  className: getAssignmentStatusBadgeClasses(assignmentStatus),
                  tooltip: texts.assignmentTooltip,
                })
              }

              if (alertActive) {
                badges.push({
                  id: `alert-${task.id}`,
                  label: texts.tasksWithAlerts,
                  className: tone.alertBadge,
                  tooltip: texts.alertTooltip,
                })
              }

              const subtitle = task.property?.name
                ? task.property.code
                  ? `${task.property.name} · ${task.property.code}`
                  : task.property.name
                : undefined

              const infoItems = buildCanonicalTaskInfoItems({
                language,
                locale,
                scheduledDate: task.scheduledDate || null,
                scheduledStartTime: task.scheduledStartTime || null,
                scheduledEndTime: task.scheduledEndTime || null,
                checkOutDate: task.booking?.checkOutDate || null,
                nextCheckInAt:
                  task.propertyReadiness?.nextCheckInAt || task.property?.nextCheckInAt || null,
                partnerName: latestAssignment?.partner?.name || null,
              })

              return (
                <TaskCard
                  key={task.id}
                  className={tone.card}
                  title={taskTitle}
                  titleHref={`/tasks/${task.id}`}
                  subtitle={subtitle}
                  badges={badges}
                  infoItems={infoItems}
                  checklistItems={checklistItems}
                  statePanel={{
                    className: getStatePanelClassName(taskState.tone),
                    titleClassName: getStateTitleClassName(taskState.tone),
                    textClassName: getStateTextClassName(taskState.tone),
                    title: taskState.title,
                    description: taskState.description,
                    helper: taskState.helper,
                    nextStepLabel: texts.nextStepLabel,
                    nextStepValue: taskState.nextStep,
                  }}
                  primaryAction={{
                    href: `/tasks/${task.id}`,
                    label: texts.viewTask,
                    className: tone.primaryAction,
                  }}
                  secondaryAction={
                    task.property?.id
                      ? {
                          href: `/properties/${task.property.id}`,
                          label: texts.viewProperty,
                          className: tone.secondaryAction,
                        }
                      : undefined
                  }
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
