import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildTenantWhere, requireApiAppAccess } from "@/lib/route-access"

function parseDateParam(value: string | null) {
  if (!value) return null
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date
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
  const access = await requireApiAppAccess()
  if (!access.ok) return access.response

  try {
    const url = new URL(req.url)
    const syncStatus = String(url.searchParams.get("syncStatus") || "").trim().toUpperCase()
    const status = String(url.searchParams.get("status") || "").trim().toLowerCase()
    const needsMapping = String(url.searchParams.get("needsMapping") || "").trim().toLowerCase()
    const propertyId = String(url.searchParams.get("propertyId") || "").trim()
    const sourcePlatform = String(url.searchParams.get("sourcePlatform") || "").trim().toLowerCase()
    const fromCheckOut = parseDateParam(url.searchParams.get("fromCheckOut"))
    const toCheckOut = parseDateParam(url.searchParams.get("toCheckOut"))

    const where = buildTenantWhere(access.auth, {
      ...(syncStatus && syncStatus !== "ALL" ? { syncStatus: syncStatus as never } : {}),
      ...(status && status !== "all" ? { status } : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(sourcePlatform && sourcePlatform !== "all" ? { sourcePlatform } : {}),
      ...(needsMapping === "true" ? { needsMapping: true } : {}),
      ...(needsMapping === "false" ? { needsMapping: false } : {}),
      ...((fromCheckOut || toCheckOut)
        ? {
            checkOutDate: {
              ...(fromCheckOut ? { gte: startOfDay(fromCheckOut) } : {}),
              ...(toCheckOut ? { lte: endOfDay(toCheckOut) } : {}),
            },
          }
        : {}),
    })

    const bookings = await prisma.booking.findMany({
      where,
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
            status: true,
            readinessStatus: true,
          },
        },
        syncEvents: {
          select: {
            id: true,
            eventType: true,
            resultStatus: true,
            message: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: [{ checkOutDate: "asc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error("Bookings GET error:", error)
    return NextResponse.json({ error: "Αποτυχία φόρτωσης κρατήσεων." }, { status: 500 })
  }
}
