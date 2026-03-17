import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildTenantWhere } from "@/lib/route-access"
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

function buildDefaultTaskTitle(params: {
  taskType: string
  propertyName?: string | null
  checkOutDate: Date
}) {
  const date = params.checkOutDate.toISOString().slice(0, 10)

  if (params.taskType === "cleaning") {
    return `Καθαρισμός μετά από check-out - ${params.propertyName || date}`
  }

  if (params.taskType === "inspection") {
    return `Επιθεώρηση ακινήτου - ${params.propertyName || date}`
  }

  if (params.taskType === "maintenance") {
    return `Τεχνική εργασία - ${params.propertyName || date}`
  }

  return `Εργασία από κράτηση - ${params.propertyName || date}`
}

export async function POST(req: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccessWithDevBypass(req)
  if (!access.ok) return access.response

  try {
    const { id } = await context.params
    const body = await req.json()

    const booking = await prisma.booking.findFirst({
      where: buildTenantWhere(access.auth, { id }),
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
        { error: "Η κράτηση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!booking.propertyId || !booking.property) {
      return NextResponse.json(
        { error: "Η κράτηση δεν έχει αντιστοιχιστεί σε ακίνητο." },
        { status: 400 }
      )
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Δεν μπορεί να δημιουργηθεί εργασία από ακυρωμένη κράτηση." },
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

    const activeSuppliesCount = await countActivePropertySupplies(booking.property.id)

    const sendCleaningChecklist =
      toBooleanValue(
        body.sendCleaningChecklist,
        isCleaningTask && Boolean(primaryTemplate)
      )

    const sendSuppliesChecklist =
      toBooleanValue(
        body.sendSuppliesChecklist,
        isCleaningTask && activeSuppliesCount > 0
      )

    const requiresPhotos = toBooleanValue(body.requiresPhotos, false)
    const requiresApproval = toBooleanValue(body.requiresApproval, false)

    const scheduledDate = parseDateOnly(body.scheduledDate, booking.checkOutDate)
    if (!scheduledDate) {
      return NextResponse.json(
        { error: "Μη έγκυρη ημερομηνία εργασίας." },
        { status: 400 }
      )
    }

    const dueDate = parseDateOnly(body.dueDate, booking.checkOutDate)
    if (!dueDate) {
      return NextResponse.json(
        { error: "Μη έγκυρη προθεσμία εργασίας." },
        { status: 400 }
      )
    }

    const alertEnabled = toBooleanValue(body.alertEnabled, false)
    const alertAt = alertEnabled ? parseDateTimeValue(body.alertAt) : null

    if (alertEnabled && !alertAt) {
      return NextResponse.json(
        { error: "Έχεις ενεργοποιήσει alert αλλά δεν έχεις ορίσει ώρα ειδοποίησης." },
        { status: 400 }
      )
    }

    const title =
      toNullableString(body.title) ||
      buildDefaultTaskTitle({
        taskType,
        propertyName: booking.property.name,
        checkOutDate: booking.checkOutDate,
      })

    const description =
      toNullableString(body.description) ||
      [
        "Εργασία που δημιουργήθηκε χειροκίνητα από κράτηση.",
        `Πηγή: ${booking.sourcePlatform}`,
        `Κωδικός κράτησης: ${booking.externalBookingId}`,
        booking.guestName ? `Επισκέπτης: ${booking.guestName}` : null,
        `Check-in: ${booking.checkInDate.toISOString().slice(0, 10)}`,
        `Check-out: ${booking.checkOutDate.toISOString().slice(0, 10)}`,
      ]
        .filter(Boolean)
        .join("\n")

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
        scheduledStartTime: toNullableString(body.scheduledStartTime) ?? booking.checkOutTime,
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
        message: `Δημιουργήθηκε εργασία ${task.title}.`,
        payload: {
          taskId: task.id,
          taskType: task.taskType,
          title: task.title,
          scheduledDate: task.scheduledDate,
          scheduledStartTime: task.scheduledStartTime,
          scheduledEndTime: task.scheduledEndTime,
          dueDate: task.dueDate,
          alertEnabled: task.alertEnabled,
          alertAt: task.alertAt,
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