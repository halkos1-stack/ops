import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import {
  SUPPLY_PRESETS,
  buildCustomSupplyCode,
} from "@/lib/supply-presets"
import {
  buildCanonicalSupplySnapshot,
  buildCanonicalSupplyWriteData,
} from "@/lib/supplies/compute-supply-state"
import { toPrismaSupplyStateMode } from "@/lib/supplies/supply-mode-rules"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"
import { syncPropertySupplyTemplate } from "@/lib/supplies/property-supply-template-sync"
import { syncTaskSupplyRun } from "@/lib/tasks/task-run-sync"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function toText(value: unknown) {
  return String(value ?? "").trim()
}

function toNumberOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function buildCustomSupplyMarker(propertyId: string) {
  return `CUSTOM_SUPPLY:${propertyId}`
}

function buildDefaultNumericSupplyConfig(minimumStock: number | null) {
  const mediumThreshold =
    typeof minimumStock === "number" && Number.isFinite(minimumStock)
      ? Math.max(1, minimumStock)
      : 1
  const fullThreshold = Math.max(mediumThreshold + 2, 3)

  return buildCanonicalSupplyWriteData({
    stateMode: "numeric_thresholds",
    currentStock: fullThreshold,
    mediumThreshold,
    fullThreshold,
  })
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

function shapeActiveSupplyRow(row: {
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
    propertySupplyId: row.id,
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
    isActive: true,
    isShortage: canonical.isShortage,
    supplyItem: {
      id: row.supplyItem.id,
      code: row.supplyItem.code,
      name: row.supplyItem.name,
      nameEl: row.supplyItem.nameEl,
      nameEn: row.supplyItem.nameEn,
      category: row.supplyItem.category,
      unit: row.supplyItem.unit,
      minimumStock: row.supplyItem.minimumStock,
      isActive: row.supplyItem.isActive,
    },
  }
}

async function buildResponse(propertyId: string) {
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

  const customMarker = buildCustomSupplyMarker(property.id)
  const customSupplyItems = await prisma.supplyItem.findMany({
    where: {
      notes: customMarker,
    },
    orderBy: {
      name: "asc",
    },
  })

  const activeSupplies = property.propertySupplies
    .filter((row) => row.isActive !== false)
    .map(shapeActiveSupplyRow)

  const builtInCatalog = SUPPLY_PRESETS.map((preset) => {
    const activeRow = activeSupplies.find(
      (row) => row.supplyItem.code === preset.code
    )

    return {
      presetKey: preset.key,
      code: preset.code,
      nameEl: preset.nameEl,
      nameEn: preset.nameEn,
      category: preset.category,
      unit: preset.unit,
      minimumStock: preset.minimumStock,
      checklistLabelEl: preset.checklistLabelEl,
      checklistLabelEn: preset.checklistLabelEn,
      isActiveForProperty: Boolean(activeRow),
      propertySupplyId: activeRow?.id || null,
    }
  })

  const customCatalog = customSupplyItems.map((item) => {
    const activeRow = activeSupplies.find((row) => row.supplyItemId === item.id)

    return {
      id: item.id,
      code: item.code,
      name: item.name,
      nameEl: item.nameEl ?? null,
      nameEn: item.nameEn ?? null,
      category: item.category,
      unit: item.unit,
      minimumStock: item.minimumStock,
      isActiveForProperty: Boolean(activeRow),
      propertySupplyId: activeRow?.id || null,
    }
  })

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
    activeSupplies,
    supplies: activeSupplies,
    builtInCatalog,
    customCatalog,
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const auth = access.auth
    const { id } = await context.params
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

    const payload = await buildResponse(property.id)
    return NextResponse.json(payload)
  } catch (error) {
    console.error("GET /api/properties/[id]/supplies error:", error)
    return NextResponse.json(
      { error: "Failed to load property supplies." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const auth = access.auth
    const { id } = await context.params
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

    const action = toText(body?.action)

    if (action === "sync_template") {
      await syncPropertySupplyTemplate({
        propertyId: property.id,
        organizationId: property.organizationId,
      })

      const payload = await buildResponse(property.id)
      return NextResponse.json(payload)
    }

    if (action === "toggle_builtin") {
      const code = toText(body?.code)
      const enabled = Boolean(body?.enabled)
      const preset = SUPPLY_PRESETS.find((row) => row.code === code)

      if (!preset) {
        return NextResponse.json(
          { error: "Invalid built-in supply preset." },
          { status: 400 }
        )
      }

      let supplyItem = await prisma.supplyItem.findUnique({
        where: { code: preset.code },
      })

      if (!supplyItem) {
        supplyItem = await prisma.supplyItem.create({
          data: {
            code: preset.code,
            name: preset.nameEl,
            nameEl: preset.nameEl,
            nameEn: preset.nameEn,
            category: preset.category,
            unit: preset.unit,
            minimumStock: preset.minimumStock,
            isActive: true,
          },
        })
      }

      const existing = await prisma.propertySupply.findUnique({
        where: {
          propertyId_supplyItemId: {
            propertyId: property.id,
            supplyItemId: supplyItem.id,
          },
        },
      })

      if (enabled && !existing) {
        const defaults = buildDefaultNumericSupplyConfig(preset.minimumStock)

        await prisma.propertySupply.create({
          data: {
            propertyId: property.id,
            supplyItemId: supplyItem.id,
            fillLevel: defaults.fillLevel,
            stateMode: toPrismaSupplyStateMode(defaults.stateMode),
            currentStock: defaults.currentStock,
            mediumThreshold: defaults.mediumThreshold,
            fullThreshold: defaults.fullThreshold,
            targetStock: defaults.targetStock,
            reorderThreshold: defaults.reorderThreshold,
            targetLevel: defaults.targetLevel,
            minimumThreshold: defaults.minimumThreshold,
            trackingMode: defaults.trackingMode,
            warningThreshold: defaults.warningThreshold,
            notes: "Activated from property supply management.",
            lastUpdatedAt: new Date(),
          },
        })
      }

      if (!enabled && existing) {
        await prisma.propertySupply.delete({
          where: {
            id: existing.id,
          },
        })
      }

      await syncPropertySupplyTemplate({
        propertyId: property.id,
        organizationId: property.organizationId,
      })
      await resyncMutablePropertySupplyRuns(property.id)
      await refreshPropertyReadiness(property.id)

      const payload = await buildResponse(property.id)
      return NextResponse.json(payload)
    }

    if (action === "toggle_custom") {
      const supplyItemId = toText(body?.supplyItemId)
      const enabled = Boolean(body?.enabled)

      if (!supplyItemId) {
        return NextResponse.json(
          { error: "supplyItemId is required." },
          { status: 400 }
        )
      }

      const customMarker = buildCustomSupplyMarker(property.id)
      const supplyItem = await prisma.supplyItem.findFirst({
        where: {
          id: supplyItemId,
          notes: customMarker,
        },
      })

      if (!supplyItem) {
        return NextResponse.json(
          { error: "Custom supply item was not found." },
          { status: 404 }
        )
      }

      const existing = await prisma.propertySupply.findUnique({
        where: {
          propertyId_supplyItemId: {
            propertyId: property.id,
            supplyItemId: supplyItem.id,
          },
        },
      })

      const defaults = buildDefaultNumericSupplyConfig(
        typeof supplyItem.minimumStock === "number" &&
          Number.isFinite(supplyItem.minimumStock)
          ? supplyItem.minimumStock
          : 1
      )

      if (enabled && !existing) {
        await prisma.propertySupply.create({
          data: {
            propertyId: property.id,
            supplyItemId: supplyItem.id,
            fillLevel: defaults.fillLevel,
            stateMode: toPrismaSupplyStateMode(defaults.stateMode),
            currentStock: defaults.currentStock,
            mediumThreshold: defaults.mediumThreshold,
            fullThreshold: defaults.fullThreshold,
            targetStock: defaults.targetStock,
            reorderThreshold: defaults.reorderThreshold,
            targetLevel: defaults.targetLevel,
            minimumThreshold: defaults.minimumThreshold,
            trackingMode: defaults.trackingMode,
            warningThreshold: defaults.warningThreshold,
            notes: "Activated from property supply management.",
            lastUpdatedAt: new Date(),
          },
        })
      }

      if (!enabled && existing) {
        await prisma.propertySupply.delete({
          where: {
            id: existing.id,
          },
        })
      }

      await syncPropertySupplyTemplate({
        propertyId: property.id,
        organizationId: property.organizationId,
      })
      await resyncMutablePropertySupplyRuns(property.id)
      await refreshPropertyReadiness(property.id)

      const payload = await buildResponse(property.id)
      return NextResponse.json(payload)
    }

    if (action === "add_custom") {
      const name = toText(body?.name)
      const category = toText(body?.category) || "custom"
      const unit = toText(body?.unit) || "τεμαχια"
      const minimumStock = toNumberOrNull(body?.minimumStock) ?? 1

      if (!name) {
        return NextResponse.json(
          { error: "Custom supply requires a name." },
          { status: 400 }
        )
      }

      const customMarker = buildCustomSupplyMarker(property.id)
      const existingByName = await prisma.supplyItem.findFirst({
        where: {
          notes: customMarker,
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      })

      if (existingByName) {
        return NextResponse.json(
          { error: "A custom supply with this name already exists." },
          { status: 400 }
        )
      }

      const baseCode = buildCustomSupplyCode(name)
      let code = baseCode
      let counter = 2

      while (
        await prisma.supplyItem.findUnique({
          where: { code },
          select: { id: true },
        })
      ) {
        code = `${baseCode}-${counter}`
        counter += 1
      }

      await prisma.supplyItem.create({
        data: {
          code,
          name,
          nameEl: name,
          nameEn: null,
          category,
          unit,
          minimumStock,
          isActive: true,
          notes: customMarker,
        },
      })

      const payload = await buildResponse(property.id)
      return NextResponse.json(payload)
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 })
  } catch (error) {
    console.error("POST /api/properties/[id]/supplies error:", error)
    return NextResponse.json(
      { error: "Failed to update property supplies." },
      { status: 500 }
    )
  }
}
