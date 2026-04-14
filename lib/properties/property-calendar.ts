import { buildCanonicalSupplySnapshot } from "@/lib/supplies/compute-supply-state"

type DateLike = string | Date | null | undefined

export type PropertyCalendarBookingInput = {
  id: string
  status?: string | null
  guestName?: string | null
  checkInDate?: DateLike
  checkOutDate?: DateLike
  checkInTime?: string | null
  checkOutTime?: string | null
}

export type PropertyCalendarTaskInput = {
  id: string
  title: string
  status?: string | null
  scheduledDate?: DateLike
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  dueDate?: DateLike
  completedAt?: DateLike
  alertEnabled?: boolean | null
  alertAt?: DateLike
}

export type PropertyCalendarIssueInput = {
  id: string
  title: string
  status?: string | null
  severity?: string | null
  createdAt?: DateLike
  updatedAt?: DateLike
  resolvedAt?: DateLike
  dismissedAt?: DateLike
  requiresImmediateAction?: boolean | null
  affectsHosting?: boolean | null
}

export type PropertyCalendarConditionInput = {
  id: string
  title: string
  status?: string | null
  blockingStatus?: string | null
  severity?: string | null
  createdAt?: DateLike
  updatedAt?: DateLike
  resolvedAt?: DateLike
  dismissedAt?: DateLike
}

export type PropertyCalendarSupplyInput = {
  id: string
  currentStock?: number | null
  stateMode?: string | null
  fillLevel?: string | null
  derivedState?: string | null
  mediumThreshold?: number | null
  fullThreshold?: number | null
  minimumThreshold?: number | null
  reorderThreshold?: number | null
  warningThreshold?: number | null
  targetLevel?: number | null
  targetStock?: number | null
  trackingMode?: string | null
  isCritical?: boolean | null
  updatedAt?: DateLike
  lastSeenUpdate?: DateLike
  supplyItem?: {
    minimumStock?: number | null
  } | null
}

export type PropertyCalendarOccupancyState =
  | "vacant"
  | "occupied"
  | "check_in"
  | "check_out"
  | "turnover"

export type PropertyCalendarTaskState =
  | "none"
  | "scheduled"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "problem"

export type PropertyCalendarIssuesState = "clear" | "warning" | "critical"

export type PropertyCalendarReadinessState =
  | "ready"
  | "borderline"
  | "not_ready"
  | "occupied"
  | "unknown"

export type PropertyCalendarSuppliesSegmentState = "missing" | "medium" | "full"

export type PropertyCalendarDaySnapshot = {
  key: string
  date: Date
  occupancy: {
    state: PropertyCalendarOccupancyState
    bookingCount: number
    hasGuest: boolean
    hasCheckIn: boolean
    hasCheckOut: boolean
    primaryBookingId: string | null
    primaryGuestName: string | null
    fromTime: string | null
    toTime: string | null
  }
  tasks: {
    state: PropertyCalendarTaskState
    count: number
    completedCount: number
    activeAlertCount: number
    problemCount: number
    taskIds: string[]
  }
  supplies: {
    total: number
    updatedAt: string | null
    criticalShortageCount: number
    segments: Array<{
      state: PropertyCalendarSuppliesSegmentState
      count: number
      percentage: number
    }>
  }
  issues: {
    state: PropertyCalendarIssuesState
    count: number
    blockingCount: number
    warningCount: number
    issueIds: string[]
    conditionIds: string[]
  }
  readiness: {
    state: PropertyCalendarReadinessState
    blockingReason:
      | "occupied"
      | "turnover_without_task"
      | "turnover_task_pending"
      | "issues"
      | "conditions"
      | "clear"
      | "unknown"
  }
}

export type PropertyCalendarSnapshot = {
  anchorDate: string
  startDate: string
  endDate: string
  days: PropertyCalendarDaySnapshot[]
}

