import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function toText(value: unknown) {
  return String(value ?? "").trim()
}

function toNullableText(value: unknown) {
  const text = String(value ?? "").trim()
  return text === "" ? null : text
}

function toBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback
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
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Get property checklists error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης λιστών ακινήτων." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const propertyId = toText(body.propertyId)
    const title = toText(body.title || body.name || "Checklist ακινήτου")
    const description = toNullableText(body.description)
    const isActive = toBoolean(body.isActive, true)
    const isPrimary = toBoolean(body.isPrimary, true)
    const templateType = toText(body.templateType || "main")
    const items = Array.isArray(body.items) ? body.items : []

    if (!propertyId) {
      return NextResponse.json(
        { error: "Το ακίνητο είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Η λίστα πρέπει να έχει τουλάχιστον ένα βήμα." },
        { status: 400 }
      )
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        name: true,
        organizationId: true,
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const existing = await prisma.propertyChecklistTemplate.findFirst({
      where: {
        propertyId,
        templateType,
      },
      include: {
        items: true,
      },
      orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
    })

    const normalizedItems = items.map(
      (
        item: {
          label?: string
          description?: string
          itemType?: string
          isRequired?: boolean
          category?: string
          requiresPhoto?: boolean
          opensIssueOnFail?: boolean
          optionsText?: string
        },
        index: number
      ) => ({
        label: toText(item.label || `Βήμα ${index + 1}`),
        description: toNullableText(item.description),
        itemType: toText(item.itemType || "boolean"),
        isRequired: typeof item.isRequired === "boolean" ? item.isRequired : true,
        sortOrder: index + 1,
        category: toNullableText(item.category) ?? "inspection",
        requiresPhoto: toBoolean(item.requiresPhoto, false),
        opensIssueOnFail: toBoolean(item.opensIssueOnFail, false),
        optionsText: toNullableText(item.optionsText),
      })
    )

    if (existing) {
      const updated = await prisma.$transaction(async (tx) => {
        if (isPrimary) {
          await tx.propertyChecklistTemplate.updateMany({
            where: {
              propertyId,
              templateType,
              id: {
                not: existing.id,
              },
            },
            data: {
              isPrimary: false,
            },
          })
        }

        await tx.propertyChecklistTemplateItem.deleteMany({
          where: {
            templateId: existing.id,
          },
        })

        const template = await tx.propertyChecklistTemplate.update({
          where: {
            id: existing.id,
          },
          data: {
            title,
            description,
            isActive,
            isPrimary,
            templateType,
            items: {
              create: normalizedItems,
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

        await tx.activityLog.create({
          data: {
            organizationId: property.organizationId,
            propertyId: property.id,
            entityType: "PROPERTY_CHECKLIST_TEMPLATE",
            entityId: template.id,
            action: "PROPERTY_CHECKLIST_TEMPLATE_UPDATED",
            message: `Ενημερώθηκε λίστα για το ακίνητο "${property.name}"`,
            actorType: "ADMIN",
            actorName: "System Admin",
            metadata: {
              propertyId: property.id,
              templateId: template.id,
              templateType,
              isPrimary,
            },
          },
        })

        return template
      })

      return NextResponse.json(updated)
    }

    const created = await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.propertyChecklistTemplate.updateMany({
          where: {
            propertyId,
            templateType,
          },
          data: {
            isPrimary: false,
          },
        })
      }

      const template = await tx.propertyChecklistTemplate.create({
        data: {
          organizationId: property.organizationId,
          propertyId: property.id,
          title,
          description,
          templateType,
          isPrimary,
          isActive,
          items: {
            create: normalizedItems,
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

      await tx.activityLog.create({
        data: {
          organizationId: property.organizationId,
          propertyId: property.id,
          entityType: "PROPERTY_CHECKLIST_TEMPLATE",
          entityId: template.id,
          action: "PROPERTY_CHECKLIST_TEMPLATE_CREATED",
          message: `Δημιουργήθηκε λίστα για το ακίνητο "${property.name}"`,
          actorType: "ADMIN",
          actorName: "System Admin",
          metadata: {
            propertyId: property.id,
            templateId: template.id,
            templateType,
            isPrimary,
          },
        },
      })

      return template
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Upsert property checklist error:", error)

    return NextResponse.json(
      { error: "Αποτυχία αποθήκευσης λίστας ακινήτου." },
      { status: 500 }
    )
  }
}