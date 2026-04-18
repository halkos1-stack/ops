import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import {
  createPropertyConditionsFromRun,
  type RunConditionAnswerInput,
} from "@/lib/checklists/create-property-conditions-from-run"
import { resolveMergedPropertyConditionsNotSeenInRun } from "@/lib/checklists/merge-property-conditions"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"

type RouteContext = {
  params: Promise<{
    token: string
    taskId: string
  }>
}

type AnswerValueShape = {
  valueBoolean?: boolean | null
  valueText?: string | null
  valueNumber?: number | null
  valueSelect?: string | null
  notes?: string | null
  photoUrls?: string[] | null
}

type IncomingAnswer = AnswerValueShape & {
  templateItemId: string
  hasValueBoolean: boolean
  hasValueText: boolean
  hasValueNumber: boolean
  hasValueSelect: boolean
  hasNotes: boolean
  hasPhotoUrls: boolean
}

type PersistedChecklistAnswerSnapshot = AnswerValueShape & {
  id: string
  runItemId: string | null
  templateItemId: string
  photoUrls: string[]
}

type EffectiveAnswer = AnswerValueShape & {
  templateItemId: string
  photoUrls: string[]
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

function mergePhotoUrls(...groups: unknown[]) {
  const merged = groups.flatMap((group) => normalizePhotoUrls(group))
  return Array.from(new Set(merged))
}

function hasOwn(raw: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(raw, key)
}

function requireNonEmptyTemplateItemId(
  value: string | null | undefined,
  contextMessage: string
) {
  const normalized = String(value || "").trim()

  if (!normalized) {
    throw new Error(contextMessage)
  }

  return normalized
}

function toPersistedChecklistAnswerSnapshot(answer: {
  id: string
  runItemId: string | null
  templateItemId: string | null
  valueBoolean: boolean | null
  valueText: string | null
  valueNumber: number | null
  valueSelect: string | null
  notes: string | null
  photoUrls: Prisma.JsonValue | null
}): PersistedChecklistAnswerSnapshot {
  return {
    id: answer.id,
    runItemId: answer.runItemId,
    templateItemId: requireNonEmptyTemplateItemId(
      answer.templateItemId,
      `Το answer ${answer.id} δεν έχει templateItemId.`
    ),
    valueBoolean: answer.valueBoolean,
    valueText: answer.valueText,
    valueNumber: answer.valueNumber,
    valueSelect: answer.valueSelect,
    notes: answer.notes,
    photoUrls: normalizePhotoUrls(answer.photoUrls),
  }
}

function buildExistingAnswersByTemplateItemId(
  answers: Array<{
    id: string
    runItemId: string | null
    templateItemId: string | null
    valueBoolean: boolean | null
    valueText: string | null
    valueNumber: number | null
    valueSelect: string | null
    notes: string | null
    photoUrls: Prisma.JsonValue | null
  }>
) {
  const entries: Array<[string, PersistedChecklistAnswerSnapshot]> = []

  for (const answer of answers) {
    const templateItemId = String(answer.templateItemId || "").trim()

    if (!templateItemId) continue

    const snapshot = toPersistedChecklistAnswerSnapshot(answer)
    entries.push([templateItemId, snapshot])
  }

  return new Map<string, PersistedChecklistAnswerSnapshot>(entries)
}

function buildEffectiveAnswer(
  templateItemId: string,
  existing?: PersistedChecklistAnswerSnapshot | null,
  incoming?: IncomingAnswer | null
): EffectiveAnswer {
  return {
    templateItemId,
    valueBoolean:
      incoming?.hasValueBoolean
        ? incoming.valueBoolean ?? null
        : existing?.valueBoolean ?? null,
    valueText:
      incoming?.hasValueText
        ? toNullableTrimmedString(incoming.valueText)
        : existing?.valueText ?? null,
    valueNumber:
      incoming?.hasValueNumber
        ? typeof incoming.valueNumber === "number" &&
          Number.isFinite(incoming.valueNumber)
          ? incoming.valueNumber
          : null
        : existing?.valueNumber ?? null,
    valueSelect:
      incoming?.hasValueSelect
        ? toNullableTrimmedString(incoming.valueSelect)
        : existing?.valueSelect ?? null,
    notes:
      incoming?.hasNotes
        ? toNullableTrimmedString(incoming.notes)
        : existing?.notes ?? null,
    photoUrls: mergePhotoUrls(
      existing?.photoUrls,
      incoming?.hasPhotoUrls ? incoming.photoUrls : []
    ),
  }
}

function isMeaningfulAnswer(answer?: AnswerValueShape | null) {
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

function hasRequiredValue(itemType: string, answer?: AnswerValueShape | null) {
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

function normalizeAnswerText(answer?: AnswerValueShape | null) {
  if (!answer) return null

  return (
    toNullableTrimmedString(answer.valueSelect) ||
    toNullableTrimmedString(answer.valueText) ||
    toNullableTrimmedString(answer.notes)
  )
}

function isFailureAnswer(
  item: ChecklistItemWithRules,
  answer?: AnswerValueShape | null
) {
  if (!answer) return false

  const itemType = String(item.itemType || "").trim().toLowerCase()
  const configuredFailureValues = parseFailureValues(item.failureValuesText)
  const answerText = String(normalizeAnswerText(answer) || "")
    .trim()
    .toLowerCase()

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
  answer?: AnswerValueShape | null
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
          issueRun: {
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

        const hasValueBoolean = hasOwn(raw, "valueBoolean")
        const hasValueText = hasOwn(raw, "valueText")
        const hasValueNumber = hasOwn(raw, "valueNumber")
        const hasValueSelect = hasOwn(raw, "valueSelect")
        const hasNotes = hasOwn(raw, "notes")
        const hasPhotoUrls = hasOwn(raw, "photoUrls")

        return {
          templateItemId: String(raw.templateItemId || "").trim(),
          hasValueBoolean,
          hasValueText,
          hasValueNumber,
          hasValueSelect,
          hasNotes,
          hasPhotoUrls,
          valueBoolean:
            hasValueBoolean && typeof raw.valueBoolean === "boolean"
              ? raw.valueBoolean
              : null,
          valueText: hasValueText ? toNullableTrimmedString(raw.valueText) : null,
          valueNumber:
            hasValueNumber &&
            raw.valueNumber !== null &&
            raw.valueNumber !== undefined &&
            raw.valueNumber !== "" &&
            Number.isFinite(Number(raw.valueNumber))
              ? Number(raw.valueNumber)
              : null,
          valueSelect: hasValueSelect
            ? toNullableTrimmedString(raw.valueSelect)
            : null,
          notes: hasNotes ? toNullableTrimmedString(raw.notes) : null,
          photoUrls: hasPhotoUrls ? normalizePhotoUrls(raw.photoUrls) : null,
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
        { error: "Δεν βρέθηκε πρότυπο checklist για αυτή την εργασία." },
        { status: 400 }
      )
    }

    if (String(checklistRun.status || "").toLowerCase() === "completed") {
      return NextResponse.json(
        {
          error: "Η checklist έχει ήδη υποβληθεί και δεν μπορεί να τροποποιηθεί.",
        },
        { status: 409 }
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
          error: `Λείπει checklist run item για το στοιχείο "${item.label}".`,
        },
        { status: 400 }
      )
    }

    const existingAnswersByTemplateItemId = buildExistingAnswersByTemplateItemId(
      checklistRun.answers
    )

    const answersMap = new Map<string, IncomingAnswer>()

    for (const answer of incomingAnswers) {
      if (!answer.templateItemId) continue
      answersMap.set(answer.templateItemId, answer)
    }

    if (mode === "submit") {
      for (const item of templateItems) {
        const existing = existingAnswersByTemplateItemId.get(item.id) ?? null
        const incoming = answersMap.get(item.id)
        const effectiveAnswer = buildEffectiveAnswer(item.id, existing, incoming)

        if (item.isRequired && !hasRequiredValue(item.itemType, effectiveAnswer)) {
          return NextResponse.json(
            {
              error: `Το υποχρεωτικό πεδίο "${item.label}" δεν έχει συμπληρωθεί.`,
            },
            { status: 400 }
          )
        }

        if (
          item.requiresPhoto &&
          normalizePhotoUrls(effectiveAnswer.photoUrls).length === 0
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
      const issueRunStatus = String(
        latestAssignment.task.issueRun?.status || ""
      ).toLowerCase()

      const taskNeedsSupplies = Boolean(latestAssignment.task.sendSuppliesChecklist)
      const taskNeedsIssues = Boolean(latestAssignment.task.sendIssuesChecklist)
      const suppliesAlreadyCompleted = supplyRunStatus === "completed"
      const issuesAlreadyCompleted = issueRunStatus === "completed"

      const shouldCompleteWholeTask =
        mode === "submit" &&
        (!taskNeedsSupplies || suppliesAlreadyCompleted) &&
        (!taskNeedsIssues || issuesAlreadyCompleted)

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
        const hasIncoming = answersMap.has(item.id)
        const runItem = runItemsByTemplateItemId.get(item.id)
        const existing = existingAnswersByTemplateItemId.get(item.id) ?? null

        const effectiveAnswer = buildEffectiveAnswer(item.id, existing, incoming)

        if (!isMeaningfulAnswer(effectiveAnswer)) {
          if (existing && hasIncoming) {
            await tx.taskChecklistAnswer.delete({
              where: {
                id: existing.id,
              },
            })
          }
          continue
        }

        const answerData = {
          valueBoolean:
            typeof effectiveAnswer.valueBoolean === "boolean"
              ? effectiveAnswer.valueBoolean
              : null,
          valueText: toNullableTrimmedString(effectiveAnswer.valueText),
          valueNumber:
            typeof effectiveAnswer.valueNumber === "number" &&
            Number.isFinite(effectiveAnswer.valueNumber)
              ? effectiveAnswer.valueNumber
              : null,
          valueSelect: toNullableTrimmedString(effectiveAnswer.valueSelect),
          notes: toNullableTrimmedString(effectiveAnswer.notes),
          photoUrls: mergePhotoUrls(effectiveAnswer.photoUrls),
        }

        let savedAnswer: PersistedChecklistAnswerSnapshot

        if (existing && hasIncoming) {
          const updatedAnswer = await tx.taskChecklistAnswer.update({
            where: {
              id: existing.id,
            },
            data: answerData,
          })

          savedAnswer = toPersistedChecklistAnswerSnapshot(updatedAnswer)
        } else if (!existing && hasIncoming) {
          const createdAnswer = await tx.taskChecklistAnswer.create({
            data: {
              checklistRunId: checklistRun.id,
              runItemId: runItem!.id,
              templateItemId: item.id,
              ...answerData,
            },
          })

          savedAnswer = toPersistedChecklistAnswerSnapshot(createdAnswer)
        } else if (existing) {
          savedAnswer = existing
        } else {
          continue
        }

        if (mode === "submit") {
          runConditionAnswers.push({
            answerId: savedAnswer.id,
            runItemId: runItem?.id ?? savedAnswer.runItemId ?? null,
            templateItemId: savedAnswer.templateItemId,
            propertyTemplateItemId:
              runItem?.propertyTemplateItemId ?? savedAnswer.templateItemId,
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

        const failed = isFailureAnswer(item, effectiveAnswer)
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
                description: buildIssueDescription(item, effectiveAnswer),
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
            toNullableTrimmedString(effectiveAnswer.valueText) ||
            toNullableTrimmedString(effectiveAnswer.notes)

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
              toNullableTrimmedString(effectiveAnswer.notes)
                ? `Σημειώσεις: ${toNullableTrimmedString(effectiveAnswer.notes)}`
                : null,
              normalizePhotoUrls(effectiveAnswer.photoUrls).length > 0
                ? `Φωτογραφίες: ${normalizePhotoUrls(effectiveAnswer.photoUrls).length}`
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
      }

      if (mode === "submit" && runConditionAnswers.length > 0) {
        const conditionResults = await createPropertyConditionsFromRun(
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

        await resolveMergedPropertyConditionsNotSeenInRun(
          {
            organizationId: latestAssignment.task.property.organizationId,
            propertyId: latestAssignment.task.property.id,
            mergeKeysToKeepOpen: conditionResults.map((item) => item.mergeKey),
            sourceRunId: checklistRun.id,
            resolvedAt: now,
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
            sendIssuesChecklist: latestAssignment.task.sendIssuesChecklist,
            supplyRunStatus: latestAssignment.task.supplyRun?.status || null,
            issueRunStatus: latestAssignment.task.issueRun?.status || null,
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
