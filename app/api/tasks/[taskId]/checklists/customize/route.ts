
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiAppAccess,
  canAccessOrganization,
} from "@/lib/route-access"
import { syncTaskSupplyRun } from "@/lib/tasks/task-run-sync"

type RouteContext = {
  params: Promise<{
    taskId: string
  }>
}

type ChecklistKey = "cleaning" | "supplies" | "issues"

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
  if (text === "issues") return "issues"

  return null
}

function normalizeItemType(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase()

  if (["boolean", "text", "number", "select", "choice", "photo"].includes(text)) {
    return text
  }

  return "boolean"
}

function sanitizeChecklistItems(value: unknown): SanitizedChecklistItem[] {
  const items = ensureArray(value)

  return items.map((raw, index) => {
    const item = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {}
    const label = String(item.label ?? "").trim()

    if (!label) {
      throw new Error(`Το στοιχείο ${index + 1} χρειάζεται τίτλο.`)
    }

    return {
      sourceId: toNullableString(item.sourceId),
      label,
      description: toNullableString(item.description),
      itemType: normalizeItemType(item.itemType),
      sortOrder: index + 1,
      isRequired: toBoolean(item.isRequired, false),
      requiresPhoto: toBoolean(item.requiresPhoto, false),
      optionsText: toNullableString(item.optionsText),
      category: toNullableString(item.category),
    }
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

async function getTaskBase(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      organizationId: true,
      propertyId: true,
      requiresChecklist: true,
      sendCleaningChecklist: true,
      sendSuppliesChecklist: true,
      sendIssuesChecklist: true,
      checklistRun: {
        select: {
          id: true,
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
      issueRun: {
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          answers: {
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              reportType: true,
              title: true,
              description: true,
              locationText: true,
              photoUrls: true,
              createdIssueId: true,
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

async function getPrimaryCleaningTemplate(organizationId: string, propertyId: string) {
  return prisma.propertyChecklistTemplate.findFirst({
    where: {
      organizationId,
      propertyId,
      isPrimary: true,
      isActive: true,
      NOT: {
        templateType: "supplies",
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      templateType: true,
    },
  })
}

async function getPrimaryIssueTemplate(organizationId: string, propertyId: string) {
  return prisma.propertyIssueTemplate.findFirst({
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
    },
  })
}

function cleaningRunHasRealAnswers(
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
  if (["completed", "submitted", "done", "ολοκληρώθηκε", "υποβλήθηκε"].includes(rawStatus)) {
    return true
  }

  if (run.completedAt) return true

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

function issueRunHasRealAnswers(
  run:
    | {
        completedAt: Date | null
        startedAt: Date | null
        status: string
        answers: Array<{
          id: string
          createdAt: Date
          updatedAt: Date
          reportType: string | null
          title: string | null
          description: string | null
          locationText: string | null
          photoUrls: unknown
          createdIssueId: string | null
        }>
      }
    | null
    | undefined
) {
  if (!run) return false

  const rawStatus = String(run.status ?? "").trim().toLowerCase()
  if (["completed", "submitted", "done", "ολοκληρώθηκε", "υποβλήθηκε"].includes(rawStatus)) {
    return true
  }

  if (run.completedAt) return true

  return run.answers.some((answer) => {
    if (answer.reportType && answer.reportType.trim()) return true
    if (answer.title && answer.title.trim()) return true
    if (answer.description && answer.description.trim()) return true
    if (answer.locationText && answer.locationText.trim()) return true
    if (answer.createdIssueId) return true
    if (Array.isArray(answer.photoUrls) && answer.photoUrls.length > 0) return true
    return false
  })
}

function activityShowsCleaningSubmission(activityLogs: Array<{ action: string | null; message: string | null }> | undefined) {
  if (!activityLogs?.length) return false

  return activityLogs.some((log) => {
    const action = String(log.action ?? "").trim().toUpperCase()
    const message = String(log.message ?? "").trim()

    if (action === "PARTNER_CHECKLIST_SUBMITTED") return true

    return (
      /submitted the cleaning list from the portal/i.test(message) ||
      /submitted the checklist from the portal/i.test(message) ||
      /υπέβαλε τη λίστα καθαριότητας από το portal/i.test(message) ||
      /υπέβαλε τη λίστα από το portal/i.test(message) ||
      /υπέβαλε τη checklist από το portal/i.test(message)
    )
  })
}

function activityShowsIssueSubmission(activityLogs: Array<{ action: string | null; message: string | null }> | undefined) {
  if (!activityLogs?.length) return false

  return activityLogs.some((log) => {
    const action = String(log.action ?? "").trim().toUpperCase()
    const message = String(log.message ?? "").trim()

    if (action === "PARTNER_ISSUES_SUBMITTED") return true

    return (
      /submitted the issues list from the portal/i.test(message) ||
      /submitted the issues and damages list from the portal/i.test(message) ||
      /υπέβαλε τη λίστα βλαβών από το portal/i.test(message) ||
      /υπέβαλε τη λίστα βλαβών και ζημιών από το portal/i.test(message)
    )
  })
}

async function replaceCleaningRunItems(runId: string, items: SanitizedChecklistItem[]) {
  await prisma.taskChecklistAnswer.deleteMany({
    where: {
      checklistRunId: runId,
    },
  })

  await prisma.taskChecklistRunItem.deleteMany({
    where: {
      checklistRunId: runId,
    },
  })

  if (items.length === 0) return

  await prisma.taskChecklistRunItem.createMany({
    data: items.map((item) => ({
      checklistRunId: runId,
      propertyTemplateItemId: item.sourceId,
      label: item.label,
      description: item.description,
      itemType: item.itemType,
      isRequired: item.isRequired,
      sortOrder: item.sortOrder,
      category: item.category || "inspection",
      requiresPhoto: item.requiresPhoto,
      opensIssueOnFail: false,
      optionsText: item.optionsText,
      issueTypeOnFail: null,
      issueSeverityOnFail: null,
      failureValuesText: null,
      linkedSupplyItemId: null,
      linkedSupplyItemName: null,
      linkedSupplyItemNameEl: null,
      linkedSupplyItemNameEn: null,
      supplyUpdateMode: "none",
      supplyQuantity: null,
    })),
  })
}

async function replaceIssueRunItems(runId: string, items: SanitizedChecklistItem[]) {
  await prisma.taskIssueAnswer.deleteMany({
    where: {
      issueRunId: runId,
    },
  })

  await prisma.taskIssueRunItem.deleteMany({
    where: {
      issueRunId: runId,
    },
  })

  if (items.length === 0) return

  await prisma.taskIssueRunItem.createMany({
    data: items.map((item) => ({
      issueRunId: runId,
      propertyTemplateItemId: item.sourceId,
      label: item.label,
      description: item.description,
      sortOrder: item.sortOrder,
      itemType: "issue_check",
      isRequired: item.isRequired,
      allowsIssue: true,
      allowsDamage: true,
      defaultIssueType: "repair",
      defaultSeverity: "medium",
      requiresPhoto: item.requiresPhoto,
      affectsHostingByDefault: false,
      urgentByDefault: false,
      locationHint: item.description,
    })),
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
      return NextResponse.json({ error: "Η εργασία δεν βρέθηκε." }, { status: 404 })
    }

    if (!canAccessOrganization(auth, task.organizationId)) {
      return NextResponse.json({ error: "Δεν έχετε πρόσβαση σε αυτή την εργασία." }, { status: 403 })
    }

    const checklistKey = normalizeChecklistKey(body.checklistKey)
    const isActive = toBoolean(body.isActive, true)

    if (!checklistKey) {
      return NextResponse.json({ error: "Μη έγκυρος τύπος λίστας." }, { status: 400 })
    }

    if (checklistKey === "supplies") {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          sendSuppliesChecklist: isActive,
          usesCustomizedSuppliesChecklist: false,
        },
      })

      await syncTaskSupplyRun({
        taskId,
        propertyId: task.propertyId,
        sendSuppliesChecklist: isActive,
      })

      const updatedTask = await buildTaskResponse(taskId, req)

      return NextResponse.json({
        success: true,
        task: updatedTask,
        message: isActive
          ? "Η λίστα αναλωσίμων ενεργοποιήθηκε για αυτή την εργασία. Η δομή της συνεχίζει να προέρχεται από τα ενεργά αναλώσιμα του ακινήτου."
          : "Η λίστα αναλωσίμων απενεργοποιήθηκε μόνο για αυτή την εργασία.",
      })
    }

    const items = sanitizeChecklistItems(body.items)

    if (checklistKey === "cleaning") {
      const cleaningAlreadySubmitted =
        cleaningRunHasRealAnswers(task.checklistRun) ||
        activityShowsCleaningSubmission(task.activityLogs)

      if (cleaningAlreadySubmitted) {
        return NextResponse.json(
          {
            error:
              "Η λίστα καθαριότητας έχει ήδη υποβληθεί για αυτή την εργασία. Δεν επιτρέπεται νέα επεξεργασία γιατί θα χαθεί το ιστορικό της υποβολής.",
          },
          { status: 409 }
        )
      }

      if (!isActive) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            requiresChecklist: false,
            sendCleaningChecklist: false,
            usesCustomizedCleaningChecklist: false,
          },
        })

        if (task.checklistRun?.id) {
          await prisma.taskChecklistAnswer.deleteMany({ where: { checklistRunId: task.checklistRun.id } })
          await prisma.taskChecklistRunItem.deleteMany({ where: { checklistRunId: task.checklistRun.id } })
          await prisma.taskChecklistRun.delete({ where: { taskId } })
        }

        const updatedTask = await buildTaskResponse(taskId, req)

        return NextResponse.json({
          success: true,
          task: updatedTask,
          message: "Η λίστα καθαριότητας απενεργοποιήθηκε μόνο για αυτή την εργασία.",
        })
      }

      const primaryTemplate = await getPrimaryCleaningTemplate(task.organizationId, task.propertyId)

      if (!primaryTemplate) {
        return NextResponse.json(
          { error: "Δεν βρέθηκε βασική λίστα καθαριότητας για το ακίνητο." },
          { status: 400 }
        )
      }

      const customTemplate = await prisma.propertyChecklistTemplate.create({
        data: {
          organizationId: task.organizationId,
          propertyId: task.propertyId,
          title: `${primaryTemplate.title || "Λίστα καθαριότητας"} · Εργασία ${taskId}`,
          description: primaryTemplate.description,
          templateType: primaryTemplate.templateType || "task_custom",
          isPrimary: false,
          isActive: false,
          items: {
            create: items.map((item) => ({
              label: item.label,
              description: item.description,
              itemType: item.itemType,
              isRequired: item.isRequired,
              sortOrder: item.sortOrder,
              category: item.category || "inspection",
              requiresPhoto: item.requiresPhoto,
              opensIssueOnFail: false,
              optionsText: item.optionsText,
              issueTypeOnFail: null,
              issueSeverityOnFail: null,
              failureValuesText: null,
              linkedSupplyItemId: null,
              supplyUpdateMode: "none",
              supplyQuantity: null,
            })),
          },
        },
        select: {
          id: true,
          title: true,
          description: true,
          templateType: true,
        },
      })

      const run = task.checklistRun?.id
        ? await prisma.taskChecklistRun.update({
            where: { taskId },
            data: {
              templateId: customTemplate.id,
              sourceTemplateTitle: customTemplate.title,
              sourceTemplateDescription: customTemplate.description,
              templateType: customTemplate.templateType,
              status: "pending",
              startedAt: null,
              completedAt: null,
              isCustomized: true,
            },
            select: {
              id: true,
            },
          })
        : await prisma.taskChecklistRun.create({
            data: {
              taskId,
              templateId: customTemplate.id,
              sourceTemplateTitle: customTemplate.title,
              sourceTemplateDescription: customTemplate.description,
              templateType: customTemplate.templateType,
              status: "pending",
              startedAt: null,
              completedAt: null,
              isCustomized: true,
            },
            select: {
              id: true,
            },
          })

      await replaceCleaningRunItems(run.id, items)

      await prisma.task.update({
        where: { id: taskId },
        data: {
          requiresChecklist: true,
          sendCleaningChecklist: true,
          usesCustomizedCleaningChecklist: true,
        },
      })

      const updatedTask = await buildTaskResponse(taskId, req)

      return NextResponse.json({
        success: true,
        task: updatedTask,
        message: "Οι αλλαγές της λίστας καθαριότητας αποθηκεύτηκαν μόνο για αυτή την εργασία.",
      })
    }

    const issueAlreadySubmitted =
      issueRunHasRealAnswers(task.issueRun) ||
      activityShowsIssueSubmission(task.activityLogs)

    if (issueAlreadySubmitted) {
      return NextResponse.json(
        {
          error:
            "Η λίστα βλαβών και ζημιών έχει ήδη υποβληθεί για αυτή την εργασία. Δεν επιτρέπεται νέα επεξεργασία γιατί θα χαθεί το ιστορικό της υποβολής.",
        },
        { status: 409 }
      )
    }

    if (!isActive) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          sendIssuesChecklist: false,
          usesCustomizedIssuesChecklist: false,
        },
      })

      if (task.issueRun?.id) {
        await prisma.taskIssueAnswer.deleteMany({ where: { issueRunId: task.issueRun.id } })
        await prisma.taskIssueRunItem.deleteMany({ where: { issueRunId: task.issueRun.id } })
        await prisma.taskIssueRun.delete({ where: { taskId } })
      }

      const updatedTask = await buildTaskResponse(taskId, req)

      return NextResponse.json({
        success: true,
        task: updatedTask,
        message: "Η λίστα βλαβών και ζημιών απενεργοποιήθηκε μόνο για αυτή την εργασία.",
      })
    }

    const primaryIssueTemplate = await getPrimaryIssueTemplate(task.organizationId, task.propertyId)

    if (!primaryIssueTemplate) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε βασική λίστα βλαβών και ζημιών για το ακίνητο." },
        { status: 400 }
      )
    }

    const customIssueTemplate = await prisma.propertyIssueTemplate.create({
      data: {
        organizationId: task.organizationId,
        propertyId: task.propertyId,
        title: `${primaryIssueTemplate.title || "Λίστα βλαβών και ζημιών"} · Εργασία ${taskId}`,
        description: primaryIssueTemplate.description,
        isPrimary: false,
        isActive: false,
        items: {
          create: items.map((item) => ({
            label: item.label,
            description: item.description,
            sortOrder: item.sortOrder,
            itemType: "issue_check",
            isRequired: item.isRequired,
            allowsIssue: true,
            allowsDamage: true,
            defaultIssueType: "repair",
            defaultSeverity: "medium",
            requiresPhoto: item.requiresPhoto,
            affectsHostingByDefault: false,
            urgentByDefault: false,
            locationHint: item.description,
          })),
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
      },
    })

    const issueRun = task.issueRun?.id
      ? await prisma.taskIssueRun.update({
          where: { taskId },
          data: {
            templateId: customIssueTemplate.id,
            sourceTemplateTitle: customIssueTemplate.title,
            sourceTemplateDescription: customIssueTemplate.description,
            status: "pending",
            startedAt: null,
            completedAt: null,
            isCustomized: true,
          },
          select: {
            id: true,
          },
        })
      : await prisma.taskIssueRun.create({
          data: {
            taskId,
            templateId: customIssueTemplate.id,
            sourceTemplateTitle: customIssueTemplate.title,
            sourceTemplateDescription: customIssueTemplate.description,
            status: "pending",
            startedAt: null,
            completedAt: null,
            isCustomized: true,
          },
          select: {
            id: true,
          },
        })

    await replaceIssueRunItems(issueRun.id, items)

    await prisma.task.update({
      where: { id: taskId },
      data: {
        sendIssuesChecklist: true,
        usesCustomizedIssuesChecklist: true,
      },
    })

    const updatedTask = await buildTaskResponse(taskId, req)

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: "Οι αλλαγές της λίστας βλαβών και ζημιών αποθηκεύτηκαν μόνο για αυτή την εργασία.",
    })
  } catch (error) {
    console.error("PATCH /api/tasks/[taskId]/checklists/customize error:", error)

    const message = error instanceof Error ? error.message : "Αποτυχία αποθήκευσης λίστας εργασίας."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
