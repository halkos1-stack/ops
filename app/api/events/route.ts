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

function normalizeEventType(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase()

  if (!text) return "general"

  if (
    [
      "general",
      "task",
      "issue",
      "property",
      "system",
      "alert",
      "booking",
      "dispatch",
    ].includes(text)
  ) {
    return text
  }

  return "general"
}

function normalizeEventStatus(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase()

  if (!text) return "open"

  if (
    [
      "open",
      "in_progress",
      "resolved",
      "closed",
      "cancelled",
      "completed",
      "active",
      "pending",
    ].includes(text)
  ) {
    return text
  }

  return "open"
}

export async function GET() {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access

    const events = await prisma.event.findMany({
      where: buildTenantWhere(auth),
      orderBy: {
        createdAt: "desc",
      },
      include: {
        property: true,
        task: true,
        issue: true,
      },
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error("Events GET error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης συμβάντων." },
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
    const type = normalizeEventType(body.type)
    const status = normalizeEventStatus(body.status)
    const propertyId = toNullableString(body.propertyId)
    const taskId = toNullableString(body.taskId)
    const issueId = toNullableString(body.issueId)
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
        { error: "Ο τίτλος συμβάντος είναι υποχρεωτικός." },
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

    if (issueId) {
      const issue = await prisma.issue.findUnique({
        where: { id: issueId },
        select: {
          id: true,
          organizationId: true,
        },
      })

      if (!issue) {
        return NextResponse.json(
          { error: "Το ζήτημα δεν βρέθηκε." },
          { status: 404 }
        )
      }

      if (!canAccessOrganization(auth, issue.organizationId)) {
        return NextResponse.json(
          { error: "Δεν έχετε πρόσβαση στο συγκεκριμένο ζήτημα." },
          { status: 403 }
        )
      }

      if (issue.organizationId !== organizationId) {
        return NextResponse.json(
          { error: "Το ζήτημα ανήκει σε διαφορετικό οργανισμό." },
          { status: 400 }
        )
      }
    }

    const event = await prisma.event.create({
      data: {
        organizationId,
        title,
        description,
        type,
        status,
        propertyId,
        taskId,
        issueId,
      },
      include: {
        property: true,
        task: true,
        issue: true,
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error("Events POST error:", error)
    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας συμβάντος." },
      { status: 500 }
    )
  }
}