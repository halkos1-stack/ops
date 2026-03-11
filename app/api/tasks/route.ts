import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type AuthContext = {
  systemRole?: "SUPER_ADMIN" | "USER"
  organizationId?: string | null
}

function getMockAuthFromRequest(req: NextRequest): AuthContext {
  const systemRole = req.headers.get("x-system-role") as
    | "SUPER_ADMIN"
    | "USER"
    | null

  const organizationId = req.headers.get("x-organization-id")

  return {
    systemRole: systemRole || "SUPER_ADMIN",
    organizationId: organizationId || null,
  }
}

function buildTenantWhere(auth: AuthContext) {
  if (auth.systemRole === "SUPER_ADMIN") {
    return {}
  }

  if (auth.organizationId) {
    return {
      organizationId: auth.organizationId,
    }
  }

  return {
    id: "__no_results__",
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = getMockAuthFromRequest(req)

    const tasks = await prisma.task.findMany({
      where: buildTenantWhere(auth),
      orderBy: {
        createdAt: "desc",
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        property: {
          select: {
            id: true,
            code: true,
            name: true,
            city: true,
            region: true,
            status: true,
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
        assignments: {
          orderBy: {
            assignedAt: "desc",
          },
          include: {
            partner: {
              select: {
                id: true,
                code: true,
                name: true,
                email: true,
                phone: true,
                specialty: true,
                status: true,
              },
            },
          },
        },
        checklistRun: {
          include: {
            template: {
              select: {
                id: true,
                title: true,
                templateType: true,
                isPrimary: true,
              },
            },
            answers: {
              select: {
                id: true,
                issueCreated: true,
                createdAt: true,
              },
            },
          },
        },
        issues: {
          select: {
            id: true,
            issueType: true,
            title: true,
            severity: true,
            status: true,
            createdAt: true,
          },
        },
        taskPhotos: {
          select: {
            id: true,
            category: true,
            fileUrl: true,
            fileName: true,
            uploadedAt: true,
          },
        },
        events: {
          select: {
            id: true,
            title: true,
            eventType: true,
            status: true,
            startAt: true,
            endAt: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Tasks GET error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης εργασιών." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getMockAuthFromRequest(req)
    const body = await req.json()

    const organizationId =
      body.organizationId || auth.organizationId || null

    if (!organizationId) {
      return NextResponse.json(
        { error: "Λείπει organizationId για δημιουργία εργασίας." },
        { status: 400 }
      )
    }

    const propertyId = String(body.propertyId || "").trim()
    const title = String(body.title || "").trim()
    const taskType = String(body.taskType || "").trim()
    const scheduledDateRaw = String(body.scheduledDate || "").trim()

    if (!propertyId) {
      return NextResponse.json(
        { error: "Το πεδίο propertyId είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: "Το πεδίο title είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!taskType) {
      return NextResponse.json(
        { error: "Το πεδίο taskType είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!scheduledDateRaw) {
      return NextResponse.json(
        { error: "Το πεδίο scheduledDate είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const scheduledDate = new Date(scheduledDateRaw)

    if (Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: "Μη έγκυρη ημερομηνία scheduledDate." },
        { status: 400 }
      )
    }

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        organizationId,
      },
      select: {
        id: true,
        defaultPartnerId: true,
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε ή δεν ανήκει στον οργανισμό." },
        { status: 404 }
      )
    }

    const task = await prisma.task.create({
      data: {
        organizationId,
        propertyId,
        bookingId: body.bookingId ? String(body.bookingId) : null,
        title,
        description: body.description ? String(body.description) : null,
        taskType,
        source: body.source ? String(body.source) : "manual",
        priority: body.priority ? String(body.priority) : "normal",
        status: body.status ? String(body.status) : "pending",
        scheduledDate,
        scheduledStartTime: body.scheduledStartTime
          ? String(body.scheduledStartTime)
          : null,
        scheduledEndTime: body.scheduledEndTime
          ? String(body.scheduledEndTime)
          : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        requiresPhotos: Boolean(body.requiresPhotos),
        requiresChecklist: Boolean(body.requiresChecklist),
        requiresApproval: Boolean(body.requiresApproval),
        notes: body.notes ? String(body.notes) : null,
      },
      include: {
        property: true,
        assignments: {
          include: {
            partner: true,
          },
        },
        checklistRun: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        task,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Tasks POST error:", error)

    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας εργασίας." },
      { status: 500 }
    )
  }
}