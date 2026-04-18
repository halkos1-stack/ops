import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess } from "@/lib/route-access"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"
import { buildCanonicalSupplySnapshot } from "@/lib/supplies/compute-supply-state"
import {
  filterCanonicalOperationalTasks,
  getOperationalTaskValidity,
} from "@/lib/tasks/ops-task-contract"
import { computePropertyOperationalStatus } from "@/lib/readiness/property-operational-status"

type LooseRecord = Record<string, unknown>

type CanonicalReadinessStatus = "ready" | "borderline" | "not_ready" | "unknown"

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null

  const text = String(value).trim()
  return text === "" ? null : text
}

function toRequiredString(value: unknown, fieldName: string) {
  const text = String(value ?? "").trim()

  if (!text) {
    throw new Error(`Το πεδίο "${fieldName}" είναι υποχρεωτικό.`)
  }

  return text
}

function toNonNegativeInt(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback

  const num = Number(value)

  if (Number.isNaN(num)) return fallback

  return Math.max(0, Math.trunc(num))
}

function normalizePropertyStatus(value: unknown) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()

  if (["active", "inactive", "maintenance", "archived"].includes(text)) {
    return text
  }

  return "active"
}

function buildOrganizationPrefix(name: string) {
  const cleaned = name
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toUpperCase()

  if (!cleaned) return "ORG"
  if (cleaned.length >= 3) return cleaned.slice(0, 3)
  return cleaned.padEnd(3, "X")
}

function mapStoredReadinessStatus(value: unknown): CanonicalReadinessStatus {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()

  if (normalized === "ready") return "ready"
  if (normalized === "borderline") return "borderline"
  if (normalized === "not_ready") return "not_ready"
  if (normalized === "unknown") return "unknown"

  if (normalized === "ready") return "ready"
  if (normalized === "borderline") return "borderline"
  if (normalized === "not_ready") return "not_ready"
  if (normalized === "unknown") return "unknown"

  const upper = String(value ?? "").trim().toUpperCase()
  if (upper === "READY") return "ready"
  if (upper === "BORDERLINE") return "borderline"
  if (upper === "NOT_READY") return "not_ready"
  if (upper === "UNKNOWN") return "unknown"

  return "unknown"
}

async function generateNextPropertyCode(
  organizationId: string,
  organizationName: string
) {
  const prefix = buildOrganizationPrefix(organizationName)

  const existing = await prisma.property.findMany({
    where: {
      organizationId,
      code: {
        startsWith: prefix,
      },
    },
    select: {
      code: true,
    },
  })

  let maxNumber = 0

  for (const row of existing) {
    const code = String(row.code || "")
    const suffix = code.slice(prefix.length)
    const match = suffix.match(/(\d+)$/)

    if (match) {
      const num = Number(match[1])
      if (!Number.isNaN(num) && num > maxNumber) {
        maxNumber = num
      }
    }
  }

  const nextNumber = maxNumber + 1
  return `${prefix}${String(nextNumber).padStart(4, "0")}`
}

