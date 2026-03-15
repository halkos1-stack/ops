import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type BuiltInSupplyDefinition = {
  code: string
  name: string
  category: string
  unit: string
  minimumStock: number
  targetStock: number
}

const BUILT_IN_SUPPLIES: BuiltInSupplyDefinition[] = [
  {
    code: "TOILET_PAPER",
    name: "Χαρτί υγείας",
    category: "bathroom",
    unit: "pcs",
    minimumStock: 1,
    targetStock: 3,
  },
  {
    code: "KITCHEN_PAPER",
    name: "Χαρτί κουζίνας",
    category: "kitchen",
    unit: "pcs",
    minimumStock: 1,
    targetStock: 2,
  },
  {
    code: "HAND_SOAP",
    name: "Σαπούνι χεριών",
    category: "bathroom",
    unit: "pcs",
    minimumStock: 1,
    targetStock: 2,
  },
  {
    code: "SHAMPOO",
    name: "Σαμπουάν",
    category: "bathroom",
    unit: "pcs",
    minimumStock: 1,
    targetStock: 2,
  },
  {
    code: "SHOWER_GEL",
    name: "Αφρόλουτρο",
    category: "bathroom",
    unit: "pcs",
    minimumStock: 1,
    targetStock: 2,
  },
  {
    code: "TRASH_BAGS",
    name: "Σακούλες απορριμμάτων",
    category: "kitchen",
    unit: "pack",
    minimumStock: 1,
    targetStock: 2,
  },
  {
    code: "DISH_SOAP",
    name: "Απορρυπαντικό πιάτων",
    category: "kitchen",
    unit: "pcs",
    minimumStock: 1,
    targetStock: 2,
  },
  {
    code: "LAUNDRY_DETERGENT",
    name: "Απορρυπαντικό ρούχων",
    category: "laundry",
    unit: "pcs",
    minimumStock: 1,
    targetStock: 2,
  },
  {
    code: "FABRIC_SOFTENER",
    name: "Μαλακτικό",
    category: "laundry",
    unit: "pcs",
    minimumStock: 1,
    targetStock: 2,
  },
  {
    code: "COFFEE_CAPSULES",
    name: "Καφές / κάψουλες",
    category: "kitchen",
    unit: "pcs",
    minimumStock: 2,
    targetStock: 10,
  },
  {
    code: "SUGAR",
    name: "Ζάχαρη",
    category: "kitchen",
    unit: "pcs",
    minimumStock: 1,
    targetStock: 2,
  },
  {
    code: "WATER_BOTTLES",
    name: "Μπουκάλια νερού",
    category: "kitchen",
    unit: "pcs",
    minimumStock: 2,
    targetStock: 6,
  },
]

function toText(value: unknown) {
  return String(value ?? "").trim()
}

function slugifyText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

async function getOrCreateBuiltInSupplyItem(definition: BuiltInSupplyDefinition) {
  const existing = await prisma.supplyItem.findUnique({
    where: { code: definition.code },
  })

  if (existing) {
    return prisma.supplyItem.update({
      where: { id: existing.id },
      data: {
        name: definition.name,
        category: definition.category,
        unit: definition.unit,
        minimumStock: definition.minimumStock,
        isActive: true,
      },
    })
  }

  return prisma.supplyItem.create({
    data: {
      code: definition.code,
      name: definition.name,
      category: definition.category,
      unit: definition.unit,
      minimumStock: definition.minimumStock,
      isActive: true,
    },
  })
}

