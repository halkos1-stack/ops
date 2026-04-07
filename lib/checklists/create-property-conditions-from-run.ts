import { prisma } from "@/lib/prisma"
import { mergePropertyCondition } from "@/lib/checklists/merge-property-conditions"

export type PropertyConditionTypeValue = "SUPPLY" | "ISSUE" | "DAMAGE"
export type PropertyConditionSeverityValue =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL"
export type PropertyConditionBlockingStatusValue =
  | "BLOCKING"
  | "WARNING"
  | "NON_BLOCKING"

export type RunConditionAnswerInput = {
  answerId: string
  runItemId?: string | null
  templateItemId?: string | null
  propertyTemplateItemId?: string | null
  templateItemLabel: string
  templateItemCategory?: string | null
  itemType: string
  linkedSupplyItemId?: string | null
  opensIssueOnFail?: boolean
  issueTypeOnFail?: string | null
  issueSeverityOnFail?: string | null
  failureValuesText?: string | null
  valueBoolean?: boolean | null
  valueText?: string | null
  valueNumber?: number | null
  valueSelect?: string | null
  notes?: string | null
  photoUrls?: string[] | null
}

export type RunConditionContextInput = {
  organizationId: string
  propertyId: string
  taskId: string
  bookingId?: string | null
  runId: string
  templateId?: string | null
  templateTitle: string
  answers: RunConditionAnswerInput[]
  detectedAt?: Date
}

export type CreatedOrUpdatedPropertyConditionResult = {
  id: string
  action: "created" | "updated"
  mergeKey: string
}

type PropertyConditionFindFirst = typeof prisma.propertyCondition.findFirst
type PropertyConditionFindMany = typeof prisma.propertyCondition.findMany
type PropertyConditionUpdate = typeof prisma.propertyCondition.update
type PropertyConditionUpdateMany = typeof prisma.propertyCondition.updateMany
type PropertyConditionCreate = typeof prisma.propertyCondition.create
type PropertySupplyFindFirst = typeof prisma.propertySupply.findFirst

export type PropertyConditionPrismaClient = {
  propertyCondition: {
    findFirst: PropertyConditionFindFirst
    findMany: PropertyConditionFindMany
    update: PropertyConditionUpdate
    updateMany: PropertyConditionUpdateMany
    create: PropertyConditionCreate
  }
  propertySupply?: {
    findFirst: PropertySupplyFindFirst
  }
}

function getPrismaClient(
  client?: PropertyConditionPrismaClient
): PropertyConditionPrismaClient {
  return client ?? (prisma as PropertyConditionPrismaClient)
}

function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null
  }

  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function normalizePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
}

