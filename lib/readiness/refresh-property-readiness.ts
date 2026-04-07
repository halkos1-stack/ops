import { prisma } from "@/lib/prisma"
import {
  computePropertyReadiness,
  summarizeReadinessReasons,
} from "./compute-property-readiness"
import {
  buildPropertyConditionSnapshot,
  getLatestPropertyConditionUpdateAt,
  type RawPropertyConditionRecord,
} from "./property-condition-mappers"

type PropertyReadinessEnumValue = "READY" | "BORDERLINE" | "NOT_READY" | "UNKNOWN"

function toPropertyReadinessEnum(
  status: "ready" | "borderline" | "not_ready" | "unknown"
): PropertyReadinessEnumValue {
  if (status === "ready") return "READY"
  if (status === "borderline") return "BORDERLINE"
  if (status === "not_ready") return "NOT_READY"
  return "UNKNOWN"
}

function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null
  }

  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function mapDbConditionToRawRecord(input: {
  id: string
  propertyId: string
  taskId: string | null
  bookingId: string | null
  propertySupplyId: string | null
  mergeKey: string | null
  title: string
  description: string | null
  sourceType: string | null
  sourceLabel: string | null
  sourceItemId: string | null
  sourceItemLabel: string | null
  sourceRunId: string | null
  sourceAnswerId: string | null
  conditionType: string
  status: string
  blockingStatus: string
  severity: string
  managerDecision: string | null
  managerNotes: string | null
  createdAt: Date | string | null
  updatedAt: Date | string | null
  resolvedAt: Date | string | null
  dismissedAt: Date | string | null
}): RawPropertyConditionRecord {
  return {
    id: input.id,
    propertyId: input.propertyId,
    title: input.title,
    code: toNullableString(input.sourceLabel),
    itemKey: toNullableString(input.sourceItemId),
    itemLabel: toNullableString(input.sourceItemLabel),
    notes:
      toNullableString(input.managerNotes) ?? toNullableString(input.description),
    conditionType: String(input.conditionType).trim().toLowerCase(),
    status: String(input.status).trim().toLowerCase(),
    blockingStatus: String(input.blockingStatus).trim().toLowerCase(),
    severity: String(input.severity).trim().toLowerCase(),
    managerDecision: input.managerDecision
      ? String(input.managerDecision).trim().toLowerCase()
      : null,
    sourceType: toNullableString(input.sourceType),
    sourceTaskId: input.taskId,
    sourceChecklistRunId: toNullableString(input.sourceRunId),
    sourceChecklistAnswerId: toNullableString(input.sourceAnswerId),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    resolvedAt: input.resolvedAt,
    dismissedAt: input.dismissedAt,
  }
}

export async function refreshPropertyReadiness(propertyId: string) {
  const now = new Date()

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      organizationId: true,
      name: true,
    },
  })

  if (!property) {
    throw new Error(`Property "${propertyId}" was not found.`)
  }

  const [nextBooking, dbConditions] = await Promise.all([
    prisma.booking.findFirst({
      where: {
        organizationId: property.organizationId,
        propertyId: property.id,
        checkInDate: {
          gte: now,
        },
      },
      orderBy: {
        checkInDate: "asc",
      },
      select: {
        id: true,
        checkInDate: true,
      },
    }),
    prisma.propertyCondition.findMany({
      where: {
        organizationId: property.organizationId,
        propertyId: property.id,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        propertyId: true,
        taskId: true,
        bookingId: true,
        propertySupplyId: true,
        mergeKey: true,
        sourceType: true,
        sourceLabel: true,
        sourceItemId: true,
        sourceItemLabel: true,
        sourceRunId: true,
        sourceAnswerId: true,
        conditionType: true,
        title: true,
        description: true,
        status: true,
        blockingStatus: true,
        severity: true,
        managerDecision: true,
        managerNotes: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        dismissedAt: true,
      },
    }),
  ])

  const rawConditions: RawPropertyConditionRecord[] = dbConditions.map((condition) =>
    mapDbConditionToRawRecord({
      id: condition.id,
      propertyId: condition.propertyId,
      taskId: condition.taskId,
      bookingId: condition.bookingId,
      propertySupplyId: condition.propertySupplyId,
      mergeKey: condition.mergeKey ?? null,
      title: condition.title,
      description: condition.description,
      sourceType: condition.sourceType,
      sourceLabel: condition.sourceLabel,
      sourceItemId: condition.sourceItemId,
      sourceItemLabel: condition.sourceItemLabel,
      sourceRunId: condition.sourceRunId,
      sourceAnswerId: condition.sourceAnswerId,
      conditionType: String(condition.conditionType),
      status: String(condition.status),
      blockingStatus: String(condition.blockingStatus),
      severity: String(condition.severity),
      managerDecision: condition.managerDecision
        ? String(condition.managerDecision)
        : null,
      managerNotes: condition.managerNotes,
      createdAt: condition.createdAt,
      updatedAt: condition.updatedAt,
      resolvedAt: condition.resolvedAt,
      dismissedAt: condition.dismissedAt,
    })
  )

  const snapshot = buildPropertyConditionSnapshot(rawConditions)
  const readiness = computePropertyReadiness({
    now,
    nextCheckInAt: nextBooking?.checkInDate ?? null,
    conditions: snapshot.conditions.map((condition) => ({
      id: condition.id,
      propertyId: condition.propertyId,
      title: condition.title,
      description: condition.notes,
      conditionType: condition.conditionType,
      status: condition.effectiveStatus,
      blockingStatus: condition.effectiveBlockingStatus,
      severity: condition.effectiveSeverity,
      managerDecision: condition.effectiveManagerDecision,
      sourceType: condition.sourceType,
      sourceRunId: condition.sourceChecklistRunId,
      sourceAnswerId: condition.sourceChecklistAnswerId,
      taskId: condition.sourceTaskId,
      firstDetectedAt: condition.createdAt,
      lastDetectedAt: condition.updatedAt,
      resolvedAt: condition.resolvedAt,
      dismissedAt: condition.dismissedAt,
      createdAt: condition.createdAt,
      updatedAt: condition.updatedAt,
      propertySupplyId: null,
      bookingId: null,
      mergeKey: null,
      sourceLabel: condition.code,
      sourceItemId: condition.itemKey,
      sourceItemLabel: condition.itemLabel,
      locationText: null,
    })),
  })

  const latestConditionUpdatedAt =
    getLatestPropertyConditionUpdateAt(snapshot.conditions) ?? now.toISOString()

  const updatedProperty = await prisma.property.update({
    where: { id: property.id },
    data: {
      readinessStatus: toPropertyReadinessEnum(readiness.status),
      readinessUpdatedAt: new Date(latestConditionUpdatedAt),
      readinessReasonsText: summarizeReadinessReasons(readiness.reasons),
      openConditionCount: snapshot.summary.active,
      openBlockingConditionCount: snapshot.summary.blocking,
      openWarningConditionCount: snapshot.summary.warning,
      nextCheckInAt: nextBooking?.checkInDate ?? null,
    },
    select: {
      id: true,
      readinessStatus: true,
      readinessUpdatedAt: true,
      readinessReasonsText: true,
      openConditionCount: true,
      openBlockingConditionCount: true,
      openWarningConditionCount: true,
      nextCheckInAt: true,
    },
  })

  return {
    property,
    nextBooking,
    rawConditions,
    snapshot,
    readiness,
    updatedProperty,
    latestConditionUpdatedAt,
  }
}
