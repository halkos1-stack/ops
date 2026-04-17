import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import {
  computePropertyReadiness,
  getReadinessStatusLabel,
  type ReadinessConditionInput,
} from "@/lib/readiness/compute-property-readiness"
import {
  buildPropertyConditionSnapshot,
  mapDbConditionToRawRecord,
  type RawPropertyConditionRecord,
} from "@/lib/readiness/property-condition-mappers"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type PropertyConditionStatusValue =
  | "OPEN"
  | "MONITORING"
  | "RESOLVED"
  | "DISMISSED"

type PropertyConditionTypeValue = "SUPPLY" | "ISSUE" | "DAMAGE"

type PropertyConditionBlockingStatusValue =
  | "BLOCKING"
  | "NON_BLOCKING"
  | "WARNING"

type PropertyConditionSeverityValue =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL"

type PropertyConditionManagerDecisionValue =
  | "ALLOW_WITH_ISSUE"
  | "BLOCK_UNTIL_RESOLVED"
  | "MONITOR"
  | "RESOLVED"
  | "DISMISSED"

function isValidId(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

function normalizeConditionType(value: unknown): "supply" | "issue" | "damage" {
  if (value === "supply" || value === "issue" || value === "damage") {
    return value
  }

  return "issue"
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
    return value
  }

  return "open"
}

function normalizeBlockingStatus(
  value: unknown
): "blocking" | "non_blocking" | "warning" {
  if (
    value === "blocking" ||
    value === "non_blocking" ||
    value === "warning"
  ) {
    return value
  }

  return "warning"
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
    return value
  }

  return "medium"
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
    return value
  }

  return null
}

function toPrismaConditionType(
  value: "supply" | "issue" | "damage"
): PropertyConditionTypeValue {
  switch (value) {
    case "supply":
      return "SUPPLY"
    case "issue":
      return "ISSUE"
    case "damage":
      return "DAMAGE"
    default:
      return "ISSUE"
  }
}

function toPrismaStatus(
  value: "open" | "monitoring" | "resolved" | "dismissed"
): PropertyConditionStatusValue {
  switch (value) {
    case "open":
      return "OPEN"
    case "monitoring":
      return "MONITORING"
    case "resolved":
      return "RESOLVED"
    case "dismissed":
      return "DISMISSED"
    default:
      return "OPEN"
  }
}

function toPrismaBlockingStatus(
  value: "blocking" | "non_blocking" | "warning"
): PropertyConditionBlockingStatusValue {
  switch (value) {
    case "blocking":
      return "BLOCKING"
    case "non_blocking":
      return "NON_BLOCKING"
    case "warning":
      return "WARNING"
    default:
      return "WARNING"
  }
}

