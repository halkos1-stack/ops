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
    const { propertyId } = await context.params

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

    const templates = await prisma.propertyChecklistTemplate.findMany({
      where: {
        propertyId,
        ...(auth.isSuperAdmin ? {} : { organizationId: auth.organizationId }),
      },
      orderBy: [
        { isPrimary: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    })

    return NextResponse.json(templates)
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

    const name = toStringValue(body.name)
    const description = toNullableString(body.description)
    const isPrimary = toBoolean(body.isPrimary, false)
    const items = normalizeItems(body.items)
    const organizationId = property.organizationId

    if (!name) {
      return NextResponse.json(
        { error: "Το όνομα προτύπου είναι υποχρεωτικό." },
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
        },
      })
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error("Property checklist template POST error:", error)
    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας προτύπου checklist." },
      { status: 500 }
    )
  }
}