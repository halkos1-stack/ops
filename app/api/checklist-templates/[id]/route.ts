import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await req.json()

    const name = body.name?.trim()
    const taskType = body.taskType?.trim()
    const description = body.description?.trim() || null
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : true
    const items = Array.isArray(body.items) ? body.items : []

    const existingTemplate = await prisma.checklistTemplate.findUnique({
      where: { id },
      include: {
        property: true,
        items: true,
      },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Η checklist δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!name || !taskType) {
      return NextResponse.json(
        { error: "Όνομα checklist και τύπος εργασίας είναι υποχρεωτικά." },
        { status: 400 }
      )
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Η checklist πρέπει να έχει τουλάχιστον ένα βήμα." },
        { status: 400 }
      )
    }

    await prisma.checklistTemplateItem.deleteMany({
      where: {
        templateId: id,
      },
    })

    const updatedTemplate = await prisma.checklistTemplate.update({
      where: { id },
      data: {
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
        propertyId: existingTemplate.propertyId,
        entityType: "checklist_template",
        entityId: updatedTemplate.id,
        action: "updated",
        message: `Ενημερώθηκε checklist "${updatedTemplate.name}"`,
        actorType: "admin",
        actorName: "System Admin",
        metadata: {
          templateId: updatedTemplate.id,
        },
      },
    })

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error("Update checklist template error:", error)

    return NextResponse.json(
      { error: "Failed to update checklist template" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const existingTemplate = await prisma.checklistTemplate.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Η checklist δεν βρέθηκε." },
        { status: 404 }
      )
    }

    await prisma.checklistTemplate.delete({
      where: { id },
    })

    await prisma.activityLog.create({
      data: {
        propertyId: existingTemplate.propertyId,
        entityType: "checklist_template",
        entityId: existingTemplate.id,
        action: "deleted",
        message: `Διαγράφηκε checklist`,
        actorType: "admin",
        actorName: "System Admin",
        metadata: {
          templateId: existingTemplate.id,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete checklist template error:", error)

    return NextResponse.json(
      { error: "Failed to delete checklist template" },
      { status: 500 }
    )
  }
}