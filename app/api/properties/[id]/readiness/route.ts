import { NextRequest, NextResponse } from "next/server"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"
import {
  getReadinessStatusLabel,
} from "@/lib/readiness/compute-property-readiness"
import {
  getLatestPropertyConditionUpdateAt,
} from "@/lib/readiness/property-condition-mappers"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function isValidId(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0
}

function toLowerStringOrNull(value: unknown): string | null {
  const s = String(value ?? "").trim().toLowerCase()
  return s.length > 0 ? s : null
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: propertyId } = await context.params

    if (!isValidId(propertyId)) {
      return NextResponse.json(
        { error: "Invalid property id." },
        { status: 400 }
      )
    }

    const result = await refreshPropertyReadiness(propertyId)

    const {
      property,
      nextBooking,
      snapshot,
      readiness,
      operationalStatusResult,
      effectiveReadinessStatus,
      updatedProperty,
    } = result

    const latestConditionUpdateAt =
      getLatestPropertyConditionUpdateAt(snapshot.conditions)

    return NextResponse.json(
      {
        property: {
          id: property.id,
          organizationId: property.organizationId,
          code: null,
          name: property.name,
        },
        nextCheckIn: nextBooking
          ? {
              bookingId: nextBooking.id,
              checkInAt: nextBooking.checkInDate,
              checkOutAt: null,
              guestName: null,
              bookingStatus: null,
              sourcePlatform: null,
            }
          : null,
        readiness: {
          status: effectiveReadinessStatus,
          label: getReadinessStatusLabel(effectiveReadinessStatus, "el"),
          score: readiness.score,
          explain: readiness.explain,
          reasons: readiness.reasons,
          nextActions: readiness.nextActions,
          counts: readiness.counts,
          activeConditionIds: readiness.activeConditionIds,
          blockingConditionIds: readiness.blockingConditionIds,
          warningConditionIds: readiness.warningConditionIds,
          computedAt: updatedProperty.readinessUpdatedAt ?? readiness.computedAt,
          nextCheckInAt: updatedProperty.nextCheckInAt ?? readiness.nextCheckInAt,
          conditionsReadinessStatus: readiness.status,
        },
        operationalStatus: {
          status: operationalStatusResult.operationalStatus,
          derivedReadinessStatus: operationalStatusResult.derivedReadinessStatus,
          effectiveReadinessStatus,
          label: operationalStatusResult.label,
          reason: operationalStatusResult.reason,
          explanation: operationalStatusResult.explanation,
          alertActive: operationalStatusResult.alertActive,
          alertTask: operationalStatusResult.alertTask,
          activeBooking: operationalStatusResult.activeBooking,
          relevantTask: operationalStatusResult.relevantTask,
          activeTarget: operationalStatusResult.activeTarget,
          planningTargets: operationalStatusResult.planningTargets,
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
          readinessStatus: toLowerStringOrNull(effectiveReadinessStatus),
          readinessUpdatedAt: updatedProperty.readinessUpdatedAt,
          readinessReasonsText: updatedProperty.readinessReasonsText,
          openConditionCount: updatedProperty.openConditionCount,
          openBlockingConditionCount: updatedProperty.openBlockingConditionCount,
          openWarningConditionCount: updatedProperty.openWarningConditionCount,
          nextCheckInAt: updatedProperty.nextCheckInAt,
        },
        generatedAt: new Date(),
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
