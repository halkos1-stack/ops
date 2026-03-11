import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    propertyId: string
  }>
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value
  if (value === "true") return true
  if (value === "false") return false
  return fallback
}

function toInt(value: unknown, fallback = 0) {
  const num = Number(value)
  if (Number.isNaN(num)) return fallback
  return Math.trunc(num)
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

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { propertyId } = await context.params

    const templates = await prisma.propertyChecklistTemplate.findMany({
      where: {
        propertyId,
      },
      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    })

    return NextResponse.json({
      templates,
      primaryTemplate: templates.find((x) => x.isPrimary) || null,
    })
  } catch (error) {
    console.error("GET /api/property-checklists/[propertyId] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης προτύπων checklist." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { propertyId } = await context.params
    const body = await req.json()

    const title = String(body?.title ?? "").trim()
    const description = toNullableString(body?.description)
    const templateType = String(body?.templateType ?? "main").trim() || "main"
    const isPrimary = toBoolean(body?.isPrimary, false)
    const isActive = toBoolean(body?.isActive, true)
    const items = Array.isArray(body?.items) ? body.items : []

    if (!title) {
      return NextResponse.json(
        { error: "Ο τίτλος προτύπου checklist είναι υποχρεωτικός." },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.propertyChecklistTemplate.updateMany({
          where: { propertyId, isPrimary: true },
          data: { isPrimary: false },
        })
      }

      const created = await tx.propertyChecklistTemplate.create({
        data: {
          propertyId,
          title,
          description,
          templateType,
          isPrimary,
          isActive,
          items: {
            create: (items as ChecklistItemInput[]).map((item, index) => ({
              label: String(item?.label ?? "").trim() || `Βήμα ${index + 1}`,
              description: toNullableString(item?.description),
              itemType: String(item?.itemType ?? "boolean").trim() || "boolean",
              isRequired: toBoolean(item?.isRequired, true),
              sortOrder: toInt(item?.sortOrder, index + 1),
              category: toNullableString(item?.category) ?? "inspection",
              requiresPhoto: toBoolean(item?.requiresPhoto, false),
              opensIssueOnFail: toBoolean(item?.opensIssueOnFail, false),
              optionsText: toNullableString(item?.optionsText),
            })),
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

      return created
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("POST /api/property-checklists/[propertyId] error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία δημιουργίας προτύπου checklist.",
      },
      { status: 500 }
    )
  }
}