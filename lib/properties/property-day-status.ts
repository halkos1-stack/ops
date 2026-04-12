export type PropertyPageDayStatus =
  | "HAS_GUESTS"
  | "PENDING_BOOKING_TASK_CREATION"
  | "WAITING_ACCEPTANCE"
  | "ACCEPTED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "EXECUTED"
  | "READY"

export type PropertyPageBlockerType =
  | "TASK_NOT_EXECUTED"
  | "TASK_REJECTED"
  | "OPEN_DAMAGE"
  | "OPEN_ISSUE"
  | "CRITICAL_SUPPLY_SHORTAGE"
  | "OTHER_BLOCKING_CONDITION"

export type PropertyPageDayStatusTask = {
  id: string
  title: string
  status: string | null
  taskType?: string | null
  source?: string | null
  scheduledDate?: string | Date | null
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  completedAt?: string | Date | null
  bookingId?: string | null
  alertEnabled?: boolean | null
  alertAt?: string | Date | null
  latestAssignmentStatus?: string | null
}

export type PropertyPageDayStatusBooking = {
  id: string
  guestName?: string | null
  status?: string | null
  checkInDate?: string | Date | null
  checkOutDate?: string | Date | null
  checkInTime?: string | null
  checkOutTime?: string | null
  hasTask?: boolean
  taskCount?: number
}

export type PropertyPageDayStatusIssue = {
  id: string
  title: string
  status?: string | null
  severity?: string | null
  issueType?: string | null
}

export type PropertyPageDayStatusSupply = {
  id: string
  displayName?: string | null
  derivedState?: string | null
  isCritical?: boolean | null
}

export type PropertyPageDayStatusBlocker = {
  type: PropertyPageBlockerType
  message: string
}

export type PropertyPageDayStatusResult = {
  status: PropertyPageDayStatus
  label: {
    el: string
    en: string
  }
  reason: {
    el: string
    en: string
  }
  hasGuests: boolean
  activeStayBooking: PropertyPageDayStatusBooking | null
  nextCheckOutBooking: PropertyPageDayStatusBooking | null
  nextCheckInBooking: PropertyPageDayStatusBooking | null
  turnoverSourceBooking: PropertyPageDayStatusBooking | null
  primaryTask: PropertyPageDayStatusTask | null
  manualOpenTask: PropertyPageDayStatusTask | null
  blockers: PropertyPageDayStatusBlocker[]
  showReady: boolean
  alertActive: boolean
  alertTask: {
    id: string
    title: string
    alertAt: Date
  } | null
}

export type PropertyPageCanonicalInput = {
  operationalStatus: string | null | undefined
  operationalReason?: { el: string; en: string } | null
  operationalExplanation?: { el: string; en: string } | null
  operationalRelevantTask?: {
    id: string
    title: string
    status: string | null
    scheduledDate?: string | Date | null
    latestAssignmentStatus?: string | null
  } | null
  operationalActiveBooking?: {
    id: string
    guestName?: string | null
    checkInDate?: string | Date | null
    checkOutDate?: string | Date | null
  } | null
  operationalAlertActive?: boolean | null
  operationalAlertTask?: {
    id: string
    title: string
    alertAt: string | Date
  } | null
  readinessStatus?: string | null | undefined
  bookings: PropertyPageDayStatusBooking[]
  tasks: PropertyPageDayStatusTask[]
  issues: PropertyPageDayStatusIssue[]
  supplies: PropertyPageDayStatusSupply[]
  blockingConditionCount?: number | null
}

