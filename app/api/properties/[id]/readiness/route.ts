import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildTenantWhere, requireApiAppAccess } from "@/lib/route-access"
import { refreshPropertyReadinessSnapshot } from "@/lib/properties/readiness-snapshot"
import { getReadinessStatusLabel } from "@/lib/readiness/compute-property-readiness"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function isValidId(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0
}

function normalizeStoredReadinessStatus(
  value: unknown
): "ready" | "borderline" | "not_ready" | "unknown" | null {
  const normalized = String(value ?? "").trim().toLowerCase()

  if (
    normalized === "ready" ||
    normalized === "borderline" ||
    normalized === "not_ready" ||
    normalized === "unknown"
  ) {
    return normalized
  }

  return null
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccess()
  if (!access.ok) return access.response

  try {
    const { id: propertyId } = await context.params

    if (!isValidId(propertyId)) {
      return NextResponse.json(
        { error: "Invalid property id." },
        { status: 400 }
      )
    }

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        ...buildTenantWhere(access.auth),
      },
      select: {
        id: true,
        name: true,
        code: true,
        organizationId: true,
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Property not found." },
        { status: 404 }
      )
    }

    const refreshed = await refreshPropertyReadinessSnapshot({
      propertyId: property.id,
      organizationId: property.organizationId,
    })

    if (!refreshed) {
      return NextResponse.json(
        { error: "Property readiness not found." },
        { status: 404 }
      )
    }

    const { canonicalTruth, snapshot, generatedAt } = refreshed
    const conditionSnapshot = canonicalTruth.snapshot
    const updatedProperty = canonicalTruth.updatedProperty
    const nextCheckInAt = updatedProperty.nextCheckInAt ?? null

    return NextResponse.json(
      {
        property: {
          id: property.id,
          organizationId: property.organizationId,
          code: property.code,
          name: property.name,
        },
        nextCheckIn: canonicalTruth.nextBooking
          ? {
              bookingId: canonicalTruth.nextBooking.id,
              checkInAt: canonicalTruth.nextBooking.checkInDate,
              checkOutAt: null,
              guestName: null,
              bookingStatus: null,
              sourcePlatform: null,
            }
          : nextCheckInAt
            ? {
                bookingId: null,
                checkInAt: nextCheckInAt,
                checkOutAt: null,
                guestName: null,
                bookingStatus: null,
                sourcePlatform: null,
              }
            : null,
        readiness: {
          status: canonicalTruth.readiness.status,
          label: getReadinessStatusLabel(canonicalTruth.readiness.status, "el"),
          score: canonicalTruth.readiness.score,
          explain: canonicalTruth.readiness.explain,
          reasons: canonicalTruth.readiness.reasons,
          nextActions: canonicalTruth.readiness.nextActions,
          counts: canonicalTruth.readiness.counts,
          activeConditionIds: canonicalTruth.readiness.activeConditionIds,
          blockingConditionIds: canonicalTruth.readiness.blockingConditionIds,
          warningConditionIds: canonicalTruth.readiness.warningConditionIds,
          computedAt: canonicalTruth.readiness.computedAt,
          nextCheckInAt: canonicalTruth.readiness.nextCheckInAt,
        },
        conditions: {
          updatedAt: canonicalTruth.latestConditionUpdatedAt,
          summary: conditionSnapshot.summary,
          reasons: conditionSnapshot.reasons,
          active: conditionSnapshot.buckets.active,
          blocking: conditionSnapshot.buckets.blocking,
          warning: conditionSnapshot.buckets.warning,
          monitoring: conditionSnapshot.buckets.monitoring,
          all: conditionSnapshot.conditions,
        },
        storedSummary: {
          readinessStatus: normalizeStoredReadinessStatus(
            updatedProperty.readinessStatus
          ),
          readinessUpdatedAt: updatedProperty.readinessUpdatedAt,
          readinessReasonsText: updatedProperty.readinessReasonsText,
          openConditionCount: updatedProperty.openConditionCount,
          openBlockingConditionCount: updatedProperty.openBlockingConditionCount,
          openWarningConditionCount: updatedProperty.openWarningConditionCount,
          nextCheckInAt,
        },
        snapshot,
        generatedAt,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("GET /api/properties/[id]/readiness error:", error)

    return NextResponse.json(
      {
        error: "Failed to load property readiness.",
      },
      { status: 500 }
    )
  }
}