export type BuildPropertyCalendarSnapshotInput = {
  anchorDate?: DateLike
  days?: number
  bookings?: PropertyCalendarBookingInput[] | null
  tasks?: PropertyCalendarTaskInput[] | null
  issues?: PropertyCalendarIssueInput[] | null
  conditions?: PropertyCalendarConditionInput[] | null
  propertySupplies?: PropertyCalendarSupplyInput[] | null
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function normalizeInteger(value: number | null | undefined, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback
}

function toDateOrNull(value: DateLike) {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const text = String(value).trim()
  if (!text) return null

  const dateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1])
    const month = Number(dateOnlyMatch[2]) - 1
    const day = Number(dateOnlyMatch[3])
    const date = new Date(year, month, day)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizeDateKey(value: DateLike) {
  const date = toDateOrNull(value)
  if (!date) return null

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function normalizeTime(value?: string | null) {
  const text = String(value || "").trim()
  if (!text) return null

  const normalized = text.slice(0, 5)
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized) ? normalized : null
}

function startOfDay(value: DateLike) {
  const date = toDateOrNull(value)
  if (!date) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endOfDay(value: DateLike) {
  const start = startOfDay(value)
  if (!start) return null
  return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999)
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function compareDateKeys(a: string | null, b: string | null) {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b)
}

function isOpenIssueStatus(status: string | null | undefined) {
  const normalized = String(status || "").trim().toLowerCase()
  return normalized === "open" || normalized === "in_progress"
}

function isConditionActive(status: string | null | undefined) {
  const normalized = String(status || "").trim().toLowerCase()
  return normalized === "open" || normalized === "monitoring"
}

function isBookingCancelled(status: string | null | undefined) {
  const normalized = String(status || "").trim().toLowerCase()
  return normalized === "cancelled" || normalized === "canceled"
}

function normalizeTaskStatus(status: string | null | undefined) {
  return String(status || "").trim().toLowerCase()
}

function isTaskCompleted(status: string | null | undefined) {
  const normalized = normalizeTaskStatus(status)
  return normalized === "completed"
}

function isTaskClosed(status: string | null | undefined) {
  const normalized = normalizeTaskStatus(status)
  return (
    normalized === "completed" ||
    normalized === "cancelled" ||
    normalized === "canceled"
  )
}

function isTaskProblem(task: PropertyCalendarTaskInput, dayEnd: Date) {
  if (isTaskClosed(task.status)) return false

  const dueDate = endOfDay(task.dueDate)
  if (dueDate && dueDate.getTime() < dayEnd.getTime()) return true

  if (task.alertEnabled === true) {
    const alertAt = toDateOrNull(task.alertAt)
    if (alertAt && alertAt.getTime() <= dayEnd.getTime()) return true
  }

  return false
}

function classifyTaskState(
  tasks: PropertyCalendarTaskInput[],
  dayEnd: Date
): PropertyCalendarDaySnapshot["tasks"] {
  const taskIds = tasks.map((task) => task.id)
  const completedCount = tasks.filter((task) => isTaskCompleted(task.status)).length
  const activeAlertCount = tasks.filter(
    (task) =>
      task.alertEnabled === true &&
      (() => {
        const alertAt = toDateOrNull(task.alertAt)
        return Boolean(alertAt && alertAt.getTime() <= dayEnd.getTime())
      })()
  ).length
  const problemCount = tasks.filter((task) => isTaskProblem(task, dayEnd)).length

  let state: PropertyCalendarTaskState = "none"

  if (tasks.length === 0) {
    state = "none"
  } else if (problemCount > 0) {
    state = "problem"
  } else if (tasks.some((task) => normalizeTaskStatus(task.status) === "in_progress")) {
    state = "in_progress"
  } else if (tasks.some((task) => normalizeTaskStatus(task.status) === "accepted")) {
    state = "accepted"
  } else if (
    tasks.some((task) =>
      ["assigned", "waiting_acceptance"].includes(normalizeTaskStatus(task.status))
    )
  ) {
    state = "assigned"
  } else if (
    tasks.some((task) => ["new", "pending"].includes(normalizeTaskStatus(task.status)))
  ) {
    state = "scheduled"
  } else if (completedCount > 0) {
    state = "completed"
  }

  return {
    state,
    count: tasks.length,
    completedCount,
    activeAlertCount,
    problemCount,
    taskIds,
  }
}

