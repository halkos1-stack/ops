type DateLike = string | Date | null | undefined

type BookingLike = {
  id?: string | null
  propertyId?: string | null
  checkInDate?: DateLike
  checkInTime?: string | null
  checkOutDate?: DateLike
  checkOutTime?: string | null
}

type TaskLike = {
  id?: string | null
  propertyId?: string | null
  bookingId?: string | null
  booking?: BookingLike | null
}

export type TaskWorkWindow = {
  checkOutDate: string | null
  checkOutTime: string | null
  nextCheckInDate: string | null
  nextCheckInTime: string | null
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text || null
}

function toLocalDateKey(value: Date) {
  if (Number.isNaN(value.getTime())) return null

  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function normalizeDateOnly(value: DateLike) {
  if (!value) return null
  if (value instanceof Date) {
    return toLocalDateKey(value)
  }

  const text = String(value).trim()
  if (!text) return null

  const dateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`
  }

  const parsed = new Date(text)
  return toLocalDateKey(parsed)
}

function normalizeTime(value?: string | null) {
  const text = String(value || "").trim()
  if (!text) return null

  const normalized = text.slice(0, 5)
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized) ? normalized : null
}

function toComparableDateTime(dateValue: DateLike, timeValue?: string | null) {
  const date = normalizeDateOnly(dateValue)
  if (!date) return null

  const time = normalizeTime(timeValue) || "00:00"
  const comparable = new Date(`${date}T${time}:00`)

  return Number.isNaN(comparable.getTime()) ? null : comparable
}

function groupBookingsByProperty(bookings: BookingLike[]) {
  const grouped = new Map<string, BookingLike[]>()

  for (const booking of bookings) {
    const propertyId = toNullableString(booking.propertyId) || "__default__"
    const rows = grouped.get(propertyId) || []
    rows.push(booking)
    grouped.set(propertyId, rows)
  }

  for (const rows of grouped.values()) {
    rows.sort((a, b) => {
      const aDate = toComparableDateTime(a.checkInDate, a.checkInTime)
      const bDate = toComparableDateTime(b.checkInDate, b.checkInTime)
      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1
      return aDate.getTime() - bDate.getTime()
    })
  }

  return grouped
}

export function buildTaskWorkWindowMap(
  tasks: TaskLike[],
  bookings: BookingLike[]
): Record<string, TaskWorkWindow> {
  const bookingById = new Map<string, BookingLike>()

  for (const booking of bookings) {
    const bookingId = toNullableString(booking.id)
    if (bookingId) bookingById.set(bookingId, booking)
  }

  const groupedBookings = groupBookingsByProperty(bookings)
  const result: Record<string, TaskWorkWindow> = {}

  for (const task of tasks) {
    const taskId = toNullableString(task.id)
    if (!taskId) continue

    const bookingId = toNullableString(task.bookingId) || toNullableString(task.booking?.id)
    const currentBooking =
      (bookingId ? bookingById.get(bookingId) : null) || task.booking || null

    const propertyId =
      toNullableString(task.propertyId) ||
      toNullableString(currentBooking?.propertyId) ||
      "__default__"

    const propertyBookings =
      groupedBookings.get(propertyId) || groupedBookings.get("__default__") || []

    const currentCheckOutDate = normalizeDateOnly(currentBooking?.checkOutDate)
    const currentCheckOutTime = normalizeTime(currentBooking?.checkOutTime)
    const currentBoundary = toComparableDateTime(
      currentBooking?.checkOutDate,
      currentBooking?.checkOutTime
    )

    const nextBooking =
      currentBoundary
        ? propertyBookings.find((booking) => {
            const nextBookingId = toNullableString(booking.id)
            if (bookingId && nextBookingId === bookingId) return false

            const nextCheckIn = toComparableDateTime(
              booking.checkInDate,
              booking.checkInTime
            )

            return Boolean(nextCheckIn && nextCheckIn.getTime() > currentBoundary.getTime())
          }) || null
        : null

    result[taskId] = {
      checkOutDate: currentCheckOutDate,
      checkOutTime: currentCheckOutTime,
      nextCheckInDate: normalizeDateOnly(nextBooking?.checkInDate),
      nextCheckInTime: normalizeTime(nextBooking?.checkInTime),
    }
  }

  return result
}
