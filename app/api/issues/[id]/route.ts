import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            city: true,
            region: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            scheduledDate: true,
            taskType: true,
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
          select: {
            id: true,
            category: true,
            fileUrl: true,
            fileName: true,
            caption: true,
            takenAt: true,
            uploadedAt: true,
          },
          orderBy: {
            uploadedAt: "desc",
          },
        },
        activityLogs: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!issue) {
      return NextResponse.json(
        { error: "Το συμβάν δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(issue)
  } catch (error) {
    console.error("GET /api/issues/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης συμβάντος." },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()

    const existingIssue = await prisma.issue.findUnique({
      where: { id },
      select: {
        id: true,
        propertyId: true,
        taskId: true,
        bookingId: true,
        issueType: true,
        title: true,
        description: true,
        severity: true,
        status: true,
        reportedBy: true,
        resolutionNotes: true,
        resolvedAt: true,
      },
    })

    if (!existingIssue) {
      return NextResponse.json(
        { error: "Το συμβάν δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const propertyId =
      body.propertyId !== undefined ? String(body.propertyId || "").trim() : undefined

    const taskId =
      body.taskId !== undefined
        ? body.taskId && String(body.taskId).trim() !== ""
          ? String(body.taskId).trim()
          : null
        : undefined

    const bookingId =
      body.bookingId !== undefined
        ? body.bookingId && String(body.bookingId).trim() !== ""
          ? String(body.bookingId).trim()
          : null
        : undefined

    const issueType =
      body.issueType !== undefined ? String(body.issueType || "").trim() : undefined

    const title =
      body.title !== undefined ? String(body.title || "").trim() : undefined

    const description =
      body.description !== undefined
        ? String(body.description || "").trim()
        : undefined

    const severity =
      body.severity !== undefined ? String(body.severity || "").trim() : undefined

    const status =
      body.status !== undefined ? String(body.status || "").trim() : undefined

    const reportedBy =
      body.reportedBy !== undefined ? String(body.reportedBy || "").trim() : undefined

    const resolutionNotes =
      body.resolutionNotes !== undefined
        ? String(body.resolutionNotes || "").trim()
        : undefined

    if (propertyId !== undefined && !propertyId) {
      return NextResponse.json(
        { error: "Το propertyId δεν μπορεί να είναι κενό." },
        { status: 400 }
      )
    }

    if (issueType !== undefined && !issueType) {
      return NextResponse.json(
        { error: "Ο τύπος συμβάντος δεν μπορεί να είναι κενός." },
        { status: 400 }
      )
    }

    if (title !== undefined && !title) {
      return NextResponse.json(
        { error: "Ο τίτλος συμβάντος δεν μπορεί να είναι κενός." },
        { status: 400 }
      )
    }

    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true },
      })

      if (!property) {
        return NextResponse.json(
          { error: "Το ακίνητο δεν βρέθηκε." },
          { status: 404 }
        )
      }
    }

    if (taskId) {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true },
      })

      if (!task) {
        return NextResponse.json(
          { error: "Η συνδεδεμένη εργασία δεν βρέθηκε." },
          { status: 404 }
        )
      }
    }

    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true },
      })

      if (!booking) {
        return NextResponse.json(
          { error: "Η συνδεδεμένη κράτηση δεν βρέθηκε." },
          { status: 404 }
        )
      }
    }

    const finalStatus = status ?? existingIssue.status

    const updatedIssue = await prisma.issue.update({
      where: { id },
      data: {
        ...(propertyId !== undefined ? { propertyId } : {}),
        ...(taskId !== undefined ? { taskId } : {}),
        ...(bookingId !== undefined ? { bookingId } : {}),
        ...(issueType !== undefined ? { issueType } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(severity !== undefined ? { severity } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(reportedBy !== undefined ? { reportedBy: reportedBy || null } : {}),
        ...(resolutionNotes !== undefined
          ? { resolutionNotes: resolutionNotes || null }
          : {}),
        ...(finalStatus === "resolved"
          ? { resolvedAt: new Date() }
          : status !== undefined
            ? { resolvedAt: null }
            : {}),
      },
      include: {
        property: {
          select: {
            id: true,
            code: true,
            name: true,
            city: true,
            address: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            scheduledDate: true,
          },
        },
        booking: {
          select: {
            id: true,
            guestName: true,
            checkInDate: true,
            checkOutDate: true,
            status: true,
          },
        },
      },
    })

    await prisma.activityLog.create({
      data: {
        propertyId: updatedIssue.propertyId,
        taskId: updatedIssue.taskId,
        bookingId: updatedIssue.bookingId,
        issueId: updatedIssue.id,
        entityType: "ISSUE",
        entityId: updatedIssue.id,
        action: "ISSUE_UPDATED",
        message: `Ενημερώθηκε το συμβάν: ${updatedIssue.title}`,
        actorType: "manager",
        actorName: reportedBy || "Διαχειριστής",
        metadata: {
          previousStatus: existingIssue.status,
          newStatus: updatedIssue.status,
          previousSeverity: existingIssue.severity,
          newSeverity: updatedIssue.severity,
        },
      },
    })

    return NextResponse.json(updatedIssue)
  } catch (error) {
    console.error("PUT /api/issues/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης συμβάντος." },
      { status: 500 }
    )
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const existingIssue = await prisma.issue.findUnique({
      where: { id },
      select: {
        id: true,
        propertyId: true,
        taskId: true,
        bookingId: true,
        title: true,
      },
    })

    if (!existingIssue) {
      return NextResponse.json(
        { error: "Το συμβάν δεν βρέθηκε." },
        { status: 404 }
      )
    }

    await prisma.issue.delete({
      where: { id },
    })

    await prisma.activityLog.create({
      data: {
        propertyId: existingIssue.propertyId,
        taskId: existingIssue.taskId,
        bookingId: existingIssue.bookingId,
        issueId: null,
        entityType: "ISSUE",
        entityId: existingIssue.id,
        action: "ISSUE_DELETED",
        message: `Διαγράφηκε το συμβάν: ${existingIssue.title}`,
        actorType: "manager",
        actorName: "Διαχειριστής",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/issues/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία διαγραφής συμβάντος." },
      { status: 500 }
    )
  }
}