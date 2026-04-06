import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import {
  filterCanonicalOperationalTasks,
  getOperationalTaskValidity,
} from "@/lib/tasks/ops-task-contract"
import {
  buildPropertyConditionSnapshot,
  type RawPropertyConditionRecord,
} from "@/lib/readiness/property-condition-mappers"

type AccessAuth = {
  systemRole?: "SUPER_ADMIN" | "USER"
  organizationId?: string | null
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toNullableTime(value: unknown) {
  const text = toNullableString(value)
  if (!text) return null

  const normalized = text.slice(0, 5)
  const isValid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized)

  if (!isValid) return null
  return normalized
}

function toOptionalDate(value: unknown) {
  const text = toNullableString(value)
  if (!text) return null

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null

  return date
}

function toRequiredDate(value: unknown) {
  const text = toNullableString(value)
  if (!text) return null

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null

  return date
}

function startOfDay(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function endOfDay(value: string) {
  const date = new Date(`${value}T23:59:59.999`)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function normalizeConditionType(value: unknown): "supply" | "issue" | "damage" {
  if (value === "supply" || value === "issue" || value === "damage") {
    return value
  }

  return "issue"
}

function normalizeConditionStatus(
  value: unknown
): "open" | "monitoring" | "resolved" | "dismissed" {
  if (
    value === "open" ||
    value === "monitoring" ||
    value === "resolved" ||
    value === "dismissed"
  ) {
    return value
  }

  return "open"
}

function normalizeConditionBlockingStatus(
  value: unknown
): "blocking" | "non_blocking" | "warning" {
  if (
    value === "blocking" ||
    value === "non_blocking" ||
    value === "warning"
  ) {
    return value
  }

  return "warning"
}

function normalizeConditionSeverity(
  value: unknown
): "low" | "medium" | "high" | "critical" {
  if (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical"
  ) {
    return value
  }

  return "medium"
}

function normalizeConditionManagerDecision(
  value: unknown
):
  | "allow_with_issue"
  | "block_until_resolved"
  | "monitor"
  | "resolved"
  | "dismissed"
  | null {
  if (
    value === "allow_with_issue" ||
    value === "block_until_resolved" ||
    value === "monitor" ||
    value === "resolved" ||
    value === "dismissed"
  ) {
    return value
  }

  return null
}

function mapDbConditionToRawRecord(condition: {
  id: string
  propertyId: string
  taskId: string | null
  bookingId: string | null
  propertySupplyId: string | null
  mergeKey: string | null
  title: string
  description: string | null
  sourceType: string
  sourceLabel: string | null
  sourceItemId: string | null
  sourceItemLabel: string | null
  sourceRunId: string | null
  sourceAnswerId: string | null
  conditionType: string
  status: string
  blockingStatus: string
  severity: string
  managerDecision: string | null
  managerNotes: string | null
  createdAt: Date
  updatedAt: Date
  resolvedAt: Date | null
  dismissedAt: Date | null
}): RawPropertyConditionRecord {
  return {
    id: condition.id,
    propertyId: condition.propertyId,
    title: condition.title,
    code: toNullableString(condition.sourceLabel),
    itemKey: toNullableString(condition.sourceItemId),
    itemLabel: toNullableString(condition.sourceItemLabel),
    notes:
      toNullableString(condition.managerNotes) ??
      toNullableString(condition.description),
    conditionType: normalizeConditionType(condition.conditionType),
    status: normalizeConditionStatus(condition.status),
    blockingStatus: normalizeConditionBlockingStatus(condition.blockingStatus),
    severity: normalizeConditionSeverity(condition.severity),
    managerDecision: normalizeConditionManagerDecision(
      condition.managerDecision
    ),
    sourceType: toNullableString(condition.sourceType),
    sourceTaskId: condition.taskId,
    sourceChecklistRunId: toNullableString(condition.sourceRunId),
    sourceChecklistAnswerId: toNullableString(condition.sourceAnswerId),
    createdAt: condition.createdAt,
    updatedAt: condition.updatedAt,
    resolvedAt: condition.resolvedAt,
    dismissedAt: condition.dismissedAt,
  }
}

function buildTenantWhere(auth: AccessAuth): Prisma.TaskWhereInput {
  if (auth.systemRole === "SUPER_ADMIN") {
    return {}
  }

  if (auth.organizationId) {
    return {
      organizationId: auth.organizationId,
    }
  }

  return {
    organizationId: "__no_results__",
  }
}

function buildTaskWhere(
  auth: AccessAuth,
  req: NextRequest
): Prisma.TaskWhereInput {
  const searchParams = req.nextUrl.searchParams
  const where: Prisma.TaskWhereInput = {
    ...buildTenantWhere(auth),
  }

  const propertyId = searchParams.get("propertyId")?.trim()
  const bookingId = searchParams.get("bookingId")?.trim()
  const openOnly = searchParams.get("openOnly") === "true"
  const status = searchParams.get("status")?.trim()
  const dateFrom = searchParams.get("dateFrom")?.trim()
  const dateTo = searchParams.get("dateTo")?.trim()

  if (propertyId) {
    where.propertyId = propertyId
  }

  if (bookingId) {
    where.bookingId = bookingId
  }

  if (status) {
    where.status = status
  } else if (openOnly) {
    where.status = {
      in: [
        "new",
        "pending",
        "assigned",
        "waiting_acceptance",
        "accepted",
        "in_progress",
      ],
    }
  }

  if (dateFrom || dateTo) {
    const scheduledDate: Prisma.DateTimeFilter = {}

    if (dateFrom) {
      const from = startOfDay(dateFrom)
      if (from) scheduledDate.gte = from
    }

    if (dateTo) {
      const to = endOfDay(dateTo)
      if (to) scheduledDate.lte = to
    }

    where.scheduledDate = scheduledDate
  }

  return where
}

async function findPrimaryCleaningTemplate(
  organizationId: string,
  propertyId: string
) {
  return prisma.propertyChecklistTemplate.findFirst({
    where: {
      organizationId,
      propertyId,
      isPrimary: true,
      isActive: true,
      NOT: {
        templateType: "supplies",
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      templateType: true,
      isPrimary: true,
      isActive: true,
      items: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          label: true,
          labelEn: true,
          description: true,
          itemType: true,
          isRequired: true,
          sortOrder: true,
          category: true,
          requiresPhoto: true,
          opensIssueOnFail: true,
          optionsText: true,
          issueTypeOnFail: true,
          issueSeverityOnFail: true,
          failureValuesText: true,
          linkedSupplyItemId: true,
          supplyUpdateMode: true,
          supplyQuantity: true,
          supplyItem: {
            select: {
              id: true,
              name: true,
              nameEl: true,
              nameEn: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })
}

async function findPrimaryIssueTemplate(
  organizationId: string,
  propertyId: string
) {
  return prisma.propertyIssueTemplate.findFirst({
    where: {
      organizationId,
      propertyId,
      isPrimary: true,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      description: true,
      isPrimary: true,
      isActive: true,
      items: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          label: true,
          labelEn: true,
          description: true,
          sortOrder: true,
          itemType: true,
          isRequired: true,
          allowsIssue: true,
          allowsDamage: true,
          defaultIssueType: true,
          defaultSeverity: true,
          requiresPhoto: true,
          affectsHostingByDefault: true,
          urgentByDefault: true,
          locationHint: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })
}

async function countActivePropertySupplies(propertyId: string) {
  return prisma.propertySupply.count({
    where: {
      propertyId,
      isActive: true,
    },
  })
}

async function getActivePropertySupplies(propertyId: string) {
  return prisma.propertySupply.findMany({
    where: {
      propertyId,
      isActive: true,
    },
    orderBy: [
      {
        isCritical: "desc",
      },
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: {
      id: true,
      fillLevel: true,
      currentStock: true,
      targetStock: true,
      reorderThreshold: true,
      targetLevel: true,
      minimumThreshold: true,
      trackingMode: true,
      isCritical: true,
      warningThreshold: true,
      notes: true,
      supplyItemId: true,
      supplyItem: {
        select: {
          id: true,
          code: true,
          name: true,
          nameEl: true,
          nameEn: true,
          category: true,
          unit: true,
        },
      },
    },
  })
}

async function syncTaskChecklistRun(params: {
  taskId: string
  organizationId: string
  propertyId: string
  sendCleaningChecklist: boolean
}) {
  const { taskId, organizationId, propertyId, sendCleaningChecklist } = params

  const existingRun = await prisma.taskChecklistRun.findUnique({
    where: {
      taskId,
    },
    include: {
      items: {
        select: {
          id: true,
          propertyTemplateItemId: true,
        },
      },
    },
  })

  if (!sendCleaningChecklist) {
    if (existingRun) {
      await prisma.taskChecklistRun.delete({
        where: {
          taskId,
        },
      })
    }

    return null
  }

  const primaryTemplate = await findPrimaryCleaningTemplate(
    organizationId,
    propertyId
  )

  if (!primaryTemplate) {
    if (existingRun) {
      await prisma.taskChecklistRun.delete({
        where: {
          taskId,
        },
      })
    }

    return null
  }

  const run =
    existingRun ||
    (await prisma.taskChecklistRun.create({
      data: {
        taskId,
        templateId: primaryTemplate.id,
        sourceTemplateTitle: primaryTemplate.title,
        sourceTemplateDescription: primaryTemplate.description,
        templateType: primaryTemplate.templateType ?? "main",
        status: "pending",
        isCustomized: false,
      },
      include: {
        items: {
          select: {
            id: true,
            propertyTemplateItemId: true,
          },
        },
      },
    }))

  const templateChanged = run.templateId !== primaryTemplate.id

  if (templateChanged) {
    await prisma.taskChecklistRun.update({
      where: {
        taskId,
      },
      data: {
        templateId: primaryTemplate.id,
        sourceTemplateTitle: primaryTemplate.title,
        sourceTemplateDescription: primaryTemplate.description,
        templateType: primaryTemplate.templateType ?? "main",
        status: "pending",
        startedAt: null,
        completedAt: null,
        isCustomized: false,
      },
    })

    await prisma.taskChecklistAnswer.deleteMany({
      where: {
        checklistRunId: run.id,
      },
    })

    await prisma.taskChecklistRunItem.deleteMany({
      where: {
        checklistRunId: run.id,
      },
    })
  } else {
    await prisma.taskChecklistRun.update({
      where: {
        taskId,
      },
      data: {
        sourceTemplateTitle: primaryTemplate.title,
        sourceTemplateDescription: primaryTemplate.description,
        templateType: primaryTemplate.templateType ?? "main",
      },
    })
  }

  const currentItems = templateChanged
    ? []
    : await prisma.taskChecklistRunItem.findMany({
        where: {
          checklistRunId: run.id,
        },
        select: {
          id: true,
          propertyTemplateItemId: true,
        },
      })

  const existingMap = new Map(
    currentItems
      .filter((item) => item.propertyTemplateItemId)
      .map((item) => [item.propertyTemplateItemId as string, item])
  )

  const templateItemIds = new Set(primaryTemplate.items.map((item) => item.id))

  for (const item of primaryTemplate.items) {
    const existingItem = existingMap.get(item.id)

    if (!existingItem) {
      await prisma.taskChecklistRunItem.create({
        data: {
          checklistRunId: run.id,
          propertyTemplateItemId: item.id,
          label: item.label,
          labelEn: item.labelEn,
          description: item.description,
          itemType: item.itemType,
          isRequired: item.isRequired,
          sortOrder: item.sortOrder,
          category: item.category ?? "inspection",
          requiresPhoto: item.requiresPhoto,
          opensIssueOnFail: item.opensIssueOnFail,
          optionsText: item.optionsText,
          issueTypeOnFail: item.issueTypeOnFail,
          issueSeverityOnFail: item.issueSeverityOnFail,
          failureValuesText: item.failureValuesText,
          linkedSupplyItemId: item.linkedSupplyItemId,
          linkedSupplyItemName: item.supplyItem?.name ?? null,
          linkedSupplyItemNameEl: item.supplyItem?.nameEl ?? null,
          linkedSupplyItemNameEn: item.supplyItem?.nameEn ?? null,
          supplyUpdateMode: item.supplyUpdateMode,
          supplyQuantity: item.supplyQuantity,
        },
      })
    }
  }

  for (const existingItem of currentItems) {
    if (
      existingItem.propertyTemplateItemId &&
      !templateItemIds.has(existingItem.propertyTemplateItemId)
    ) {
      await prisma.taskChecklistAnswer.deleteMany({
        where: {
          runItemId: existingItem.id,
        },
      })

      await prisma.taskChecklistRunItem.delete({
        where: {
          id: existingItem.id,
        },
      })
    }
  }

  return prisma.taskChecklistRun.findUnique({
    where: {
      taskId,
    },
    include: {
      template: {
        select: {
          id: true,
          title: true,
          templateType: true,
          isPrimary: true,
        },
      },
      items: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      answers: {
        select: {
          id: true,
          runItemId: true,
          issueCreated: true,
          createdAt: true,
        },
      },
    },
  })
}

async function syncTaskSupplyRun(params: {
  taskId: string
  propertyId: string
  sendSuppliesChecklist: boolean
}) {
  const { taskId, propertyId, sendSuppliesChecklist } = params

  const existingRun = await prisma.taskSupplyRun.findUnique({
    where: {
      taskId,
    },
    include: {
      items: {
        select: {
          id: true,
          propertySupplyId: true,
        },
      },
      answers: {
        select: {
          id: true,
          runItemId: true,
          propertySupplyId: true,
        },
      },
    },
  })

  if (!sendSuppliesChecklist) {
    if (existingRun) {
      await prisma.taskSupplyRun.delete({
        where: {
          taskId,
        },
      })
    }

    return null
  }

  const propertySupplies = await getActivePropertySupplies(propertyId)

  if (propertySupplies.length === 0) {
    if (existingRun) {
      await prisma.taskSupplyRun.delete({
        where: {
          taskId,
        },
      })
    }

    return null
  }

  const run =
    existingRun ||
    (await prisma.taskSupplyRun.create({
      data: {
        taskId,
        status: "pending",
        isCustomized: false,
      },
      include: {
        items: {
          select: {
            id: true,
            propertySupplyId: true,
          },
        },
        answers: {
          select: {
            id: true,
            runItemId: true,
            propertySupplyId: true,
          },
        },
      },
    }))

  const existingItems = await prisma.taskSupplyRunItem.findMany({
    where: {
      taskSupplyRunId: run.id,
    },
    select: {
      id: true,
      propertySupplyId: true,
      supplyItemId: true,
    },
  })

  const existingItemMap = new Map(
    existingItems
      .filter((item) => item.propertySupplyId)
      .map((item) => [item.propertySupplyId as string, item])
  )

  const activePropertySupplyIds = new Set(propertySupplies.map((row) => row.id))

  for (let index = 0; index < propertySupplies.length; index += 1) {
    const propertySupply = propertySupplies[index]
    const existingItem = existingItemMap.get(propertySupply.id)

    if (!existingItem) {
      await prisma.taskSupplyRunItem.create({
        data: {
          taskSupplyRunId: run.id,
          propertySupplyId: propertySupply.id,
          supplyItemId: propertySupply.supplyItemId,
          propertySupplyCode: propertySupply.supplyItem?.code ?? null,
          label:
            propertySupply.supplyItem?.nameEl ||
            propertySupply.supplyItem?.name ||
            "Αναλώσιμο",
          labelEn: propertySupply.supplyItem?.nameEn ?? null,
          category: propertySupply.supplyItem?.category ?? null,
          unit: propertySupply.supplyItem?.unit ?? null,
          fillLevel: propertySupply.fillLevel,
          currentStock: propertySupply.currentStock,
          targetStock: propertySupply.targetStock,
          reorderThreshold: propertySupply.reorderThreshold,
          targetLevel: propertySupply.targetLevel,
          minimumThreshold: propertySupply.minimumThreshold,
          trackingMode: propertySupply.trackingMode,
          isCritical: propertySupply.isCritical,
          warningThreshold: propertySupply.warningThreshold,
          sortOrder: index,
          isRequired: true,
          notes: propertySupply.notes,
        },
      })
    } else {
      await prisma.taskSupplyRunItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          supplyItemId: propertySupply.supplyItemId,
          propertySupplyCode: propertySupply.supplyItem?.code ?? null,
          label:
            propertySupply.supplyItem?.nameEl ||
            propertySupply.supplyItem?.name ||
            "Αναλώσιμο",
          labelEn: propertySupply.supplyItem?.nameEn ?? null,
          category: propertySupply.supplyItem?.category ?? null,
          unit: propertySupply.supplyItem?.unit ?? null,
          fillLevel: propertySupply.fillLevel,
          currentStock: propertySupply.currentStock,
          targetStock: propertySupply.targetStock,
          reorderThreshold: propertySupply.reorderThreshold,
          targetLevel: propertySupply.targetLevel,
          minimumThreshold: propertySupply.minimumThreshold,
          trackingMode: propertySupply.trackingMode,
          isCritical: propertySupply.isCritical,
          warningThreshold: propertySupply.warningThreshold,
          sortOrder: index,
          isRequired: true,
          notes: propertySupply.notes,
        },
      })
    }
  }

  for (const item of existingItems) {
    if (item.propertySupplyId && !activePropertySupplyIds.has(item.propertySupplyId)) {
      await prisma.taskSupplyAnswer.deleteMany({
        where: {
          runItemId: item.id,
        },
      })

      await prisma.taskSupplyRunItem.delete({
        where: {
          id: item.id,
        },
      })
    }
  }

  return prisma.taskSupplyRun.findUnique({
    where: {
      taskId,
    },
    include: {
      items: {
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          propertySupply: {
            include: {
              supplyItem: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  nameEl: true,
                  nameEn: true,
                  category: true,
                  unit: true,
                  minimumStock: true,
                },
              },
            },
          },
          supplyItem: {
            select: {
              id: true,
              code: true,
              name: true,
              nameEl: true,
              nameEn: true,
              category: true,
              unit: true,
              minimumStock: true,
            },
          },
        },
      },
      answers: {
        include: {
          runItem: true,
          propertySupply: {
            include: {
              supplyItem: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  nameEl: true,
                  nameEn: true,
                  category: true,
                  unit: true,
                  minimumStock: true,
                },
              },
            },
          },
        },
      },
    },
  })
}

