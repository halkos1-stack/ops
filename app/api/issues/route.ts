import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const propertyId = searchParams.get("propertyId")
    const taskId = searchParams.get("taskId")
    const bookingId = searchParams.get("bookingId")
    const status = searchParams.get("status")
    const issueType = searchParams.get("issueType")
    const severity = searchParams.get("severity")

    const issues = await prisma.issue.findMany({
      where: {
        ...(propertyId ? { propertyId } : {}),
        ...(taskId ? { taskId } : {}),
        ...(bookingId ? { bookingId } : {}),
        ...(status ? { status } : {}),
        ...(issueType ? { issueType } : {}),
        ...(severity ? { severity } : {}),
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
        taskPhotos: {
          select: {
            id: true,
            category: true,
            fileUrl: true,
            fileName: true,
            caption: true,
            uploadedAt: true,
          },
          orderBy: {
            uploadedAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(issues)
  } catch (error) {
    console.error("GET /api/issues error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης συμβάντων." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const propertyId = String(body.propertyId || "").trim()
    const taskId =
      body.taskId && String(body.taskId).trim() !== ""
        ? String(body.taskId).trim()
        : null
    const bookingId =
      body.bookingId && String(body.bookingId).trim() !== ""
        ? String(body.bookingId).trim()
        : null

    const issueType = String(body.issueType || "").trim()
    const title = String(body.title || "").trim()
    const description =
      body.description !== undefined ? String(body.description || "").trim() : ""
    const severity = String(body.severity || "medium").trim()
    const status = String(body.status || "open").trim()
    const reportedBy =
      body.reportedBy !== undefined ? String(body.reportedBy || "").trim() : ""

    if (!propertyId) {
      return NextResponse.json(
        { error: "Το propertyId είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!issueType) {
      return NextResponse.json(
        { error: "Ο τύπος συμβάντος είναι υποχρεωτικός." },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: "Ο τίτλος συμβάντος είναι υποχρεωτικός." },
        { status: 400 }
      )
    }

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

    const issue = await prisma.issue.create({
      data: {
        propertyId,
        taskId,
        bookingId,
        issueType,
        title,
        description: description || null,
        severity,
        status,
        reportedBy: reportedBy || null,
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
        propertyId: issue.propertyId,
        taskId: issue.taskId,
        bookingId: issue.bookingId,
        issueId: issue.id,
        entityType: "ISSUE",
        entityId: issue.id,
        action: "ISSUE_CREATED",
        message: `Δημιουργήθηκε νέο συμβάν: ${issue.title}`,
        actorType: "manager",
        actorName: reportedBy || "Διαχειριστής",
        metadata: {
          issueType: issue.issueType,
          severity: issue.severity,
          status: issue.status,
        },
      },
    })

    return NextResponse.json(issue, { status: 201 })
  } catch (error) {
    console.error("POST /api/issues error:", error)

    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας συμβάντος." },
      { status: 500 }
    )
  }
}