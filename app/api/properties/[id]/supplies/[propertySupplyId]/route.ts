import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import {
  SUPPLY_PRESETS,
  getSupplyPresetByKey,
  buildCustomSupplyCode,
} from "@/lib/supply-presets"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toStringValue(value: unknown, fallback = "") {
  if (value === undefined || value === null) return fallback
  return String(value).trim()
}

function toNumberValue(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function toNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return num
}

async function getPropertyBase(id: string) {
  return prisma.property.findUnique({
    where: { id },
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

async function getPropertySupplies(propertyId: string) {
  return prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      code: true,
      name: true,
      address: true,
      city: true,
      region: true,
      postalCode: true,
      country: true,
      status: true,
      propertySupplies: {
        orderBy: [
          {
            updatedAt: "desc",
          },
        ],
        include: {
          supplyItem: true,
        },
      },
      tasks: {
        orderBy: {
          scheduledDate: "desc",
        },
        take: 50,
        select: {
          id: true,
          title: true,
          completedAt: true,
          supplyConsumptions: {
            orderBy: {
              createdAt: "desc",
            },
            include: {
              supplyItem: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  category: true,
                  unit: true,
                },
              },
            },
          },
        },
      },
    },
  })
}

function buildCatalog(
  property: NonNullable<Awaited<ReturnType<typeof getPropertySupplies>>>
) {
  const activeByCode = new Map<
    string,
    {
      propertySupplyId: string
      currentStock: number
      targetStock: number | null
      reorderThreshold: number | null
      notes: string | null
      updatedAt: Date
    }
  >()

  for (const row of property.propertySupplies) {
    if (!row.supplyItem?.code) continue

    activeByCode.set(row.supplyItem.code, {
      propertySupplyId: row.id,
      currentStock: row.currentStock,
      targetStock: row.targetStock ?? null,
      reorderThreshold: row.reorderThreshold ?? null,
      notes: row.notes ?? null,
      updatedAt: row.updatedAt,
    })
  }

  const builtIn = SUPPLY_PRESETS.map((preset) => {
    const active = activeByCode.get(preset.code)

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
      isActiveForProperty: Boolean(active),
      propertySupplyId: active?.propertySupplyId ?? null,
      currentStock: active?.currentStock ?? null,
      targetStock: active?.targetStock ?? null,
      reorderThreshold: active?.reorderThreshold ?? null,
      notes: active?.notes ?? null,
      updatedAt: active?.updatedAt ?? null,
      isCustom: false,
    }
  })

  const custom = property.propertySupplies
    .filter((row) => {
      const code = row.supplyItem?.code || ""
      return !code.startsWith("SYS_")
    })
    .map((row) => ({
      presetKey: null,
      code: row.supplyItem?.code || "",
      nameEl: row.supplyItem?.name || "",
      nameEn: row.supplyItem?.name || "",
      category: row.supplyItem?.category || "",
      unit: row.supplyItem?.unit || "",
      minimumStock: row.supplyItem?.minimumStock ?? 0,
      checklistLabelEl: `Επάρκεια ${row.supplyItem?.name || "αναλωσίμου"}`,
      checklistLabelEn: `${row.supplyItem?.name || "Supply"} level`,
      isActiveForProperty: true,
      propertySupplyId: row.id,
      currentStock: row.currentStock,
      targetStock: row.targetStock ?? null,
      reorderThreshold: row.reorderThreshold ?? null,
      notes: row.notes ?? null,
      updatedAt: row.updatedAt,
      isCustom: true,
    }))

  return {
    builtIn,
    custom,
  }
}

function getActorType(auth: {
  isSuperAdmin: boolean
  organizationRole: "ORG_ADMIN" | "MANAGER" | "PARTNER" | null
}) {
  if (auth.isSuperAdmin) return "SUPER_ADMIN"
  if (auth.organizationRole) return auth.organizationRole
  return "USER"
}

