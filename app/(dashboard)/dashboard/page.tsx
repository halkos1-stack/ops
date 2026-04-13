"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { TaskCard } from "@/components/tasks/TaskCard"
import { buildCanonicalTaskInfoItems, getAssignmentStatusBadgeClasses, getTaskStatusBadgeClasses, getTaskSurfaceTone, isTaskAlertActive } from "@/components/tasks/task-ui"
import { getAssignmentStatusLabel, getTaskStatusLabel } from "@/lib/i18n/labels"
import { normalizeTaskStatus, normalizeTaskTitleText } from "@/lib/i18n/normalizers"

type Property = { id: string; code?: string; name: string; nextCheckInAt?: string | null }
type Assignment = { id: string; status: string; partner?: { id: string; name: string; code?: string | null } | null }
type Task = {
  id: string
  title: string
  status: string
  scheduledDate: string
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  alertEnabled?: boolean
  alertAt?: string | null
  propertyId?: string | null
  property?: Property | null
  booking?: { id: string; checkOutDate?: string | null } | null
  assignments?: Assignment[]
  propertyReadiness?: { nextCheckInAt?: string | null } | null
}

type Filter = "all_open" | "today" | "pending" | "assigned" | "accepted" | "in_progress" | "alerts"

function normalizeDateOnly(dateValue: string | Date | null | undefined) {
  if (!dateValue) return null
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toDateInputValue(dateValue: Date) {
  const local = new Date(dateValue.getTime() - dateValue.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function isOpenTask(task: Task) {
  return ["NEW", "PENDING", "ASSIGNED", "WAITING_ACCEPTANCE", "ACCEPTED", "IN_PROGRESS"].includes(normalizeTaskStatus(task.status))
}

function isToday(dateValue: string | null | undefined) {
  const today = normalizeDateOnly(new Date())
  const target = normalizeDateOnly(dateValue)
  if (!today || !target) return false
  return today.getTime() === target.getTime()
}

function inRange(task: Task, from: string, to: string) {
  const target = normalizeDateOnly(task.scheduledDate)
  if (!target) return false
  const fromDate = from ? normalizeDateOnly(from) : null
  const toDate = to ? normalizeDateOnly(to) : null
  if (fromDate && target.getTime() < fromDate.getTime()) return false
  if (toDate && target.getTime() > toDate.getTime()) return false
  return true
}

function getLatestAssignment(task: Task) {
  return Array.isArray(task.assignments) ? task.assignments[0] || null : null
}

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      locale: "en-GB",
      title: "Task control board",
      subtitle: "Operational control view with open tasks, active alerts and date filters.",
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
      recentOpenTasksHint: "Unified task cards for quick operational monitoring.",
      noTasks: "No open tasks found.",
      noTasksHint: "Try another filter or create a new task.",
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
      openTask: "View task",
      openProperty: "View property",
      openTasksPage: "Open tasks page",
      nextStepLabel: "Next step:",
      statusTooltip: "The current status of the task in the OPS lifecycle.",
      assignmentTooltip: "The latest assignment status for this task.",
      alertTooltip: "This task currently has an active alert.",
      needAssignmentTitle: "Needs assignment",
      needAssignmentDescription: "The task exists but no partner assignment has been defined yet.",
      needAssignmentNext: "Assign partner",
      waitingTitle: "Waiting acceptance",
      waitingDescription: "The task is assigned and waiting for partner response.",
      waitingNext: "Monitor acceptance",
      acceptedTitle: "Accepted",
      acceptedDescription: "The task is accepted and ready for execution.",
      acceptedNext: "Track execution",
      progressTitle: "In progress",
      progressDescription: "The task is currently being executed.",
      progressNext: "Review execution",
      defaultTitle: "Open task",
      defaultDescription: "Open the task to continue the next operational step.",
      defaultNext: "Open task",
    }
  }

  return {
    locale: "el-GR",
    title: "Πίνακας ελέγχου εργασιών",
    subtitle: "Λειτουργική εικόνα ελέγχου με ανοιχτές εργασίες, ενεργά alert και φίλτρα ημερομηνιών.",
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
    acceptedTasksHint: "Εργασίες που έχουν αποδεχτεί και είναι έτοιμες για εκτέλεση",
    inProgressTasks: "Σε εξέλιξη",
    inProgressTasksHint: "Εργασίες που εκτελούνται τώρα",
    recentOpenTasks: "Ανοιχτές εργασίες",
    recentOpenTasksHint: "Ενιαία cards εργασιών για γρήγορη λειτουργική παρακολούθηση.",
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
    openTask: "Προβολή εργασίας",
    openProperty: "Προβολή ακινήτου",
    openTasksPage: "Σελίδα εργασιών",
    nextStepLabel: "Επόμενο βήμα:",
    statusTooltip: "Η τρέχουσα κατάσταση της εργασίας στον κύκλο ζωής του OPS.",
    assignmentTooltip: "Η κατάσταση της τελευταίας ανάθεσης αυτής της εργασίας.",
    alertTooltip: "Η εργασία έχει αυτή τη στιγμή ενεργό alert.",
    needAssignmentTitle: "Χρειάζεται ανάθεση",
    needAssignmentDescription: "Η εργασία υπάρχει αλλά δεν έχει οριστεί ακόμη συνεργάτης.",
    needAssignmentNext: "Ανάθεση συνεργάτη",
    waitingTitle: "Αναμονή αποδοχής",
    waitingDescription: "Η εργασία είναι ανατεθειμένη και περιμένει απάντηση από τον συνεργάτη.",
    waitingNext: "Παρακολούθηση αποδοχής",
    acceptedTitle: "Αποδεκτή",
    acceptedDescription: "Η εργασία έχει αποδεχτεί και είναι έτοιμη για εκτέλεση.",
    acceptedNext: "Παρακολούθηση εκτέλεσης",
    progressTitle: "Σε εξέλιξη",
    progressDescription: "Η εργασία εκτελείται αυτή τη στιγμή.",
    progressNext: "Έλεγχος εκτέλεσης",
    defaultTitle: "Άνοιγμα εργασίας",
    defaultDescription: "Άνοιξε την εργασία για να συνεχίσεις με το επόμενο λειτουργικό βήμα.",
    defaultNext: "Άνοιγμα εργασίας",
  }
}

