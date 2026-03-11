import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const templates = await prisma.checklistTemplate.findMany({
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

    const propertyId = body.propertyId?.trim()
    const name = body.name?.trim()
    const taskType = body.taskType?.trim()
    const description = body.description?.trim() || null
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : true
    const items = Array.isArray(body.items) ? body.items : []

    if (!propertyId || !name || !taskType) {
      return NextResponse.json(
        { error: "Ακίνητο, όνομα checklist και τύπος εργασίας είναι υποχρεωτικά." },
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

    const template = await prisma.checklistTemplate.create({
      data: {
        propertyId,
        name,
        taskType,
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
        propertyId: property.id,
        entityType: "checklist_template",
        entityId: template.id,
        action: "created",
        message: `Δημιουργήθηκε checklist "${template.name}" για τύπο εργασίας "${template.taskType}"`,
        actorType: "admin",
        actorName: "System Admin",
        metadata: {
          propertyId: property.id,
          templateId: template.id,
          taskType: template.taskType,
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