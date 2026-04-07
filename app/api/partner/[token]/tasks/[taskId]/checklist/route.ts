import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import {
  createPropertyConditionsFromRun,
  type RunConditionAnswerInput,
} from "@/lib/checklists/create-property-conditions-from-run"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"

type RouteContext = {
  params: Promise<{
    token: string
    taskId: string
  }>
}

type IncomingAnswer = {
  templateItemId: string
  valueBoolean?: boolean | null
  valueText?: string | null
  valueNumber?: number | null
  valueSelect?: string | null
  notes?: string | null
  photoUrls?: string[] | null
}

type ChecklistItemWithRules = {
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
  issueTypeOnFail: string | null
  issueSeverityOnFail: string | null
  failureValuesText: string | null
  linkedSupplyItemId: string | null
  supplyUpdateMode: string
  supplyQuantity: number | null
  supplyItem?: {
    id: string
    code: string
    name: string
    category: string
    unit: string
    minimumStock: number | null
  } | null
}

function isExpired(date?: Date | string | null) {
  if (!date) return false

  const parsed = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(parsed.getTime())) return false

  return parsed.getTime() < Date.now()
}

function toNullableTrimmedString(value: unknown) {
  if (value === undefined || value === null) return null

  const text = String(value).trim()
  return text === "" ? null : text
}

function normalizePhotoUrls(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
}

function isMeaningfulAnswer(answer?: IncomingAnswer | null) {
  if (!answer) return false

  if (typeof answer.valueBoolean === "boolean") return true

  if (
    typeof answer.valueNumber === "number" &&
    Number.isFinite(answer.valueNumber)
  ) {
    return true
  }

  if (toNullableTrimmedString(answer.valueText)) return true
  if (toNullableTrimmedString(answer.valueSelect)) return true
  if (toNullableTrimmedString(answer.notes)) return true
  if (normalizePhotoUrls(answer.photoUrls).length > 0) return true

  return false
}

function hasRequiredValue(itemType: string, answer?: IncomingAnswer | null) {
  if (!answer) return false

  const normalized = String(itemType || "").trim().toLowerCase()

  if (
    normalized === "boolean" ||
    normalized === "yes_no" ||
    normalized === "pass_fail" ||
    normalized === "checkbox"
  ) {
    return typeof answer.valueBoolean === "boolean"
  }

  if (normalized === "number" || normalized === "numeric") {
    return (
      typeof answer.valueNumber === "number" &&
      Number.isFinite(answer.valueNumber)
    )
  }

  if (
    normalized === "select" ||
    normalized === "dropdown" ||
    normalized === "choice" ||
    normalized === "option" ||
    normalized === "options"
  ) {
    return Boolean(toNullableTrimmedString(answer.valueSelect))
  }

  if (normalized === "photo") {
    return normalizePhotoUrls(answer.photoUrls).length > 0
  }

  return Boolean(toNullableTrimmedString(answer.valueText))
}

function parseFailureValues(value?: string | null) {
  if (!value) return []

  return value
    .split(/\r?\n|,/)
    .map((entry) => String(entry).trim().toLowerCase())
    .filter(Boolean)
}

function normalizeAnswerText(answer?: IncomingAnswer | null) {
  if (!answer) return null

  return (
    toNullableTrimmedString(answer.valueSelect) ||
    toNullableTrimmedString(answer.valueText) ||
    toNullableTrimmedString(answer.notes)
  )
}

function normalizeSupplyStatusValue(answer?: IncomingAnswer | null) {
  const text = String(normalizeAnswerText(answer) || "")
    .trim()
    .toLowerCase()

  if (!text) return null

  if (
    ["έλλειψη", "ελλειψη", "empty", "low", "missing", "none"].includes(text)
  ) {
    return "empty"
  }

  if (["μέτρια", "μετρια", "medium", "partial", "mid"].includes(text)) {
    return "medium"
  }

  if (["πλήρης", "πληρης", "full", "ok", "good"].includes(text)) {
    return "full"
  }

  return null
}

