import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import { SUPPLY_STATUS_OPTIONS, getSupplyPresetByCode } from "@/lib/supply-presets"
import { refreshPropertyReadinessSnapshot } from "@/lib/properties/readiness-snapshot"

type RouteContext = {
  params: Promise<{
    id: string
    propertySupplyId: string
  }>
}

function toText(value: unknown) {
  return String(value ?? "").trim()
}

function toNullableText(value: unknown) {
  const text = String(value ?? "").trim()
  return text === "" ? null : text
}

function toNumberOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

async function getPropertyBase(propertyId: string) {
  return prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      organizationId: true,
      code: true,
      name: true,
      address: true,
      city: true,
      region: true,
      postalCode: true,
      country: true,
      status: true,
    },
  })
}

function buildSupplyChecklistLabel(name: string) {
  return `Επάρκεια ${name}`
}

async function getOrCreateSupplyTemplate(
  propertyId: string,
  organizationId: string
) {
  const existing = await prisma.propertyChecklistTemplate.findFirst({
    where: {
      propertyId,
      organizationId,
      templateType: "supplies",
      isActive: true,
    },
    include: {
      items: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  if (existing) return existing

  return prisma.propertyChecklistTemplate.create({
    data: {
      propertyId,
      organizationId,
      title: "Λίστα αναλωσίμων",
      description:
        "Δυναμική λίστα αναλωσίμων και αναφοράς ζημιών / βλαβών για το ακίνητο.",
      templateType: "supplies",
      isPrimary: false,
      isActive: true,
    },
    include: {
      items: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  })
}

async function ensureIssueReportItem(params: {
  templateId: string
  issueType: "damage" | "repair"
  label: string
  description: string
  sortOrder: number
}) {
  const existing = await prisma.propertyChecklistTemplateItem.findFirst({
    where: {
      templateId: params.templateId,
      category: "issue_report",
      issueTypeOnFail: params.issueType,
    },
  })

  if (existing) {
    return prisma.propertyChecklistTemplateItem.update({
      where: { id: existing.id },
      data: {
        label: params.label,
        description: params.description,
        itemType: "text",
        isRequired: false,
        sortOrder: params.sortOrder,
        category: "issue_report",
        requiresPhoto: false,
        opensIssueOnFail: false,
        issueTypeOnFail: params.issueType,
        issueSeverityOnFail: "medium",
        failureValuesText: null,
        linkedSupplyItemId: null,
        supplyUpdateMode: "none",
        supplyQuantity: null,
      },
    })
  }

  return prisma.propertyChecklistTemplateItem.create({
    data: {
      templateId: params.templateId,
      label: params.label,
      description: params.description,
      itemType: "text",
      isRequired: false,
      sortOrder: params.sortOrder,
      category: "issue_report",
      requiresPhoto: false,
      opensIssueOnFail: false,
      optionsText: null,
      issueTypeOnFail: params.issueType,
      issueSeverityOnFail: "medium",
      failureValuesText: null,
      linkedSupplyItemId: null,
      supplyUpdateMode: "none",
      supplyQuantity: null,
    },
  })
}

async function syncSupplyTemplate(propertyId: string, organizationId: string) {
  const template = await getOrCreateSupplyTemplate(propertyId, organizationId)

  const propertySupplies = await prisma.propertySupply.findMany({
    where: {
      propertyId,
    },
    include: {
      supplyItem: true,
    },
    orderBy: [
      {
        supplyItem: {
          name: "asc",
        },
      },
    ],
  })

  const activeSupplyIds = new Set(propertySupplies.map((row) => row.supplyItemId))

  const existingItems = await prisma.propertyChecklistTemplateItem.findMany({
    where: {
      templateId: template.id,
    },
    orderBy: {
      sortOrder: "asc",
    },
  })

  const supplyItems = existingItems.filter(
    (item) => String(item.category || "").toLowerCase() === "supplies"
  )

  for (const existing of supplyItems) {
    if (!existing.linkedSupplyItemId) continue
    if (!activeSupplyIds.has(existing.linkedSupplyItemId)) {
      await prisma.propertyChecklistTemplateItem.delete({
        where: { id: existing.id },
      })
    }
  }

  let sortOrder = 10

  for (const row of propertySupplies) {
    const preset = getSupplyPresetByCode(row.supplyItem.code)
    const existing = existingItems.find(
      (item) => item.linkedSupplyItemId === row.supplyItemId
    )

    const supplyDisplayName = row.supplyItem.nameEl ?? row.supplyItem.name

    const label =
      preset?.checklistLabelEl || buildSupplyChecklistLabel(supplyDisplayName)

    const description =
      preset
        ? `Κατάσταση αναλωσίμου: ${supplyDisplayName}`
        : `Κατάσταση custom αναλωσίμου: ${supplyDisplayName}`

    const data = {
      label,
      description,
      itemType: "select",
      isRequired: true,
      sortOrder,
      category: "supplies",
      requiresPhoto: false,
      opensIssueOnFail: false,
      optionsText: SUPPLY_STATUS_OPTIONS.join("\n"),
      issueTypeOnFail: "supplies",
      issueSeverityOnFail: "medium",
      failureValuesText: null,
      linkedSupplyItemId: row.supplyItemId,
      supplyUpdateMode: "status_map",
      supplyQuantity: null,
    }

    if (existing) {
      await prisma.propertyChecklistTemplateItem.update({
        where: { id: existing.id },
        data,
      })
    } else {
      await prisma.propertyChecklistTemplateItem.create({
        data: {
          templateId: template.id,
          ...data,
        },
      })
    }

    sortOrder += 10
  }

  await ensureIssueReportItem({
    templateId: template.id,
    issueType: "damage",
    label: "Αναφορά ζημιάς",
    description:
      "Καταχώρισε ελεύθερα οποιαδήποτε ζημιά εντόπισες στο ακίνητο.",
    sortOrder,
  })

  sortOrder += 10

  await ensureIssueReportItem({
    templateId: template.id,
    issueType: "repair",
    label: "Αναφορά βλάβης",
    description:
      "Καταχώρισε ελεύθερα οποιαδήποτε βλάβη ή τεχνικό θέμα εντόπισες στο ακίνητο.",
    sortOrder,
  })

  return prisma.propertyChecklistTemplate.findUnique({
    where: {
      id: template.id,
    },
    include: {
      items: {
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          supplyItem: true,
        },
      },
    },
  })
}

async function buildResponse(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      organizationId: true,
      code: true,
      name: true,
      address: true,
      city: true,
      region: true,
      postalCode: true,
      country: true,
      status: true,
      propertySupplies: {
        include: {
          supplyItem: true,
        },
        orderBy: [
          {
            supplyItem: {
              name: "asc",
            },
          },
        ],
      },
    },
  })

  if (!property) return null

  const supplyTemplate = await prisma.propertyChecklistTemplate.findFirst({
    where: {
      propertyId,
      organizationId: property.organizationId,
      templateType: "supplies",
      isActive: true,
    },
    include: {
      items: {
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          supplyItem: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return {
    property: {
      id: property.id,
      organizationId: property.organizationId,
      code: property.code,
      name: property.name,
      address: property.address,
      city: property.city,
      region: property.region,
      postalCode: property.postalCode,
      country: property.country,
      status: property.status,
    },
    activeSupplies: property.propertySupplies,
    supplyTemplate,
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) return access.response

    const auth = access.auth
    const { id, propertySupplyId } = await context.params
    const body = await request.json()

    const property = await getPropertyBase(id)

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

    const propertySupply = await prisma.propertySupply.findUnique({
      where: {
        id: propertySupplyId,
      },
      include: {
        supplyItem: true,
      },
    })

    if (!propertySupply || propertySupply.propertyId !== property.id) {
      return NextResponse.json(
        { error: "Το αναλώσιμο του ακινήτου δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const currentStock = toNumberOrNull(body?.currentStock)
    const targetStock = toNumberOrNull(body?.targetStock)
    const reorderThreshold = toNumberOrNull(body?.reorderThreshold)
    const notes = body?.notes !== undefined ? toNullableText(body?.notes) : undefined

    if (
      currentStock !== null &&
      (Number.isNaN(currentStock) || currentStock < 0)
    ) {
      return NextResponse.json(
        { error: "Το τρέχον απόθεμα πρέπει να είναι μη αρνητικός αριθμός." },
        { status: 400 }
      )
    }

    if (
      targetStock !== null &&
      (Number.isNaN(targetStock) || targetStock < 0)
    ) {
      return NextResponse.json(
        { error: "Το απόθεμα στόχος πρέπει να είναι μη αρνητικός αριθμός." },
        { status: 400 }
      )
    }

    if (
      reorderThreshold !== null &&
      (Number.isNaN(reorderThreshold) || reorderThreshold < 0)
    ) {
      return NextResponse.json(
        { error: "Το όριο αναπαραγγελίας πρέπει να είναι μη αρνητικός αριθμός." },
        { status: 400 }
      )
    }

    await prisma.propertySupply.update({
      where: {
        id: propertySupply.id,
      },
      data: {
        ...(currentStock !== null ? { currentStock } : {}),
        ...(targetStock !== null ? { targetStock, targetLevel: targetStock } : {}),
        ...(reorderThreshold !== null
          ? { reorderThreshold, minimumThreshold: reorderThreshold }
          : {}),
        ...(notes !== undefined ? { notes } : {}),
        lastUpdatedAt: new Date(),
      },
    })

    await syncSupplyTemplate(property.id, property.organizationId)

    try {
      await refreshPropertyReadinessSnapshot({
        propertyId: property.id,
        organizationId: property.organizationId,
      })
    } catch (readinessError) {
      console.error(
        "PATCH property supply readiness snapshot refresh error:",
        readinessError
      )
    }

    const payload = await buildResponse(property.id)

    return NextResponse.json(payload)
  } catch (error) {
    console.error(
      "PATCH /api/properties/[id]/supplies/[propertySupplyId] error:",
      error
    )
    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης αναλωσίμου ακινήτου." },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) return access.response

    const auth = access.auth
    const { id, propertySupplyId } = await context.params

    const property = await getPropertyBase(id)

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

    const propertySupply = await prisma.propertySupply.findUnique({
      where: {
        id: propertySupplyId,
      },
    })

    if (!propertySupply || propertySupply.propertyId !== property.id) {
      return NextResponse.json(
        { error: "Το αναλώσιμο του ακινήτου δεν βρέθηκε." },
        { status: 404 }
      )
    }

    await prisma.propertySupply.delete({
      where: {
        id: propertySupply.id,
      },
    })

    await syncSupplyTemplate(property.id, property.organizationId)

    try {
      await refreshPropertyReadinessSnapshot({
        propertyId: property.id,
        organizationId: property.organizationId,
      })
    } catch (readinessError) {
      console.error(
        "DELETE property supply readiness snapshot refresh error:",
        readinessError
      )
    }

    const payload = await buildResponse(property.id)

    return NextResponse.json(payload)
  } catch (error) {
    console.error(
      "DELETE /api/properties/[id]/supplies/[propertySupplyId] error:",
      error
    )
    return NextResponse.json(
      { error: "Αποτυχία αφαίρεσης αναλωσίμου από το ακίνητο." },
      { status: 500 }
    )
  }
}