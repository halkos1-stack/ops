import { prisma } from "@/lib/prisma"
import { getSupplyPresetByCode, SUPPLY_STATUS_OPTIONS } from "@/lib/supply-presets"

type PrismaLike = typeof prisma

function buildSupplyChecklistLabel(name: string) {
  return `Ξ•Ο€Ξ±ΟΞΊΞµΞΉΞ± ${name}`
}

function buildSupplyChecklistDescription(name: string) {
  return `Observed supply proof / state for: ${name}`
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
      title: "Ξ›ΞΉΟƒΟ„Ξ± Ξ±Ξ½Ξ±Ξ»Ο‰ΟƒΞΉΞΌΟ‰Ξ½",
      description:
        "ΞΞ±Ο„Ξ±Ξ³ΟΞ±Ο†Ξ· Ξ±Ξ½Ξ±Ξ»Ο‰ΟƒΞΉΞΌΟ‰Ξ½ ΞΊΞ±ΞΉ proof Ξ³ΞΉΞ± Ο„Ξ·Ξ½ ΞµΟ€ΞΉΟ‡ΞµΞΉΟΞ·ΟƒΞΉΞ±ΞΊΞ· ΞΊΞ±Ο„Ξ±ΟƒΟ„Ξ±ΟƒΞ· Ο„ΞΏΟ… Ξ±ΞΊΞΉΞ½Ξ·Ο„ΞΏΟ….",
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
    const description = buildSupplyChecklistDescription(supplyDisplayName)

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
      supplyUpdateMode: "none",
      supplyQuantity: null,
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
    label: "Ξ‘Ξ½Ξ±Ο†ΞΏΟΞ± Ξ¶Ξ·ΞΌΞΉΞ±Ο‚",
    description: "ΞΞ±Ο„Ξ±Ο‡Ο‰ΟΞΉΟƒΞµ ΞΏΟ€ΞΏΞΉΞ±Ξ΄Ξ·Ο€ΞΏΟ„Ξµ Ξ¶Ξ·ΞΌΞΉΞ± ΞµΞ½Ο„ΞΏΟ€ΞΉΟƒΟ„Ξ·ΞΊΞµ ΟƒΟ„ΞΏ Ξ±ΞΊΞΉΞ½Ξ·Ο„ΞΏ.",
    sortOrder,
  })

  sortOrder += 10

  await ensureIssueReportItem({
    db,
    templateId: template.id,
    issueType: "repair",
    label: "Ξ‘Ξ½Ξ±Ο†ΞΏΟΞ± Ξ²Ξ»Ξ±Ξ²Ξ·Ο‚",
    description: "ΞΞ±Ο„Ξ±Ο‡Ο‰ΟΞΉΟƒΞµ ΞΏΟ€ΞΏΞΉΞ±Ξ΄Ξ·Ο€ΞΏΟ„Ξµ Ξ²Ξ»Ξ±Ξ²Ξ· Ξ® Ο„ΞµΟ‡Ξ½ΞΉΞΊΞΏ ΞΈΞµΞΌΞ± ΞµΞ½Ο„ΞΏΟ€ΞΉΟƒΟ„Ξ·ΞΊΞµ ΟƒΟ„ΞΏ Ξ±ΞΊΞΉΞ½Ξ·Ο„ΞΏ.",
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