function issueSeverityRank(severity: string | null | undefined) {
  const normalized = String(severity || "").trim().toLowerCase()
  if (normalized === "critical" || normalized === "urgent" || normalized === "high") return 3
  if (normalized === "medium" || normalized === "warning") return 2
  if (normalized === "low") return 1
  return 0
}

function conditionSeverityRank(condition: PropertyCalendarConditionInput) {
  const blocking = String(condition.blockingStatus || "").trim().toLowerCase()
  if (blocking === "blocking") return 3
  return issueSeverityRank(condition.severity)
}

function issueActiveOnDay(issue: PropertyCalendarIssueInput, dayStart: Date, dayEnd: Date) {
  if (!isOpenIssueStatus(issue.status)) return false

  const createdAt = toDateOrNull(issue.createdAt) ?? toDateOrNull(issue.updatedAt)
  if (createdAt && createdAt.getTime() > dayEnd.getTime()) return false

  const resolvedAt = toDateOrNull(issue.resolvedAt)
  if (resolvedAt && resolvedAt.getTime() < dayStart.getTime()) return false

  const dismissedAt = toDateOrNull(issue.dismissedAt)
  if (dismissedAt && dismissedAt.getTime() < dayStart.getTime()) return false

  return true
}

function conditionActiveOnDay(
  condition: PropertyCalendarConditionInput,
  dayStart: Date,
  dayEnd: Date
) {
  if (!isConditionActive(condition.status)) return false

  const createdAt = toDateOrNull(condition.createdAt) ?? toDateOrNull(condition.updatedAt)
  if (createdAt && createdAt.getTime() > dayEnd.getTime()) return false

  const resolvedAt = toDateOrNull(condition.resolvedAt)
  if (resolvedAt && resolvedAt.getTime() < dayStart.getTime()) return false

  const dismissedAt = toDateOrNull(condition.dismissedAt)
  if (dismissedAt && dismissedAt.getTime() < dayStart.getTime()) return false

  return true
}

function classifyIssuesState(input: {
  issues: PropertyCalendarIssueInput[]
  conditions: PropertyCalendarConditionInput[]
}) {
  const blockingCount =
    input.issues.filter((issue) => issueSeverityRank(issue.severity) >= 3).length +
    input.conditions.filter((condition) => conditionSeverityRank(condition) >= 3).length

  const warningCount =
    input.issues.filter((issue) => issueSeverityRank(issue.severity) === 2).length +
    input.conditions.filter((condition) => conditionSeverityRank(condition) === 2).length

  let state: PropertyCalendarIssuesState = "clear"
  if (blockingCount > 0) state = "critical"
  else if (warningCount > 0 || input.issues.length > 0 || input.conditions.length > 0) {
    state = "warning"
  }

  return {
    state,
    count: input.issues.length + input.conditions.length,
    blockingCount,
    warningCount,
    issueIds: input.issues.map((issue) => issue.id),
    conditionIds: input.conditions.map((condition) => condition.id),
  }
}

