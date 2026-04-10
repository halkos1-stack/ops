import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildTenantWhere, requireApiAppAccess } from "@/lib/route-access"
import { reprocessBookingsForMapping } from "@/lib/bookings/booking-service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccess()
  if (!access.ok) return access.response

  try {
    const { id } = await context.params

    const mapping = await prisma.bookingPropertyMapping.findFirst({
      where: buildTenantWhere(access.auth, { id }),
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
    })

    if (!mapping) {
      return NextResponse.json(
        { error: "Η αντιστοίχιση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(mapping)
  } catch (error) {
    console.error("Booking mapping GET by id error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης αντιστοίχισης." },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccess()
  if (!access.ok) return access.response

  try {
    const { id } = await context.params
    const body = await req.json()

    const current = await prisma.bookingPropertyMapping.findFirst({
      where: buildTenantWhere(access.auth, { id }),
    })

    if (!current) {
      return NextResponse.json(
        { error: "Η αντιστοίχιση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const propertyId = String(body.propertyId || current.propertyId).trim()
    const sourcePlatform = String(body.sourcePlatform || current.sourcePlatform)
      .trim()
      .toLowerCase()
    const externalListingId = String(
      body.externalListingId || current.externalListingId
    ).trim()
    const status =
      String(body.status || current.status).trim().toUpperCase() === "INACTIVE"
        ? "INACTIVE"
        : "ACTIVE"

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        organizationId: current.organizationId,
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

    const updated = await prisma.bookingPropertyMapping.update({
      where: {
        id: current.id,
      },
      data: {
        propertyId,
        sourcePlatform,
        externalListingId,
        externalListingName:
          toNullableString(body.externalListingName) ?? current.externalListingName,
        notes: toNullableString(body.notes) ?? current.notes,
        status,
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

    const reprocessResult =
      updated.status === "ACTIVE"
        ? await reprocessBookingsForMapping({
            organizationId: updated.organizationId,
            sourcePlatform: updated.sourcePlatform,
            externalListingId: updated.externalListingId,
          })
        : { total: 0, bookingIds: [] as string[] }

    return NextResponse.json({
      success: true,
      mapping: updated,
      reprocessResult,
    })
  } catch (error) {
    console.error("Booking mapping PATCH by id error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία ενημέρωσης αντιστοίχισης.",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccess()
  if (!access.ok) return access.response

  try {
    const { id } = await context.params

    const current = await prisma.bookingPropertyMapping.findFirst({
      where: buildTenantWhere(access.auth, { id }),
    })

    if (!current) {
      return NextResponse.json(
        { error: "Η αντιστοίχιση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const updated = await prisma.bookingPropertyMapping.update({
      where: {
        id: current.id,
      },
      data: {
        status: "INACTIVE",
      },
    })

    return NextResponse.json({
      success: true,
      mapping: updated,
    })
  } catch (error) {
    console.error("Booking mapping DELETE by id error:", error)

    return NextResponse.json(
      { error: "Αποτυχία απενεργοποίησης αντιστοίχισης." },
      { status: 500 }
    )
  }
}