async function syncTaskIssueRun(params: {
  taskId: string
  organizationId: string
  propertyId: string
  sendIssuesChecklist: boolean
}) {
  const { taskId, organizationId, propertyId, sendIssuesChecklist } = params

  const existingRun = await prisma.taskIssueRun.findUnique({
    where: {
      taskId,
    },
    include: {
      items: {
        select: {
          id: true,
          propertyTemplateItemId: true,
        },
      },
    },
  })

  if (!sendIssuesChecklist) {
    if (existingRun) {
      await prisma.taskIssueRun.delete({
        where: {
          taskId,
        },
      })
    }

    return null
  }

  const primaryTemplate = await findPrimaryIssueTemplate(
    organizationId,
    propertyId
  )

  if (!primaryTemplate) {
    if (existingRun) {
      await prisma.taskIssueRun.delete({
        where: {
          taskId,
        },
      })
    }

    return null
  }

  const run =
    existingRun ||
    (await prisma.taskIssueRun.create({
      data: {
        taskId,
        templateId: primaryTemplate.id,
        sourceTemplateTitle: primaryTemplate.title,
        sourceTemplateDescription: primaryTemplate.description,
        status: "pending",
        isCustomized: false,
      },
      include: {
        items: {
          select: {
            id: true,
            propertyTemplateItemId: true,
          },
        },
      },
    }))

  const templateChanged = run.templateId !== primaryTemplate.id

  if (templateChanged) {
    await prisma.taskIssueRun.update({
      where: {
        taskId,
      },
      data: {
        templateId: primaryTemplate.id,
        sourceTemplateTitle: primaryTemplate.title,
        sourceTemplateDescription: primaryTemplate.description,
        status: "pending",
        startedAt: null,
        completedAt: null,
        isCustomized: false,
      },
    })

    await prisma.taskIssueAnswer.deleteMany({
      where: {
        issueRunId: run.id,
      },
    })

    await prisma.taskIssueRunItem.deleteMany({
      where: {
        issueRunId: run.id,
      },
    })
  } else {
    await prisma.taskIssueRun.update({
      where: {
        taskId,
      },
      data: {
        sourceTemplateTitle: primaryTemplate.title,
        sourceTemplateDescription: primaryTemplate.description,
      },
    })
  }

  const currentItems = templateChanged
    ? []
    : await prisma.taskIssueRunItem.findMany({
        where: {
          issueRunId: run.id,
        },
        select: {
          id: true,
          propertyTemplateItemId: true,
        },
      })

  const existingMap = new Map(
    currentItems
      .filter((item) => item.propertyTemplateItemId)
      .map((item) => [item.propertyTemplateItemId as string, item])
  )

  const templateItemIds = new Set(primaryTemplate.items.map((item) => item.id))

  for (const item of primaryTemplate.items) {
    const existingItem = existingMap.get(item.id)

    if (!existingItem) {
      await prisma.taskIssueRunItem.create({
        data: {
          issueRunId: run.id,
          propertyTemplateItemId: item.id,
          label: item.label,
          labelEn: item.labelEn,
          description: item.description,
          sortOrder: item.sortOrder,
          itemType: item.itemType,
          isRequired: item.isRequired,
          allowsIssue: item.allowsIssue,
          allowsDamage: item.allowsDamage,
          defaultIssueType: item.defaultIssueType,
          defaultSeverity: item.defaultSeverity,
          requiresPhoto: item.requiresPhoto,
          affectsHostingByDefault: item.affectsHostingByDefault,
          urgentByDefault: item.urgentByDefault,
          locationHint: item.locationHint,
        },
      })
    }
  }

  for (const existingItem of currentItems) {
    if (
      existingItem.propertyTemplateItemId &&
      !templateItemIds.has(existingItem.propertyTemplateItemId)
    ) {
      await prisma.taskIssueAnswer.deleteMany({
        where: {
          runItemId: existingItem.id,
        },
      })

      await prisma.taskIssueRunItem.delete({
        where: {
          id: existingItem.id,
        },
      })
    }
  }

  return prisma.taskIssueRun.findUnique({
    where: {
      taskId,
    },
    include: {
      template: {
        select: {
          id: true,
          title: true,
          isPrimary: true,
          isActive: true,
        },
      },
      items: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      answers: {
        select: {
          id: true,
          runItemId: true,
          createdIssueId: true,
          createdAt: true,
        },
      },
    },
  })
}

