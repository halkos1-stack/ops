import {
  buildDayEntry,
  buildHourRows,
  getIssuesTone,
  getSuppliesTone,
  isOpenIssue,
  normalizeDateOnly,
  normalizeTaskStatus,
  safeArray,
  startOfDay,
  type CalendarFilter,
  type DayEntry,
  type HourRow,
  type Language,
  type PropertyDetail,
  type PropertyIssueLite,
  type PropertyTaskLite,
  type SupplyRow,
  type Tone,
  type WorkWindow,
} from "@/lib/properties/property-detail-helpers"
import {
  getOperationalStatusBadgeClasses,
  getOperationalStatusLabel,
  getOperationalStatusTooltip,
  getReadinessBadgeClasses,
  getReadinessLabel,
  getReadinessTone,
  normalizeOperationalForUI,
  normalizeReadinessForUI,
} from "@/lib/readiness/readiness-ui"

export type {
  CalendarGranularity,
  OccupancyKind,
  PropertyBookingLite,
  PropertyFormState,
  PropertySupplyLite,
  PropertyTaskAssignmentLite,
  SupplyState,
  TaskModalState,
  TaskTitleKey,
  WorkWindow as PropertyWorkWindow,
} from "@/lib/properties/property-detail-helpers"

export {
  TASK_TITLE_OPTIONS,
  addDays,
  addMonths,
  buildIssueTooltip,
  buildOccupancyTooltip,
  buildPropertyFormState,
  buildSupplyRows,
  buildSupplyTooltip,
  buildTaskTooltip,
  buildVisibleDates,
  combineDateAndTime,
  endOfDay,
  formatDateTime,
  formatFullDate,
  formatMonthTitle,
  formatShortDate,
  formatTime,
  getBookingDayKind,
  getBookingDayLabel,
  getIssueStatusLabel,
  getIssuesTone,
  getLatestAssignment,
  getOccupancyTone,
  getSupplyState,
  getSupplyStateLabel,
  getSuppliesTone,
  getTaskActionInstruction,
  getTaskStatusLabel,
  getTaskTitleOptions,
  getTaskTone,
  getToneClasses,
  isBookingCancelled,
  normalizeDate,
  normalizeDateOnly,
  normalizeIssueSeverity,
  normalizeIssueStatus,
  sameDay,
  startOfWeek,
  toDateTimeLocalValue,
  translations,
  type CalendarFilter,
  type DayEntry,
  type HourRow,
  type Language,
  type PropertyDetail,
  type PropertyIssueLite,
  type PropertyTaskLite,
  type SupplyRow,
  type Tone,
  type WorkWindow,
} from "@/lib/properties/property-detail-helpers"

export {
  getOperationalStatusBadgeClasses,
  getOperationalStatusLabel,
  getOperationalStatusTooltip,
  getReadinessBadgeClasses,
  getReadinessLabel,
  getReadinessTone,
  normalizeOperationalForUI,
  normalizeReadinessForUI,
} from "@/lib/readiness/readiness-ui"

export const PROPERTY_DETAIL_CLOSED_TASK_STATUSES = new Set([
  "completed",
  "cancelled",
  "canceled",
  "not_executed",
  "missed",
])

export type PropertyDetailCalendarCounters = {
  bookings: number
  tasks: number
  supplies: number
  issues: number
}

export type PropertyDayEntriesInput = {
  property: PropertyDetail | null
  anchorDate: Date
  visibleDates: Date[]
  supplyRows: SupplyRow[]
  workWindows: WorkWindow[]
}

export type PropertySelectedDayEntryInput = {
  property: PropertyDetail | null
  dayEntries: DayEntry[]
  anchorDate: Date
  supplyRows: SupplyRow[]
  workWindows: WorkWindow[]
}

export type PropertyIssueDisplayState = {
  count: number
  hasItems: boolean
  tone: Tone
}

export type PropertySupplyDisplayState = {
  count: number
  hasItems: boolean
  tone: Tone
  shortageCount: number
  mediumCount: number
}

export type PropertyReadinessDisplay = {
  status: ReturnType<typeof normalizeReadinessForUI>
  label: string
  badgeClassName: string
  tone: ReturnType<typeof getReadinessTone>
}

export type PropertyPlanningDisplay = {
  status: ReturnType<typeof normalizeOperationalForUI>
  label: string
  badgeClassName: string
  tooltip: string
}

export type CalendarFilterVisibility = {
  showBookings: boolean
  showTasks: boolean
  showSupplies: boolean
  showIssues: boolean
}

export type CalendarEntryAttentionState = {
  needsAttention: boolean
  reasons: string[]
  isArrivalDay: boolean
  isFutureOrToday: boolean
  gapTask: PropertyTaskLite | null
  gapTaskDone: boolean
  propertyHasShortage: boolean
  propertyHasOpenIssue: boolean
}

export function buildPropertyDayEntries(
  input: PropertyDayEntriesInput
): DayEntry[] {
  if (!input.property) return []
  const property = input.property

  return input.visibleDates.map((date) =>
    buildDayEntry({
      date,
      anchorDate: input.anchorDate,
      property,
      supplyRows: input.supplyRows,
      windows: input.workWindows,
    })
  )
}

export function selectPropertyDayEntry(
  input: PropertySelectedDayEntryInput
): DayEntry | null {
  if (!input.property) return null

  const selectedKey = normalizeDateOnly(input.anchorDate)

  return (
    input.dayEntries.find((entry) => entry.key === selectedKey) ||
    buildDayEntry({
      date: input.anchorDate,
      anchorDate: input.anchorDate,
      property: input.property,
      supplyRows: input.supplyRows,
      windows: input.workWindows,
    })
  )
}

