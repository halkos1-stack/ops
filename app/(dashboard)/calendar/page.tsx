"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type Language = "el" | "en"
type CalendarView = "month" | "week" | "day"
type StatusFilter =
  | "all"
  | "PENDING_ACCEPTANCE"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"

type RawTask = {
  id?: string
  title?: string | null
  name?: string | null
  taskType?: string | null
  type?: string | null
  status?: string | null
  assignmentStatus?: string | null
  scheduledDate?: string | null
  scheduledAt?: string | null
  date?: string | null
  workDate?: string | null
  startAt?: string | null
  startTime?: string | null
  scheduledStart?: string | null
  endAt?: string | null
  endTime?: string | null
  scheduledEnd?: string | null
  property?: {
    id?: string
    code?: string | null
    name?: string | null
    address?: string | null
  } | null
  propertyName?: string | null
  propertyAddress?: string | null
  partner?: {
    id?: string
    name?: string | null
  } | null
  assignedPartner?: {
    id?: string
    name?: string | null
  } | null
}

type CalendarTask = {
  id: string
  title: string
  propertyName: string
  propertyAddress: string
  start: Date
  end: Date
  status: StatusFilter
  rawStatus: string
}

const translations = {
  el: {
    pageTitle: "Ημερολόγιο",
    pageSubtitle:
      "Κεντρική προβολή εργασιών με μηνιαία, εβδομαδιαία και ημερήσια εικόνα.",
    today: "Σήμερα",
    previous: "Προηγούμενο",
    next: "Επόμενο",
    newTask: "Νέα εργασία",
    monthView: "Μήνας",
    weekView: "Εβδομάδα",
    dayView: "Ημέρα",
    monthTasks: "Εργασίες μήνα",
    todayTasks: "Εργασίες σήμερα",
    pendingTasks: "Σε αναμονή",
    selectedDay: "Επιλεγμένη ημέρα",
    upcomingTasks: "Επόμενες εργασίες",
    noTasks: "Δεν υπάρχουν εργασίες",
    noTasksForDay: "Δεν έχει προγραμματιστεί εργασία για την επιλεγμένη ημέρα.",
    noUpcomingTasks: "Δεν υπάρχουν επερχόμενες εργασίες",
    noUpcomingTasksSubtitle: "Δημιούργησε νέες εργασίες για να εμφανιστούν εδώ.",
    all: "Όλες",
    pendingAcceptance: "Προς αποδοχή",
    accepted: "Αποδεκτή",
    inProgress: "Σε εξέλιξη",
    completed: "Ολοκληρωμένη",
    unknownProperty: "Χωρίς ακίνητο",
    untitledTask: "Χωρίς τίτλο",
    untitledType: "Εργασία",
    startsAt: "Ώρα",
    property: "Ακίνητο",
    status: "Κατάσταση",
    noTasksInRange: "Δεν υπάρχουν εργασίες σε αυτή την προβολή.",
    monthSummarySubtitle: "Όλες οι εργασίες του επιλεγμένου μήνα",
    todaySummarySubtitle: "Καταχωρήσεις για τη σημερινή ημέρα",
    pendingSummarySubtitle: "Εργασίες που περιμένουν ενέργεια",
    selectedDayEmptyTitle: "Δεν υπάρχουν εργασίες",
    upcomingEmptyTitle: "Δεν υπάρχουν επερχόμενες εργασίες",
    loading: "Φόρτωση...",
    nearestScheduledTasks: "Οι πιο κοντινές προγραμματισμένες εργασίες",
  },
  en: {
    pageTitle: "Calendar",
    pageSubtitle:
      "Central task view with monthly, weekly and daily scheduling.",
    today: "Today",
    previous: "Previous",
    next: "Next",
    newTask: "New task",
    monthView: "Month",
    weekView: "Week",
    dayView: "Day",
    monthTasks: "Month tasks",
    todayTasks: "Today tasks",
    pendingTasks: "Pending",
    selectedDay: "Selected day",
    upcomingTasks: "Upcoming tasks",
    noTasks: "No tasks",
    noTasksForDay: "There are no scheduled tasks for the selected day.",
    noUpcomingTasks: "There are no upcoming tasks",
    noUpcomingTasksSubtitle: "Create new tasks to show them here.",
    all: "All",
    pendingAcceptance: "Pending acceptance",
    accepted: "Accepted",
    inProgress: "In progress",
    completed: "Completed",
    unknownProperty: "No property",
    untitledTask: "Untitled",
    untitledType: "Task",
    startsAt: "Time",
    property: "Property",
    status: "Status",
    noTasksInRange: "There are no tasks in this view.",
    monthSummarySubtitle: "All tasks for the selected month",
    todaySummarySubtitle: "Entries for the current day",
    pendingSummarySubtitle: "Tasks waiting for action",
    selectedDayEmptyTitle: "No tasks",
    upcomingEmptyTitle: "There are no upcoming tasks",
    loading: "Loading...",
    nearestScheduledTasks: "The nearest scheduled tasks",
  },
} satisfies Record<Language, Record<string, string>>

