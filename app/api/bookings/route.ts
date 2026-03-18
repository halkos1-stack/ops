import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildTenantWhere } from "@/lib/route-access"
import { requireApiAppAccessWithDevBypass } from "@/lib/dev-api-access"

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

export async function GET(req: NextRequest) {
  const access = await requireApiAppAccessWithDevBypass(req)
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
        tasks: {
          select: {
            id: true,
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

    const normalizedBookings = bookings.map((booking) => {
      const derivedNeedsMapping = buildDerivedNeedsMapping({
        propertyId: booking.propertyId,
        property: booking.property,
      })

      return {
        ...booking,
        needsMapping: derivedNeedsMapping,
        hasTasks: booking.tasks.length > 0,
        mappedProperty: booking.property
          ? {
              id: booking.property.id,
              code: booking.property.code,
              name: booking.property.name,
              address: booking.property.address,
              city: booking.property.city,
              region: booking.property.region,
              status: booking.property.status,
            }
          : null,
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