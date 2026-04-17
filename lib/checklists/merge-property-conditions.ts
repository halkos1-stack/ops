import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type MergePropertyConditionInput = {
  organizationId: string
  propertyId: string
  mergeKey: string

  taskId?: string | null
  bookingId?: string | null
  propertySupplyId?: string | null

  sourceType?: string | null
  sourceLabel?: string | null
  sourceItemId?: string | null
  sourceItemLabel?: string | null
  sourceRunId?: string | null
  sourceAnswerId?: string | null

  conditionType: "SUPPLY" | "ISSUE" | "DAMAGE"
  title: string
  description?: string | null

  blockingStatus: "BLOCKING" | "WARNING" | "NON_BLOCKING"
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  evidence?: unknown
  detectedAt?: Date | null
}

export type MergePropertyConditionResult = {
  id: string
  action: "created" | "updated"
  mergeKey: string
  status: "OPEN" | "MONITORING" | "RESOLVED" | "DISMISSED"
}

export type ResolveMergedPropertyConditionsInput = {
  organizationId: string
  propertyId: string
  mergeKeysToKeepOpen: string[]
  sourceRunId?: string | null
  resolvedAt?: Date | null
}

export type ResolveMergedPropertyConditionsResult = {
  monitoringIds: string[]
  keptOpenIds: string[]
  notSeenIds: string[]
}

type MergePropertyConditionPrismaClient = {
  propertyCondition: {
    findFirst: typeof prisma.propertyCondition.findFirst
    findMany: typeof prisma.propertyCondition.findMany
    update: typeof prisma.propertyCondition.update
    updateMany: typeof prisma.propertyCondition.updateMany
    create: typeof prisma.propertyCondition.create
  }
}

function getDb(client?: MergePropertyConditionPrismaClient) {
  return client ?? prisma
}

function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null
  }

  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function normalizeDetectedAt(value?: Date | null): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  return new Date()
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values.map((value) => toNullableString(value)).filter(Boolean) as string[]
    ),
  ]
}

function normalizeEvidenceForPrisma(
  value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return Prisma.JsonNull
  }

  return value as Prisma.InputJsonValue
}

function normalizeStatus(
  value: unknown
): "OPEN" | "MONITORING" | "RESOLVED" | "DISMISSED" {
  const text = String(value ?? "").trim().toUpperCase()

  if (
    text === "OPEN" ||
    text === "MONITORING" ||
    text === "RESOLVED" ||
    text === "DISMISSED"
  ) {
    return text
  }

  return "OPEN"
}

function normalizeManagerDecision(
  value: unknown
):
  | "ALLOW_WITH_ISSUE"
  | "BLOCK_UNTIL_RESOLVED"
  | "MONITOR"
  | "RESOLVED"
  | "DISMISSED"
  | null {
  const text = String(value ?? "").trim().toUpperCase()

  if (
    text === "ALLOW_WITH_ISSUE" ||
    text === "BLOCK_UNTIL_RESOLVED" ||
    text === "MONITOR" ||
    text === "RESOLVED" ||
    text === "DISMISSED"
  ) {
    return text
  }

  return null
}

function resolveActiveStatus(input: {
  existingStatus: unknown
  existingManagerDecision: unknown
}): "OPEN" | "MONITORING" {
  const existingStatus = normalizeStatus(input.existingStatus)
  const existingManagerDecision = normalizeManagerDecision(
    input.existingManagerDecision
  )

  if (
    existingStatus === "MONITORING" ||
    existingManagerDecision === "MONITOR"
  ) {
    return "MONITORING"
  }

  return "OPEN"
}

function resolveActiveManagerDecision(value: unknown) {
  const normalized = normalizeManagerDecision(value)

  if (
    normalized === "ALLOW_WITH_ISSUE" ||
    normalized === "BLOCK_UNTIL_RESOLVED" ||
    normalized === "MONITOR"
  ) {
    return normalized
  }

  return null
}

