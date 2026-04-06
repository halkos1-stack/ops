import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildPropertyConditionSnapshot,
  type RawPropertyConditionRecord,
} from "@/lib/readiness/property-condition-mappers";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PropertyConditionStatusValue =
  | "OPEN"
  | "MONITORING"
  | "RESOLVED"
  | "DISMISSED";

type PropertyConditionTypeValue = "SUPPLY" | "ISSUE" | "DAMAGE";

type PropertyConditionBlockingStatusValue =
  | "BLOCKING"
  | "NON_BLOCKING"
  | "WARNING";

type PropertyConditionSeverityValue =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

type PropertyConditionManagerDecisionValue =
  | "ALLOW_WITH_ISSUE"
  | "BLOCK_UNTIL_RESOLVED"
  | "MONITOR"
  | "RESOLVED"
  | "DISMISSED";

function isValidId(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function normalizeConditionType(value: unknown): "supply" | "issue" | "damage" {
  if (value === "supply" || value === "issue" || value === "damage") {
    return value;
  }

  return "issue";
}

function normalizeStatus(
  value: unknown
): "open" | "monitoring" | "resolved" | "dismissed" {
  if (
    value === "open" ||
    value === "monitoring" ||
    value === "resolved" ||
    value === "dismissed"
  ) {
    return value;
  }

  return "open";
}

function normalizeBlockingStatus(
  value: unknown
): "blocking" | "non_blocking" | "warning" {
  if (
    value === "blocking" ||
    value === "non_blocking" ||
    value === "warning"
  ) {
    return value;
  }

  return "warning";
}

function normalizeSeverity(
  value: unknown
): "low" | "medium" | "high" | "critical" {
  if (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical"
  ) {
    return value;
  }

  return "medium";
}

function normalizeManagerDecision(
  value: unknown
):
  | "allow_with_issue"
  | "block_until_resolved"
  | "monitor"
  | "resolved"
  | "dismissed"
  | null {
  if (
    value === "allow_with_issue" ||
    value === "block_until_resolved" ||
    value === "monitor" ||
    value === "resolved" ||
    value === "dismissed"
  ) {
    return value;
  }

  return null;
}

function toPrismaConditionType(
  value: "supply" | "issue" | "damage"
): PropertyConditionTypeValue {
  switch (value) {
    case "supply":
      return "SUPPLY";
    case "issue":
      return "ISSUE";
    case "damage":
      return "DAMAGE";
    default:
      return "ISSUE";
  }
}

function toPrismaStatus(
  value: "open" | "monitoring" | "resolved" | "dismissed"
): PropertyConditionStatusValue {
  switch (value) {
    case "open":
      return "OPEN";
    case "monitoring":
      return "MONITORING";
    case "resolved":
      return "RESOLVED";
    case "dismissed":
      return "DISMISSED";
    default:
      return "OPEN";
  }
}

function toPrismaBlockingStatus(
  value: "blocking" | "non_blocking" | "warning"
): PropertyConditionBlockingStatusValue {
  switch (value) {
    case "blocking":
      return "BLOCKING";
    case "non_blocking":
      return "NON_BLOCKING";
    case "warning":
      return "WARNING";
    default:
      return "WARNING";
  }
}

function toPrismaSeverity(
  value: "low" | "medium" | "high" | "critical"
): PropertyConditionSeverityValue {
  switch (value) {
    case "low":
      return "LOW";
    case "medium":
      return "MEDIUM";
    case "high":
      return "HIGH";
    case "critical":
      return "CRITICAL";
    default:
      return "MEDIUM";
  }
}

function toPrismaManagerDecision(
  value:
    | "allow_with_issue"
    | "block_until_resolved"
    | "monitor"
    | "resolved"
    | "dismissed"
    | null
): PropertyConditionManagerDecisionValue | null {
  if (!value) return null;

  switch (value) {
    case "allow_with_issue":
      return "ALLOW_WITH_ISSUE";
    case "block_until_resolved":
      return "BLOCK_UNTIL_RESOLVED";
    case "monitor":
      return "MONITOR";
    case "resolved":
      return "RESOLVED";
    case "dismissed":
      return "DISMISSED";
    default:
      return null;
  }
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
}): RawPropertyConditionRecord & {
  taskId: string | null;
  bookingId: string | null;
  propertySupplyId: string | null;
  mergeKey: string | null;
  sourceLabel: string | null;
  sourceItemId: string | null;
  sourceItemLabel: string | null;
  sourceRunId: string | null;
  sourceAnswerId: string | null;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
} {
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
    conditionType: normalizeConditionType(condition.conditionType),
    status: normalizeStatus(condition.status),
    blockingStatus: normalizeBlockingStatus(condition.blockingStatus),
    severity: normalizeSeverity(condition.severity),
    managerDecision: normalizeManagerDecision(condition.managerDecision),
    sourceType: toNullableString(condition.sourceType),
    sourceTaskId: condition.taskId,
    sourceChecklistRunId: toNullableString(condition.sourceRunId),
    sourceChecklistAnswerId: toNullableString(condition.sourceAnswerId),
    createdAt: condition.createdAt,
    updatedAt: condition.updatedAt,
    resolvedAt: condition.resolvedAt,
    dismissedAt: condition.dismissedAt,

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
}

