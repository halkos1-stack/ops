import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildTenantWhere, requireApiAppAccess } from "@/lib/route-access"
import { createBookingSyncEvents } from "@/lib/bookings/booking-logging"
import { reprocessBookingsForMapping } from "@/lib/bookings/booking-service"

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

export async function GET(req: NextRequest) {
  const access = await requireApiAppAccess()
  if (!access.ok) return access.response

  try {
    const url = new URL(req.url)
    const propertyId = url.searchParams.get("propertyId")
    const sourcePlatform = url.searchParams.get("sourcePlatform")
    const status = url.searchParams.get("status")

    const organizationId = access.auth.organizationId

    if (!access.auth.isSuperAdmin && !organizationId) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε organizationId." },
        { status: 400 }
      )
    }

    const mappings = await prisma.bookingPropertyMapping.findMany({
      where: buildTenantWhere(access.auth, {
        ...(propertyId ? { propertyId } : {}),
        ...(sourcePlatform ? { sourcePlatform } : {}),
        ...(status ? { status: status as never } : {}),
      }),
      include: {
        property: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            city: true,
            region: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(mappings)
  } catch (error) {
    console.error("Booking mappings GET error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης αντιστοιχίσεων." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const access = await requireApiAppAccess()
  if (!access.ok) return access.response

  try {
    const body = await req.json()

    const organizationId =
      access.auth.isSuperAdmin && body.organizationId
        ? String(body.organizationId)
        : access.auth.organizationId

    const propertyId = String(body.propertyId || "").trim()
    const sourcePlatform = String(body.sourcePlatform || "").trim().toLowerCase()
    const externalListingId = String(body.externalListingId || "").trim()

    if (!organizationId || !propertyId || !sourcePlatform || !externalListingId) {
      return NextResponse.json(
        {
          error:
            "Απαιτούνται organizationId, propertyId, sourcePlatform και externalListingId.",
        },
        { status: 400 }
      )
    }

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        organizationId,
      },
      select: {
        id: true,
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε ή δεν ανήκει στον οργανισμό." },
        { status: 404 }
      )
    }

    const mapping = await prisma.bookingPropertyMapping.upsert({
      where: {
        organizationId_sourcePlatform_externalListingId: {
          organizationId,
          sourcePlatform,
          externalListingId,
        },
      },
      update: {
        propertyId,
        externalListingName: toNullableString(body.externalListingName),
        notes: toNullableString(body.notes),
        status: "ACTIVE",
      },
      create: {
        organizationId,
        propertyId,
        sourcePlatform,
        externalListingId,
        externalListingName: toNullableString(body.externalListingName),
        notes: toNullableString(body.notes),
        status: "ACTIVE",
      },
      include: {
        property: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    })

    const reprocessResult = await reprocessBookingsForMapping({
      organizationId,
      sourcePlatform,
      externalListingId,
    })

    if (reprocessResult.bookingIds.length > 0) {
      await createBookingSyncEvents({
        events: reprocessResult.bookingIds.map((bookingId) => ({
          bookingId,
          organizationId,
          propertyId: mapping.propertyId,
          eventType: "BOOKING_MAPPING_APPLIED",
          sourcePlatform,
          message: `Εφαρμόστηκε αντιστοίχιση listing ${externalListingId} στο ακίνητο ${mapping.property.name}.`,
          activityAction: "BOOKING_MAPPING_APPLIED",
          activityMetadata: {
            propertyId: mapping.propertyId,
            propertyCode: mapping.property.code,
            externalListingId,
          },
        })),
      })
    }

    return NextResponse.json(
      {
        success: true,
        mapping,
        reprocessResult,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Booking mappings POST error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία αποθήκευσης αντιστοίχισης.",
      },
      { status: 500 }
    )
  }
}
