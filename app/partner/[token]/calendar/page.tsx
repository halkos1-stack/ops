"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  PortalLanguage,
  buildPartnerPortalUrl,
  getPortalStatusLabel,
  getPortalTexts,
  normalizePortalLanguage,
} from "../portal-i18n"

type CalendarItem = {
  assignmentId: string
  assignmentStatus: string
  assignedAt?: string | null
  acceptedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  task: {
    id: string
    title: string
    description?: string | null
    taskType: string
    priority?: string | null
    status?: string | null
    scheduledDate: string
    scheduledStartTime?: string | null
    scheduledEndTime?: string | null
    requiresChecklist?: boolean
    checklistRun?: {
      id: string
      status: string
      completedAt?: string | null
    } | null
    property: {
      id: string
      code: string
      name: string
      address: string
      city: string
      region: string
    }
  }
}

type CalendarResponse = {
  partner: {
    id: string
    code: string
    name: string
    email: string
    specialty: string
    status: string
  }
  view: "day" | "week" | "month"
  rangeStart: string
  rangeEnd: string
  baseDate: string
  items: CalendarItem[]
  groupedByDay: Record<string, CalendarItem[]>
}

type CalendarBlock = {
  item: CalendarItem
  top: number
  height: number
  startMinutes: number
  endMinutes: number
}

type StatusFilter = "all" | "assigned" | "accepted" | "in_progress" | "completed"

const DAY_START_HOUR = 6
const DAY_END_HOUR = 23
const HOUR_HEIGHT = 72

