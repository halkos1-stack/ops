/**
 * property-list-helpers.ts
 *
 * Shared helpers για τη σελίδα λίστας ακινήτων (properties/page.tsx).
 * Περιέχει:
 *  - Types για το list API response shape
 *  - Operational counter selectors
 *  - Readiness / next booking selectors
 *  - Display label / badge class functions
 *  - Format utilities
 *  - Property section builder
 *
 * Κανόνας: χωρίς React imports, χωρίς business logic που ξεπερνά το display layer.
 */

import { isTaskAlertActive } from "@/components/tasks/task-ui"
import {
  normalizeBookingStatus,
  normalizeIssueStatus,
  normalizeTaskStatus,
} from "@/lib/i18n/normalizers"
import { normalizeReadinessForUI } from "@/lib/readiness/readiness-ui"
import {
  buildPropertyCalendarDaySnapshot,
  type PropertyCalendarDaySnapshot,
} from "@/lib/properties/property-calendar"

// ─── Re-exports for page convenience ─────────────────────────────────────────

export type { PropertyCalendarDaySnapshot }

// ─── List API data shapes ─────────────────────────────────────────────────────

export type PropertySupplyListItem = {
  id: string
  isActive?: boolean
  derivedState?: string | null
  fillLevel?: string | null
  stateMode?: string | null
  currentStock?: number | null
  mediumThreshold?: number | null
  fullThreshold?: number | null
  minimumThreshold?: number | null
  reorderThreshold?: number | null
  warningThreshold?: number | null
  targetLevel?: number | null
  targetStock?: number | null
  trackingMode?: string | null
  /** Precomputed από shapePropertyForOperationalViews → buildCanonicalSupplySnapshot */
  isShortage?: boolean | null
  isCritical?: boolean
  updatedAt?: string | null
  lastUpdatedAt?: string | null
  supplyItem?: {
    id: string
    code: string
    name: string
    nameEl?: string | null
    nameEn?: string | null
    category?: string | null
    unit?: string | null
    minimumStock?: number | null
    isActive?: boolean
  } | null
}

export type PropertyIssueListItem = {
  id: string
  title?: string | null
  status: string
  severity?: string | null
  issueType?: string | null
  requiresImmediateAction?: boolean
  affectsHosting?: boolean | null
  createdAt?: string | null
  updatedAt?: string | null
  resolvedAt?: string | null
}

export type PropertyConditionListItem = {
  id: string
  title?: string | null
  status?: string | null
  blockingStatus?: string | null
  severity?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  resolvedAt?: string | null
  dismissedAt?: string | null
}

export type PropertyTaskListItem = {
  id: string
  title: string
  status: string
  priority?: string | null
  taskType?: string | null
  scheduledDate?: string | null
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  dueDate?: string | null
  completedAt?: string | null
  alertEnabled?: boolean
  alertAt?: string | null
}

export type PropertyBookingListItem = {
  id: string
  status: string
  guestName?: string | null
  checkInDate: string
  checkOutDate: string
  checkInTime?: string | null
  checkOutTime?: string | null
}

export type PropertyListItem = {
  id: string
  code: string
  name: string
  address: string
  city: string
  region: string
  postalCode: string
  country: string
  type: string
  status: string
  bedrooms: number
  bathrooms: number
  maxGuests: number
  notes?: string | null
  defaultPartnerId?: string | null
  readinessStatus?: string | null
  readinessUpdatedAt?: string | null
  readinessReasonsText?: string | null
  nextCheckInAt?: string | null
  createdAt: string
  updatedAt: string
  defaultPartner?: {
    id: string
    code: string
    name: string
    email: string
    phone?: string | null
    specialty: string
    status: string
  } | null
  bookings?: PropertyBookingListItem[]
  tasks?: PropertyTaskListItem[]
  issues?: PropertyIssueListItem[]
  conditions?: PropertyConditionListItem[]
  propertySupplies?: PropertySupplyListItem[]
}

