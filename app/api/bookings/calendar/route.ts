import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildTenantWhere, requireApiAppAccess } from "@/lib/route-access"

function parseDateParam(value: string | null) {
  if (!value) return null
  const parsed = new Date(`${value}T12:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

export async function GET(req: NextRequest) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const { searchParams } = new URL(req.url)

    const fromDate = parseDateParam(searchParams.get("fromDate"))
    const toDate = parseDateParam(searchParams.get("toDate"))
    const propertyId = String(searchParams.get("propertyId") || "").trim()
    const sourcePlatform = String(searchParams.get("sourcePlatform") || "").trim().toLowerCase()
    const status = String(searchParams.get("status") || "").trim().toLowerCase()
    const syncStatus = String(searchParams.get("syncStatus") || "").trim().toUpperCase()
    const needsMapping = String(searchParams.get("needsMapping") || "").trim().toLowerCase()

    const where = buildTenantWhere(access.auth, {
      ...(propertyId ? { propertyId } : {}),
      ...(sourcePlatform && sourcePlatform !== "all" ? { sourcePlatform } : {}),
      ...(status && status !== "all" ? { status } : {}),
      ...(syncStatus && syncStatus !== "ALL" ? { syncStatus: syncStatus as never } : {}),
      ...(needsMapping === "true" ? { needsMapping: true } : {}),
      ...(needsMapping === "false" ? { needsMapping: false } : {}),
      ...((fromDate || toDate)
        ? {
            AND: [
              ...(fromDate
                ? [
                    {
                      checkOutDate: {
                        gte: startOfDay(fromDate),
                      },
                    },
                  ]
                : []),
              ...(toDate
                ? [
                    {
                      checkInDate: {
                        lte: endOfDay(toDate),
                      },
                    },
                  ]
                : []),
            ],
          }
        : {}),
    })

    const bookings = await prisma.booking.findMany({
      where,
      select: {
        id: true,
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
        status: true,
        syncStatus: true,
        needsMapping: true,
        importedAt: true,
        lastProcessedAt: true,
        lastError: true,
        notes: true,
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
            status: true,
            readinessStatus: true,
            nextCheckInAt: true,
          },
        },
      },
      orderBy: [{ checkInDate: "asc" }, { checkOutDate: "asc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error("GET /api/bookings/calendar error:", error)

    return NextResponse.json(
      {
        error: "Αποτυχία φόρτωσης ημερολογίου κρατήσεων.",
      },
      { status: 500 }
    )
  }
}
