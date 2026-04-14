import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccess()
  if (!access.ok) return access.response

  try {
    const { id } = await context.params

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        propertyId: true,
        sourcePlatform: true,
        externalBookingId: true,
        externalListingId: true,
        externalListingName: true,
        externalPropertyAddress: true,
        externalPropertyCity: true,
        externalPropertyRegion: true,
        externalPropertyPostalCode: true,
        externalPropertyCountry: true,
        guestName: true,
        guestPhone: true,
        guestEmail: true,
        checkInDate: true,
        checkOutDate: true,
        checkInTime: true,
        checkOutTime: true,
        adults: true,
        children: true,
        infants: true,
        status: true,
        syncStatus: true,
        needsMapping: true,
        isManual: true,
        sourceUpdatedAt: true,
        lastProcessedAt: true,
        lastError: true,
        notes: true,
        importedAt: true,
        createdAt: true,
        updatedAt: true,
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
            readinessStatus: true,
          },
        },
        syncEvents: {
          select: {
            id: true,
            eventType: true,
            sourcePlatform: true,
            resultStatus: true,
            message: true,
            payload: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Η κράτηση δεν βρέθηκε." }, { status: 404 })
    }

    if (!canAccessOrganization(access.auth, booking.organizationId)) {
      return NextResponse.json({ error: "Δεν έχεις πρόσβαση σε αυτή την κράτηση." }, { status: 403 })
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error("Booking detail GET error:", error)
    return NextResponse.json({ error: "Αποτυχία φόρτωσης κράτησης." }, { status: 500 })
  }
}