async function getFullPropertyList(where: Record<string, unknown>) {
  return prisma.property.findMany({
    where,
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      defaultPartner: {
        select: {
          id: true,
          code: true,
          name: true,
          email: true,
          phone: true,
          specialty: true,
          status: true,
        },
      },
      bookings: {
        select: {
          id: true,
          status: true,
          guestName: true,
          checkInDate: true,
          checkOutDate: true,
          checkInTime: true,
          checkOutTime: true,
        },
        orderBy: {
          checkInDate: "desc",
        },
        take: 10,
      },
      tasks: {
        select: {
          id: true,
          bookingId: true,
          source: true,
          status: true,
          priority: true,
          taskType: true,
          title: true,
          scheduledDate: true,
          scheduledStartTime: true,
          scheduledEndTime: true,
          dueDate: true,
          completedAt: true,
          alertEnabled: true,
          alertAt: true,
          sendCleaningChecklist: true,
          sendSuppliesChecklist: true,
          sendIssuesChecklist: true,
          assignments: {
            orderBy: {
              assignedAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              status: true,
              assignedAt: true,
              acceptedAt: true,
              rejectedAt: true,
            },
          },
          checklistRun: {
            select: {
              id: true,
              status: true,
              startedAt: true,
              completedAt: true,
            },
          },
          supplyRun: {
            select: {
              id: true,
              status: true,
              startedAt: true,
              completedAt: true,
            },
          },
          issueRun: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: {
          scheduledDate: "desc",
        },
        take: 20,
      },
      issues: {
        select: {
          id: true,
          title: true,
          status: true,
          severity: true,
          issueType: true,
          requiresImmediateAction: true,
          affectsHosting: true,
          createdAt: true,
          updatedAt: true,
          resolvedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
      propertySupplies: {
        select: {
          id: true,
          isActive: true,
          fillLevel: true,
          stateMode: true,
          currentStock: true,
          mediumThreshold: true,
          fullThreshold: true,
          targetStock: true,
          reorderThreshold: true,
          targetLevel: true,
          minimumThreshold: true,
          trackingMode: true,
          isCritical: true,
          warningThreshold: true,
          lastUpdatedAt: true,
          updatedAt: true,
          supplyItem: {
            select: {
              id: true,
              code: true,
              name: true,
              nameEl: true,
              nameEn: true,
              category: true,
              unit: true,
              minimumStock: true,
              isActive: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 50,
      },
      conditions: {
        select: {
          id: true,
          propertyId: true,
          conditionType: true,
          status: true,
          blockingStatus: true,
          severity: true,
          managerDecision: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          resolvedAt: true,
          dismissedAt: true,
        },
        take: 50,
      },
    },
  })
}

type FullPropertyRow = Awaited<ReturnType<typeof getFullPropertyList>>[number]

function shapePropertyForOperationalViews(property: FullPropertyRow) {
  const allTasks = (Array.isArray(property?.tasks) ? property.tasks : []) as LooseRecord[]

  const propertySupplies = (Array.isArray(property?.propertySupplies) ? property.propertySupplies : []).map((supply) => {
    const s = supply as LooseRecord & {
      isActive?: boolean | null
      stateMode?: string | null
      fillLevel?: string | null
      currentStock?: number | null
      mediumThreshold?: number | null
      fullThreshold?: number | null
      minimumThreshold?: number | null
      reorderThreshold?: number | null
      warningThreshold?: number | null
      targetLevel?: number | null
      targetStock?: number | null
      trackingMode?: string | null
      supplyItem?: { minimumStock?: number | null } | null
    }
    const canonical = buildCanonicalSupplySnapshot({
      isActive: s.isActive,
      stateMode: s.stateMode,
      fillLevel: s.fillLevel,
      currentStock: s.currentStock,
      mediumThreshold: s.mediumThreshold,
      fullThreshold: s.fullThreshold,
      minimumThreshold: s.minimumThreshold,
      reorderThreshold: s.reorderThreshold,
      warningThreshold: s.warningThreshold,
      targetLevel: s.targetLevel,
      targetStock: s.targetStock,
      trackingMode: s.trackingMode,
      supplyMinimumStock: s.supplyItem?.minimumStock,
    })

    return {
      ...s,
      fillLevel: canonical.derivedState,
      stateMode: canonical.stateMode,
      currentStock: canonical.currentStock,
      mediumThreshold: canonical.mediumThreshold,
      fullThreshold: canonical.fullThreshold,
      derivedState: canonical.derivedState,
      isShortage: canonical.isShortage,
    }
  })

  const invalidOperationalTaskCount = allTasks.filter(
    (task) =>
      getOperationalTaskValidity(task as { source?: unknown; bookingId?: unknown })
        .isCanonicalOperational !== true
  ).length

  type RawTaskRow = LooseRecord & {
    source?: unknown
    bookingId?: unknown
    booking?: { id?: unknown } | null
  }
  const canonicalTasks = filterCanonicalOperationalTasks(allTasks as RawTaskRow[])

  const storedReadinessStatus = mapStoredReadinessStatus(property.readinessStatus)

  const operationalStatusResult = computePropertyOperationalStatus({
    readinessStatus: storedReadinessStatus,
    bookings: safeArray(property.bookings).map((b) => ({
      id: b.id,
      status: b.status ?? null,
      checkInDate: b.checkInDate ?? null,
      checkOutDate: b.checkOutDate ?? null,
      guestName: (b as { guestName?: string | null }).guestName ?? null,
    })),
    tasks: canonicalTasks.map((t) => {
      const task = t as LooseRecord
      const assignments = Array.isArray(task.assignments)
        ? (task.assignments as Array<{ status?: string | null }>)
        : []
      const checklistRun = (task.checklistRun ?? task.cleaningChecklistRun) as {
        status?: string | null
      } | null
      const supplyRun = (task.supplyRun ?? task.suppliesChecklistRun) as {
        status?: string | null
      } | null
      const issueRun = (task.issueRun ?? task.issuesChecklistRun) as {
        status?: string | null
      } | null
      return {
        id: String(task.id ?? ""),
        title: String(task.title ?? ""),
        taskType: String(task.taskType ?? ""),
        status: String(task.status ?? ""),
        scheduledDate: (task.scheduledDate as Date | null) ?? null,
        sendCleaningChecklist: Boolean(task.sendCleaningChecklist),
        sendSuppliesChecklist: Boolean(task.sendSuppliesChecklist),
        sendIssuesChecklist: Boolean(task.sendIssuesChecklist),
        alertEnabled: Boolean(task.alertEnabled),
        alertAt: (task.alertAt as Date | null) ?? null,
        completedAt: (task.completedAt as Date | null) ?? null,
        bookingId: (task.bookingId as string | null) ?? null,
        latestAssignmentStatus: assignments[0]?.status ?? null,
        checklistRunStatus: checklistRun?.status ?? null,
        supplyRunStatus: supplyRun?.status ?? null,
        issueRunStatus: issueRun?.status ?? null,
      }
    }),
  })

  return {
    ...property,
    tasks: canonicalTasks,
    propertySupplies,
    readinessStatus: storedReadinessStatus,
    readinessReasonsText: property.readinessReasonsText ?? "",
    readinessUpdatedAt: property.readinessUpdatedAt,
    openConditionCount: property.openConditionCount ?? 0,
    openBlockingConditionCount: property.openBlockingConditionCount ?? 0,
    openWarningConditionCount: property.openWarningConditionCount ?? 0,
    operationalStatus: operationalStatusResult.operationalStatus,
    operationalStatusLabel: operationalStatusResult.label,
    nextCheckInAt: property.nextCheckInAt ?? null,
    auditSummary: {
      invalidOperationalTaskCount,
    },
  }
}

function isBasePropertyListRequest(input: {
  status: string | null
  city: string | null
  type: string | null
  search: string | null
}) {
  return (
    (!input.status || input.status === "all") &&
    (!input.city || input.city === "all") &&
    (!input.type || input.type === "all") &&
    !String(input.search || "").trim()
  )
}

export async function GET(req: NextRequest) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { searchParams } = new URL(req.url)

    const requestedOrganizationId = searchParams.get("organizationId")
    const status = searchParams.get("status")
    const city = searchParams.get("city")
    const type = searchParams.get("type")
    const search = searchParams.get("search")

    let organizationId: string | null = null

    if (auth.isSuperAdmin) {
      organizationId = requestedOrganizationId ? requestedOrganizationId : null
    } else {
      organizationId = auth.organizationId
    }

    if (!organizationId) {
      return NextResponse.json([])
    }

    const where: Record<string, unknown> = {
      organizationId,
      ...(status && status !== "all" ? { status } : {}),
      ...(city && city !== "all" ? { city } : {}),
      ...(type && type !== "all" ? { type } : {}),
    }

    if (search && search.trim()) {
      const term = search.trim()

      where.OR = [
        { code: { contains: term, mode: "insensitive" } },
        { name: { contains: term, mode: "insensitive" } },
        { address: { contains: term, mode: "insensitive" } },
        { city: { contains: term, mode: "insensitive" } },
        { region: { contains: term, mode: "insensitive" } },
        { country: { contains: term, mode: "insensitive" } },
      ]
    }

    const baseProperties = await getFullPropertyList(where)
    let mergedProperties = baseProperties

    if (
      isBasePropertyListRequest({
        status,
        city,
        type,
        search,
      })
    ) {
      const mappedBookingRows = await prisma.booking.findMany({
        where: {
          organizationId,
          propertyId: {
            not: null,
          },
        },
        select: {
          propertyId: true,
        },
      })

      const missingPropertyIds = Array.from(
        new Set(
          mappedBookingRows
            .map((row) => row.propertyId)
            .filter(
              (propertyId): propertyId is string =>
                !!propertyId &&
                !baseProperties.some((property) => property.id === propertyId)
            )
        )
      )

      if (missingPropertyIds.length > 0) {
        const missingProperties = await getFullPropertyList({
          organizationId,
          id: {
            in: missingPropertyIds,
          },
        })

        mergedProperties = [...baseProperties, ...missingProperties]
      }
    }

    const properties = mergedProperties.map(shapePropertyForOperationalViews)

    return NextResponse.json(properties)
  } catch (error) {
    console.error("Properties GET error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης ακινήτων." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const body = await req.json()

    const requestedOrganizationId = toNullableString(body.organizationId)

    const organizationId = auth.isSuperAdmin
      ? requestedOrganizationId
      : auth.organizationId

    if (!organizationId) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε organizationId για δημιουργία ακινήτου." },
        { status: 400 }
      )
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Ο οργανισμός δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const name = toRequiredString(body.name, "name")
    const address = toRequiredString(body.address, "address")
    const city = toRequiredString(body.city, "city")
    const region = toRequiredString(body.region, "region")
    const postalCode = toRequiredString(body.postalCode, "postalCode")
    const country = toRequiredString(body.country, "country")
    const type = toRequiredString(body.type, "type")
    const status = normalizePropertyStatus(body.status)
    const bedrooms = toNonNegativeInt(body.bedrooms, 0)
    const bathrooms = toNonNegativeInt(body.bathrooms, 0)
    const maxGuests = toNonNegativeInt(body.maxGuests, 0)
    const notes = toNullableString(body.notes)
    const defaultPartnerId = toNullableString(body.defaultPartnerId)

    if (defaultPartnerId) {
      const partner = await prisma.partner.findFirst({
        where: {
          id: defaultPartnerId,
          organizationId,
        },
        select: {
          id: true,
        },
      })

      if (!partner) {
        return NextResponse.json(
          { error: "Ο προεπιλεγμένος συνεργάτης δεν ανήκει στον ίδιο οργανισμό." },
          { status: 400 }
        )
      }
    }

    let code = await generateNextPropertyCode(organizationId, organization.name)

    const duplicateCode = await prisma.property.findFirst({
      where: {
        organizationId,
        code,
      },
      select: {
        id: true,
      },
    })

    if (duplicateCode) {
      let counter = 2

      while (counter < 1000) {
        const candidate = `${buildOrganizationPrefix(organization.name)}${String(
          counter
        ).padStart(4, "0")}`

        const exists = await prisma.property.findFirst({
          where: {
            organizationId,
            code: candidate,
          },
          select: {
            id: true,
          },
        })

        if (!exists) {
          code = candidate
          break
        }

        counter += 1
      }
    }

    const created = await prisma.property.create({
      data: {
        organizationId,
        code,
        name,
        address,
        city,
        region,
        postalCode,
        country,
        type,
        status,
        bedrooms,
        bathrooms,
        maxGuests,
        notes,
        defaultPartnerId,
      },
    })

    await refreshPropertyReadiness(created.id)

    const property = await prisma.property.findUnique({
      where: {
        id: created.id,
      },
      include: {
        defaultPartner: {
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            phone: true,
            specialty: true,
            status: true,
          },
        },
        bookings: {
          select: {
            id: true,
            status: true,
            guestName: true,
            checkInDate: true,
            checkOutDate: true,
            checkInTime: true,
            checkOutTime: true,
          },
          orderBy: {
            checkInDate: "desc",
          },
          take: 10,
        },
        tasks: {
          select: {
            id: true,
            bookingId: true,
            source: true,
            status: true,
            priority: true,
            taskType: true,
            title: true,
            scheduledDate: true,
            scheduledStartTime: true,
            scheduledEndTime: true,
            dueDate: true,
            completedAt: true,
            alertEnabled: true,
            alertAt: true,
            sendCleaningChecklist: true,
            sendSuppliesChecklist: true,
            sendIssuesChecklist: true,
            assignments: {
              orderBy: {
                assignedAt: "desc",
              },
              take: 1,
              select: {
                id: true,
                status: true,
                assignedAt: true,
                acceptedAt: true,
                rejectedAt: true,
              },
            },
            checklistRun: {
              select: {
                id: true,
                status: true,
                startedAt: true,
                completedAt: true,
              },
            },
            supplyRun: {
              select: {
                id: true,
                status: true,
                startedAt: true,
                completedAt: true,
              },
            },
            issueRun: {
              select: {
                id: true,
                status: true,
              },
            },
          },
          orderBy: {
            scheduledDate: "desc",
          },
          take: 20,
        },
        issues: {
          select: {
            id: true,
            title: true,
            status: true,
            severity: true,
            issueType: true,
            requiresImmediateAction: true,
            affectsHosting: true,
            createdAt: true,
            updatedAt: true,
            resolvedAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        propertySupplies: {
          select: {
            id: true,
            isActive: true,
            fillLevel: true,
            stateMode: true,
            currentStock: true,
            mediumThreshold: true,
            fullThreshold: true,
            targetStock: true,
            reorderThreshold: true,
            targetLevel: true,
            minimumThreshold: true,
            trackingMode: true,
            isCritical: true,
            warningThreshold: true,
            lastUpdatedAt: true,
            updatedAt: true,
            supplyItem: {
              select: {
                id: true,
                code: true,
                name: true,
                nameEl: true,
                nameEn: true,
                category: true,
                unit: true,
                minimumStock: true,
                isActive: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 50,
        },
        conditions: {
          select: {
            id: true,
            propertyId: true,
            conditionType: true,
            status: true,
            blockingStatus: true,
            severity: true,
            managerDecision: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            resolvedAt: true,
            dismissedAt: true,
          },
          take: 50,
        },
        issueTemplates: {
          include: {
            items: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 10,
        },
      },
    })

    const shapedProperty = property
      ? shapePropertyForOperationalViews(property)
      : property

    return NextResponse.json(
      {
        success: true,
        property: shapedProperty,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Properties POST error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία δημιουργίας ακινήτου."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
