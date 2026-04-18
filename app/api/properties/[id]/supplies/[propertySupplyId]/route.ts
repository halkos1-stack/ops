import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"
import { syncPropertySupplyTemplate } from "@/lib/supplies/property-supply-template-sync"
import { syncTaskSupplyRun } from "@/lib/tasks/task-run-sync"
import {
  buildCanonicalSupplySnapshot,
  buildCanonicalSupplyWriteData,
} from "@/lib/supplies/compute-supply-state"
import {
  toPrismaSupplyStateMode,
  validateSupplyModeInput,
} from "@/lib/supplies/supply-mode-rules"

type RouteContext = {
  params: Promise<{
    id: string
    propertySupplyId: string
  }>
}

function toNullableText(value: unknown) {
  const text = String(value ?? "").trim()
  return text === "" ? null : text
}

async function getPropertyBase(propertyId: string) {
  return prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      organizationId: true,
      code: true,
      name: true,
      address: true,
      city: true,
      region: true,
      postalCode: true,
      country: true,
      status: true,
    },
  })
}

async function resyncMutablePropertySupplyRuns(propertyId: string) {
  const supplyTasks = await prisma.task.findMany({
    where: {
      propertyId,
      sendSuppliesChecklist: true,
    },
    select: {
      id: true,
    },
  })

  for (const task of supplyTasks) {
    await syncTaskSupplyRun({
      taskId: task.id,
      propertyId,
      sendSuppliesChecklist: true,
    })
  }
}

function shapePropertySupply(row: {
  id: string
  propertyId: string
  supplyItemId: string
  fillLevel: string
  stateMode: string
  currentStock: number
  mediumThreshold: number | null
  fullThreshold: number | null
  targetStock: number | null
  reorderThreshold: number | null
  targetLevel: number | null
  minimumThreshold: number | null
  trackingMode: string
  isCritical: boolean
  warningThreshold: number | null
  lastUpdatedAt: Date
  updatedAt: Date
  notes: string | null
  supplyItem: {
    id: string
    code: string
    name: string
    nameEl: string | null
    nameEn: string | null
    category: string
    unit: string
    minimumStock: number | null
    isActive: boolean
  }
}) {
  const canonical = buildCanonicalSupplySnapshot({
    isActive: true,
    stateMode: row.stateMode,
    fillLevel: row.fillLevel,
    currentStock: row.currentStock,
    mediumThreshold: row.mediumThreshold,
    fullThreshold: row.fullThreshold,
    minimumThreshold: row.minimumThreshold,
    reorderThreshold: row.reorderThreshold,
    warningThreshold: row.warningThreshold,
    targetLevel: row.targetLevel,
    targetStock: row.targetStock,
    trackingMode: row.trackingMode,
    supplyMinimumStock: row.supplyItem.minimumStock,
  })

  return {
    id: row.id,
    propertyId: row.propertyId,
    supplyItemId: row.supplyItemId,
    fillLevel: canonical.derivedState,
    stateMode: canonical.stateMode,
    derivedState: canonical.derivedState,
    currentStock: canonical.currentStock,
    mediumThreshold: canonical.mediumThreshold,
    fullThreshold: canonical.fullThreshold,
    targetStock: row.targetStock,
    reorderThreshold: row.reorderThreshold,
    targetLevel: row.targetLevel,
    minimumThreshold: row.minimumThreshold,
    trackingMode: row.trackingMode,
    isCritical: row.isCritical,
    warningThreshold: row.warningThreshold,
    lastUpdatedAt: row.lastUpdatedAt,
    updatedAt: row.updatedAt,
    notes: row.notes,
    supplyItem: row.supplyItem,
  }
}

