import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiAppAccess,
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
      where:
        auth.isSuperAdmin || !auth.organizationId
          ? { id }
          : { id, organizationId: auth.organizationId },
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
    const body = await req.json().catch(() => ({}))

    const existingIssue = await prisma.issue.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        propertyId: true,
        taskId: true,
        bookingId: true,
        status: true,
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

    const normalizedStatus = status?.toLowerCase() ?? null

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
        ...(normalizedStatus === "resolved" || normalizedStatus === "closed"
          ? { resolvedAt: new Date() }
          : { resolvedAt: null }),
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

    const putAction =
      normalizedStatus === "resolved" || normalizedStatus === "closed"
        ? "ISSUE_RESOLVED"
        : "ISSUE_UPDATED"

    await prisma.activityLog.create({
      data: {
        organizationId: existingIssue.organizationId,
        propertyId: existingIssue.propertyId ?? null,
        taskId: existingIssue.taskId ?? null,
        bookingId: existingIssue.bookingId ?? null,
        issueId: updatedIssue.id,
        entityType: "ISSUE",
        entityId: updatedIssue.id,
        action: putAction,
        message: `Ζήτημα ενημερώθηκε: "${updatedIssue.title}"`,
        actorType: "manager",
        actorName: auth.name || auth.email || "Διαχειριστής",
        metadata: {
          previousStatus: existingIssue.status,
          newStatus: updatedIssue.status,
          severity: updatedIssue.severity,
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
    const body = await req.json().catch(() => ({}))

    const existingIssue = await prisma.issue.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        propertyId: true,
        taskId: true,
        bookingId: true,
        status: true,
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

    const data: {
      title?: string
      description?: string | null
      status?: string
      severity?: string
      issueType?: string
      reportedBy?: string
      resolutionNotes?: string | null
      resolvedAt?: Date | null
    } = {}

    if (body.title !== undefined) {
      const title = toStringValue(body.title)
      if (!title) {
        return NextResponse.json(
          { error: "Ο τίτλος ζητήματος δεν μπορεί να είναι κενός." },
          { status: 400 }
        )
      }
      data.title = title
    }

    if (body.description !== undefined) {
      data.description = toNullableString(body.description)
    }

    if (body.status !== undefined) {
      const status = toNullableString(body.status)
      if (status !== null) {
        data.status = status

        const normalizedStatus = status.toLowerCase()
        if (normalizedStatus === "resolved" || normalizedStatus === "closed") {
          data.resolvedAt = new Date()
        } else {
          data.resolvedAt = null
        }
      }
    }

    if (body.severity !== undefined) {
      const severity = toNullableString(body.severity)
      if (severity !== null) {
        data.severity = severity
      }
    }

    if (body.issueType !== undefined) {
      const issueType = toNullableString(body.issueType)
      if (issueType !== null) {
        data.issueType = issueType
      }
    }

    if (body.reportedBy !== undefined) {
      const reportedBy = toNullableString(body.reportedBy)
      if (reportedBy !== null) {
        data.reportedBy = reportedBy
      }
    }

    if (body.resolutionNotes !== undefined) {
      data.resolutionNotes = toNullableString(body.resolutionNotes)
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

    const newStatus = updatedIssue.status?.toLowerCase() ?? null
    const patchAction =
      newStatus === "resolved" || newStatus === "closed"
        ? "ISSUE_RESOLVED"
        : "ISSUE_UPDATED"

    await prisma.activityLog.create({
      data: {
        organizationId: existingIssue.organizationId,
        propertyId: existingIssue.propertyId ?? null,
        taskId: existingIssue.taskId ?? null,
        bookingId: existingIssue.bookingId ?? null,
        issueId: updatedIssue.id,
        entityType: "ISSUE",
        entityId: updatedIssue.id,
        action: patchAction,
        message: `Ζήτημα ενημερώθηκε: "${updatedIssue.title}"`,
        actorType: "manager",
        actorName: auth.name || auth.email || "Διαχειριστής",
        metadata: {
          previousStatus: existingIssue.status,
          newStatus: updatedIssue.status,
          severity: updatedIssue.severity,
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