export type PropertyOperationalCounts = {
  todayOpenTasks: number
  activeAlerts: number
  openIssues: number
  openDamages: number
  supplyShortages: number
}

export type PropertyTodaySection = {
  property: PropertyListItem
  snapshot: PropertyCalendarDaySnapshot | null
  location: string
  nextBooking: (PropertyBookingListItem & { checkInAt: Date | null }) | null
  counts: {
    bookings: number
    tasks: number
    alerts: number
    shortages: number
    issues: number
  }
}

export type MetricFilter =
  | "all"
  | "bookings"
  | "tasks"
  | "alerts"
  | "shortages"
  | "issues"

export type CounterConfig = {
  key: keyof PropertyOperationalCounts
  label: string
  description: string
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

export function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function combineCheckInDateTime(
  checkInDate?: string | null,
  checkInTime?: string | null
) {
  const date = normalizeDate(checkInDate)
  if (!date) return null

  if (checkInTime && /^\d{2}:\d{2}$/.test(checkInTime)) {
    const [hours, minutes] = checkInTime.split(":").map(Number)
    const merged = new Date(date)
    merged.setHours(hours, minutes, 0, 0)
    return merged
  }

  const merged = new Date(date)
  merged.setHours(15, 0, 0, 0)
  return merged
}

export function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

export function localizeText(language: "el" | "en", el: string, en: string) {
  return language === "en" ? en : el
}

export function normalizeLooseText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
}

// ─── Operational counter selectors ───────────────────────────────────────────

export function isTodayOpenTask(task: PropertyTaskListItem, now: Date) {
  const scheduledDate = normalizeDate(task.scheduledDate)
  if (!scheduledDate) return false

  const taskStatus = normalizeTaskStatus(task.status)
  const isOpenStatus = [
    "PENDING",
    "ASSIGNED",
    "WAITING_ACCEPTANCE",
    "ACCEPTED",
    "IN_PROGRESS",
    "NEW",
  ].includes(taskStatus)

  return isOpenStatus && isSameCalendarDay(scheduledDate, now)
}

export function isOpenIssue(issue: PropertyIssueListItem) {
  const issueStatus = normalizeIssueStatus(issue.status)
  return issueStatus === "OPEN" || issueStatus === "IN_PROGRESS"
}

export function isDamageIssue(issue: PropertyIssueListItem) {
  const normalizedType = normalizeLooseText(issue.issueType)
  return normalizedType.includes("damage") || normalizedType.includes("ζημια")
}

/**
 * Επιστρέφει αν το supply έχει shortage.
 * Προτεραιότητα: `isShortage` precomputed field → fallback derivedState/fillLevel.
 */
export function isSupplyShortage(supply: PropertySupplyListItem) {
  if (!supply.isActive) return false
  if (typeof supply.isShortage === "boolean") return supply.isShortage
  const state = String(supply.derivedState ?? supply.fillLevel ?? "").toLowerCase()
  return state === "missing" || state === "empty" || state === "low"
}

export function getOperationalCountsForToday(
  property: PropertyListItem,
  now: Date
): PropertyOperationalCounts {
  return {
    todayOpenTasks: safeArray(property.tasks).filter((task) =>
      isTodayOpenTask(task, now)
    ).length,
    activeAlerts: safeArray(property.tasks).filter((task) =>
      isTaskAlertActive(task)
    ).length,
    openIssues: safeArray(property.issues).filter(
      (issue) => isOpenIssue(issue) && !isDamageIssue(issue)
    ).length,
    openDamages: safeArray(property.issues).filter(
      (issue) => isOpenIssue(issue) && isDamageIssue(issue)
    ).length,
    supplyShortages: safeArray(property.propertySupplies).filter((supply) =>
      isSupplyShortage(supply)
    ).length,
  }
}

// ─── Readiness selectors ──────────────────────────────────────────────────────

/**
 * Επιστρέφει την εξήγηση readiness.
 * Προτεραιότητα: readinessReasonsText από backend → fallback localized labels.
 */
