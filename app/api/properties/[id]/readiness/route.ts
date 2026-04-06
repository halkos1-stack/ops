import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  computePropertyReadiness,
  getReadinessStatusLabel,
  type ReadinessConditionInput,
} from "@/lib/readiness/compute-property-readiness";
import {
  buildPropertyConditionSnapshot,
  getLatestPropertyConditionUpdateAt,
  type RawPropertyConditionRecord,
} from "@/lib/readiness/property-condition-mappers";

type RouteContext = {
  params: {
    id: string;
  };
};

function isValidId(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toLowerStringOrNull(value: unknown): string | null {
  const safe = toNullableString(typeof value === "string" ? value : null);
  return safe ? safe.toLowerCase() : null;
}

function mapDbConditionToRawRecord(condition: {
  id: string;
  propertyId: string;
  taskId: string | null;
  bookingId: string | null;
  propertySupplyId: string | null;
  mergeKey: string | null;
  title: string;
  description: string | null;
  sourceType: string;
  sourceLabel: string | null;
  sourceItemId: string | null;
  sourceItemLabel: string | null;
  sourceRunId: string | null;
  sourceAnswerId: string | null;
  conditionType: string;
  status: string;
  blockingStatus: string;
  severity: string;
  managerDecision: string | null;
  managerNotes: string | null;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  dismissedAt: Date | null;
}): RawPropertyConditionRecord {
  return {
    id: condition.id,
    propertyId: condition.propertyId,
    title: condition.title,
    code: toNullableString(condition.sourceLabel),
    itemKey: toNullableString(condition.sourceItemId),
    itemLabel: toNullableString(condition.sourceItemLabel),
    notes:
      toNullableString(condition.managerNotes) ??
      toNullableString(condition.description),
    conditionType: condition.conditionType,
    status: condition.status,
    blockingStatus: condition.blockingStatus,
    severity: condition.severity,
    managerDecision: condition.managerDecision,
    sourceType: toNullableString(condition.sourceType),
    sourceTaskId: condition.taskId,
    sourceChecklistRunId: toNullableString(condition.sourceRunId),
    sourceChecklistAnswerId: toNullableString(condition.sourceAnswerId),
    createdAt: condition.createdAt,
    updatedAt: condition.updatedAt,
    resolvedAt: condition.resolvedAt,
    dismissedAt: condition.dismissedAt,
  };
}

function mapRawConditionToReadinessInput(
  condition: RawPropertyConditionRecord & {
    taskId?: string | null;
    bookingId?: string | null;
    propertySupplyId?: string | null;
    mergeKey?: string | null;
    sourceLabel?: string | null;
    sourceItemId?: string | null;
    sourceItemLabel?: string | null;
    sourceRunId?: string | null;
    sourceAnswerId?: string | null;
    firstDetectedAt?: Date | string | null;
    lastDetectedAt?: Date | string | null;
  }
): ReadinessConditionInput {
  return {
    id: condition.id,
    propertyId: condition.propertyId,
    conditionType:
      condition.conditionType === "supply" ||
      condition.conditionType === "issue" ||
      condition.conditionType === "damage"
        ? condition.conditionType
        : "issue",
    status:
      condition.status === "open" ||
      condition.status === "monitoring" ||
      condition.status === "resolved" ||
      condition.status === "dismissed"
        ? condition.status
        : "open",
    blockingStatus:
      condition.blockingStatus === "blocking" ||
      condition.blockingStatus === "non_blocking" ||
      condition.blockingStatus === "warning"
        ? condition.blockingStatus
        : "warning",
    severity:
      condition.severity === "low" ||
      condition.severity === "medium" ||
      condition.severity === "high" ||
      condition.severity === "critical"
        ? condition.severity
        : "medium",
    managerDecision:
      condition.managerDecision === "allow_with_issue" ||
      condition.managerDecision === "block_until_resolved" ||
      condition.managerDecision === "monitor" ||
      condition.managerDecision === "resolved" ||
      condition.managerDecision === "dismissed"
        ? condition.managerDecision
        : null,
    title: condition.title ?? null,
    description: condition.notes ?? null,
    firstDetectedAt: condition.firstDetectedAt ?? null,
    lastDetectedAt: condition.lastDetectedAt ?? null,
    createdAt: condition.createdAt ?? null,
    updatedAt: condition.updatedAt ?? null,
    resolvedAt: condition.resolvedAt ?? null,
    dismissedAt: condition.dismissedAt ?? null,
    sourceType: condition.sourceType ?? null,
    sourceLabel: condition.sourceLabel ?? null,
    sourceItemId: condition.sourceItemId ?? null,
    sourceItemLabel: condition.sourceItemLabel ?? null,
    sourceRunId: condition.sourceRunId ?? null,
    sourceAnswerId: condition.sourceAnswerId ?? null,
    taskId: condition.taskId ?? condition.sourceTaskId ?? null,
    bookingId: condition.bookingId ?? null,
    propertySupplyId: condition.propertySupplyId ?? null,
    mergeKey: condition.mergeKey ?? null,
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const propertyId = context.params.id;

    if (!isValidId(propertyId)) {
      return NextResponse.json(
        { error: "Μη έγκυρο αναγνωριστικό ακινήτου." },
        { status: 400 }
      );
    }

    const now = new Date();

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        name: true,
        code: true,
        organizationId: true,
        readinessStatus: true,
        readinessUpdatedAt: true,
        readinessReasonsText: true,
        openConditionCount: true,
        openBlockingConditionCount: true,
        openWarningConditionCount: true,
        nextCheckInAt: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      );
    }

    const nextBooking = await prisma.booking.findFirst({
      where: {
        propertyId,
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
        checkOutDate: true,
        guestName: true,
        status: true,
        sourcePlatform: true,
      },
    });

    const dbConditions = await prisma.propertyCondition.findMany({
      where: {
        propertyId,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        propertyId: true,
        taskId: true,
        bookingId: true,
        propertySupplyId: true,
        mergeKey: true,
        title: true,
        description: true,
        sourceType: true,
        sourceLabel: true,
        sourceItemId: true,
        sourceItemLabel: true,
        sourceRunId: true,
        sourceAnswerId: true,
        conditionType: true,
        status: true,
        blockingStatus: true,
        severity: true,
        managerDecision: true,
        managerNotes: true,
        firstDetectedAt: true,
        lastDetectedAt: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        dismissedAt: true,
      },
    });

    const rawConditions = dbConditions.map((condition) => {
      const mapped = mapDbConditionToRawRecord({
        ...condition,
        conditionType: String(condition.conditionType).toLowerCase(),
        status: String(condition.status).toLowerCase(),
        blockingStatus: String(condition.blockingStatus).toLowerCase(),
        severity: String(condition.severity).toLowerCase(),
        managerDecision: condition.managerDecision
          ? String(condition.managerDecision).toLowerCase()
          : null,
      });

      return {
        ...mapped,
        taskId: condition.taskId,
        bookingId: condition.bookingId,
        propertySupplyId: condition.propertySupplyId,
        mergeKey: condition.mergeKey,
        sourceLabel: toNullableString(condition.sourceLabel),
        sourceItemId: toNullableString(condition.sourceItemId),
        sourceItemLabel: toNullableString(condition.sourceItemLabel),
        sourceRunId: toNullableString(condition.sourceRunId),
        sourceAnswerId: toNullableString(condition.sourceAnswerId),
        firstDetectedAt: condition.firstDetectedAt,
        lastDetectedAt: condition.lastDetectedAt,
      };
    });

    const snapshot = buildPropertyConditionSnapshot(rawConditions);

    const readinessConditions = rawConditions.map((condition) =>
      mapRawConditionToReadinessInput(condition)
    );

    const computedNextCheckInAt =
      nextBooking?.checkInDate ?? property.nextCheckInAt ?? null;

    const readiness = computePropertyReadiness({
      now,
      nextCheckInAt: computedNextCheckInAt,
      conditions: readinessConditions,
    });

    const latestConditionUpdateAt =
      getLatestPropertyConditionUpdateAt(snapshot.conditions);

    return NextResponse.json(
      {
        property: {
          id: property.id,
          organizationId: property.organizationId,
          code: property.code,
          name: property.name,
        },

        nextCheckIn: nextBooking
          ? {
              bookingId: nextBooking.id,
              checkInAt: nextBooking.checkInDate,
              checkOutAt: nextBooking.checkOutDate,
              guestName: nextBooking.guestName,
              bookingStatus: nextBooking.status,
              sourcePlatform: nextBooking.sourcePlatform,
            }
          : property.nextCheckInAt
            ? {
                bookingId: null,
                checkInAt: property.nextCheckInAt,
                checkOutAt: null,
                guestName: null,
                bookingStatus: null,
                sourcePlatform: null,
              }
            : null,

        readiness: {
          status: readiness.status,
          label: getReadinessStatusLabel(readiness.status, "el"),
          score: readiness.score,
          explain: readiness.explain,
          reasons: readiness.reasons,
          nextActions: readiness.nextActions,
          counts: readiness.counts,
          activeConditionIds: readiness.activeConditionIds,
          blockingConditionIds: readiness.blockingConditionIds,
          warningConditionIds: readiness.warningConditionIds,
          computedAt: readiness.computedAt,
          nextCheckInAt: readiness.nextCheckInAt,
        },

        conditions: {
          updatedAt: latestConditionUpdateAt,
          summary: snapshot.summary,
          reasons: snapshot.reasons,
          active: snapshot.buckets.active,
          blocking: snapshot.buckets.blocking,
          warning: snapshot.buckets.warning,
          monitoring: snapshot.buckets.monitoring,
          all: snapshot.conditions,
        },

        storedSummary: {
          readinessStatus: property.readinessStatus
            ? toLowerStringOrNull(String(property.readinessStatus))
            : null,
          readinessUpdatedAt: property.readinessUpdatedAt,
          readinessReasonsText: property.readinessReasonsText,
          openConditionCount: property.openConditionCount,
          openBlockingConditionCount: property.openBlockingConditionCount,
          openWarningConditionCount: property.openWarningConditionCount,
          nextCheckInAt: property.nextCheckInAt,
        },

        generatedAt: now,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/properties/[id]/readiness error:", error);

    return NextResponse.json(
      {
        error: "Αποτυχία φόρτωσης readiness ακινήτου.",
      },
      { status: 500 }
    );
  }
}