export function buildPropertyHourRows(entry: DayEntry | null): HourRow[] {
  if (!entry) return []
  return buildHourRows(entry)
}

export function buildPropertyCalendarCounters(
  dayEntries: DayEntry[]
): PropertyDetailCalendarCounters {
  const bookingIds = new Set<string>()
  const taskIds = new Set<string>()
  const supplyIds = new Set<string>()
  const issueIds = new Set<string>()

  for (const entry of dayEntries) {
    for (const booking of entry.activeBookings) {
      bookingIds.add(booking.id)
    }

    for (const task of entry.scheduledTasks) {
      if (!PROPERTY_DETAIL_CLOSED_TASK_STATUSES.has(normalizeTaskStatus(task.status))) {
        taskIds.add(task.id)
      }
    }

    for (const supply of entry.supplyRecords) {
      supplyIds.add(supply.id)
    }

    for (const issue of entry.issueRecords) {
      issueIds.add(issue.id)
    }
  }

  return {
    bookings: bookingIds.size,
    tasks: taskIds.size,
    supplies: supplyIds.size,
    issues: issueIds.size,
  }
}

export function getCalendarFilterVisibility(
  activeFilter: CalendarFilter
): CalendarFilterVisibility {
  return {
    showBookings: activeFilter === null || activeFilter === "bookings",
    showTasks: activeFilter === null || activeFilter === "tasks",
    showSupplies: activeFilter === null || activeFilter === "supplies",
    showIssues: activeFilter === null || activeFilter === "issues",
  }
}

export function selectPropertyOpenIssues(
  property: PropertyDetail | null
): PropertyIssueLite[] {
  return safeArray(property?.issues).filter(isOpenIssue)
}

export function selectEntryIssueRecords(entry: DayEntry | null): PropertyIssueLite[] {
  return entry?.issueRecords ?? []
}

export function selectEntrySupplyRows(entry: DayEntry | null): SupplyRow[] {
  return entry?.supplyRecords ?? []
}

export function selectMissingSupplyRows(rows: SupplyRow[]): SupplyRow[] {
  return rows.filter((row) => row.state === "missing")
}

export function getIssueDisplayState(
  issues: PropertyIssueLite[]
): PropertyIssueDisplayState {
  return {
    count: issues.length,
    hasItems: issues.length > 0,
    tone: issues.length > 0 ? getIssuesTone(issues) : "slate",
  }
}

export function getSupplyDisplayState(
  rows: SupplyRow[]
): PropertySupplyDisplayState {
  return {
    count: rows.length,
    hasItems: rows.length > 0,
    tone: rows.length > 0 ? getSuppliesTone(rows) : "slate",
    shortageCount: rows.filter((row) => row.state === "missing").length,
    mediumCount: rows.filter((row) => row.state === "medium").length,
  }
}

export function getPropertyReadinessDisplay(
  language: Language,
  value: unknown
): PropertyReadinessDisplay {
  return {
    status: normalizeReadinessForUI(value),
    label: getReadinessLabel(language, value),
    badgeClassName: getReadinessBadgeClasses(value),
    tone: getReadinessTone(value),
  }
}

export function getPropertyPlanningDisplay(
  language: Language,
  value: unknown
): PropertyPlanningDisplay {
  return {
    status: normalizeOperationalForUI(value),
    label: getOperationalStatusLabel(language, value),
    badgeClassName: getOperationalStatusBadgeClasses(value),
    tooltip: getOperationalStatusTooltip(language, value),
  }
}

export function getCalendarEntryAttentionState(input: {
  entry: DayEntry
  language: Language
  allSupplyRows: SupplyRow[]
  allPropertyIssues: PropertyIssueLite[]
  today?: Date
}): CalendarEntryAttentionState {
  const todayMidnight = startOfDay(input.today ?? new Date())
  const entryMidnight = startOfDay(input.entry.date)
  const isFutureOrToday = entryMidnight.getTime() >= todayMidnight.getTime()

  const isArrivalDay =
    input.entry.arrivals.length > 0 &&
    input.entry.workWindow !== null &&
    input.entry.workWindow.nextBooking !== null &&
    normalizeDateOnly(input.entry.workWindow.nextBooking.checkInDate) === input.entry.key

  const gapTask = isArrivalDay ? input.entry.workWindow?.linkedTask ?? null : null
  const gapTaskDone =
    gapTask !== null && normalizeTaskStatus(gapTask.status) === "completed"

  const propertyHasShortage = input.allSupplyRows.some((row) => row.state === "missing")
  const propertyHasOpenIssue = input.allPropertyIssues.some(isOpenIssue)

  const needsAttention =
    isArrivalDay &&
    isFutureOrToday &&
    (!gapTaskDone || propertyHasShortage || propertyHasOpenIssue)

  const reasons: string[] = []

  if (needsAttention) {
    if (!gapTask) {
      reasons.push(
        input.language === "el"
          ? "Δεν υπάρχει εργασία κάλυψης"
          : "No coverage task scheduled"
      )
    } else if (!gapTaskDone) {
      reasons.push(
        input.language === "el"
          ? "Εργασία δεν έχει ολοκληρωθεί"
          : "Task not yet completed"
      )
    }

    if (propertyHasShortage) {
      reasons.push(
        input.language === "el"
          ? "Ελλείψεις αναλωσίμων"
          : "Supply shortages"
      )
    }

    if (propertyHasOpenIssue) {
      reasons.push(
        input.language === "el"
          ? "Ανοιχτές βλάβες / ζημιές"
          : "Open issues or damages"
      )
    }
  }

  return {
    needsAttention,
    reasons,
    isArrivalDay,
    isFutureOrToday,
    gapTask,
    gapTaskDone,
    propertyHasShortage,
    propertyHasOpenIssue,
  }
}