function parseOptionalBoolean(value: string | null): boolean | null {
  if (value === null) return null;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: propertyId } = await context.params;

    if (!isValidId(propertyId)) {
      return NextResponse.json(
        { error: "Μη έγκυρο αναγνωριστικό ακινήτου." },
        { status: 400 }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        name: true,
        code: true,
        organizationId: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);

    const statusFilter = searchParams.get("status");
    const typeFilter = searchParams.get("conditionType");
    const blockingFilter = searchParams.get("blockingStatus");
    const activeOnly = parseOptionalBoolean(searchParams.get("activeOnly"));
    const readinessOnly = parseOptionalBoolean(
      searchParams.get("readinessOnly")
    );

    const where: {
      propertyId: string;
      status?: PropertyConditionStatusValue;
      conditionType?: PropertyConditionTypeValue;
      blockingStatus?: PropertyConditionBlockingStatusValue;
    } = {
      propertyId,
    };

    if (
      statusFilter === "open" ||
      statusFilter === "monitoring" ||
      statusFilter === "resolved" ||
      statusFilter === "dismissed"
    ) {
      where.status = toPrismaStatus(statusFilter);
    }

    if (
      typeFilter === "supply" ||
      typeFilter === "issue" ||
      typeFilter === "damage"
    ) {
      where.conditionType = toPrismaConditionType(typeFilter);
    }

    if (
      blockingFilter === "blocking" ||
      blockingFilter === "non_blocking" ||
      blockingFilter === "warning"
    ) {
      where.blockingStatus = toPrismaBlockingStatus(blockingFilter);
    }

    const dbConditions = await prisma.propertyCondition.findMany({
      where,
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

    const rawConditions = dbConditions.map((condition) =>
      mapDbConditionToRawRecord({
        ...condition,
        conditionType: String(condition.conditionType).toLowerCase(),
        status: String(condition.status).toLowerCase(),
        blockingStatus: String(condition.blockingStatus).toLowerCase(),
        severity: String(condition.severity).toLowerCase(),
        managerDecision: condition.managerDecision
          ? String(condition.managerDecision).toLowerCase()
          : null,
      })
    );

    const snapshot = buildPropertyConditionSnapshot(rawConditions);

    let filteredConditions = [...snapshot.conditions];

    if (activeOnly === true) {
      filteredConditions = filteredConditions.filter(
        (condition) => condition.isActive
      );
    }

    if (readinessOnly === true) {
      filteredConditions = filteredConditions.filter(
        (condition) => condition.shouldAffectReadiness
      );
    }

    return NextResponse.json(
      {
        property: {
          id: property.id,
          organizationId: property.organizationId,
          code: property.code,
          name: property.name,
        },
        filters: {
          status: statusFilter,
          conditionType: typeFilter,
          blockingStatus: blockingFilter,
          activeOnly,
          readinessOnly,
        },
        summary: snapshot.summary,
        reasons: snapshot.reasons,
        buckets: {
          active: snapshot.buckets.active,
          resolvedLike: snapshot.buckets.resolvedLike,
          blocking: snapshot.buckets.blocking,
          warning: snapshot.buckets.warning,
          monitoring: snapshot.buckets.monitoring,
          supply: snapshot.buckets.supply,
          issue: snapshot.buckets.issue,
          damage: snapshot.buckets.damage,
        },
        items: filteredConditions,
        total: filteredConditions.length,
        generatedAt: new Date(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/properties/[id]/conditions error:", error);

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης condition records ακινήτου." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: propertyId } = await context.params;

    if (!isValidId(propertyId)) {
      return NextResponse.json(
        { error: "Μη έγκυρο αναγνωριστικό ακινήτου." },
        { status: 400 }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      );
    }

    const body = await request.json();

    const conditionType = normalizeConditionType(body?.conditionType);
    const status = normalizeStatus(body?.status);
    const blockingStatus = normalizeBlockingStatus(body?.blockingStatus);
    const severity = normalizeSeverity(body?.severity);
    const managerDecision = normalizeManagerDecision(body?.managerDecision);

    const title = toNullableString(body?.title);
    const description = toNullableString(body?.description);
    const sourceLabel = toNullableString(body?.sourceLabel);
    const sourceItemId = toNullableString(body?.sourceItemId);
    const sourceItemLabel = toNullableString(body?.sourceItemLabel);
    const managerNotes = toNullableString(body?.managerNotes);
    const mergeKey = toNullableString(body?.mergeKey);
    const sourceType = toNullableString(body?.sourceType) ?? "manager";
    const sourceRunId = toNullableString(body?.sourceRunId);
    const sourceAnswerId = toNullableString(body?.sourceAnswerId);
    const bookingId = toNullableString(body?.bookingId);
    const taskId = toNullableString(body?.taskId);
    const propertySupplyId = toNullableString(body?.propertySupplyId);
    const firstDetectedAt = toDateOrNull(body?.firstDetectedAt) ?? new Date();
    const lastDetectedAt =
      toDateOrNull(body?.lastDetectedAt) ?? firstDetectedAt;

    if (!title) {
      return NextResponse.json(
        { error: "Ο τίτλος του condition είναι υποχρεωτικός." },
        { status: 400 }
      );
    }

    const createdCondition = await prisma.propertyCondition.create({
      data: {
        organizationId: property.organizationId,
        propertyId: property.id,
        taskId,
        bookingId,
        propertySupplyId,
        mergeKey,
        sourceType,
        sourceLabel,
        sourceItemId,
        sourceItemLabel,
        sourceRunId,
        sourceAnswerId,
        conditionType: toPrismaConditionType(conditionType),
        title,
        description,
        status: toPrismaStatus(status),
        blockingStatus: toPrismaBlockingStatus(blockingStatus),
        severity: toPrismaSeverity(severity),
        managerDecision: toPrismaManagerDecision(managerDecision),
        managerNotes,
        firstDetectedAt,
        lastDetectedAt,
      },
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

    const rawCondition = mapDbConditionToRawRecord({
      ...createdCondition,
      conditionType: String(createdCondition.conditionType).toLowerCase(),
      status: String(createdCondition.status).toLowerCase(),
      blockingStatus: String(createdCondition.blockingStatus).toLowerCase(),
      severity: String(createdCondition.severity).toLowerCase(),
      managerDecision: createdCondition.managerDecision
        ? String(createdCondition.managerDecision).toLowerCase()
        : null,
    });

    const snapshot = buildPropertyConditionSnapshot([rawCondition]);

    return NextResponse.json(
      {
        message: "Το property condition δημιουργήθηκε επιτυχώς.",
        item: snapshot.conditions[0] ?? null,
        generatedAt: new Date(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/properties/[id]/conditions error:", error);

    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας property condition." },
      { status: 500 }
    );
  }
}
