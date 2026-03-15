import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiAppAccess,
  canAccessOrganization,
} from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    propertyId: string
    templateId: string
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
  if (category.includes("issue_report")) return "repair"

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

  if (["none", "set_stock", "consume", "flag_low", "status_map"].includes(normalized)) {
    return normalized
  }

  return "none"
}

function normalizeItemType(value: unknown) {
  const normalized = toStringValue(value, "boolean").toLowerCase()

  if (["boolean", "text", "number", "choice", "select", "photo"].includes(normalized)) {
    return normalized
  }

  return "boolean"
}

function isIssueReportCategory(category: string | null | undefined) {
  return String(category || "").trim().toLowerCase() === "issue_report"
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
      const linkedSupplyItemId = toNullableString(input.linkedSupplyItemId)

      if (linkedSupplyItemId) {
        return {
          label,
          description: toNullableString(input.description),
          itemType: "select",
          isRequired: true,
          sortOrder: toNumberValue(input.sortOrder, index + 1),
          category: "supplies",
          requiresPhoto: false,
          opensIssueOnFail: false,
          optionsText: "missing\nmedium\nfull",
          issueTypeOnFail: null,
          issueSeverityOnFail: null,
          failureValuesText: null,
          linkedSupplyItemId,
          supplyUpdateMode: "status_map",
          supplyQuantity: null,
        }
      }

      if (isIssueReportCategory(category)) {
        return {
          label,
          description: toNullableString(input.description),
          itemType: "text",
          isRequired: toBoolean(input.isRequired, false),
          sortOrder: toNumberValue(input.sortOrder, index + 1),
          category: "issue_report",
          requiresPhoto: toBoolean(input.requiresPhoto, false),
          opensIssueOnFail: false,
          optionsText: null,
          issueTypeOnFail: normalizeIssueType(input.issueTypeOnFail, "repair"),
          issueSeverityOnFail: normalizeIssueSeverity(input.issueSeverityOnFail),
          failureValuesText: null,
          linkedSupplyItemId: null,
          supplyUpdateMode: "none",
          supplyQuantity: null,
        }
      }

      return {
        label,
        description: toNullableString(input.description),
        itemType: normalizeItemType(input.itemType),
        isRequired: toBoolean(input.isRequired, true),
        sortOrder: toNumberValue(input.sortOrder, index + 1),
        category,
        requiresPhoto: toBoolean(input.requiresPhoto, false),
        opensIssueOnFail: toBoolean(input.opensIssueOnFail, false),
        optionsText: toNullableString(input.optionsText),
        issueTypeOnFail: normalizeIssueType(input.issueTypeOnFail, category),
        issueSeverityOnFail: normalizeIssueSeverity(input.issueSeverityOnFail),
        failureValuesText: toNullableString(input.failureValuesText),
        linkedSupplyItemId: null,
        supplyUpdateMode: "none",
        supplyQuantity: null,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

async function getActiveSuppliesForProperty(propertyId: string) {
  const rows = await prisma.propertySupply.findMany({
    where: {
      propertyId,
      supplyItem: {
        isActive: true,
      },
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
          isActive: true,
        },
      },
    },
    orderBy: [
      {
        supplyItem: {
          category: "asc",
        },
      },
      {
        supplyItem: {
          name: "asc",
        },
      },
    ],
  })

  return rows.map((row) => ({
    propertySupplyId: row.id,
    currentStock: row.currentStock,
    targetStock: row.targetStock,
    reorderThreshold: row.reorderThreshold,
    lastUpdatedAt: row.lastUpdatedAt,
    supplyItem: row.supplyItem,
  }))
}

