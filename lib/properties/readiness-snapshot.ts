import { prisma } from "@/lib/prisma"

export type PropertyReadinessStatus =
  | "READY"
  | "NEEDS_ATTENTION"
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

const BLOCKING_FILL_LEVELS = new Set(["missing", "low"])

function normalizeLoose(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .replace(/\/+/g, "_")
}

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function combineDateAndTime(date: Date, time?: string | null) {
  const value = new Date(date)

  if (!time || !time.trim()) {
    value.setHours(0, 0, 0, 0)
    return value
  }

  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/)

  if (!match) {
    value.setHours(0, 0, 0, 0)
    return value
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  value.setHours(hours, minutes, 0, 0)
  return value
}

function isWithinNextThreeHours(target: Date | null, now: Date) {
  if (!target) return false

  const diffMs = target.getTime() - now.getTime()

  return diffMs >= 0 && diffMs <= 3 * 60 * 60 * 1000
}

function isCriticalSupplyBlocking(supply: {
  isActive: boolean
  isCritical: boolean
  trackingMode: string
  fillLevel: string
  currentStock: number
  minimumThreshold: number | null
  warningThreshold: number | null
  targetLevel: number | null
}) {
  if (!supply.isActive || !supply.isCritical) {
    return false
  }

  const trackingMode = normalizeLoose(supply.trackingMode)
  const fillLevel = normalizeLoose(supply.fillLevel)

  const numericThreshold =
    supply.minimumThreshold ?? supply.warningThreshold ?? null

  if (numericThreshold !== null && Number.isFinite(numericThreshold)) {
    if (Number(supply.currentStock) < numericThreshold) {
      return true
    }
  }

  if (trackingMode === "fill_level" || trackingMode === "") {
    return BLOCKING_FILL_LEVELS.has(fillLevel)
  }

  if (BLOCKING_FILL_LEVELS.has(fillLevel)) {
    return true
  }

  if (
    supply.targetLevel !== null &&
    Number.isFinite(supply.targetLevel) &&
    supply.targetLevel > 0 &&
    Number(supply.currentStock) <= 0
  ) {
    return true
  }

  return false
}

async function findNextCheckInAt(input: {
  propertyId: string
  organizationId: string
  now: Date
}) {
  const bookings = await prisma.booking.findMany({
    where: {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      checkInDate: {
        gte: startOfDay(input.now),
      },
    },
    select: {
      status: true,
      checkInDate: true,
      checkInTime: true,
    },
    orderBy: [{ checkInDate: "asc" }, { checkInTime: "asc" }],
    take: 50,
  })

  for (const booking of bookings) {
    const normalizedStatus = normalizeLoose(booking.status)

    if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
      continue
    }

    const checkInAt = combineDateAndTime(
      booking.checkInDate,
      booking.checkInTime
    )

    if (checkInAt.getTime() >= input.now.getTime()) {
      return checkInAt
    }
  }

  return null
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

  const [openTasksCount, openIssuesCount, activeAlertsCount, activeCriticalSupplies, nextCheckInAt] =
    await Promise.all([
      prisma.task.count({
        where: {
          organizationId: input.organizationId,
          propertyId: input.propertyId,
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
          alertEnabled: true,
          alertAt: {
            lte: now,
          },
          status: {
            notIn: ["completed", "cancelled", "canceled"],
          },
        },
      }),
      prisma.propertySupply.findMany({
        where: {
          propertyId: input.propertyId,
          isActive: true,
          isCritical: true,
        },
        select: {
          isActive: true,
          isCritical: true,
          trackingMode: true,
          fillLevel: true,
          currentStock: true,
          minimumThreshold: true,
          warningThreshold: true,
          targetLevel: true,
        },
      }),
      findNextCheckInAt({
        propertyId: input.propertyId,
        organizationId: input.organizationId,
        now,
      }),
    ])

  const criticalSupplyBlockersCount = activeCriticalSupplies.filter((supply) =>
    isCriticalSupplyBlocking({
      isActive: supply.isActive,
      isCritical: supply.isCritical,
      trackingMode: supply.trackingMode,
      fillLevel: supply.fillLevel,
      currentStock: Number(supply.currentStock ?? 0),
      minimumThreshold:
        supply.minimumThreshold !== null
          ? Number(supply.minimumThreshold)
          : null,
      warningThreshold:
        supply.warningThreshold !== null
          ? Number(supply.warningThreshold)
          : null,
      targetLevel:
        supply.targetLevel !== null ? Number(supply.targetLevel) : null,
    })
  ).length

  const totalBlockersCount =
    openTasksCount +
    openIssuesCount +
    activeAlertsCount +
    criticalSupplyBlockersCount

  const hasUpcomingCheckInWithin3Hours = isWithinNextThreeHours(nextCheckInAt, now)

  let readinessStatus: PropertyReadinessStatus = "READY"

  if (totalBlockersCount === 0) {
    readinessStatus = "READY"
  } else if (hasUpcomingCheckInWithin3Hours) {
    readinessStatus = "NOT_READY"
  } else {
    readinessStatus = "NEEDS_ATTENTION"
  }

  return {
    propertyId: input.propertyId,
    organizationId: input.organizationId,
    readinessStatus,
    readinessUpdatedAt: now,
    openTasksCount,
    openIssuesCount,
    activeAlertsCount,
    criticalSupplyBlockersCount,
    totalBlockersCount,
    nextCheckInAt,
    hasUpcomingCheckInWithin3Hours,
  }
}

export async function refreshPropertyReadinessSnapshot(
  input: RefreshPropertyReadinessSnapshotInput
): Promise<PropertyReadinessSnapshot | null> {
  const snapshot = await computePropertyReadinessSnapshot(input)

  if (!snapshot) {
    return null
  }

  await prisma.property.updateMany({
    where: {
      id: snapshot.propertyId,
      organizationId: snapshot.organizationId,
    },
    data: {
      readinessStatus: snapshot.readinessStatus,
      readinessUpdatedAt: snapshot.readinessUpdatedAt,
    },
  })

  return snapshot
}