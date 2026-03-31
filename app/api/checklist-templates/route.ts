import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function toText(value: unknown) {
  return String(value ?? "").trim()
}

function toNullableText(value: unknown) {
  const text = String(value ?? "").trim()
  return text === "" ? null : text
}

function toBooleanValue(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value
  return fallback
}

function normalizeTemplateType(value: unknown): "main" | "support" {
  const text = String(value ?? "").trim().toLowerCase()

  if (
    text === "main" ||
    text === "primary" ||
    text === "base" ||
    text === "cleaning" ||
    text === "cleaning_checklist"
  ) {
    return "main"
  }

  return "support"
}

function normalizeItemType(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase()

  if (
    text === "boolean" ||
    text === "text" ||
    text === "number" ||
    text === "choice" ||
    text === "photo" ||
    text === "select"
  ) {
    return text === "select" ? "choice" : text
  }

  return "boolean"
}

export async function GET() {
  try {
    const templates = await prisma.propertyChecklistTemplate.findMany({
      include: {
        property: true,
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Get checklist templates error:", error)

    return NextResponse.json(
      { error: "Failed to fetch checklist templates" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const propertyId = toText(body.propertyId)
    const title = toText(body.title || body.name)
    const description = toNullableText(body.description)
    const isActive = toBooleanValue(body.isActive, true)
    const isPrimary = toBooleanValue(body.isPrimary, false)
    const templateType = normalizeTemplateType(body.templateType || body.taskType)
    const items = Array.isArray(body.items) ? body.items : []

    if (!propertyId || !title) {
      return NextResponse.json(
        { error: "Ακίνητο και όνομα λίστας είναι υποχρεωτικά." },
        { status: 400 }
      )
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Η λίστα πρέπει να έχει τουλάχιστον ένα στοιχείο." },
        { status: 400 }
      )
    }

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

    if (isPrimary) {
      await prisma.propertyChecklistTemplate.updateMany({
        where: {
          propertyId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      })
    }

    const template = await prisma.propertyChecklistTemplate.create({
      data: {
        propertyId,
        title,
        description,
        templateType,
        isPrimary,
        isActive,
        items: {
          create: items.map((item: unknown, index: number) => {
            const row = item as {
              label?: string
              description?: string
              itemType?: string
              isRequired?: boolean
              category?: string
              requiresPhoto?: boolean
              opensIssueOnFail?: boolean
              optionsText?: string
            }

            return {
              label: toText(row.label) || `Βήμα ${index + 1}`,
              description: toNullableText(row.description),
              itemType: normalizeItemType(row.itemType),
              isRequired:
                typeof row.isRequired === "boolean" ? row.isRequired : true,
              sortOrder: index + 1,
              category: toNullableText(row.category) || "inspection",
              requiresPhoto:
                typeof row.requiresPhoto === "boolean"
                  ? row.requiresPhoto
                  : false,
              opensIssueOnFail:
                typeof row.opensIssueOnFail === "boolean"
                  ? row.opensIssueOnFail
                  : false,
              optionsText: toNullableText(row.optionsText),
            }
          }),
        },
      },
      include: {
        property: true,
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    })

    await prisma.activityLog.create({
      data: {
        organizationId: property.organizationId,
        propertyId: property.id,
        entityType: "checklist_template",
        entityId: template.id,
        action: "created",
        message: `Δημιουργήθηκε λίστα "${template.title}" για το ακίνητο.`,
        actorType: "admin",
        actorName: "System Admin",
        metadata: {
          propertyId: property.id,
          templateId: template.id,
          templateType: template.templateType,
          isPrimary: template.isPrimary,
        },
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error("Create checklist template error:", error)

    return NextResponse.json(
      { error: "Failed to create checklist template" },
      { status: 500 }
    )
  }
}