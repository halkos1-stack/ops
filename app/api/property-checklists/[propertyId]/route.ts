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

function normalizeTemplateType(value: unknown) {
  const normalized = toStringValue(value, "main").toLowerCase()

  if (normalized === "main" || normalized === "core") return "main"
  if (normalized === "support" || normalized === "helper") return "support"

  return "main"
}

function normalizeItemType(value: unknown) {
  const normalized = toStringValue(value, "boolean").toLowerCase()

  if (
    [
      "boolean",
      "yes_no",
      "pass_fail",
      "checkbox",
      "text",
      "number",
      "numeric",
      "select",
      "choice",
      "dropdown",
      "photo",
      "image",
    ].includes(normalized)
  ) {
    return normalized
  }

  return "boolean"
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

      return {
        label,
        description: toNullableString(input.description),
        itemType: normalizeItemType(input.itemType),
        isRequired: toBoolean(input.isRequired, true),
        sortOrder: toNumberValue(input.sortOrder, index + 1),
        category: toNullableString(input.category) ?? "inspection",
        requiresPhoto: toBoolean(input.requiresPhoto, false),
        opensIssueOnFail: toBoolean(input.opensIssueOnFail, false),
        optionsText: toNullableString(input.optionsText),

        issueTypeOnFail: "general",
        issueSeverityOnFail: "medium",
        failureValuesText: null,

        linkedSupplyItemId: null,
        supplyUpdateMode: "none",
        supplyQuantity: null,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

function isLegacySupplyTemplate(template: {
  title: string
  description: string | null
  items: Array<{
    category: string | null
    linkedSupplyItemId: string | null
    supplyUpdateMode: string
  }>
}) {
  const title = String(template.title || "").toLowerCase()
  const description = String(template.description || "").toLowerCase()

  if (
    title.includes("αναλωσι") ||
    title.includes("suppl") ||
    description.includes("αναλωσι") ||
    description.includes("suppl")
  ) {
    return true
  }

  if (!template.items.length) return false

  const supplyLikeItems = template.items.filter((item) => {
    const category = String(item.category || "").toLowerCase()
    const mode = String(item.supplyUpdateMode || "").toLowerCase()

    return (
      !!item.linkedSupplyItemId ||
      mode !== "none" ||
      category.includes("supply") ||
      category.includes("stock") ||
      category.includes("inventory") ||
      category.includes("αναλω")
    )
  })

  return supplyLikeItems.length > 0
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

    const rawTemplates = await prisma.propertyChecklistTemplate.findMany({
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
          select: {
            id: true,
            label: true,
            description: true,
            itemType: true,
            isRequired: true,
            sortOrder: true,
            category: true,
            requiresPhoto: true,
            opensIssueOnFail: true,
            optionsText: true,
            issueTypeOnFail: true,
            issueSeverityOnFail: true,
            failureValuesText: true,
            linkedSupplyItemId: true,
            supplyUpdateMode: true,
            supplyQuantity: true,
          },
        },
      },
    })

    const templates = rawTemplates.filter(
      (template) => !isLegacySupplyTemplate(template)
    )

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

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Το πρότυπο πρέπει να περιέχει τουλάχιστον ένα στοιχείο." },
        { status: 400 }
      )
    }

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