function isFailureAnswer(
  item: ChecklistItemWithRules,
  answer?: IncomingAnswer | null
) {
  if (!answer) return false

  const itemType = String(item.itemType || "").trim().toLowerCase()
  const configuredFailureValues = parseFailureValues(item.failureValuesText)
  const answerText = String(normalizeAnswerText(answer) || "").trim().toLowerCase()

  if (
    itemType === "boolean" ||
    itemType === "yes_no" ||
    itemType === "pass_fail" ||
    itemType === "checkbox"
  ) {
    return answer.valueBoolean === false
  }

  if (
    itemType === "select" ||
    itemType === "dropdown" ||
    itemType === "choice" ||
    itemType === "option" ||
    itemType === "options"
  ) {
    if (!answerText) return false

    if (configuredFailureValues.length > 0) {
      return configuredFailureValues.includes(answerText)
    }

    return [
      "fail",
      "failed",
      "problem",
      "issue",
      "broken",
      "damaged",
      "missing",
      "empty",
      "low",
      "no",
      "not ok",
      "bad",
      "poor",
      "έλλειψη",
      "ελλειψη",
    ].includes(answerText)
  }

  if (itemType === "number" || itemType === "numeric") {
    if (
      typeof answer.valueNumber !== "number" ||
      !Number.isFinite(answer.valueNumber)
    ) {
      return false
    }

    if (configuredFailureValues.length > 0) {
      return configuredFailureValues.includes(
        String(answer.valueNumber).toLowerCase()
      )
    }

    return answer.valueNumber <= 0
  }

  if (itemType === "photo") {
    return normalizePhotoUrls(answer.photoUrls).length === 0
  }

  if (configuredFailureValues.length > 0 && answerText) {
    return configuredFailureValues.includes(answerText)
  }

  return false
}

function getIssueTitle(item: ChecklistItemWithRules, issueType: string) {
  const prefixMap: Record<string, string> = {
    damage: "Ζημιά",
    repair: "Βλάβη",
    supplies: "Αναλώσιμα",
    inspection: "Έλεγχος",
    cleaning: "Καθαριότητα",
    general: "Θέμα",
  }

  const prefix = prefixMap[issueType] || "Θέμα"
  return `${prefix}: ${item.label}`
}

function buildIssueDescription(
  item: ChecklistItemWithRules,
  answer?: IncomingAnswer | null
) {
  const parts: string[] = []

  if (item.description) {
    parts.push(`Στοιχείο checklist: ${item.description}`)
  } else {
    parts.push(`Στοιχείο checklist: ${item.label}`)
  }

  if (typeof answer?.valueBoolean === "boolean") {
    parts.push(`Απάντηση boolean: ${answer.valueBoolean ? "Ναι" : "Όχι"}`)
  }

  if (
    typeof answer?.valueNumber === "number" &&
    Number.isFinite(answer.valueNumber)
  ) {
    parts.push(`Αριθμητική τιμή: ${answer.valueNumber}`)
  }

  if (toNullableTrimmedString(answer?.valueSelect)) {
    parts.push(`Επιλογή: ${toNullableTrimmedString(answer?.valueSelect)}`)
  }

  if (toNullableTrimmedString(answer?.valueText)) {
    parts.push(`Κείμενο: ${toNullableTrimmedString(answer?.valueText)}`)
  }

  if (toNullableTrimmedString(answer?.notes)) {
    parts.push(`Σημειώσεις συνεργάτη: ${toNullableTrimmedString(answer?.notes)}`)
  }

  const photos = normalizePhotoUrls(answer?.photoUrls)
  if (photos.length > 0) {
    parts.push(`Φωτογραφίες: ${photos.length}`)
  }

  return parts.join("\n")
}

function getSupplyQuantity(
  item: ChecklistItemWithRules,
  answer?: IncomingAnswer | null
) {
  if (
    typeof answer?.valueNumber === "number" &&
    Number.isFinite(answer.valueNumber) &&
    answer.valueNumber >= 0
  ) {
    return answer.valueNumber
  }

  if (
    typeof item.supplyQuantity === "number" &&
    Number.isFinite(item.supplyQuantity) &&
    item.supplyQuantity >= 0
  ) {
    return item.supplyQuantity
  }

  return null
}

