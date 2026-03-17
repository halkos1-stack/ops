export type NormalizedBookingInput = {
  organizationId: string
  sourcePlatform: string
  externalBookingId: string
  externalListingId?: string | null
  externalListingName?: string | null
  propertyId?: string | null
  guestName?: string | null
  guestPhone?: string | null
  guestEmail?: string | null
  checkInDate: Date
  checkOutDate: Date
  checkInTime?: string | null
  checkOutTime?: string | null
  adults?: number
  children?: number
  infants?: number
  status: string
  sourceUpdatedAt?: Date | null
  isManual?: boolean
  notes?: string | null
  rawPayload?: unknown
}

export const BOOKING_SYNC_STATUS = {
  PENDING_MATCH: "PENDING_MATCH",
  READY_FOR_ACTION: "READY_FOR_ACTION",
  CANCELLED: "CANCELLED",
  ERROR: "ERROR",
} as const

export function buildSyntheticExternalBookingId(input: {
  sourcePlatform: string
  externalListingId?: string | null
  checkInDate: Date
  checkOutDate: Date
  guestName?: string | null
}) {
  const listing = input.externalListingId || "no-listing"
  const guest = (input.guestName || "guest").trim().toLowerCase()
  const inDate = input.checkInDate.toISOString().slice(0, 10)
  const outDate = input.checkOutDate.toISOString().slice(0, 10)

  return `${input.sourcePlatform}:${listing}:${inDate}:${outDate}:${guest}`
}