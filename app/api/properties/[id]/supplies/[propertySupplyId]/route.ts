import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import { refreshPropertyReadinessSnapshot } from "@/lib/properties/readiness-snapshot"
import { syncPropertySupplyTemplate } from "@/lib/supplies/property-supply-template-sync"
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

    await syncPropertySupplyTemplate({
      propertyId: property.id,
      organizationId: property.organizationId,
    })
    await refreshPropertyReadinessSnapshot({
      propertyId: property.id,
      organizationId: property.organizationId,
    })

    const payload = await buildResponse(property.id)
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
    await refreshPropertyReadinessSnapshot({
      propertyId: property.id,
      organizationId: property.organizationId,
    })

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
