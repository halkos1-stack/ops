import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  buildTenantWhere,
  requireApiAppAccess,
} from "@/lib/route-access"
import {
  filterCanonicalOperationalTasks,
  getOperationalTaskValidity,
} from "@/lib/tasks/ops-task-contract"

function parseDateParam(value: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date
}

function buildDerivedNeedsMapping(input: {
  propertyId?: string | null
  property?: { id?: string | null } | null
}) {
  const hasPropertyId = !!input.propertyId
  const hasPropertyObject = !!input.property?.id

  return !(hasPropertyId || hasPropertyObject)
}

function normalizeTimeString(value?: string | null) {
  if (!value) return null
  const text = String(value).trim()
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(text)) return null
  return text
}

function combineDateAndTime(dateValue: Date, timeValue?: string | null) {
  const date = new Date(dateValue)
  const safeTime = normalizeTimeString(timeValue)

  if (safeTime) {
    const [hours, minutes] = safeTime.split(":").map(Number)
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  date.setHours(12, 0, 0, 0)
  return date
}

function formatDurationMinutes(totalMinutes: number) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0m"

  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60

  const parts: string[] = []

  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)

  return parts.join(" ")
}

function deriveTaskCoverageStatus(task?: {
  status?: string | null
  assignments?: Array<{
    status?: string | null
  }>
} | null) {
  if (!task) return "no_task"

  const normalizedTaskStatus = String(task.status || "").trim().toLowerCase()
  const latestAssignmentStatus = String(
    task.assignments?.[0]?.status || ""
  )
    .trim()
    .toLowerCase()

  if (normalizedTaskStatus === "completed") return "completed"

  if (
    latestAssignmentStatus === "accepted" ||
    normalizedTaskStatus === "accepted"
  ) {
    return "assigned"
  }

  if (
    latestAssignmentStatus === "assigned" ||
    latestAssignmentStatus === "waiting_acceptance" ||
    normalizedTaskStatus === "assigned" ||
    normalizedTaskStatus === "waiting_acceptance" ||
    normalizedTaskStatus === "in_progress"
  ) {
    return "assigned"
  }

  return "created"
}

