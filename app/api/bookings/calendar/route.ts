import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildTenantWhere, requireApiAppAccess } from "@/lib/route-access"

type BookingTaskRow = {
  id: string
  title: string
  status: string
  taskType: string
  priority: string
  scheduledDate: Date
  scheduledStartTime: string | null
  scheduledEndTime: string | null
}

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

function deriveTaskStatus(tasks: BookingTaskRow[]) {
  const firstTask = tasks[0] || null
  if (!firstTask) return "no_task"

  const normalized = String(firstTask.status || "").trim().toLowerCase()

  if (normalized === "completed") return "completed"
  if (normalized === "accepted" || normalized === "in_progress") return "assigned"
  if (normalized === "assigned" || normalized === "pending") return "created"

  return "created"
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
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            taskType: true,
            priority: true,
            scheduledDate: true,
            scheduledStartTime: true,
            scheduledEndTime: true,
          },
          orderBy: [{ scheduledDate: "desc" }, { createdAt: "desc" }],
          take: 3,
        },
      },
      orderBy: [{ checkInDate: "asc" }, { checkOutDate: "asc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(
      bookings.map((booking) => ({
        id: booking.id,
        propertyId: booking.propertyId,
        sourcePlatform: booking.sourcePlatform,
        externalBookingId: booking.externalBookingId,
        externalListingId: booking.externalListingId,
        externalListingName: booking.externalListingName,
        externalPropertyAddress: booking.externalPropertyAddress,
        externalPropertyCity: booking.externalPropertyCity,
        externalPropertyRegion: booking.externalPropertyRegion,
        externalPropertyPostalCode: booking.externalPropertyPostalCode,
        externalPropertyCountry: booking.externalPropertyCountry,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        guestEmail: booking.guestEmail,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        checkInTime: booking.checkInTime,
        checkOutTime: booking.checkOutTime,
        status: booking.status,
        syncStatus: booking.syncStatus,
        needsMapping: booking.needsMapping,
        importedAt: booking.importedAt,
        lastProcessedAt: booking.lastProcessedAt,
        lastError: booking.lastError,
        notes: booking.notes,
        taskStatus: deriveTaskStatus(booking.tasks as BookingTaskRow[]),
        property: booking.property,
        tasks: booking.tasks,
      }))
    )
  } catch (error) {
    console.error("GET /api/bookings/calendar error:", error)

    return NextResponse.json(
      {
        error: "╬Σ╧Α╬┐╧Ε╧Ζ╧Θ╬ψ╬▒ ╧Η╧Ν╧Β╧Ε╧Κ╧Δ╬╖╧Γ ╬╖╬╝╬╡╧Β╬┐╬╗╬┐╬│╬ψ╬┐╧Ζ ╬║╧Β╬▒╧Ε╬χ╧Δ╬╡╧Κ╬╜.",
      },
      { status: 500 }
    )
  }
}