function classifySuppliesState(supplies: PropertyCalendarSupplyInput[]) {
  const buckets: Record<PropertyCalendarSuppliesSegmentState, number> = {
    missing: 0,
    medium: 0,
    full: 0,
  }

  let updatedAt: Date | null = null
  let criticalShortageCount = 0

  for (const supply of supplies) {
    const canonical = buildCanonicalSupplySnapshot({
      isActive: true,
      stateMode: supply.stateMode,
      fillLevel: supply.fillLevel ?? supply.derivedState,
      currentStock: supply.currentStock,
      mediumThreshold: supply.mediumThreshold,
      fullThreshold: supply.fullThreshold,
      minimumThreshold: supply.minimumThreshold,
      reorderThreshold: supply.reorderThreshold,
      warningThreshold: supply.warningThreshold,
      targetLevel: supply.targetLevel,
      targetStock: supply.targetStock,
      trackingMode: supply.trackingMode,
      supplyMinimumStock: supply.supplyItem?.minimumStock,
    })

    const state =
      canonical.derivedState === "missing"
        ? "missing"
        : canonical.derivedState === "medium"
          ? "medium"
          : "full"

    buckets[state] += 1

    if (Boolean(supply.isCritical) && state === "missing") {
      criticalShortageCount += 1
    }

    const candidateDate =
      toDateOrNull(supply.lastSeenUpdate) ?? toDateOrNull(supply.updatedAt)
    if (candidateDate && (!updatedAt || candidateDate.getTime() > updatedAt.getTime())) {
      updatedAt = candidateDate
    }
  }

  const total = supplies.length

  return {
    total,
    updatedAt: updatedAt ? updatedAt.toISOString() : null,
    criticalShortageCount,
    segments: (["missing", "medium", "full"] as PropertyCalendarSuppliesSegmentState[]).map(
      (state) => ({
        state,
        count: buckets[state],
        percentage: total > 0 ? Math.round((buckets[state] / total) * 100) : 0,
      })
    ),
  }
}

function bookingTouchesDay(booking: PropertyCalendarBookingInput, dayKey: string) {
  if (isBookingCancelled(booking.status)) return false

  const checkInKey = normalizeDateKey(booking.checkInDate)
  const checkOutKey = normalizeDateKey(booking.checkOutDate)
  if (!checkInKey || !checkOutKey) return false

  return compareDateKeys(checkInKey, dayKey) <= 0 && compareDateKeys(checkOutKey, dayKey) >= 0
}

function classifyOccupancyState(
  bookings: PropertyCalendarBookingInput[],
  dayKey: string
): PropertyCalendarDaySnapshot["occupancy"] {
  const activeBookings = bookings.filter((booking) => bookingTouchesDay(booking, dayKey))
  const checkInBookings = activeBookings.filter(
    (booking) => normalizeDateKey(booking.checkInDate) === dayKey
  )
  const checkOutBookings = activeBookings.filter(
    (booking) => normalizeDateKey(booking.checkOutDate) === dayKey
  )

  const primaryBooking = activeBookings[0] || null

  let state: PropertyCalendarOccupancyState = "vacant"
  if (checkInBookings.length > 0 && checkOutBookings.length > 0) state = "turnover"
  else if (checkInBookings.length > 0) state = "check_in"
  else if (checkOutBookings.length > 0) state = "check_out"
  else if (activeBookings.length > 0) state = "occupied"

  return {
    state,
    bookingCount: activeBookings.length,
    hasGuest: activeBookings.length > 0,
    hasCheckIn: checkInBookings.length > 0,
    hasCheckOut: checkOutBookings.length > 0,
    primaryBookingId: primaryBooking?.id ?? null,
    primaryGuestName: primaryBooking?.guestName ?? null,
    fromTime: normalizeTime(primaryBooking?.checkInTime) ?? null,
    toTime: normalizeTime(primaryBooking?.checkOutTime) ?? null,
  }
}