export async function GET(req: NextRequest) {
  const access = await requireApiAppAccess()
  if (!access.ok) return access.response

  try {
    const url = new URL(req.url)

    const syncStatus = url.searchParams.get("syncStatus")
    const status = url.searchParams.get("status")
    const needsMapping = url.searchParams.get("needsMapping")
    const propertyId = url.searchParams.get("propertyId")
    const sourcePlatform = url.searchParams.get("sourcePlatform")
    const hasTasks = url.searchParams.get("hasTasks")
    const fromCheckOut = parseDateParam(url.searchParams.get("fromCheckOut"))
    const toCheckOut = parseDateParam(url.searchParams.get("toCheckOut"))

    const baseWhere = buildTenantWhere(access.auth, {
      ...(syncStatus ? { syncStatus: syncStatus as never } : {}),
      ...(status ? { status } : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(sourcePlatform ? { sourcePlatform } : {}),
      ...(hasTasks === "true" ? { tasks: { some: {} } } : {}),
      ...(hasTasks === "false" ? { tasks: { none: {} } } : {}),
      ...((fromCheckOut || toCheckOut)
        ? {
            checkOutDate: {
              ...(fromCheckOut ? { gte: fromCheckOut } : {}),
              ...(toCheckOut ? { lte: toCheckOut } : {}),
            },
          }
        : {}),
    })

    const where =
      needsMapping === "true"
        ? {
            ...baseWhere,
            propertyId: null,
          }
        : needsMapping === "false"
          ? {
              ...baseWhere,
              NOT: {
                propertyId: null,
              },
            }
          : baseWhere

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
        rawPayload: true,
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
            status: true,
            defaultPartner: {
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
        },
        tasks: {
          select: {
            id: true,
            bookingId: true,
            title: true,
            taskType: true,
            status: true,
            source: true,
            priority: true,
            scheduledDate: true,
            scheduledStartTime: true,
            scheduledEndTime: true,
            dueDate: true,
            alertEnabled: true,
            alertAt: true,
            createdAt: true,
            assignments: {
              select: {
                id: true,
                status: true,
                assignedAt: true,
                acceptedAt: true,
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
              take: 1,
            },
          },
          orderBy: {
            createdAt: "desc",
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
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
      orderBy: [{ checkOutDate: "asc" }, { createdAt: "desc" }],
    })

    const groupedByProperty = new Map<string, typeof bookings>()

    for (const booking of bookings) {
      if (!booking.propertyId) continue
      if (String(booking.status || "").toLowerCase() === "cancelled") continue

      const rows = groupedByProperty.get(booking.propertyId) || []
      rows.push(booking)
      groupedByProperty.set(booking.propertyId, rows)
    }

    for (const [, rows] of groupedByProperty.entries()) {
      rows.sort((a, b) => {
        const aCheckIn = combineDateAndTime(a.checkInDate, a.checkInTime).getTime()
        const bCheckIn = combineDateAndTime(b.checkInDate, b.checkInTime).getTime()
        return aCheckIn - bCheckIn
      })
    }

    const normalizedBookings = bookings.map((booking) => {
      const derivedNeedsMapping = buildDerivedNeedsMapping({
        propertyId: booking.propertyId,
        property: booking.property,
      })

      const windowStartAt = combineDateAndTime(
        booking.checkOutDate,
        booking.checkOutTime
      )

      let nextBooking:
        | {
            id: string
            checkInDate: Date
            checkInTime: string | null
            checkOutDate: Date
            checkOutTime: string | null
            externalBookingId: string
            sourcePlatform: string
          }
        | null = null

      if (booking.propertyId) {
        const samePropertyRows = groupedByProperty.get(booking.propertyId) || []

        nextBooking =
          samePropertyRows.find((candidate) => {
            if (candidate.id === booking.id) return false

            const candidateCheckInAt = combineDateAndTime(
              candidate.checkInDate,
              candidate.checkInTime
            )

            return candidateCheckInAt.getTime() > windowStartAt.getTime()
          }) || null
      }

      const windowEndAt = nextBooking
        ? combineDateAndTime(nextBooking.checkInDate, nextBooking.checkInTime)
        : null

      const windowDurationMinutes = windowEndAt
        ? Math.max(
            0,
            Math.floor((windowEndAt.getTime() - windowStartAt.getTime()) / 60000)
          )
        : null

      const canonicalTasks = filterCanonicalOperationalTasks(booking.tasks).map(
        (task) => ({
          ...task,
          opsValidity: getOperationalTaskValidity(task),
        })
      )
      const latestTask = canonicalTasks[0] || null
      const taskStatus = deriveTaskCoverageStatus(latestTask)

      return {
        id: booking.id,
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

        adults: booking.adults,
        children: booking.children,
        infants: booking.infants,

        status: booking.status,
        syncStatus: booking.syncStatus,
        needsMapping: derivedNeedsMapping,
        isManual: booking.isManual,
        notes: booking.notes,
        rawPayload: booking.rawPayload,
        sourceUpdatedAt: booking.sourceUpdatedAt,
        lastProcessedAt: booking.lastProcessedAt,
        lastError: booking.lastError,
        importedAt: booking.importedAt,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,

        property: booking.property
          ? {
              id: booking.property.id,
              code: booking.property.code,
              name: booking.property.name,
              address: booking.property.address,
              city: booking.property.city,
              region: booking.property.region,
              status: booking.property.status,
              defaultPartner: booking.property.defaultPartner,
            }
          : null,

        tasks: canonicalTasks,
        syncEvents: booking.syncEvents,

        hasTasks: canonicalTasks.length > 0,
        taskStatus,

        workWindow: {
          nextCheckInDate: nextBooking ? nextBooking.checkInDate.toISOString() : null,
          nextCheckInTime: nextBooking ? nextBooking.checkInTime : null,
          windowStart: windowStartAt.toISOString(),
          windowEnd: windowEndAt ? windowEndAt.toISOString() : null,
          windowDurationMinutes,
          windowDurationCompact: windowDurationMinutes
            ? formatDurationMinutes(windowDurationMinutes)
            : null,
        },

        latestTask,
      }
    })

    return NextResponse.json(normalizedBookings)
  } catch (error) {
    console.error("Bookings GET error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης κρατήσεων." },
      { status: 500 }
    )
  }
}