const weekdayNames: Record<Language, string[]> = {
  el: ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
}

const hourLabels = Array.from(
  { length: 24 },
  (_, i) => `${String(i).padStart(2, "0")}:00`
)

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function getWeekStart(date: Date) {
  const d = startOfDay(date)
  const jsDay = d.getDay()
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay
  return addDays(d, mondayOffset)
}

function getMonthGridStart(date: Date) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  return getWeekStart(firstOfMonth)
}

function getMonthGridDays(date: Date) {
  const start = getMonthGridStart(date)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

function formatMonthYear(date: Date, language: Language) {
  return new Intl.DateTimeFormat(language === "el" ? "el-GR" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatFullDate(date: Date, language: Language) {
  return new Intl.DateTimeFormat(language === "el" ? "el-GR" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatTime(date: Date, language: Language) {
  return new Intl.DateTimeFormat(language === "el" ? "el-GR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}

function safeDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function buildDateFromParts(dateText?: string | null, timeText?: string | null) {
  if (!dateText) return null

  if (timeText && /^\d{2}:\d{2}/.test(timeText)) {
    const combined = new Date(
      `${dateText}T${timeText.length === 5 ? `${timeText}:00` : timeText}`
    )
    if (!Number.isNaN(combined.getTime())) return combined
  }

  const dateOnly = new Date(dateText)
  if (!Number.isNaN(dateOnly.getTime())) return dateOnly

  return null
}

function normalizeStatus(raw: RawTask): StatusFilter {
  const status = String(raw.assignmentStatus || raw.status || "").toUpperCase()

  if (
    status.includes("WAITING_ACCEPTANCE") ||
    status.includes("PENDING_ACCEPTANCE") ||
    status.includes("PENDING")
  ) {
    return "PENDING_ACCEPTANCE"
  }

  if (status.includes("ACCEPTED") || status.includes("CONFIRMED")) {
    return "ACCEPTED"
  }

  if (
    status.includes("IN_PROGRESS") ||
    status.includes("STARTED") ||
    status.includes("ONGOING")
  ) {
    return "IN_PROGRESS"
  }

  if (status.includes("COMPLETED") || status.includes("DONE")) {
    return "COMPLETED"
  }

  return "PENDING_ACCEPTANCE"
}

function normalizeTask(raw: RawTask, language: Language): CalendarTask | null {
  const start =
    safeDate(raw.startAt) ||
    safeDate(raw.scheduledStart) ||
    safeDate(raw.scheduledAt) ||
    buildDateFromParts(
      raw.scheduledDate || raw.workDate || raw.date,
      raw.startTime
    )

  if (!start) return null

  const end =
    safeDate(raw.endAt) ||
    safeDate(raw.scheduledEnd) ||
    buildDateFromParts(
      raw.scheduledDate || raw.workDate || raw.date,
      raw.endTime
    ) ||
    new Date(start.getTime() + 60 * 60 * 1000)

  const title =
    raw.title?.trim() ||
    raw.name?.trim() ||
    raw.taskType?.trim() ||
    raw.type?.trim() ||
    translations[language].untitledTask

  return {
    id: raw.id || `${title}-${start.toISOString()}`,
    title,
    propertyName:
      raw.property?.name?.trim() ||
      raw.propertyName?.trim() ||
      raw.property?.code?.trim() ||
      translations[language].unknownProperty,
    propertyAddress:
      raw.property?.address?.trim() || raw.propertyAddress?.trim() || "",
    start,
    end,
    status: normalizeStatus(raw),
    rawStatus: String(raw.assignmentStatus || raw.status || ""),
  }
}

function getStatusMeta(language: Language) {
  const t = translations[language]

  return {
    all: {
      label: t.all,
      pill: "bg-slate-900 text-white border-slate-900",
      soft: "bg-slate-50 text-slate-700 border-slate-200",
      dot: "bg-slate-900",
      calendarBlock: "border-slate-300 bg-slate-50 text-slate-800",
    },
    PENDING_ACCEPTANCE: {
      label: t.pendingAcceptance,
      pill: "bg-orange-50 text-orange-700 border-orange-200",
      soft: "bg-orange-50 text-orange-700 border-orange-200",
      dot: "bg-orange-500",
      calendarBlock: "border-orange-200 bg-orange-50 text-orange-800",
    },
    ACCEPTED: {
      label: t.accepted,
      pill: "bg-blue-50 text-blue-700 border-blue-200",
      soft: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-500",
      calendarBlock: "border-blue-200 bg-blue-50 text-blue-800",
    },
    IN_PROGRESS: {
      label: t.inProgress,
      pill: "bg-violet-50 text-violet-700 border-violet-200",
      soft: "bg-violet-50 text-violet-700 border-violet-200",
      dot: "bg-violet-500",
      calendarBlock: "border-violet-200 bg-violet-50 text-violet-800",
    },
    COMPLETED: {
      label: t.completed,
      pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
      soft: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
      calendarBlock: "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
  }
}

function countByStatus(tasks: CalendarTask[]) {
  return {
    all: tasks.length,
    PENDING_ACCEPTANCE: tasks.filter((t) => t.status === "PENDING_ACCEPTANCE")
      .length,
    ACCEPTED: tasks.filter((t) => t.status === "ACCEPTED").length,
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    COMPLETED: tasks.filter((t) => t.status === "COMPLETED").length,
  }
}

function isTaskInView(task: CalendarTask, date: Date, view: CalendarView) {
  if (view === "day") {
    return isSameDay(task.start, date)
  }

  if (view === "week") {
    const start = getWeekStart(date)
    const end = addDays(start, 7)
    return task.start >= start && task.start < end
  }

  return isSameMonth(task.start, date)
}

export default function CalendarPage() {
  const [language, setLanguage] = useState<Language>("el")
  const [selectedView, setSelectedView] = useState<CalendarView>("month")
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()))
  const [statusFilter, setStatusFilter] = useState<StatusFilter | "all">("all")
  const [tasks, setTasks] = useState<CalendarTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedDayFromMonth, setSelectedDayFromMonth] = useState<Date>(
    startOfDay(new Date())
  )

  const t = translations[language]
  const statusMeta = getStatusMeta(language)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const langParam = params.get("lang")
    if (langParam === "el" || langParam === "en") {
      setLanguage(langParam)
      return
    }

    const savedLanguage = window.localStorage.getItem("ops-language")
    if (savedLanguage === "el" || savedLanguage === "en") {
      setLanguage(savedLanguage)
    }
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set("lang", language)
    window.history.replaceState({}, "", url.toString())
    window.localStorage.setItem("ops-language", language)
  }, [language])

  useEffect(() => {
    let cancelled = false

    async function loadTasks() {
      try {
        setLoading(true)
        setError("")

        const response = await fetch("/api/tasks", {
          method: "GET",
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("Failed to load tasks")
        }

        const data = await response.json()
        const list: RawTask[] = Array.isArray(data)
          ? data
          : Array.isArray(data.tasks)
            ? data.tasks
            : Array.isArray(data.items)
              ? data.items
              : []

        const normalized = list
          .map((task) => normalizeTask(task, language))
          .filter(Boolean) as CalendarTask[]

        normalized.sort((a, b) => a.start.getTime() - b.start.getTime())

        if (!cancelled) {
          setTasks(normalized)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tasks")
          setTasks([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadTasks()

    return () => {
      cancelled = true
    }
  }, [language])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false
      return true
    })
  }, [tasks, statusFilter])

  const visibleTasks = useMemo(() => {
    return filteredTasks.filter((task) =>
      isTaskInView(task, selectedDate, selectedView)
    )
  }, [filteredTasks, selectedDate, selectedView])

  const selectedDayTasks = useMemo(() => {
    return filteredTasks
      .filter((task) => isSameDay(task.start, selectedDayFromMonth))
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [filteredTasks, selectedDayFromMonth])

  const upcomingTasks = useMemo(() => {
    const now = new Date()
    return filteredTasks
      .filter((task) => task.start >= now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 6)
  }, [filteredTasks])

  const currentMonthTasks = useMemo(() => {
    return filteredTasks.filter((task) => isSameMonth(task.start, selectedDate))
  }, [filteredTasks, selectedDate])

  const todayTasks = useMemo(() => {
    const today = startOfDay(new Date())
    return filteredTasks.filter((task) => isSameDay(task.start, today))
  }, [filteredTasks])

  const pendingTasks = useMemo(() => {
    return filteredTasks.filter((task) => task.status === "PENDING_ACCEPTANCE")
  }, [filteredTasks])

  const statusCounts = useMemo(() => countByStatus(tasks), [tasks])
  const monthDays = useMemo(() => getMonthGridDays(selectedDate), [selectedDate])

  const weekDays = useMemo(() => {
    const weekStart = getWeekStart(selectedDate)
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [selectedDate])

  function moveRange(direction: "prev" | "next") {
    if (selectedView === "month") {
      setSelectedDate((prev) => addMonths(prev, direction === "prev" ? -1 : 1))
      return
    }

    if (selectedView === "week") {
      setSelectedDate((prev) => addDays(prev, direction === "prev" ? -7 : 7))
      return
    }

    setSelectedDate((prev) => addDays(prev, direction === "prev" ? -1 : 1))
  }

  function renderTaskPill(task: CalendarTask, compact = false) {
    const meta = statusMeta[task.status]

    return (
      <Link
        key={task.id}
        href={`/tasks/${task.id}`}
        className={cn(
          "block rounded-xl border px-2 py-1.5 transition hover:shadow-sm",
          meta.calendarBlock
        )}
      >
        <div className="flex items-start gap-2">
          <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)} />
          <div className="min-w-0 flex-1">
            <p className={cn("truncate font-medium", compact ? "text-[11px]" : "text-xs")}>
              {formatTime(task.start, language)} {task.title}
            </p>
            {!compact ? (
              <p className="truncate text-[11px] opacity-80">{task.propertyName}</p>
            ) : null}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {t.pageTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t.pageSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setLanguage("el")}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                language === "el"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              Ελληνικά
            </button>

            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                language === "en"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              English
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const today = startOfDay(new Date())
              setSelectedDate(today)
              setSelectedDayFromMonth(today)
            }}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {t.today}
          </button>

          <Link
            href="/tasks/new"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {t.newTask}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryCard
          title={t.monthTasks}
          value={currentMonthTasks.length}
          subtitle={t.monthSummarySubtitle}
        />
        <SummaryCard
          title={t.todayTasks}
          value={todayTasks.length}
          subtitle={t.todaySummarySubtitle}
        />
        <SummaryCard
          title={t.pendingTasks}
          value={pendingTasks.length}
          subtitle={t.pendingSummarySubtitle}
          accent="orange"
        />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <ViewButton
              active={selectedView === "month"}
              label={t.monthView}
              onClick={() => setSelectedView("month")}
            />
            <ViewButton
              active={selectedView === "week"}
              label={t.weekView}
              onClick={() => setSelectedView("week")}
            />
            <ViewButton
              active={selectedView === "day"}
              label={t.dayView}
              onClick={() => setSelectedView("day")}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => moveRange("prev")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t.previous}
            </button>

            <button
              type="button"
              onClick={() => {
                const today = startOfDay(new Date())
                setSelectedDate(today)
                setSelectedDayFromMonth(today)
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t.today}
            </button>

            <button
              type="button"
              onClick={() => moveRange("next")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t.next}
            </button>
          </div>
        </div>

        <div className="mt-5">
          <h2 className="text-3xl font-bold capitalize text-slate-900">
            {formatMonthYear(selectedDate, language)}
          </h2>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <StatusChip
            active={statusFilter === "all"}
            label={t.all}
            count={statusCounts.all}
            activeClassName="border-slate-900 bg-slate-900 text-white"
            inactiveClassName="border-slate-200 bg-white text-slate-700"
            onClick={() => setStatusFilter("all")}
          />
          <StatusChip
            active={statusFilter === "PENDING_ACCEPTANCE"}
            label={t.pendingAcceptance}
            count={statusCounts.PENDING_ACCEPTANCE}
            activeClassName={statusMeta.PENDING_ACCEPTANCE.pill}
            inactiveClassName="border-orange-200 bg-white text-orange-700"
            onClick={() => setStatusFilter("PENDING_ACCEPTANCE")}
          />
          <StatusChip
            active={statusFilter === "ACCEPTED"}
            label={t.accepted}
            count={statusCounts.ACCEPTED}
            activeClassName={statusMeta.ACCEPTED.pill}
            inactiveClassName="border-blue-200 bg-white text-blue-700"
            onClick={() => setStatusFilter("ACCEPTED")}
          />
          <StatusChip
            active={statusFilter === "IN_PROGRESS"}
            label={t.inProgress}
            count={statusCounts.IN_PROGRESS}
            activeClassName={statusMeta.IN_PROGRESS.pill}
            inactiveClassName="border-violet-200 bg-white text-violet-700"
            onClick={() => setStatusFilter("IN_PROGRESS")}
          />
          <StatusChip
            active={statusFilter === "COMPLETED"}
            label={t.completed}
            count={statusCounts.COMPLETED}
            activeClassName={statusMeta.COMPLETED.pill}
            inactiveClassName="border-emerald-200 bg-white text-emerald-700"
            onClick={() => setStatusFilter("COMPLETED")}
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          {t.loading}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            {selectedView === "month" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-7 gap-3">
                  {weekdayNames[language].map((day) => (
                    <div
                      key={day}
                      className="rounded-2xl bg-slate-50 px-3 py-3 text-center text-sm font-semibold text-slate-600"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-3">
                  {monthDays.map((day) => {
                    const dayTasks = filteredTasks
                      .filter((task) => isSameDay(task.start, day))
                      .sort((a, b) => a.start.getTime() - b.start.getTime())

                    const inCurrentMonth = isSameMonth(day, selectedDate)
                    const isSelected = isSameDay(day, selectedDayFromMonth)
                    const isToday = isSameDay(day, new Date())

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => setSelectedDayFromMonth(startOfDay(day))}
                        className={cn(
                          "min-h-[132px] rounded-2xl border p-3 text-left transition",
                          inCurrentMonth
                            ? "border-slate-200 bg-white"
                            : "border-slate-100 bg-slate-50/60",
                          isSelected && "border-slate-900 shadow-sm",
                          isToday && !isSelected && "border-blue-300 bg-blue-50/40"
                        )}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              inCurrentMonth ? "text-slate-900" : "text-slate-400"
                            )}
                          >
                            {day.getDate()}
                          </span>

                          {dayTasks.length > 0 ? (
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-bold text-white">
                              {dayTasks.length}
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-1.5">
                          {dayTasks.slice(0, 2).map((task) => (
                            <div key={task.id}>{renderTaskPill(task, true)}</div>
                          ))}

                          {dayTasks.length > 2 ? (
                            <div className="text-[11px] font-medium text-slate-500">
                              +{dayTasks.length - 2}
                            </div>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {selectedView === "week" ? (
              <div className="overflow-x-auto">
                <div className="min-w-[980px]">
                  <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))]">
                    <div className="border-b border-slate-200 p-3" />

                    {weekDays.map((day) => (
                      <div
                        key={day.toISOString()}
                        className="border-b border-slate-200 p-3 text-center"
                      >
                        <p className="text-sm font-semibold text-slate-700">
                          {weekdayNames[language][(day.getDay() + 6) % 7]}
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {day.getDate()}
                        </p>
                      </div>
                    ))}

                    {hourLabels.map((hourLabel, hourIndex) => (
                      <div key={`week-row-${hourLabel}`} className="contents">
                        <div className="border-b border-r border-slate-100 px-2 py-4 text-xs text-slate-400">
                          {hourLabel}
                        </div>

                        {weekDays.map((day) => {
                          const dayHourTasks = filteredTasks.filter(
                            (task) =>
                              isSameDay(task.start, day) &&
                              task.start.getHours() === hourIndex
                          )

                          return (
                            <div
                              key={`${day.toISOString()}-${hourLabel}`}
                              className="min-h-[74px] border-b border-r border-slate-100 p-1.5 align-top"
                            >
                              <div className="space-y-1.5">
                                {dayHourTasks.map((task) => (
                                  <div key={task.id}>{renderTaskPill(task)}</div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {selectedView === "day" ? (
              <div className="space-y-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {formatFullDate(selectedDate, language)}
                  </h3>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  {hourLabels.map((hourLabel, hourIndex) => {
                    const hourTasks = filteredTasks.filter(
                      (task) =>
                        isSameDay(task.start, selectedDate) &&
                        task.start.getHours() === hourIndex
                    )

                    return (
                      <div
                        key={hourLabel}
                        className="grid grid-cols-[90px_minmax(0,1fr)] border-b border-slate-100 last:border-b-0"
                      >
                        <div className="border-r border-slate-100 px-3 py-4 text-xs text-slate-400">
                          {hourLabel}
                        </div>
                        <div className="min-h-[74px] p-2">
                          {hourTasks.length > 0 ? (
                            <div className="space-y-2">
                              {hourTasks.map((task) => (
                                <div key={task.id}>{renderTaskPill(task)}</div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {!loading && visibleTasks.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                {t.noTasksInRange}
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <AsidePanel
              title={t.selectedDay}
              subtitle={formatFullDate(selectedDayFromMonth, language)}
            >
              {selectedDayTasks.length === 0 ? (
                <EmptyState
                  title={t.selectedDayEmptyTitle}
                  subtitle={t.noTasksForDay}
                />
              ) : (
                <div className="space-y-3">
                  {selectedDayTasks.map((task) => (
                    <TaskSideCard
                      key={task.id}
                      task={task}
                      language={language}
                    />
                  ))}
                </div>
              )}
            </AsidePanel>

            <AsidePanel
              title={t.upcomingTasks}
              subtitle={t.nearestScheduledTasks}
            >
              {upcomingTasks.length === 0 ? (
                <EmptyState
                  title={t.upcomingEmptyTitle}
                  subtitle={t.noUpcomingTasksSubtitle}
                />
              ) : (
                <div className="space-y-3">
                  {upcomingTasks.map((task) => (
                    <TaskSideCard
                      key={task.id}
                      task={task}
                      language={language}
                    />
                  ))}
                </div>
              )}
            </AsidePanel>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  title,
  value,
  subtitle,
  accent = "slate",
}: {
  title: string
  value: number
  subtitle: string
  accent?: "slate" | "orange"
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p
        className={cn(
          "mt-3 text-4xl font-bold tracking-tight",
          accent === "orange" ? "text-orange-500" : "text-slate-900"
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

function ViewButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  )
}

function StatusChip({
  active,
  label,
  count,
  onClick,
  activeClassName,
  inactiveClassName,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
  activeClassName: string
  inactiveClassName: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
        active ? activeClassName : inactiveClassName
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
          active ? "bg-white/20 text-current" : "bg-slate-100 text-slate-700"
        )}
      >
        {count}
      </span>
    </button>
  )
}

function AsidePanel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm capitalize text-slate-500">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function EmptyState({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

function TaskSideCard({
  task,
  language,
}: {
  task: CalendarTask
  language: Language
}) {
  const t = translations[language]
  const statusMeta = getStatusMeta(language)
  const meta = statusMeta[task.status]

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {task.title}
          </p>
          <p className="mt-1 text-sm text-slate-500">{task.propertyName}</p>
          {task.propertyAddress ? (
            <p className="mt-1 truncate text-xs text-slate-400">
              {task.propertyAddress}
            </p>
          ) : null}
        </div>

        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
            meta.soft
          )}
        >
          {meta.label}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
        <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
        <span>
          {t.startsAt}: {formatTime(task.start, language)}
        </span>
      </div>
    </Link>
  )
}