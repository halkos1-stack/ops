import { NextRequest, NextResponse } from "next/server"
import { Prisma, BookingSyncStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccessWithDevBypass } from "@/lib/dev-api-access"
import { createBookingSyncEvent } from "@/lib/bookings/booking-logging"
import { resolveBookingPropertyMatch } from "@/lib/bookings/booking-matching"
import { reprocessBookingById } from "@/lib/bookings/booking-service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function hasOwn(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key)
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toDateValue(value: unknown, fieldName: string) {
  const text = String(value || "").trim()
  const date = new Date(text)

  if (!text || Number.isNaN(date.getTime())) {
    throw new Error(`Μη έγκυρη ημερομηνία για το πεδίο ${fieldName}.`)
  }

  return date
}

function toNullableDateValue(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") return null
  return toDateValue(value, fieldName)
}

function toNumberValue(value: unknown, fallback: number) {
  if (value === undefined || value === null || value === "") return fallback
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function buildBookingWhere(
  auth: {
    systemRole?: "SUPER_ADMIN" | "USER"
    organizationId?: string | null
  },
  bookingId: string
): Prisma.BookingWhereInput {
  if (auth.systemRole === "SUPER_ADMIN") {
    return { id: bookingId }
  }

  if (!auth.organizationId) {
    return {
      id: "__no_results__",
    }
  }

  return {
    id: bookingId,
    organizationId: auth.organizationId,
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccessWithDevBypass(req)
  if (!access.ok) return access.response

  try {
    const { id } = await context.params

    const booking = await prisma.booking.findFirst({
      where: buildBookingWhere(access.auth, id),
      include: {
        property: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            city: true,
            region: true,
            postalCode: true,
            country: true,
            type: true,
            status: true,
          },
        },
        tasks: {
          include: {
            property: {
              select: {
                id: true,
                code: true,
                name: true,
                address: true,
              },
            },
            assignments: {
              select: {
                id: true,
                status: true,
                assignedAt: true,
                acceptedAt: true,
                completedAt: true,
                partner: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    email: true,
                    specialty: true,
                    status: true,
                  },
                },
              },
              orderBy: {
                assignedAt: "desc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        syncEvents: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: "Η κράτηση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error("Booking GET by id error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης κράτησης." },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccessWithDevBypass(req)
  if (!access.ok) return access.response

  try {
    const { id } = await context.params
    const body = (await req.json()) as Record<string, unknown>

    const current = await prisma.booking.findFirst({
      where: buildBookingWhere(access.auth, id),
    })

    if (!current) {
      return NextResponse.json(
        { error: "Η κράτηση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const sourcePlatform = hasOwn(body, "sourcePlatform")
      ? String(body.sourcePlatform || "").trim().toLowerCase()
      : current.sourcePlatform

    const externalBookingId = hasOwn(body, "externalBookingId")
      ? String(body.externalBookingId || "").trim()
      : current.externalBookingId

    const externalListingId = hasOwn(body, "externalListingId")
      ? toNullableString(body.externalListingId)
      : current.externalListingId

    const propertyIdCandidate = hasOwn(body, "propertyId")
      ? toNullableString(body.propertyId)
      : current.propertyId

    const status = hasOwn(body, "status")
      ? String(body.status || "").trim().toLowerCase()
      : current.status

    const match = await resolveBookingPropertyMatch({
      organizationId: current.organizationId,
      sourcePlatform,
      propertyId: propertyIdCandidate,
      externalListingId,
    })

    const syncStatus: BookingSyncStatus =
      status === "cancelled"
        ? BookingSyncStatus.CANCELLED
        : match.matched
          ? BookingSyncStatus.READY_FOR_ACTION
          : BookingSyncStatus.PENDING_MATCH

    const rawPayloadValue: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined =
  hasOwn(body, "rawPayload")
    ? body.rawPayload === null
      ? Prisma.JsonNull
      : body.rawPayload === undefined
        ? undefined
        : (body.rawPayload as Prisma.InputJsonValue)
    : undefined

    const updated = await prisma.booking.update({
      where: {
        id: current.id,
      },
      data: {
        sourcePlatform,
        externalBookingId,
        externalListingId,
        externalListingName: hasOwn(body, "externalListingName")
          ? toNullableString(body.externalListingName)
          : current.externalListingName,
        propertyId: match.propertyId,
        guestName: hasOwn(body, "guestName")
          ? toNullableString(body.guestName)
          : current.guestName,
        guestPhone: hasOwn(body, "guestPhone")
          ? toNullableString(body.guestPhone)
          : current.guestPhone,
        guestEmail: hasOwn(body, "guestEmail")
          ? toNullableString(body.guestEmail)
          : current.guestEmail,
        checkInDate: hasOwn(body, "checkInDate")
          ? toDateValue(body.checkInDate, "checkInDate")
          : current.checkInDate,
        checkOutDate: hasOwn(body, "checkOutDate")
          ? toDateValue(body.checkOutDate, "checkOutDate")
          : current.checkOutDate,
        checkInTime: hasOwn(body, "checkInTime")
          ? toNullableString(body.checkInTime)
          : current.checkInTime,
        checkOutTime: hasOwn(body, "checkOutTime")
          ? toNullableString(body.checkOutTime)
          : current.checkOutTime,
        adults: hasOwn(body, "adults")
          ? toNumberValue(body.adults, current.adults)
          : current.adults,
        children: hasOwn(body, "children")
          ? toNumberValue(body.children, current.children)
          : current.children,
        infants: hasOwn(body, "infants")
          ? toNumberValue(body.infants, current.infants)
          : current.infants,
        status,
        syncStatus,
        needsMapping: !match.matched,
        sourceUpdatedAt: hasOwn(body, "sourceUpdatedAt")
          ? toNullableDateValue(body.sourceUpdatedAt, "sourceUpdatedAt")
          : current.sourceUpdatedAt,
        rawPayload: rawPayloadValue,
        lastProcessedAt: new Date(),
        lastError: null,
        notes: hasOwn(body, "notes")
          ? toNullableString(body.notes)
          : current.notes,
      },
    })

    await createBookingSyncEvent({
      bookingId: updated.id,
      organizationId: updated.organizationId,
      eventType: "BOOKING_UPDATED_MANUALLY",
      sourcePlatform: updated.sourcePlatform,
      resultStatus: updated.syncStatus,
      message: "Η κράτηση ενημερώθηκε χειροκίνητα από τον διαχειριστή.",
      payload: body,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Booking PATCH by id error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία ενημέρωσης κράτησης.",
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccessWithDevBypass(req)
  if (!access.ok) return access.response

  try {
    const { id } = await context.params
    const body = (await req.json()) as Record<string, unknown>
    const action = String(body.action || "").trim().toLowerCase()

    if (action !== "reprocess") {
      return NextResponse.json(
        { error: "Μη υποστηριζόμενη ενέργεια." },
        { status: 400 }
      )
    }

    const booking = await prisma.booking.findFirst({
      where: buildBookingWhere(access.auth, id),
      select: { id: true },
    })

    if (!booking) {
      return NextResponse.json(
        { error: "Η κράτηση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const result = await reprocessBookingById(booking.id)

    return NextResponse.json({
      success: true,
      booking: result.booking,
    })
  } catch (error) {
    console.error("Booking POST by id error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία επανεπεξεργασίας κράτησης.",
      },
      { status: 500 }
    )
  }
}