function computeStatusMapStock(params: {
  status: "empty" | "medium" | "full"
  existingCurrentStock?: number | null
  targetStock?: number | null
  reorderThreshold?: number | null
  minimumStock?: number | null
}) {
  const existingCurrentStock =
    typeof params.existingCurrentStock === "number" &&
    Number.isFinite(params.existingCurrentStock)
      ? params.existingCurrentStock
      : 0

  const targetStock =
    typeof params.targetStock === "number" && Number.isFinite(params.targetStock)
      ? params.targetStock
      : null

  const reorderThreshold =
    typeof params.reorderThreshold === "number" &&
    Number.isFinite(params.reorderThreshold)
      ? params.reorderThreshold
      : null

  const minimumStock =
    typeof params.minimumStock === "number" && Number.isFinite(params.minimumStock)
      ? params.minimumStock
      : 0

  if (params.status === "empty") {
    return 0
  }

  if (params.status === "full") {
    if (targetStock !== null && targetStock > 0) {
      return targetStock
    }

    if (reorderThreshold !== null && reorderThreshold > 0) {
      return Math.max(reorderThreshold + 2, minimumStock + 2)
    }

    if (minimumStock > 0) {
      return minimumStock + 2
    }

    return Math.max(existingCurrentStock, 3)
  }

  if (reorderThreshold !== null && reorderThreshold > 0) {
    return reorderThreshold
  }

  if (targetStock !== null && targetStock > 1) {
    return Math.max(1, Math.ceil(targetStock / 2))
  }

  if (minimumStock > 0) {
    return minimumStock
  }

  return Math.max(1, existingCurrentStock)
}

function isIssueReportItem(item: ChecklistItemWithRules) {
  return String(item.category || "").trim().toLowerCase() === "issue_report"
}

const taskAssignmentWithChecklistArgs =
  Prisma.validator<Prisma.TaskAssignmentDefaultArgs>()({
    include: {
      partner: {
        select: {
          id: true,
          name: true,
        },
      },
      task: {
        include: {
          property: {
            select: {
              id: true,
              organizationId: true,
              name: true,
            },
          },
          booking: {
            select: {
              id: true,
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
                    include: {
                      supplyItem: {
                        select: {
                          id: true,
                          code: true,
                          name: true,
                          category: true,
                          unit: true,
                          minimumStock: true,
                        },
                      },
                    },
                  },
                },
              },
              items: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
              answers: true,
            },
          },
          supplyRun: {
            select: {
              id: true,
              status: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
      },
    },
  })

type TaskAssignmentWithChecklist = Prisma.TaskAssignmentGetPayload<
  typeof taskAssignmentWithChecklistArgs