function normalizeTextListFromCsv(value: unknown): string[] {
  const text = toNullableString(value)
  if (!text) {
    return []
  }

  return text
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

function normalizeItemType(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

function buildAnswerValueSummary(answer: RunConditionAnswerInput): string | null {
  if (typeof answer.valueBoolean === "boolean") {
    return answer.valueBoolean ? "true" : "false"
  }

  if (
    typeof answer.valueNumber === "number" &&
    Number.isFinite(answer.valueNumber)
  ) {
    return String(answer.valueNumber)
  }

  if (toNullableString(answer.valueSelect)) {
    return toNullableString(answer.valueSelect)
  }

  if (toNullableString(answer.valueText)) {
    return toNullableString(answer.valueText)
  }

  return null
}

function inferConditionType(input: {
  linkedSupplyItemId?: string | null
  category?: string | null
  issueTypeOnFail?: string | null
}): PropertyConditionTypeValue {
  if (input.linkedSupplyItemId) {
    return "SUPPLY"
  }

  const category = String(input.category ?? "").trim().toLowerCase()
  const failType = String(input.issueTypeOnFail ?? "").trim().toLowerCase()

  if (category.includes("damage") || failType.includes("damage")) {
    return "DAMAGE"
  }

  return "ISSUE"
}

function inferSeverity(value: unknown): PropertyConditionSeverityValue {
  const normalized = String(value ?? "").trim().toLowerCase()

  if (normalized === "low") return "LOW"
  if (normalized === "medium") return "MEDIUM"
  if (normalized === "high") return "HIGH"
  if (normalized === "critical" || normalized === "urgent") return "CRITICAL"

  return "MEDIUM"
}

function inferBlockingStatus(input: {
  conditionType: PropertyConditionTypeValue
  severity: PropertyConditionSeverityValue
}): PropertyConditionBlockingStatusValue {
  if (input.conditionType === "SUPPLY") return "BLOCKING"
  if (input.conditionType === "DAMAGE") return "BLOCKING"
  if (input.severity === "CRITICAL") return "BLOCKING"
  if (input.severity === "HIGH") return "WARNING"
  return "WARNING"
}

function evaluateFailure(answer: RunConditionAnswerInput): {
  failed: boolean
  failureReason: string | null
} {
  const itemType = normalizeItemType(answer.itemType)
  const failureValues = normalizeTextListFromCsv(answer.failureValuesText)
  const valueSummary = buildAnswerValueSummary(answer)
  const normalizedValue = valueSummary?.trim().toLowerCase() ?? null

  if (
    itemType === "boolean" ||
    itemType === "yes_no" ||
    itemType === "pass_fail" ||
    itemType === "checkbox"
  ) {
    if (answer.valueBoolean === false) {
      return {
        failed: true,
        failureReason: "Boolean checklist answer reported a failed state.",
      }
    }

    if (
      normalizedValue &&
      failureValues.length > 0 &&
      failureValues.includes(normalizedValue)
    ) {
      return {
        failed: true,
        failureReason: "Answer matched a configured failure value.",
      }
    }

    return {
      failed: false,
      failureReason: null,
    }
  }

  if (
    normalizedValue &&
    failureValues.length > 0 &&
    failureValues.includes(normalizedValue)
  ) {
    return {
      failed: true,
      failureReason: "Answer matched a configured failure value.",
    }
  }

  if (answer.opensIssueOnFail === true) {
    if (
      answer.valueBoolean === false ||
      normalizedValue === "fail" ||
      normalizedValue === "failed" ||
      normalizedValue === "no" ||
      normalizedValue === "problem" ||
      normalizedValue === "issue" ||
      normalizedValue === "damage" ||
      normalizedValue === "missing" ||
      normalizedValue === "empty"
    ) {
      return {
        failed: true,
        failureReason:
          "Checklist answer triggered the configured fail-to-condition rule.",
      }
    }
  }

  return {
    failed: false,
    failureReason: null,
  }
}

function resolveSourceItemId(answer: RunConditionAnswerInput): string {
  return (
    toNullableString(answer.propertyTemplateItemId) ??
    toNullableString(answer.templateItemId) ??
    toNullableString(answer.runItemId) ??
    answer.answerId
  )
}

function resolveTargetItemId(answer: RunConditionAnswerInput): string {
  return (
    toNullableString(answer.propertyTemplateItemId) ??
    toNullableString(answer.templateItemId) ??
    toNullableString(answer.runItemId) ??
    answer.answerId
  )
}

function buildConditionMergeKey(input: {
  propertyId: string
  targetItemId: string
  linkedSupplyItemId?: string | null
  conditionType: PropertyConditionTypeValue
}): string {
  if (input.linkedSupplyItemId) {
    return `property:${input.propertyId}:supply-item:${input.linkedSupplyItemId}:condition:${input.conditionType.toLowerCase()}`
  }

  return `property:${input.propertyId}:template-item:${input.targetItemId}:condition:${input.conditionType.toLowerCase()}`
}

function buildConditionTitle(input: {
  label: string
  conditionType: PropertyConditionTypeValue
}): string {
  if (input.conditionType === "SUPPLY") {
    return `Supply shortage: ${input.label}`
  }

  if (input.conditionType === "DAMAGE") {
    return `Damage: ${input.label}`
  }

  return `Issue: ${input.label}`
}

function buildConditionDescription(input: {
  label: string
  answer: RunConditionAnswerInput
  failureReason: string | null
}): string {
  const parts: string[] = [
    `Checklist item "${input.label}" was submitted as a failed finding.`,
  ]

  const valueSummary = buildAnswerValueSummary(input.answer)
  if (valueSummary) {
    parts.push(`Reported value: ${valueSummary}.`)
  }

  const notes = toNullableString(input.answer.notes)
  if (notes) {
    parts.push(`Partner notes: ${notes}.`)
  }

  if (input.failureReason) {
    parts.push(`Failure rule: ${input.failureReason}`)
  }

  return parts.join(" ")
}

function buildEvidence(answer: RunConditionAnswerInput): {
  photoUrls: string[]
  valueBoolean: boolean | null
  valueText: string | null
  valueNumber: number | null
  valueSelect: string | null
  notes: string | null
} {
  return {
    photoUrls: normalizePhotoUrls(answer.photoUrls),
    valueBoolean:
      typeof answer.valueBoolean === "boolean" ? answer.valueBoolean : null,
    valueText: toNullableString(answer.valueText),
    valueNumber:
      typeof answer.valueNumber === "number" && Number.isFinite(answer.valueNumber)
        ? answer.valueNumber
        : null,
    valueSelect: toNullableString(answer.valueSelect),
    notes: toNullableString(answer.notes),
  }
}

function normalizeMergeResult(
  value: unknown
): CreatedOrUpdatedPropertyConditionResult {
  const row = (value ?? {}) as {
    id?: unknown
    action?: unknown
    mergeKey?: unknown
  }

  const id =
    typeof row.id === "string" && row.id.trim().length > 0
      ? row.id.trim()
      : ""

  const action =
    row.action === "created" || row.action === "updated"
      ? row.action
      : "updated"

  const mergeKey =
    typeof row.mergeKey === "string" && row.mergeKey.trim().length > 0
      ? row.mergeKey.trim()
      : ""

  if (!id) {
    throw new Error(
      "mergePropertyCondition returned a result without a valid id."
    )
  }

  if (!mergeKey) {
    throw new Error(
      "mergePropertyCondition returned a result without a valid mergeKey."
    )
  }

  return {
    id,
    action,
    mergeKey,
  }
}

async function resolvePropertySupplyId(input: {
  propertyId: string
  linkedSupplyItemId?: string | null
  client: PropertyConditionPrismaClient
}): Promise<string | null> {
  if (!input.linkedSupplyItemId) {
    return null
  }

  const propertySupplyClient = input.client.propertySupply ?? prisma.propertySupply

  const propertySupply = await propertySupplyClient.findFirst({
    where: {
      propertyId: input.propertyId,
      supplyItemId: input.linkedSupplyItemId,
    },
    select: {
      id: true,
    },
  })

  return propertySupply?.id ?? null
}

export async function createPropertyConditionsFromRun(
  input: RunConditionContextInput,
  client?: PropertyConditionPrismaClient
): Promise<CreatedOrUpdatedPropertyConditionResult[]> {
  const db = getPrismaClient(client)
  const detectedAt = input.detectedAt ?? new Date()
  const results: CreatedOrUpdatedPropertyConditionResult[] = []

  for (const answer of input.answers) {
    const failure = evaluateFailure(answer)

    if (!failure.failed) {
      continue
    }

    const conditionType = inferConditionType({
      linkedSupplyItemId: answer.linkedSupplyItemId,
      category: answer.templateItemCategory,
      issueTypeOnFail: answer.issueTypeOnFail,
    })

    const severity = inferSeverity(answer.issueSeverityOnFail)
    const blockingStatus = inferBlockingStatus({
      conditionType,
      severity,
    })

    const targetItemId = resolveTargetItemId(answer)
    const sourceItemId = resolveSourceItemId(answer)
    const propertySupplyId = await resolvePropertySupplyId({
      propertyId: input.propertyId,
      linkedSupplyItemId: answer.linkedSupplyItemId,
      client: db,
    })

    const mergeKey = buildConditionMergeKey({
      propertyId: input.propertyId,
      targetItemId,
      linkedSupplyItemId: answer.linkedSupplyItemId,
      conditionType,
    })

    const mergeResult = await mergePropertyCondition(
      {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        mergeKey,
        taskId: input.taskId,
        bookingId: input.bookingId ?? null,
        propertySupplyId,
        sourceType: "task_checklist_proof",
        sourceLabel: input.templateTitle,
        sourceItemId,
        sourceItemLabel: answer.templateItemLabel,
        sourceRunId: input.runId,
        sourceAnswerId: answer.answerId,
        conditionType,
        title: buildConditionTitle({
          label: answer.templateItemLabel,
          conditionType,
        }),
        description: buildConditionDescription({
          label: answer.templateItemLabel,
          answer,
          failureReason: failure.failureReason,
        }),
        blockingStatus,
        severity,
        evidence: buildEvidence(answer),
        detectedAt,
      },
      db
    )

    results.push(normalizeMergeResult(mergeResult))
  }

  return results
}

export type CleaningRunAnswerInput = RunConditionAnswerInput
export type CleaningRunContextInput = RunConditionContextInput
