import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"
import {
  getReadinessStatusLabel,
} from "@/lib/readiness/compute-property-readiness"
import {
  mapDbConditionToRawRecord,
  mapSinglePropertyConditionForApi,
} from "@/lib/readiness/property-condition-mappers"

type RouteContext = {
  params: Promise<{
    conditionId: string
  }>
}

type PropertyConditionStatusValue =
  | "OPEN"
  | "MONITORING"
  | "RESOLVED"
  | "DISMISSED"

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

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response
    const auth = access.auth

    const { conditionId } = await context.params

    if (!isValidId(conditionId)) {
      return NextResponse.json(
        { error: "Invalid condition id." },
        { status: 400 }
      )
    }

    const condition = await prisma.propertyCondition.findUnique({
      where: {
        id: conditionId,
      },
      select: {
        id: true,
        organizationId: true,
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
        locationText: true,
        status: true,
        blockingStatus: true,
        severity: true,
        managerDecision: true,
        managerNotes: true,
        evidence: true,
        firstDetectedAt: true,
        lastDetectedAt: true,
        resolvedAt: true,
        dismissedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!condition) {
      return NextResponse.json(
        { error: "Property condition not found." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, condition.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την condition." },
        { status: 403 }
      )
    }

    const apiItem = mapSinglePropertyConditionForApi(
      mapDbConditionToRawRecord({
        id: condition.id,
        propertyId: condition.propertyId,
        taskId: condition.taskId,
        bookingId: condition.bookingId,
        propertySupplyId: condition.propertySupplyId,
        mergeKey: condition.mergeKey,
        title: condition.title,
        description: condition.description,
        sourceType: condition.sourceType,
        sourceLabel: condition.sourceLabel,
        sourceItemId: condition.sourceItemId,
        sourceItemLabel: condition.sourceItemLabel,
        sourceRunId: condition.sourceRunId,
        sourceAnswerId: condition.sourceAnswerId,
        conditionType: String(condition.conditionType).toLowerCase(),
        status: String(condition.status).toLowerCase(),
        blockingStatus: String(condition.blockingStatus).toLowerCase(),
        severity: String(condition.severity).toLowerCase(),
        managerDecision: condition.managerDecision
          ? String(condition.managerDecision).toLowerCase()
          : null,
        managerNotes: condition.managerNotes,
        firstDetectedAt: condition.firstDetectedAt,
        lastDetectedAt: condition.lastDetectedAt,
        createdAt: condition.createdAt,
        updatedAt: condition.updatedAt,
        resolvedAt: condition.resolvedAt,
        dismissedAt: condition.dismissedAt,
      })
    )

    return NextResponse.json(
      {
        item: {
          ...apiItem,
          organizationId: condition.organizationId,
          taskId: condition.taskId,
          bookingId: condition.bookingId,
          propertySupplyId: condition.propertySupplyId,
          mergeKey: condition.mergeKey,
          locationText: condition.locationText,
          evidence: condition.evidence,
          firstDetectedAt: condition.firstDetectedAt,
          lastDetectedAt: condition.lastDetectedAt,
        },
        generatedAt: new Date(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("GET /api/property-conditions/[conditionId] error:", error)

    return NextResponse.json(
      { error: "Failed to load property condition." },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response
    const auth = access.auth

    const { conditionId } = await context.params

    if (!isValidId(conditionId)) {
      return NextResponse.json(
        { error: "Invalid condition id." },
        { status: 400 }
      )
    }

    const existingCondition = await prisma.propertyCondition.findUnique({
      where: {
        id: conditionId,
      },
      select: {
        id: true,
        organizationId: true,
        propertyId: true,
        status: true,
        blockingStatus: true,
        severity: true,
        managerDecision: true,
        managerNotes: true,
        firstDetectedAt: true,
        lastDetectedAt: true,
        resolvedAt: true,
        dismissedAt: true,
      },
    })

    if (!existingCondition) {
      return NextResponse.json(
        { error: "Property condition not found." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existingCondition.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την condition." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const now = new Date()

    const nextStatus =
      body?.status !== undefined ? normalizeStatus(body.status) : undefined
    const nextBlockingStatus =
      body?.blockingStatus !== undefined
        ? normalizeBlockingStatus(body.blockingStatus)
        : undefined
    const nextSeverity =
      body?.severity !== undefined
        ? normalizeSeverity(body.severity)
        : undefined
    const nextManagerDecision =
      body?.managerDecision !== undefined
        ? normalizeManagerDecision(body.managerDecision)
        : undefined
    const nextManagerNotes =
      body?.managerNotes !== undefined
        ? toNullableString(body.managerNotes)
        : undefined
    const nextLastDetectedAt =
      body?.lastDetectedAt !== undefined
        ? toDateOrNull(body.lastDetectedAt)
        : undefined
    const nextFirstDetectedAt =
      body?.firstDetectedAt !== undefined
        ? toDateOrNull(body.firstDetectedAt)
        : undefined

    const patchData: {
      status?: PropertyConditionStatusValue
      blockingStatus?: PropertyConditionBlockingStatusValue
      severity?: PropertyConditionSeverityValue
      managerDecision?: PropertyConditionManagerDecisionValue | null
      managerNotes?: string | null
      firstDetectedAt?: Date
      lastDetectedAt?: Date
      resolvedAt?: Date | null
      dismissedAt?: Date | null
      updatedAt?: Date
    } = {
      updatedAt: now,
    }

    if (nextStatus) {
      patchData.status = toPrismaStatus(nextStatus)

      if (nextStatus === "resolved") {
        patchData.resolvedAt = now
        patchData.dismissedAt = null
      } else if (nextStatus === "dismissed") {
        patchData.dismissedAt = now
        patchData.resolvedAt = null
      } else {
        patchData.resolvedAt = null
        patchData.dismissedAt = null
      }
    }

    if (nextBlockingStatus) {
      patchData.blockingStatus = toPrismaBlockingStatus(nextBlockingStatus)
    }

    if (nextSeverity) {
      patchData.severity = toPrismaSeverity(nextSeverity)
    }

    if (nextManagerDecision !== undefined) {
      patchData.managerDecision = toPrismaManagerDecision(nextManagerDecision)

      if (nextManagerDecision === "resolved") {
        patchData.status = "RESOLVED"
        patchData.resolvedAt = now
        patchData.dismissedAt = null
      } else if (nextManagerDecision === "dismissed") {
        patchData.status = "DISMISSED"
        patchData.dismissedAt = now
        patchData.resolvedAt = null
      } else if (nextManagerDecision === "monitor") {
        if (!patchData.status) {
          patchData.status = "MONITORING"
        }
        patchData.resolvedAt = null
        patchData.dismissedAt = null
      } else if (
        nextManagerDecision === "allow_with_issue" ||
        nextManagerDecision === "block_until_resolved"
      ) {
        if (!patchData.status) {
          patchData.status = "OPEN"
        }
        if (
          nextManagerDecision === "block_until_resolved" &&
          !patchData.blockingStatus
        ) {
          patchData.blockingStatus = "BLOCKING"
        }
        patchData.resolvedAt = null
        patchData.dismissedAt = null
      }
    }

    if (nextManagerNotes !== undefined) {
      patchData.managerNotes = nextManagerNotes
    }

    if (nextFirstDetectedAt) {
      patchData.firstDetectedAt = nextFirstDetectedAt
    }

    if (nextLastDetectedAt) {
      patchData.lastDetectedAt = nextLastDetectedAt
    } else if (
      patchData.status === "OPEN" ||
      patchData.status === "MONITORING" ||
      patchData.managerDecision === "ALLOW_WITH_ISSUE" ||
      patchData.managerDecision === "BLOCK_UNTIL_RESOLVED" ||
      patchData.managerDecision === "MONITOR"
    ) {
      patchData.lastDetectedAt = now
    }

    const updatedCondition = await prisma.propertyCondition.update({
      where: {
        id: conditionId,
      },
      data: patchData,
      select: {
        id: true,
        organizationId: true,
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
        locationText: true,
        status: true,
        blockingStatus: true,
        severity: true,
        managerDecision: true,
        managerNotes: true,
        evidence: true,
        firstDetectedAt: true,
        lastDetectedAt: true,
        resolvedAt: true,
        dismissedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const apiItem = mapSinglePropertyConditionForApi(
      mapDbConditionToRawRecord({
        id: updatedCondition.id,
        propertyId: updatedCondition.propertyId,
        taskId: updatedCondition.taskId,
        bookingId: updatedCondition.bookingId,
        propertySupplyId: updatedCondition.propertySupplyId,
        mergeKey: updatedCondition.mergeKey,
        title: updatedCondition.title,
        description: updatedCondition.description,
        sourceType: updatedCondition.sourceType,
        sourceLabel: updatedCondition.sourceLabel,
        sourceItemId: updatedCondition.sourceItemId,
        sourceItemLabel: updatedCondition.sourceItemLabel,
        sourceRunId: updatedCondition.sourceRunId,
        sourceAnswerId: updatedCondition.sourceAnswerId,
        conditionType: String(updatedCondition.conditionType).toLowerCase(),
        status: String(updatedCondition.status).toLowerCase(),
        blockingStatus: String(updatedCondition.blockingStatus).toLowerCase(),
        severity: String(updatedCondition.severity).toLowerCase(),
        managerDecision: updatedCondition.managerDecision
          ? String(updatedCondition.managerDecision).toLowerCase()
          : null,
        managerNotes: updatedCondition.managerNotes,
        firstDetectedAt: updatedCondition.firstDetectedAt,
        lastDetectedAt: updatedCondition.lastDetectedAt,
        createdAt: updatedCondition.createdAt,
        updatedAt: updatedCondition.updatedAt,
        resolvedAt: updatedCondition.resolvedAt,
        dismissedAt: updatedCondition.dismissedAt,
      })
    )

    await prisma.activityLog.create({
      data: {
        organizationId: updatedCondition.organizationId,
        propertyId: updatedCondition.propertyId,
        taskId: updatedCondition.taskId || null,
        entityType: "PROPERTY_CONDITION",
        entityId: updatedCondition.id,
        action: "CONDITION_UPDATED",
        message: `Κατάσταση ακινήτου ενημερώθηκε: "${updatedCondition.title}"`,
        actorType: "manager",
        actorName: "Διαχειριστής",
        metadata: {
          previousStatus: String(existingCondition.status).toLowerCase(),
          newStatus: String(updatedCondition.status).toLowerCase(),
          previousManagerDecision: existingCondition.managerDecision
            ? String(existingCondition.managerDecision).toLowerCase()
            : null,
          newManagerDecision: updatedCondition.managerDecision
            ? String(updatedCondition.managerDecision).toLowerCase()
            : null,
        },
      },
    })

    // Condition truth αλλάζει → canonical readiness refresh
    const propertyTruth = await refreshPropertyReadiness(updatedCondition.propertyId)

    return NextResponse.json(
      {
        message: "Property condition updated successfully.",
        item: {
          ...apiItem,
          organizationId: updatedCondition.organizationId,
          taskId: updatedCondition.taskId,
          bookingId: updatedCondition.bookingId,
          propertySupplyId: updatedCondition.propertySupplyId,
          mergeKey: updatedCondition.mergeKey,
          locationText: updatedCondition.locationText,
          evidence: updatedCondition.evidence,
          firstDetectedAt: updatedCondition.firstDetectedAt,
          lastDetectedAt: updatedCondition.lastDetectedAt,
        },
        readiness: {
          status: propertyTruth.readiness.status,
          label: getReadinessStatusLabel(propertyTruth.readiness.status, "el"),
          score: propertyTruth.readiness.score,
          explain: propertyTruth.readiness.explain,
          reasons: propertyTruth.readiness.reasons,
          nextActions: propertyTruth.readiness.nextActions,
          counts: propertyTruth.readiness.counts,
          computedAt: propertyTruth.readiness.computedAt,
          nextCheckInAt: propertyTruth.readiness.nextCheckInAt,
        },
        generatedAt: new Date(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("PATCH /api/property-conditions/[conditionId] error:", error)

    return NextResponse.json(
      { error: "Failed to update property condition." },
      { status: 500 }
    )
  }
}
