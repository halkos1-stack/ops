/**
 * Property Operational Status — canonical property truth module
 *
 * Αυτό το module ορίζει την ΠΡΑΓΜΑΤΙΚΗ ΕΙΚΟΝΑ ακινήτου βάσει σειράς προτεραιότητας:
 *
 *   A. ACTIVE STAY / OCCUPANCY
 *      occupied         : υπάρχει ενεργή διαμονή τώρα
 *
 *   B. TURNOVER WINDOW (≤ 3 ημέρες μετά checkout)
 *      no_task_coverage : checkout πέρασε, δεν υπάρχει εργασία → όχι έτοιμο
 *      task_unaccepted  : εργασία υπάρχει αλλά δεν αποδεκτεί → όχι έτοιμο
 *      task_in_progress : εργασία αποδεκτή / σε εξέλιξη → όχι έτοιμο
 *      awaiting_proof   : εκκρεμούν απαιτούμενες λίστες → όχι έτοιμο
 *
 *   C. CONDITIONS (fallback όταν δεν υπάρχει ενεργό turnover window)
 *      ready            : καθαρές conditions
 *      borderline       : conditions χωρίς blocking
 *      not_ready        : blocking conditions
 *      unknown          : ανεπαρκή δεδομένα
 *
 * ΚΑΝΟΝΑΣ: Turnover window pending → derivedReadinessStatus = "not_ready"
 *          Το readiness δεν επιστρέφει "ready" όταν υπάρχει εκκρεμής εκτέλεση.
 *
 * Δεν αλλάζει τη λογική του compute-property-readiness.ts (conditions analyzer).
 * Παράγει derivedReadinessStatus ως canonical contract για όλα τα layers.
 */

export type PropertyOperationalStatus =
  | "occupied"
  | "no_task_coverage"
  | "task_unaccepted"
  | "task_in_progress"
  | "awaiting_proof"
  | "ready"
  | "borderline"
  | "not_ready"
  | "unknown"

/**
 * Ετοιμότητα ως canonical output της επιχειρησιακής κατάστασης.
 * Turnover pending → πάντα "not_ready".
 * Occupied + conditions ready → "ready".
 * Conditions → αντίστοιχα.
 */
export type DerivedReadinessStatus = "ready" | "borderline" | "not_ready" | "unknown"

export type OperationalStatusBooking = {
  id: string
  status: string | null
  checkInDate: string | Date | null
  checkOutDate: string | Date | null
  guestName?: string | null
}

export type OperationalStatusTask = {
  id: string
  title: string
  taskType: string
  status: string
  scheduledDate: string | Date | null
  sendCleaningChecklist: boolean
  sendSuppliesChecklist: boolean
  sendIssuesChecklist: boolean
  alertEnabled: boolean
  alertAt: string | Date | null
  completedAt: string | Date | null
  bookingId?: string | null
  latestAssignmentStatus?: string | null
  checklistRunStatus?: string | null
  supplyRunStatus?: string | null
  issueRunStatus?: string | null
}

export type PropertyOperationalStatusInput = {
  now?: Date
  /** Τρέχον readiness status από canonical conditions */
  readinessStatus: string | null | undefined
  bookings: OperationalStatusBooking[]
  tasks: OperationalStatusTask[]
}

export type OperationalRelevantTask = {
  id: string
  title: string
  status: string
  scheduledDate: Date | null
  latestAssignmentStatus: string | null
  checklistRunStatus: string | null
  supplyRunStatus: string | null
  issueRunStatus: string | null
}

