import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
    console.error("Get property checklists error:", error)

    return NextResponse.json(
      { error: "Failed to fetch property checklists" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const propertyId = body.propertyId?.trim()
    const name = body.name?.trim() || "Checklist ακινήτου"
    const description = body.description?.trim() || null
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : true
    const items = Array.isArray(body.items) ? body.items : []

    if (!propertyId) {
      return NextResponse.json(
        { error: "Το ακίνητο είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Η checklist πρέπει να έχει τουλάχιστον ένα βήμα." },
        { status: 400 }
      )
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const existing = await prisma.propertyChecklistTemplate.findUnique({
      where: { propertyId },
      include: { items: true },
    })

    if (existing) {
      await prisma.propertyChecklistTemplateItem.deleteMany({
        where: {
          templateId: existing.id,
        },
      })

      const updated = await prisma.propertyChecklistTemplate.update({
        where: { propertyId },
        data: {
          name,
          description,
          isActive,
          items: {
            create: items.map(
              (
                item: {
                  label?: string
                  description?: string
                  itemType?: string
                  isRequired?: boolean
                },
                index: number
              ) => ({
                label: item.label?.trim() || `Βήμα ${index + 1}`,
                description: item.description?.trim() || null,
                itemType: item.itemType?.trim() || "boolean",
                isRequired:
                  typeof item.isRequired === "boolean" ? item.isRequired : true,
                sortOrder: index + 1,
              })
            ),
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
          propertyId,
          entityType: "property_checklist_template",
          entityId: updated.id,
          action: "updated",
          message: `Ενημερώθηκε checklist για το ακίνητο "${property.name}"`,
          actorType: "admin",
          actorName: "System Admin",
          metadata: {
            propertyId,
            templateId: updated.id,
          },
        },
      })

      return NextResponse.json(updated)
    }

    const created = await prisma.propertyChecklistTemplate.create({
      data: {
        propertyId,
        name,
        description,
        isActive,
        items: {
          create: items.map(
            (
              item: {
                label?: string
                description?: string
                itemType?: string
                isRequired?: boolean
              },
              index: number
            ) => ({
              label: item.label?.trim() || `Βήμα ${index + 1}`,
              description: item.description?.trim() || null,
              itemType: item.itemType?.trim() || "boolean",
              isRequired:
                typeof item.isRequired === "boolean" ? item.isRequired : true,
              sortOrder: index + 1,
            })
          ),
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
        propertyId,
        entityType: "property_checklist_template",
        entityId: created.id,
        action: "created",
        message: `Δημιουργήθηκε checklist για το ακίνητο "${property.name}"`,
        actorType: "admin",
        actorName: "System Admin",
        metadata: {
          propertyId,
          templateId: created.id,
        },
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Upsert property checklist error:", error)

    return NextResponse.json(
      { error: "Failed to save property checklist" },
      { status: 500 }
    )
  }
}