import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  buildTenantWhere,
  canAccessOrganization,
  requireApiAppAccess,
  type RouteAccessContext,
} from "@/lib/route-access"
import {
  filterCanonicalOperationalTasks,
} from "@/lib/tasks/ops-task-contract"
import {
  findPrimaryCleaningTemplate,
  findPrimaryIssueTemplate,
  countActivePropertySupplies,
  syncTaskChecklistRun,
  syncTaskSupplyRun,
  syncTaskIssueRun,
} from "@/lib/tasks/task-run-sync"
import {
  taskDetailsInclude,
  shapeTaskForResponse,
} from "@/lib/tasks/task-response-builder"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"

// ─── Local parsing helpers ────────────────────────────────────────────────────

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toNullableTime(value: unknown) {
  const text = toNullableString(value)
  if (!text) return null
  const normalized = text.slice(0, 5)
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized) ? normalized : null
}

function toOptionalDate(value: unknown) {
  const text = toNullableString(value)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function endOfDay(value: string) {
  const date = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(date.getTime()) ? null : date
}

// ─── Query builder ────────────────────────────────────────────────────────────

function buildTaskWhere(
  auth: RouteAccessContext,
  req: NextRequest
): Prisma.TaskWhereInput {
  const searchParams = req.nextUrl.searchParams
  const where: Prisma.TaskWhereInput = {
    ...buildTenantWhere(auth),
  }

  const propertyId = searchParams.get("propertyId")?.trim()
  const bookingId = searchParams.get("bookingId")?.trim()
  const openOnly = searchParams.get("openOnly") === "true"
  const status = searchParams.get("status")?.trim()
  const dateFrom = searchParams.get("dateFrom")?.trim()
  const dateTo = searchParams.get("dateTo")?.trim()

  if (propertyId) where.propertyId = propertyId
  if (bookingId) where.bookingId = bookingId

  if (status) {
    where.status = status
  } else if (openOnly) {
    where.status = {
      in: [
        "new",
        "pending",
        "assigned",
        "waiting_acceptance",
        "accepted",
        "in_progress",
      ],
    }
  }

  if (dateFrom || dateTo) {
    const scheduledDate: Prisma.DateTimeFilter = {}
    if (dateFrom) {
      const from = startOfDay(dateFrom)
      if (from) scheduledDate.gte = from
    }
    if (dateTo) {
      const to = endOfDay(dateTo)
      if (to) scheduledDate.lte = to
    }
    where.scheduledDate = scheduledDate
  }

  return where
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const where = buildTaskWhere(access.auth, req)

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
      include: taskDetailsInclude,
    })

    const includeInvalidTasks =
      req.nextUrl.searchParams.get("view") === "audit" ||
      req.nextUrl.searchParams.get("includeInvalid") === "true"
    const invalidOnly = req.nextUrl.searchParams.get("invalidOnly") === "true"
    const shapedTasks = tasks.map(shapeTaskForResponse)
    const canonicalTasks = filterCanonicalOperationalTasks(shapedTasks)

    if (invalidOnly) {
      return NextResponse.json(
        shapedTasks.filter((task) => task.opsValidity.isCanonicalOperational !== true)
      )
    }

    if (includeInvalidTasks) {
      return NextResponse.json(shapedTasks)
    }

    return NextResponse.json(canonicalTasks)
  } catch (error) {
    console.error("Tasks GET error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης εργασιών." },
      { status: 500 }
    )
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const body = await req.json()
    const auth = access.auth

    // ─── Organization access ─────────────────────────────────────────────────
    const organizationId =
      toNullableString(body.organizationId) || auth.organizationId || null

    if (!organizationId) {
      return NextResponse.json(
        { error: "Λείπει organizationId για δημιουργία εργασίας." },
        { status: 400 }
      )
    }

    if (!canAccessOrganization(auth, organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχεις πρόσβαση σε αυτόν τον οργανισμό." },
        { status: 403 }
      )
    }

    // ─── Required fields ──────────────────────────────────────────────────────
    const propertyId = String(body.propertyId || "").trim()
    const bookingId = toNullableString(body.bookingId)
    const taskSource = (toNullableString(body.source) || "manual").toLowerCase()
    const title = String(body.title || "").trim()
    const taskType = String(body.taskType || "").trim()
    const scheduledDateValue = toOptionalDate(body.scheduledDate)

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

    if (!scheduledDateValue) {
      return NextResponse.json(
        {
          error:
            "Το πεδίο scheduledDate είναι υποχρεωτικό και πρέπει να είναι έγκυρο.",
        },
        { status: 400 }
      )
    }

    if (taskSource === "booking" && !bookingId) {
      return NextResponse.json(
        {
          error: 'Οι εργασίες με source "booking" απαιτούν έγκυρο bookingId.',
        },
        { status: 400 }
      )
    }

    // ─── Checklist flags ──────────────────────────────────────────────────────
    const requiresPhotos = Boolean(body.requiresPhotos)
    const requiresApproval = Boolean(body.requiresApproval)

    const sendCleaningChecklist =
      body.sendCleaningChecklist === undefined
        ? true
        : Boolean(body.sendCleaningChecklist)
    const sendSuppliesChecklist = Boolean(body.sendSuppliesChecklist)
    const sendIssuesChecklist = Boolean(body.sendIssuesChecklist)

    const usesCustomizedCleaningChecklist = Boolean(body.usesCustomizedCleaningChecklist)
    const usesCustomizedSuppliesChecklist = Boolean(body.usesCustomizedSuppliesChecklist)
    const usesCustomizedIssuesChecklist = Boolean(body.usesCustomizedIssuesChecklist)

    // ─── Alert ────────────────────────────────────────────────────────────────
    const alertEnabled = Boolean(body.alertEnabled)
    let alertAt: Date | null = null

    if (alertEnabled) {
      alertAt = toOptionalDate(body.alertAt)
      if (!alertAt) {
        return NextResponse.json(
          {
            error:
              "Το alert είναι ενεργό αλλά δεν έχει οριστεί έγκυρη ώρα alert.",
          },
          { status: 400 }
        )
      }
    }

    // ─── Entity validation ────────────────────────────────────────────────────
    const property = await prisma.property.findFirst({
      where: { id: propertyId, organizationId },
      select: { id: true, defaultPartnerId: true },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε ή δεν ανήκει στον οργανισμό." },
        { status: 404 }
      )
    }

    if (bookingId) {
      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, organizationId, propertyId },
        select: { id: true },
      })

      if (!booking) {
        return NextResponse.json(
          {
            error:
              "Η κράτηση δεν βρέθηκε ή δεν ανήκει στο ίδιο ακίνητο και οργανισμό.",
          },
          { status: 400 }
        )
      }
    }

    // ─── Checklist prerequisite validation ───────────────────────────────────
    if (sendCleaningChecklist) {
      const primaryTemplate = await findPrimaryCleaningTemplate(organizationId, propertyId)
      if (!primaryTemplate) {
        return NextResponse.json(
          { error: "Το ακίνητο δεν έχει ενεργή βασική λίστα καθαριότητας." },
          { status: 400 }
        )
      }
    }

    if (sendSuppliesChecklist) {
      const activeSuppliesCount = await countActivePropertySupplies(propertyId)
      if (activeSuppliesCount === 0) {
        return NextResponse.json(
          {
            error:
              "Το ακίνητο δεν έχει ενεργά αναλώσιμα για αποστολή λίστας αναλωσίμων.",
          },
          { status: 400 }
        )
      }
    }

    if (sendIssuesChecklist) {
      const primaryIssueTemplate = await findPrimaryIssueTemplate(organizationId, propertyId)
      if (!primaryIssueTemplate) {
        return NextResponse.json(
          {
            error: "Το ακίνητο δεν έχει ενεργή βασική λίστα βλαβών / ζημιών.",
          },
          { status: 400 }
        )
      }
    }

    // ─── Task creation ────────────────────────────────────────────────────────
    const task = await prisma.task.create({
      data: {
        organizationId,
        propertyId,
        bookingId,
        title,
        description: toNullableString(body.description),
        taskType,
        source: taskSource,
        priority: toNullableString(body.priority) || "normal",
        status: toNullableString(body.status) || "pending",
        scheduledDate: scheduledDateValue,
        scheduledStartTime: toNullableTime(body.scheduledStartTime),
        scheduledEndTime: toNullableTime(body.scheduledEndTime),
        dueDate: toOptionalDate(body.dueDate),
        requiresPhotos,
        requiresChecklist: sendCleaningChecklist,
        requiresApproval,
        sendCleaningChecklist,
        sendSuppliesChecklist,
        sendIssuesChecklist,
        usesCustomizedCleaningChecklist,
        usesCustomizedSuppliesChecklist,
        usesCustomizedIssuesChecklist,
        alertEnabled,
        alertAt,
        notes: toNullableString(body.notes),
      },
    })

    // ─── Sync checklist runs ──────────────────────────────────────────────────
    await syncTaskChecklistRun({
      taskId: task.id,
      organizationId,
      propertyId,
      sendCleaningChecklist,
    })

    await syncTaskSupplyRun({
      taskId: task.id,
      propertyId,
      sendSuppliesChecklist,
    })

    await syncTaskIssueRun({
      taskId: task.id,
      organizationId,
      propertyId,
      sendIssuesChecklist,
    })

    // ─── Activity log ─────────────────────────────────────────────────────────
    await prisma.activityLog.create({
      data: {
        organizationId,
        propertyId,
        taskId: task.id,
        entityType: "TASK",
        entityId: task.id,
        action: "TASK_CREATED",
        message: `Νέα εργασία δημιουργήθηκε: "${task.title}"`,
        actorType: "manager",
        actorName: "Διαχειριστής",
        metadata: {
          taskType,
          source: taskSource,
          status: task.status,
          scheduledDate: scheduledDateValue,
        },
      },
    })

    // ─── Readiness refresh ────────────────────────────────────────────────────
    // Νέα εργασία → αλλάζει το operational status του ακινήτου.
    await refreshPropertyReadiness(propertyId)

    // ─── Response ─────────────────────────────────────────────────────────────
    const fullTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: taskDetailsInclude,
    })

    const shapedTask = fullTask ? shapeTaskForResponse(fullTask) : null

    return NextResponse.json(
      { success: true, task: shapedTask },
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