export type PropertyOperationalStatusResult = {
  operationalStatus: PropertyOperationalStatus
  label: { el: string; en: string }
  reason: { el: string; en: string }
  /** Hover/tooltip: πλήρης εξήγηση για το UI */
  explanation: { el: string; en: string }
  /**
   * Canonical readiness output — ενοποιεί operational context + conditions.
   * Χρησιμοποιείται στο API route για να παράγει το readinessSummary.status.
   * ΚΑΝΟΝΑΣ: turnover pending → πάντα "not_ready", ανεξάρτητα conditions.
   */
  derivedReadinessStatus: DerivedReadinessStatus
  alertActive: boolean
  alertTask: {
    id: string
    title: string
    alertAt: Date
  } | null
  activeBooking: {
    id: string
    guestName: string | null
    checkInDate: Date
    checkOutDate: Date
  } | null
  /** Η εργασία που οδηγεί την τρέχουσα κατάσταση (για turnover window states) */
  relevantTask: OperationalRelevantTask | null
  /** Backward compat alias — ίδιο με relevantTask όταν είναι καθαριστική */
  pendingCleaningTask: {
    id: string
    title: string
    status: string
    scheduledDate: Date | null
  } | null
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function toDateOrNull(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isActiveBookingStatus(status: string | null | undefined): boolean {
  const s = String(status ?? "").trim().toLowerCase()
  return s !== "cancelled" && s !== "canceled"
}

function isCompletedOrCancelledTaskStatus(status: string): boolean {
  const s = String(status ?? "").trim().toLowerCase()
  return s === "completed" || s === "cancelled" || s === "canceled"
}

function isUnacceptedTaskStatus(status: string): boolean {
  const s = String(status ?? "").trim().toLowerCase()
  return ["new", "pending", "assigned", "waiting_acceptance"].includes(s)
}

function isAcceptedTaskStatus(status: string): boolean {
  const s = String(status ?? "").trim().toLowerCase()
  return s === "accepted" || s === "in_progress"
}

function isChecklistSubmittedStatus(status: string | null | undefined): boolean {
  const s = String(status ?? "").trim().toLowerCase()
  return s === "submitted" || s === "completed"
}

function hasAnyListRequired(task: OperationalStatusTask): boolean {
  return task.sendCleaningChecklist || task.sendSuppliesChecklist || task.sendIssuesChecklist
}

function hasAllRequiredListsSubmitted(task: OperationalStatusTask): boolean {
  const cleaningOk = !task.sendCleaningChecklist || isChecklistSubmittedStatus(task.checklistRunStatus)
  const suppliesOk = !task.sendSuppliesChecklist || isChecklistSubmittedStatus(task.supplyRunStatus)
  const issuesOk = !task.sendIssuesChecklist || isChecklistSubmittedStatus(task.issueRunStatus)
  return cleaningOk && suppliesOk && issuesOk
}

function isCleaningOrTurnoverTask(task: OperationalStatusTask): boolean {
  const type = String(task.taskType ?? "").trim().toLowerCase()
  return type === "cleaning" || task.sendCleaningChecklist === true
}

function normalizeReadinessToConditionsStatus(
  readinessStatus: string | null | undefined
): DerivedReadinessStatus {
  const s = String(readinessStatus ?? "").trim().toLowerCase()
  if (s === "ready") return "ready"
  if (s === "borderline" || s === "needs_attention") return "borderline"
  if (s === "not_ready") return "not_ready"
  return "unknown"
}

/**
 * Canonical derivation: παράγει DerivedReadinessStatus από operational context.
 *
 * ΚΑΝΟΝΑΣ:
 * - Turnover pending (no_task_coverage / task_unaccepted / task_in_progress / awaiting_proof)
 *   → "not_ready" ανεξάρτητα conditions.
 *   Αιτιολόγηση: η απόδειξη ετοιμότητας δεν έχει επιστραφεί ακόμα.
 * - occupied → conditions-based (property ετοιμάστηκε πριν check-in, conditions είναι η αλήθεια)
 * - ready / borderline / not_ready / unknown → απευθείας από conditions fallback
 */
function deriveReadinessStatus(
  operationalStatus: PropertyOperationalStatus,
  inputReadinessStatus: string | null | undefined
): DerivedReadinessStatus {
  if (
    operationalStatus === "no_task_coverage" ||
    operationalStatus === "task_unaccepted" ||
    operationalStatus === "task_in_progress" ||
    operationalStatus === "awaiting_proof"
  ) {
    return "not_ready"
  }

  // occupied / ready / borderline / not_ready / unknown → conditions-based
  return normalizeReadinessToConditionsStatus(inputReadinessStatus !== null && inputReadinessStatus !== undefined
    ? inputReadinessStatus
    : operationalStatus === "ready" ? "ready"
    : operationalStatus === "borderline" ? "borderline"
    : operationalStatus === "not_ready" ? "not_ready"
    : "unknown")
}

function toRelevantTask(task: OperationalStatusTask): OperationalRelevantTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    scheduledDate: toDateOrNull(task.scheduledDate),
    latestAssignmentStatus: task.latestAssignmentStatus ?? null,
    checklistRunStatus: task.checklistRunStatus ?? null,
    supplyRunStatus: task.supplyRunStatus ?? null,
    issueRunStatus: task.issueRunStatus ?? null,
  }
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const LABELS: Record<PropertyOperationalStatus, { el: string; en: string }> = {
  occupied: { el: "Έχει φιλοξενούμενους", en: "Occupied" },
  no_task_coverage: { el: "Εκκρεμεί δημιουργία εργασίας", en: "No task coverage" },
  task_unaccepted: { el: "Εκκρεμεί αποδοχή συνεργάτη", en: "Awaiting partner acceptance" },
  task_in_progress: { el: "Εργασία σε εξέλιξη", en: "Task in progress" },
  awaiting_proof: { el: "Αναμονή υποβολής λιστών", en: "Awaiting proof submission" },
  ready: { el: "Έτοιμο", en: "Ready" },
  borderline: { el: "Οριακό", en: "Borderline" },
  not_ready: { el: "Μη έτοιμο", en: "Not ready" },
  unknown: { el: "Άγνωστη κατάσταση", en: "Unknown status" },
}

// ─── Short reasons (για header / badge subtitle) ─────────────────────────────

const REASONS: Record<PropertyOperationalStatus, { el: string; en: string }> = {
  occupied: {
    el: "Υπάρχει ενεργή διαμονή αυτή τη στιγμή.",
    en: "There is an active guest stay at this time.",
  },
  no_task_coverage: {
    el: "Η αναχώρηση έχει καταγραφεί αλλά δεν υπάρχει εργασία που να καλύπτει την προετοιμασία.",
    en: "Checkout has been recorded but no task covers the preparation window.",
  },
  task_unaccepted: {
    el: "Υπάρχει εργασία αλλά ο συνεργάτης δεν την έχει αποδεχτεί ακόμη.",
    en: "A task exists but the partner has not yet accepted it.",
  },
  task_in_progress: {
    el: "Η εργασία έχει αναληφθεί και βρίσκεται σε εξέλιξη.",
    en: "The task has been accepted and is in progress.",
  },
  awaiting_proof: {
    el: "Εκκρεμεί υποβολή απαιτούμενων λιστών από τον συνεργάτη.",
    en: "Required checklists have not been submitted by the partner yet.",
  },
  ready: {
    el: "Δεν υπάρχουν ενεργές συνθήκες που να επηρεάζουν την ετοιμότητα.",
    en: "No active conditions affecting readiness.",
  },
  borderline: {
    el: "Υπάρχουν ενεργές συνθήκες που κρατούν το ακίνητο σε οριακή κατάσταση.",
    en: "Active conditions keep the property in a borderline state.",
  },
  not_ready: {
    el: "Υπάρχουν ενεργές συνθήκες που μπλοκάρουν την ετοιμότητα.",
    en: "Active blocking conditions prevent readiness.",
  },
  unknown: {
    el: "Δεν υπάρχουν αρκετά δεδομένα για τον υπολογισμό κατάστασης.",
    en: "Not enough data to determine operational status.",
  },
}

// ─── Full tooltip explanations (Τι; Γιατί; Τι πρέπει να γίνει;) ──────────────

const EXPLANATIONS: Record<PropertyOperationalStatus, { el: string; en: string }> = {
  occupied: {
    el: "Το ακίνητο βρίσκεται σε φάση ενεργής διαμονής. Το επιχειρησιακό παράθυρο προετοιμασίας για τον επόμενο επισκέπτη ξεκινά μετά την αναχώρηση. Η ετοιμότητα αξιολογείται στο επόμενο turnover.",
    en: "The property is in an active guest stay. The preparation window for the next guest starts after checkout. Readiness is assessed in the next turnover window.",
  },
  no_task_coverage: {
    el: "Υπάρχει πρόσφατη αναχώρηση αλλά δεν έχει δημιουργηθεί εργασία για να καλύψει την προετοιμασία. Το ακίνητο δεν μπορεί να θεωρηθεί έτοιμο χωρίς επαληθευμένη εκτέλεση. Απαιτείται δημιουργία εργασίας.",
    en: "There is a recent checkout but no task has been created to cover the preparation. The property cannot be considered ready without verified execution. A task must be created.",
  },
  task_unaccepted: {
    el: "Υπάρχει εργασία για αυτό το turnover αλλά ο συνεργάτης δεν την έχει αποδεχτεί ακόμη. Δεν έχει ξεκινήσει η εκτέλεση. Το ακίνητο δεν είναι έτοιμο μέχρι να επιβεβαιωθεί η ανάληψη.",
    en: "A task exists for this turnover but the partner has not yet accepted it. Execution has not started. The property is not ready until the assignment is confirmed.",
  },
  task_in_progress: {
    el: "Η εργασία έχει αναληφθεί από τον συνεργάτη και βρίσκεται σε εξέλιξη. Δεν απαιτούνται λίστες ή έχουν ήδη υποβληθεί. Η ετοιμότητα εξαρτάται από την ολοκλήρωση και τα αποτελέσματα.",
    en: "The task has been accepted by the partner and is in progress. No checklists are required or they have already been submitted. Readiness depends on completion and findings.",
  },
  awaiting_proof: {
    el: "Η εργασία βρίσκεται σε εξέλιξη αλλά απαιτούμενες λίστες (καθαριότητα / αναλώσιμα / βλάβες) δεν έχουν ακόμη υποβληθεί. Η ετοιμότητα του ακινήτου δεν μπορεί να επιβεβαιωθεί πριν επιστρέψει η απόδειξη εκτέλεσης.",
    en: "The task is in progress but required checklists (cleaning / supplies / issues) have not yet been submitted. Property readiness cannot be confirmed until execution proof is returned.",
  },
  ready: {
    el: "Δεν υπάρχουν ενεργές συνθήκες που να εμποδίζουν την ετοιμότητα. Το ακίνητο είναι διαθέσιμο για τον επόμενο επισκέπτη.",
    en: "No active conditions are blocking readiness. The property is available for the next guest.",
  },
  borderline: {
    el: "Υπάρχουν ενεργές συνθήκες που δεν μπλοκάρουν πλήρως αλλά διατηρούν την κατάσταση σε οριακό επίπεδο. Απαιτείται προσοχή πριν την επόμενη άφιξη.",
    en: "Active conditions exist that do not fully block readiness but keep the state borderline. Attention is required before the next arrival.",
  },
  not_ready: {
    el: "Υπάρχουν ενεργές συνθήκες που μπλοκάρουν την ετοιμότητα. Το ακίνητο δεν είναι διαθέσιμο για τον επόμενο επισκέπτη μέχρι να επιλυθούν.",
    en: "Active blocking conditions prevent readiness. The property is not available for the next guest until these are resolved.",
  },
  unknown: {
    el: "Δεν υπάρχουν αρκετά δεδομένα για να υπολογιστεί η επιχειρησιακή κατάσταση. Ελέγξτε αν υπάρχουν κρατήσεις, εργασίες ή ιστορικό conditions.",
    en: "Not enough data to determine operational status. Check if there are bookings, tasks, or condition history.",
  },
}

// ─── Alert finder ─────────────────────────────────────────────────────────────

function findAlertTask(
  tasks: OperationalStatusTask[],
  now: Date
): PropertyOperationalStatusResult["alertTask"] {
  const alerting = tasks.find((task) => {
    if (!task.alertEnabled) return false
    if (isCompletedOrCancelledTaskStatus(task.status)) return false
    const alertAt = toDateOrNull(task.alertAt)
    if (!alertAt) return false
    return alertAt <= now
  })

  if (!alerting) return null
  const alertAt = toDateOrNull(alerting.alertAt)!
  return { id: alerting.id, title: alerting.title, alertAt }
}

// ─── Main function ─────────────────────────────────────────────────────────────

export function computePropertyOperationalStatus(
  input: PropertyOperationalStatusInput
): PropertyOperationalStatusResult {
  const now = input.now instanceof Date ? input.now : new Date()
  const bookings = Array.isArray(input.bookings) ? input.bookings : []
  const tasks = Array.isArray(input.tasks) ? input.tasks : []

  // ─── 1. OCCUPIED: ενεργή διαμονή τώρα ────────────────────────────────────
  const occupiedBooking = bookings.find((booking) => {
    if (!isActiveBookingStatus(booking.status)) return false
    const checkIn = toDateOrNull(booking.checkInDate)
    const checkOut = toDateOrNull(booking.checkOutDate)
    if (!checkIn || !checkOut) return false
    return now >= checkIn && now < checkOut
  })

  if (occupiedBooking) {
    const checkIn = toDateOrNull(occupiedBooking.checkInDate)!
    const checkOut = toDateOrNull(occupiedBooking.checkOutDate)!
    const alertTask = findAlertTask(tasks, now)

    return {
      operationalStatus: "occupied",
      label: LABELS.occupied,
      reason: REASONS.occupied,
      explanation: EXPLANATIONS.occupied,
      derivedReadinessStatus: deriveReadinessStatus("occupied", input.readinessStatus),
      alertActive: alertTask !== null,
      alertTask,
      activeBooking: {
        id: occupiedBooking.id,
        guestName: occupiedBooking.guestName ?? null,
        checkInDate: checkIn,
        checkOutDate: checkOut,
      },
      relevantTask: null,
      pendingCleaningTask: null,
    }
  }

  // ─── 2. TURNOVER WINDOW: πρόσφατο checkout (≤ 3 ημέρες) ─────────────────
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

  const recentCheckout = bookings.find((booking) => {
    if (!isActiveBookingStatus(booking.status)) return false
    const checkOut = toDateOrNull(booking.checkOutDate)
    if (!checkOut) return false
    return checkOut <= now && checkOut >= threeDaysAgo
  })

  if (recentCheckout) {
    // Βρίσκουμε την πιο σχετική εργασία για το τρέχον turnover
    const relevantTaskRaw = tasks.find((task) => {
      if (isCompletedOrCancelledTaskStatus(task.status)) return false
      if (!isCleaningOrTurnoverTask(task)) return false
      if (task.bookingId && task.bookingId !== recentCheckout.id) return false
      const scheduledDate = toDateOrNull(task.scheduledDate)
      const checkOut = toDateOrNull(recentCheckout.checkOutDate)
      if (scheduledDate && checkOut && scheduledDate < checkOut) return false
      return true
    })

    const alertTask = findAlertTask(tasks, now)

    // 2a. Δεν υπάρχει εργασία → no_task_coverage
    if (!relevantTaskRaw) {
      return {
        operationalStatus: "no_task_coverage",
        label: LABELS.no_task_coverage,
        reason: REASONS.no_task_coverage,
        explanation: EXPLANATIONS.no_task_coverage,
        derivedReadinessStatus: "not_ready",
        alertActive: alertTask !== null,
        alertTask,
        activeBooking: null,
        relevantTask: null,
        pendingCleaningTask: null,
      }
    }

    const relevant = toRelevantTask(relevantTaskRaw)

    // 2b. Εργασία υπάρχει αλλά δεν έχει αποδεχτεί ο συνεργάτης → task_unaccepted
    if (isUnacceptedTaskStatus(relevantTaskRaw.status)) {
      return {
        operationalStatus: "task_unaccepted",
        label: LABELS.task_unaccepted,
        reason: REASONS.task_unaccepted,
        explanation: EXPLANATIONS.task_unaccepted,
        derivedReadinessStatus: "not_ready",
        alertActive: alertTask !== null,
        alertTask,
        activeBooking: null,
        relevantTask: relevant,
        pendingCleaningTask: {
          id: relevantTaskRaw.id,
          title: relevantTaskRaw.title,
          status: relevantTaskRaw.status,
          scheduledDate: toDateOrNull(relevantTaskRaw.scheduledDate),
        },
      }
    }

    // 2c. Εργασία αποδεκτή / in_progress
    if (isAcceptedTaskStatus(relevantTaskRaw.status)) {
      // Εκκρεμούν απαιτούμενες λίστες → awaiting_proof
      if (hasAnyListRequired(relevantTaskRaw) && !hasAllRequiredListsSubmitted(relevantTaskRaw)) {
        return {
          operationalStatus: "awaiting_proof",
          label: LABELS.awaiting_proof,
          reason: REASONS.awaiting_proof,
          explanation: EXPLANATIONS.awaiting_proof,
          derivedReadinessStatus: "not_ready",
          alertActive: alertTask !== null,
          alertTask,
          activeBooking: null,
          relevantTask: relevant,
          pendingCleaningTask: {
            id: relevantTaskRaw.id,
            title: relevantTaskRaw.title,
            status: relevantTaskRaw.status,
            scheduledDate: toDateOrNull(relevantTaskRaw.scheduledDate),
          },
        }
      }

      // Δεν απαιτούνται λίστες ή έχουν υποβληθεί → task_in_progress
      return {
        operationalStatus: "task_in_progress",
        label: LABELS.task_in_progress,
        reason: REASONS.task_in_progress,
        explanation: EXPLANATIONS.task_in_progress,
        derivedReadinessStatus: "not_ready",
        alertActive: alertTask !== null,
        alertTask,
        activeBooking: null,
        relevantTask: relevant,
        pendingCleaningTask: {
          id: relevantTaskRaw.id,
          title: relevantTaskRaw.title,
          status: relevantTaskRaw.status,
          scheduledDate: toDateOrNull(relevantTaskRaw.scheduledDate),
        },
      }
    }

    // 2d. Εργασία ολοκληρώθηκε → fall through to conditions
    // (οι conditions δημιουργήθηκαν από τις λίστες, αυτές καθορίζουν το τελικό status)
  }

  // ─── 3. Alert check (overlay) ────────────────────────────────────────────
  const alertTask = findAlertTask(tasks, now)

  // ─── 4. FALLBACK: readiness από conditions ───────────────────────────────
  const conditionsStatus = normalizeReadinessToConditionsStatus(input.readinessStatus)
  // Map conditions status to operational status enum values
  const operationalStatus: PropertyOperationalStatus =
    conditionsStatus === "ready" ? "ready"
    : conditionsStatus === "borderline" ? "borderline"
    : conditionsStatus === "not_ready" ? "not_ready"
    : "unknown"

  return {
    operationalStatus,
    label: LABELS[operationalStatus],
    reason: REASONS[operationalStatus],
    explanation: EXPLANATIONS[operationalStatus],
    derivedReadinessStatus: conditionsStatus,
    alertActive: alertTask !== null,
    alertTask,
    activeBooking: null,
    relevantTask: null,
    pendingCleaningTask: null,
  }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

/**
 * Επιστρέφει Tailwind CSS classes για το operational status badge.
 */
export function getOperationalStatusTone(status: PropertyOperationalStatus): string {
  switch (status) {
    case "occupied":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
    case "no_task_coverage":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    case "task_unaccepted":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "task_in_progress":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
    case "awaiting_proof":
      return "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
    case "ready":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "borderline":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "not_ready":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    case "unknown":
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

/**
 * Normalizes a raw string value from the API into a canonical PropertyOperationalStatus.
 */
export function normalizeOperationalStatus(value: unknown): PropertyOperationalStatus {
  const s = String(value ?? "").trim().toLowerCase()
  if (s === "occupied") return "occupied"
  if (s === "no_task_coverage") return "no_task_coverage"
  if (s === "task_unaccepted") return "task_unaccepted"
  if (s === "task_in_progress") return "task_in_progress"
  if (s === "awaiting_proof") return "awaiting_proof"
  if (s === "ready") return "ready"
  if (s === "borderline" || s === "needs_attention") return "borderline"
  if (s === "not_ready") return "not_ready"
  // Backward compat: παλιά τιμή
  if (s === "waiting_cleaning") return "task_unaccepted"
  return "unknown"
}

/**
 * Επιστρέφει αν η κατάσταση υποδηλώνει ότι η εκτέλεση είναι εκκρεμής
 * (δηλ. turnover window ενεργό και εκτέλεση δεν έχει αποδειχθεί).
 * Σε αυτές τις καταστάσεις: derivedReadinessStatus = "not_ready" πάντα.
 */
export function isOperationallyPending(status: PropertyOperationalStatus): boolean {
  return ["no_task_coverage", "task_unaccepted", "task_in_progress", "awaiting_proof"].includes(
    status
  )
}