function getStateCard(task: Task, language: "el" | "en") {
  const texts = getTexts(language)
  const status = normalizeTaskStatus(task.status)
  const assignment = getLatestAssignment(task)
  if (!assignment) return { tone: "warning" as const, title: texts.needAssignmentTitle, description: texts.needAssignmentDescription, next: texts.needAssignmentNext }
  if (status === "ASSIGNED" || status === "WAITING_ACCEPTANCE") return { tone: "warning" as const, title: texts.waitingTitle, description: texts.waitingDescription, next: texts.waitingNext }
  if (status === "ACCEPTED") return { tone: "success" as const, title: texts.acceptedTitle, description: texts.acceptedDescription, next: texts.acceptedNext }
  if (status === "IN_PROGRESS") return { tone: "success" as const, title: texts.progressTitle, description: texts.progressDescription, next: texts.progressNext }
  return { tone: "neutral" as const, title: texts.defaultTitle, description: texts.defaultDescription, next: texts.defaultNext }
}

function panelClass(tone: "neutral" | "success" | "warning") {
  if (tone === "success") return "rounded-3xl border border-emerald-200 bg-emerald-50 p-4"
  if (tone === "warning") return "rounded-3xl border border-amber-200 bg-amber-50 p-4"
  return "rounded-3xl border border-slate-200 bg-slate-50 p-4"
}
function panelTitleClass(tone: "neutral" | "success" | "warning") {
  if (tone === "success") return "text-sm font-semibold text-emerald-900"
  if (tone === "warning") return "text-sm font-semibold text-amber-900"
  return "text-sm font-semibold text-slate-900"
}
function panelTextClass(tone: "neutral" | "success" | "warning") {
  if (tone === "success") return "mt-1 text-sm text-emerald-800"
  if (tone === "warning") return "mt-1 text-sm text-amber-800"
  return "mt-1 text-sm text-slate-700"
}

