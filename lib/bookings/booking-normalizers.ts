import {
  buildSyntheticExternalBookingId,
  NormalizedBookingInput,
} from "@/lib/bookings/booking-types"

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toStringValue(value: unknown, fallback = "") {
  if (value === undefined || value === null) return fallback
  return String(value).trim()
}

function toNumberValue(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function toDateValue(value: unknown, fieldName: string) {
  const text = String(value || "").trim()
  const date = new Date(text)

  if (!text || Number.isNaN(date.getTime())) {
    throw new Error(`Μη έγκυρη ημερομηνία για το πεδίο ${fieldName}.`)
  }

  return date
}

export function normalizeBookingInput(
  body: Record<string, unknown>,
  organizationId: string
): NormalizedBookingInput {
  const sourcePlatform = toStringValue(body.sourcePlatform, "manual").toLowerCase()
  const checkInDate = toDateValue(body.checkInDate, "checkInDate")
  const checkOutDate = toDateValue(body.checkOutDate, "checkOutDate")

  if (checkOutDate.getTime() < checkInDate.getTime()) {
    throw new Error("Η ημερομηνία check-out δεν μπορεί να είναι πριν από το check-in.")
  }

  const externalBookingId =
    toNullableString(body.externalBookingId) ||
    buildSyntheticExternalBookingId({
      sourcePlatform,
      externalListingId: toNullableString(body.externalListingId),
      checkInDate,
      checkOutDate,
      guestName: toNullableString(body.guestName),
    })

  return {
    organizationId,
    sourcePlatform,
    externalBookingId,
    externalListingId: toNullableString(body.externalListingId),
    externalListingName: toNullableString(body.externalListingName),

    externalPropertyAddress: toNullableString(body.externalPropertyAddress),
    externalPropertyCity: toNullableString(body.externalPropertyCity),
    externalPropertyRegion: toNullableString(body.externalPropertyRegion),
    externalPropertyPostalCode: toNullableString(body.externalPropertyPostalCode),
    externalPropertyCountry: toNullableString(body.externalPropertyCountry),

    propertyId: toNullableString(body.propertyId),
    guestName: toNullableString(body.guestName),
    guestPhone: toNullableString(body.guestPhone),
    guestEmail: toNullableString(body.guestEmail),
    checkInDate,
    checkOutDate,
    checkInTime: toNullableString(body.checkInTime),
    checkOutTime: toNullableString(body.checkOutTime),
    adults: toNumberValue(body.adults, 1),
    children: toNumberValue(body.children, 0),
    infants: toNumberValue(body.infants, 0),
    status: toStringValue(body.status, "confirmed").toLowerCase(),
    sourceUpdatedAt: body.sourceUpdatedAt
      ? toDateValue(body.sourceUpdatedAt, "sourceUpdatedAt")
      : null,
    isManual: Boolean(body.isManual ?? sourcePlatform === "manual"),
    notes: toNullableString(body.notes),
    rawPayload: body.rawPayload ?? body,
  }
}

export function normalizeCancelInput(
  body: Record<string, unknown>,
  organizationId: string
) {
  const sourcePlatform = toStringValue(body.sourcePlatform).toLowerCase()
  const externalBookingId = toStringValue(body.externalBookingId)

  if (!sourcePlatform || !externalBookingId) {
    throw new Error("Για ακύρωση απαιτούνται sourcePlatform και externalBookingId.")
  }

  return {
    organizationId,
    sourcePlatform,
    externalBookingId,
    sourceUpdatedAt: body.sourceUpdatedAt
      ? toDateValue(body.sourceUpdatedAt, "sourceUpdatedAt")
      : null,
    rawPayload: body.rawPayload ?? body,
  }
}