export type UIPropertyPageDayStatus =
  | "HAS_GUESTS"
  | "PENDING_BOOKING_TASK_CREATION"
  | "WAITING_ACCEPTANCE"
  | "ACCEPTED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "EXECUTED"
  | "READY"

export function normalizePropertyPageDayStatusForUI(value: unknown): UIPropertyPageDayStatus {
  const s = String(value ?? "").trim().toUpperCase()

  if (s === "HAS_GUESTS") return "HAS_GUESTS"
  if (s === "PENDING_BOOKING_TASK_CREATION") return "PENDING_BOOKING_TASK_CREATION"
  if (s === "WAITING_ACCEPTANCE") return "WAITING_ACCEPTANCE"
  if (s === "ACCEPTED") return "ACCEPTED"
  if (s === "REJECTED") return "REJECTED"
  if (s === "IN_PROGRESS") return "IN_PROGRESS"
  if (s === "EXECUTED") return "EXECUTED"
  return "READY"
}

export function getPropertyPageDayStatusBadgeClasses(value: unknown): string {
  const status = normalizePropertyPageDayStatusForUI(value)

  switch (status) {
    case "HAS_GUESTS":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
    case "PENDING_BOOKING_TASK_CREATION":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    case "WAITING_ACCEPTANCE":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "ACCEPTED":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
    case "REJECTED":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    case "IN_PROGRESS":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
    case "EXECUTED":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
    case "READY":
    default:
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
  }
}

export function getPropertyPageDayStatusLabel(language: "el" | "en", value: unknown): string {
  const status = normalizePropertyPageDayStatusForUI(value)

  const labels: Record<UIPropertyPageDayStatus, { el: string; en: string }> = {
    HAS_GUESTS: { el: "Έχει φιλοξενούμενους", en: "Has guests" },
    PENDING_BOOKING_TASK_CREATION: {
      el: "Εκκρεμεί δημιουργία εργασίας από την κράτηση",
      en: "Pending task creation from booking",
    },
    WAITING_ACCEPTANCE: { el: "Σε αναμονή αποδοχής", en: "Waiting acceptance" },
    ACCEPTED: { el: "Η εργασία έγινε αποδεκτή", en: "Task accepted" },
    REJECTED: { el: "Η εργασία δεν έγινε αποδεκτή", en: "Task rejected" },
    IN_PROGRESS: { el: "Η εργασία εκτελείται", en: "Task in progress" },
    EXECUTED: { el: "Η εργασία εκτελέστηκε", en: "Task executed" },
    READY: { el: "Έτοιμο", en: "Ready" },
  }

  return labels[status][language]
}

export function getPropertyPageDayStatusTooltip(language: "el" | "en", value: unknown): string {
  const status = normalizePropertyPageDayStatusForUI(value)

  const tooltips: Record<UIPropertyPageDayStatus, { el: string; en: string }> = {
    HAS_GUESTS: {
      el: "Υπάρχει ενεργή διαμονή και η σελίδα δείχνει παράλληλα την τυχόν ανοικτή εργασία.",
      en: "There is an active stay and the page also shows any open task.",
    },
    PENDING_BOOKING_TASK_CREATION: {
      el: "Το checkout προς το επόμενο check-in δεν καλύπτεται ακόμη από booking-driven εργασία.",
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
      el: "Η εργασία δεν έγινε αποδεκτή και απαιτείται νέα ανάθεση ή άλλη ενέργεια.",
      en: "The task was not accepted and needs reassignment or another action.",
    },
    IN_PROGRESS: {
      el: "Η εργασία έχει ξεκινήσει και βρίσκεται σε εκτέλεση.",
      en: "The task has started and is currently being executed.",
    },
    EXECUTED: {
      el: "Η εργασία ολοκληρώθηκε και ελέγχονται οι blockers πριν το ακίνητο φανεί έτοιμο.",
      en: "The task completed and blockers are being checked before the property can show ready.",
    },
    READY: {
      el: "Δεν υπάρχουν ενεργά εμπόδια που να μπλοκάρουν το ακίνητο.",
      en: "There are no active blockers preventing the property from being ready.",
    },
  }

  return tooltips[status][language]
}
