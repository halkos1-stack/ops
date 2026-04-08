import { prisma } from "@/lib/prisma"
import {
  computePropertyReadiness,
  summarizeReadinessReasons,
} from "./compute-property-readiness"
import {
  buildPropertyConditionSnapshot,
  getLatestPropertyConditionUpdateAt,
  mapDbConditionToRawRecord,
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
