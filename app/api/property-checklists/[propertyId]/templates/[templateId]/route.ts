import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    propertyId: string
    templateId: string
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
  id?: string
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
    const { propertyId, templateId } = await context.params

    const template = await prisma.propertyChecklistTemplate.findFirst({
      where: {
        id: templateId,
        propertyId,
      },
      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: "Το πρότυπο checklist δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error(
      "GET /api/property-checklists/[propertyId]/templates/[templateId] error:",
      error
    )

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης προτύπου checklist." },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { propertyId, templateId } = await context.params
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

    const existingTemplate = await prisma.propertyChecklistTemplate.findFirst({
      where: {
        id: templateId,
        propertyId,
      },
      select: {
        id: true,
      },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Το πρότυπο checklist δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.propertyChecklistTemplate.updateMany({
          where: {
            propertyId,
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

      const updated = await tx.propertyChecklistTemplate.update({
        where: {
          id: templateId,
        },
        data: {
          title,
          description,
          templateType,
          isPrimary: templateType === "main" ? isPrimary : false,
          isActive,
          items: {
            create: (items as ChecklistItemInput[])
              .filter((item) => String(item?.label ?? "").trim() !== "")
              .map((item, index) => ({
                label: String(item?.label ?? "").trim(),
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

      return updated
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error(
      "PUT /api/property-checklists/[propertyId]/templates/[templateId] error:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία αποθήκευσης προτύπου checklist.",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { propertyId, templateId } = await context.params

    const existingTemplate = await prisma.propertyChecklistTemplate.findFirst({
      where: {
        id: templateId,
        propertyId,
      },
      select: {
        id: true,
        isPrimary: true,
      },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Το πρότυπο checklist δεν βρέθηκε." },
        { status: 404 }
      )
    }

    await prisma.propertyChecklistTemplate.delete({
      where: {
        id: templateId,
      },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(
      "DELETE /api/property-checklists/[propertyId]/templates/[templateId] error:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία διαγραφής προτύπου checklist.",
      },
      { status: 500 }
    )
  }
}