export async function mergePropertyCondition(
  input: MergePropertyConditionInput,
  client?: MergePropertyConditionPrismaClient
): Promise<MergePropertyConditionResult> {
  const db = getDb(client)
  const detectedAt = normalizeDetectedAt(input.detectedAt)

  const existingOpenCondition = await db.propertyCondition.findFirst({
    where: {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      mergeKey: input.mergeKey,
      status: {
        in: ["OPEN", "MONITORING"],
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      managerDecision: true,
    },
  })

  const evidence = normalizeEvidenceForPrisma(input.evidence)

  if (existingOpenCondition) {
    const updatedCondition = await db.propertyCondition.update({
      where: {
        id: existingOpenCondition.id,
      },
      data: {
        taskId: input.taskId ?? null,
        bookingId: input.bookingId ?? null,
        propertySupplyId: input.propertySupplyId ?? null,
        mergeKey: input.mergeKey,
        sourceType: toNullableString(input.sourceType) ?? "system",
        sourceLabel: toNullableString(input.sourceLabel),
        sourceItemId: toNullableString(input.sourceItemId),
        sourceItemLabel: toNullableString(input.sourceItemLabel),
        sourceRunId: toNullableString(input.sourceRunId),
        sourceAnswerId: toNullableString(input.sourceAnswerId),
        conditionType: input.conditionType,
        title: input.title,
        description: toNullableString(input.description),
        status: resolveActiveStatus({
          existingStatus: existingOpenCondition.status,
          existingManagerDecision: existingOpenCondition.managerDecision,
        }),
        blockingStatus: input.blockingStatus,
        severity: input.severity,
        managerDecision: resolveActiveManagerDecision(
          existingOpenCondition.managerDecision
        ),
        lastDetectedAt: detectedAt,
        resolvedAt: null,
        dismissedAt: null,
        ...(evidence !== undefined ? { evidence } : {}),
      },
      select: {
        id: true,
        status: true,
      },
    })

    return {
      id: updatedCondition.id,
      action: "updated",
      mergeKey: input.mergeKey,
      status: normalizeStatus(updatedCondition.status),
    }
  }

  const createdCondition = await db.propertyCondition.create({
    data: {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      taskId: input.taskId ?? null,
      bookingId: input.bookingId ?? null,
      propertySupplyId: input.propertySupplyId ?? null,
      mergeKey: input.mergeKey,
      sourceType: toNullableString(input.sourceType) ?? "system",
      sourceLabel: toNullableString(input.sourceLabel),
      sourceItemId: toNullableString(input.sourceItemId),
      sourceItemLabel: toNullableString(input.sourceItemLabel),
      sourceRunId: toNullableString(input.sourceRunId),
      sourceAnswerId: toNullableString(input.sourceAnswerId),
      conditionType: input.conditionType,
      title: input.title,
      description: toNullableString(input.description),
      status: "OPEN",
      blockingStatus: input.blockingStatus,
      severity: input.severity,
      managerDecision: null,
      firstDetectedAt: detectedAt,
      lastDetectedAt: detectedAt,
      ...(evidence !== undefined ? { evidence } : {}),
    },
    select: {
      id: true,
      status: true,
    },
  })

  return {
    id: createdCondition.id,
    action: "created",
    mergeKey: input.mergeKey,
    status: normalizeStatus(createdCondition.status),
  }
}

export async function mergePropertyConditions(
  inputs: MergePropertyConditionInput[],
  client?: MergePropertyConditionPrismaClient
): Promise<MergePropertyConditionResult[]> {
  const results: MergePropertyConditionResult[] = []

  for (const input of inputs) {
    const result = await mergePropertyCondition(input, client)
    results.push(result)
  }

  return results
}

export async function resolveMergedPropertyConditionsNotSeenInRun(
  input: ResolveMergedPropertyConditionsInput,
  client?: MergePropertyConditionPrismaClient
): Promise<ResolveMergedPropertyConditionsResult> {
  const db = getDb(client)
  const mergeKeysToKeepOpen = uniqueStrings(input.mergeKeysToKeepOpen)

  const openConditions = await db.propertyCondition.findMany({
    where: {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      conditionType: { not: "SUPPLY" },
      status: {
        in: ["OPEN", "MONITORING"],
      },
      ...(toNullableString(input.sourceRunId)
        ? {
            sourceRunId: toNullableString(input.sourceRunId),
          }
        : {}),
    },
    select: {
      id: true,
      mergeKey: true,
      blockingStatus: true,
      managerDecision: true,
      description: true,
    },
  })

  const keptOpenIds = openConditions
    .filter((condition) => {
      const mergeKey = toNullableString(condition.mergeKey)
      return !!mergeKey && mergeKeysToKeepOpen.includes(mergeKey)
    })
    .map((condition) => condition.id)

  const notSeenIds = openConditions
    .filter((condition) => {
      const mergeKey = toNullableString(condition.mergeKey)
      return !!mergeKey && !mergeKeysToKeepOpen.includes(mergeKey)
    })
    .map((condition) => condition.id)

  const monitoringIds: string[] = []

  for (const condition of openConditions.filter((row) => notSeenIds.includes(row.id))) {
    const currentDescription = toNullableString(condition.description)
    const monitoringNote =
      "Latest relevant execution proof did not re-detect this condition. The condition moved to monitoring and remains active until explicit resolution or dismissal."

    const nextBlockingStatus =
      normalizeManagerDecision(condition.managerDecision) ===
      "BLOCK_UNTIL_RESOLVED"
        ? "BLOCKING"
        : "WARNING"

    const updated = await db.propertyCondition.update({
      where: {
        id: condition.id,
      },
      data: {
        status: "MONITORING",
        blockingStatus: nextBlockingStatus,
        description: currentDescription
          ? `${currentDescription}\n\n${monitoringNote}`
          : monitoringNote,
        ...(input.resolvedAt instanceof Date &&
        !Number.isNaN(input.resolvedAt.getTime())
          ? { lastDetectedAt: input.resolvedAt }
          : {}),
      },
      select: {
        id: true,
      },
    })

    monitoringIds.push(updated.id)
  }

  return {
    monitoringIds,
    keptOpenIds,
    notSeenIds,
  }
}

export type ResolveActiveSupplyShortageConditionsInput = {
  organizationId: string
  propertyId: string
  mergeKeysToKeepOpen: string[]
  resolvedAt: Date
}

export type ResolveActiveSupplyShortageConditionsResult = {
  resolvedIds: string[]
}

export async function resolveActiveSupplyShortageConditions(
  input: ResolveActiveSupplyShortageConditionsInput,
  client?: MergePropertyConditionPrismaClient
): Promise<ResolveActiveSupplyShortageConditionsResult> {
  const db = getDb(client)
  const mergeKeysToKeepOpen = uniqueStrings(input.mergeKeysToKeepOpen)

  const activeSupplyConditions = await db.propertyCondition.findMany({
    where: {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      conditionType: "SUPPLY",
      status: {
        in: ["OPEN", "MONITORING"],
      },
    },
    select: {
      id: true,
      mergeKey: true,
    },
  })

  const conditionIdsToResolve = activeSupplyConditions
    .filter((condition) => {
      const mergeKey = toNullableString(condition.mergeKey)
      return !!mergeKey && !mergeKeysToKeepOpen.includes(mergeKey)
    })
    .map((condition) => condition.id)

  if (conditionIdsToResolve.length === 0) {
    return { resolvedIds: [] }
  }

  await db.propertyCondition.updateMany({
    where: {
      id: {
        in: conditionIdsToResolve,
      },
    },
    data: {
      status: "RESOLVED",
      blockingStatus: "NON_BLOCKING",
      managerDecision: "RESOLVED",
      resolvedAt: input.resolvedAt,
      dismissedAt: null,
      lastDetectedAt: input.resolvedAt,
    },
  })

  return { resolvedIds: conditionIdsToResolve }
}