function todayDateParam() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDateFromParam(value?: string | null) {
  const safeValue = String(value || "").trim()

  if (!safeValue) {
    return new Date(`${todayDateParam()}T12:00:00`)
  }

  const parsed = new Date(`${safeValue}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return new Date(`${todayDateParam()}T12:00:00`)
  }

  return parsed
}

function toDateParam(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function startOfWeekMonday(date: Date) {
  const next = new Date(date)
  next.setHours(12, 0, 0, 0)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  return next
}

function formatDayHeader(value: string, language: PortalLanguage) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat(language === "el" ? "el-GR" : "en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatShortDayHeader(value: string, language: PortalLanguage) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat(language === "el" ? "el-GR" : "en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date)
}

function formatMonthTitle(date: Date, language: PortalLanguage) {
  return new Intl.DateTimeFormat(language === "el" ? "el-GR" : "en-GB", {
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatDayNumber(date: Date) {
  return date.getDate()
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function statusClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "assigned":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "accepted":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
    case "in_progress":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function activeStatusClasses(status: StatusFilter) {
  switch (status) {
    case "assigned":
      return "bg-amber-100 text-amber-800 ring-2 ring-amber-400"
    case "accepted":
      return "bg-blue-100 text-blue-800 ring-2 ring-blue-400"
    case "in_progress":
      return "bg-violet-100 text-violet-800 ring-2 ring-violet-400"
    case "completed":
      return "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400"
    default:
      return "bg-slate-900 text-white ring-2 ring-slate-900"
  }
}

function inactiveStatusClasses(status: StatusFilter) {
  switch (status) {
    case "assigned":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
    case "accepted":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
    case "in_progress":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100"
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
    default:
      return "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
  }
}

function eventClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "assigned":
      return "border-amber-300 bg-amber-100 text-amber-900"
    case "accepted":
      return "border-blue-300 bg-blue-100 text-blue-900"
    case "in_progress":
      return "border-violet-300 bg-violet-100 text-violet-900"
    case "completed":
      return "border-emerald-300 bg-emerald-100 text-emerald-900"
    default:
      return "border-slate-300 bg-slate-100 text-slate-900"
  }
}

function dotClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "assigned":
      return "bg-amber-500"
    case "accepted":
      return "bg-blue-500"
    case "in_progress":
      return "bg-violet-500"
    case "completed":
      return "bg-emerald-500"
    default:
      return "bg-slate-400"
  }
}

function parseTimeToMinutes(value?: string | null) {
  if (!value) return null

  const safe = String(value).trim()
  const match = safe.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  return hours * 60 + minutes
}

function getTaskTimeRange(item: CalendarItem) {
  const fallbackStart = 10 * 60
  const fallbackDuration = 90

  const start = parseTimeToMinutes(item.task.scheduledStartTime) ?? fallbackStart
  const end =
    parseTimeToMinutes(item.task.scheduledEndTime) ?? start + fallbackDuration

  const normalizedStart = Math.max(
    DAY_START_HOUR * 60,
    Math.min(start, DAY_END_HOUR * 60)
  )
  const normalizedEnd = Math.max(
    normalizedStart + 30,
    Math.min(end, (DAY_END_HOUR + 1) * 60)
  )

  return {
    startMinutes: normalizedStart,
    endMinutes: normalizedEnd,
  }
}

function buildBlocks(items: CalendarItem[]): CalendarBlock[] {
  return items.map((item) => {
    const { startMinutes, endMinutes } = getTaskTimeRange(item)
    const top = ((startMinutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT
    const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 48)

    return {
      item,
      top,
      height,
      startMinutes,
      endMinutes,
    }
  })
}

function getHourLabels() {
  return Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, index) => {
    const hour = DAY_START_HOUR + index
    return `${String(hour).padStart(2, "0")}:00`
  })
}

function getTexts(language: PortalLanguage) {
  const common = getPortalTexts(language)

  if (language === "en") {
    return {
      ...common,
      pageTitle: "Calendar",
      pageSubtitle: "Monthly, weekly and daily view",
      loading: "Loading calendar...",
      loadErrorTitle: "Calendar could not be loaded",
      dayView: "Day",
      weekView: "Week",
      monthView: "Month",
      previous: "Previous",
      next: "Next",
      today: "Today",
      openTask: "Open task",
      empty: "No tasks in this period.",
      schedule: "Schedule",
      history: "History",
      backHome: "Back to home",
      selectedDay: "Selected day",
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun",
      allDayArea: "Daily timeline",
      allStatuses: "All",
      pendingAcceptance: "Pending",
      accepted: "Accepted",
      inProgress: "In progress",
      completed: "Completed",
    }
  }

  return {
    ...common,
    pageTitle: "Ημερολόγιο",
    pageSubtitle: "Μηνιαία, εβδομαδιαία και ημερήσια προβολή",
    loading: "Φόρτωση ημερολογίου...",
    loadErrorTitle: "Δεν φορτώθηκε το ημερολόγιο",
    dayView: "Ημέρα",
    weekView: "Εβδομάδα",
    monthView: "Μήνας",
    previous: "Προηγούμενο",
    next: "Επόμενο",
    today: "Σήμερα",
    openTask: "Άνοιγμα εργασίας",
    empty: "Δεν υπάρχουν εργασίες σε αυτό το διάστημα.",
    schedule: "Πρόγραμμα",
    history: "Ιστορικό",
    backHome: "Επιστροφή στην αρχική",
    selectedDay: "Επιλεγμένη ημέρα",
    monday: "Δευ",
    tuesday: "Τρι",
    wednesday: "Τετ",
    thursday: "Πεμ",
    friday: "Παρ",
    saturday: "Σαβ",
    sunday: "Κυρ",
    allDayArea: "Ημερήσιο πλάνο",
    allStatuses: "Όλες",
    pendingAcceptance: "Προς αποδοχή",
    accepted: "Αποδεκτή",
    inProgress: "Σε εξέλιξη",
    completed: "Ολοκληρωμένη",
  }
}

function LanguageSwitcher({
  token,
  language,
  currentPath,
  date,
  view,
}: {
  token: string
  language: PortalLanguage
  currentPath: string
  date: string
  view: "day" | "week" | "month"
}) {
  const router = useRouter()
  const common = getPortalTexts(language)

  function buildUrl(nextLanguage: PortalLanguage) {
    return `${buildPartnerPortalUrl(token, currentPath, nextLanguage)}&date=${encodeURIComponent(
      date
    )}&view=${view}`
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
      <span className="px-2 text-xs font-semibold text-slate-500">
        {common.languageLabel}
      </span>

      <button
        type="button"
        onClick={() => router.replace(buildUrl("el"))}
        className={`rounded-xl px-3 py-2 text-xs font-semibold ${
          language === "el"
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-700 ring-1 ring-slate-200"
        }`}
      >
        {common.greek}
      </button>

      <button
        type="button"
        onClick={() => router.replace(buildUrl("en"))}
        className={`rounded-xl px-3 py-2 text-xs font-semibold ${
          language === "en"
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-700 ring-1 ring-slate-200"
        }`}
      >
        {common.english}
      </button>
    </div>
  )
}

function TimelineEvent({
  block,
  language,
  token,
}: {
  block: CalendarBlock
  language: PortalLanguage
  token: string
}) {
  return (
    <Link
      href={`${buildPartnerPortalUrl(
        token,
        `/tasks/${block.item.task.id}`,
        language
      )}&from=calendar`}
      className={`absolute left-2 right-2 rounded-xl border p-2 shadow-sm ${eventClasses(
        block.item.assignmentStatus
      )}`}
      style={{
        top: `${block.top}px`,
        height: `${block.height}px`,
      }}
    >
      <div className="text-xs font-bold">
        {block.item.task.scheduledStartTime || "—"}
        {block.item.task.scheduledEndTime
          ? ` - ${block.item.task.scheduledEndTime}`
          : ""}
      </div>
      <div className="mt-1 truncate text-sm font-semibold">
        {block.item.task.title}
      </div>
      <div className="truncate text-xs opacity-80">
        {block.item.task.property.code}
      </div>
    </Link>
  )
}

function DayTimeline({
  dayKey,
  items,
  language,
  token,
}: {
  dayKey: string
  items: CalendarItem[]
  language: PortalLanguage
  token: string
}) {
  const t = getTexts(language)
  const hourLabels = getHourLabels()
  const blocks = buildBlocks(items)
  const totalHeight = (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-slate-950">
          {formatDayHeader(dayKey, language)}
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          {t.empty}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="mb-3 pl-24 text-sm font-semibold text-slate-500">
              {t.allDayArea}
            </div>

            <div className="grid grid-cols-[96px_1fr] gap-0">
              <div className="border-r border-slate-200">
                {hourLabels.map((label) => (
                  <div
                    key={label}
                    className="relative pr-4 text-right text-xs text-slate-500"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    <span className="relative -top-2 inline-block bg-white px-1">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="relative">
                {hourLabels.map((label) => (
                  <div
                    key={label}
                    className="border-t border-slate-200"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  />
                ))}

                <div
                  className="absolute inset-x-0 top-0"
                  style={{ height: `${totalHeight}px` }}
                >
                  {blocks.map((block) => (
                    <TimelineEvent
                      key={block.item.assignmentId}
                      block={block}
                      language={language}
                      token={token}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function WeekTimeline({
  dayKeys,
  groupedByDay,
  language,
  token,
}: {
  dayKeys: string[]
  groupedByDay: Record<string, CalendarItem[]>
  language: PortalLanguage
  token: string
}) {
  const hourLabels = getHourLabels()
  const totalHeight = (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-[1100px]">
          <div className="grid grid-cols-[96px_repeat(7,minmax(0,1fr))]">
            <div />
            {dayKeys.map((dayKey) => (
              <div
                key={dayKey}
                className="border-b border-l border-slate-200 px-3 py-3 text-center"
              >
                <div className="text-sm font-bold text-slate-950">
                  {formatShortDayHeader(dayKey, language)}
                </div>
              </div>
            ))}

            <div className="border-r border-slate-200">
              {hourLabels.map((label) => (
                <div
                  key={label}
                  className="relative pr-4 text-right text-xs text-slate-500"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  <span className="relative -top-2 inline-block bg-white px-1">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {dayKeys.map((dayKey) => {
              const items = groupedByDay[dayKey] || []
              const blocks = buildBlocks(items)

              return (
                <div key={dayKey} className="relative border-l border-slate-200">
                  {hourLabels.map((label) => (
                    <div
                      key={label}
                      className="border-t border-slate-200"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    />
                  ))}

                  <div
                    className="absolute inset-x-0 top-0"
                    style={{ height: `${totalHeight}px` }}
                  >
                    {blocks.map((block) => (
                      <TimelineEvent
                        key={block.item.assignmentId}
                        block={block}
                        language={language}
                        token={token}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function MonthDayList({
  selectedDayKey,
  items,
  language,
  token,
}: {
  selectedDayKey: string
  items: CalendarItem[]
  language: PortalLanguage
  token: string
}) {
  const t = getTexts(language)

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-slate-950">
          {t.selectedDay}: {formatDayHeader(selectedDayKey, language)}
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          {t.empty}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.assignmentId}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-950">
                      {item.task.title}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                        item.assignmentStatus
                      )}`}
                    >
                      {getPortalStatusLabel(language, item.assignmentStatus)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {item.task.property.name} • {item.task.property.code}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.task.scheduledStartTime || "—"}
                    {item.task.scheduledEndTime
                      ? ` - ${item.task.scheduledEndTime}`
                      : ""}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`${buildPartnerPortalUrl(
                      token,
                      `/tasks/${item.task.id}`,
                      language
                    )}&from=calendar`}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t.openTask}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function StatusFilterButton({
  active,
  label,
  count,
  status,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  status: StatusFilter
  onClick: () => void
}) {
  const classes = active
    ? activeStatusClasses(status)
    : inactiveStatusClasses(status)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${classes}`}
    >
      <span>{label}</span>
      <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">
        {count}
      </span>
    </button>
  )
}

export default function PartnerCalendarPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const token = Array.isArray(params?.token) ? params.token[0] : params?.token
  const language = normalizePortalLanguage(searchParams.get("lang"))

  const rawView = String(searchParams.get("view") || "month").toLowerCase()
  const selectedView: "day" | "week" | "month" =
    rawView === "day" || rawView === "week" ? rawView : "month"

  const selectedDateParam = String(
    searchParams.get("date") || todayDateParam()
  ).trim()

  const selectedDate = useMemo(
    () => parseDateFromParam(selectedDateParam),
    [selectedDateParam]
  )

  const [data, setData] = useState<CalendarResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedDayKey, setSelectedDayKey] = useState(selectedDateParam)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const t = getTexts(language)

  async function loadData() {
    if (!token) return

    try {
      setLoading(true)
      setError("")

      const res = await fetch(
        `/api/partner/${token}/calendar?view=${selectedView}&date=${encodeURIComponent(
          selectedDateParam
        )}`,
        {
          cache: "no-store",
        }
      )

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || "Αποτυχία φόρτωσης ημερολογίου.")
      }

      setData(json)
    } catch (err) {
      console.error("Partner calendar load error:", err)
      setError(err instanceof Error ? err.message : "Παρουσιάστηκε σφάλμα.")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token, selectedView, selectedDateParam])

  useEffect(() => {
    setSelectedDayKey(selectedDateParam)
  }, [selectedDateParam])

  function changeView(nextView: "day" | "week" | "month") {
    router.replace(
      `${buildPartnerPortalUrl(token as string, "/calendar", language)}&date=${encodeURIComponent(
        selectedDateParam
      )}&view=${nextView}`
    )
  }

  function changeDate(direction: "prev" | "next" | "today") {
    const nextDate =
      direction === "today"
        ? parseDateFromParam(todayDateParam())
        : selectedView === "month"
          ? addMonths(selectedDate, direction === "next" ? 1 : -1)
          : selectedView === "week"
            ? addDays(selectedDate, direction === "next" ? 7 : -7)
            : addDays(selectedDate, direction === "next" ? 1 : -1)

    router.replace(
      `${buildPartnerPortalUrl(token as string, "/calendar", language)}&date=${encodeURIComponent(
        toDateParam(nextDate)
      )}&view=${selectedView}`
    )
  }

  const counters = useMemo(() => {
    const items = data?.items || []

    return {
      all: items.length,
      assigned: items.filter((item) => item.assignmentStatus === "assigned").length,
      accepted: items.filter((item) => item.assignmentStatus === "accepted").length,
      in_progress: items.filter((item) => item.assignmentStatus === "in_progress").length,
      completed: items.filter((item) => item.assignmentStatus === "completed").length,
    }
  }, [data])

  const filteredGroupedByDay = useMemo(() => {
    const source = data?.groupedByDay || {}

    if (statusFilter === "all") {
      return source
    }

    const next: Record<string, CalendarItem[]> = {}

    for (const [dayKey, items] of Object.entries(source)) {
      next[dayKey] = items.filter((item) => item.assignmentStatus === statusFilter)
    }

    return next
  }, [data, statusFilter])

  const orderedDayKeys = useMemo(() => {
    if (selectedView === "day") {
      return [selectedDateParam]
    }

    if (selectedView === "week") {
      const start = startOfWeekMonday(selectedDate)
      return Array.from({ length: 7 }, (_, index) =>
        toDateParam(addDays(start, index))
      )
    }

    const monthStart = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1,
      12
    )
    const calendarStart = startOfWeekMonday(monthStart)

    return Array.from({ length: 42 }, (_, index) =>
      toDateParam(addDays(calendarStart, index))
    )
  }, [selectedDate, selectedDateParam, selectedView])

  const monthGridDates = useMemo(() => {
    if (selectedView !== "month") return []
    return orderedDayKeys.map((key) => parseDateFromParam(key))
  }, [orderedDayKeys, selectedView])

  const selectedDayItems = filteredGroupedByDay[selectedDayKey] || []

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          {t.loading}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-red-700">{t.loadErrorTitle}</h1>
          <p className="mt-2 text-sm text-red-600">{error || "Άγνωστο σφάλμα."}</p>
        </div>
      </div>
    )
  }

  const weekdayLabels = [
    t.monday,
    t.tuesday,
    t.wednesday,
    t.thursday,
    t.friday,
    t.saturday,
    t.sunday,
  ]

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm text-slate-500">{t.pageSubtitle}</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                {t.pageTitle}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {data.partner.name} • {data.partner.code}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <LanguageSwitcher
                token={token as string}
                language={language}
                currentPath="/calendar"
                date={selectedDateParam}
                view={selectedView}
              />

              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildPartnerPortalUrl(token as string, "", language)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t.backHome}
                </Link>
                <Link
                  href={buildPartnerPortalUrl(token as string, "/schedule", language)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t.schedule}
                </Link>
                <Link
                  href={buildPartnerPortalUrl(token as string, "/history", language)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t.history}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => changeView("month")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  selectedView === "month"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
              >
                {t.monthView}
              </button>
              <button
                type="button"
                onClick={() => changeView("week")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  selectedView === "week"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
              >
                {t.weekView}
              </button>
              <button
                type="button"
                onClick={() => changeView("day")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  selectedView === "day"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
              >
                {t.dayView}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => changeDate("prev")}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {t.previous}
              </button>
              <button
                type="button"
                onClick={() => changeDate("today")}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {t.today}
              </button>
              <button
                type="button"
                onClick={() => changeDate("next")}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {t.next}
              </button>
            </div>
          </div>

          <div className="mt-5">
            <h2 className="text-2xl font-bold text-slate-950">
              {selectedView === "month"
                ? formatMonthTitle(selectedDate, language)
                : formatDayHeader(selectedDateParam, language)}
            </h2>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <StatusFilterButton
              active={statusFilter === "all"}
              label={t.allStatuses}
              count={counters.all}
              status="all"
              onClick={() => setStatusFilter("all")}
            />

            <StatusFilterButton
              active={statusFilter === "assigned"}
              label={t.pendingAcceptance}
              count={counters.assigned}
              status="assigned"
              onClick={() => setStatusFilter("assigned")}
            />

            <StatusFilterButton
              active={statusFilter === "accepted"}
              label={t.accepted}
              count={counters.accepted}
              status="accepted"
              onClick={() => setStatusFilter("accepted")}
            />

            <StatusFilterButton
              active={statusFilter === "in_progress"}
              label={t.inProgress}
              count={counters.in_progress}
              status="in_progress"
              onClick={() => setStatusFilter("in_progress")}
            />

            <StatusFilterButton
              active={statusFilter === "completed"}
              label={t.completed}
              count={counters.completed}
              status="completed"
              onClick={() => setStatusFilter("completed")}
            />
          </div>
        </section>

        {selectedView === "month" ? (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-7 gap-2">
                {weekdayLabels.map((label) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-slate-50 px-3 py-3 text-center text-sm font-semibold text-slate-600"
                  >
                    {label}
                  </div>
                ))}

                {monthGridDates.map((date) => {
                  const key = toDateParam(date)
                  const items = filteredGroupedByDay[key] || []
                  const isCurrentMonth = sameMonth(date, selectedDate)
                  const isSelected = key === selectedDayKey

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDayKey(key)}
                      className={`min-h-[120px] rounded-2xl border p-3 text-left transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      } ${!isCurrentMonth ? "opacity-45" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">
                          {formatDayNumber(date)}
                        </span>
                        {items.length > 0 ? (
                          <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white">
                            {items.length}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-2">
                        {items.slice(0, 3).map((item) => (
                          <div
                            key={item.assignmentId}
                            className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-1"
                          >
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${dotClasses(
                                item.assignmentStatus
                              )}`}
                            />
                            <span className="truncate text-xs font-medium text-slate-700">
                              {item.task.scheduledStartTime
                                ? `${item.task.scheduledStartTime} ${item.task.title}`
                                : item.task.title}
                            </span>
                          </div>
                        ))}

                        {items.length > 3 ? (
                          <div className="text-xs font-medium text-slate-500">
                            +{items.length - 3}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <MonthDayList
              selectedDayKey={selectedDayKey}
              items={selectedDayItems}
              language={language}
              token={token as string}
            />
          </>
        ) : selectedView === "week" ? (
          <WeekTimeline
            dayKeys={orderedDayKeys}
            groupedByDay={filteredGroupedByDay}
            language={language}
            token={token as string}
          />
        ) : (
          <DayTimeline
            dayKey={selectedDateParam}
            items={filteredGroupedByDay[selectedDateParam] || []}
            language={language}
            token={token as string}
          />
        )}
      </div>
    </div>
  )
}