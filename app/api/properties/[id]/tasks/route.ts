import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function toText(value: unknown) {
  return String(value ?? "").trim()
}

function toNullableText(value: unknown) {
  const text = String(value ?? "").trim()
  return text === "" ? null : text
}

async function resolveChecklistTemplate(params: {
  organizationId: string
  propertyId: string
  checklistTemplateId?: string | null
  checklistTemplateMode?: string | null
  requiresChecklist: boolean
  taskType: string
}) {
  if (!params.requiresChecklist) return null

  if (params.checklistTemplateId) {
    const explicit = await prisma.propertyChecklistTemplate.findFirst({
      where: {
        id: params.checklistTemplateId,
        organizationId: params.organizationId,
        propertyId: params.propertyId,
        isActive: true,
      },
      select: {
        id: true,
      },
    })

    return explicit
  }

  const normalizedMode = String(
    params.checklistTemplateMode ||
      (params.taskType === "supplies" ? "supplies" : "main")
  )
    .trim()
    .toLowerCase()

  if (normalizedMode === "supplies") {
    return prisma.propertyChecklistTemplate.findFirst({
      where: {
        organizationId: params.organizationId,
        propertyId: params.propertyId,
        templateType: "supplies",
        isActive: true,
      },
      select: {
        id: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    })
  }

  return prisma.propertyChecklistTemplate.findFirst({
    where: {
      organizationId: params.organizationId,
      propertyId: params.propertyId,
      templateType: "main",
      isActive: true,
    },
    select: {
      id: true,
    },
    orderBy: [
      { isPrimary: "desc" },
      { updatedAt: "desc" },
    ],
  })
}

async function getPropertyTasksPayload(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
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

  if (!property) return null

  const checklistTemplates = await prisma.propertyChecklistTemplate.findMany({
    where: {
      propertyId,
      isActive: true,
    },
    orderBy: [
      { templateType: "asc" },
      { isPrimary: "desc" },
      { updatedAt: "desc" },
    ],
  })

  const bookings = await prisma.booking.findMany({
    where: {
      propertyId,
    },
    orderBy: {
      checkInDate: "desc",
    },
  })

  const tasks = await prisma.task.findMany({
    where: {
      propertyId,
    },
    orderBy: [
      { scheduledDate: "asc" },
      { createdAt: "desc" },
    ],
    include: {
      booking: true,
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

  return {
    property,
    checklistTemplates,
    bookings,
    tasks,
  }
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const auth = access.auth
    const { id } = await context.params

    const property = await prisma.property.findUnique({
      where: { id },
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
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      )
    }

    const payload = await getPropertyTasksPayload(id)
    return NextResponse.json(payload)
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
    if (!access.ok) return access.response

    const auth = access.auth
    const { id } = await context.params
    const body = await req.json()

    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        defaultPartnerId: true,
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
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      )
    }

    const title = toText(body.title)
    const taskType = toText(body.taskType || "cleaning").toLowerCase()
    const scheduledDateRaw = toText(body.scheduledDate)

    if (!title) {
      return NextResponse.json(
        { error: "Ο τίτλος εργασίας είναι υποχρεωτικός." },
        { status: 400 }
      )
    }

    if (!scheduledDateRaw) {
      return NextResponse.json(
        { error: "Η ημερομηνία εργασίας είναι υποχρεωτική." },
        { status: 400 }
      )
    }

    const scheduledDate = new Date(scheduledDateRaw)

    if (Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: "Μη έγκυρη ημερομηνία εργασίας." },
        { status: 400 }
      )
    }

    const requiresChecklist =
      body.requiresChecklist === undefined
        ? true
        : Boolean(body.requiresChecklist)

    const checklistTemplate = await resolveChecklistTemplate({
      organizationId: property.organizationId,
      propertyId: property.id,
      checklistTemplateId: toNullableText(body.checklistTemplateId),
      checklistTemplateMode: toNullableText(body.checklistTemplateMode),
      requiresChecklist,
      taskType,
    })

    const bookingId = toNullableText(body.bookingId)

    if (bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          organizationId: property.organizationId,
          propertyId: property.id,
        },
        select: {
          id: true,
        },
      })

      if (!booking) {
        return NextResponse.json(
          { error: "Η κράτηση δεν βρέθηκε για αυτό το ακίνητο." },
          { status: 400 }
        )
      }
    }

    const createdTask = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          organizationId: property.organizationId,
          propertyId: property.id,
          bookingId,
          title,
          description: toNullableText(body.description),
          taskType,
          source: toText(body.source || "manual"),
          priority: toText(body.priority || "normal"),
          status: toText(body.status || "pending"),
          scheduledDate,
          scheduledStartTime: toNullableText(body.scheduledStartTime),
          scheduledEndTime: toNullableText(body.scheduledEndTime),
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          requiresPhotos: Boolean(body.requiresPhotos),
          requiresChecklist,
          requiresApproval: Boolean(body.requiresApproval),
          notes: toNullableText(body.notes),
          resultNotes: toNullableText(body.resultNotes),
        },
      })

      if (requiresChecklist && checklistTemplate?.id) {
        await tx.taskChecklistRun.create({
          data: {
            taskId: task.id,
            templateId: checklistTemplate.id,
            status: "pending",
          },
        })
      }

      await tx.activityLog.create({
        data: {
          organizationId: property.organizationId,
          propertyId: property.id,
          taskId: task.id,
          entityType: "TASK",
          entityId: task.id,
          action: "TASK_CREATED",
          message:
            taskType === "supplies"
              ? `Δημιουργήθηκε νέα εργασία αναλωσίμων για το ακίνητο.`
              : `Δημιουργήθηκε νέα εργασία "${title}".`,
          actorType: auth.isSuperAdmin ? "SUPER_ADMIN" : auth.organizationRole,
          actorName: auth.email,
          metadata: {
            taskType,
            checklistTemplateId: checklistTemplate?.id || null,
          },
        },
      })

      return task
    })

    const payload = await getPropertyTasksPayload(property.id)

    return NextResponse.json(
      {
        success: true,
        createdTaskId: createdTask.id,
        ...payload,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/properties/[id]/tasks error:", error)
    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας εργασίας ακινήτου." },
      { status: 500 }
    )
  }
}