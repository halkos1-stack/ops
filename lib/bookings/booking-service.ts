import { BookingSyncStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { createBookingSyncEvent } from "@/lib/bookings/booking-logging"
import { resolveBookingPropertyMatch } from "@/lib/bookings/booking-matching"
import {
  BOOKING_SYNC_STATUS,
  NormalizedBookingInput,
} from "@/lib/bookings/booking-types"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"

async function refreshAffectedProperties(propertyIds: (string | null | undefined)[]) {
  const unique = [...new Set(propertyIds.filter((id): id is string => Boolean(id)))]
  for (const propertyId of unique) {
    await refreshPropertyReadiness(propertyId)
  }
}

function mapSyncStatus(params: {
  cancelled: boolean
  matched: boolean
}): BookingSyncStatus {
  if (params.cancelled) return "CANCELLED"
  if (params.matched) return "READY_FOR_ACTION"
  return "PENDING_MATCH"
}

function toPrismaNullableJson(
  value: unknown
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined
  if (value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}

function buildPropertyRelationInput(propertyId: string | null | undefined) {
  if (propertyId) {
    return {
      connect: { id: propertyId },
    }
  }

  return {
    disconnect: true,
  }
}

function getReprocessCandidatePropertyId(params: {
  isManual: boolean
  propertyId: string | null
}) {
  return params.isManual ? params.propertyId : null
}

export async function upsertBookingFromNormalizedInput(
  input: NormalizedBookingInput
) {
  const match = await resolveBookingPropertyMatch({
    organizationId: input.organizationId,
    sourcePlatform: input.sourcePlatform,
    propertyId: input.propertyId,
    externalListingId: input.externalListingId,
  })

  const existingBooking = await prisma.booking.findFirst({
    where: {
      organizationId: input.organizationId,
      sourcePlatform: input.sourcePlatform,
      externalBookingId: input.externalBookingId,
    },
    select: {
      id: true,
      importedAt: true,
      propertyId: true,
    },
  })

  const syncStatus = mapSyncStatus({
    cancelled: input.status === "cancelled",
    matched: match.matched,
  })

  const importedAt = existingBooking?.importedAt ?? new Date()

  const commonData = {
    externalListingId: input.externalListingId ?? null,
    externalListingName: input.externalListingName ?? null,

    externalPropertyAddress: input.externalPropertyAddress ?? null,
    externalPropertyCity: input.externalPropertyCity ?? null,
    externalPropertyRegion: input.externalPropertyRegion ?? null,
    externalPropertyPostalCode: input.externalPropertyPostalCode ?? null,
    externalPropertyCountry: input.externalPropertyCountry ?? null,

    guestName: input.guestName ?? null,
    guestPhone: input.guestPhone ?? null,
    guestEmail: input.guestEmail ?? null,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    checkInTime: input.checkInTime ?? null,
    checkOutTime: input.checkOutTime ?? null,
    adults: input.adults ?? 1,
    children: input.children ?? 0,
    infants: input.infants ?? 0,
    status: input.status,
    syncStatus,
    needsMapping: !match.matched,
    isManual: Boolean(input.isManual),
    sourceUpdatedAt: input.sourceUpdatedAt ?? null,
    rawPayload: toPrismaNullableJson(input.rawPayload) ?? Prisma.JsonNull,
    lastProcessedAt: new Date(),
    lastError: null,
    notes: input.notes ?? null,
  }

  const booking = existingBooking
    ? await prisma.booking.update({
        where: {
          id: existingBooking.id,
        },
        data: {
          ...commonData,
          property: buildPropertyRelationInput(match.propertyId),
        },
      })
    : await prisma.booking.create({
        data: {
          organization: {
            connect: {
              id: input.organizationId,
            },
          },
          ...(match.propertyId
            ? {
                property: {
                  connect: {
                    id: match.propertyId,
                  },
                },
              }
            : {}),
          sourcePlatform: input.sourcePlatform,
          externalBookingId: input.externalBookingId,
          importedAt,
          ...commonData,
        },
      })

  await createBookingSyncEvent({
    bookingId: booking.id,
    organizationId: booking.organizationId,
    eventType: existingBooking ? "BOOKING_UPDATED" : "BOOKING_IMPORTED",
    sourcePlatform: booking.sourcePlatform,
    resultStatus: booking.syncStatus,
    message: match.matched
      ? "Η κράτηση αντιστοιχίστηκε με ακίνητο και είναι έτοιμη για ενέργεια διαχειριστή."
      : "Η κράτηση εισήχθη αλλά χρειάζεται αντιστοίχιση με ακίνητο.",
    payload: input.rawPayload,
  })

  // Refresh readiness για όλα τα affected properties:
  // - το νέο propertyId (αν η κράτηση αντιστοιχίστηκε)
  // - το παλιό propertyId (αν η κράτηση αποσυνδέθηκε ή μετακινήθηκε)
  await refreshAffectedProperties([match.propertyId, existingBooking?.propertyId])

  return {
    booking,
  }
}

export async function cancelBookingByExternalKey(params: {
  organizationId: string
  sourcePlatform: string
  externalBookingId: string
  sourceUpdatedAt?: Date | null
  rawPayload?: unknown
}) {
  const booking = await prisma.booking.findFirst({
    where: {
      organizationId: params.organizationId,
      sourcePlatform: params.sourcePlatform,
      externalBookingId: params.externalBookingId,
    },
  })

  if (!booking) {
    throw new Error("Δεν βρέθηκε κράτηση για ακύρωση.")
  }

  const updated = await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      status: "cancelled",
      syncStatus: BOOKING_SYNC_STATUS.CANCELLED,
      sourceUpdatedAt: params.sourceUpdatedAt ?? booking.sourceUpdatedAt,
      rawPayload:
        params.rawPayload === undefined
          ? toPrismaNullableJson(booking.rawPayload) ?? Prisma.JsonNull
          : toPrismaNullableJson(params.rawPayload),
      lastProcessedAt: new Date(),
      lastError: null,
    },
  })

  await createBookingSyncEvent({
    bookingId: updated.id,
    organizationId: updated.organizationId,
    eventType: "BOOKING_CANCELLED",
    sourcePlatform: updated.sourcePlatform,
    resultStatus: updated.syncStatus,
    message: "Η κράτηση σημειώθηκε ως ακυρωμένη.",
    payload: params.rawPayload,
  })

  // Η ακύρωση κράτησης αλλάζει το readiness anchor — hard-fail intentionally.
  await refreshAffectedProperties([booking.propertyId])

  return {
    booking: updated,
  }
}

