import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import { createBookingSyncEvent } from "@/lib/bookings/booking-logging"
import {
  findPrimaryCleaningTemplate,
  countActivePropertySupplies,
  syncTaskChecklistRun,
  syncTaskSupplyRun,
} from "@/lib/tasks/task-run-sync"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"
import {
  filterCanonicalOperationalTasks,
  getOperationalTaskValidity,
} from "@/lib/tasks/ops-task-contract"

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

function parseOptionalDateTime(value: unknown) {
  const text = String(value ?? "").trim()
  if (!text) return null

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function normalizeTaskForUi<
  T extends {
    source: string
    bookingId: string | null
    checklistRun: unknown
    supplyRun: unknown
  },
>(task: T) {
  return {
    ...task,
    opsValidity: getOperationalTaskValidity(task),
    cleaningChecklistRun: task.checklistRun ?? null,
    suppliesChecklistRun: task.supplyRun ?? null,
    checklistRun: task.checklistRun ?? null,
    supplyRun: task.supplyRun ?? null,
  }
}

async function getPropertyTasksPayload(propertyId: string) {
  const propertyBase = await prisma.property.findUnique({
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
      bedrooms: true,
      bathrooms: true,
      maxGuests: true,
      notes: true,
      defaultPartnerId: true,
      createdAt: true,
      updatedAt: true,
      defaultPartner: {
        select: {
          id: true,
          code: true,
          name: true,
          email: true,
          phone: true,
          specialty: true,
          status: true,
          notes: true,
        },
      },
    },
  })

  if (!propertyBase) return null

  const checklistTemplates = await prisma.propertyChecklistTemplate.findMany({
    where: {
      propertyId,
      isActive: true,
      templateType: "main",
    },
    orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
    include: {
      items: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          label: true,
          description: true,
          itemType: true,
          isRequired: true,
          sortOrder: true,
          category: true,
          requiresPhoto: true,
          opensIssueOnFail: true,
          optionsText: true,
        },
      },
    },
  })

  const propertySupplies = await prisma.propertySupply.findMany({
    where: {
      propertyId,
      isActive: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      supplyItem: {
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          unit: true,
          minimumStock: true,
          isActive: true,
        },
      },
    },
  })

  const issues = await prisma.issue.findMany({
    where: {
      propertyId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
    take: 50,
  })

  const bookings = await prisma.booking.findMany({
    where: {
      propertyId,
    },
    orderBy: {
      checkInDate: "desc",
    },
    take: 50,
  })

  const rawTasks = await prisma.task.findMany({
    where: {
      propertyId,
    },
    orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
    include: {
      booking: {
        select: {
          id: true,
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
      supplyRun: {
        include: {
          answers: {
            include: {
              propertySupply: {
                include: {
                  supplyItem: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      category: true,
                      unit: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      issues: {
        select: {
          id: true,
          issueType: true,
          title: true,
          description: true,
          severity: true,
          status: true,
          reportedBy: true,
          resolutionNotes: true,
          resolvedAt: true,
          createdAt: true,
          updatedAt: true,
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
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

  const allTasks = rawTasks.map(normalizeTaskForUi)
  const tasks = filterCanonicalOperationalTasks(allTasks)
  const invalidOperationalTasks = allTasks.filter(
    (task) => task.opsValidity.isCanonicalOperational !== true
  )

  const property = {
    ...propertyBase,
    checklistTemplates,
    propertySupplies,
    issues,
    tasks,
  }

  return {
    property,
    checklistTemplates,
    propertySupplies,
    issues,
    bookings,
    tasks,
    auditSummary: {
      invalidOperationalTaskCount: invalidOperationalTasks.length,
    },
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

    if (!payload) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

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

    const sendCleaningChecklist = Boolean(body.sendCleaningChecklist)
    const sendSuppliesChecklist = Boolean(body.sendSuppliesChecklist)

    if (!sendCleaningChecklist && !sendSuppliesChecklist) {
      return NextResponse.json(
        { error: "Πρέπει να επιλεγεί τουλάχιστον μία ενότητα εργασίας." },
        { status: 400 }
      )
    }

    const alertEnabled = Boolean(body.alertEnabled)
    const alertAt = alertEnabled ? parseOptionalDateTime(body.alertAt) : null
    const bookingId = toNullableText(body.bookingId)
    const taskSource = toText(body.source || "manual").toLowerCase()

    if (alertEnabled && !alertAt) {
      return NextResponse.json(
        { error: "Το alert είναι ενεργό αλλά δεν έχει οριστεί έγκυρη ώρα alert." },
        { status: 400 }
      )
    }

    let primaryCleaningTemplate:
      | {
          id: string
          title: string
          description: string | null
          templateType: string
          isPrimary: boolean
          isActive: boolean
          updatedAt: Date
          items: Array<{
            id: string
            label: string
            description: string | null
            itemType: string
            isRequired: boolean
            sortOrder: number
            category: string | null
            requiresPhoto: boolean
            opensIssueOnFail: boolean
            optionsText: string | null
          }>
        }
      | null = null

    if (sendCleaningChecklist) {
      primaryCleaningTemplate = await findPrimaryCleaningTemplate(
        property.organizationId,
        property.id
      )

      if (!primaryCleaningTemplate) {
        return NextResponse.json(
          {
            error:
              "Δεν υπάρχει ενεργή βασική λίστα καθαριότητας για αυτό το ακίνητο.",
          },
          { status: 400 }
        )
      }
    }

    if (sendSuppliesChecklist) {
      const activeSuppliesCount = await countActivePropertySupplies(property.id)

      if (activeSuppliesCount === 0) {
        return NextResponse.json(
          {
            error:
              "Δεν υπάρχουν ενεργά αναλώσιμα για αποστολή λίστας αναλωσίμων.",
          },
          { status: 400 }
        )
      }
    }

    if (taskSource === "booking" && !bookingId) {
      return NextResponse.json(
        { error: 'Οι εργασίες με source "booking" απαιτούν έγκυρο bookingId.' },
        { status: 400 }
      )
    }

    let linkedBooking:
      | {
          id: string
          sourcePlatform: string
        }
      | null = null

    if (bookingId) {
      linkedBooking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          organizationId: property.organizationId,
          propertyId: property.id,
        },
        select: {
          id: true,
          sourcePlatform: true,
        },
      })

      if (!linkedBooking) {
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
          source: taskSource,
          priority: toText(body.priority || "normal"),
          status: toText(body.status || "pending"),
          scheduledDate,
          scheduledStartTime: toNullableText(body.scheduledStartTime),
          scheduledEndTime: toNullableText(body.scheduledEndTime),
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          requiresPhotos: Boolean(body.requiresPhotos),
          requiresChecklist: sendCleaningChecklist,
          requiresApproval: Boolean(body.requiresApproval),
          sendCleaningChecklist,
          sendSuppliesChecklist,
          alertEnabled,
          alertAt,
          notes: toNullableText(body.notes),
          resultNotes: toNullableText(body.resultNotes),
        },
      })

      await tx.activityLog.create({
        data: {
          organizationId: property.organizationId,
          propertyId: property.id,
          bookingId,
          taskId: task.id,
          entityType: "TASK",
          entityId: task.id,
          action: "TASK_CREATED",
          message: `Δημιουργήθηκε νέα εργασία "${title}".`,
          actorType: "manager",
          actorName: "Διαχειριστής",
          metadata: {
            taskType,
            sendCleaningChecklist,
            sendSuppliesChecklist,
            checklistTemplateId: primaryCleaningTemplate?.id || null,
            alertEnabled,
            alertAt,
          },
        },
      })

      return task
    })

    if (bookingId && taskSource === "booking" && linkedBooking) {
      await createBookingSyncEvent({
        bookingId,
        organizationId: property.organizationId,
        propertyId: property.id,
        taskId: createdTask.id,
        eventType: "BOOKING_TASK_CREATED",
        sourcePlatform: linkedBooking.sourcePlatform,
        message: `Δημιουργήθηκε εργασία "${title}" από την κράτηση.`,
        activityAction: "BOOKING_TASK_CREATED",
        activityMetadata: {
          taskId: createdTask.id,
          taskTitle: title,
          taskType,
        },
      })
    }

    await syncTaskChecklistRun({
      taskId: createdTask.id,
      organizationId: property.organizationId,
      propertyId: property.id,
      sendCleaningChecklist,
    })

    await syncTaskSupplyRun({
      taskId: createdTask.id,
      propertyId: property.id,
      sendSuppliesChecklist,
    })

    await refreshPropertyReadiness(property.id)

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
