import { prisma } from "@/lib/prisma"
import { getSupplyPresetByCode, SUPPLY_STATUS_OPTIONS } from "@/lib/supply-presets"

type PrismaLike = typeof prisma

function buildSupplyChecklistLabel(name: string) {
  return `Επαρκεια ${name}`
}

async function getOrCreateSupplyTemplate(
  db: PrismaLike,
  propertyId: string,
  organizationId: string
) {
  const existing = await db.propertyChecklistTemplate.findFirst({
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

  return db.propertyChecklistTemplate.create({
    data: {
      propertyId,
      organizationId,
      title: "Λιστα αναλωσιμων",
      description:
        "Καταγραφη αναλωσιμων και proof για την επιχειρησιακη κατασταση του ακινητου.",
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
  db: PrismaLike
  templateId: string
  issueType: "damage" | "repair"
  label: string
  description: string
  sortOrder: number
}) {
  const existing = await params.db.propertyChecklistTemplateItem.findFirst({
    where: {
      templateId: params.templateId,
      category: "issue_report",
      issueTypeOnFail: params.issueType,
    },
  })

  const data = {
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
  }

  if (existing) {
    return params.db.propertyChecklistTemplateItem.update({
      where: { id: existing.id },
      data,
    })
  }

  return params.db.propertyChecklistTemplateItem.create({
    data: {
      templateId: params.templateId,
      ...data,
    },
  })
}

export async function syncPropertySupplyTemplate(input: {
  propertyId: string
  organizationId: string
  client?: PrismaLike
}) {
  const db = input.client ?? prisma
  const template = await getOrCreateSupplyTemplate(
    db,
    input.propertyId,
    input.organizationId
  )

  const propertySupplies = await db.propertySupply.findMany({
    where: {
      propertyId: input.propertyId,
      isActive: true,
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
  const existingItems = await db.propertyChecklistTemplateItem.findMany({
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
      await db.propertyChecklistTemplateItem.delete({
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
      row.stateMode === "NUMERIC_THRESHOLDS"
        ? `Καταγραψε ποσοτητα για: ${supplyDisplayName}`
        : `Καταγραψε κατασταση για: ${supplyDisplayName}`

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
      supplyUpdateMode:
        row.stateMode === "NUMERIC_THRESHOLDS"
          ? "numeric_thresholds"
          : "direct_state",
      supplyQuantity:
        row.stateMode === "NUMERIC_THRESHOLDS" ? row.fullThreshold ?? null : null,
    }

    if (existing) {
      await db.propertyChecklistTemplateItem.update({
        where: { id: existing.id },
        data,
      })
    } else {
      await db.propertyChecklistTemplateItem.create({
        data: {
          templateId: template.id,
          ...data,
        },
      })
    }

    sortOrder += 10
  }

  await ensureIssueReportItem({
    db,
    templateId: template.id,
    issueType: "damage",
    label: "Αναφορα ζημιας",
    description: "Καταχωρισε οποιαδηποτε ζημια εντοπιστηκε στο ακινητο.",
    sortOrder,
  })

  sortOrder += 10

  await ensureIssueReportItem({
    db,
    templateId: template.id,
    issueType: "repair",
    label: "Αναφορα βλαβης",
    description: "Καταχωρισε οποιαδηποτε βλαβη ή τεχνικο θεμα εντοπιστηκε στο ακινητο.",
    sortOrder,
  })

  return db.propertyChecklistTemplate.findUnique({
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
