import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccessWithDevBypass } from "@/lib/dev-api-access"
import {
  countActivePropertySupplies,
  findPrimaryChecklistTemplate,
  syncTaskChecklistRun,
  syncTaskSupplyRun,
} from "@/lib/tasks/task-run-sync"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type AppLanguage = "el" | "en"

type AuthLike = {
  systemRole?: "SUPER_ADMIN" | "USER"
  organizationId?: string | null
}

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

function parseDateOnly(value: unknown, fallback?: Date | null) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback ?? null
  }

  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date
}

function parseDateTimeValue(value: unknown) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null
  }

  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10)
}

function buildBookingWhere(auth: AuthLike, id: string): Prisma.BookingWhereInput {
  if (auth.systemRole === "SUPER_ADMIN") {
    return { id }
  }

  if (auth.organizationId) {
    return {
      id,
      organizationId: auth.organizationId,
    }
  }

  return {
    id: "__no_results__",
  }
}

function buildDefaultTaskTitle(params: {
  language: AppLanguage
  taskType: string
  propertyName?: string | null
  checkOutDate: Date
}) {
  const { language, taskType, propertyName, checkOutDate } = params
  const fallbackLabel = propertyName || formatDateOnly(checkOutDate)

  if (language === "en") {
    if (taskType === "cleaning") {
      return `Cleaning after check-out - ${fallbackLabel}`
    }

    if (taskType === "inspection") {
      return `Property inspection - ${fallbackLabel}`
    }

    if (taskType === "maintenance") {
      return `Maintenance task - ${fallbackLabel}`
    }

    if (taskType === "repair") {
      return `Repair task - ${fallbackLabel}`
    }

    if (taskType === "damage") {
      return `Damage check - ${fallbackLabel}`
    }

    if (taskType === "supplies") {
      return `Supplies task - ${fallbackLabel}`
    }

    return `Task from booking - ${fallbackLabel}`
  }

  if (taskType === "cleaning") {
    return `Καθαρισμός μετά από check-out - ${fallbackLabel}`
  }

  if (taskType === "inspection") {
    return `Επιθεώρηση ακινήτου - ${fallbackLabel}`
  }

  if (taskType === "maintenance") {
    return `Τεχνική εργασία - ${fallbackLabel}`
  }

  if (taskType === "repair") {
    return `Βλάβη - ${fallbackLabel}`
  }

  if (taskType === "damage") {
    return `Έλεγχος ζημιάς - ${fallbackLabel}`
  }

  if (taskType === "supplies") {
    return `Εργασία αναλωσίμων - ${fallbackLabel}`
  }

  return `Εργασία από κράτηση - ${fallbackLabel}`
}

function buildDefaultTaskDescription(params: {
  language: AppLanguage
  sourcePlatform: string
  externalBookingId: string
  guestName?: string | null
  checkInDate: Date
  checkOutDate: Date
}) {
  const {
    language,
    sourcePlatform,
    externalBookingId,
    guestName,
    checkInDate,
    checkOutDate,
  } = params

  if (language === "en") {
    return [
      "Task created manually from booking.",
      `Source: ${sourcePlatform}`,
      `Booking code: ${externalBookingId}`,
      guestName ? `Guest: ${guestName}` : null,
      `Check-in: ${formatDateOnly(checkInDate)}`,
      `Check-out: ${formatDateOnly(checkOutDate)}`,
    ]
      .filter(Boolean)
      .join("\n")
  }

  return [
    "Εργασία που δημιουργήθηκε χειροκίνητα από κράτηση.",
    `Πηγή: ${sourcePlatform}`,
    `Κωδικός κράτησης: ${externalBookingId}`,
    guestName ? `Επισκέπτης: ${guestName}` : null,
    `Άφιξη: ${formatDateOnly(checkInDate)}`,
    `Αναχώρηση: ${formatDateOnly(checkOutDate)}`,
  ]
    .filter(Boolean)
    .join("\n")
}

