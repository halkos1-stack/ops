/**
 * Shared UI helpers για εμφάνιση operational status και readiness status.
 * Client-safe (no Prisma). Χρησιμοποιείται σε όλες τις dashboard σελίδες.
 *
 * ΚΑΝΟΝΑΣ:
 * - Κανένα component δεν ερμηνεύει status string απευθείας.
 * - Όλα τα badges, labels, tooltips περνάνε από αυτό το module.
 * - Operational status (9 states) + Readiness status (4 states) = ενιαίο layer.
 */

// ─── Readiness status (conditions-based) ─────────────────────────────────────

export type UIReadinessStatus = "ready" | "borderline" | "not_ready" | "unknown"

/**
 * Normalizes any raw readiness string to a canonical lowercase UI status.
 * Accepts both lowercase API values and uppercase page-local variants.
 */
export function normalizeReadinessForUI(value: unknown): UIReadinessStatus {
  const s = String(value ?? "")
    .trim()
    .toLowerCase()
  if (s === "ready") return "ready"
  if (
    s === "borderline" ||
    s === "needs_attention" ||
    s === "needs-attention" ||
    s === "needs attention" ||
    s === "warning"
  )
    return "borderline"
  if (
    s === "not_ready" ||
    s === "not-ready" ||
    s === "not ready" ||
    s === "blocked" ||
    s === "critical"
  )
    return "not_ready"
  return "unknown"
}

/**
 * Returns Tailwind CSS badge classes for the given readiness status.
 */
export function getReadinessBadgeClasses(value: unknown): string {
  const status = normalizeReadinessForUI(value)
  if (status === "ready") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
  if (status === "borderline") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  if (status === "not_ready") return "bg-red-50 text-red-700 ring-1 ring-red-200"
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
}

/**
 * Returns a human-readable label for the given readiness status.
 */
export function getReadinessLabel(language: "el" | "en", value: unknown): string {
  const status = normalizeReadinessForUI(value)
  if (language === "en") {
    if (status === "ready") return "Ready"
    if (status === "borderline") return "Borderline"
    if (status === "not_ready") return "Not ready"
    return "Unknown"
  }
  if (status === "ready") return "Έτοιμο"
  if (status === "borderline") return "Οριακό"
  if (status === "not_ready") return "Μη έτοιμο"
  return "Άγνωστο"
}

/**
 * Returns a Badge tone string (used by Badge components that accept a tone prop).
 */
export function getReadinessTone(value: unknown): "green" | "amber" | "red" | "slate" {
  const status = normalizeReadinessForUI(value)
  if (status === "ready") return "green"
  if (status === "borderline") return "amber"
  if (status === "not_ready") return "red"
  return "slate"
}

// ─── Operational status (9-state canonical model) ────────────────────────────

export type UIOperationalStatus =
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
 * Normalizes any raw operational status string to a canonical UIOperationalStatus.
 * Handles backward compat (waiting_cleaning → task_unaccepted).
 */
export function normalizeOperationalForUI(value: unknown): UIOperationalStatus {
  const s = String(value ?? "").trim().toLowerCase()
  if (s === "occupied") return "occupied"
  if (s === "no_task_coverage") return "no_task_coverage"
  if (s === "task_unaccepted") return "task_unaccepted"
  if (s === "waiting_cleaning") return "task_unaccepted" // backward compat
  if (s === "task_in_progress") return "task_in_progress"
  if (s === "awaiting_proof") return "awaiting_proof"
  if (s === "ready") return "ready"
  if (s === "borderline" || s === "needs_attention") return "borderline"
  if (s === "not_ready") return "not_ready"
  return "unknown"
}

/**
 * Returns Tailwind CSS badge classes for the given operational status (9 states).
 * Single source of truth — χρησιμοποιείται σε ΟΛΕΣ τις σελίδες.
 */
export function getOperationalStatusBadgeClasses(value: unknown): string {
  const status = normalizeOperationalForUI(value)
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
 * Returns a human-readable label for the given operational status (9 states).
 * Bilingual (el/en). Single source of truth — αντικαθιστά τα local labels σε κάθε σελίδα.
 */
export function getOperationalStatusLabel(language: "el" | "en", value: unknown): string {
  const status = normalizeOperationalForUI(value)
  const labels: Record<UIOperationalStatus, { el: string; en: string }> = {
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
  return labels[status][language]
}

/**
 * Returns a short hover tooltip for the given operational status.
 * Απαντά: τι δείχνει, γιατί, τι πρέπει να γίνει.
 * Bilingual. Χρησιμοποιείται σε όλα τα status chips.
 */
export function getOperationalStatusTooltip(language: "el" | "en", value: unknown): string {
  const status = normalizeOperationalForUI(value)
  const tooltips: Record<UIOperationalStatus, { el: string; en: string }> = {
    occupied: {
      el: "Υπάρχει ενεργή διαμονή. Το παράθυρο προετοιμασίας για τον επόμενο επισκέπτη ξεκινά μετά την αναχώρηση.",
      en: "There is an active guest stay. The preparation window for the next guest starts after checkout.",
    },
    no_task_coverage: {
      el: "Η αναχώρηση καταγράφηκε αλλά δεν υπάρχει εργασία για την προετοιμασία. Δημιουργήστε εργασία για αυτό το ακίνητο.",
      en: "Checkout recorded but no task covers the preparation. Create a task for this property.",
    },
    task_unaccepted: {
      el: "Υπάρχει εργασία αλλά ο συνεργάτης δεν την έχει αποδεχτεί ακόμη. Εκκρεμεί επιβεβαίωση ανάληψης.",
      en: "A task exists but the partner has not yet accepted it. Acceptance confirmation is pending.",
    },
    task_in_progress: {
      el: "Η εργασία είναι σε εξέλιξη. Δεν απαιτούνται λίστες ή έχουν ήδη υποβληθεί. Αναμονή ολοκλήρωσης.",
      en: "The task is in progress. No checklists required or already submitted. Awaiting completion.",
    },
    awaiting_proof: {
      el: "Η εργασία εκτελείται αλλά οι απαιτούμενες λίστες (καθαριότητα / αναλώσιμα / βλάβες) δεν έχουν υποβληθεί ακόμη. Η ετοιμότητα δεν επιβεβαιώνεται χωρίς απόδειξη.",
      en: "Task is in progress but required checklists (cleaning / supplies / issues) have not yet been submitted. Readiness cannot be confirmed without proof.",
    },
    ready: {
      el: "Δεν υπάρχουν ενεργές συνθήκες που να εμποδίζουν την ετοιμότητα. Το ακίνητο είναι διαθέσιμο.",
      en: "No active conditions blocking readiness. The property is available for the next guest.",
    },
    borderline: {
      el: "Ενεργές συνθήκες διατηρούν το ακίνητο σε οριακή κατάσταση. Χρειάζεται προσοχή πριν την επόμενη άφιξη.",
      en: "Active conditions keep the property borderline. Attention needed before next arrival.",
    },
    not_ready: {
      el: "Ενεργές συνθήκες μπλοκάρουν την ετοιμότητα. Πρέπει να επιλυθούν πριν την επόμενη άφιξη.",
      en: "Active blocking conditions prevent readiness. Must be resolved before next arrival.",
    },
    unknown: {
      el: "Δεν υπάρχουν αρκετά δεδομένα για τον υπολογισμό της κατάστασης.",
      en: "Not enough data to determine the status.",
    },
  }
  return tooltips[status][language]
}