function toPrismaSeverity(
  value: "low" | "medium" | "high" | "critical"
): PropertyConditionSeverityValue {
  switch (value) {
    case "low":
      return "LOW"
    case "medium":
      return "MEDIUM"
    case "high":
      return "HIGH"
    case "critical":
      return "CRITICAL"
    default:
      return "MEDIUM"
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
  if (!value) return null

  switch (value) {
    case "allow_with_issue":
      return "ALLOW_WITH_ISSUE"
    case "block_until_resolved":
      return "BLOCK_UNTIL_RESOLVED"
    case "monitor":
      return "MONITOR"
    case "resolved":
      return "RESOLVED"
    case "dismissed":
      return "DISMISSED"
    default:
      return null
  }
}

function mapDbConditionToExtended(condition: {
  id: string
  propertyId: string
  taskId: string | null
  bookingId: string | null
  propertySupplyId: string | null
  mergeKey: string | null
  title: string
  description: string | null
  sourceType: string
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
  firstDetectedAt: Date
  lastDetectedAt: Date
  createdAt: Date
  updatedAt: Date
  resolvedAt: Date | null
  dismissedAt: Date | null
}): RawPropertyConditionRecord & {
  taskId: string | null
  bookingId: string | null
  propertySupplyId: string | null
  mergeKey: string | null
  sourceLabel: string | null
  sourceItemId: string | null
  sourceItemLabel: string | null
  sourceRunId: string | null
  sourceAnswerId: string | null
  firstDetectedAt: Date
  lastDetectedAt: Date
} {
  const base = mapDbConditionToRawRecord(condition)
  return {
    ...base,
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
  }
}

function mapRawConditionToReadinessInput(
  condition: RawPropertyConditionRecord & {
    taskId?: string | null
    bookingId?: string | null
    propertySupplyId?: string | null
    mergeKey?: string | null
    sourceLabel?: string | null
    sourceItemId?: string | null
    sourceItemLabel?: string | null
    sourceRunId?: string | null
    sourceAnswerId?: string | null
    firstDetectedAt?: Date | string | null
    lastDetectedAt?: Date | string | null
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
  }
}

function parseOptionalBoolean(value: string | null): boolean | null {
  if (value === null) return null
  if (value === "true") return true
  if (value === "false") return false
  return null
}

async function buildCanonicalConditionsPayload(propertyId: string) {
  const now = new Date()

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      name: true,
      code: true,
      organizationId: true,
      nextCheckInAt: true,
    },
  })

  if (!property) {
    return null
  }

  const nextBooking = await prisma.booking.findFirst({
    where: {
      propertyId,
      status: {
        notIn: ["cancelled", "canceled"],
      },
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
  })

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
  })

  const rawConditions = dbConditions.map((condition) =>
    mapDbConditionToExtended({
      ...condition,
      conditionType: String(condition.conditionType).toLowerCase(),
      status: String(condition.status).toLowerCase(),
      blockingStatus: String(condition.blockingStatus).toLowerCase(),
      severity: String(condition.severity).toLowerCase(),
      managerDecision: condition.managerDecision
        ? String(condition.managerDecision).toLowerCase()
        : null,
    })
  )

  const snapshot = buildPropertyConditionSnapshot(rawConditions)
  const readinessConditions = rawConditions.map((condition) =>
    mapRawConditionToReadinessInput(condition)
  )
  const computedNextCheckInAt =
    nextBooking?.checkInDate ?? property.nextCheckInAt ?? null

  const readiness = computePropertyReadiness({
    now,
    nextCheckInAt: computedNextCheckInAt,
    conditions: readinessConditions,
  })

  return {
    property,
    nextBooking,
    snapshot,
    readiness,
    generatedAt: now,
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response
    const auth = access.auth

    const { id: propertyId } = await context.params

    if (!isValidId(propertyId)) {
      return NextResponse.json(
        { error: "Invalid property id." },
        { status: 400 }
      )
    }

    const payload = await buildCanonicalConditionsPayload(propertyId)

    if (!payload) {
      return NextResponse.json(
        { error: "Property not found." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, payload.property.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status")
    const typeFilter = searchParams.get("conditionType")
    const blockingFilter = searchParams.get("blockingStatus")
    const activeOnly = parseOptionalBoolean(searchParams.get("activeOnly"))
    const readinessOnly = parseOptionalBoolean(searchParams.get("readinessOnly"))

    let filteredConditions = [...payload.snapshot.conditions]

    if (statusFilter) {
      filteredConditions = filteredConditions.filter(
        (condition) => condition.effectiveStatus === statusFilter
      )
    }

    if (typeFilter) {
      filteredConditions = filteredConditions.filter(
        (condition) => condition.conditionType === typeFilter
      )
    }

    if (blockingFilter) {
      filteredConditions = filteredConditions.filter(
        (condition) => condition.effectiveBlockingStatus === blockingFilter
      )
    }

    if (activeOnly === true) {
      filteredConditions = filteredConditions.filter(
        (condition) => condition.isActive
      )
    }

    if (readinessOnly === true) {
      filteredConditions = filteredConditions.filter(
        (condition) => condition.shouldAffectReadiness
      )
    }

    return NextResponse.json(
      {
        property: {
          id: payload.property.id,
          organizationId: payload.property.organizationId,
          code: payload.property.code,
          name: payload.property.name,
        },
        filters: {
          status: statusFilter,
          conditionType: typeFilter,
          blockingStatus: blockingFilter,
          activeOnly,
          readinessOnly,
        },
        readiness: {
          status: payload.readiness.status,
          label: getReadinessStatusLabel(payload.readiness.status, "el"),
          score: payload.readiness.score,
          explain: payload.readiness.explain,
          reasons: payload.readiness.reasons,
          nextActions: payload.readiness.nextActions,
          counts: payload.readiness.counts,
          activeConditionIds: payload.readiness.activeConditionIds,
          blockingConditionIds: payload.readiness.blockingConditionIds,
          warningConditionIds: payload.readiness.warningConditionIds,
          computedAt: payload.readiness.computedAt,
          nextCheckInAt: payload.readiness.nextCheckInAt,
        },
        summary: payload.snapshot.summary,
        reasons: payload.snapshot.reasons,
        buckets: {
          active: payload.snapshot.buckets.active,
          resolvedLike: payload.snapshot.buckets.resolvedLike,
          blocking: payload.snapshot.buckets.blocking,
          warning: payload.snapshot.buckets.warning,
          monitoring: payload.snapshot.buckets.monitoring,
          supply: payload.snapshot.buckets.supply,
          issue: payload.snapshot.buckets.issue,
          damage: payload.snapshot.buckets.damage,
        },
        items: filteredConditions,
        total: filteredConditions.length,
        generatedAt: payload.generatedAt,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("GET /api/properties/[id]/conditions error:", error)

    return NextResponse.json(
      { error: "Failed to load property conditions." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response
    const auth = access.auth

    const { id: propertyId } = await context.params

    if (!isValidId(propertyId)) {
      return NextResponse.json(
        { error: "Invalid property id." },
        { status: 400 }
      )
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        organizationId: true,
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Property not found." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, property.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      )
    }

    const body = await request.json()

    const conditionType = normalizeConditionType(body?.conditionType)
    const status = normalizeStatus(body?.status)
    const blockingStatus = normalizeBlockingStatus(body?.blockingStatus)
    const severity = normalizeSeverity(body?.severity)
    const managerDecision = normalizeManagerDecision(body?.managerDecision)

    const title = toNullableString(body?.title)
    const description = toNullableString(body?.description)
    const sourceLabel = toNullableString(body?.sourceLabel)
    const sourceItemId = toNullableString(body?.sourceItemId)
    const sourceItemLabel = toNullableString(body?.sourceItemLabel)
    const managerNotes = toNullableString(body?.managerNotes)
    const mergeKey = toNullableString(body?.mergeKey)
    const sourceType = toNullableString(body?.sourceType) ?? "manager"
    const sourceRunId = toNullableString(body?.sourceRunId)
    const sourceAnswerId = toNullableString(body?.sourceAnswerId)
    const bookingId = toNullableString(body?.bookingId)
    const taskId = toNullableString(body?.taskId)
    const propertySupplyId = toNullableString(body?.propertySupplyId)
    const firstDetectedAt = toDateOrNull(body?.firstDetectedAt) ?? new Date()
    const lastDetectedAt =
      toDateOrNull(body?.lastDetectedAt) ?? firstDetectedAt

    if (!title) {
      return NextResponse.json(
        { error: "Condition title is required." },
        { status: 400 }
      )
    }

    await prisma.propertyCondition.create({
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
    })

    await refreshPropertyReadiness(property.id)

    const payload = await buildCanonicalConditionsPayload(property.id)

    if (!payload) {
      return NextResponse.json(
        { error: "Property not found after condition creation." },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        message: "Property condition created successfully.",
        readiness: {
          status: payload.readiness.status,
          label: getReadinessStatusLabel(payload.readiness.status, "el"),
          score: payload.readiness.score,
          explain: payload.readiness.explain,
          reasons: payload.readiness.reasons,
          nextActions: payload.readiness.nextActions,
          counts: payload.readiness.counts,
          computedAt: payload.readiness.computedAt,
          nextCheckInAt: payload.readiness.nextCheckInAt,
        },
        summary: payload.snapshot.summary,
        item: payload.snapshot.conditions[0] ?? null,
        generatedAt: payload.generatedAt,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/properties/[id]/conditions error:", error)

    return NextResponse.json(
      { error: "Failed to create property condition." },
      { status: 500 }
    )
  }
}
