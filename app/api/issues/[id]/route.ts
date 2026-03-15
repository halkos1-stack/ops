import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiAppAccess,
  buildTenantWhere,
  canAccessOrganization,
} from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toStringValue(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback
  return value.trim()
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { id } = await context.params

    const issue = await prisma.issue.findFirst({
      where: buildTenantWhere(auth, { id }),
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
        taskPhotos: {
          orderBy: {
            uploadedAt: "desc",
          },
          take: 12,
          select: {
            id: true,
            category: true,
            fileUrl: true,
            fileName: true,
            caption: true,
            uploadedAt: true,
          },
        },
        activityLogs: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
          select: {
            id: true,
            action: true,
            message: true,
            actorType: true,
            actorName: true,
            createdAt: true,
          },
        },
      },
    })

    if (!issue) {
      return NextResponse.json(
        { error: "Το ζήτημα δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(issue)
  } catch (error) {
    console.error("Issue GET by id error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης ζητήματος." },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { id } = await context.params
    const body = await req.json()

    const existingIssue = await prisma.issue.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
      },
    })

    if (!existingIssue) {
      return NextResponse.json(
        { error: "Το ζήτημα δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existingIssue.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ζήτημα." },
        { status: 403 }
      )
    }

    const title = toStringValue(body.title)
    const description = toNullableString(body.description)
    const status = toNullableString(body.status)
    const severity = toNullableString(body.severity)
    const issueType = toNullableString(body.issueType)
    const reportedBy = toNullableString(body.reportedBy)
    const resolutionNotes = toNullableString(body.resolutionNotes)

    if (!title) {
      return NextResponse.json(
        { error: "Ο τίτλος ζητήματος είναι υποχρεωτικός." },
        { status: 400 }
      )
    }

    const updatedIssue = await prisma.issue.update({
      where: { id },
      data: {
        title,
        description,
        issueType: issueType ?? undefined,
        ...(status !== null ? { status } : {}),
        ...(severity !== null ? { severity } : {}),
        ...(reportedBy !== null ? { reportedBy } : {}),
        ...(resolutionNotes !== null ? { resolutionNotes } : {}),
        ...(status?.toLowerCase() === "resolved" || status?.toLowerCase() === "closed"
          ? { resolvedAt: new Date() }
          : {}),
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
            postalCode: true,
            country: true,
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
        taskPhotos: {
          orderBy: {
            uploadedAt: "desc",
          },
          take: 12,
          select: {
            id: true,
            category: true,
            fileUrl: true,
            fileName: true,
            caption: true,
            uploadedAt: true,
          },
        },
        activityLogs: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
          select: {
            id: true,
            action: true,
            message: true,
            actorType: true,
            actorName: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json(updatedIssue)
  } catch (error) {
    console.error("Issue PUT error:", error)
    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης ζητήματος." },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { id } = await context.params
    const body = await req.json()

    const existingIssue = await prisma.issue.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
      },
    })

    if (!existingIssue) {
      return NextResponse.json(
        { error: "Το ζήτημα δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existingIssue.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ζήτημα." },
        { status: 403 }
      )
    }

    const data: Record<string, unknown> = {}

    if (body.title !== undefined) data.title = toStringValue(body.title)
    if (body.description !== undefined) data.description = toNullableString(body.description)
    if (body.status !== undefined) data.status = toNullableString(body.status)
    if (body.severity !== undefined) data.severity = toNullableString(body.severity)
    if (body.issueType !== undefined) data.issueType = toNullableString(body.issueType)
    if (body.reportedBy !== undefined) data.reportedBy = toNullableString(body.reportedBy)
    if (body.resolutionNotes !== undefined) {
      data.resolutionNotes = toNullableString(body.resolutionNotes)
    }

    const normalizedStatus =
      typeof data.status === "string" ? data.status.toLowerCase() : null

    if (normalizedStatus === "resolved" || normalizedStatus === "closed") {
      data.resolvedAt = new Date()
    }

    const updatedIssue = await prisma.issue.update({
      where: { id },
      data,
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
        taskPhotos: {
          orderBy: {
            uploadedAt: "desc",
          },
          take: 12,
          select: {
            id: true,
            category: true,
            fileUrl: true,
            fileName: true,
            caption: true,
            uploadedAt: true,
          },
        },
        activityLogs: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
          select: {
            id: true,
            action: true,
            message: true,
            actorType: true,
            actorName: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json(updatedIssue)
  } catch (error) {
    console.error("Issue PATCH error:", error)
    return NextResponse.json(
      { error: "Αποτυχία μερικής ενημέρωσης ζητήματος." },
      { status: 500 }
    )
  }
}