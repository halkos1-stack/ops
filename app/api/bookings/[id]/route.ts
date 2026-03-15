import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { id } = await context.params

    const booking = await prisma.booking.findUnique({
      where: { id },
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
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: "Η κράτηση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, booking.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την κράτηση." },
        { status: 403 }
      )
    }

    return NextResponse.json({ booking })
  } catch (error) {
    console.error("GET /api/bookings/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης κράτησης." },
      { status: 500 }
    )
  }
}