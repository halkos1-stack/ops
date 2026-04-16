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
 * 1. Υπολογίζει conditions-based readiness (computePropertyReadiness)
 * 2. Υπολογίζει operational status (computePropertyOperationalStatus)
 *    με πλήρη task / assignment / checklist run δεδομένα
 * 3. Χρησιμοποιεί derivedReadinessStatus ως effective readiness για αποθήκευση
 *    → Turnover pending = "not_ready" ακόμα και αν conditions clean
 *    → Κλείνει το architectural gap: DB readiness = πραγματική επιχειρησιακή αλήθεια
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
    // Επόμενη κράτηση (για conditions readiness + activeTarget στο operational status)
    prisma.booking.findFirst({
      where: {
        organizationId: property.organizationId,
        propertyId: property.id,
        checkInDate: { gte: now },
      },
      orderBy: { checkInDate: "asc" },
      select: { id: true, checkInDate: true, checkOutDate: true, guestName: true, status: true },
    }),

    // Πρόσφατες κρατήσεις για operational status (active stay + turnover window)
    prisma.booking.findMany({
      where: {
        organizationId: property.organizationId,
        propertyId: property.id,
        OR: [
          // Ενεργές τώρα
          { checkInDate: { lte: now }, checkOutDate: { gte: now } },
          // Πρόσφατο checkout (turnover window ≤ 3 ημέρες)
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

    // Conditions
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

    // Εργασίες με assignment + checklist run statuses για operational status
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

  // ─── Conditions snapshot + conditions-based readiness ────────────────────
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

  // ─── Operational status (occupancy + turnover window + task proof) ────────
  // Συνδυάζουμε recentBookings (active stay / recent checkout) +
  // nextBooking (future check-in) ώστε το activeTarget να υπολογιστεί σωστά.
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
    readinessStatus: null, // θα χρησιμοποιηθεί μόνο αν δεν υπάρχει turnover window
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

  // ─── Conditions readiness με operational context ──────────────────────────
  // Αν το operational context δείχνει turnover pending → override σε "not_ready"
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
    // Παρέχουμε operational context: αν τo derivedReadinessStatus είναι "not_ready"
    // λόγω turnover pending, η computePropertyReadiness θα override σε "not_ready"
    // ακόμα και αν δεν υπάρχουν active conditions.
    operationalContext:
      operationalStatusResult.derivedReadinessStatus !== "unknown"
        ? {
            derivedReadinessStatus: operationalStatusResult.derivedReadinessStatus,
            operationalReason: operationalStatusResult.reason.en,
          }
        : undefined,
  })

  // ─── Effective readiness = derivedReadinessStatus (canonical truth) ───────
  // Το derivedReadinessStatus ενσωματώνει τόσο conditions όσο και operational context.
  // Αυτό αποθηκεύεται στη DB — είναι η αλήθεια που βλέπει ο properties list.
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
    readiness,
    operationalStatusResult,
    effectiveReadinessStatus,
    updatedProperty,
    latestConditionUpdatedAt,
  }
}
