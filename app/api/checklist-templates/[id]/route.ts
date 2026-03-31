import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

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

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await req.json()

    const title = toText(body.title || body.name)
    const description = toNullableText(body.description)
    const isActive = toBooleanValue(body.isActive, true)
    const isPrimary = typeof body.isPrimary === "boolean" ? body.isPrimary : undefined
    const templateType = normalizeTemplateType(body.templateType || body.taskType)
    const items = Array.isArray(body.items) ? body.items : []

    const existingTemplate = await prisma.propertyChecklistTemplate.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            organizationId: true,
          },
        },
        items: true,
      },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Η λίστα δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: "Το όνομα της λίστας είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Η λίστα πρέπει να έχει τουλάχιστον ένα στοιχείο." },
        { status: 400 }
      )
    }

    if (isPrimary === true) {
      await prisma.propertyChecklistTemplate.updateMany({
        where: {
          propertyId: existingTemplate.propertyId,
          isPrimary: true,
          NOT: { id },
        },
        data: {
          isPrimary: false,
        },
      })
    }

    await prisma.propertyChecklistTemplateItem.deleteMany({
      where: {
        templateId: id,
      },
    })

    const updatedTemplate = await prisma.propertyChecklistTemplate.update({
      where: { id },
      data: {
        title,
        description,
        isActive,
        templateType,
        ...(typeof isPrimary === "boolean" ? { isPrimary } : {}),
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
        organizationId: existingTemplate.property.organizationId,
        propertyId: existingTemplate.propertyId,
        entityType: "checklist_template",
        entityId: updatedTemplate.id,
        action: "updated",
        message: `Ενημερώθηκε λίστα "${updatedTemplate.title}"`,
        actorType: "admin",
        actorName: "System Admin",
        metadata: {
          templateId: updatedTemplate.id,
          templateType: updatedTemplate.templateType,
          isPrimary: updatedTemplate.isPrimary,
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

    const existingTemplate = await prisma.propertyChecklistTemplate.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            organizationId: true,
          },
        },
      },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Η λίστα δεν βρέθηκε." },
        { status: 404 }
      )
    }

    await prisma.propertyChecklistTemplate.delete({
      where: { id },
    })

    await prisma.activityLog.create({
      data: {
        organizationId: existingTemplate.property.organizationId,
        propertyId: existingTemplate.propertyId,
        entityType: "checklist_template",
        entityId: existingTemplate.id,
        action: "deleted",
        message: `Διαγράφηκε λίστα "${existingTemplate.title}"`,
        actorType: "admin",
        actorName: "System Admin",
        metadata: {
          templateId: existingTemplate.id,
          templateType: existingTemplate.templateType,
          isPrimary: existingTemplate.isPrimary,
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