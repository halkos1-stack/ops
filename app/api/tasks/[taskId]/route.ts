import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiAppAccess,
  canAccessOrganization,
} from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    taskId: string
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

async function getTaskBase(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      organizationId: true,
      propertyId: true,
      bookingId: true,
      requiresChecklist: true,
    },
  })
}

async function getFullTask(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: {
      property: {
        include: {
          defaultPartner: {
            select: {
              id: true,
              name: true,
              email: true,
              specialty: true,
            },
          },
        },
      },

      booking: {
        select: {
          id: true,
          sourcePlatform: true,
          externalBookingId: true,
          guestName: true,
          guestPhone: true,
          guestEmail: true,
          checkInDate: true,
          checkOutDate: true,
          checkInTime: true,
          checkOutTime: true,
          adults: true,
          children: true,
          infants: true,
          status: true,
          notes: true,
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
            include: {
              items: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
            },
          },
          answers: {
            orderBy: {
              createdAt: "asc",
            },
            include: {
              templateItem: true,
            },
          },
        },
      },

      issues: {
        orderBy: {
          createdAt: "desc",
        },
      },

      taskPhotos: {
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
}

async function findPrimaryChecklistTemplate(
  organizationId: string,
  propertyId: string
) {
  return prisma.propertyChecklistTemplate.findFirst({
    where: {
      organizationId,
      propertyId,
      isPrimary: true,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      templateType: true,
      isPrimary: true,
      isActive: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })
}

async function syncTaskChecklistRun(params: {
  taskId: string
  organizationId: string
  propertyId: string
  requiresChecklist: boolean
}) {
  const { taskId, organizationId, propertyId, requiresChecklist } = params

  const existingRun = await prisma.taskChecklistRun.findUnique({
    where: {
      taskId,
    },
    select: {
      id: true,
      templateId: true,
      status: true,
    },
  })

  if (!requiresChecklist) {
    if (existingRun) {
      await prisma.taskChecklistRun.delete({
        where: {
          taskId,
        },
      })
    }

    return null
  }

  const primaryTemplate = await findPrimaryChecklistTemplate(
    organizationId,
    propertyId
  )

  if (!primaryTemplate) {
    if (existingRun) {
      await prisma.taskChecklistRun.delete({
        where: {
          taskId,
        },
      })
    }

    return null
  }

  if (!existingRun) {
    return prisma.taskChecklistRun.create({
      data: {
        taskId,
        templateId: primaryTemplate.id,
        status: "pending",
      },
    })
  }

  if (existingRun.templateId !== primaryTemplate.id) {
    await prisma.taskChecklistAnswer.deleteMany({
      where: {
        checklistRunId: existingRun.id,
      },
    })

    return prisma.taskChecklistRun.update({
      where: {
        taskId,
      },
      data: {
        templateId: primaryTemplate.id,
        status: "pending",
        startedAt: null,
        completedAt: null,
      },
    })
  }

  return prisma.taskChecklistRun.findUnique({
    where: {
      taskId,
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
    const { taskId } = await context.params

    const base = await getTaskBase(taskId)

    if (!base) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, base.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την εργασία." },
        { status: 403 }
      )
    }

    const task = await getFullTask(taskId)

    if (!task) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("GET /api/tasks/[taskId] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης εργασίας." },
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

    const auth = access.auth
    const { taskId } = await context.params
    const body = await req.json()

    const existing = await getTaskBase(taskId)

    if (!existing) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existing.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την εργασία." },
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

    const propertyId = toRequiredString(
      body.propertyId ?? existing.propertyId,
      "propertyId"
    )

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

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        organizationId: existing.organizationId,
      },
      select: {
        id: true,
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε ή δεν ανήκει στον οργανισμό." },
        { status: 400 }
      )
    }

    if (bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          organizationId: existing.organizationId,
          propertyId,
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

    await prisma.task.update({
      where: { id: taskId },
      data: {
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
      },
    })

    await syncTaskChecklistRun({
      taskId,
      organizationId: existing.organizationId,
      propertyId,
      requiresChecklist,
    })

    const task = await getFullTask(taskId)

    return NextResponse.json({
      success: true,
      task,
    })
  } catch (error) {
    console.error("PUT /api/tasks/[taskId] error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία ενημέρωσης εργασίας."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { taskId } = await context.params
    const body = await req.json()

    const existing = await getTaskBase(taskId)

    if (!existing) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existing.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την εργασία." },
        { status: 403 }
      )
    }

    const data: {
      propertyId?: string
      bookingId?: string | null
      title?: string
      description?: string | null
      taskType?: string
      source?: string
      priority?: string
      status?: string
      scheduledDate?: Date
      scheduledStartTime?: string | null
      scheduledEndTime?: string | null
      dueDate?: Date | null
      completedAt?: Date | null
      requiresPhotos?: boolean
      requiresChecklist?: boolean
      requiresApproval?: boolean
      notes?: string | null
      resultNotes?: string | null
    } = {}

    if ("propertyId" in body) {
      data.propertyId = toRequiredString(body.propertyId, "propertyId")
    }

    if ("bookingId" in body) {
      data.bookingId = toNullableString(body.bookingId)
    }

    if ("title" in body) {
      data.title = toRequiredString(body.title, "title")
    }

    if ("description" in body) {
      data.description = toNullableString(body.description)
    }

    if ("taskType" in body) {
      data.taskType = toRequiredString(body.taskType, "taskType")
    }

    if ("source" in body) {
      data.source = toRequiredString(body.source, "source")
    }

    if ("priority" in body) {
      data.priority = toRequiredString(body.priority, "priority")
    }

    if ("status" in body) {
      data.status = toRequiredString(body.status, "status")
    }

    if ("scheduledDate" in body) {
      const scheduledDate = toNullableDate(body.scheduledDate)

      if (!scheduledDate) {
        return NextResponse.json(
          { error: 'Το πεδίο "scheduledDate" δεν μπορεί να είναι κενό.' },
          { status: 400 }
        )
      }

      data.scheduledDate = scheduledDate
    }

    if ("scheduledStartTime" in body) {
      data.scheduledStartTime = toNullableString(body.scheduledStartTime)
    }

    if ("scheduledEndTime" in body) {
      data.scheduledEndTime = toNullableString(body.scheduledEndTime)
    }

    if ("dueDate" in body) {
      data.dueDate = toNullableDate(body.dueDate)
    }

    if ("completedAt" in body) {
      data.completedAt = toNullableDate(body.completedAt)
    }

    if ("requiresPhotos" in body) {
      data.requiresPhotos = toBoolean(body.requiresPhotos, false)
    }

    if ("requiresChecklist" in body) {
      data.requiresChecklist = toBoolean(body.requiresChecklist, false)
    }

    if ("requiresApproval" in body) {
      data.requiresApproval = toBoolean(body.requiresApproval, false)
    }

    if ("notes" in body) {
      data.notes = toNullableString(body.notes)
    }

    if ("resultNotes" in body) {
      data.resultNotes = toNullableString(body.resultNotes)
    }

    const targetPropertyId = data.propertyId ?? existing.propertyId
    const targetRequiresChecklist =
      data.requiresChecklist ?? existing.requiresChecklist

    if (data.propertyId) {
      const property = await prisma.property.findFirst({
        where: {
          id: targetPropertyId,
          organizationId: existing.organizationId,
        },
        select: {
          id: true,
        },
      })

      if (!property) {
        return NextResponse.json(
          { error: "Το ακίνητο δεν βρέθηκε ή δεν ανήκει στον οργανισμό." },
          { status: 400 }
        )
      }
    }

    if ("bookingId" in body && data.bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: data.bookingId,
          organizationId: existing.organizationId,
          propertyId: targetPropertyId,
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

    await prisma.task.update({
      where: { id: taskId },
      data,
    })

    if ("propertyId" in body || "requiresChecklist" in body) {
      await syncTaskChecklistRun({
        taskId,
        organizationId: existing.organizationId,
        propertyId: targetPropertyId,
        requiresChecklist: targetRequiresChecklist,
      })
    }

    const task = await getFullTask(taskId)

    return NextResponse.json({
      success: true,
      task,
    })
  } catch (error) {
    console.error("PATCH /api/tasks/[taskId] error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία μερικής ενημέρωσης εργασίας."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}