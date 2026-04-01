import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import {
  SUPPLY_PRESETS,
  getSupplyPresetByCode,
  buildCustomSupplyCode,
} from "@/lib/supply-presets"

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

  const builtInCatalog = SUPPLY_PRESETS.map((preset) => {
    const activeRow = property.propertySupplies.find(
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
    const activeRow = property.propertySupplies.find(
      (row) => row.supplyItemId === item.id
    )

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

  const activeSupplies = property.propertySupplies.map((row) => ({
    id: row.id,
    propertySupplyId: row.id,
    currentStock: row.currentStock,
    targetStock: row.targetStock,
    targetLevel: row.targetLevel ?? null,
    reorderThreshold: row.reorderThreshold,
    minimumThreshold: row.minimumThreshold ?? null,
    trackingMode: row.trackingMode,
    isCritical: row.isCritical,
    warningThreshold: row.warningThreshold ?? null,
    lastUpdatedAt: row.lastUpdatedAt,
    notes: row.notes,
    fillLevel: (row as any).fillLevel ?? "full",
    isActive: true,
    supplyItemId: row.supplyItemId,
    name: row.supplyItem.name,
    nameEl: row.supplyItem.nameEl ?? null,
    nameEn: row.supplyItem.nameEn ?? null,
    code: row.supplyItem.code,
    category: row.supplyItem.category,
    unit: row.supplyItem.unit,
    minimumStock: row.supplyItem.minimumStock,
    supplyItem: {
      id: row.supplyItem.id,
      code: row.supplyItem.code,
      name: row.supplyItem.name,
      nameEl: row.supplyItem.nameEl ?? null,
      nameEn: row.supplyItem.nameEn ?? null,
      category: row.supplyItem.category,
      unit: row.supplyItem.unit,
      minimumStock: row.supplyItem.minimumStock,
      isActive: row.supplyItem.isActive,
    },
  }))

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
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, property.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      )
    }

    const payload = await buildResponse(property.id)

    return NextResponse.json(payload)
  } catch (error) {
    console.error("GET /api/properties/[id]/supplies error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης σελίδας αναλωσίμων." },
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
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, property.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      )
    }

    const action = toText(body?.action)

    if (action === "toggle_builtin") {
      const code = toText(body?.code)
      const enabled = Boolean(body?.enabled)

      const preset = SUPPLY_PRESETS.find((row) => row.code === code)

      if (!preset) {
        return NextResponse.json(
          { error: "Μη έγκυρο built-in αναλώσιμο." },
          { status: 400 }
        )
      }

      let supplyItem = await prisma.supplyItem.findUnique({
        where: {
          code: preset.code,
        },
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
        await prisma.propertySupply.create({
          data: {
            propertyId: property.id,
            supplyItemId: supplyItem.id,
            currentStock: Math.max(preset.minimumStock + 2, 3),
            targetStock: Math.max(preset.minimumStock + 2, 3),
            targetLevel: Math.max(preset.minimumStock + 2, 3),
            reorderThreshold: preset.minimumStock,
            minimumThreshold: preset.minimumStock,
            notes: "Ενεργοποιήθηκε από τη διαχείριση λίστας αναλωσίμων.",
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

      const payload = await buildResponse(property.id)
      return NextResponse.json(payload)
    }

    if (action === "toggle_custom") {
      const supplyItemId = toText(body?.supplyItemId)
      const enabled = Boolean(body?.enabled)

      if (!supplyItemId) {
        return NextResponse.json(
          { error: "Το supplyItemId είναι υποχρεωτικό." },
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
          { error: "Το custom αναλώσιμο δεν βρέθηκε." },
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

      const minimumStock =
        typeof supplyItem.minimumStock === "number" &&
        Number.isFinite(supplyItem.minimumStock)
          ? supplyItem.minimumStock
          : 1

      if (enabled && !existing) {
        await prisma.propertySupply.create({
          data: {
            propertyId: property.id,
            supplyItemId: supplyItem.id,
            currentStock: Math.max(minimumStock + 2, 3),
            targetStock: Math.max(minimumStock + 2, 3),
            targetLevel: Math.max(minimumStock + 2, 3),
            reorderThreshold: minimumStock,
            minimumThreshold: minimumStock,
            notes: "Ενεργοποιήθηκε custom αναλώσιμο από τη διαχείριση λίστας.",
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

      const payload = await buildResponse(property.id)
      return NextResponse.json(payload)
    }

    if (action === "add_custom") {
      const name = toText(body?.name)
      const category = toText(body?.category) || "custom"
      const unit = toText(body?.unit) || "τεμάχια"
      const minimumStock = toNumberOrNull(body?.minimumStock) ?? 1

      if (!name) {
        return NextResponse.json(
          { error: "Το custom αναλώσιμο απαιτεί όνομα." },
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
          { error: "Υπάρχει ήδη custom αναλώσιμο με αυτό το όνομα." },
          { status: 400 }
        )
      }

      let baseCode = buildCustomSupplyCode(name)
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

    return NextResponse.json(
      { error: "Μη έγκυρη ενέργεια." },
      { status: 400 }
    )
  } catch (error) {
    console.error("POST /api/properties/[id]/supplies error:", error)
    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης διαχείρισης αναλωσίμων." },
      { status: 500 }
    )
  }
}