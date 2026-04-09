/**
 * Shared UI helpers for readiness status display.
 * Client-safe (no Prisma). Used across dashboard pages.
 */

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
