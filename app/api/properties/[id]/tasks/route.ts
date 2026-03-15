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

function toRequiredString(value: unknown, fieldName: string) {
  const text = String(value ?? "").trim()

  if (!text) {
    throw new Error(`Το πεδίο "${fieldName}" είναι υποχρεωτικό.`)
  }

  return text
}

function toBoolean(value: unknown, fallback = false) {
  if (value === undefined || value === null) return fallback
  if (typeof value === "boolean") return value

  const text = String(value).trim().toLowerCase()

  if (["true", "1", "yes", "on"].includes(text)) return true
  if (["false", "0", "no", "off"].includes(text)) return false

  return fallback
}

function toNullableDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null

  const date = new Date(String(value))

  if (Number.isNaN(date.getTime())) {
    throw new Error("Μη έγκυρη ημερομηνία.")
  }

  return date
}

async function getPropertyBase(propertyId: string) {
  return prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      organizationId: true,
      code: true,
      name: true,
      address: true,
      city: true,
      region: true,
      postalCode: true,
      country: true,
      type: true,
      status: true,
      defaultPartnerId: true,
      defaultPartner: {
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
  })
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { id: propertyId } = await context.params

    const property = await getPropertyBase(propertyId)

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, property.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      )
    }

    const tasks = await prisma.task.findMany({
      where: {
        propertyId,
        organizationId: property.organizationId,
      },
      orderBy: [
        { scheduledDate: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        booking: {
          select: {
            id: true,
            sourcePlatform: true,
            externalBookingId: true,
            guestName: true,
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
                description: true,
                templateType: true,
                isPrimary: true,
                isActive: true,
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
          orderBy: {
            createdAt: "desc",
          },
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
          orderBy: {
            uploadedAt: "desc",
          },
          select: {
            id: true,
            category: true,
            fileUrl: true,
            fileName: true,
            uploadedAt: true,
          },
        },
        activityLogs: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
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

    const checklistTemplates = await prisma.propertyChecklistTemplate.findMany({
      where: {
        propertyId,
        organizationId: property.organizationId,
        isActive: true,
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        templateType: true,
        isPrimary: true,
        isActive: true,
      },
    })

    const bookings = await prisma.booking.findMany({
      where: {
        propertyId,
        organizationId: property.organizationId,
      },
      orderBy: {
        checkInDate: "desc",
      },
      take: 20,
      select: {
        id: true,
        sourcePlatform: true,
        externalBookingId: true,
        guestName: true,
        checkInDate: true,
        checkOutDate: true,
        checkInTime: true,
        checkOutTime: true,
        status: true,
      },
    })

    return NextResponse.json({
      property,
      checklistTemplates,
      bookings,
      tasks,
    })
  } catch (error) {
    console.error("GET /api/properties/[id]/tasks error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης εργασιών ακινήτου." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { id: propertyId } = await context.params
    const body = await req.json()

    const property = await getPropertyBase(propertyId)

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, property.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      )
    }

    const title = toRequiredString(body.title, "title")
    const taskType = toRequiredString(body.taskType, "taskType")
    const scheduledDate = toNullableDate(body.scheduledDate)

    if (!scheduledDate) {
      return NextResponse.json(
        { error: 'Το πεδίο "scheduledDate" είναι υποχρεωτικό.' },
        { status: 400 }
      )
    }

    const bookingId = toNullableString(body.bookingId)
    const description = toNullableString(body.description)
    const source = toNullableString(body.source) ?? "manual"
    const priority = toNullableString(body.priority) ?? "normal"
    const status = toNullableString(body.status) ?? "pending"
    const scheduledStartTime = toNullableString(body.scheduledStartTime)
    const scheduledEndTime = toNullableString(body.scheduledEndTime)
    const dueDate = toNullableDate(body.dueDate)
    const completedAt = toNullableDate(body.completedAt)
    const notes = toNullableString(body.notes)
    const resultNotes = toNullableString(body.resultNotes)
    const requiresPhotos = toBoolean(body.requiresPhotos, false)
    const requiresChecklist = toBoolean(body.requiresChecklist, false)
    const requiresApproval = toBoolean(body.requiresApproval, false)
    const checklistTemplateId = toNullableString(body.checklistTemplateId)

    if (bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          propertyId,
          organizationId: property.organizationId,
        },
        select: {
          id: true,
        },
      })

      if (!booking) {
        return NextResponse.json(
          {
            error:
              "Η κράτηση δεν βρέθηκε ή δεν ανήκει στο συγκεκριμένο ακίνητο / οργανισμό.",
          },
          { status: 400 }
        )
      }
    }

    let selectedTemplateId: string | null = null

    if (checklistTemplateId) {
      const template = await prisma.propertyChecklistTemplate.findFirst({
        where: {
          id: checklistTemplateId,
          propertyId,
          organizationId: property.organizationId,
          isActive: true,
        },
        select: {
          id: true,
        },
      })

      if (!template) {
        return NextResponse.json(
          {
            error:
              "Το επιλεγμένο πρότυπο checklist δεν βρέθηκε ή δεν ανήκει στο συγκεκριμένο ακίνητο.",
          },
          { status: 400 }
        )
      }

      selectedTemplateId = template.id
    } else if (requiresChecklist) {
      const primaryTemplate = await prisma.propertyChecklistTemplate.findFirst({
        where: {
          propertyId,
          organizationId: property.organizationId,
          isPrimary: true,
          isActive: true,
        },
        select: {
          id: true,
        },
      })

      if (primaryTemplate) {
        selectedTemplateId = primaryTemplate.id
      }
    }

    const task = await prisma.task.create({
      data: {
        organizationId: property.organizationId,
        propertyId,
        bookingId,
        title,
        description,
        taskType,
        source,
        priority,
        status,
        scheduledDate,
        scheduledStartTime,
        scheduledEndTime,
        dueDate,
        completedAt,
        requiresPhotos,
        requiresChecklist,
        requiresApproval,
        notes,
        resultNotes,
        checklistRun:
          requiresChecklist && selectedTemplateId
            ? {
                create: {
                  templateId: selectedTemplateId,
                  status: "pending",
                },
              }
            : undefined,
        activityLogs: {
          create: {
            organizationId: property.organizationId,
            propertyId,
            entityType: "task",
            entityId: "pending",
            action: "TASK_CREATED",
            message: `Δημιουργήθηκε νέα εργασία για το ακίνητο ${property.name}.`,
            actorType: auth.systemRole || "USER",
            actorName: auth.user?.name || auth.user?.email || "Χρήστης",
          },
        },
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
            type: true,
            status: true,
          },
        },
        booking: {
          select: {
            id: true,
            sourcePlatform: true,
            externalBookingId: true,
            guestName: true,
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
                description: true,
                templateType: true,
                isPrimary: true,
                isActive: true,
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
      },
    })

    await prisma.activityLog.updateMany({
      where: {
        entityType: "task",
        entityId: "pending",
        action: "TASK_CREATED",
        propertyId,
        organizationId: property.organizationId,
        taskId: null,
      },
      data: {
        taskId: task.id,
        entityId: task.id,
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
    console.error("POST /api/properties/[id]/tasks error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία δημιουργίας εργασίας ακινήτου."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}