export async function POST(req: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccessWithDevBypass(req)
  if (!access.ok) return access.response

  try {
    const { id } = await context.params
    const body = await req.json()

    const language = normalizeLanguage(body.language)

    const booking = await prisma.booking.findFirst({
      where: buildBookingWhere(access.auth, id),
      include: {
        property: {
          select: {
            id: true,
            name: true,
            organizationId: true,
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "Booking was not found."
              : "Η κράτηση δεν βρέθηκε.",
        },
        { status: 404 }
      )
    }

    if (!booking.propertyId || !booking.property) {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "The booking is not matched with a property."
              : "Η κράτηση δεν έχει αντιστοιχιστεί σε ακίνητο.",
        },
        { status: 400 }
      )
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "A task cannot be created from a cancelled booking."
              : "Δεν μπορεί να δημιουργηθεί εργασία από ακυρωμένη κράτηση.",
        },
        { status: 400 }
      )
    }

    const taskType = String(body.taskType || "cleaning").trim().toLowerCase()
    const priority = String(body.priority || "normal").trim().toLowerCase()
    const isCleaningTask = taskType === "cleaning"

    const primaryTemplate = await findPrimaryChecklistTemplate(
      booking.organizationId,
      booking.property.id
    )

    const activeSuppliesCount = await countActivePropertySupplies(
      booking.property.id
    )

    const sendCleaningChecklist = toBooleanValue(
      body.sendCleaningChecklist,
      isCleaningTask && Boolean(primaryTemplate)
    )

    const sendSuppliesChecklist = toBooleanValue(
      body.sendSuppliesChecklist,
      isCleaningTask && activeSuppliesCount > 0
    )

    const requiresPhotos = toBooleanValue(body.requiresPhotos, false)
    const requiresApproval = toBooleanValue(body.requiresApproval, false)

    const scheduledDate = parseDateOnly(body.scheduledDate, booking.checkOutDate)
    if (!scheduledDate) {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "Invalid task date."
              : "Μη έγκυρη ημερομηνία εργασίας.",
        },
        { status: 400 }
      )
    }

    const dueDate = parseDateOnly(body.dueDate, booking.checkOutDate)
    if (!dueDate) {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "Invalid due date."
              : "Μη έγκυρη προθεσμία εργασίας.",
        },
        { status: 400 }
      )
    }

    const alertEnabled = toBooleanValue(body.alertEnabled, false)
    const alertAt = alertEnabled ? parseDateTimeValue(body.alertAt) : null

    if (alertEnabled && !alertAt) {
      return NextResponse.json(
        {
          error:
            language === "en"
              ? "Alert is enabled but no alert time was provided."
              : "Έχεις ενεργοποιήσει alert αλλά δεν έχεις ορίσει ώρα ειδοποίησης.",
        },
        { status: 400 }
      )
    }

    const title =
      toNullableString(body.title) ||
      buildDefaultTaskTitle({
        language,
        taskType,
        propertyName: booking.property.name,
        checkOutDate: booking.checkOutDate,
      })

    const description =
      toNullableString(body.description) ||
      buildDefaultTaskDescription({
        language,
        sourcePlatform: booking.sourcePlatform,
        externalBookingId: booking.externalBookingId,
        guestName: booking.guestName,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
      })

    const task = await prisma.task.create({
      data: {
        organizationId: booking.organizationId,
        propertyId: booking.property.id,
        bookingId: booking.id,
        title,
        description,
        taskType,
        source: "booking",
        priority,
        status: "pending",
        scheduledDate,
        scheduledStartTime:
          toNullableString(body.scheduledStartTime) ?? booking.checkOutTime,
        scheduledEndTime: toNullableString(body.scheduledEndTime),
        dueDate,
        requiresPhotos,
        requiresChecklist: sendCleaningChecklist,
        requiresApproval,
        sendCleaningChecklist,
        sendSuppliesChecklist,
        usesCustomizedCleaningChecklist: false,
        alertEnabled,
        alertAt,
        notes: toNullableString(body.notes) ?? booking.notes,
      },
    })

    await syncTaskChecklistRun({
      taskId: task.id,
      organizationId: booking.organizationId,
      propertyId: booking.property.id,
      sendCleaningChecklist,
    })

    await syncTaskSupplyRun({
      taskId: task.id,
      propertyId: booking.property.id,
      sendSuppliesChecklist,
    })

    await prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        lastProcessedAt: new Date(),
        lastError: null,
      },
    })

    await prisma.bookingSyncEvent.create({
      data: {
        bookingId: booking.id,
        organizationId: booking.organizationId,
        eventType: "TASK_CREATED_FROM_BOOKING",
        sourcePlatform: booking.sourcePlatform,
        resultStatus: booking.syncStatus,
        message:
          language === "en"
            ? `Task ${task.title} was created.`
            : `Δημιουργήθηκε εργασία ${task.title}.`,
        payload: {
          taskId: task.id,
          taskType: task.taskType,
          title: task.title,
          scheduledDate: task.scheduledDate.toISOString(),
          scheduledStartTime: task.scheduledStartTime,
          scheduledEndTime: task.scheduledEndTime,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          alertEnabled: task.alertEnabled,
          alertAt: task.alertAt ? task.alertAt.toISOString() : null,
          language,
        },
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
    console.error("Create task from booking POST error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία δημιουργίας εργασίας από κράτηση.",
      },
      { status: 500 }
    )
  }
}