async function validateLinkedSupplyItems(
  propertyId: string,
  items: Array<{ linkedSupplyItemId: string | null }>
) {
  const ids = [...new Set(items.map((item) => item.linkedSupplyItemId).filter(Boolean))] as string[]

  if (ids.length === 0) return

  const found = await prisma.propertySupply.findMany({
    where: {
      propertyId,
      supplyItemId: {
        in: ids,
      },
      supplyItem: {
        isActive: true,
      },
    },
    select: {
      supplyItemId: true,
    },
  })

  const foundIds = new Set(found.map((row) => row.supplyItemId))

  for (const id of ids) {
    if (!foundIds.has(id)) {
      throw new Error(
        "Υπάρχει item checklist με μη έγκυρο συνδεδεμένο αναλώσιμο για αυτό το ακίνητο."
      )
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
    const { propertyId, templateId } = await context.params

    const tenantWhere = auth.isSuperAdmin
      ? {}
      : { organizationId: auth.organizationId as string }

    const [template, activeSupplies] = await Promise.all([
      prisma.propertyChecklistTemplate.findFirst({
        where: {
          id: templateId,
          propertyId,
          ...tenantWhere,
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
      }),
      getActiveSuppliesForProperty(propertyId),
    ])

    if (!template) {
      return NextResponse.json(
        { error: "Το πρότυπο checklist δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, template.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το πρότυπο checklist." },
        { status: 403 }
      )
    }

    return NextResponse.json({
      ...template,
      activeSupplies,
      supplyCatalog: activeSupplies.map((row) => row.supplyItem),
    })
  } catch (error) {
    console.error("Checklist template GET by id error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης προτύπου checklist." },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { propertyId, templateId } = await context.params
    const body = await req.json()

    const existingTemplate = await prisma.propertyChecklistTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        propertyId: true,
        organizationId: true,
      },
    })

    if (!existingTemplate || existingTemplate.propertyId !== propertyId) {
      return NextResponse.json(
        { error: "Το πρότυπο checklist δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existingTemplate.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το πρότυπο checklist." },
        { status: 403 }
      )
    }

    const title = toStringValue(body.title)
    const description = toNullableString(body.description)
    const templateType = normalizeTemplateType(body.templateType)
    const isPrimary = toBoolean(body.isPrimary, false)
    const isActive = toBoolean(body.isActive, true)
    const items = normalizeItems(body.items)

    if (!title) {
      return NextResponse.json(
        { error: "Ο τίτλος προτύπου είναι υποχρεωτικός." },
        { status: 400 }
      )
    }

    await validateLinkedSupplyItems(propertyId, items)

    const updatedTemplate = await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.propertyChecklistTemplate.updateMany({
          where: {
            propertyId,
            organizationId: existingTemplate.organizationId ?? undefined,
            isPrimary: true,
            NOT: {
              id: templateId,
            },
          },
          data: {
            isPrimary: false,
          },
        })
      }

      await tx.propertyChecklistTemplateItem.deleteMany({
        where: {
          templateId,
        },
      })

      return tx.propertyChecklistTemplate.update({
        where: { id: templateId },
        data: {
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

    const activeSupplies = await getActiveSuppliesForProperty(propertyId)

    return NextResponse.json({
      ...updatedTemplate,
      activeSupplies,
      supplyCatalog: activeSupplies.map((row) => row.supplyItem),
    })
  } catch (error) {
    console.error("Checklist template PUT error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία ενημέρωσης προτύπου checklist."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { propertyId, templateId } = await context.params
    const body = await req.json()

    const existingTemplate = await prisma.propertyChecklistTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        propertyId: true,
        organizationId: true,
      },
    })

    if (!existingTemplate || existingTemplate.propertyId !== propertyId) {
      return NextResponse.json(
        { error: "Το πρότυπο checklist δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existingTemplate.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το πρότυπο checklist." },
        { status: 403 }
      )
    }

    const title =
      body.title !== undefined ? toStringValue(body.title) : undefined
    const description =
      body.description !== undefined
        ? toNullableString(body.description)
        : undefined
    const templateType =
      body.templateType !== undefined
        ? normalizeTemplateType(body.templateType)
        : undefined
    const isPrimary =
      body.isPrimary !== undefined
        ? toBoolean(body.isPrimary, false)
        : undefined
    const isActive =
      body.isActive !== undefined
        ? toBoolean(body.isActive, true)
        : undefined
    const items =
      body.items !== undefined ? normalizeItems(body.items) : undefined

    if (title !== undefined && !title) {
      return NextResponse.json(
        { error: "Ο τίτλος προτύπου είναι υποχρεωτικός." },
        { status: 400 }
      )
    }

    if (items !== undefined) {
      await validateLinkedSupplyItems(propertyId, items)
    }

    const updatedTemplate = await prisma.$transaction(async (tx) => {
      if (isPrimary === true) {
        await tx.propertyChecklistTemplate.updateMany({
          where: {
            propertyId,
            organizationId: existingTemplate.organizationId ?? undefined,
            isPrimary: true,
            NOT: {
              id: templateId,
            },
          },
          data: {
            isPrimary: false,
          },
        })
      }

      if (items !== undefined) {
        await tx.propertyChecklistTemplateItem.deleteMany({
          where: {
            templateId,
          },
        })
      }

      return tx.propertyChecklistTemplate.update({
        where: { id: templateId },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(templateType !== undefined ? { templateType } : {}),
          ...(isPrimary !== undefined ? { isPrimary } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
          ...(items !== undefined
            ? {
                items: {
                  create: items,
                },
              }
            : {}),
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

    const activeSupplies = await getActiveSuppliesForProperty(propertyId)

    return NextResponse.json({
      ...updatedTemplate,
      activeSupplies,
      supplyCatalog: activeSupplies.map((row) => row.supplyItem),
    })
  } catch (error) {
    console.error("Checklist template PATCH error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία μερικής ενημέρωσης προτύπου checklist."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}