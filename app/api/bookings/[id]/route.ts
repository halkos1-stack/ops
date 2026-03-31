import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccessWithDevBypass } from "@/lib/dev-api-access"
import { canAccessOrganization } from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type BookingBaseRecord = {
  id: string
  organizationId: string
  propertyId: string | null
  sourcePlatform: string
  externalBookingId: string
  externalListingId: string | null
  externalListingName: string | null
  externalPropertyAddress: string | null
  externalPropertyCity: string | null
  externalPropertyRegion: string | null
  externalPropertyPostalCode: string | null
  externalPropertyCountry: string | null
  guestName: string | null
  guestPhone: string | null
  guestEmail: string | null
  checkInDate: Date
  checkOutDate: Date
  checkInTime: string | null
  checkOutTime: string | null
  adults: number
  children: number
  infants: number
  status: string
  syncStatus: string
  needsMapping: boolean
  isManual: boolean
  sourceUpdatedAt: Date | null
  rawPayload: unknown
  lastProcessedAt: Date | null
  lastError: string | null
  notes: string | null
  importedAt: Date
  createdAt: Date
  updatedAt: Date
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

function buildDerivedNeedsMapping(input: {
  propertyId?: string | null
  property?: { id?: string | null } | null
}) {
  const hasPropertyId = !!input.propertyId
  const hasPropertyObject = !!input.property?.id

  return !(hasPropertyId || hasPropertyObject)
}

export async function GET(req: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccessWithDevBypass(req)
  if (!access.ok) return access.response

  try {
    const { id } = await context.params

    const bookingRaw = await prisma.booking.findUnique({
      where: { id },
    })

    const booking = bookingRaw as BookingBaseRecord | null

    if (!booking) {
      return NextResponse.json(
        { error: "Η κράτηση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(access.auth, booking.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχεις πρόσβαση σε αυτή την κράτηση." },
        { status: 403 }
      )
    }

    const property = booking.propertyId
      ? await prisma.property.findUnique({
          where: { id: booking.propertyId },
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
        })
      : null

    const tasks = await prisma.task.findMany({
      where: {
        bookingId: booking.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        taskType: true,
        source: true,
        priority: true,
        status: true,
        scheduledDate: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        dueDate: true,
        completedAt: true,
        alertEnabled: true,
        alertAt: true,
        notes: true,
        resultNotes: true,
        sendCleaningChecklist: true,
        sendSuppliesChecklist: true,
        createdAt: true,
        assignments: {
          select: {
            id: true,
            status: true,
            assignedAt: true,
            acceptedAt: true,
            rejectedAt: true,
            startedAt: true,
            completedAt: true,
            rejectionReason: true,
            notes: true,
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
        checklistRun: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            template: {
              select: {
                id: true,
                title: true,
                templateType: true,
                isPrimary: true,
              },
            },
          },
        },
        supplyRun: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            answers: {
              select: {
                id: true,
                fillLevel: true,
                notes: true,
                propertySupply: {
                  select: {
                    id: true,
                    supplyItem: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        category: true,
                        unit: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
    })

    const syncEvents = await prisma.bookingSyncEvent.findMany({
      where: {
        bookingId: booking.id,
      },
      select: {
        id: true,
        eventType: true,
        sourcePlatform: true,
        resultStatus: true,
        message: true,
        payload: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    })

    const issues = await prisma.issue.findMany({
      where: {
        bookingId: booking.id,
      },
      select: {
        id: true,
        issueType: true,
        title: true,
        description: true,
        severity: true,
        status: true,
        reportedBy: true,
        resolutionNotes: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ createdAt: "desc" }],
    })

    const activityLogs = await prisma.activityLog.findMany({
      where: {
        bookingId: booking.id,
      },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        message: true,
        actorType: true,
        actorName: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    })

    let nextBooking: {
      id: string
      checkInDate: Date
      checkInTime: string | null
      checkOutDate: Date
      checkOutTime: string | null
      externalBookingId: string
      sourcePlatform: string
    } | null = null

    const windowStartAt = combineDateAndTime(
      booking.checkOutDate,
      booking.checkOutTime
    )

    if (booking.propertyId) {
      const upcomingBookings = await prisma.booking.findMany({
        where: {
          organizationId: booking.organizationId,
          propertyId: booking.propertyId,
          id: {
            not: booking.id,
          },
          status: {
            not: "cancelled",
          },
        },
        select: {
          id: true,
          checkInDate: true,
          checkInTime: true,
          checkOutDate: true,
          checkOutTime: true,
          externalBookingId: true,
          sourcePlatform: true,
        },
        orderBy: [{ checkInDate: "asc" }, { createdAt: "asc" }],
      })

      nextBooking =
        upcomingBookings.find((candidate) => {
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

    const derivedNeedsMapping = buildDerivedNeedsMapping({
      propertyId: booking.propertyId,
      property,
    })

    return NextResponse.json({
      id: booking.id,
      organizationId: booking.organizationId,
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
      adults: booking.adults,
      children: booking.children,
      infants: booking.infants,
      status: booking.status,
      syncStatus: booking.syncStatus,
      needsMapping: derivedNeedsMapping,
      isManual: booking.isManual,
      sourceUpdatedAt: booking.sourceUpdatedAt,
      rawPayload: booking.rawPayload,
      lastProcessedAt: booking.lastProcessedAt,
      lastError: booking.lastError,
      notes: booking.notes,
      importedAt: booking.importedAt,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      property,
      tasks,
      syncEvents,
      issues,
      activityLogs,
      hasTasks: tasks.length > 0,
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
    })
  } catch (error) {
    console.error("Booking detail GET error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης κράτησης." },
      { status: 500 }
    )
  }
}