>

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { token, taskId } = await context.params

    const cleanToken = String(token || "").trim()
    const cleanTaskId = String(taskId || "").trim()

    if (!cleanToken) {
      return NextResponse.json(
        { error: "Το portal token είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!cleanTaskId) {
      return NextResponse.json(
        { error: "Το αναγνωριστικό εργασίας είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => null)

    const mode =
      String(body?.mode || "save").trim().toLowerCase() === "submit"
        ? "submit"
        : "save"

    const incomingAnswersRaw = Array.isArray(body?.answers) ? body.answers : []

    const incomingAnswers: IncomingAnswer[] = incomingAnswersRaw.map(
      (entry: unknown) => {
        const raw = (entry ?? {}) as Record<string, unknown>

        return {
          templateItemId: String(raw.templateItemId || "").trim(),
          valueBoolean:
            typeof raw.valueBoolean === "boolean" ? raw.valueBoolean : null,
          valueText: toNullableTrimmedString(raw.valueText),
          valueNumber:
            raw.valueNumber === null ||
            raw.valueNumber === undefined ||
            raw.valueNumber === ""
              ? null
              : Number(raw.valueNumber),
          valueSelect: toNullableTrimmedString(raw.valueSelect),
          notes: toNullableTrimmedString(raw.notes),
          photoUrls: normalizePhotoUrls(raw.photoUrls),
        }
      }
    )

    const portalAccess = await prisma.partnerPortalAccessToken.findFirst({
      where: {
        token: cleanToken,
        isActive: true,
      },
      select: {
        id: true,
        expiresAt: true,
        partnerId: true,
      },
    })

    if (!portalAccess) {
      return NextResponse.json(
        { error: "Το portal link δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (isExpired(portalAccess.expiresAt)) {
      return NextResponse.json(
        { error: "Το portal link έχει λήξει." },
        { status: 410 }
      )
    }

    await prisma.partnerPortalAccessToken.update({
      where: { id: portalAccess.id },
      data: {
        lastUsedAt: new Date(),
      },
    })

    const assignments: TaskAssignmentWithChecklist[] =
      await prisma.taskAssignment.findMany({
        where: {
          partnerId: portalAccess.partnerId,
          taskId: cleanTaskId,
        },
        orderBy: [
          {
            assignedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        ...taskAssignmentWithChecklistArgs,
      })

    if (!assignments.length) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε για αυτόν τον συνεργάτη." },
        { status: 404 }
      )
    }

    const latestAssignment = assignments[0]

    if (
      !["accepted", "in_progress"].includes(
        String(latestAssignment.status || "").toLowerCase()
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Η checklist μπορεί να συμπληρωθεί μόνο όταν η εργασία είναι αποδεκτή ή σε εξέλιξη.",
        },
        { status: 400 }
      )
    }

    const checklistRun = latestAssignment.task.checklistRun

    if (!checklistRun) {
      return NextResponse.json(
        { error: "Δεν υπάρχει συνδεδεμένη checklist για αυτή την εργασία." },
        { status: 400 }
      )
    }

    if (!checklistRun.template) {
      return NextResponse.json(
        { error: "Checklist template not found for this task." },
        { status: 400 }
      )
    }

    const templateItems: ChecklistItemWithRules[] = checklistRun.template.items.map(
      (item) => ({
        id: item.id,
        label: item.label,
        description: item.description,
        itemType: item.itemType,
        isRequired: item.isRequired,
        sortOrder: item.sortOrder,
        category: item.category,
        requiresPhoto: item.requiresPhoto,
        opensIssueOnFail: item.opensIssueOnFail,
        optionsText: item.optionsText,
        issueTypeOnFail: item.issueTypeOnFail,
        issueSeverityOnFail: item.issueSeverityOnFail,
        failureValuesText: item.failureValuesText,
        linkedSupplyItemId: item.linkedSupplyItemId,
        supplyUpdateMode: item.supplyUpdateMode,
        supplyQuantity: item.supplyQuantity,
        supplyItem: item.supplyItem,
      })
    )

    if (!templateItems.length) {
      return NextResponse.json(
        { error: "Η checklist δεν έχει στοιχεία προς συμπλήρωση." },
        { status: 400 }
      )
    }

    const runItemsByTemplateItemId = new Map(
      checklistRun.items
        .filter((runItem) => Boolean(runItem.propertyTemplateItemId))
        .map((runItem) => [String(runItem.propertyTemplateItemId), runItem])
    )

    for (const item of templateItems) {
      if (runItemsByTemplateItemId.has(item.id)) continue

      return NextResponse.json(
        {
          error: `Missing checklist run item for template item "${item.label}".`,
        },
        { status: 400 }
      )
    }

    const answersMap = new Map<string, IncomingAnswer>()

    for (const answer of incomingAnswers) {
      if (!answer.templateItemId) continue
      answersMap.set(answer.templateItemId, answer)
    }

    if (mode === "submit") {
      for (const item of templateItems) {
        const answer = answersMap.get(item.id)

        if (item.isRequired && !hasRequiredValue(item.itemType, answer)) {
          return NextResponse.json(
            {
              error: `Το υποχρεωτικό πεδίο "${item.label}" δεν έχει συμπληρωθεί.`,
            },
            { status: 400 }
          )
        }

        if (
          item.requiresPhoto &&
          normalizePhotoUrls(answer?.photoUrls).length === 0
        ) {
          return NextResponse.json(
            {
              error: `Το στοιχείο "${item.label}" απαιτεί τουλάχιστον μία φωτογραφία.`,
            },
            { status: 400 }
          )
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      const now = new Date()
      const runConditionAnswers: RunConditionAnswerInput[] = []

      const supplyRunStatus = String(
        latestAssignment.task.supplyRun?.status || ""
      ).toLowerCase()

      const taskNeedsSupplies = Boolean(latestAssignment.task.sendSuppliesChecklist)
      const suppliesAlreadyCompleted = supplyRunStatus === "completed"

      const shouldCompleteWholeTask =
        mode === "submit" &&
        (!taskNeedsSupplies || suppliesAlreadyCompleted)

      await tx.taskAssignment.update({
        where: {
          id: latestAssignment.id,
        },
        data: {
          startedAt: latestAssignment.startedAt || now,
          completedAt: shouldCompleteWholeTask ? now : null,
          status:
            mode === "submit"
              ? shouldCompleteWholeTask
                ? "completed"
                : "in_progress"
              : "in_progress",
        },
      })

      await tx.task.update({
        where: {
          id: latestAssignment.task.id,
        },
        data: {
          status:
            mode === "submit"
              ? shouldCompleteWholeTask
                ? "completed"
                : "in_progress"
              : "in_progress",
          completedAt: shouldCompleteWholeTask ? now : null,
        },
      })

      await tx.taskChecklistRun.update({
        where: {
          taskId: latestAssignment.task.id,
        },
        data: {
          status: mode === "submit" ? "completed" : "in_progress",
          startedAt: checklistRun.startedAt || now,
          completedAt: mode === "submit" ? now : null,
        },
      })

      for (const item of templateItems) {
        const incoming = answersMap.get(item.id)
        const runItem = runItemsByTemplateItemId.get(item.id)

        const existing = checklistRun.answers.find(
          (answer) => answer.templateItemId === item.id
        )

        if (!isMeaningfulAnswer(incoming)) {
          if (existing) {
            await tx.taskChecklistAnswer.delete({
              where: {
                id: existing.id,
              },
            })
          }
          continue
        }

        const safeIncoming = incoming as IncomingAnswer

        const answerData = {
          valueBoolean:
            typeof safeIncoming.valueBoolean === "boolean"
              ? safeIncoming.valueBoolean
              : null,
          valueText: toNullableTrimmedString(safeIncoming.valueText),
          valueNumber:
            typeof safeIncoming.valueNumber === "number" &&
            Number.isFinite(safeIncoming.valueNumber)
              ? safeIncoming.valueNumber
              : null,
          valueSelect: toNullableTrimmedString(safeIncoming.valueSelect),
          notes: toNullableTrimmedString(safeIncoming.notes),
          photoUrls: normalizePhotoUrls(safeIncoming.photoUrls),
        }

        let savedAnswer

        if (existing) {
          savedAnswer = await tx.taskChecklistAnswer.update({
            where: {
              id: existing.id,
            },
            data: answerData,
          })
        } else {
          savedAnswer = await tx.taskChecklistAnswer.create({
            data: {
              checklistRunId: checklistRun.id,
              runItemId: runItem!.id,
              templateItemId: item.id,
              ...answerData,
            },
          })
        }

        if (mode === "submit") {
          runConditionAnswers.push({
            answerId: savedAnswer.id,
            runItemId: runItem?.id ?? null,
            templateItemId: item.id,
            propertyTemplateItemId: runItem?.propertyTemplateItemId ?? item.id,
            templateItemLabel: item.label,
            templateItemCategory: item.category,
            itemType: item.itemType,
            linkedSupplyItemId: item.linkedSupplyItemId,
            opensIssueOnFail: item.opensIssueOnFail,
            issueTypeOnFail: item.issueTypeOnFail,
            issueSeverityOnFail: item.issueSeverityOnFail,
            failureValuesText: item.failureValuesText,
            valueBoolean: answerData.valueBoolean,
            valueText: answerData.valueText,
            valueNumber: answerData.valueNumber,
            valueSelect: answerData.valueSelect,
            notes: answerData.notes,
            photoUrls: answerData.photoUrls,
          })
        }

        if (mode !== "submit") continue

        const failed = isFailureAnswer(item, safeIncoming)
        const shouldCreateIssue = item.opensIssueOnFail && failed

        await tx.taskChecklistAnswer.update({
          where: { id: savedAnswer.id },
          data: {
            issueCreated: shouldCreateIssue || isIssueReportItem(item),
          },
        })

        if (shouldCreateIssue) {
          const issueType = String(item.issueTypeOnFail || "repair").toLowerCase()
          const severity = String(item.issueSeverityOnFail || "medium").toLowerCase()
          const issueTitle = getIssueTitle(item, issueType)

          const existingIssue = await tx.issue.findFirst({
            where: {
              organizationId: latestAssignment.task.property.organizationId,
              propertyId: latestAssignment.task.property.id,
              taskId: latestAssignment.task.id,
              title: issueTitle,
              issueType,
              status: { in: ["open", "in_progress"] },
            },
            select: { id: true },
          })

          if (!existingIssue) {
            const createdIssue = await tx.issue.create({
              data: {
                organizationId: latestAssignment.task.property.organizationId,
                propertyId: latestAssignment.task.property.id,
                taskId: latestAssignment.task.id,
                bookingId: latestAssignment.task.booking?.id ?? null,
                issueType,
                title: issueTitle,
                description: buildIssueDescription(item, safeIncoming),
                severity,
                status: "open",
                reportedBy: latestAssignment.partner.name,
              },
            })

            await tx.activityLog.create({
              data: {
                organizationId: latestAssignment.task.property.organizationId,
                propertyId: latestAssignment.task.property.id,
                taskId: latestAssignment.task.id,
                issueId: createdIssue.id,
                partnerId: latestAssignment.partnerId,
                entityType: "ISSUE",
                entityId: createdIssue.id,
                action: "CHECKLIST_FAILURE_ISSUE_CREATED",
                message: `Δημιουργήθηκε νέο θέμα από αποτυχία checklist στο στοιχείο "${item.label}".`,
                actorType: "PARTNER_PORTAL",
                actorName: latestAssignment.partner.name,
                metadata: {
                  checklistRunId: checklistRun.id,
                  templateItemId: item.id,
                  issueType,
                  severity,
                },
              },
            })
          }
        }

        if (isIssueReportItem(item)) {
          const freeText =
            toNullableTrimmedString(safeIncoming.valueText) ||
            toNullableTrimmedString(safeIncoming.notes)

          if (freeText) {
            const issueType = String(item.issueTypeOnFail || "repair").toLowerCase()
            const severity = String(item.issueSeverityOnFail || "medium").toLowerCase()
            const title = `Αναφορά συνεργάτη: ${item.label}`

            const existingOpenIssue = await tx.issue.findFirst({
              where: {
                organizationId: latestAssignment.task.property.organizationId,
                propertyId: latestAssignment.task.property.id,
                taskId: latestAssignment.task.id,
                title,
                issueType,
                status: { in: ["open", "in_progress"] },
              },
              select: {
                id: true,
              },
            })

            const descriptionParts = [
              `Αναφορά από checklist item: ${item.label}`,
              `Κείμενο συνεργάτη: ${freeText}`,
              toNullableTrimmedString(safeIncoming.notes)
                ? `Σημειώσεις: ${toNullableTrimmedString(safeIncoming.notes)}`
                : null,
              normalizePhotoUrls(safeIncoming.photoUrls).length > 0
                ? `Φωτογραφίες: ${normalizePhotoUrls(safeIncoming.photoUrls).length}`
                : null,
            ].filter(Boolean)

            if (existingOpenIssue) {
              await tx.issue.update({
                where: {
                  id: existingOpenIssue.id,
                },
                data: {
                  description: descriptionParts.join("\n"),
                  severity,
                },
              })
            } else {
              const createdIssue = await tx.issue.create({
                data: {
                  organizationId: latestAssignment.task.property.organizationId,
                  propertyId: latestAssignment.task.property.id,
                  taskId: latestAssignment.task.id,
                  bookingId: latestAssignment.task.booking?.id ?? null,
                  issueType,
                  title,
                  description: descriptionParts.join("\n"),
                  severity,
                  status: "open",
                  reportedBy: latestAssignment.partner.name,
                },
              })

              await tx.activityLog.create({
                data: {
                  organizationId: latestAssignment.task.property.organizationId,
                  propertyId: latestAssignment.task.property.id,
                  taskId: latestAssignment.task.id,
                  issueId: createdIssue.id,
                  partnerId: latestAssignment.partnerId,
                  entityType: "ISSUE",
                  entityId: createdIssue.id,
                  action: "CHECKLIST_ISSUE_REPORT_CREATED",
                  message: `Δημιουργήθηκε νέο θέμα από πεδίο αναφοράς βλάβης / ζημιάς στο στοιχείο "${item.label}".`,
                  actorType: "PARTNER_PORTAL",
                  actorName: latestAssignment.partner.name,
                  metadata: {
                    checklistRunId: checklistRun.id,
                    templateItemId: item.id,
                    issueType,
                    severity,
                  },
                },
              })
            }
          }
        }

        if (item.linkedSupplyItemId) {
          const supplyMode = String(item.supplyUpdateMode || "none").toLowerCase()

          if (supplyMode === "set_stock") {
            const stockValue =
              typeof safeIncoming.valueNumber === "number" &&
              Number.isFinite(safeIncoming.valueNumber)
                ? Math.max(0, safeIncoming.valueNumber)
                : null

            if (stockValue !== null) {
              const existingSupply = await tx.propertySupply.findUnique({
                where: {
                  propertyId_supplyItemId: {
                    propertyId: latestAssignment.task.property.id,
                    supplyItemId: item.linkedSupplyItemId,
                  },
                },
              })

              if (existingSupply) {
                await tx.propertySupply.update({
                  where: { id: existingSupply.id },
                  data: {
                    currentStock: stockValue,
                    lastUpdatedAt: now,
                  },
                })
              } else {
                await tx.propertySupply.create({
                  data: {
                    propertyId: latestAssignment.task.property.id,
                    supplyItemId: item.linkedSupplyItemId,
                    currentStock: stockValue,
                    lastUpdatedAt: now,
                  },
                })
              }
            }
          }

          if (supplyMode === "consume") {
            const quantity = getSupplyQuantity(item, safeIncoming)

            if (quantity !== null && quantity > 0) {
              const existingSupply = await tx.propertySupply.findUnique({
                where: {
                  propertyId_supplyItemId: {
                    propertyId: latestAssignment.task.property.id,
                    supplyItemId: item.linkedSupplyItemId,
                  },
                },
              })

              const currentStock = existingSupply?.currentStock ?? 0
              const nextStock = Math.max(0, currentStock - quantity)

              if (existingSupply) {
                await tx.propertySupply.update({
                  where: { id: existingSupply.id },
                  data: {
                    currentStock: nextStock,
                    lastUpdatedAt: now,
                  },
                })
              } else {
                await tx.propertySupply.create({
                  data: {
                    propertyId: latestAssignment.task.property.id,
                    supplyItemId: item.linkedSupplyItemId,
                    currentStock: nextStock,
                    lastUpdatedAt: now,
                  },
                })
              }

              await tx.supplyConsumption.create({
                data: {
                  taskId: latestAssignment.task.id,
                  supplyItemId: item.linkedSupplyItemId,
                  quantity,
                  unit: item.supplyItem?.unit || "τεμ.",
                  notes: `Κατανάλωση από checklist item "${item.label}"`,
                },
              })
            }
          }

          if (supplyMode === "flag_low" && failed) {
            const existingSupply = await tx.propertySupply.findUnique({
              where: {
                propertyId_supplyItemId: {
                  propertyId: latestAssignment.task.property.id,
                  supplyItemId: item.linkedSupplyItemId,
                },
              },
            })

            const threshold =
              existingSupply?.reorderThreshold ??
              item.supplyItem?.minimumStock ??
              0

            if (existingSupply) {
              await tx.propertySupply.update({
                where: { id: existingSupply.id },
                data: {
                  currentStock: threshold,
                  lastUpdatedAt: now,
                },
              })
            } else {
              await tx.propertySupply.create({
                data: {
                  propertyId: latestAssignment.task.property.id,
                  supplyItemId: item.linkedSupplyItemId,
                  currentStock: threshold,
                  reorderThreshold: threshold,
                  lastUpdatedAt: now,
                },
              })
            }
          }

          if (supplyMode === "status_map") {
            const normalizedStatus = normalizeSupplyStatusValue(safeIncoming)

            if (normalizedStatus) {
              const existingSupply = await tx.propertySupply.findUnique({
                where: {
                  propertyId_supplyItemId: {
                    propertyId: latestAssignment.task.property.id,
                    supplyItemId: item.linkedSupplyItemId,
                  },
                },
                include: {
                  supplyItem: {
                    select: {
                      id: true,
                      minimumStock: true,
                    },
                  },
                },
              })

              const nextStock = computeStatusMapStock({
                status: normalizedStatus,
                existingCurrentStock: existingSupply?.currentStock ?? null,
                targetStock: existingSupply?.targetStock ?? null,
                reorderThreshold:
                  existingSupply?.reorderThreshold ??
                  item.supplyItem?.minimumStock ??
                  null,
                minimumStock:
                  existingSupply?.supplyItem?.minimumStock ??
                  item.supplyItem?.minimumStock ??
                  null,
              })

              const notesPrefix =
                normalizedStatus === "empty"
                  ? "Checklist status map: Έλλειψη"
                  : normalizedStatus === "medium"
                  ? "Checklist status map: Μέτρια"
                  : "Checklist status map: Πλήρης"

              if (existingSupply) {
                await tx.propertySupply.update({
                  where: { id: existingSupply.id },
                  data: {
                    currentStock: nextStock,
                    lastUpdatedAt: now,
                    notes: [existingSupply.notes, notesPrefix]
                      .filter(Boolean)
                      .join(" | "),
                  },
                })
              } else {
                const derivedThreshold = item.supplyItem?.minimumStock ?? 0
                const derivedTarget =
                  normalizedStatus === "full"
                    ? Math.max(derivedThreshold + 2, 3)
                    : null

                await tx.propertySupply.create({
                  data: {
                    propertyId: latestAssignment.task.property.id,
                    supplyItemId: item.linkedSupplyItemId,
                    currentStock: nextStock,
                    targetStock: derivedTarget,
                    reorderThreshold: derivedThreshold,
                    notes: notesPrefix,
                    lastUpdatedAt: now,
                  },
                })
              }

              await tx.activityLog.create({
                data: {
                  organizationId: latestAssignment.task.property.organizationId,
                  propertyId: latestAssignment.task.property.id,
                  taskId: latestAssignment.task.id,
                  partnerId: latestAssignment.partnerId,
                  entityType: "PROPERTY_SUPPLY",
                  entityId: item.linkedSupplyItemId,
                  action: "CHECKLIST_SUPPLY_STATUS_MAPPED",
                  message: `Το αναλώσιμο "${item.supplyItem?.name || item.label}" ενημερώθηκε από checklist answer (${normalizedStatus}).`,
                  actorType: "PARTNER_PORTAL",
                  actorName: latestAssignment.partner.name,
                  metadata: {
                    checklistRunId: checklistRun.id,
                    templateItemId: item.id,
                    linkedSupplyItemId: item.linkedSupplyItemId,
                    normalizedStatus,
                    supplyMode,
                  },
                },
              })
            }
          }
        }
      }

      if (mode === "submit" && runConditionAnswers.length > 0) {
        await createPropertyConditionsFromRun(
          {
            organizationId: latestAssignment.task.property.organizationId,
            propertyId: latestAssignment.task.property.id,
            taskId: latestAssignment.task.id,
            bookingId: latestAssignment.task.booking?.id ?? null,
            runId: checklistRun.id,
            templateId: checklistRun.template?.id ?? null,
            templateTitle: checklistRun.template?.title ?? "Checklist",
            answers: runConditionAnswers,
            detectedAt: now,
          },
          tx as never
        )
      }

      await tx.activityLog.create({
        data: {
          organizationId: latestAssignment.task.property.organizationId,
          propertyId: latestAssignment.task.property.id,
          taskId: latestAssignment.task.id,
          partnerId: latestAssignment.partnerId,
          entityType: "TASK_CHECKLIST_RUN",
          entityId: checklistRun.id,
          action:
            mode === "submit"
              ? "PARTNER_CHECKLIST_SUBMITTED"
              : "PARTNER_CHECKLIST_SAVED",
          message:
            mode === "submit"
              ? `Ο συνεργάτης ${latestAssignment.partner.name} υπέβαλε τη checklist από το portal.`
              : `Ο συνεργάτης ${latestAssignment.partner.name} αποθήκευσε πρόοδο checklist από το portal.`,
          actorType: "PARTNER_PORTAL",
          actorName: latestAssignment.partner.name,
          metadata: {
            taskId: latestAssignment.task.id,
            checklistRunId: checklistRun.id,
            mode,
            answersCount: incomingAnswers.length,
            sendSuppliesChecklist: latestAssignment.task.sendSuppliesChecklist,
            supplyRunStatus: latestAssignment.task.supplyRun?.status || null,
            taskCompleted: shouldCompleteWholeTask,
          },
        },
      })
    })

    const propertyTruth = await refreshPropertyReadiness(
      latestAssignment.task.property.id
    )

    return NextResponse.json({
      success: true,
      mode,
      propertyReadiness: {
        status: propertyTruth.readiness.status,
        explain: propertyTruth.readiness.explain,
        reasons: propertyTruth.readiness.reasons,
        updatedAt:
          propertyTruth.updatedProperty.readinessUpdatedAt?.toISOString() ?? null,
      },
    })
  } catch (error) {
    console.error("POST /api/partner/[token]/tasks/[taskId]/checklist error:", error)

    return NextResponse.json(
      { error: "Αποτυχία υποβολής checklist συνεργάτη." },
      { status: 500 }
    )
  }
}
