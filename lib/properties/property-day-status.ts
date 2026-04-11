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

export type ComputePropertyPageDayStatusInput = {
  now?: Date
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

function isCancelledBooking(status: unknown): boolean {
  const normalized = normalizeText(status)
  return normalized === "cancelled" || normalized === "canceled"
}

function isActiveStay(booking: PropertyPageDayStatusBooking, now: Date): boolean {
  if (isCancelledBooking(booking.status)) return false

  const checkIn = toDateOrNull(booking.checkInDate)
  const checkOut = toDateOrNull(booking.checkOutDate)

  if (!checkIn || !checkOut) return false

  return now >= checkIn && now < checkOut
}

function isOpenTaskStatus(status: unknown): boolean {
  const normalized = normalizeText(status)
  return [
    "new",
    "pending",
    "assigned",
    "waiting_acceptance",
    "accepted",
    "in_progress",
  ].includes(normalized)
}

function isCompletedTaskStatus(status: unknown): boolean {
  return normalizeText(status) === "completed"
}

function isRejectedAssignmentStatus(status: unknown): boolean {
  return normalizeText(status) === "rejected"
}

function isAcceptedAssignmentStatus(status: unknown): boolean {
  const normalized = normalizeText(status)
  return normalized === "accepted" || normalized === "in_progress" || normalized === "completed"
}

function isWaitingAcceptanceAssignmentStatus(status: unknown): boolean {
  const normalized = normalizeText(status)
  return normalized === "assigned" || normalized === "pending" || normalized === "waiting_acceptance"
}

function isManualTask(task: PropertyPageDayStatusTask): boolean {
  return normalizeText(task.source) === "manual"
}

function isBookingTask(task: PropertyPageDayStatusTask): boolean {
  return normalizeText(task.source) === "booking" || Boolean(task.bookingId)
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
  return Boolean(supply.isCritical) && (state === "missing" || state === "empty" || state === "low")
}

function getAlertTask(tasks: PropertyPageDayStatusTask[], now: Date) {
  for (const task of tasks) {
    if (!isOpenTaskStatus(task.status)) continue
    if (!task.alertEnabled) continue
    const alertAt = toDateOrNull(task.alertAt)
    if (!alertAt) continue
    if (alertAt <= now) {
      return {
        id: task.id,
        title: task.title,
        alertAt,
      }
    }
  }

  return null
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

function getRelevantBookingTask(
  tasks: PropertyPageDayStatusTask[],
  booking: PropertyPageDayStatusBooking | null
): PropertyPageDayStatusTask | null {
  if (!booking) return null

  const relevant = tasks
    .filter((task) => {
      if (!isOpenTaskStatus(task.status) && !isCompletedTaskStatus(task.status)) return false
      if (!isBookingTask(task)) return false
      if (!task.bookingId) return false
      return task.bookingId === booking.id
    })
    .sort((a, b) => {
      const aDate = toDateOrNull(a.scheduledDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bDate = toDateOrNull(b.scheduledDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return aDate - bDate
    })

  return relevant[0] ?? null
}

function getOpenManualTask(tasks: PropertyPageDayStatusTask[]): PropertyPageDayStatusTask | null {
  return tasks.find((task) => isManualTask(task) && isOpenTaskStatus(task.status)) ?? null
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

function buildReasons(status: PropertyPageDayStatus) {
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
      el: "Η εργασία βρίσκεται σε εκτέλεση.",
      en: "The task is being executed.",
    },
    EXECUTED: {
      el: "Η εργασία έχει ολοκληρωθεί και το σύστημα περιμένει την τελική αξιολόγηση των blockers.",
      en: "The task has completed and the system is evaluating blockers.",
    },
    READY: {
      el: "Δεν υπάρχουν ενεργά εμπόδια που να μπλοκάρουν το ακίνητο.",
      en: "There are no active blockers preventing readiness.",
    },
  }

  return reasons[status]
}

function buildBlockers(params: {
  primaryTask: PropertyPageDayStatusTask | null
  issues: PropertyPageDayStatusIssue[]
  supplies: PropertyPageDayStatusSupply[]
  blockingConditionCount?: number | null
}): PropertyPageDayStatusBlocker[] {
  const blockers: PropertyPageDayStatusBlocker[] = []

  if (params.primaryTask) {
    const assignmentStatus = normalizeText(params.primaryTask.latestAssignmentStatus)
    const taskStatus = normalizeText(params.primaryTask.status)

    if (assignmentStatus === "rejected") {
      blockers.push({
        type: "TASK_REJECTED",
        message: "Η εργασία δεν έγινε αποδεκτή από τον συνεργάτη.",
      })
    }

    if (!isCompletedTaskStatus(taskStatus) && taskStatus !== "in_progress" && taskStatus !== "accepted") {
      blockers.push({
        type: "TASK_NOT_EXECUTED",
        message: "Η σχετική εργασία δεν έχει εκτελεστεί ακόμη.",
      })
    }
  }

  const openIssues = params.issues.filter((issue) => isOpenIssue(issue.status))

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

  if (params.supplies.some((supply) => isCriticalSupplyShortage(supply))) {
    blockers.push({
      type: "CRITICAL_SUPPLY_SHORTAGE",
      message: "Υπάρχει σοβαρή έλλειψη αναλωσίμων.",
    })
  }

  if (Number(params.blockingConditionCount || 0) > 0) {
    blockers.push({
      type: "OTHER_BLOCKING_CONDITION",
      message: "Υπάρχουν ενεργές συνθήκες που μπλοκάρουν το ακίνητο.",
    })
  }

  return blockers
}

export function computePropertyPageDayStatus(
  input: ComputePropertyPageDayStatusInput
): PropertyPageDayStatusResult {
  const now = input.now instanceof Date ? input.now : new Date()
  const bookings = safeArray(input.bookings)
  const tasks = safeArray(input.tasks)
  const issues = safeArray(input.issues)
  const supplies = safeArray(input.supplies)

  const activeStayBooking = bookings.find((booking) => isActiveStay(booking, now)) ?? null
  const nextCheckOutBooking = activeStayBooking
  const nextCheckInBooking = getLatestFutureBooking(bookings, now)
  const latestPastCheckout = getLatestPastCheckout(bookings, now)
  const turnoverSourceBooking = latestPastCheckout
  const primaryTask = getRelevantBookingTask(tasks, turnoverSourceBooking)
  const manualOpenTask = getOpenManualTask(tasks)
  const alertTask = getAlertTask(tasks, now)

  if (activeStayBooking) {
    const status: PropertyPageDayStatus = "HAS_GUESTS"
    return {
      status,
      label: buildLabels(status),
      reason: buildReasons(status),
      hasGuests: true,
      activeStayBooking,
      nextCheckOutBooking,
      nextCheckInBooking,
      turnoverSourceBooking: null,
      primaryTask,
      manualOpenTask,
      blockers: [],
      showReady: false,
      alertActive: Boolean(alertTask),
      alertTask,
    }
  }

  if (turnoverSourceBooking && !primaryTask) {
    const status: PropertyPageDayStatus = "PENDING_BOOKING_TASK_CREATION"
    return {
      status,
      label: buildLabels(status),
      reason: buildReasons(status),
      hasGuests: false,
      activeStayBooking: null,
      nextCheckOutBooking: null,
      nextCheckInBooking,
      turnoverSourceBooking,
      primaryTask: null,
      manualOpenTask,
      blockers: [
        {
          type: "TASK_NOT_EXECUTED",
          message: "Δεν έχει δημιουργηθεί ακόμη η εργασία του παραθύρου από την κράτηση.",
        },
      ],
      showReady: false,
      alertActive: Boolean(alertTask),
      alertTask,
    }
  }

  if (primaryTask) {
    const assignmentStatus = normalizeText(primaryTask.latestAssignmentStatus)
    const taskStatus = normalizeText(primaryTask.status)

    if (isRejectedAssignmentStatus(assignmentStatus)) {
      const status: PropertyPageDayStatus = "REJECTED"
      return {
        status,
        label: buildLabels(status),
        reason: buildReasons(status),
        hasGuests: false,
        activeStayBooking: null,
        nextCheckOutBooking: null,
        nextCheckInBooking,
        turnoverSourceBooking,
        primaryTask,
        manualOpenTask,
        blockers: [
          {
            type: "TASK_REJECTED",
            message: "Η εργασία δεν έγινε αποδεκτή από τον συνεργάτη.",
          },
        ],
        showReady: false,
        alertActive: Boolean(alertTask),
        alertTask,
      }
    }

    if (isWaitingAcceptanceAssignmentStatus(assignmentStatus) || taskStatus === "assigned" || taskStatus === "waiting_acceptance") {
      const status: PropertyPageDayStatus = "WAITING_ACCEPTANCE"
      return {
        status,
        label: buildLabels(status),
        reason: buildReasons(status),
        hasGuests: false,
        activeStayBooking: null,
        nextCheckOutBooking: null,
        nextCheckInBooking,
        turnoverSourceBooking,
        primaryTask,
        manualOpenTask,
        blockers: [],
        showReady: false,
        alertActive: Boolean(alertTask),
        alertTask,
      }
    }

    if (isAcceptedAssignmentStatus(assignmentStatus) && taskStatus !== "in_progress" && taskStatus !== "completed") {
      const status: PropertyPageDayStatus = "ACCEPTED"
      return {
        status,
        label: buildLabels(status),
        reason: buildReasons(status),
        hasGuests: false,
        activeStayBooking: null,
        nextCheckOutBooking: null,
        nextCheckInBooking,
        turnoverSourceBooking,
        primaryTask,
        manualOpenTask,
        blockers: [],
        showReady: false,
        alertActive: Boolean(alertTask),
        alertTask,
      }
    }

    if (taskStatus === "in_progress") {
      const status: PropertyPageDayStatus = "IN_PROGRESS"
      return {
        status,
        label: buildLabels(status),
        reason: buildReasons(status),
        hasGuests: false,
        activeStayBooking: null,
        nextCheckOutBooking: null,
        nextCheckInBooking,
        turnoverSourceBooking,
        primaryTask,
        manualOpenTask,
        blockers: [],
        showReady: false,
        alertActive: Boolean(alertTask),
        alertTask,
      }
    }

    if (taskStatus === "completed") {
      const blockers = buildBlockers({
        primaryTask,
        issues,
        supplies,
        blockingConditionCount: input.blockingConditionCount,
      })

      if (blockers.length === 0) {
        const status: PropertyPageDayStatus = "READY"
        return {
          status,
          label: buildLabels(status),
          reason: buildReasons(status),
          hasGuests: false,
          activeStayBooking: null,
          nextCheckOutBooking: null,
          nextCheckInBooking,
          turnoverSourceBooking,
          primaryTask,
          manualOpenTask,
          blockers: [],
          showReady: true,
          alertActive: Boolean(alertTask),
          alertTask,
        }
      }

      const status: PropertyPageDayStatus = "EXECUTED"
      return {
        status,
        label: buildLabels(status),
        reason: buildReasons(status),
        hasGuests: false,
        activeStayBooking: null,
        nextCheckOutBooking: null,
        nextCheckInBooking,
        turnoverSourceBooking,
        primaryTask,
        manualOpenTask,
        blockers,
        showReady: false,
        alertActive: Boolean(alertTask),
        alertTask,
      }
    }
  }

  const blockers = buildBlockers({
    primaryTask,
    issues,
    supplies,
    blockingConditionCount: input.blockingConditionCount,
  })

  if (blockers.length === 0) {
    const status: PropertyPageDayStatus = "READY"
    return {
      status,
      label: buildLabels(status),
      reason: buildReasons(status),
      hasGuests: false,
      activeStayBooking: null,
      nextCheckOutBooking: null,
      nextCheckInBooking,
      turnoverSourceBooking,
      primaryTask,
      manualOpenTask,
      blockers: [],
      showReady: true,
      alertActive: Boolean(alertTask),
      alertTask,
    }
  }

  const status: PropertyPageDayStatus = "EXECUTED"
  return {
    status,
    label: buildLabels(status),
    reason: buildReasons(status),
    hasGuests: false,
    activeStayBooking: null,
    nextCheckOutBooking: null,
    nextCheckInBooking,
    turnoverSourceBooking,
    primaryTask,
    manualOpenTask,
    blockers,
    showReady: false,
    alertActive: Boolean(alertTask),
    alertTask,
  }
}
