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

export type RefreshPropertyReadinessSnapshotInput = {
  propertyId: string
  organizationId?: string | null
  now?: Date
}

export type RefreshedPropertyReadiness = Awaited<
  ReturnType<typeof refreshPropertyReadiness>
>

export type PropertyReadinessSnapshotResult = {
  property: {
    id: string
    organizationId: string
  }
  snapshot: PropertyReadinessSnapshot
  canonicalTruth: RefreshedPropertyReadiness
  generatedAt: Date
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

async function resolvePropertyIdentity(
  input: RefreshPropertyReadinessSnapshotInput
) {
  return prisma.property.findFirst({
    where: {
      id: input.propertyId,
      ...(input.organizationId
        ? { organizationId: input.organizationId }
        : {}),
    },
    select: {
      id: true,
      organizationId: true,
    },
  })
}

async function buildPropertyReadinessSnapshot(params: {
  propertyId: string
  organizationId: string
  now: Date
  canonicalTruth: RefreshedPropertyReadiness
}): Promise<PropertyReadinessSnapshot> {
  const { propertyId, organizationId, now, canonicalTruth } = params

  const [openTasksCount, openIssuesCount, activeAlertsCount] = await Promise.all([
    prisma.task.count({
      where: {
        organizationId,
        propertyId,
        ...CANONICAL_OPERATIONAL_TASK_WHERE,
        status: {
          in: OPEN_TASK_STATUSES,
        },
      },
    }),
    prisma.issue.count({
      where: {
        organizationId,
        propertyId,
        status: {
          in: OPEN_ISSUE_STATUSES,
        },
      },
    }),
    prisma.task.count({
      where: {
        organizationId,
        propertyId,
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
    propertyId,
    organizationId,
    readinessStatus: toSnapshotStatus(canonicalTruth.readiness.status),
    readinessUpdatedAt: canonicalTruth.updatedProperty.readinessUpdatedAt ?? now,
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

export async function computePropertyReadinessSnapshot(
  input: RefreshPropertyReadinessSnapshotInput
): Promise<PropertyReadinessSnapshot | null> {
  const refreshed = await refreshPropertyReadinessSnapshot(input)
  return refreshed?.snapshot ?? null
}

export async function refreshPropertyReadinessSnapshot(
  input: RefreshPropertyReadinessSnapshotInput
): Promise<PropertyReadinessSnapshotResult | null> {
  const now = input.now ?? new Date()

  const property = await resolvePropertyIdentity(input)

  if (!property) {
    return null
  }

  const canonicalTruth = await refreshPropertyReadiness(property.id)
  const snapshot = await buildPropertyReadinessSnapshot({
    propertyId: property.id,
    organizationId: property.organizationId,
    now,
    canonicalTruth,
  })

  return {
    property,
    snapshot,
    canonicalTruth,
    generatedAt: now,
  }
}

export async function refreshPropertyReadinessSnapshotByPropertyId(
  propertyId: string,
  now?: Date
) {
  return refreshPropertyReadinessSnapshot({
    propertyId,
    now,
  })
}
