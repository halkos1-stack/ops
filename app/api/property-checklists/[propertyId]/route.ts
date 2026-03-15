import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiAppAccess,
  canAccessOrganization,
} from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    propertyId: string
  }>
}

type ChecklistItemInput = {
  label?: unknown
  description?: unknown
  itemType?: unknown
  isRequired?: unknown
  sortOrder?: unknown
  category?: unknown
  requiresPhoto?: unknown
  opensIssueOnFail?: unknown
  optionsText?: unknown

  issueTypeOnFail?: unknown
  issueSeverityOnFail?: unknown
  failureValuesText?: unknown

  linkedSupplyItemId?: unknown
  supplyUpdateMode?: unknown
  supplyQuantity?: unknown
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

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
  }

  return fallback
}

function toNumberValue(value: unknown, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function toNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function normalizeTemplateType(value: unknown) {
  const normalized = toStringValue(value, "main").toLowerCase()

  if (normalized === "main" || normalized === "core") return "main"
  if (normalized === "support" || normalized === "helper") return "support"

  return "main"
}

function normalizeIssueType(value: unknown, fallbackCategory?: string | null) {
  const normalized = toStringValue(value).toLowerCase()

  if (
    ["damage", "repair", "supplies", "inspection", "cleaning", "general"].includes(
      normalized
    )
  ) {
    return normalized
  }

  const category = String(fallbackCategory || "").toLowerCase()

  if (
    category.includes("supply") ||
    category.includes("stock") ||
    category.includes("inventory")
  ) {
    return "supplies"
  }

  if (category.includes("damage")) return "damage"
  if (category.includes("repair")) return "repair"
  if (category.includes("clean")) return "cleaning"
  if (category.includes("inspection")) return "inspection"

  return "general"
}

function normalizeIssueSeverity(value: unknown) {
  const normalized = toStringValue(value, "medium").toLowerCase()

  if (["low", "medium", "high", "critical"].includes(normalized)) {
    return normalized
  }

  return "medium"
}

function normalizeSupplyUpdateMode(value: unknown) {
  const normalized = toStringValue(value, "none").toLowerCase()

  if (["none", "set_stock", "consume", "flag_low"].includes(normalized)) {
    return normalized
  }

  return "none"
}

function normalizeItems(items: unknown): Array<{
  label: string
  description: string | null
  itemType: string
  isRequired: boolean
  sortOrder: number
  category: string | null
  requiresPhoto: boolean
  opensIssueOnFail: boolean
  optionsText: string | null

  issueTypeOnFail: string | null
  issueSeverityOnFail: string | null
  failureValuesText: string | null

  linkedSupplyItemId: string | null
  supplyUpdateMode: string
  supplyQuantity: number | null
}> {
  if (!Array.isArray(items)) return []

  return items
    .map((item, index) => {
      const input = (item ?? {}) as ChecklistItemInput
      const label = toStringValue(input.label)

      if (!label) return null

      const category = toNullableString(input.category) ?? "inspection"

      return {
        label,
        description: toNullableString(input.description),
        itemType: toNullableString(input.itemType)?.toLowerCase() ?? "boolean",
        isRequired: toBoolean(input.isRequired, true),
        sortOrder: toNumberValue(input.sortOrder, index + 1),
        category,
        requiresPhoto: toBoolean(input.requiresPhoto, false),
        opensIssueOnFail: toBoolean(input.opensIssueOnFail, false),
        optionsText: toNullableString(input.optionsText),

        issueTypeOnFail: normalizeIssueType(input.issueTypeOnFail, category),
        issueSeverityOnFail: normalizeIssueSeverity(input.issueSeverityOnFail),
        failureValuesText: toNullableString(input.failureValuesText),

        linkedSupplyItemId: toNullableString(input.linkedSupplyItemId),
        supplyUpdateMode: normalizeSupplyUpdateMode(input.supplyUpdateMode),
        supplyQuantity: toNullableNumber(input.supplyQuantity),
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

async function getSupplyCatalog() {
  return prisma.supplyItem.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      unit: true,
      minimumStock: true,
      isActive: true,
    },
  })
}

async function validateLinkedSupplyItems(
  items: Array<{
    linkedSupplyItemId: string | null
  }>
) {
  const ids = [
    ...new Set(
      items.map((item) => item.linkedSupplyItemId).filter(Boolean)
    ),
  ] as string[]

  if (ids.length === 0) return

  const found = await prisma.supplyItem.findMany({
    where: {
      id: {
        in: ids,
      },
      isActive: true,
    },
    select: {
      id: true,
    },
  })

  const foundIds = new Set(found.map((row) => row.id))

  for (const id of ids) {
    if (!foundIds.has(id)) {
      throw new Error("Υπάρχει item checklist με μη έγκυρο συνδεδεμένο αναλώσιμο.")
    }
  }
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { propertyId } = await context.params

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        organizationId: true,
        code: true,
        name: true,
        address: true,
      },
    })

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

    const [templates, supplyCatalog] = await Promise.all([
      prisma.propertyChecklistTemplate.findMany({
        where: {
          propertyId,
          organizationId: property.organizationId,
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        include: {
          items: {
            orderBy: {
              sortOrder: "asc",
            },
            include: {
              supplyItem: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  category: true,
                  unit: true,
                  minimumStock: true,
                },
              },
            },
          },
        },
      }),
      getSupplyCatalog(),
    ])

    const primaryTemplate =
      templates.find((template) => template.isPrimary) ?? null

    return NextResponse.json({
      property: {
        id: property.id,
        code: property.code,
        name: property.name,
        address: property.address,
      },
      templates,
      primaryTemplate,
      supplyCatalog,
    })
  } catch (error) {
    console.error("Property checklist templates GET error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης προτύπων checklist." },
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

    const { auth } = access
    const { propertyId } = await context.params
    const body = await req.json()

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        organizationId: true,
      },
    })

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

    const title = toStringValue(body.title)
    const description = toNullableString(body.description)
    const templateType = normalizeTemplateType(body.templateType)
    const isPrimary = toBoolean(body.isPrimary, false)
    const isActive = toBoolean(body.isActive, true)
    const items = normalizeItems(body.items)
    const organizationId = property.organizationId

    if (!title) {
      return NextResponse.json(
        { error: "Ο τίτλος προτύπου είναι υποχρεωτικός." },
        { status: 400 }
      )
    }

    await validateLinkedSupplyItems(items)

    const template = await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.propertyChecklistTemplate.updateMany({
          where: {
            propertyId,
            organizationId,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        })
      }

      return tx.propertyChecklistTemplate.create({
        data: {
          organizationId,
          propertyId,
          title,
          description,
          templateType,
          isPrimary,
          isActive,
          items: {
            create: items,
          },
        },
        include: {
          items: {
            orderBy: {
              sortOrder: "asc",
            },
            include: {
              supplyItem: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  category: true,
                  unit: true,
                  minimumStock: true,
                },
              },
            },
          },
          property: {
            select: {
              id: true,
              code: true,
              name: true,
              address: true,
            },
          },
        },
      })
    })

    return NextResponse.json(
      {
        success: true,
        template,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Property checklist template POST error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία δημιουργίας προτύπου checklist."

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}