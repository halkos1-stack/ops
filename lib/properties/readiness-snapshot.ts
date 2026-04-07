import { prisma } from "@/lib/prisma"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"

export type PropertyReadinessStatus =
  | "READY"
  | "BORDERLINE"
  | "NOT_READY"
  | "UNKNOWN"

export type PropertyReadinessSnapshot = {
  propertyId: string
  organizationId: string
  readinessStatus: PropertyReadinessStatus
  readinessUpdatedAt: Date
  openTasksCount: number
  openIssuesCount: number
  activeAlertsCount: number
  criticalSupplyBlockersCount: number
  totalBlockersCount: number
  nextCheckInAt: Date | null
  hasUpcomingCheckInWithin3Hours: boolean
}

type RefreshPropertyReadinessSnapshotInput = {
  propertyId: string
  organizationId: string
  now?: Date
}

const OPEN_TASK_STATUSES = [
  "pending",
  "new",
  "assigned",
  "waiting_acceptance",
  "accepted",
  "in_progress",
]

const OPEN_ISSUE_STATUSES = ["open", "in_progress"]

const CANONICAL_OPERATIONAL_TASK_WHERE = {
  NOT: {
    source: {
      equals: "booking",
      mode: "insensitive" as const,
    },
    bookingId: null,
  },
}

function toSnapshotStatus(
  status: "ready" | "borderline" | "not_ready" | "unknown"
): PropertyReadinessStatus {
  if (status === "ready") return "READY"
  if (status === "borderline") return "BORDERLINE"
  if (status === "not_ready") return "NOT_READY"
  return "UNKNOWN"
}

function isWithinNextThreeHours(target: Date | null, now: Date) {
  if (!target) return false

  const diffMs = target.getTime() - now.getTime()
  return diffMs >= 0 && diffMs <= 3 * 60 * 60 * 1000
}

export async function computePropertyReadinessSnapshot(
  input: RefreshPropertyReadinessSnapshotInput
): Promise<PropertyReadinessSnapshot | null> {
  const now = input.now ?? new Date()

  const property = await prisma.property.findFirst({
    where: {
      id: input.propertyId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      organizationId: true,
    },
  })

  if (!property) {
    return null
  }

  const canonicalTruth = await refreshPropertyReadiness(property.id)

  const [openTasksCount, openIssuesCount, activeAlertsCount] = await Promise.all([
    prisma.task.count({
      where: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        ...CANONICAL_OPERATIONAL_TASK_WHERE,
        status: {
          in: OPEN_TASK_STATUSES,
        },
      },
    }),
    prisma.issue.count({
      where: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        status: {
          in: OPEN_ISSUE_STATUSES,
        },
      },
    }),
    prisma.task.count({
      where: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        ...CANONICAL_OPERATIONAL_TASK_WHERE,
        alertEnabled: true,
        alertAt: {
          lte: now,
        },
        status: {
          notIn: ["completed", "cancelled", "canceled"],
        },
      },
    }),
  ])

  const criticalSupplyBlockersCount =
    canonicalTruth.readiness.counts.blockingConditions

  return {
    propertyId: input.propertyId,
    organizationId: input.organizationId,
    readinessStatus: toSnapshotStatus(canonicalTruth.readiness.status),
    readinessUpdatedAt:
      canonicalTruth.updatedProperty.readinessUpdatedAt ?? now,
    openTasksCount,
    openIssuesCount,
    activeAlertsCount,
    criticalSupplyBlockersCount,
    totalBlockersCount: canonicalTruth.readiness.counts.blockingConditions,
    nextCheckInAt: canonicalTruth.updatedProperty.nextCheckInAt ?? null,
    hasUpcomingCheckInWithin3Hours: isWithinNextThreeHours(
      canonicalTruth.updatedProperty.nextCheckInAt ?? null,
      now
    ),
  }
}

export async function refreshPropertyReadinessSnapshot(
  input: RefreshPropertyReadinessSnapshotInput
): Promise<PropertyReadinessSnapshot | null> {
  return computePropertyReadinessSnapshot(input)
}
