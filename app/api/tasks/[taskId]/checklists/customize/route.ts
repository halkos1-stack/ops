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

type ChecklistKey = "cleaning" | "supplies"

type SanitizedChecklistItem = {
  sourceId: string | null
  label: string
  description: string | null
  itemType: string
  sortOrder: number
  isRequired: boolean
  requiresPhoto: boolean
  optionsText: string | null
  category: string | null
  linkedSupplyItemId: string | null
  supplyUpdateMode: string | null
  opensIssueOnFail: boolean
  issueTypeOnFail: string | null
  issueSeverityOnFail: string | null
  failureValuesText: string | null
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toBoolean(value: unknown, fallback = false) {
  if (value === undefined || value === null) return fallback
  if (typeof value === "boolean") return value

  const text = String(value).trim().toLowerCase()
  if (["true", "1", "yes", "on"].includes(text)) return true
  if (["false", "0", "no", "off"].includes(text)) return false

  return fallback
}

function ensureArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

function normalizeChecklistKey(value: unknown): ChecklistKey | null {
  const text = String(value ?? "").trim().toLowerCase()

  if (text === "cleaning") return "cleaning"
  if (text === "supplies") return "supplies"

  return null
}

function normalizeItemType(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase()

  if (
    [
      "boolean",
      "yes_no",
      "pass_fail",
      "checkbox",
      "text",
      "number",
      "numeric",
      "select",
      "choice",
      "dropdown",
      "photo",
      "image",
    ].includes(text)
  ) {
    return text
  }

  return "boolean"
}

function normalizeIssueType(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase()

  if (["damage", "repair", "inspection", "cleaning", "general"].includes(text)) {
    return text
  }

  return "general"
}

function normalizeIssueSeverity(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase()

  if (["low", "medium", "high", "critical"].includes(text)) {
    return text
  }

  return "medium"
}

function sanitizeChecklistItems(value: unknown): SanitizedChecklistItem[] {
  const items = ensureArray(value)

  return items.map((raw, index) => {
    const item =
      typeof raw === "object" && raw !== null
        ? (raw as Record<string, unknown>)
        : {}

    const label = String(item.label ?? "").trim()
    if (!label) {
      throw new Error(`Το στοιχείο ${index + 1} χρειάζεται τίτλο.`)
    }

    const sortOrderRaw =
      item.sortOrder === undefined ||
      item.sortOrder === null ||
      item.sortOrder === ""
        ? index + 1
        : Number(item.sortOrder)

    const sortOrder = Number.isFinite(sortOrderRaw) ? sortOrderRaw : index + 1

    return {
      sourceId: toNullableString(item.sourceId),
      label,
      description: toNullableString(item.description),
      itemType: normalizeItemType(item.itemType),
      sortOrder,
      isRequired: toBoolean(item.isRequired, false),
      requiresPhoto: toBoolean(item.requiresPhoto, false),
      optionsText: toNullableString(item.optionsText),
      category: toNullableString(item.category),
      linkedSupplyItemId: toNullableString(item.linkedSupplyItemId),
      supplyUpdateMode: toNullableString(item.supplyUpdateMode),
      opensIssueOnFail: toBoolean(item.opensIssueOnFail, false),
      issueTypeOnFail: toNullableString(normalizeIssueType(item.issueTypeOnFail)),
      issueSeverityOnFail: toNullableString(
        normalizeIssueSeverity(item.issueSeverityOnFail)
      ),
      failureValuesText: toNullableString(item.failureValuesText),
    }
  })
}

async function getTaskBase(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      organizationId: true,
      propertyId: true,
      requiresChecklist: true,
      sendCleaningChecklist: true,
      sendSuppliesChecklist: true,
      checklistRun: {
        select: {
          id: true,
          templateId: true,
          status: true,
          startedAt: true,
          completedAt: true,
          answers: {
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              valueBoolean: true,
              valueText: true,
              valueNumber: true,
              valueSelect: true,
              notes: true,
              photoUrls: true,
            },
          },
        },
      },
      activityLogs: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          action: true,
          message: true,
          createdAt: true,
        },
      },
    },
  })
}

async function getPrimaryCleaningTemplate(
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
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      templateType: true,
      isPrimary: true,
      isActive: true,
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
          linkedSupplyItemId: true,
          supplyUpdateMode: true,
          issueTypeOnFail: true,
          issueSeverityOnFail: true,
          failureValuesText: true,
        },
      },
    },
  })
}

async function buildTaskResponse(taskId: string, req: NextRequest) {
  const taskRouteModule = await import("@/app/api/tasks/[taskId]/route")
  const taskResponse = await taskRouteModule.GET(req, {
    params: Promise.resolve({ taskId }),
  })

  const payload = await taskResponse.json()
  return payload?.task || null
}

function checklistRunHasRealAnswers(
  run:
    | {
        completedAt: Date | null
        startedAt: Date | null
        status: string
        answers: Array<{
          id: string
          createdAt: Date
          updatedAt: Date
          valueBoolean: boolean | null
          valueText: string | null
          valueNumber: number | null
          valueSelect: string | null
          notes: string | null
          photoUrls: unknown
        }>
      }
    | null
    | undefined
) {
  if (!run) return false

  const rawStatus = String(run.status ?? "").trim().toLowerCase()

  if (
    rawStatus === "completed" ||
    rawStatus === "submitted" ||
    rawStatus === "done" ||
    rawStatus === "ολοκληρώθηκε" ||
    rawStatus === "υποβλήθηκε"
  ) {
    return true
  }

  if (run.completedAt) return true

  if (!run.answers?.length) return false

  return run.answers.some((answer) => {
    if (answer.valueBoolean !== null && answer.valueBoolean !== undefined) return true
    if (answer.valueText && answer.valueText.trim()) return true
    if (answer.valueNumber !== null && answer.valueNumber !== undefined) return true
    if (answer.valueSelect && answer.valueSelect.trim()) return true
    if (answer.notes && answer.notes.trim()) return true
    if (Array.isArray(answer.photoUrls) && answer.photoUrls.length > 0) return true
    return false
  })
}

