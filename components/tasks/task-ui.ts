"use client"

export type TaskAlertShape = {
  status?: string | null
  alertEnabled?: boolean | null
  alertAt?: string | null
}

function normalizeTaskStatus(status: string | null | undefined) {
  return String(status || "").trim().toLowerCase()
}

export function isOpenTaskStatus(status: string | null | undefined) {
  return [
    "new",
    "pending",
    "assigned",
    "waiting_acceptance",
    "accepted",
    "in_progress",
  ].includes(normalizeTaskStatus(status))
}

export function isTaskAlertActive(task: TaskAlertShape) {
  if (!task.alertEnabled || !task.alertAt) return false
  if (!isOpenTaskStatus(task.status)) return false

  const alertDate = new Date(task.alertAt)
  if (Number.isNaN(alertDate.getTime())) return false

  return alertDate.getTime() <= Date.now()
}

export function getTaskSurfaceTone(task: TaskAlertShape) {
  if (isTaskAlertActive(task)) {
    return {
      card: "border-red-200 bg-red-50/80",
      subtleCard: "border-red-200 bg-red-50/70",
      accentBorder: "border-red-200/80",
      primaryAction:
        "bg-red-600 text-white hover:bg-red-700 border-red-600",
      secondaryAction:
        "border-red-200 bg-white text-red-700 hover:bg-red-50",
      alertBadge:
        "border border-red-200 bg-red-100 text-red-700",
    }
  }

  return {
    card: "border-slate-200 bg-white",
    subtleCard: "border-slate-200 bg-slate-50",
    accentBorder: "border-slate-200",
    primaryAction:
      "bg-slate-900 text-white hover:bg-slate-800 border-slate-900",
    secondaryAction:
      "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    alertBadge:
      "border border-slate-200 bg-slate-100 text-slate-700",
  }
}