export default function DashboardPage() {
  const { language } = useAppLanguage()
  const texts = getTexts(language)
  const σήμερα = useMemo(() => new Date(), [])
  const [εργασίες, setΕργασίες] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeFilter, setActiveFilter] = useState<Filter>("all_open")
  const [selectedPropertyId, setSelectedPropertyId] = useState("")
  const [ημερομηνίαΑπό, setΗμερομηνίαΑπό] = useState(toDateInputValue(σήμερα))
  const [ημερομηνίαΈως, setΗμερομηνίαΈως] = useState("")

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)
        setError("")
        const response = await fetch("/api/tasks?openOnly=true", { cache: "no-store" })
        if (!response.ok) throw new Error(texts.loadingTasks)
        const data = await response.json()
        setΕργασίες(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Dashboard load error:", err)
        setError(texts.loadError)
      } finally {
        setLoading(false)
      }
    }
    void loadDashboardData()
  }, [language])

  const openTasks = useMemo(() => εργασίες.filter(isOpenTask), [εργασίες])
  const propertyOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code?: string }>()
    openTasks.forEach((εργασία) => {
      if (!εργασία.property?.id) return
      map.set(εργασία.property.id, { id: εργασία.property.id, name: εργασία.property.name, code: εργασία.property.code })
    })
    return [...map.values()].sort((a, b) => `${a.name} ${a.code || ""}`.localeCompare(`${b.name} ${b.code || ""}`, texts.locale))
  }, [openTasks, texts.locale])

  const propertyFiltered = useMemo(() => selectedPropertyId ? openTasks.filter((εργασία) => εργασία.propertyId === selectedPropertyId) : openTasks, [openTasks, selectedPropertyId])
  const dateFiltered = useMemo(() => propertyFiltered.filter((εργασία) => inRange(εργασία, ημερομηνίαΑπό, ημερομηνίαΈως)), [propertyFiltered, ημερομηνίαΑπό, ημερομηνίαΈως])
  const tasksToday = useMemo(() => dateFiltered.filter((εργασία) => isToday(εργασία.scheduledDate)), [dateFiltered])
  const alertTasks = useMemo(() => dateFiltered.filter((εργασία) => isTaskAlertActive(εργασία)), [dateFiltered])
  const pendingTasks = useMemo(() => dateFiltered.filter((εργασία) => ["NEW", "PENDING"].includes(normalizeTaskStatus(εργασία.status))), [dateFiltered])
  const assignedTasks = useMemo(() => dateFiltered.filter((εργασία) => ["ASSIGNED", "WAITING_ACCEPTANCE"].includes(normalizeTaskStatus(εργασία.status))), [dateFiltered])
  const acceptedTasks = useMemo(() => dateFiltered.filter((εργασία) => normalizeTaskStatus(εργασία.status) === "ACCEPTED"), [dateFiltered])
  const inProgressTasks = useMemo(() => dateFiltered.filter((εργασία) => normalizeTaskStatus(εργασία.status) === "IN_PROGRESS"), [dateFiltered])

  const filteredTasks = useMemo(() => {
    let result = [...dateFiltered]
    switch (activeFilter) {
      case "today": result = result.filter((εργασία) => isToday(εργασία.scheduledDate)); break
      case "pending": result = result.filter((εργασία) => ["NEW", "PENDING"].includes(normalizeTaskStatus(εργασία.status))); break
      case "assigned": result = result.filter((εργασία) => ["ASSIGNED", "WAITING_ACCEPTANCE"].includes(normalizeTaskStatus(εργασία.status))); break
      case "accepted": result = result.filter((εργασία) => normalizeTaskStatus(εργασία.status) === "ACCEPTED"); break
      case "in_progress": result = result.filter((εργασία) => normalizeTaskStatus(εργασία.status) === "IN_PROGRESS"); break
      case "alerts": result = result.filter((εργασία) => isTaskAlertActive(εργασία)); break
    }
    return [...result].sort((a, b) => {
      const aAlert = isTaskAlertActive(a) ? 1 : 0
      const bAlert = isTaskAlertActive(b) ? 1 : 0
      if (aAlert !== bAlert) return bAlert - aAlert
      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    })
  }, [dateFiltered, activeFilter])

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-500">{language === "en" ? "Loading..." : "Φόρτωση..."}</div>

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight text-slate-900">{texts.title}</h1><p className="mt-2 text-sm text-slate-500">{texts.subtitle}</p></div>
        <div className="flex flex-col gap-3 sm:flex-row"><Link href="/tasks/new" className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">{texts.newTask}</Link></div>
      </section>
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button type="button" onClick={() => setActiveFilter("all_open")} className={`rounded-2xl border p-5 text-left shadow-sm transition ${getCardClasses(activeFilter === "all_open", "default")}`}><p className="text-sm font-medium text-slate-500">{texts.openTasks}</p><p className="mt-3 text-3xl font-bold text-slate-900">{dateFiltered.length}</p><p className="mt-2 text-xs text-slate-500">{texts.openTasksHint}</p></button>
        <button type="button" onClick={() => setActiveFilter("today")} className={`rounded-2xl border p-5 text-left shadow-sm transition ${getCardClasses(activeFilter === "today", "blue")}`}><p className="text-sm font-medium text-slate-500">{texts.tasksToday}</p><p className="mt-3 text-3xl font-bold text-blue-600">{tasksToday.length}</p><p className="mt-2 text-xs text-slate-500">{texts.tasksTodayHint}</p></button>
        <button type="button" onClick={() => setActiveFilter("alerts")} className={`rounded-2xl border p-5 text-left shadow-sm transition ${getCardClasses(activeFilter === "alerts", "red")}`}><p className="text-sm font-medium text-slate-500">{texts.alertsNow}</p><p className="mt-3 text-3xl font-bold text-red-600">{alertTasks.length}</p><p className="mt-2 text-xs text-slate-500">{texts.alertsNowHint}</p></button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button type="button" onClick={() => setActiveFilter("pending")} className={`rounded-2xl border p-5 text-left shadow-sm transition ${getCardClasses(activeFilter === "pending", "amber")}`}><p className="text-sm font-medium text-slate-500">{texts.pendingTasks}</p><p className="mt-3 text-3xl font-bold text-amber-600">{pendingTasks.length}</p><p className="mt-2 text-xs text-slate-500">{texts.pendingTasksHint}</p></button>
        <button type="button" onClick={() => setActiveFilter("assigned")} className={`rounded-2xl border p-5 text-left shadow-sm transition ${getCardClasses(activeFilter === "assigned", "orange")}`}><p className="text-sm font-medium text-slate-500">{texts.assignedTasks}</p><p className="mt-3 text-3xl font-bold text-orange-600">{assignedTasks.length}</p><p className="mt-2 text-xs text-slate-500">{texts.assignedTasksHint}</p></button>
        <button type="button" onClick={() => setActiveFilter("accepted")} className={`rounded-2xl border p-5 text-left shadow-sm transition ${getCardClasses(activeFilter === "accepted", "sky")}`}><p className="text-sm font-medium text-slate-500">{texts.acceptedTasks}</p><p className="mt-3 text-3xl font-bold text-sky-600">{acceptedTasks.length}</p><p className="mt-2 text-xs text-slate-500">{texts.acceptedTasksHint}</p></button>
        <button type="button" onClick={() => setActiveFilter("in_progress")} className={`rounded-2xl border p-5 text-left shadow-sm transition ${getCardClasses(activeFilter === "in_progress", "blue")}`}><p className="text-sm font-medium text-slate-500">{texts.inProgressTasks}</p><p className="mt-3 text-3xl font-bold text-blue-600">{inProgressTasks.length}</p><p className="mt-2 text-xs text-slate-500">{texts.inProgressTasksHint}</p></button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1.2fr)_1fr_1fr_auto]">
          <label className="flex flex-col gap-1"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{language === "en" ? "Property" : "Ακίνητο"}</span><select value={selectedPropertyId} onChange={(e) => setSelectedPropertyId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"><option value="">{language === "en" ? "All properties" : "Όλα τα ακίνητα"}</option>{propertyOptions.map((property) => <option key={property.id} value={property.id}>{property.name} {property.code ? `· ${property.code}` : ""}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{texts.fromDate}</span><input type="date" value={ημερομηνίαΑπό} onChange={(e) => setΗμερομηνίαΑπό(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500" /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{texts.toDate}</span><input type="date" value={ημερομηνίαΈως} onChange={(e) => setΗμερομηνίαΈως(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500" /></label>
          <button type="button" onClick={() => { setSelectedPropertyId(""); setΗμερομηνίαΑπό(toDateInputValue(new Date())); setΗμερομηνίαΈως("") }} className="mt-auto inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{texts.clearDates}</button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-lg font-semibold text-slate-900">{texts.recentOpenTasks}</h2><p className="mt-1 text-sm text-slate-500">{texts.recentOpenTasksHint}</p></div>
          <div className="flex flex-wrap items-center gap-2">{([
            ["all_open", texts.filterAllOpen, "bg-slate-950"],
            ["today", texts.filterToday, "bg-blue-600"],
            ["pending", texts.filterPending, "bg-amber-500"],
            ["assigned", texts.filterAssigned, "bg-orange-500"],
            ["accepted", texts.filterAccepted, "bg-sky-600"],
            ["in_progress", texts.filterInProgress, "bg-blue-600"],
            ["alerts", texts.filterAlerts, "bg-red-600"],
          ] as Array<[Filter, string, string]>).map(([key, label, activeClass]) => <button key={key} type="button" onClick={() => setActiveFilter(key)} className={`rounded-xl px-3 py-2 text-sm font-medium transition ${activeFilter === key ? `${activeClass} text-white` : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{label}</button>)}</div>
        </div>
        <div className="p-6">
          {filteredTasks.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center"><p className="text-sm font-medium text-slate-700">{texts.noTasks}</p><p className="mt-2 text-sm text-slate-500">{texts.noTasksHint}</p></div> : <div className="space-y-4">{filteredTasks.map((εργασία) => {
            const assignment = getLatestAssignment(εργασία)
            const title = normalizeTaskTitleText(εργασία.title, language)
            const state = getStateCard(εργασία, language)
            const tone = getTaskSurfaceTone(εργασία)
            const badges = [{ id: `task-status-${εργασία.id}`, label: getTaskStatusLabel(language, εργασία.status), className: getTaskStatusBadgeClasses(εργασία.status), tooltip: texts.statusTooltip }] as Array<{ id: string; label: string; className: string; tooltip?: string }>
            if (assignment?.status && normalizeTaskStatus(assignment.status) !== normalizeTaskStatus(εργασία.status)) badges.push({ id: `assignment-${εργασία.id}`, label: getAssignmentStatusLabel(language, assignment.status), className: getAssignmentStatusBadgeClasses(assignment.status), tooltip: texts.assignmentTooltip })
            if (isTaskAlertActive(εργασία)) badges.push({ id: `alert-${εργασία.id}`, label: texts.filterAlerts, className: tone.alertBadge, tooltip: texts.alertTooltip })
            const subtitle = εργασία.property?.name ? εργασία.property.code ? `${εργασία.property.name} · ${εργασία.property.code}` : εργασία.property.name : undefined
            return <TaskCard key={εργασία.id} className={tone.card} title={title} titleHref={`/tasks/${εργασία.id}`} subtitle={subtitle} badges={badges} infoItems={buildCanonicalTaskInfoItems({ language, locale: texts.locale, scheduledDate: εργασία.scheduledDate, scheduledStartTime: εργασία.scheduledStartTime || null, scheduledEndTime: εργασία.scheduledEndTime || null, checkOutDate: εργασία.booking?.checkOutDate || null, nextCheckInAt: εργασία.propertyReadiness?.nextCheckInAt || εργασία.property?.nextCheckInAt || null, partnerName: assignment?.partner?.name || null })} statePanel={{ className: panelClass(state.tone), titleClassName: panelTitleClass(state.tone), textClassName: panelTextClass(state.tone), title: state.title, description: state.description, nextStepLabel: texts.nextStepLabel, nextStepValue: state.next }} primaryAction={{ href: `/tasks/${εργασία.id}`, label: texts.openTask, className: tone.primaryAction }} secondaryAction={εργασία.property?.id ? { href: `/properties/${εργασία.property.id}`, label: texts.openProperty, className: tone.secondaryAction } : undefined} />
          })}<div className="pt-2"><Link href="/tasks" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">{texts.openTasksPage}</Link></div></div>}
        </div>
      </section>
    </div>
  )
}