function activityShowsCleaningSubmission(
  activityLogs:
    | Array<{
        action: string | null
        message: string | null
      }>
    | undefined
) {
  if (!activityLogs?.length) return false

  return activityLogs.some((log) => {
    const action = String(log.action ?? "").trim().toUpperCase()
    const message = String(log.message ?? "").trim()

    if (action === "PARTNER_CHECKLIST_SUBMITTED") return true
    if (!message) return false

    return (
      /submitted the cleaning list from the portal/i.test(message) ||
      /submitted the checklist from the portal/i.test(message) ||
      /υπέβαλε τη λίστα καθαριότητας από το portal/i.test(message) ||
      /υπέβαλε τη λίστα από το portal/i.test(message) ||
      /υπέβαλε τη checklist από το portal/i.test(message)
    )
  })
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { taskId } = await context.params
    const body = await req.json().catch(() => ({}))

    const task = await getTaskBase(taskId)

    if (!task) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, task.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την εργασία." },
        { status: 403 }
      )
    }

    const checklistKey = normalizeChecklistKey(body.checklistKey)
    const isActive = toBoolean(body.isActive, true)

    if (!checklistKey) {
      return NextResponse.json(
        { error: "Μη έγκυρος τύπος λίστας." },
        { status: 400 }
      )
    }

    if (checklistKey === "supplies") {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          sendSuppliesChecklist: isActive,
        },
      })

      const updatedTask = await buildTaskResponse(taskId, req)

      return NextResponse.json({
        success: true,
        task: updatedTask,
        message:
          "Η ενεργοποίηση της λίστας αναλωσίμων αποθηκεύτηκε. Η δομή των επιμέρους αναλωσίμων συνεχίζει να προέρχεται από τα ενεργά αναλώσιμα του ακινήτου.",
      })
    }

    const cleaningAlreadySubmitted =
      checklistRunHasRealAnswers(task.checklistRun) ||
      activityShowsCleaningSubmission(task.activityLogs)

    if (cleaningAlreadySubmitted) {
      return NextResponse.json(
        {
          error:
            "Η λίστα καθαριότητας έχει ήδη υποβληθεί για αυτή την εργασία. Δεν επιτρέπεται νέα επεξεργασία, γιατί θα χαθεί το ιστορικό της υποβολής.",
        },
        { status: 409 }
      )
    }

    const items = sanitizeChecklistItems(body.items)

    const primaryTemplate = await getPrimaryCleaningTemplate(
      task.organizationId,
      task.propertyId
    )

    if (!primaryTemplate) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε βασική λίστα καθαριότητας για το ακίνητο." },
        { status: 400 }
      )
    }

    if (!isActive) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          requiresChecklist: false,
          sendCleaningChecklist: false,
        },
      })

      if (task.checklistRun?.id) {
        await prisma.taskChecklistAnswer.deleteMany({
          where: {
            checklistRunId: task.checklistRun.id,
          },
        })

        await prisma.taskChecklistRun.delete({
          where: {
            taskId,
          },
        })
      }

      const updatedTask = await buildTaskResponse(taskId, req)

      return NextResponse.json({
        success: true,
        task: updatedTask,
        message:
          "Η λίστα καθαριότητας απενεργοποιήθηκε μόνο για αυτή την εργασία.",
      })
    }

    const createdTemplate = await prisma.propertyChecklistTemplate.create({
      data: {
        organizationId: task.organizationId,
        propertyId: task.propertyId,
        title: `${primaryTemplate.title || "Λίστα καθαριότητας"} · Εργασία ${taskId}`,
        description: primaryTemplate.description,
        templateType: primaryTemplate.templateType || "support",
        isPrimary: false,
        isActive: false,
        items: {
          create: items.map((item, index) => ({
            label: item.label,
            description: item.description,
            itemType: item.itemType,
            isRequired: item.isRequired,
            sortOrder: index + 1,
            category: item.category || "inspection",
            requiresPhoto: item.requiresPhoto,
            opensIssueOnFail: item.opensIssueOnFail,
            optionsText: item.optionsText,
            linkedSupplyItemId: item.linkedSupplyItemId,
            supplyUpdateMode: item.supplyUpdateMode ?? undefined,
            issueTypeOnFail: item.issueTypeOnFail,
            issueSeverityOnFail: item.issueSeverityOnFail,
            failureValuesText: item.failureValuesText,
          })),
        },
      },
      select: {
        id: true,
      },
    })

    await prisma.task.update({
      where: { id: taskId },
      data: {
        requiresChecklist: true,
        sendCleaningChecklist: true,
      },
    })

    if (!task.checklistRun?.id) {
      await prisma.taskChecklistRun.create({
        data: {
          taskId,
          templateId: createdTemplate.id,
          status: "pending",
        },
      })
    } else {
      await prisma.taskChecklistRun.update({
        where: {
          taskId,
        },
        data: {
          templateId: createdTemplate.id,
          status: "pending",
          startedAt: null,
          completedAt: null,
        },
      })
    }

    const updatedTask = await buildTaskResponse(taskId, req)

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message:
        "Οι αλλαγές της λίστας καθαριότητας αποθηκεύτηκαν μόνο για αυτή την εργασία.",
    })
  } catch (error) {
    console.error(
      "PATCH /api/tasks/[taskId]/checklists/customize error:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία αποθήκευσης λίστας εργασίας."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}