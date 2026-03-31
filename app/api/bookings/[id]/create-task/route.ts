import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccessWithDevBypass } from "@/lib/dev-api-access"
import { canAccessOrganization } from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type AppLanguage = "el" | "en"

function normalizeLanguage(value: unknown): AppLanguage {
  return value === "en" ? "en" : "el"
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toBooleanValue(value: unknown, fallback = false) {
  if (value === undefined || value === null) return fallback
  return Boolean(value)
}

function parseDateOnly(value: unknown) {
  const text = String(value ?? "").trim()
  if (!text) return null

  const date = new Date(`${text}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null

  return date
}

function parseDateTime(value: unknown) {
  const text = String(value ?? "").trim()
  if (!text) return null

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null

  return date
}

function normalizeTimeString(value: unknown) {
  const text = String(value ?? "").trim()
  if (!text) return null
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(text)) return null
  return text
}

function buildDefaultTaskTitle(
  taskType: string,
  propertyName: string,
  language: AppLanguage
) {
  const normalizedTaskType = String(taskType || "").trim().toLowerCase()

  if (language === "en") {
    if (normalizedTaskType === "cleaning") {
      return `Cleaning after check-out - ${propertyName}`
    }

    if (normalizedTaskType === "inspection") {
      return `Inspection after check-out - ${propertyName}`
    }

    if (normalizedTaskType === "maintenance") {
      return `Maintenance after check-out - ${propertyName}`
    }

    return `Task after check-out - ${propertyName}`
  }

  if (normalizedTaskType === "cleaning") {
    return `Καθαρισμός μετά από check-out - ${propertyName}`
  }

  if (normalizedTaskType === "inspection") {
    return `Επιθεώρηση μετά από check-out - ${propertyName}`
  }

  if (normalizedTaskType === "maintenance") {
    return `Συντήρηση μετά από check-out - ${propertyName}`
  }

  return `Εργασία μετά από check-out - ${propertyName}`
}

async function findPrimaryChecklistTemplate(propertyId: string) {
  return prisma.propertyChecklistTemplate.findFirst({
    where: {
      propertyId,
      isActive: true,
      templateType: "main",
      isPrimary: true,
    },
    orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      isPrimary: true,
      templateType: true,
      isActive: true,
    },
  })
}

async function countActivePropertySupplies(propertyId: string) {
  return prisma.propertySupply.count({
    where: {
      propertyId,
      isActive: true,
    },
  })
}

function getActorName(auth: Record<string, unknown>) {
  const name = toNullableString(auth.name)
  if (name) return name

  const email = toNullableString(auth.email)
  if (email) return email

  return "System"
}

export async function POST(req: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccessWithDevBypass(req)
  if (!access.ok) return access.response

  try {
    const { id } = await context.params
    const body = await req.json().catch(() => ({}))

    const language = normalizeLanguage(body.language)
    const taskType = String(body.taskType || "cleaning").trim().toLowerCase()

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        propertyId: true,
        externalBookingId: true,
        externalListingName: true,
        externalListingId: true,
        checkOutDate: true,
        checkOutTime: true,
        notes: true,
        needsMapping: true,
        property: {
          select: {
            id: true,
            name: true,
            code: true,
            defaultPartner: {
              select: {
                id: true,
                code: true,
                name: true,
                email: true,
                specialty: true,
                status: true,
              },
            },
          },
        },
        tasks: {
          where: {
            status: {
              not: "cancelled",
            },
          },
          select: {
            id: true,
            status: true,
            title: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        {
          error: language === "en" ? "Booking not found." : "Η κράτηση δεν βρέθηκε.",
        },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(access.auth, booking.organizationId)) {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "You do not have access to this booking."
              : "Δεν έχεις πρόσβαση σε αυτή την κράτηση.",
        },
        { status: 403 }
      )
    }

    if (!booking.propertyId || !booking.property) {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "This booking has no mapped property yet."
              : "Αυτή η κράτηση δεν έχει ακόμα αντιστοιχισμένο ακίνητο.",
        },
        { status: 400 }
      )
    }

    const property = booking.property
    const defaultPartner = property.defaultPartner

    const existingOpenTask = booking.tasks.find((task) => {
      const normalizedStatus = String(task.status || "").trim().toLowerCase()
      return normalizedStatus !== "completed"
    })

    if (existingOpenTask) {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "An open task already exists for this booking."
              : "Υπάρχει ήδη ανοιχτή εργασία για αυτή την κράτηση.",
          taskId: existingOpenTask.id,
        },
        { status: 400 }
      )
    }

    const scheduledDate =
      parseDateOnly(body.scheduledDate) || new Date(booking.checkOutDate)

    const scheduledStartTime =
      normalizeTimeString(body.scheduledStartTime) ||
      normalizeTimeString(booking.checkOutTime)

    const scheduledEndTime = normalizeTimeString(body.scheduledEndTime)
    const dueDate = parseDateOnly(body.dueDate)
    const alertEnabled = toBooleanValue(body.alertEnabled, false)
    const alertAt = alertEnabled ? parseDateTime(body.alertAt) : null

    const priority =
      String(body.priority || "normal").trim().toLowerCase() || "normal"

    const title =
      toNullableString(body.title) ||
      buildDefaultTaskTitle(taskType, property.name, language)

    const description = toNullableString(body.description)
    const notes = toNullableString(body.notes) ?? booking.notes ?? null

    let sendCleaningChecklist = toBooleanValue(body.sendCleaningChecklist, true)
    let sendSuppliesChecklist = toBooleanValue(body.sendSuppliesChecklist, true)

    const primaryChecklistTemplate = await findPrimaryChecklistTemplate(property.id)
    const activeSuppliesCount = await countActivePropertySupplies(property.id)

    if (!primaryChecklistTemplate) {
      sendCleaningChecklist = false
    }

    if (activeSuppliesCount === 0) {
      sendSuppliesChecklist = false
    }

    const actorName = getActorName(access.auth as Record<string, unknown>)

    const task = await prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
        data: {
          organizationId: booking.organizationId,
          propertyId: property.id,
          bookingId: booking.id,
          title,
          description,
          taskType,
          source: "booking",
          priority,
          status: "pending",
          scheduledDate,
          scheduledStartTime,
          scheduledEndTime,
          dueDate,
          alertEnabled,
          alertAt,
          notes,
          requiresPhotos: false,
          requiresChecklist: sendCleaningChecklist,
          requiresApproval: false,
          sendCleaningChecklist,
          sendSuppliesChecklist,
          usesCustomizedCleaningChecklist: false,
        },
        select: {
          id: true,
          organizationId: true,
          propertyId: true,
          bookingId: true,
          title: true,
          taskType: true,
          status: true,
          scheduledDate: true,
          scheduledStartTime: true,
          scheduledEndTime: true,
          dueDate: true,
          alertEnabled: true,
          alertAt: true,
          sendCleaningChecklist: true,
          sendSuppliesChecklist: true,
          createdAt: true,
        },
      })

      if (sendCleaningChecklist && primaryChecklistTemplate) {
        await tx.taskChecklistRun.create({
          data: {
            taskId: createdTask.id,
            templateId: primaryChecklistTemplate.id,
            status: "pending",
          },
        })
      }

      if (sendSuppliesChecklist) {
        await tx.taskSupplyRun.create({
          data: {
            taskId: createdTask.id,
            status: "pending",
          },
        })
      }

      if (defaultPartner?.id) {
        await tx.taskAssignment.create({
          data: {
            taskId: createdTask.id,
            partnerId: defaultPartner.id,
            status: "assigned",
            notes:
              language === "en"
                ? "Automatically assigned from the property's default partner."
                : "Αυτόματη ανάθεση από τον προεπιλεγμένο συνεργάτη του ακινήτου.",
          },
        })

        await tx.task.update({
          where: { id: createdTask.id },
          data: {
            status: "assigned",
          },
        })
      }

      await tx.activityLog.create({
        data: {
          organizationId: booking.organizationId,
          propertyId: property.id,
          bookingId: booking.id,
          taskId: createdTask.id,
          entityType: "task",
          entityId: createdTask.id,
          action: "task_created_from_booking",
          message:
            language === "en"
              ? `Task created from booking ${booking.externalBookingId}.`
              : `Δημιουργήθηκε εργασία από την κράτηση ${booking.externalBookingId}.`,
          actorType: "user",
          actorName,
          metadata: {
            bookingId: booking.id,
            externalBookingId: booking.externalBookingId,
            propertyId: property.id,
            propertyName: property.name,
            taskType,
            sendCleaningChecklist,
            sendSuppliesChecklist,
          },
        },
      })

      return tx.task.findUnique({
        where: { id: createdTask.id },
        select: {
          id: true,
          title: true,
          taskType: true,
          status: true,
          source: true,
          priority: true,
          scheduledDate: true,
          scheduledStartTime: true,
          scheduledEndTime: true,
          dueDate: true,
          alertEnabled: true,
          alertAt: true,
          createdAt: true,
          assignments: {
            select: {
              id: true,
              status: true,
              assignedAt: true,
              acceptedAt: true,
              partner: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  email: true,
                  specialty: true,
                  status: true,
                },
              },
            },
            orderBy: {
              assignedAt: "desc",
            },
            take: 1,
          },
        },
      })
    })

    return NextResponse.json(
      {
        success: true,
        message:
          language === "en"
            ? "Task created successfully."
            : "Η εργασία δημιουργήθηκε επιτυχώς.",
        task,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Booking create-task POST error:", error)

    return NextResponse.json(
      {
        error: "Αποτυχία δημιουργίας εργασίας.",
      },
      { status: 500 }
    )
  }
}