function buildTaskOpenConditionsSummary(rawConditions: RawPropertyConditionRecord[]) {
  const snapshot = buildPropertyConditionSnapshot(rawConditions)

  return {
    summary: snapshot.summary,
    reasons: snapshot.reasons,
    active: snapshot.buckets.active,
    blocking: snapshot.buckets.blocking,
    warning: snapshot.buckets.warning,
    monitoring: snapshot.buckets.monitoring,
  }
}

const taskDetailsInclude = {
  organization: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  property: {
    select: {
      id: true,
      code: true,
      name: true,
      city: true,
      region: true,
      status: true,
      readinessStatus: true,
      readinessUpdatedAt: true,
      readinessReasonsText: true,
      nextCheckInAt: true,
      openConditionCount: true,
      openBlockingConditionCount: true,
      openWarningConditionCount: true,
      propertySupplies: {
        include: {
          supplyItem: true,
        },
      },
    },
  },
  booking: {
    select: {
      id: true,
      guestName: true,
      sourcePlatform: true,
      checkInDate: true,
      checkOutDate: true,
      status: true,
    },
  },
  assignments: {
    orderBy: {
      assignedAt: "desc" as const,
    },
    include: {
      partner: {
        select: {
          id: true,
          code: true,
          name: true,
          email: true,
          phone: true,
          specialty: true,
          status: true,
        },
      },
    },
  },
  checklistRun: {
    include: {
      template: {
        select: {
          id: true,
          title: true,
          templateType: true,
          isPrimary: true,
        },
      },
      items: {
        orderBy: {
          sortOrder: "asc" as const,
        },
      },
      answers: {
        select: {
          id: true,
          runItemId: true,
          issueCreated: true,
          createdAt: true,
        },
      },
    },
  },
  supplyRun: {
    include: {
      items: {
        orderBy: {
          sortOrder: "asc" as const,
        },
        include: {
          propertySupply: {
            include: {
              supplyItem: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  nameEl: true,
                  nameEn: true,
                  category: true,
                  unit: true,
                  minimumStock: true,
                },
              },
            },
          },
          supplyItem: {
            select: {
              id: true,
              code: true,
              name: true,
              nameEl: true,
              nameEn: true,
              category: true,
              unit: true,
              minimumStock: true,
            },
          },
        },
      },
      answers: {
        include: {
          runItem: true,
          propertySupply: {
            include: {
              supplyItem: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  nameEl: true,
                  nameEn: true,
                  category: true,
                  unit: true,
                  minimumStock: true,
                },
              },
            },
          },
        },
      },
    },
  },
  issueRun: {
    include: {
      template: {
        select: {
          id: true,
          title: true,
          isPrimary: true,
          isActive: true,
        },
      },
      items: {
        orderBy: {
          sortOrder: "asc" as const,
        },
      },
      answers: {
        select: {
          id: true,
          runItemId: true,
          createdIssueId: true,
          createdAt: true,
        },
      },
    },
  },
  propertyConditions: {
    where: {
      status: {
        in: ["OPEN", "MONITORING"],
      },
    },
    select: {
      id: true,
      propertyId: true,
      taskId: true,
      bookingId: true,
      propertySupplyId: true,
      mergeKey: true,
      sourceType: true,
      sourceLabel: true,
      sourceItemId: true,
      sourceItemLabel: true,
      sourceRunId: true,
      sourceAnswerId: true,
      conditionType: true,
      title: true,
      description: true,
      status: true,
      blockingStatus: true,
      severity: true,
      managerDecision: true,
      managerNotes: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      dismissedAt: true,
    },
    orderBy: [{ updatedAt: "desc" as const }, { createdAt: "desc" as const }],
  },
  issues: {
    select: {
      id: true,
      issueType: true,
      title: true,
      severity: true,
      status: true,
      createdAt: true,
    },
  },
  taskPhotos: {
    select: {
      id: true,
      category: true,
      fileUrl: true,
      fileName: true,
      uploadedAt: true,
    },
  },
  events: {
    select: {
      id: true,
      title: true,
      eventType: true,
      status: true,
      startAt: true,
      endAt: true,
      createdAt: true,
    },
  },
} satisfies Prisma.TaskInclude

