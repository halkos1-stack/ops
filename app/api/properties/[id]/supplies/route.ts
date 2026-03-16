import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import {
  SUPPLY_PRESETS,
  SUPPLY_STATUS_OPTIONS,
  getSupplyPresetByCode,
  buildCustomSupplyCode,
} from "@/lib/supply-presets"

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

function toNumberOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function buildCustomSupplyMarker(propertyId: string) {
  return `CUSTOM_SUPPLY:${propertyId}`
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

    const label =
      preset?.checklistLabelEl || buildSupplyChecklistLabel(row.supplyItem.name)

    const description =
      preset
        ? `Κατάσταση αναλωσίμου: ${row.supplyItem.name}`
        : `Κατάσταση custom αναλωσίμου: ${row.supplyItem.name}`

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

  const customMarker = buildCustomSupplyMarker(property.id)

  const customSupplyItems = await prisma.supplyItem.findMany({
    where: {
      notes: customMarker,
    },
    orderBy: {
      name: "asc",
    },
  })

  const builtInCatalog = SUPPLY_PRESETS.map((preset) => {
    const activeRow = property.propertySupplies.find(
      (row) => row.supplyItem.code === preset.code
    )

    return {
      presetKey: preset.key,
      code: preset.code,
      nameEl: preset.nameEl,
      nameEn: preset.nameEn,
      category: preset.category,
      unit: preset.unit,
      minimumStock: preset.minimumStock,
      checklistLabelEl: preset.checklistLabelEl,
      checklistLabelEn: preset.checklistLabelEn,
      isActiveForProperty: Boolean(activeRow),
      propertySupplyId: activeRow?.id || null,
    }
  })

  const customCatalog = customSupplyItems.map((item) => {
    const activeRow = property.propertySupplies.find(
      (row) => row.supplyItemId === item.id
    )

    return {
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      minimumStock: item.minimumStock,
      isActiveForProperty: Boolean(activeRow),
      propertySupplyId: activeRow?.id || null,
    }
  })

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
    builtInCatalog,
    customCatalog,
    supplyTemplate,
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) return access.response

    const auth = access.auth
    const { id } = await context.params

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

    await syncSupplyTemplate(property.id, property.organizationId)

    const payload = await buildResponse(property.id)

    return NextResponse.json(payload)
  } catch (error) {
    console.error("GET /api/properties/[id]/supplies error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης σελίδας αναλωσίμων." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) return access.response

    const auth = access.auth
    const { id } = await context.params
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

    const action = toText(body?.action)

    if (action === "toggle_builtin") {
      const code = toText(body?.code)
      const enabled = Boolean(body?.enabled)

      const preset = SUPPLY_PRESETS.find((row) => row.code === code)

      if (!preset) {
        return NextResponse.json(
          { error: "Μη έγκυρο built-in αναλώσιμο." },
          { status: 400 }
        )
      }

      let supplyItem = await prisma.supplyItem.findUnique({
        where: {
          code: preset.code,
        },
      })

      if (!supplyItem) {
        supplyItem = await prisma.supplyItem.create({
          data: {
            code: preset.code,
            name: preset.nameEl,
            category: preset.category,
            unit: preset.unit,
            minimumStock: preset.minimumStock,
            isActive: true,
          },
        })
      }

      const existing = await prisma.propertySupply.findUnique({
        where: {
          propertyId_supplyItemId: {
            propertyId: property.id,
            supplyItemId: supplyItem.id,
          },
        },
      })

      if (enabled && !existing) {
        await prisma.propertySupply.create({
          data: {
            propertyId: property.id,
            supplyItemId: supplyItem.id,
            currentStock: Math.max(preset.minimumStock + 2, 3),
            targetStock: Math.max(preset.minimumStock + 2, 3),
            reorderThreshold: preset.minimumStock,
            notes: "Ενεργοποιήθηκε από τη διαχείριση λίστας αναλωσίμων.",
            lastUpdatedAt: new Date(),
          },
        })
      }

      if (!enabled && existing) {
        await prisma.propertySupply.delete({
          where: {
            id: existing.id,
          },
        })
      }

      await syncSupplyTemplate(property.id, property.organizationId)
      const payload = await buildResponse(property.id)
      return NextResponse.json(payload)
    }

    if (action === "toggle_custom") {
      const supplyItemId = toText(body?.supplyItemId)
      const enabled = Boolean(body?.enabled)

      if (!supplyItemId) {
        return NextResponse.json(
          { error: "Το supplyItemId είναι υποχρεωτικό." },
          { status: 400 }
        )
      }

      const customMarker = buildCustomSupplyMarker(property.id)

      const supplyItem = await prisma.supplyItem.findFirst({
        where: {
          id: supplyItemId,
          notes: customMarker,
        },
      })

      if (!supplyItem) {
        return NextResponse.json(
          { error: "Το custom αναλώσιμο δεν βρέθηκε." },
          { status: 404 }
        )
      }

      const existing = await prisma.propertySupply.findUnique({
        where: {
          propertyId_supplyItemId: {
            propertyId: property.id,
            supplyItemId: supplyItem.id,
          },
        },
      })

      const minimumStock =
        typeof supplyItem.minimumStock === "number" &&
        Number.isFinite(supplyItem.minimumStock)
          ? supplyItem.minimumStock
          : 1

      if (enabled && !existing) {
        await prisma.propertySupply.create({
          data: {
            propertyId: property.id,
            supplyItemId: supplyItem.id,
            currentStock: Math.max(minimumStock + 2, 3),
            targetStock: Math.max(minimumStock + 2, 3),
            reorderThreshold: minimumStock,
            notes: "Ενεργοποιήθηκε custom αναλώσιμο από τη διαχείριση λίστας.",
            lastUpdatedAt: new Date(),
          },
        })
      }

      if (!enabled && existing) {
        await prisma.propertySupply.delete({
          where: {
            id: existing.id,
          },
        })
      }

      await syncSupplyTemplate(property.id, property.organizationId)
      const payload = await buildResponse(property.id)
      return NextResponse.json(payload)
    }

    if (action === "add_custom") {
      const name = toText(body?.name)
      const category = toText(body?.category) || "custom"
      const unit = toText(body?.unit) || "τεμάχια"
      const minimumStock = toNumberOrNull(body?.minimumStock) ?? 1

      if (!name) {
        return NextResponse.json(
          { error: "Το custom αναλώσιμο απαιτεί όνομα." },
          { status: 400 }
        )
      }

      const customMarker = buildCustomSupplyMarker(property.id)

      const existingByName = await prisma.supplyItem.findFirst({
        where: {
          notes: customMarker,
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      })

      if (existingByName) {
        return NextResponse.json(
          { error: "Υπάρχει ήδη custom αναλώσιμο με αυτό το όνομα." },
          { status: 400 }
        )
      }

      let baseCode = buildCustomSupplyCode(name)
      let code = baseCode
      let counter = 2

      while (
        await prisma.supplyItem.findUnique({
          where: { code },
          select: { id: true },
        })
      ) {
        code = `${baseCode}-${counter}`
        counter += 1
      }

      await prisma.supplyItem.create({
        data: {
          code,
          name,
          category,
          unit,
          minimumStock,
          isActive: true,
          notes: customMarker,
        },
      })

      await syncSupplyTemplate(property.id, property.organizationId)
      const payload = await buildResponse(property.id)
      return NextResponse.json(payload)
    }

    if (action === "sync_template") {
      await syncSupplyTemplate(property.id, property.organizationId)
      const payload = await buildResponse(property.id)
      return NextResponse.json(payload)
    }

    if (action === "update_template_item") {
      const templateItemId = toText(body?.templateItemId)
      const label = toText(body?.label)
      const description = toNullableText(body?.description)
      const isRequired =
        body?.isRequired === undefined ? undefined : Boolean(body.isRequired)
      const requiresPhoto =
        body?.requiresPhoto === undefined ? undefined : Boolean(body.requiresPhoto)
      const sortOrder = toNumberOrNull(body?.sortOrder)

      if (!templateItemId) {
        return NextResponse.json(
          { error: "Το templateItemId είναι υποχρεωτικό." },
          { status: 400 }
        )
      }

      const templateItem = await prisma.propertyChecklistTemplateItem.findUnique({
        where: {
          id: templateItemId,
        },
        include: {
          template: true,
        },
      })

      if (
        !templateItem ||
        templateItem.template.propertyId !== property.id ||
        templateItem.template.templateType !== "supplies"
      ) {
        return NextResponse.json(
          { error: "Το στοιχείο λίστας δεν βρέθηκε." },
          { status: 404 }
        )
      }

      await prisma.propertyChecklistTemplateItem.update({
        where: {
          id: templateItemId,
        },
        data: {
          ...(label ? { label } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(typeof isRequired === "boolean" ? { isRequired } : {}),
          ...(typeof requiresPhoto === "boolean" ? { requiresPhoto } : {}),
          ...(typeof sortOrder === "number" ? { sortOrder } : {}),
        },
      })

      const payload = await buildResponse(property.id)
      return NextResponse.json(payload)
    }

    if (action === "upsert_issue_report_item") {
      const issueType =
        toText(body?.issueType).toLowerCase() === "damage" ? "damage" : "repair"
      const label =
        toText(body?.label) ||
        (issueType === "damage" ? "Αναφορά ζημιάς" : "Αναφορά βλάβης")
      const description =
        toNullableText(body?.description) ||
        (issueType === "damage"
          ? "Καταχώρισε ζημιά που εντόπισες στο ακίνητο."
          : "Καταχώρισε βλάβη ή τεχνικό θέμα που εντόπισες στο ακίνητο.")
      const requiresPhoto = Boolean(body?.requiresPhoto)

      const template = await getOrCreateSupplyTemplate(
        property.id,
        property.organizationId
      )

      const existing = await prisma.propertyChecklistTemplateItem.findFirst({
        where: {
          templateId: template.id,
          category: "issue_report",
          issueTypeOnFail: issueType,
        },
      })

      if (existing) {
        await prisma.propertyChecklistTemplateItem.update({
          where: {
            id: existing.id,
          },
          data: {
            label,
            description,
            itemType: "text",
            isRequired: false,
            requiresPhoto,
            opensIssueOnFail: false,
            issueTypeOnFail: issueType,
            issueSeverityOnFail: "medium",
            category: "issue_report",
            supplyUpdateMode: "none",
            linkedSupplyItemId: null,
            supplyQuantity: null,
          },
        })
      } else {
        const count = await prisma.propertyChecklistTemplateItem.count({
          where: {
            templateId: template.id,
          },
        })

        await prisma.propertyChecklistTemplateItem.create({
          data: {
            templateId: template.id,
            label,
            description,
            itemType: "text",
            isRequired: false,
            sortOrder: (count + 1) * 10,
            category: "issue_report",
            requiresPhoto,
            opensIssueOnFail: false,
            optionsText: null,
            issueTypeOnFail: issueType,
            issueSeverityOnFail: "medium",
            failureValuesText: null,
            linkedSupplyItemId: null,
            supplyUpdateMode: "none",
            supplyQuantity: null,
          },
        })
      }

      const payload = await buildResponse(property.id)
      return NextResponse.json(payload)
    }

    return NextResponse.json(
      { error: "Μη έγκυρη ενέργεια." },
      { status: 400 }
    )
  } catch (error) {
    console.error("POST /api/properties/[id]/supplies error:", error)
    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης διαχείρισης αναλωσίμων." },
      { status: 500 }
    )
  }
}