export async function reprocessBookingById(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
  })

  if (!booking) {
    throw new Error("Η κράτηση δεν βρέθηκε.")
  }

  const match = await resolveBookingPropertyMatch({
    organizationId: booking.organizationId,
    sourcePlatform: booking.sourcePlatform,
    propertyId: getReprocessCandidatePropertyId({
      isManual: Boolean(booking.isManual),
      propertyId: booking.propertyId,
    }),
    externalListingId: booking.externalListingId,
  })

  const syncStatus = mapSyncStatus({
    cancelled: booking.status === "cancelled",
    matched: match.matched,
  })

  const updated = await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      property: buildPropertyRelationInput(match.propertyId),
      needsMapping: !match.matched,
      syncStatus,
      lastProcessedAt: new Date(),
      lastError: null,
    },
  })

  await createBookingSyncEvent({
    bookingId: updated.id,
    organizationId: updated.organizationId,
    eventType: "BOOKING_REPROCESSED",
    sourcePlatform: updated.sourcePlatform,
    resultStatus: updated.syncStatus,
    message: match.matched
      ? "Η κράτηση ξαναεπεξεργάστηκε και είναι έτοιμη για ενέργεια διαχειριστή."
      : "Η κράτηση ξαναεπεξεργάστηκε αλλά παραμένει χωρίς αντιστοίχιση.",
    payload: updated.rawPayload ?? undefined,
  })

  // Refresh παλιού και νέου property (αν η αντιστοίχιση άλλαξε).
  await refreshAffectedProperties([booking.propertyId, match.propertyId])

  return {
    booking: updated,
  }
}

export async function reprocessBookingsForMapping(params: {
  organizationId: string
  sourcePlatform: string
  externalListingId: string
}) {
  const bookings = await prisma.booking.findMany({
    where: {
      organizationId: params.organizationId,
      sourcePlatform: params.sourcePlatform,
      externalListingId: params.externalListingId,
    },
    select: {
      id: true,
    },
  })

  const results: string[] = []

  for (const booking of bookings) {
    const result = await reprocessBookingById(booking.id)
    results.push(result.booking.id)
  }

  return {
    total: results.length,
    bookingIds: results,
  }
}