function toDateOrNull(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function normalizeOperationalStatus(value: unknown):
  | "occupied"
  | "no_task_coverage"
  | "task_unaccepted"
  | "task_in_progress"
  | "awaiting_proof"
  | "ready"
  | "borderline"
  | "not_ready"
  | "unknown" {
  const normalized = normalizeText(value)
  if (normalized === "occupied") return "occupied"
  if (normalized === "no_task_coverage") return "no_task_coverage"
  if (normalized === "task_unaccepted" || normalized === "waiting_cleaning") return "task_unaccepted"
  if (normalized === "task_in_progress") return "task_in_progress"
  if (normalized === "awaiting_proof") return "awaiting_proof"
  if (normalized === "ready") return "ready"
  if (normalized === "borderline" || normalized === "needs_attention") return "borderline"
  if (normalized === "not_ready") return "not_ready"
  return "unknown"
}

function normalizeReadinessStatus(value: unknown): "ready" | "borderline" | "not_ready" | "unknown" {
  const normalized = normalizeText(value)
  if (normalized === "ready") return "ready"
  if (normalized === "borderline" || normalized === "needs_attention") return "borderline"
  if (normalized === "not_ready") return "not_ready"
  return "unknown"
}

function isCancelledBooking(status: unknown): boolean {
  const normalized = normalizeText(status)
  return normalized === "cancelled" || normalized === "canceled"
}

function isOpenIssue(status: unknown): boolean {
  const normalized = normalizeText(status)
  return normalized === "open" || normalized === "in_progress"
}

function isDamageIssue(issueType: unknown): boolean {
  const normalized = normalizeText(issueType)
  return normalized.includes("damage") || normalized.includes("ζημια")
}

function isCriticalSupplyShortage(supply: PropertyPageDayStatusSupply): boolean {
  const state = normalizeText(supply.derivedState)
  return Boolean(supply.isCritical) && ["missing", "empty", "low"].includes(state)
}

function isOpenTaskStatus(status: unknown): boolean {
  const normalized = normalizeText(status)
  return ["new", "pending", "assigned", "waiting_acceptance", "accepted", "in_progress"].includes(normalized)
}

function isManualTask(task: PropertyPageDayStatusTask): boolean {
  return normalizeText(task.source) === "manual"
}

function getLatestFutureBooking(bookings: PropertyPageDayStatusBooking[], now: Date) {
  return [...bookings]
    .filter((booking) => {
      if (isCancelledBooking(booking.status)) return false
      const checkIn = toDateOrNull(booking.checkInDate)
      return Boolean(checkIn && checkIn >= now)
    })
    .sort((a, b) => {
      const aCheckIn = toDateOrNull(a.checkInDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bCheckIn = toDateOrNull(b.checkInDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return aCheckIn - bCheckIn
    })[0] ?? null
}

function getLatestPastCheckout(bookings: PropertyPageDayStatusBooking[], now: Date) {
  return [...bookings]
    .filter((booking) => {
      if (isCancelledBooking(booking.status)) return false
      const checkOut = toDateOrNull(booking.checkOutDate)
      return Boolean(checkOut && checkOut <= now)
    })
    .sort((a, b) => {
      const aCheckOut = toDateOrNull(a.checkOutDate)?.getTime() ?? 0
      const bCheckOut = toDateOrNull(b.checkOutDate)?.getTime() ?? 0
      return bCheckOut - aCheckOut
    })[0] ?? null
}

function getActiveBookingFromCanonical(
  input: PropertyPageCanonicalInput,
  bookings: PropertyPageDayStatusBooking[]
): PropertyPageDayStatusBooking | null {
  const active = input.operationalActiveBooking
  if (!active) return null

  const matched = bookings.find((booking) => booking.id === active.id)
  if (matched) return matched

  return {
    id: active.id,
    guestName: active.guestName ?? null,
    checkInDate: active.checkInDate ?? null,
    checkOutDate: active.checkOutDate ?? null,
    status: null,
  }
}

function getOpenVisibleTaskDuringStay(tasks: PropertyPageDayStatusTask[]): PropertyPageDayStatusTask | null {
  return [...tasks]
    .filter((task) => isOpenTaskStatus(task.status))
    .sort((a, b) => {
      const aDate = toDateOrNull(a.scheduledDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bDate = toDateOrNull(b.scheduledDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return aDate - bDate
    })[0] ?? null
}

function getManualOpenTask(tasks: PropertyPageDayStatusTask[]): PropertyPageDayStatusTask | null {
  return tasks.find((task) => isManualTask(task) && isOpenTaskStatus(task.status)) ?? null
}

function getPrimaryTaskFromCanonical(
  input: PropertyPageCanonicalInput,
  tasks: PropertyPageDayStatusTask[]
): PropertyPageDayStatusTask | null {
  const operational = normalizeOperationalStatus(input.operationalStatus)

  if (operational === "occupied") {
    return getOpenVisibleTaskDuringStay(tasks)
  }

  const relevant = input.operationalRelevantTask
  if (!relevant) return null

  const matched = tasks.find((task) => task.id === relevant.id)
  if (matched) return matched

  return {
    id: relevant.id,
    title: relevant.title,
    status: relevant.status ?? null,
    scheduledDate: relevant.scheduledDate ?? null,
    latestAssignmentStatus: relevant.latestAssignmentStatus ?? null,
  }
}

function buildLabels(status: PropertyPageDayStatus) {
  const labels: Record<PropertyPageDayStatus, { el: string; en: string }> = {
    HAS_GUESTS: { el: "Έχει φιλοξενούμενους", en: "Has guests" },
    PENDING_BOOKING_TASK_CREATION: {
      el: "Εκκρεμεί δημιουργία εργασίας από την κράτηση",
      en: "Task creation from booking is pending",
    },
    WAITING_ACCEPTANCE: { el: "Σε αναμονή αποδοχής", en: "Waiting acceptance" },
    ACCEPTED: { el: "Η εργασία έγινε αποδεκτή", en: "Task accepted" },
    REJECTED: { el: "Η εργασία δεν έγινε αποδεκτή", en: "Task rejected" },
    IN_PROGRESS: { el: "Η εργασία εκτελείται", en: "Task in progress" },
    EXECUTED: { el: "Η εργασία εκτελέστηκε", en: "Task executed" },
    READY: { el: "Έτοιμο", en: "Ready" },
  }

  return labels[status]
}

function buildReasons(status: PropertyPageDayStatus, input: PropertyPageCanonicalInput) {
  const canonicalReason = input.operationalReason ?? null

  if (canonicalReason) {
    if (status === "HAS_GUESTS") return canonicalReason
    if (status === "PENDING_BOOKING_TASK_CREATION") return canonicalReason
    if (status === "WAITING_ACCEPTANCE") return canonicalReason
    if (status === "IN_PROGRESS") return canonicalReason
    if (status === "READY") return canonicalReason
  }

  const reasons: Record<PropertyPageDayStatus, { el: string; en: string }> = {
    HAS_GUESTS: {
      el: "Υπάρχει ενεργή διαμονή αυτή τη στιγμή.",
      en: "There is an active stay right now.",
    },
    PENDING_BOOKING_TASK_CREATION: {
      el: "Το παράθυρο μεταξύ checkout και επόμενου check-in δεν καλύπτεται ακόμη από booking-driven εργασία.",
      en: "The turnover window is not yet covered by a booking-driven task.",
    },
    WAITING_ACCEPTANCE: {
      el: "Η εργασία υπάρχει αλλά ο συνεργάτης δεν έχει απαντήσει ακόμη στην ανάθεση.",
      en: "The task exists but the partner has not yet responded to the assignment.",
    },
    ACCEPTED: {
      el: "Η εργασία έχει αποδεχθεί αλλά δεν έχει ξεκινήσει ακόμη η εκτέλεση.",
      en: "The task has been accepted but execution has not started yet.",
    },
    REJECTED: {
      el: "Η εργασία δεν έγινε αποδεκτή από τον συνεργάτη και απαιτείται νέα ανάθεση ή άλλη ενέργεια.",
      en: "The task was not accepted by the partner and needs reassignment or another action.",
    },
    IN_PROGRESS: {
      el: "Η εργασία βρίσκεται σε εκτέλεση ή εκκρεμεί η απαιτούμενη απόδειξη εκτέλεσης.",
      en: "The task is being executed or required execution proof is still pending.",
    },
    EXECUTED: {
      el: "Η εργασία έχει ολοκληρωθεί και η σελίδα δείχνει πλέον τους πραγματικούς blockers που εμποδίζουν το ακίνητο να θεωρηθεί έτοιμο.",
      en: "The task has completed and the page now shows the real blockers preventing readiness.",
    },
    READY: {
      el: "Δεν υπάρχουν ενεργά εμπόδια που να μπλοκάρουν το ακίνητο.",
      en: "There are no active blockers preventing readiness.",
    },
  }

  return reasons[status]
}

function buildBlockers(
  input: PropertyPageCanonicalInput,
  normalizedStatus: PropertyPageDayStatus
): PropertyPageDayStatusBlocker[] {
  const blockers: PropertyPageDayStatusBlocker[] = []
  const operational = normalizeOperationalStatus(input.operationalStatus)
  const readiness = normalizeReadinessStatus(input.readinessStatus)
  const relevantTask = input.operationalRelevantTask

  if (operational === "no_task_coverage") {
    blockers.push({
      type: "TASK_NOT_EXECUTED",
      message: "Δεν έχει δημιουργηθεί ακόμη η εργασία του παραθύρου από την κράτηση.",
    })
  }

  if (normalizedStatus === "REJECTED") {
    blockers.push({
      type: "TASK_REJECTED",
      message: "Η εργασία δεν έγινε αποδεκτή από τον συνεργάτη.",
    })
  }

  const openIssues = safeArray(input.issues).filter((issue) => isOpenIssue(issue.status))

  if (openIssues.some((issue) => isDamageIssue(issue.issueType))) {
    blockers.push({
      type: "OPEN_DAMAGE",
      message: "Υπάρχει ανοικτή ζημιά.",
    })
  }

  if (openIssues.some((issue) => !isDamageIssue(issue.issueType))) {
    blockers.push({
      type: "OPEN_ISSUE",
      message: "Υπάρχει ανοικτή βλάβη ή άλλο ενεργό τεχνικό θέμα.",
    })
  }

  if (safeArray(input.supplies).some((supply) => isCriticalSupplyShortage(supply))) {
    blockers.push({
      type: "CRITICAL_SUPPLY_SHORTAGE",
      message: "Υπάρχει σοβαρή έλλειψη αναλωσίμων.",
    })
  }

  if (Number(input.blockingConditionCount || 0) > 0) {
    blockers.push({
      type: "OTHER_BLOCKING_CONDITION",
      message: "Υπάρχουν ενεργές συνθήκες που μπλοκάρουν το ακίνητο.",
    })
  }

  if (
    blockers.length === 0 &&
    readiness !== "ready" &&
    normalizedStatus === "EXECUTED" &&
    normalizeText(relevantTask?.status) === "completed"
  ) {
    blockers.push({
      type: "OTHER_BLOCKING_CONDITION",
      message: "Υπάρχει ενεργό εμπόδιο που δεν επιτρέπει στο ακίνητο να φανεί έτοιμο.",
    })
  }

  return blockers
}

function mapCanonicalToPageStatus(input: PropertyPageCanonicalInput): PropertyPageDayStatus {
  const operational = normalizeOperationalStatus(input.operationalStatus)
  const readiness = normalizeReadinessStatus(input.readinessStatus)
  const relevantTask = input.operationalRelevantTask
  const assignmentStatus = normalizeText(relevantTask?.latestAssignmentStatus)
  const taskStatus = normalizeText(relevantTask?.status)

  if (operational === "occupied") return "HAS_GUESTS"
  if (operational === "no_task_coverage") return "PENDING_BOOKING_TASK_CREATION"

  if (operational === "task_unaccepted") {
    if (assignmentStatus === "rejected") return "REJECTED"
    return "WAITING_ACCEPTANCE"
  }

  if (operational === "task_in_progress") {
    if (taskStatus === "accepted" && assignmentStatus === "accepted") return "ACCEPTED"
    return "IN_PROGRESS"
  }

  if (operational === "awaiting_proof") {
    return "IN_PROGRESS"
  }

  if (operational === "ready" && readiness === "ready") {
    return "READY"
  }

  if (readiness === "ready") {
    return "READY"
  }

  return "EXECUTED"
}

export function buildPropertyPageDayStatusFromCanonical(
  input: PropertyPageCanonicalInput
): PropertyPageDayStatusResult {
  const now = new Date()
  const bookings = safeArray(input.bookings)
  const tasks = safeArray(input.tasks)
  const activeStayBooking = getActiveBookingFromCanonical(input, bookings)
  const nextCheckOutBooking = activeStayBooking
  const nextCheckInBooking = getLatestFutureBooking(bookings, now)
  const turnoverSourceBooking = activeStayBooking ? null : getLatestPastCheckout(bookings, now)
  const primaryTask = getPrimaryTaskFromCanonical(input, tasks)
  const manualOpenTask = getManualOpenTask(tasks)
  const status = mapCanonicalToPageStatus(input)
  const blockers = buildBlockers(input, status)

  return {
    status,
    label: buildLabels(status),
    reason: buildReasons(status, input),
    hasGuests: status === "HAS_GUESTS",
    activeStayBooking,
    nextCheckOutBooking,
    nextCheckInBooking,
    turnoverSourceBooking,
    primaryTask,
    manualOpenTask,
    blockers,
    showReady: status === "READY",
    alertActive: Boolean(input.operationalAlertActive || input.operationalAlertTask),
    alertTask: input.operationalAlertTask
      ? {
          id: input.operationalAlertTask.id,
          title: input.operationalAlertTask.title,
          alertAt: toDateOrNull(input.operationalAlertTask.alertAt) || new Date(),
        }
      : null,
  }
}