async function buildResponse(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      code: true,
      name: true,
      organizationId: true,
    },
  })

  if (!property) return null

  const activePropertySupplies = await prisma.propertySupply.findMany({
    where: {
      propertyId,
    },
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
  })

  const activeSupplyItemIds = new Set(
    activePropertySupplies.map((item) => item.supplyItemId)
  )

  const builtInSupplyItems = await prisma.supplyItem.findMany({
    where: {
      code: {
        in: BUILT_IN_SUPPLIES.map((item) => item.code),
      },
    },
    orderBy: {
      name: "asc",
    },
  })

  const builtInByCode = new Map(builtInSupplyItems.map((item) => [item.code, item]))

  const builtInCatalog = BUILT_IN_SUPPLIES.map((definition) => {
    const existingSupplyItem = builtInByCode.get(definition.code)

    return {
      code: definition.code,
      name: existingSupplyItem?.name || definition.name,
      category: existingSupplyItem?.category || definition.category,
      unit: existingSupplyItem?.unit || definition.unit,
      isActive: existingSupplyItem
        ? activeSupplyItemIds.has(existingSupplyItem.id)
        : false,
    }
  })

  return {
    property: {
      id: property.id,
      code: property.code,
      name: property.name,
      organizationId: property.organizationId,
    },
    activeSupplies: activePropertySupplies.map((item) => ({
      id: item.id,
      propertyId: item.propertyId,
      supplyItemId: item.supplyItemId,
      currentStock: item.currentStock,
      targetStock: item.targetStock,
      reorderThreshold: item.reorderThreshold,
      lastUpdatedAt: item.lastUpdatedAt,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      supplyItem: {
        id: item.supplyItem.id,
        code: item.supplyItem.code,
        name: item.supplyItem.name,
        category: item.supplyItem.category,
        unit: item.supplyItem.unit,
        minimumStock: item.supplyItem.minimumStock,
        isActive: item.supplyItem.isActive,
      },
    })),
    builtInCatalog,
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const payload = await buildResponse(id)

    if (!payload) {
      return NextResponse.json(
        {
          error: "Το ακίνητο δεν βρέθηκε.",
        },
        { status: 404 }
      )
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error("GET /api/properties/[id]/supplies failed:", error)

    return NextResponse.json(
      {
        error: "Αποτυχία φόρτωσης αναλωσίμων.",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()

    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
      },
    })

    if (!property) {
      return NextResponse.json(
        {
          error: "Το ακίνητο δεν βρέθηκε.",
        },
        { status: 404 }
      )
    }

    const action = toText(body?.action)

    if (action === "toggle_builtin") {
      const code = toText(body?.code)
      const enabled = Boolean(body?.enabled)

      const definition = BUILT_IN_SUPPLIES.find((item) => item.code === code)

      if (!definition) {
        return NextResponse.json(
          {
            error: "Μη έγκυρο built-in αναλώσιμο.",
          },
          { status: 400 }
        )
      }

      const supplyItem = await getOrCreateBuiltInSupplyItem(definition)

      const existingPropertySupply = await prisma.propertySupply.findUnique({
        where: {
          propertyId_supplyItemId: {
            propertyId: id,
            supplyItemId: supplyItem.id,
          },
        },
      })

      if (enabled) {
        if (!existingPropertySupply) {
          await prisma.propertySupply.create({
            data: {
              propertyId: id,
              supplyItemId: supplyItem.id,
              currentStock: definition.targetStock,
              targetStock: definition.targetStock,
              reorderThreshold: definition.minimumStock,
              lastUpdatedAt: new Date(),
            },
          })
        }
      } else {
        if (existingPropertySupply) {
          await prisma.propertySupply.delete({
            where: {
              propertyId_supplyItemId: {
                propertyId: id,
                supplyItemId: supplyItem.id,
              },
            },
          })
        }
      }

      const payload = await buildResponse(id)

      return NextResponse.json(payload)
    }

    if (action === "add_custom") {
      const name = toText(body?.name)

      if (!name) {
        return NextResponse.json(
          {
            error: "Το custom αναλώσιμο θέλει μόνο όνομα.",
          },
          { status: 400 }
        )
      }

      const customCode = `CUSTOM_${id.toUpperCase()}_${slugifyText(name).toUpperCase()}`

      let supplyItem = await prisma.supplyItem.findUnique({
        where: {
          code: customCode,
        },
      })

      if (!supplyItem) {
        supplyItem = await prisma.supplyItem.create({
          data: {
            code: customCode,
            name,
            category: "custom",
            unit: "pcs",
            minimumStock: 1,
            isActive: true,
          },
        })
      } else {
        supplyItem = await prisma.supplyItem.update({
          where: {
            id: supplyItem.id,
          },
          data: {
            name,
            isActive: true,
          },
        })
      }

      const existingPropertySupply = await prisma.propertySupply.findUnique({
        where: {
          propertyId_supplyItemId: {
            propertyId: id,
            supplyItemId: supplyItem.id,
          },
        },
      })

      if (!existingPropertySupply) {
        await prisma.propertySupply.create({
          data: {
            propertyId: id,
            supplyItemId: supplyItem.id,
            currentStock: 3,
            targetStock: 3,
            reorderThreshold: 1,
            lastUpdatedAt: new Date(),
          },
        })
      }

      const payload = await buildResponse(id)

      return NextResponse.json(payload)
    }

    return NextResponse.json(
      {
        error: "Μη έγκυρη ενέργεια για τα αναλώσιμα.",
      },
      { status: 400 }
    )
  } catch (error) {
    console.error("POST /api/properties/[id]/supplies failed:", error)

    return NextResponse.json(
      {
        error: "Αποτυχία ενημέρωσης αναλωσίμων.",
      },
      { status: 500 }
    )
  }
}