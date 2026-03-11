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
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toStringValue(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback
  return value.trim()
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true
    if (value.toLowerCase() === "false") return false
  }
  return fallback
}

function toNumberValue(value: unknown, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
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
        itemType: toNullableString(input.itemType) ?? "CHECK",
        isRequired: toBoolean(input.isRequired, true),
        sortOrder: toNumberValue(input.sortOrder, index),
        category: toNullableString(input.category),
        requiresPhoto: toBoolean(input.requiresPhoto, false),
        opensIssueOnFail: toBoolean(input.opensIssueOnFail, false),
        optionsText: toNullableString(input.optionsText),
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { propertyId, templateId } = await context.params

    const template = await prisma.propertyChecklistTemplate.findFirst({
      where: {
        id: templateId,
        propertyId,
        ...(auth.isSuperAdmin ? {} : { organizationId: auth.organizationId }),
      },
      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        property: true,
      },
    })

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

    return NextResponse.json(template)
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

    const name = toStringValue(body.name)
    const description = toNullableString(body.description)
    const isPrimary = toBoolean(body.isPrimary, false)
    const items = normalizeItems(body.items)

    if (!name) {
      return NextResponse.json(
        { error: "Το όνομα προτύπου είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const updatedTemplate = await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.propertyChecklistTemplate.updateMany({
          where: {
            propertyId,
            organizationId: existingTemplate.organizationId,
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
          name,
          description,
          isPrimary,
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
          property: true,
        },
      })
    })

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error("Checklist template PUT error:", error)
    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης προτύπου checklist." },
      { status: 500 }
    )
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

    const name =
      body.name !== undefined ? toStringValue(body.name) : undefined
    const description =
      body.description !== undefined ? toNullableString(body.description) : undefined
    const isPrimary =
      body.isPrimary !== undefined ? toBoolean(body.isPrimary, false) : undefined
    const items =
      body.items !== undefined ? normalizeItems(body.items) : undefined

    const updatedTemplate = await prisma.$transaction(async (tx) => {
      if (isPrimary === true) {
        await tx.propertyChecklistTemplate.updateMany({
          where: {
            propertyId,
            organizationId: existingTemplate.organizationId,
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
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(isPrimary !== undefined ? { isPrimary } : {}),
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
          },
          property: true,
        },
      })
    })

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error("Checklist template PATCH error:", error)
    return NextResponse.json(
      { error: "Αποτυχία μερικής ενημέρωσης προτύπου checklist." },
      { status: 500 }
    )
  }
}