function deriveReadinessState(input: {
  occupancy: PropertyCalendarDaySnapshot["occupancy"]
  tasks: PropertyCalendarDaySnapshot["tasks"]
  issues: PropertyCalendarDaySnapshot["issues"]
}) {
  if (input.occupancy.state === "occupied") {
    return {
      state: "occupied" as const,
      blockingReason: "occupied" as const,
    }
  }

  const turnoverDay =
    input.occupancy.state === "check_in" ||
    input.occupancy.state === "check_out" ||
    input.occupancy.state === "turnover"

  if (turnoverDay && input.tasks.state === "none") {
    return {
      state: "not_ready" as const,
      blockingReason: "turnover_without_task" as const,
    }
  }

  if (
    turnoverDay &&
    ["scheduled", "assigned", "accepted", "in_progress", "problem"].includes(
      input.tasks.state
    )
  ) {
    return {
      state: input.tasks.state === "problem" ? ("not_ready" as const) : ("borderline" as const),
      blockingReason:
        input.tasks.state === "problem"
          ? ("turnover_task_pending" as const)
          : ("turnover_task_pending" as const),
    }
  }

  if (input.issues.blockingCount > 0) {
    return {
      state: "not_ready" as const,
      blockingReason: "issues" as const,
    }
  }

  if (input.issues.warningCount > 0) {
    return {
      state: "borderline" as const,
      blockingReason: "conditions" as const,
    }
  }

  if (input.tasks.state === "problem") {
    return {
      state: "not_ready" as const,
      blockingReason: "turnover_task_pending" as const,
    }
  }

  if (
    ["scheduled", "assigned", "accepted", "in_progress"].includes(input.tasks.state)
  ) {
    return {
      state: "borderline" as const,
      blockingReason: "turnover_task_pending" as const,
    }
  }

  if (input.tasks.state === "completed" || input.occupancy.state === "vacant") {
    return {
      state: "ready" as const,
      blockingReason: "clear" as const,
    }
  }

  return {
    state: "unknown" as const,
    blockingReason: "unknown" as const,
  }
}

export function buildPropertyCalendarDaySnapshot(input: {
  date: DateLike
  bookings?: PropertyCalendarBookingInput[] | null
  tasks?: PropertyCalendarTaskInput[] | null
  issues?: PropertyCalendarIssueInput[] | null
  conditions?: PropertyCalendarConditionInput[] | null
  propertySupplies?: PropertyCalendarSupplyInput[] | null
}): PropertyCalendarDaySnapshot | null {
  const dayStart = startOfDay(input.date)
  if (!dayStart) return null

  const dayEnd = endOfDay(dayStart)
  if (!dayEnd) return null

  const key = normalizeDateKey(dayStart)
  if (!key) return null

  const dayBookings = safeArray(input.bookings).filter((booking) => bookingTouchesDay(booking, key))
  const dayTasks = safeArray(input.tasks).filter(
    (task) => normalizeDateKey(task.scheduledDate) === key
  )
  const dayIssues = safeArray(input.issues).filter((issue) =>
    issueActiveOnDay(issue, dayStart, dayEnd)
  )
  const dayConditions = safeArray(input.conditions).filter((condition) =>
    conditionActiveOnDay(condition, dayStart, dayEnd)
  )

  const occupancy = classifyOccupancyState(dayBookings, key)
  const tasks = classifyTaskState(dayTasks, dayEnd)
  const supplies = classifySuppliesState(safeArray(input.propertySupplies))
  const issues = classifyIssuesState({
    issues: dayIssues,
    conditions: dayConditions,
  })
  const readiness = deriveReadinessState({
    occupancy,
    tasks,
    issues,
  })

  return {
    key,
    date: dayStart,
    occupancy,
    tasks,
    supplies,
    issues,
    readiness,
  }
}

export function buildPropertyCalendarSnapshot(
  input: BuildPropertyCalendarSnapshotInput
): PropertyCalendarSnapshot {
  const anchorDate = startOfDay(input.anchorDate) ?? startOfDay(new Date()) ?? new Date()
  const totalDays = Math.max(1, normalizeInteger(input.days, 7))

  const days: PropertyCalendarDaySnapshot[] = []

  for (let index = 0; index < totalDays; index += 1) {
    const date = addDays(anchorDate, index)
    const snapshot = buildPropertyCalendarDaySnapshot({
      date,
      bookings: input.bookings,
      tasks: input.tasks,
      issues: input.issues,
      conditions: input.conditions,
      propertySupplies: input.propertySupplies,
    })

    if (snapshot) {
      days.push(snapshot)
    }
  }

  const firstDay = days[0]?.key ?? normalizeDateKey(anchorDate) ?? ""
  const lastDay =
    days[days.length - 1]?.key ??
    normalizeDateKey(addDays(anchorDate, totalDays - 1)) ??
    firstDay

  return {
    anchorDate: normalizeDateKey(anchorDate) ?? firstDay,
    startDate: firstDay,
    endDate: lastDay,
    days,
  }
}
