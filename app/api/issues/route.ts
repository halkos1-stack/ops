import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiAppAccess,
  buildTenantWhere,
  canAccessOrganization,
} from "@/lib/route-access"

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toStringValue(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback
  return value.trim()
}

export async function GET() {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access

    const issues = await prisma.issue.findMany({
      where: buildTenantWhere(auth),
      orderBy: {
        createdAt: "desc",
      },
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
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            taskType: true,
            scheduledDate: true,
          },
        },
        booking: {
          select: {
            id: true,
            guestName: true,
            sourcePlatform: true,
            checkInDate: true,
            checkOutDate: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json(issues)
  } catch (error) {
    console.error("Issues GET error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης ζητημάτων." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const body = await req.json()

    const issueType = toStringValue(body.issueType, "general")
    const title = toStringValue(body.title)
    const description = toNullableString(body.description)
    const status = toNullableString(body.status) ?? "open"
    const severity = toNullableString(body.severity) ?? "medium"
    const reportedBy = toNullableString(body.reportedBy)
    const resolutionNotes = toNullableString(body.resolutionNotes)

    const propertyId = toNullableString(body.propertyId)
    const taskId = toNullableString(body.taskId)
    const bookingId = toNullableString(body.bookingId)
    const requestedOrganizationId = toNullableString(body.organizationId)

    let organizationId: string | null = null

    if (auth.isSuperAdmin) {
      organizationId = requestedOrganizationId
    } else {
      organizationId = auth.organizationId
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Το organizationId είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: "Ο τίτλος ζητήματος είναι υποχρεωτικός." },
        { status: 400 }
      )
    }

    if (!propertyId && !taskId && !bookingId) {
      return NextResponse.json(
        {
          error:
            "Το ζήτημα πρέπει να συνδέεται με ακίνητο, εργασία ή κράτηση.",
        },
        { status: 400 }
      )
    }

    let resolvedPropertyId: string | null = propertyId
    let resolvedBookingId: string | null = bookingId

    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: {
          id: true,
          organizationId: true,
        },
      })

      if (!property) {
        return NextResponse.json(
          { error: "Το ακίνητο δεν βρέθηκε." },
          { status: 404 }
        )
      }

      if (!canAccessOrganization(auth, property.organizationId)) {
        return NextResponse.json(
          { error: "Δεν έχετε πρόσβαση στο συγκεκριμένο ακίνητο." },
          { status: 403 }
        )
      }

      if (property.organizationId !== organizationId) {
        return NextResponse.json(
          { error: "Το ακίνητο ανήκει σε διαφορετικό οργανισμό." },
          { status: 400 }
        )
      }
    }

    if (taskId) {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          organizationId: true,
          propertyId: true,
          bookingId: true,
        },
      })

      if (!task) {
        return NextResponse.json(
          { error: "Η εργασία δεν βρέθηκε." },
          { status: 404 }
        )
      }

      if (!canAccessOrganization(auth, task.organizationId)) {
        return NextResponse.json(
          { error: "Δεν έχετε πρόσβαση στη συγκεκριμένη εργασία." },
          { status: 403 }
        )
      }

      if (task.organizationId !== organizationId) {
        return NextResponse.json(
          { error: "Η εργασία ανήκει σε διαφορετικό οργανισμό." },
          { status: 400 }
        )
      }

      if (!resolvedPropertyId) {
        resolvedPropertyId = task.propertyId
      }

      if (!resolvedBookingId && task.bookingId) {
        resolvedBookingId = task.bookingId
      }
    }

    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          organizationId: true,
          propertyId: true,
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
          { error: "Δεν έχετε πρόσβαση στη συγκεκριμένη κράτηση." },
          { status: 403 }
        )
      }

      if (booking.organizationId !== organizationId) {
        return NextResponse.json(
          { error: "Η κράτηση ανήκει σε διαφορετικό οργανισμό." },
          { status: 400 }
        )
      }

      if (!resolvedPropertyId) {
        resolvedPropertyId = booking.propertyId
      }
    }

    if (!resolvedPropertyId) {
      return NextResponse.json(
        { error: "Δεν μπόρεσε να προσδιοριστεί το ακίνητο του ζητήματος." },
        { status: 400 }
      )
    }

    const issue = await prisma.issue.create({
      data: {
        organizationId,
        propertyId: resolvedPropertyId,
        taskId,
        bookingId: resolvedBookingId,
        issueType,
        title,
        description,
        severity,
        status,
        reportedBy,
        resolutionNotes,
      },
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
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            taskType: true,
            scheduledDate: true,
          },
        },
        booking: {
          select: {
            id: true,
            guestName: true,
            sourcePlatform: true,
            checkInDate: true,
            checkOutDate: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json(issue, { status: 201 })
  } catch (error) {
    console.error("Issues POST error:", error)
    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας ζητήματος." },
      { status: 500 }
    )
  }
}