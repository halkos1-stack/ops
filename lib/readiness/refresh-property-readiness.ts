import { prisma } from "@/lib/prisma"
import {
  computePropertyReadiness,
  summarizeReadinessReasons,
} from "./compute-property-readiness"
import {
  computePropertyOperationalStatus,
} from "./property-operational-status"
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

/**
 * Refreshes the stored readiness of a property.
 *
 * ΑΡΧΙΤΕΚΤΟΝΙΚΗ:
 * 1. Υπολογίζει καθαρό conditions-based readiness
 * 2. Υπολογίζει operational status με σωστό conditions fallback
 * 3. Υπολογίζει τελικό readiness με operational override
 * 4. Αποθηκεύει στη βάση το derivedReadinessStatus ως canonical επιχειρησιακή αλήθεια
 *
 * ΚΑΝΟΝΑΣ:
 * - αν υπάρχει turnover pending → effective readiness = "not_ready"
 * - αν ΔΕΝ υπάρχει operational blocker → fallback στο καθαρό conditions readiness
 *
 * Αυτό κλείνει την ασυνέπεια όπου το operational fallback μπορούσε να γράφει
 * "unknown" παρότι υπήρχε καθαρό conditions-based αποτέλεσμα.
 */
export async function refreshPropertyReadiness(propertyId: string) {
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

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

  const [nextBooking, recentBookings, dbConditions, dbTasks] = await Promise.all([
    prisma.booking.findFirst({
      where: {
        organizationId: property.organizationId,
        propertyId: property.id,
        checkInDate: { gte: now },
        status: { notIn: ["cancelled", "canceled"] },
      },
      orderBy: { checkInDate: "asc" },
      select: {
        id: true,
        checkInDate: true,
        checkOutDate: true,
        guestName: true,
        status: true,
      },
    }),

    prisma.booking.findMany({
      where: {
        organizationId: property.organizationId,
        propertyId: property.id,
        OR: [
          { checkInDate: { lte: now }, checkOutDate: { gte: now } },
          { checkOutDate: { gte: threeDaysAgo, lte: now } },
        ],
      },
      select: {
        id: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        guestName: true,
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

    prisma.task.findMany({
      where: {
        organizationId: property.organizationId,
        propertyId: property.id,
        status: {
          notIn: ["completed", "cancelled", "COMPLETED", "CANCELLED"],
        },
      },
      select: {
        id: true,
        title: true,
        taskType: true,
        status: true,
        scheduledDate: true,
        sendCleaningChecklist: true,
        sendSuppliesChecklist: true,
        sendIssuesChecklist: true,
        alertEnabled: true,
        alertAt: true,
        completedAt: true,
        bookingId: true,
        assignments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true },
        },
        checklistRun: {
          select: { status: true },
        },
        supplyRun: {
          select: { status: true },
        },
        issueRun: {
          select: { status: true },
        },
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

  const readinessConditions = snapshot.conditions.map((condition) => ({
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
  }))

  const conditionsReadiness = computePropertyReadiness({
    now,
    nextCheckInAt: nextBooking?.checkInDate ?? null,
    conditions: readinessConditions,
  })

  const bookingsForOperationalStatus = [
    ...recentBookings.map((b) => ({
      id: b.id,
      status: b.status ?? null,
      checkInDate: b.checkInDate ?? null,
      checkOutDate: b.checkOutDate ?? null,
      guestName: b.guestName ?? null,
    })),
    ...(nextBooking && nextBooking.checkInDate
      ? [
          {
            id: nextBooking.id,
            status: nextBooking.status ?? null,
            checkInDate: nextBooking.checkInDate,
            checkOutDate: nextBooking.checkOutDate ?? null,
            guestName: nextBooking.guestName ?? null,
          },
        ]
      : []),
  ]

  const operationalStatusResult = computePropertyOperationalStatus({
    now,
    readinessStatus: conditionsReadiness.status,
    bookings: bookingsForOperationalStatus,
    tasks: dbTasks.map((t) => ({
      id: String(t.id),
      title: String(t.title ?? ""),
      taskType: String(t.taskType ?? ""),
      status: String(t.status ?? ""),
      scheduledDate: t.scheduledDate ?? null,
      sendCleaningChecklist: Boolean(t.sendCleaningChecklist),
      sendSuppliesChecklist: Boolean(t.sendSuppliesChecklist),
      sendIssuesChecklist: Boolean(t.sendIssuesChecklist),
      alertEnabled: Boolean(t.alertEnabled),
      alertAt: t.alertAt ?? null,
      completedAt: t.completedAt ?? null,
      bookingId: t.bookingId ?? null,
      latestAssignmentStatus: t.assignments[0]?.status ?? null,
      checklistRunStatus: t.checklistRun?.status ?? null,
      supplyRunStatus: t.supplyRun?.status ?? null,
      issueRunStatus: t.issueRun?.status ?? null,
    })),
  })

  const readiness = computePropertyReadiness({
    now,
    nextCheckInAt: nextBooking?.checkInDate ?? null,
    conditions: readinessConditions,
    operationalContext:
      operationalStatusResult.derivedReadinessStatus !== "unknown"
        ? {
            derivedReadinessStatus: operationalStatusResult.derivedReadinessStatus,
            operationalReason: operationalStatusResult.reason.en,
          }
        : undefined,
  })

  const effectiveReadinessStatus = operationalStatusResult.derivedReadinessStatus

  const latestConditionUpdatedAt =
    getLatestPropertyConditionUpdateAt(snapshot.conditions) ?? now.toISOString()

  const updatedProperty = await prisma.property.update({
    where: { id: property.id },
    data: {
      readinessStatus: toPropertyReadinessEnum(effectiveReadinessStatus),
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
    conditionsReadiness,
    readiness,
    operationalStatusResult,
    effectiveReadinessStatus,
    updatedProperty,
    latestConditionUpdatedAt,
  }
}
