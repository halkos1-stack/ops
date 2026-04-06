type OpsTaskContractInput = {
  source?: unknown
  bookingId?: unknown
  booking?: {
    id?: unknown
  } | null
} | null | undefined

function toNullableId(value: unknown): string | null {
  if (value === undefined || value === null) return null

  const text = String(value).trim()
  return text === "" ? null : text
}

export function getOperationalTaskValidity(task: OpsTaskContractInput): {
  isCanonicalOperational: boolean
  reason: "missing_booking_link" | null
} {
  if (!task) {
    return {
      isCanonicalOperational: false,
      reason: "missing_booking_link",
    }
  }

  const source = String(task.source ?? "").trim().toLowerCase()
  const bookingId = toNullableId(task.bookingId ?? task.booking?.id)

  if (source === "booking" && bookingId === null) {
    return {
      isCanonicalOperational: false,
      reason: "missing_booking_link",
    }
  }

  return {
    isCanonicalOperational: true,
    reason: null,
  }
}

export function isCanonicalOperationalTask(task: OpsTaskContractInput): boolean {
  return getOperationalTaskValidity(task).isCanonicalOperational
}

export function filterCanonicalOperationalTasks<T extends OpsTaskContractInput>(
  tasks: T[] | null | undefined
): T[] {
  if (!Array.isArray(tasks)) return []
  return tasks.filter((task): task is T => isCanonicalOperationalTask(task))
}
