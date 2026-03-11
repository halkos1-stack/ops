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
        property: true,
        task: true,
        event: true,
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

    const title = toStringValue(body.title)
    const description = toNullableString(body.description)
    const status = toNullableString(body.status) ?? "OPEN"
    const severity = toNullableString(body.severity)
    const propertyId = toNullableString(body.propertyId)
    const taskId = toNullableString(body.taskId)
    const eventId = toNullableString(body.eventId)
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

    if (!propertyId && !taskId && !eventId) {
      return NextResponse.json(
        { error: "Το ζήτημα πρέπει να συνδέεται με ακίνητο, εργασία ή συμβάν." },
        { status: 400 }
      )
    }

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
    }

    if (eventId) {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          organizationId: true,
        },
      })

      if (!event) {
        return NextResponse.json(
          { error: "Το συμβάν δεν βρέθηκε." },
          { status: 404 }
        )
      }

      if (!canAccessOrganization(auth, event.organizationId)) {
        return NextResponse.json(
          { error: "Δεν έχετε πρόσβαση στο συγκεκριμένο συμβάν." },
          { status: 403 }
        )
      }

      if (event.organizationId !== organizationId) {
        return NextResponse.json(
          { error: "Το συμβάν ανήκει σε διαφορετικό οργανισμό." },
          { status: 400 }
        )
      }
    }

    const issue = await prisma.issue.create({
      data: {
        organizationId,
        title,
        description,
        status,
        severity,
        propertyId,
        taskId,
        eventId,
      },
      include: {
        property: true,
        task: true,
        event: true,
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