async function buildResponse(propertyId: string, targetPropertySupplyId?: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      organizationId: true,
      code: true,
      name: true,
      address: true,
      city: true,
      region: true,
      postalCode: true,
      country: true,
      status: true,
      propertySupplies: {
        include: {
          supplyItem: true,
        },
        orderBy: [
          {
            supplyItem: {
              name: "asc",
            },
          },
        ],
      },
    },
  })

  if (!property) return null

  const supplyTemplate = await prisma.propertyChecklistTemplate.findFirst({
    where: {
      propertyId,
      organizationId: property.organizationId,
      templateType: "supplies",
      isActive: true,
    },
    include: {
      items: {
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          supplyItem: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  // Φόρτωση replenishment logs για το συγκεκριμένο PropertySupply (ή όλα αν δεν έχει δοθεί) — graceful degradation
  let replenishmentLogs: unknown[] = []
  try {
    replenishmentLogs = await (prisma as Record<string, unknown>).supplyReplenishmentLog !== undefined
      ? await (prisma as unknown as { supplyReplenishmentLog: { findMany: (args: unknown) => Promise<unknown[]> } }).supplyReplenishmentLog.findMany({
          where: targetPropertySupplyId
            ? { propertySupplyId: targetPropertySupplyId }
            : { propertyId },
          orderBy: { loggedAt: "desc" as const },
          take: 20,
          select: {
            id: true,
            propertySupplyId: true,
            supplyItemId: true,
            taskId: true,
            quantityBefore: true,
            quantityAdded: true,
            quantityAfter: true,
            stateBefore: true,
            stateAfter: true,
            performedBy: true,
            notes: true,
            loggedAt: true,
            supplyItem: {
              select: {
                id: true,
                code: true,
                name: true,
                nameEl: true,
                nameEn: true,
              },
            },
          },
        })
      : []
  } catch {
    replenishmentLogs = []
  }

  // Consumption logs — graceful degradation
  let consumptionLogs: unknown[] = []
  try {
    const whereClause = targetPropertySupplyId
      ? { propertySupplyId: targetPropertySupplyId }
      : { propertySupplyId: { in: property.propertySupplies.map((s) => s.id) } }

    consumptionLogs = await prisma.supplyConsumption.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" as const },
      take: 20,
      select: {
        id: true,
        taskId: true,
        supplyItemId: true,
        propertySupplyId: true,
        quantity: true,
        unit: true,
        notes: true,
        createdAt: true,
        supplyItem: {
          select: {
            id: true,
            code: true,
            name: true,
            nameEl: true,
            nameEn: true,
          },
        },
      },
    })
  } catch {
    consumptionLogs = []
  }

  return {
    property: {
      id: property.id,
      organizationId: property.organizationId,
      code: property.code,
      name: property.name,
      address: property.address,
      city: property.city,
      region: property.region,
      postalCode: property.postalCode,
      country: property.country,
      status: property.status,
    },
    activeSupplies: property.propertySupplies.map(shapePropertySupply),
    supplyTemplate,
    replenishmentLogs,
    consumptionLogs,
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const auth = access.auth
    const { id, propertySupplyId } = await context.params
    const property = await getPropertyBase(id)

    if (!property) {
      return NextResponse.json({ error: "Property was not found." }, { status: 404 })
    }

    if (!canAccessOrganization(auth, property.organizationId)) {
      return NextResponse.json(
        { error: "You do not have access to this property." },
        { status: 403 }
      )
    }

    const payload = await buildResponse(property.id, propertySupplyId)
    return NextResponse.json(payload)
  } catch (error) {
    console.error(
      "GET /api/properties/[id]/supplies/[propertySupplyId] error:",
      error
    )
    return NextResponse.json(
      { error: "Failed to load property supply." },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const auth = access.auth
    const { id, propertySupplyId } = await context.params
    const body = await request.json()
    const property = await getPropertyBase(id)

    if (!property) {
      return NextResponse.json({ error: "Property was not found." }, { status: 404 })
    }

    if (!canAccessOrganization(auth, property.organizationId)) {
      return NextResponse.json(
        { error: "You do not have access to this property." },
        { status: 403 }
      )
    }

    const propertySupply = await prisma.propertySupply.findUnique({
      where: {
        id: propertySupplyId,
      },
      include: {
        supplyItem: true,
      },
    })

    if (!propertySupply || propertySupply.propertyId !== property.id) {
      return NextResponse.json(
        { error: "Property supply was not found." },
        { status: 404 }
      )
    }

    // Snapshot κατάστασης πριν την αλλαγή για το log
    const snapshotBefore = buildCanonicalSupplySnapshot({
      isActive: true,
      stateMode: propertySupply.stateMode,
      fillLevel: propertySupply.fillLevel,
      currentStock: propertySupply.currentStock,
      mediumThreshold: propertySupply.mediumThreshold,
      fullThreshold: propertySupply.fullThreshold,
      minimumThreshold: propertySupply.minimumThreshold,
      reorderThreshold: propertySupply.reorderThreshold,
      warningThreshold: propertySupply.warningThreshold,
      targetLevel: propertySupply.targetLevel,
      targetStock: propertySupply.targetStock,
      trackingMode: propertySupply.trackingMode,
      supplyMinimumStock: propertySupply.supplyItem.minimumStock,
    })

    const validation = validateSupplyModeInput({
      stateMode: body?.stateMode ?? propertySupply.stateMode,
      fillLevel: body?.fillLevel ?? body?.derivedState ?? propertySupply.fillLevel,
      currentStock:
        body?.currentStock ?? propertySupply.currentStock,
      mediumThreshold:
        body?.mediumThreshold ?? propertySupply.mediumThreshold,
      fullThreshold:
        body?.fullThreshold ?? propertySupply.fullThreshold,
    })

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const canonical = buildCanonicalSupplyWriteData({
      stateMode: validation.mode,
      fillLevel: validation.fillLevel,
      currentStock: validation.currentStock,
      mediumThreshold: validation.mediumThreshold,
      fullThreshold: validation.fullThreshold,
    })

    await prisma.propertySupply.update({
      where: {
        id: propertySupply.id,
      },
      data: {
        fillLevel: canonical.fillLevel,
        stateMode: toPrismaSupplyStateMode(canonical.stateMode),
        currentStock: canonical.currentStock,
        mediumThreshold: canonical.mediumThreshold,
        fullThreshold: canonical.fullThreshold,
        targetStock: canonical.targetStock,
        reorderThreshold: canonical.reorderThreshold,
        targetLevel: canonical.targetLevel,
        minimumThreshold: canonical.minimumThreshold,
        trackingMode: canonical.trackingMode,
        warningThreshold: canonical.warningThreshold,
        ...(body?.isCritical !== undefined
          ? { isCritical: Boolean(body.isCritical) }
          : {}),
        ...(body?.notes !== undefined ? { notes: toNullableText(body.notes) } : {}),
        lastUpdatedAt: new Date(),
      },
    })

    // Snapshot κατάστασης μετά την αλλαγή
    const snapshotAfter = buildCanonicalSupplySnapshot({
      isActive: true,
      stateMode: canonical.stateMode,
      fillLevel: canonical.fillLevel,
      currentStock: canonical.currentStock,
      mediumThreshold: canonical.mediumThreshold,
      fullThreshold: canonical.fullThreshold,
      minimumThreshold: canonical.minimumThreshold,
      reorderThreshold: canonical.reorderThreshold,
      warningThreshold: canonical.warningThreshold,
      targetLevel: canonical.targetLevel,
      targetStock: canonical.targetStock,
      trackingMode: canonical.trackingMode,
      supplyMinimumStock: propertySupply.supplyItem.minimumStock,
    })

    // Γράψε SupplyReplenishmentLog αν άλλαξε κατάσταση ή απόθεμα — graceful degradation
    try {
      const stockChanged =
        canonical.currentStock !== propertySupply.currentStock
      const stateChanged =
        snapshotAfter.derivedState !== snapshotBefore.derivedState

      if (stockChanged || stateChanged) {
        await (prisma as unknown as {
          supplyReplenishmentLog: {
            create: (args: unknown) => Promise<unknown>
          }
        }).supplyReplenishmentLog.create({
          data: {
            organizationId: property.organizationId,
            propertyId: property.id,
            propertySupplyId: propertySupply.id,
            supplyItemId: propertySupply.supplyItemId,
            quantityBefore: snapshotBefore.currentStock,
            quantityAfter: canonical.currentStock,
            quantityAdded: stockChanged
              ? canonical.currentStock - (snapshotBefore.currentStock ?? 0)
              : null,
            stateBefore: snapshotBefore.derivedState,
            stateAfter: snapshotAfter.derivedState,
            performedBy: "admin_manual",
            notes: body?.notes
              ? String(body.notes).trim() || null
              : null,
          },
        })
      }
    } catch {
      // Graceful degradation — δεν αποτυγχάνει η PATCH αν δεν έχει τρέξει migration ακόμα
    }

    await syncPropertySupplyTemplate({
      propertyId: property.id,
      organizationId: property.organizationId,
    })
    await resyncMutablePropertySupplyRuns(property.id)
    await refreshPropertyReadiness(property.id)

    const payload = await buildResponse(property.id, propertySupplyId)
    return NextResponse.json(payload)
  } catch (error) {
    console.error(
      "PATCH /api/properties/[id]/supplies/[propertySupplyId] error:",
      error
    )
    return NextResponse.json(
      { error: "Failed to update property supply." },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const auth = access.auth
    const { id, propertySupplyId } = await context.params
    const property = await getPropertyBase(id)

    if (!property) {
      return NextResponse.json({ error: "Property was not found." }, { status: 404 })
    }

    if (!canAccessOrganization(auth, property.organizationId)) {
      return NextResponse.json(
        { error: "You do not have access to this property." },
        { status: 403 }
      )
    }

    const propertySupply = await prisma.propertySupply.findUnique({
      where: {
        id: propertySupplyId,
      },
    })

    if (!propertySupply || propertySupply.propertyId !== property.id) {
      return NextResponse.json(
        { error: "Property supply was not found." },
        { status: 404 }
      )
    }

    await prisma.propertySupply.delete({
      where: {
        id: propertySupply.id,
      },
    })

    await syncPropertySupplyTemplate({
      propertyId: property.id,
      organizationId: property.organizationId,
    })
    await resyncMutablePropertySupplyRuns(property.id)
    await refreshPropertyReadiness(property.id)

    const payload = await buildResponse(property.id)
    return NextResponse.json(payload)
  } catch (error) {
    console.error(
      "DELETE /api/properties/[id]/supplies/[propertySupplyId] error:",
      error
    )
    return NextResponse.json(
      { error: "Failed to remove property supply." },
      { status: 500 }
    )
  }
}