function shapeTaskForResponse(task: Prisma.TaskGetPayload<{ include: typeof taskDetailsInclude }>) {
  const rawConditions = safeArray(task.propertyConditions).map((condition) =>
    mapDbConditionToRawRecord({
      id: condition.id,
      propertyId: condition.propertyId,
      taskId: condition.taskId,
      bookingId: condition.bookingId,
      propertySupplyId: condition.propertySupplyId,
      mergeKey: condition.mergeKey,
      title: condition.title,
      description: condition.description,
      sourceType: condition.sourceType,
      sourceLabel: condition.sourceLabel,
      sourceItemId: condition.sourceItemId,
      sourceItemLabel: condition.sourceItemLabel,
      sourceRunId: condition.sourceRunId,
      sourceAnswerId: condition.sourceAnswerId,
      conditionType: String(condition.conditionType).toLowerCase(),
      status: String(condition.status).toLowerCase(),
      blockingStatus: String(condition.blockingStatus).toLowerCase(),
      severity: String(condition.severity).toLowerCase(),
      managerDecision: condition.managerDecision
        ? String(condition.managerDecision).toLowerCase()
        : null,
      managerNotes: condition.managerNotes,
      createdAt: condition.createdAt,
      updatedAt: condition.updatedAt,
      resolvedAt: condition.resolvedAt,
      dismissedAt: condition.dismissedAt,
    })
  )

  return {
    ...task,
    opsValidity: getOperationalTaskValidity(task),
    latestAssignment: task.assignments[0] ?? null,
    cleaningChecklistRun: task.checklistRun,
    suppliesChecklistRun: task.supplyRun,
    issuesChecklistRun: task.issueRun,
    propertyConditionsSummary: buildTaskOpenConditionsSummary(rawConditions),
  }
}