function getActorName(auth: { email: string }) {
  return auth.email || "Χρήστης"
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { id } = await context.params

    const propertyBase = await getPropertyBase(id)

    if (!propertyBase) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, propertyBase.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      )
    }

    const property = await getPropertySupplies(id)

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      property,
      catalog: buildCatalog(property),
    })
  } catch (error) {
    console.error("GET /api/properties/[id]/supplies error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης αναλωσίμων ακινήτου." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { id } = await context.params
    const body = await req.json()

    const propertyBase = await getPropertyBase(id)

    if (!propertyBase) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, propertyBase.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      )
    }

    const presetKey = toNullableString(body.presetKey)
    const isCustom = Boolean(body.isCustom)

    const currentStock = toNumberValue(body.currentStock, 0)
    const targetStock = toNullableNumber(body.targetStock)
    const reorderThreshold = toNullableNumber(body.reorderThreshold)
    const notes = toNullableString(body.notes)

    let supplyItemId: string | null = null

    if (!isCustom) {
      const preset = getSupplyPresetByKey(presetKey)

      if (!preset) {
        return NextResponse.json(
          { error: "Το built-in αναλώσιμο δεν βρέθηκε." },
          { status: 400 }
        )
      }

      const existingSupplyItem = await prisma.supplyItem.findUnique({
        where: {
          code: preset.code,
        },
        select: {
          id: true,
        },
      })

      if (existingSupplyItem) {
        supplyItemId = existingSupplyItem.id
      } else {
        const createdSupplyItem = await prisma.supplyItem.create({
          data: {
            code: preset.code,
            name: preset.nameEl,
            category: preset.category,
            unit: preset.unit,
            minimumStock: preset.minimumStock,
            isActive: true,
            notes: `SYSTEM_PRESET:${preset.key}`,
          },
          select: {
            id: true,
          },
        })

        supplyItemId = createdSupplyItem.id
      }
    } else {
      const name = toStringValue(body.name)
      const category = toStringValue(body.category)
      const unit = toStringValue(body.unit)
      const minimumStock = toNullableNumber(body.minimumStock)

      if (!name || !category || !unit) {
        return NextResponse.json(
          {
            error:
              "Για custom αναλώσιμο απαιτούνται όνομα, κατηγορία και μονάδα.",
          },
          { status: 400 }
        )
      }

      const code = buildCustomSupplyCode(name)

      const createdSupplyItem = await prisma.supplyItem.create({
        data: {
          code,
          name,
          category,
          unit,
          minimumStock: minimumStock ?? 0,
          isActive: true,
          notes: "CUSTOM_STATUS_MAP_SUPPLY",
        },
        select: {
          id: true,
        },
      })

      supplyItemId = createdSupplyItem.id
    }

    if (!supplyItemId) {
      return NextResponse.json(
        { error: "Δεν μπόρεσε να δημιουργηθεί το αναλώσιμο." },
        { status: 400 }
      )
    }

    const exists = await prisma.propertySupply.findUnique({
      where: {
        propertyId_supplyItemId: {
          propertyId: id,
          supplyItemId,
        },
      },
      select: {
        id: true,
      },
    })

    if (exists) {
      return NextResponse.json(
        { error: "Το αναλώσιμο είναι ήδη ενεργό στο ακίνητο." },
        { status: 400 }
      )
    }

    await prisma.propertySupply.create({
      data: {
        propertyId: id,
        supplyItemId,
        currentStock,
        targetStock,
        reorderThreshold,
        notes,
        lastUpdatedAt: new Date(),
      },
    })

    const property = await getPropertySupplies(id)

    if (!property) {
      return NextResponse.json(
        { error: "Αποτυχία φόρτωσης ενημερωμένων δεδομένων." },
        { status: 500 }
      )
    }

    await prisma.activityLog.create({
      data: {
        organizationId: propertyBase.organizationId,
        propertyId: id,
        entityType: "PROPERTY_SUPPLY",
        entityId: id,
        action: "PROPERTY_SUPPLY_ENABLED",
        message: isCustom
          ? "Ενεργοποιήθηκε νέο custom αναλώσιμο για το ακίνητο."
          : "Ενεργοποιήθηκε built-in αναλώσιμο για το ακίνητο.",
        actorType: getActorType(auth),
        actorName: getActorName(auth),
        metadata: {
          propertyId: id,
          presetKey,
          isCustom,
          currentStock,
          targetStock,
          reorderThreshold,
        },
      },
    })

    return NextResponse.json({
      success: true,
      property,
      catalog: buildCatalog(property),
    })
  } catch (error) {
    console.error("POST /api/properties/[id]/supplies error:", error)

    return NextResponse.json(
      { error: "Αποτυχία ενεργοποίησης αναλωσίμου." },
      { status: 500 }
    )
  }
}