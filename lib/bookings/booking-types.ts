export const BOOKING_SYNC_STATUS = {
  PENDING_MATCH: "PENDING_MATCH",
  READY_FOR_ACTION: "READY_FOR_ACTION",
  CANCELLED: "CANCELLED",
  ERROR: "ERROR",
} as const

export type BookingSyncStatusValue =
  (typeof BOOKING_SYNC_STATUS)[keyof typeof BOOKING_SYNC_STATUS]

export type NormalizedBookingInput = {
  organizationId: string
  sourcePlatform: string
  externalBookingId: string
  externalListingId?: string | null
  externalListingName?: string | null

  externalPropertyAddress?: string | null
  externalPropertyCity?: string | null
  externalPropertyRegion?: string | null
  externalPropertyPostalCode?: string | null
  externalPropertyCountry?: string | null

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

export function buildSyntheticExternalBookingId(params: {
  sourcePlatform: string
  externalListingId?: string | null
  checkInDate: Date
  checkOutDate: Date
  guestName?: string | null
}) {
  const sourcePlatform = String(params.sourcePlatform || "manual")
    .trim()
    .toLowerCase()

  const listingId = String(params.externalListingId || "no-listing")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()

  const checkInDate = params.checkInDate.toISOString().slice(0, 10)
  const checkOutDate = params.checkOutDate.toISOString().slice(0, 10)

  const guestName = String(params.guestName || "guest")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")

  return [
    sourcePlatform,
    listingId,
    checkInDate,
    checkOutDate,
    guestName || "guest",
  ].join("__")
}