export function getReadinessExplanation(
  property: PropertyListItem,
  language: "el" | "en"
) {
  const storedReason = String(property.readinessReasonsText || "").trim()
  if (storedReason) return storedReason

  const status = normalizeReadinessForUI(property.readinessStatus)

  if (status === "ready") {
    return localizeText(
      language,
      "Δεν υπάρχουν ενεργές συνθήκες που να επηρεάζουν την ετοιμότητα.",
      "No active conditions affecting readiness."
    )
  }
  if (status === "not_ready") {
    return localizeText(
      language,
      "Ενεργές συνθήκες μπλοκάρουν την ετοιμότητα.",
      "Active conditions are blocking readiness."
    )
  }
  if (status === "borderline") {
    return localizeText(
      language,
      "Ενεργές συνθήκες κρατούν το ακίνητο σε οριακή κατάσταση.",
      "Active conditions keep the property in a borderline state."
    )
  }
  return localizeText(
    language,
    "Η κατάσταση ετοιμότητας δεν είναι ακόμα διαθέσιμη.",
    "Readiness status is not yet available."
  )
}

// ─── Booking selectors ────────────────────────────────────────────────────────

export function getNextUpcomingBooking(property: PropertyListItem) {
  const now = Date.now()

  return safeArray(property.bookings)
    .map((booking) => ({
      ...booking,
      checkInAt: combineCheckInDateTime(booking.checkInDate, booking.checkInTime ?? null),
    }))
    .filter((booking) => {
      const status = normalizeBookingStatus(booking.status)
      return (
        booking.checkInAt &&
        booking.checkInAt.getTime() >= now &&
        (status === "CONFIRMED" || status === "PENDING")
      )
    })
    .sort(
      (a, b) =>
        (a.checkInAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (b.checkInAt?.getTime() ?? Number.MAX_SAFE_INTEGER)
    )[0]
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatLocation(property: PropertyListItem) {
  return [property.address, property.city, property.region]
    .filter(Boolean)
    .join(", ")
}

export function formatDateTime(value: string | null | undefined, locale: string) {
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

export function formatDisplayDateTime(
  value: string | Date | null | undefined,
  locale: string,
  options?: Intl.DateTimeFormatOptions
) {
  const date = value instanceof Date ? value : normalizeDate(value)
  if (!date) return "—"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(date)
}

export function formatDisplayDate(
  value: string | Date | null | undefined,
  locale: string
) {
  const date = value instanceof Date ? value : normalizeDate(value)
  if (!date) return "—"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export function formatTimeDisplay(value?: string | null) {
  const text = String(value || "").trim()
  if (!text) return null
  const match = text.match(/^(\d{2}:\d{2})/)
  return match ? match[1] : null
}

export function formatTaskTimeRange(
  language: "el" | "en",
  start?: string | null,
  end?: string | null
) {
  const from = formatTimeDisplay(start)
  const to = formatTimeDisplay(end)
  if (from && to) return `${from} - ${to}`
  if (from) return localizeText(language, `Από ${from}`, `From ${from}`)
  if (to) return localizeText(language, `Έως ${to}`, `Until ${to}`)
  return localizeText(language, "Δεν έχει οριστεί ώρα", "No time set")
}

export function formatCountText(
  count: number,
  language: "el" | "en",
  singularEl: string,
  pluralEl: string,
  singularEn: string,
  pluralEn: string
) {
  const label =
    language === "en"
      ? count === 1 ? singularEn : pluralEn
      : count === 1 ? singularEl : pluralEl
  return `${count} ${label}`
}

// ─── Display class helpers ────────────────────────────────────────────────────

export function getMetricCardClasses(active: boolean) {
  return active
    ? "border-slate-900 bg-slate-900 text-white"
    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
}

export function getCounterToneClasses(count: number) {
  return count > 0
    ? "bg-red-50 text-red-700 ring-red-200"
    : "bg-slate-100 text-slate-700 ring-slate-200"
}

export function getTodayOccupancyBadgeClasses(
  state: PropertyCalendarDaySnapshot["occupancy"]["state"]
) {
  switch (state) {
    case "turnover":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
    case "check_in":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "check_out":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "occupied":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
    case "vacant":
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

export function getTodayOccupancyLabel(
  language: "el" | "en",
  state: PropertyCalendarDaySnapshot["occupancy"]["state"]
) {
  switch (state) {
    case "turnover":
      return localizeText(language, "Αναχώρηση + άφιξη", "Turnover")
    case "check_in":
      return localizeText(language, "Άφιξη σήμερα", "Check-in today")
    case "check_out":
      return localizeText(language, "Αναχώρηση σήμερα", "Check-out today")
    case "occupied":
      return localizeText(language, "Με διαμονή", "Occupied")
    case "vacant":
    default:
      return localizeText(language, "Κενό σήμερα", "Vacant today")
  }
}

export function getTodayTaskBadgeClasses(
  state: PropertyCalendarDaySnapshot["tasks"]["state"]
) {
  switch (state) {
    case "problem":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    case "in_progress":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
    case "accepted":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "assigned":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "scheduled":
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "none":
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

export function getTodayTaskLabel(
  language: "el" | "en",
  state: PropertyCalendarDaySnapshot["tasks"]["state"]
) {
  switch (state) {
    case "problem":
      return localizeText(language, "Χρειάζεται ενέργεια", "Needs action")
    case "in_progress":
      return localizeText(language, "Σε εξέλιξη", "In progress")
    case "accepted":
      return localizeText(language, "Αποδεκτή", "Accepted")
    case "assigned":
      return localizeText(language, "Ανατεθειμένη", "Assigned")
    case "scheduled":
      return localizeText(language, "Προγραμματισμένη", "Scheduled")
    case "completed":
      return localizeText(language, "Ολοκληρωμένη", "Completed")
    case "none":
    default:
      return localizeText(language, "Χωρίς εργασία", "No task")
  }
}

export function getTodayIssuesBadgeClasses(
  state: PropertyCalendarDaySnapshot["issues"]["state"]
) {
  switch (state) {
    case "critical":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    case "warning":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "clear":
    default:
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
  }
}

export function getTodayIssuesLabel(
  language: "el" | "en",
  state: PropertyCalendarDaySnapshot["issues"]["state"]
) {
  switch (state) {
    case "critical":
      return localizeText(language, "Κρίσιμα θέματα", "Critical issues")
    case "warning":
      return localizeText(language, "Ανοιχτά θέματα", "Open issues")
    case "clear":
    default:
      return localizeText(language, "Καθαρό", "Clear")
  }
}

export function getTodaySupplyBadgeClasses(shortages: number) {
  return shortages > 0
    ? "bg-red-50 text-red-700 ring-1 ring-red-200"
    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
}

export function getTodaySupplyLabel(language: "el" | "en", shortages: number) {
  return shortages > 0
    ? localizeText(language, "Με ελλείψεις", "Shortages detected")
    : localizeText(language, "Πλήρες", "Covered")
}

export function getTodayReadinessReason(
  language: "el" | "en",
  snapshot: PropertyCalendarDaySnapshot | null
) {
  if (!snapshot) {
    return localizeText(
      language,
      "Δεν υπάρχουν αρκετά δεδομένα για σήμερα.",
      "Not enough data for today."
    )
  }

  switch (snapshot.readiness.blockingReason) {
    case "occupied":
      return localizeText(
        language,
        "Το ακίνητο έχει ενεργή διαμονή σήμερα.",
        "The property has an active stay today."
      )
    case "turnover_without_task":
      return localizeText(
        language,
        "Υπάρχει κίνηση κράτησης αλλά δεν υπάρχει εργασία κάλυψης.",
        "There is booking movement today without task coverage."
      )
    case "turnover_task_pending":
      return localizeText(
        language,
        "Η σημερινή εργασία είναι ακόμη ανοιχτή ή σε εξέλιξη.",
        "Today's task is still open or in progress."
      )
    case "issues":
      return localizeText(
        language,
        "Υπάρχουν ενεργά ζητήματα ή βλάβες που μπλοκάρουν τη μέρα.",
        "Active issues or damages are blocking the day."
      )
    case "conditions":
      return localizeText(
        language,
        "Υπάρχουν ενεργές προειδοποιήσεις που θέλουν παρακολούθηση.",
        "Active warnings need attention."
      )
    case "clear":
      return localizeText(
        language,
        "Η σημερινή εικόνα είναι καθαρή.",
        "Today's picture is clear."
      )
    case "unknown":
    default:
      return localizeText(
        language,
        "Η σημερινή κατάσταση δεν είναι ακόμη διαθέσιμη.",
        "Today's status is not yet available."
      )
  }
}

/**
 * Επιστρέφει border + background classes για το property card
 * βάσει της snapshot κατάστασης.
 */
export function getPropertyCardClasses(
  snapshot: PropertyCalendarDaySnapshot | null,
  shortageCount: number,
  issueCount: number
) {
  if (!snapshot) return "border-slate-200 bg-white"

  const hasArrivalToday = snapshot.occupancy.hasCheckIn
  const arrivalNotReady =
    hasArrivalToday &&
    (snapshot.tasks.count === 0 ||
      (snapshot.tasks.state !== "completed" && snapshot.tasks.state !== "none") ||
      shortageCount > 0 ||
      issueCount > 0)

  if (arrivalNotReady) return "border-red-300 bg-red-50"

  if (snapshot.issues.state === "critical" || snapshot.tasks.state === "problem") {
    return "border-red-200 bg-red-50/60"
  }
  if (snapshot.issues.state === "warning" || shortageCount > 0 || issueCount > 0) {
    return "border-amber-200 bg-amber-50/50"
  }
  if (snapshot.tasks.state !== "none" && snapshot.tasks.state !== "completed") {
    return "border-sky-200 bg-sky-50/40"
  }
  return "border-slate-200 bg-white"
}

// ─── Counter / filter config ──────────────────────────────────────────────────

export function getCounterConfigs(language: "el" | "en"): CounterConfig[] {
  return [
    {
      key: "todayOpenTasks",
      label: localizeText(language, "Εργ.", "Tasks"),
      description: localizeText(
        language,
        "Ανοιχτές εργασίες με σημερινή ημερομηνία.",
        "Open tasks scheduled for today."
      ),
    },
    {
      key: "activeAlerts",
      label: localizeText(language, "Alert", "Alerts"),
      description: localizeText(
        language,
        "Ενεργά alert σε ανοιχτές εργασίες.",
        "Active alerts on open tasks."
      ),
    },
    {
      key: "openIssues",
      label: localizeText(language, "Βλαβ.", "Issues"),
      description: localizeText(
        language,
        "Ανοιχτές βλάβες (επιχειρησιακή πληροφορία).",
        "Open non-damage issues (operational info only)."
      ),
    },
    {
      key: "openDamages",
      label: localizeText(language, "Ζημ.", "Damages"),
      description: localizeText(
        language,
        "Ανοιχτές ζημίες (επιχειρησιακή πληροφορία).",
        "Open damage records (operational info only)."
      ),
    },
    {
      key: "supplyShortages",
      label: localizeText(language, "Ελλ.", "Supply"),
      description: localizeText(
        language,
        "Ελλείψεις αναλωσίμων.",
        "Supply shortages."
      ),
    },
  ]
}

export function matchesMetricFilter(metricFilter: MetricFilter) {
  return metricFilter === "all"
}

export function matchesTodayMetricFilter(
  section: PropertyTodaySection,
  metricFilter: MetricFilter
) {
  switch (metricFilter) {
    case "bookings":
      return section.counts.bookings > 0
    case "tasks":
      return section.counts.tasks > 0
    case "alerts":
      return section.counts.alerts > 0
    case "shortages":
      return section.counts.shortages > 0
    case "issues":
      return section.counts.issues > 0
    case "all":
    default:
      return true
  }
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

export function normalizeCountryForCreate(value: string, language: "el" | "en") {
  const normalized = value.trim().toLowerCase()
  if (language === "en") {
    if (normalized === "ελλάδα" || normalized === "ελλαδα") return "Greece"
    return value
  }
  if (normalized === "greece") return "Ελλάδα"
  return value
}

export function getDefaultCountry(language: "el" | "en") {
  return language === "en" ? "Greece" : "Ελλάδα"
}

// ─── Section builder ──────────────────────────────────────────────────────────

function getTodayMissingSuppliesCount(snapshot: PropertyCalendarDaySnapshot | null) {
  if (!snapshot) return 0
  return (
    snapshot.supplies.segments.find((segment) => segment.state === "missing")?.count ?? 0
  )
}

export function buildPropertyTodaySection(
  property: PropertyListItem,
  today: Date
): PropertyTodaySection {
  const snapshot = buildPropertyCalendarDaySnapshot({
    date: today,
    bookings: safeArray(property.bookings).map((b) => ({
      id: b.id,
      status: b.status,
      guestName: b.guestName ?? null,
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
      checkInTime: b.checkInTime ?? null,
      checkOutTime: b.checkOutTime ?? null,
    })),
    tasks: safeArray(property.tasks).map((t) => ({
      id: t.id,
      title: t.title || "",
      status: t.status,
      scheduledDate: t.scheduledDate ?? null,
      scheduledStartTime: t.scheduledStartTime ?? null,
      scheduledEndTime: t.scheduledEndTime ?? null,
      dueDate: t.dueDate ?? null,
      completedAt: t.completedAt ?? null,
      alertEnabled: Boolean(t.alertEnabled),
      alertAt: t.alertAt ?? null,
    })),
    issues: safeArray(property.issues).map((issue) => ({
      id: issue.id,
      title: issue.title || "",
      status: issue.status,
      severity: issue.severity ?? null,
      createdAt: issue.createdAt ?? null,
      updatedAt: issue.updatedAt ?? null,
      resolvedAt: issue.resolvedAt ?? null,
      requiresImmediateAction: Boolean(issue.requiresImmediateAction),
      affectsHosting: issue.affectsHosting ?? null,
    })),
    conditions: safeArray(property.conditions).map((c) => ({
      id: c.id,
      title: c.title || "",
      status: c.status ?? null,
      blockingStatus: c.blockingStatus ?? null,
      severity: c.severity ?? null,
      createdAt: c.createdAt ?? null,
      updatedAt: c.updatedAt ?? null,
      resolvedAt: c.resolvedAt ?? null,
      dismissedAt: c.dismissedAt ?? null,
    })),
    propertySupplies: safeArray(property.propertySupplies).map((s) => ({
      id: s.id,
      currentStock: s.currentStock ?? null,
      stateMode: s.stateMode ?? null,
      fillLevel: s.fillLevel ?? null,
      derivedState: s.derivedState ?? null,
      mediumThreshold: s.mediumThreshold ?? null,
      fullThreshold: s.fullThreshold ?? null,
      minimumThreshold: s.minimumThreshold ?? null,
      reorderThreshold: s.reorderThreshold ?? null,
      warningThreshold: s.warningThreshold ?? null,
      targetLevel: s.targetLevel ?? null,
      targetStock: s.targetStock ?? null,
      trackingMode: s.trackingMode ?? null,
      isCritical: s.isCritical ?? null,
      updatedAt: s.updatedAt ?? null,
      lastSeenUpdate: s.lastUpdatedAt ?? null,
      supplyItem: {
        minimumStock: s.supplyItem?.minimumStock ?? null,
      },
    })),
  })

  return {
    property,
    snapshot,
    location: formatLocation(property),
    nextBooking: getNextUpcomingBooking(property) ?? null,
    counts: {
      bookings: snapshot?.occupancy.bookingCount ?? 0,
      tasks: snapshot?.tasks.count ?? 0,
      alerts: snapshot?.tasks.activeAlertCount ?? 0,
      shortages: getTodayMissingSuppliesCount(snapshot),
      issues: snapshot?.issues.count ?? 0,
    },
  }
}