export async function GET(req: NextRequest) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const where = buildTaskWhere(access.auth, req)

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
      include: taskDetailsInclude,
    })

    const includeInvalidTasks =
      req.nextUrl.searchParams.get("view") === "audit" ||
      req.nextUrl.searchParams.get("includeInvalid") === "true"
    const invalidOnly = req.nextUrl.searchParams.get("invalidOnly") === "true"
    const shapedTasks = tasks.map(shapeTaskForResponse)
    const canonicalTasks = filterCanonicalOperationalTasks(shapedTasks)

    if (invalidOnly) {
      return NextResponse.json(
        shapedTasks.filter((task) => task.opsValidity.isCanonicalOperational !== true)
      )
    }

    if (includeInvalidTasks) {
      return NextResponse.json(shapedTasks)
    }

    return NextResponse.json(canonicalTasks)
  } catch (error) {
    console.error("Tasks GET error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης εργασιών." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const body = await req.json()
    const auth = access.auth

    const organizationId =
      toNullableString(body.organizationId) || auth.organizationId || null

    if (!organizationId) {
      return NextResponse.json(
        { error: "Λείπει organizationId για δημιουργία εργασίας." },
        { status: 400 }
      )
    }

    if (!canAccessOrganization(auth, organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχεις πρόσβαση σε αυτόν τον οργανισμό." },
        { status: 403 }
      )
    }

    const propertyId = String(body.propertyId || "").trim()
    const bookingId = toNullableString(body.bookingId)
    const taskSource = (toNullableString(body.source) || "manual").toLowerCase()
    const title = String(body.title || "").trim()
    const taskType = String(body.taskType || "").trim()
    const scheduledDateValue = toRequiredDate(body.scheduledDate)

    if (!propertyId) {
      return NextResponse.json(
        { error: "Το πεδίο propertyId είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: "Το πεδίο title είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!taskType) {
      return NextResponse.json(
        { error: "Το πεδίο taskType είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!scheduledDateValue) {
      return NextResponse.json(
        {
          error:
            "Το πεδίο scheduledDate είναι υποχρεωτικό και πρέπει να είναι έγκυρο.",
        },
        { status: 400 }
      )
    }

    if (String(taskSource).trim().toLowerCase() === "booking" && !bookingId) {
      return NextResponse.json(
        {
          error:
            'Οι εργασίες με source "booking" απαιτούν έγκυρο bookingId.',
        },
        { status: 400 }
      )
    }

    const requiresPhotos = Boolean(body.requiresPhotos)
    const requiresApproval = Boolean(body.requiresApproval)

    const sendCleaningChecklist =
      body.sendCleaningChecklist === undefined
        ? true
        : Boolean(body.sendCleaningChecklist)

    const sendSuppliesChecklist = Boolean(body.sendSuppliesChecklist)
    const sendIssuesChecklist = Boolean(body.sendIssuesChecklist)

    const usesCustomizedCleaningChecklist = Boolean(
      body.usesCustomizedCleaningChecklist
    )
    const usesCustomizedSuppliesChecklist = Boolean(
      body.usesCustomizedSuppliesChecklist
    )
    const usesCustomizedIssuesChecklist = Boolean(
      body.usesCustomizedIssuesChecklist
    )

    const alertEnabled = Boolean(body.alertEnabled)
    let alertAt: Date | null = null

    if (alertEnabled) {
      alertAt = toOptionalDate(body.alertAt)

      if (!alertAt) {
        return NextResponse.json(
          {
            error:
              "Το alert είναι ενεργό αλλά δεν έχει οριστεί έγκυρη ώρα alert.",
          },
          { status: 400 }
        )
      }
    }

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        organizationId,
      },
      select: {
        id: true,
        defaultPartnerId: true,
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε ή δεν ανήκει στον οργανισμό." },
        { status: 404 }
      )
    }

    if (bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          organizationId,
          propertyId,
        },
        select: {
          id: true,
        },
      })

      if (!booking) {
        return NextResponse.json(
          {
            error:
              "Η κράτηση δεν βρέθηκε ή δεν ανήκει στο ίδιο ακίνητο και οργανισμό.",
          },
          { status: 400 }
        )
      }
    }

    if (sendCleaningChecklist) {
      const primaryTemplate = await findPrimaryCleaningTemplate(
        organizationId,
        propertyId
      )

      if (!primaryTemplate) {
        return NextResponse.json(
          {
            error: "Το ακίνητο δεν έχει ενεργή βασική λίστα καθαριότητας.",
          },
          { status: 400 }
        )
      }
    }

    if (sendSuppliesChecklist) {
      const activeSuppliesCount = await countActivePropertySupplies(propertyId)

      if (activeSuppliesCount === 0) {
        return NextResponse.json(
          {
            error:
              "Το ακίνητο δεν έχει ενεργά αναλώσιμα για αποστολή λίστας αναλωσίμων.",
          },
          { status: 400 }
        )
      }
    }

    if (sendIssuesChecklist) {
      const primaryIssueTemplate = await findPrimaryIssueTemplate(
        organizationId,
        propertyId
      )

      if (!primaryIssueTemplate) {
        return NextResponse.json(
          {
            error:
              "Το ακίνητο δεν έχει ενεργή βασική λίστα βλαβών / ζημιών.",
          },
          { status: 400 }
        )
      }
    }

    const task = await prisma.task.create({
      data: {
        organizationId,
        propertyId,
        bookingId,
        title,
        description: toNullableString(body.description),
        taskType,
        source: taskSource,
        priority: toNullableString(body.priority) || "normal",
        status: toNullableString(body.status) || "pending",
        scheduledDate: scheduledDateValue,
        scheduledStartTime: toNullableTime(body.scheduledStartTime),
        scheduledEndTime: toNullableTime(body.scheduledEndTime),
        dueDate: toOptionalDate(body.dueDate),
        requiresPhotos,
        requiresChecklist: sendCleaningChecklist,
        requiresApproval,
        sendCleaningChecklist,
        sendSuppliesChecklist,
        sendIssuesChecklist,
        usesCustomizedCleaningChecklist,
        usesCustomizedSuppliesChecklist,
        usesCustomizedIssuesChecklist,
        alertEnabled,
        alertAt,
        notes: toNullableString(body.notes),
      },
    })

    await syncTaskChecklistRun({
      taskId: task.id,
      organizationId,
      propertyId,
      sendCleaningChecklist,
    })

    await syncTaskSupplyRun({
      taskId: task.id,
      propertyId,
      sendSuppliesChecklist,
    })

    await syncTaskIssueRun({
      taskId: task.id,
      organizationId,
      propertyId,
      sendIssuesChecklist,
    })

    const fullTask = await prisma.task.findUnique({
      where: {
        id: task.id,
      },
      include: taskDetailsInclude,
    })

    const shapedTask = fullTask ? shapeTaskForResponse(fullTask) : null

    return NextResponse.json(
      {
        success: true,
        task: shapedTask,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Tasks POST error:", error)

    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας εργασίας." },
      { status: 500 }
    )
  }
}
