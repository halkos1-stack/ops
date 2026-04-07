import { NextRequest, NextResponse } from "next/server"
import { Prisma, PropertySupplyStateMode } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccessWithDevBypass } from "@/lib/dev-api-access"
import { getOperationalTaskValidity } from "@/lib/tasks/ops-task-contract"
import {
  buildPropertyConditionSnapshot,
  type RawPropertyConditionRecord,
} from "@/lib/readiness/property-condition-mappers"
import { buildCanonicalSupplyWriteData } from "@/lib/supplies/compute-supply-state"

type RouteContext = {
  params: Promise<{
    taskId: string
  }>
}

type AuthContext = {
  systemRole?: "SUPER_ADMIN" | "USER"
  organizationId?: string | null
}

function toPrismaSupplyStateMode(
  mode: "direct_state" | "numeric_thresholds"
): PropertySupplyStateMode {
  return mode === "numeric_thresholds"
    ? PropertySupplyStateMode.NUMERIC_THRESHOLDS
    : PropertySupplyStateMode.DIRECT_STATE
}

type ExtendedRawPropertyConditionRecord = RawPropertyConditionRecord & {
  taskId?: string | null
  bookingId?: string | null
  propertySupplyId?: string | null
  mergeKey?: string | null
  description?: string | null
  managerNotes?: string | null
  sourceLabel?: string | null
  sourceItemId?: string | null
  sourceItemLabel?: string | null
  sourceRunId?: string | null
  sourceAnswerId?: string | null
  firstDetectedAt?: Date | string | null
  lastDetectedAt?: Date | string | null
}

type LooseRecord = Record<string, unknown>

type SortableRunItem = {
  id?: string | null
  sortOrder?: number | null
  label?: string | null
  labelEn?: string | null
}

type ChecklistRunAnswerRecord = {
  id: string
  runItem?: SortableRunItem | null
  templateItem?: SortableRunItem | null
  valueBoolean?: boolean | null
  valueText?: string | null
  valueNumber?: number | null
  valueSelect?: string | null
  notes?: string | null
  photoUrls?: unknown
  issueCreated?: boolean | null
  createdAt?: Date | string | null
  updatedAt?: Date | string | null
}

type SupplyRunAnswerRecord = {
  id: string
  runItem?: SortableRunItem | null
  propertySupplyId?: string | null
  propertySupply?: {
    supplyItem?: {
      name?: string | null
      nameEl?: string | null
      nameEn?: string | null
    } | null
  } | null
  quantityValue?: number | null
  fillLevel?: string | null
  notes?: string | null
  createdAt?: Date | string | null
  updatedAt?: Date | string | null
}

type IssueRunAnswerRecord = {
  id: string
  runItem?: SortableRunItem | null
  templateItem?: SortableRunItem | null
  reportType?: string | null
  title?: string | null
  description?: string | null
  locationText?: string | null
  photoUrls?: unknown
  createdIssueId?: string | null
  createdAt?: Date | string | null
  updatedAt?: Date | string | null
}

type ChecklistRunRecord = LooseRecord & {
  items?: SortableRunItem[] | null
  answers?: ChecklistRunAnswerRecord[] | null
}

type SupplyRunRecord = LooseRecord & {
  items?: SortableRunItem[] | null
  answers?: SupplyRunAnswerRecord[] | null
}

type IssueRunRecord = LooseRecord & {
  items?: SortableRunItem[] | null
  answers?: IssueRunAnswerRecord[] | null
  template?: {
    items?: SortableRunItem[] | null
  } | null
}

function buildTenantWhere(auth: AuthContext) {
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

function hasOwn(obj: unknown, key: string) {
  return Object.prototype.hasOwnProperty.call(obj ?? {}, key)
}

function toRequiredString(value: unknown, label: string) {
  const text = String(value ?? "").trim()

  if (!text) {
    throw new Error(`Το πεδίο "${label}" είναι υποχρεωτικό.`)
  }

  return text
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null

  const text = String(value).trim()
  return text ? text : null
}

function toOptionalBoolean(value: unknown) {
  if (value === undefined) return undefined
  return Boolean(value)
}

function toNullableDate(value: unknown, label: string) {
  if (value === undefined) return undefined
  if (value === null || value === "") return null

  const date = new Date(String(value))

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Το πεδίο "${label}" δεν είναι έγκυρη ημερομηνία.`)
  }

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

function sortChecklistRun(run: ChecklistRunRecord | null | undefined) {
  if (!run) return null

  return {
    ...run,
    items: safeArray(run.items).sort((a, b) => {
      const aOrder = Number(a?.sortOrder ?? 0)
      const bOrder = Number(b?.sortOrder ?? 0)
      return aOrder - bOrder
    }),
    answers: safeArray(run.answers)
      .map((answer) => ({
        id: answer.id,
        checklistItemId: answer?.runItem?.id ?? answer?.templateItem?.id ?? null,
        itemLabel:
          answer?.runItem?.labelEn ??
          answer?.runItem?.label ??
          answer?.templateItem?.labelEn ??
          answer?.templateItem?.label ??
          null,
        itemType: null,
        valueBoolean: answer.valueBoolean,
        valueText: answer.valueText,
        valueNumber: answer.valueNumber,
        valueSelect: answer.valueSelect,
        note: answer.notes ?? null,
        photoUrls: safeArray(answer.photoUrls as string[] | null | undefined),
        issueCreated: Boolean(answer.issueCreated),
        linkedSupplyItemId: null,
        createdAt: answer.createdAt,
        updatedAt: answer.updatedAt,
      }))
      .sort((a, b) => {
        const aOrder = Number(
          run.items?.find((item) => item.id === a.checklistItemId)?.sortOrder ?? 0
        )
        const bOrder = Number(
          run.items?.find((item) => item.id === b.checklistItemId)?.sortOrder ?? 0
        )
        return aOrder - bOrder
      }),
  }
}

function sortSupplyRun(run: SupplyRunRecord | null | undefined) {
  if (!run) return null

  return {
    ...run,
    items: safeArray(run.items).sort((a, b) => {
      const aOrder = Number(a?.sortOrder ?? 0)
      const bOrder = Number(b?.sortOrder ?? 0)
      return aOrder - bOrder
    }),
    answers: safeArray(run.answers)
      .map((answer) => ({
        id: answer.id,
        checklistItemId: answer?.runItem?.id ?? null,
        itemLabel:
          answer?.runItem?.labelEn ??
          answer?.runItem?.label ??
          answer?.propertySupply?.supplyItem?.nameEn ??
          answer?.propertySupply?.supplyItem?.nameEl ??
          answer?.propertySupply?.supplyItem?.name ??
          null,
        itemType: "select",
        valueBoolean: null,
        valueText: null,
        valueNumber: answer.quantityValue ?? null,
        valueSelect: answer.fillLevel ?? null,
        note: answer.notes ?? null,
        photoUrls: [],
        issueCreated: false,
        linkedSupplyItemId: answer.propertySupplyId ?? null,
        createdAt: answer.createdAt,
        updatedAt: answer.updatedAt,
      }))
      .sort((a, b) => {
        const aOrder = Number(
          run.items?.find((item) => item.id === a.checklistItemId)?.sortOrder ?? 0
        )
        const bOrder = Number(
          run.items?.find((item) => item.id === b.checklistItemId)?.sortOrder ?? 0
        )
        if (aOrder !== bOrder) return aOrder - bOrder
        return String(a.itemLabel ?? "").localeCompare(String(b.itemLabel ?? ""))
      }),
  }
}

function sortIssueRun(run: IssueRunRecord | null | undefined) {
  if (!run) return null

  return {
    ...run,
    template: run.template
      ? {
          ...run.template,
          items: safeArray(run.template.items).sort((a, b) => {
            const aOrder = Number(a?.sortOrder ?? 0)
            const bOrder = Number(b?.sortOrder ?? 0)
            return aOrder - bOrder
          }),
        }
      : null,
    items: safeArray(run.items).sort((a, b) => {
      const aOrder = Number(a?.sortOrder ?? 0)
      const bOrder = Number(b?.sortOrder ?? 0)
      return aOrder - bOrder
    }),
    answers: safeArray(run.answers)
      .map((answer) => ({
        id: answer.id,
        checklistItemId: answer?.runItem?.id ?? answer?.templateItem?.id ?? null,
        itemLabel:
          answer?.runItem?.labelEn ??
          answer?.runItem?.label ??
          answer?.templateItem?.labelEn ??
          answer?.templateItem?.label ??
          answer?.title ??
          null,
        itemType: "text",
        valueBoolean: null,
        valueText: answer.description ?? answer.title ?? null,
        valueNumber: null,
        valueSelect: answer.reportType ?? null,
        note: answer.locationText ?? null,
        photoUrls: safeArray(answer.photoUrls as string[] | null | undefined),
        issueCreated: Boolean(answer.createdIssueId),
        linkedSupplyItemId: null,
        createdAt: answer.createdAt,
        updatedAt: answer.updatedAt,
      }))
      .sort((a, b) => {
        const aOrder = Number(
          run.items?.find((item) => item.id === a.checklistItemId)?.sortOrder ?? 0
        )
        const bOrder = Number(
          run.items?.find((item) => item.id === b.checklistItemId)?.sortOrder ?? 0
        )

        if (aOrder !== bOrder) return aOrder - bOrder

        const aCreated = new Date(a?.createdAt || 0).getTime()
        const bCreated = new Date(b?.createdAt || 0).getTime()

        return aCreated - bCreated
      }),
  }
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
  firstDetectedAt?: Date | null
  lastDetectedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  resolvedAt: Date | null
  dismissedAt: Date | null
}): ExtendedRawPropertyConditionRecord {
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
    managerDecision: normalizeConditionManagerDecision(condition.managerDecision),
    sourceType: toNullableString(condition.sourceType),
    sourceTaskId: condition.taskId,
    sourceChecklistRunId: toNullableString(condition.sourceRunId),
    sourceChecklistAnswerId: toNullableString(condition.sourceAnswerId),
    createdAt: condition.createdAt,
    updatedAt: condition.updatedAt,
    resolvedAt: condition.resolvedAt,
    dismissedAt: condition.dismissedAt,
    taskId: condition.taskId,
    bookingId: condition.bookingId,
    propertySupplyId: condition.propertySupplyId,
    mergeKey: condition.mergeKey ?? null,
    description: condition.description,
    managerNotes: toNullableString(condition.managerNotes),
    sourceLabel: toNullableString(condition.sourceLabel),
    sourceItemId: toNullableString(condition.sourceItemId),
    sourceItemLabel: toNullableString(condition.sourceItemLabel),
    sourceRunId: toNullableString(condition.sourceRunId),
    sourceAnswerId: toNullableString(condition.sourceAnswerId),
    firstDetectedAt: condition.firstDetectedAt ?? null,
    lastDetectedAt: condition.lastDetectedAt ?? null,
  }
}

async function resolveTaskId(context: RouteContext) {
  const params = await context.params
  return String(params.taskId || "").trim()
}

async function syncTaskRunsForTask(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      propertyId: true,
      requiresChecklist: true,
      sendCleaningChecklist: true,
      sendSuppliesChecklist: true,
      sendIssuesChecklist: true,
      checklistRun: {
        select: {
          id: true,
          templateId: true,
        },
      },
      supplyRun: {
        select: {
          id: true,
        },
      },
      issueRun: {
        select: {
          id: true,
          templateId: true,
        },
      },
    },
  })

  if (!task || !task.propertyId) return

  if (task.sendCleaningChecklist && task.requiresChecklist !== false) {
    const primaryCleaningTemplate = await prisma.propertyChecklistTemplate.findFirst({
      where: {
        propertyId: task.propertyId,
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

    if (primaryCleaningTemplate) {
      if (task.checklistRun) {
        const shouldUpdateTemplate = task.checklistRun.templateId !== primaryCleaningTemplate.id

        if (shouldUpdateTemplate) {
          await prisma.$transaction(async (tx) => {
            await tx.taskChecklistRun.update({
              where: { id: task.checklistRun!.id },
              data: {
                templateId: primaryCleaningTemplate.id,
                sourceTemplateTitle: primaryCleaningTemplate.title,
                sourceTemplateDescription: primaryCleaningTemplate.description,
                templateType: primaryCleaningTemplate.templateType,
              },
            })

            await tx.taskChecklistRunItem.deleteMany({
              where: {
                checklistRunId: task.checklistRun!.id,
              },
            })

            if (primaryCleaningTemplate.items.length > 0) {
              await tx.taskChecklistRunItem.createMany({
                data: primaryCleaningTemplate.items.map((item) => ({
                  checklistRunId: task.checklistRun!.id,
                  propertyTemplateItemId: item.id,
                  label: item.label,
                  labelEn: item.labelEn,
                  description: item.description,
                  itemType: item.itemType,
                  isRequired: item.isRequired,
                  sortOrder: item.sortOrder,
                  category: item.category,
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
                })),
              })
            }
          })
        }
      } else {
        await prisma.$transaction(async (tx) => {
          const run = await tx.taskChecklistRun.create({
            data: {
              taskId: task.id,
              templateId: primaryCleaningTemplate.id,
              sourceTemplateTitle: primaryCleaningTemplate.title,
              sourceTemplateDescription: primaryCleaningTemplate.description,
              templateType: primaryCleaningTemplate.templateType,
              status: "pending",
            },
            select: {
              id: true,
            },
          })

          if (primaryCleaningTemplate.items.length > 0) {
            await tx.taskChecklistRunItem.createMany({
              data: primaryCleaningTemplate.items.map((item) => ({
                checklistRunId: run.id,
                propertyTemplateItemId: item.id,
                label: item.label,
                labelEn: item.labelEn,
                description: item.description,
                itemType: item.itemType,
                isRequired: item.isRequired,
                sortOrder: item.sortOrder,
                category: item.category,
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
              })),
            })
          }
        })
      }
    }
  }

  if (task.sendSuppliesChecklist) {
    const activeSupplies = await prisma.propertySupply.findMany({
      where: {
        propertyId: task.propertyId,
        isActive: true,
      },
      select: {
        id: true,
        propertyId: true,
        supplyItemId: true,
        fillLevel: true,
        stateMode: true,
        currentStock: true,
        mediumThreshold: true,
        fullThreshold: true,
        targetStock: true,
        reorderThreshold: true,
        targetLevel: true,
        minimumThreshold: true,
        trackingMode: true,
        isCritical: true,
        warningThreshold: true,
        notes: true,
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
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    })

    if (activeSupplies.length > 0) {
      if (task.supplyRun) {
        const existingItems = await prisma.taskSupplyRunItem.findMany({
          where: {
            taskSupplyRunId: task.supplyRun.id,
          },
          select: {
            id: true,
            propertySupplyId: true,
          },
        })

        const existingPropertySupplyIds = new Set(
          existingItems
            .map((item) => item.propertySupplyId)
            .filter((value): value is string => Boolean(value))
        )

        const incomingPropertySupplyIds = new Set(activeSupplies.map((item) => item.id))

        const missingSupplies = activeSupplies.filter(
          (item) => !existingPropertySupplyIds.has(item.id)
        )

        const obsoleteItemIds = existingItems
          .filter(
            (item) =>
              !item.propertySupplyId ||
              !incomingPropertySupplyIds.has(item.propertySupplyId)
          )
          .map((item) => item.id)

        if (obsoleteItemIds.length > 0) {
          await prisma.taskSupplyRunItem.deleteMany({
            where: {
              id: {
                in: obsoleteItemIds,
              },
            },
          })
        }

        if (missingSupplies.length > 0) {
          const maxSortOrderRow = await prisma.taskSupplyRunItem.findFirst({
            where: {
              taskSupplyRunId: task.supplyRun.id,
            },
            orderBy: {
              sortOrder: "desc",
            },
            select: {
              sortOrder: true,
            },
          })

          let nextSortOrder = Number(maxSortOrderRow?.sortOrder ?? -1) + 1

          await prisma.taskSupplyRunItem.createMany({
            data: missingSupplies.map((supply) => {
              const canonical = buildCanonicalSupplyWriteData({
                stateMode: supply.stateMode,
                fillLevel: supply.fillLevel,
                currentStock: supply.currentStock,
                mediumThreshold: supply.mediumThreshold,
                fullThreshold: supply.fullThreshold,
              })
              const row = {
                taskSupplyRunId: task.supplyRun!.id,
                propertySupplyId: supply.id,
                supplyItemId: supply.supplyItemId,
                propertySupplyCode: supply.supplyItem?.code ?? null,
                label: supply.supplyItem?.nameEl ?? supply.supplyItem?.name ?? "Αναλώσιμο",
                labelEn: supply.supplyItem?.nameEn ?? null,
                category: supply.supplyItem?.category ?? null,
                unit: supply.supplyItem?.unit ?? null,
                fillLevel: canonical.fillLevel,
                stateMode: toPrismaSupplyStateMode(canonical.stateMode),
                currentStock: canonical.currentStock,
                mediumThreshold: canonical.mediumThreshold,
                fullThreshold: canonical.fullThreshold,
                targetStock: canonical.targetStock,
                reorderThreshold: canonical.reorderThreshold,
                targetLevel: canonical.targetLevel,
                minimumThreshold: canonical.minimumThreshold,
                trackingMode: canonical.trackingMode,
                isCritical: supply.isCritical,
                warningThreshold: canonical.warningThreshold,
                sortOrder: nextSortOrder,
                isRequired: true,
                notes: supply.notes,
              }

              nextSortOrder += 1
              return row
            }),
          })
        }
      } else {
        await prisma.$transaction(async (tx) => {
          const run = await tx.taskSupplyRun.create({
            data: {
              taskId: task.id,
              status: "pending",
            },
            select: {
              id: true,
            },
          })

          await tx.taskSupplyRunItem.createMany({
            data: activeSupplies.map((supply, index) => {
              const canonical = buildCanonicalSupplyWriteData({
                stateMode: supply.stateMode,
                fillLevel: supply.fillLevel,
                currentStock: supply.currentStock,
                mediumThreshold: supply.mediumThreshold,
                fullThreshold: supply.fullThreshold,
              })

              return ({
              taskSupplyRunId: run.id,
              propertySupplyId: supply.id,
              supplyItemId: supply.supplyItemId,
              propertySupplyCode: supply.supplyItem?.code ?? null,
              label: supply.supplyItem?.nameEl ?? supply.supplyItem?.name ?? "Αναλώσιμο",
              labelEn: supply.supplyItem?.nameEn ?? null,
              category: supply.supplyItem?.category ?? null,
              unit: supply.supplyItem?.unit ?? null,
              fillLevel: canonical.fillLevel,
                stateMode: toPrismaSupplyStateMode(canonical.stateMode),
              currentStock: canonical.currentStock,
              mediumThreshold: canonical.mediumThreshold,
              fullThreshold: canonical.fullThreshold,
              targetStock: canonical.targetStock,
              reorderThreshold: canonical.reorderThreshold,
              targetLevel: canonical.targetLevel,
              minimumThreshold: canonical.minimumThreshold,
              trackingMode: canonical.trackingMode,
              isCritical: supply.isCritical,
              warningThreshold: canonical.warningThreshold,
              sortOrder: index,
              isRequired: true,
              notes: supply.notes,
            })
            }),
          })
        })
      }
    }
  }

  if (task.sendIssuesChecklist) {
    const primaryIssueTemplate = await prisma.propertyIssueTemplate.findFirst({
      where: {
        propertyId: task.propertyId,
        isPrimary: true,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
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

    if (primaryIssueTemplate) {
      if (task.issueRun) {
        const shouldUpdateTemplate = task.issueRun.templateId !== primaryIssueTemplate.id

        if (shouldUpdateTemplate) {
          await prisma.$transaction(async (tx) => {
            await tx.taskIssueRun.update({
              where: { id: task.issueRun!.id },
              data: {
                templateId: primaryIssueTemplate.id,
                sourceTemplateTitle: primaryIssueTemplate.title,
                sourceTemplateDescription: primaryIssueTemplate.description,
              },
            })

            await tx.taskIssueRunItem.deleteMany({
              where: {
                issueRunId: task.issueRun!.id,
              },
            })

            if (primaryIssueTemplate.items.length > 0) {
              await tx.taskIssueRunItem.createMany({
                data: primaryIssueTemplate.items.map((item) => ({
                  issueRunId: task.issueRun!.id,
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
                })),
              })
            }
          })
        }
      } else {
        await prisma.$transaction(async (tx) => {
          const run = await tx.taskIssueRun.create({
            data: {
              taskId: task.id,
              templateId: primaryIssueTemplate.id,
              sourceTemplateTitle: primaryIssueTemplate.title,
              sourceTemplateDescription: primaryIssueTemplate.description,
              status: "pending",
            },
            select: {
              id: true,
            },
          })

          if (primaryIssueTemplate.items.length > 0) {
            await tx.taskIssueRunItem.createMany({
              data: primaryIssueTemplate.items.map((item) => ({
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
              })),
            })
          }
        })
      }
    }
  }
}
async function getTaskPayload(taskId: string, auth: AuthContext) {
  const tenantWhere = buildTenantWhere(auth)

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      ...tenantWhere,
    },
    select: {
      id: true,
      organizationId: true,
      propertyId: true,
      bookingId: true,
      title: true,
      description: true,
      taskType: true,
      source: true,
      priority: true,
      status: true,
      scheduledDate: true,
      scheduledStartTime: true,
      scheduledEndTime: true,
      dueDate: true,
      completedAt: true,
      requiresPhotos: true,
      requiresChecklist: true,
      requiresApproval: true,
      sendCleaningChecklist: true,
      sendSuppliesChecklist: true,
      sendIssuesChecklist: true,
      usesCustomizedCleaningChecklist: true,
      usesCustomizedSuppliesChecklist: true,
      usesCustomizedIssuesChecklist: true,
      alertEnabled: true,
      alertAt: true,
      notes: true,
      resultNotes: true,
      createdAt: true,
      updatedAt: true,
      property: {
        select: {
          id: true,
          code: true,
          name: true,
          address: true,
          city: true,
          region: true,
          postalCode: true,
          country: true,
          type: true,
          status: true,
          readinessStatus: true,
          readinessUpdatedAt: true,
          readinessReasonsText: true,
          nextCheckInAt: true,
          openConditionCount: true,
          openBlockingConditionCount: true,
          openWarningConditionCount: true,
          defaultPartner: {
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
      booking: {
        select: {
          id: true,
          sourcePlatform: true,
          externalBookingId: true,
          externalListingId: true,
          externalListingName: true,
          guestName: true,
          guestPhone: true,
          guestEmail: true,
          checkInDate: true,
          checkOutDate: true,
          checkInTime: true,
          checkOutTime: true,
          status: true,
          syncStatus: true,
          needsMapping: true,
        },
      },
      assignments: {
        select: {
          id: true,
          partnerId: true,
          status: true,
          assignedAt: true,
          acceptedAt: true,
          rejectedAt: true,
          startedAt: true,
          completedAt: true,
          rejectionReason: true,
          notes: true,          partner: {
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
        orderBy: {
          assignedAt: "desc",
        },
      },
      checklistRun: {
        select: {
          id: true,
          taskId: true,
          templateId: true,
          sourceTemplateTitle: true,
          sourceTemplateDescription: true,
          templateType: true,
          isCustomized: true,
          status: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          template: {
            select: {
              id: true,
              title: true,
              description: true,
              templateType: true,
              isPrimary: true,
              isActive: true,
            },
          },
          items: {
            select: {
              id: true,
              propertyTemplateItemId: true,
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
              linkedSupplyItemName: true,
              linkedSupplyItemNameEl: true,
              linkedSupplyItemNameEn: true,
              supplyUpdateMode: true,
              supplyQuantity: true,
            },
          },
          answers: {
            select: {
              id: true,
              valueBoolean: true,
              valueText: true,
              valueNumber: true,
              valueSelect: true,
              notes: true,
              photoUrls: true,
              issueCreated: true,
              createdAt: true,
              updatedAt: true,
              runItem: {
                select: {
                  id: true,
                  label: true,
                  labelEn: true,
                  sortOrder: true,
                },
              },
              templateItem: {
                select: {
                  id: true,
                  label: true,
                  labelEn: true,
                  sortOrder: true,
                },
              },
            },
          },
        },
      },
      supplyRun: {
        select: {
          id: true,
          taskId: true,
          isCustomized: true,
          status: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: {
              id: true,
              propertySupplyId: true,
              supplyItemId: true,
              propertySupplyCode: true,
              label: true,
              labelEn: true,
              category: true,
              unit: true,
              fillLevel: true,
              currentStock: true,
              targetStock: true,
              reorderThreshold: true,
              targetLevel: true,
              minimumThreshold: true,
              trackingMode: true,
              isCritical: true,
              warningThreshold: true,
              sortOrder: true,
              isRequired: true,
              notes: true,
            },
          },
          answers: {
            select: {
              id: true,
              propertySupplyId: true,
              fillLevel: true,
              quantityValue: true,
              notes: true,
              createdAt: true,
              updatedAt: true,
              runItem: {
                select: {
                  id: true,
                  label: true,
                  labelEn: true,
                  sortOrder: true,
                },
              },
              propertySupply: {
                select: {
                  id: true,
                  propertyId: true,
                  supplyItemId: true,
                  isActive: true,
                  fillLevel: true,
                  currentStock: true,
                  targetStock: true,
                  reorderThreshold: true,
                  targetLevel: true,
                  minimumThreshold: true,
                  trackingMode: true,
                  isCritical: true,
                  warningThreshold: true,
                  lastUpdatedAt: true,
                  updatedAt: true,
                  notes: true,
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
                      isActive: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      issueRun: {
        select: {
          id: true,
          taskId: true,
          templateId: true,
          sourceTemplateTitle: true,
          sourceTemplateDescription: true,
          isCustomized: true,
          status: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          template: {
            select: {
              id: true,
              title: true,
              description: true,
              isPrimary: true,
              isActive: true,
              items: {
                select: {
                  id: true,
                  label: true,
                  labelEn: true,
                  description: true,
                  sortOrder: true,
                },
                orderBy: {
                  sortOrder: "asc",
                },
              },
            },
          },
          items: {
            select: {
              id: true,
              propertyTemplateItemId: true,
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
          answers: {
            select: {
              id: true,
              reportType: true,
              title: true,
              description: true,
              severity: true,
              affectsHosting: true,
              requiresImmediateAction: true,
              locationText: true,
              photoUrls: true,
              createdIssueId: true,
              createdAt: true,
              updatedAt: true,
              runItem: {
                select: {
                  id: true,
                  label: true,
                  labelEn: true,
                  sortOrder: true,
                },
              },
              templateItem: {
                select: {
                  id: true,
                  label: true,
                  labelEn: true,
                  sortOrder: true,
                },
              },
            },
          },
        },
      },
      activityLogs: {
        select: {
          id: true,
          action: true,
          message: true,
          actorType: true,
          actorName: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  })

  if (!task) return null

  const [
    issues,
    propertyConditions,
    primaryCleaningTemplate,
    activePropertySupplies,
    primaryIssueTemplate,
    partners,
  ] = await Promise.all([
    prisma.issue.findMany({
      where: {
        taskId: task.id,
        ...tenantWhere,
      },
      select: {
        id: true,
        organizationId: true,
        propertyId: true,
        taskId: true,
        bookingId: true,
        issueType: true,
        title: true,
        description: true,
        severity: true,
        status: true,
        reportedBy: true,
        affectsHosting: true,
        requiresImmediateAction: true,
        locationText: true,
        resolutionNotes: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.propertyCondition.findMany({
      where: {
        propertyId: task.propertyId,
        ...tenantWhere,
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
        firstDetectedAt: true,
        lastDetectedAt: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        dismissedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
    task.propertyId
      ? prisma.propertyChecklistTemplate.findFirst({
          where: {
            propertyId: task.propertyId,
            isPrimary: true,
            isActive: true,
            NOT: {
              templateType: "supplies",
            },
          },
          select: {
            id: true,
            propertyId: true,
            title: true,
            description: true,
            templateType: true,
            isPrimary: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            items: {
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
                issueTypeOnFail: true,
                issueSeverityOnFail: true,
                failureValuesText: true,
                linkedSupplyItemId: true,
                supplyUpdateMode: true,
                supplyQuantity: true,
              },
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        })
      : Promise.resolve(null),
    task.propertyId
      ? prisma.propertySupply.findMany({
          where: {
            propertyId: task.propertyId,
            isActive: true,
          },
          select: {
            id: true,
            propertyId: true,
            supplyItemId: true,
            isActive: true,
            fillLevel: true,
            stateMode: true,
            currentStock: true,
            mediumThreshold: true,
            fullThreshold: true,
            targetStock: true,
            reorderThreshold: true,
            targetLevel: true,
            minimumThreshold: true,
            trackingMode: true,
            isCritical: true,
            warningThreshold: true,
            lastUpdatedAt: true,
            updatedAt: true,
            notes: true,
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
                isActive: true,
              },
            },
          },
          orderBy: [{ updatedAt: "desc" }],
        })
      : Promise.resolve([]),
    task.propertyId
      ? prisma.propertyIssueTemplate.findFirst({
          where: {
            propertyId: task.propertyId,
            isPrimary: true,
            isActive: true,
          },
          select: {
            id: true,
            propertyId: true,
            title: true,
            description: true,
            isPrimary: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            items: {
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
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        })
      : Promise.resolve(null),
    prisma.partner.findMany({
      where: {
        ...tenantWhere,
        status: {
          not: "inactive",
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        specialty: true,
        status: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ])

  const cleanedChecklistRun = sortChecklistRun(task.checklistRun)
  const cleanedSupplyRun = sortSupplyRun(task.supplyRun)
  const cleanedIssueRun = sortIssueRun(task.issueRun)

  const propertyConditionSnapshot = buildPropertyConditionSnapshot(
    propertyConditions.map((condition) =>
      mapDbConditionToRawRecord({
        id: condition.id,
        propertyId: condition.propertyId,
        taskId: condition.taskId,
        bookingId: condition.bookingId,
        propertySupplyId: condition.propertySupplyId,
        mergeKey: condition.mergeKey ?? null,
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
        firstDetectedAt: condition.firstDetectedAt ?? null,
        lastDetectedAt: condition.lastDetectedAt ?? null,
        createdAt: condition.createdAt,
        updatedAt: condition.updatedAt,
        resolvedAt: condition.resolvedAt,
        dismissedAt: condition.dismissedAt,
      })
    )
  )

  const warnings: Array<{ code: string; title: string; message: string; severity: string }> = []
  const readinessReasonLines = String(task.property?.readinessReasonsText ?? "")
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean)

  if (task.sendCleaningChecklist && !primaryCleaningTemplate) {
    warnings.push({
      code: "missing_cleaning_template",
      title: "Λείπει βασική λίστα καθαριότητας",
      message: "Η εργασία ζητά λίστα καθαριότητας αλλά δεν υπάρχει ενεργή κύρια λίστα στο ακίνητο.",
      severity: "high",
    })
  }

  if (task.sendCleaningChecklist && task.requiresChecklist !== false && !cleanedChecklistRun && primaryCleaningTemplate) {
    warnings.push({
      code: "missing_cleaning_run",
      title: "Λείπει run καθαριότητας",
      message: "Η εργασία ζητά λίστα καθαριότητας αλλά δεν υπάρχει ακόμη run λίστας.",
      severity: "medium",
    })
  }

  if (task.sendSuppliesChecklist && activePropertySupplies.length === 0) {
    warnings.push({
      code: "missing_supplies_items",
      title: "Δεν υπάρχουν ενεργά αναλώσιμα",
      message: "Η εργασία ζητά λίστα αναλωσίμων αλλά το ακίνητο δεν έχει ενεργά αναλώσιμα.",
      severity: "medium",
    })
  }

  if (task.sendSuppliesChecklist && !cleanedSupplyRun && activePropertySupplies.length > 0) {
    warnings.push({
      code: "missing_supplies_run",
      title: "Λείπει run αναλωσίμων",
      message: "Η εργασία ζητά λίστα αναλωσίμων αλλά δεν υπάρχει ακόμη run λίστας.",
      severity: "medium",
    })
  }

  if (task.sendIssuesChecklist && !primaryIssueTemplate) {
    warnings.push({
      code: "missing_issues_template",
      title: "Λείπει βασική λίστα βλαβών και ζημιών",
      message: "Η εργασία ζητά λίστα βλαβών/ζημιών αλλά δεν υπάρχει ενεργή κύρια λίστα στο ακίνητο.",
      severity: "high",
    })
  }

  if (task.sendIssuesChecklist && !cleanedIssueRun && primaryIssueTemplate) {
    warnings.push({
      code: "missing_issues_run",
      title: "Λείπει run βλαβών και ζημιών",
      message: "Η εργασία ζητά λίστα βλαβών/ζημιών αλλά δεν υπάρχει ακόμη run λίστας.",
      severity: "medium",
    })
  }

  const shapedTask = {
    id: task.id,
    opsValidity: getOperationalTaskValidity(task),
    title: task.title,
    description: task.description,
    taskType: task.taskType,
    source: task.source,
    priority: task.priority,
    status: task.status,
    scheduledDate: task.scheduledDate,
    scheduledStartTime: task.scheduledStartTime,
    scheduledEndTime: task.scheduledEndTime,
    notes: task.notes,
    resultNotes: task.resultNotes,
    requiresPhotos: task.requiresPhotos,
    requiresChecklist: task.requiresChecklist,
    requiresApproval: task.requiresApproval,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
    property: task.property,
    booking: task.booking,
    partners,
    assignments: safeArray(task.assignments).map((assignment) => ({
      ...assignment,
      portalUrl: null,
    })),
    cleaningChecklistRun: cleanedChecklistRun,
    suppliesChecklistRun: cleanedSupplyRun,
    issuesChecklistRun: cleanedIssueRun,
    checklistRun: cleanedChecklistRun,
    activityLogs: safeArray(task.activityLogs),
    propertyLists: {
      cleaning: {
        availableOnProperty: Boolean(primaryCleaningTemplate),
        primaryTemplate: primaryCleaningTemplate,
      },
      supplies: {
        availableOnProperty: activePropertySupplies.length > 0,
        activeSuppliesCount: activePropertySupplies.length,
        items: activePropertySupplies,
      },
      issues: {
        availableOnProperty: Boolean(primaryIssueTemplate),
        activeIssuesCount: issues.filter((issue) => {
          const status = String(issue.status ?? "").toLowerCase()
          return status !== "resolved" && status !== "dismissed"
        }).length,
        items: issues,
      },
    },
    propertyConditions: propertyConditionSnapshot.conditions,
    issues,
    warnings,
    readiness: {
      status: task.property?.readinessStatus ?? "unknown",
      blockingCount:
        task.property?.openBlockingConditionCount ?? propertyConditionSnapshot.summary.blocking ?? 0,
      warningCount:
        task.property?.openWarningConditionCount ?? propertyConditionSnapshot.summary.warning ?? 0,
      openConditionsCount:
        task.property?.openConditionCount ?? propertyConditionSnapshot.summary.active ?? 0,
      reasonSummary:
        readinessReasonLines.length > 0
          ? readinessReasonLines
          : propertyConditionSnapshot.reasons,
      summary: propertyConditionSnapshot.reasons.join(" · ") || null,
      nextCheckInAt: task.property?.nextCheckInAt ?? null,
    },
    sendCleaningChecklist: Boolean(task.sendCleaningChecklist),
    sendSuppliesChecklist: Boolean(task.sendSuppliesChecklist),
    sendIssuesChecklist: Boolean(task.sendIssuesChecklist),
  }

  return {
    task: shapedTask,
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccessWithDevBypass(req)
  if (!access.ok) return access.response

  try {
    const taskId = await resolveTaskId(context)

    if (!taskId) {
      return NextResponse.json({ error: "Λείπει το taskId." }, { status: 400 })
    }

    const payload = await getTaskPayload(taskId, access.auth)

    if (!payload) {
      return NextResponse.json({ error: "Δεν βρέθηκε εργασία." }, { status: 404 })
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Task GET error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης εργασίας." },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccessWithDevBypass(req)
  if (!access.ok) return access.response

  try {
    const taskId = await resolveTaskId(context)

    if (!taskId) {
      return NextResponse.json({ error: "Λείπει το taskId." }, { status: 400 })
    }

    const tenantWhere = buildTenantWhere(access.auth)

    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        ...tenantWhere,
      },
      select: {
        id: true,
        organizationId: true,
        propertyId: true,
        bookingId: true,
        source: true,
      },
    })

    if (!existingTask) {
      return NextResponse.json({ error: "Δεν βρέθηκε εργασία." }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const data: Prisma.TaskUncheckedUpdateInput = {}

    if (hasOwn(body, "title")) {
      data.title = toRequiredString(body.title, "title")
    }

    if (hasOwn(body, "description")) {
      data.description = toNullableString(body.description)
    }

    if (hasOwn(body, "taskType")) {
      data.taskType = toRequiredString(body.taskType, "taskType")
    }

    if (hasOwn(body, "priority")) {
      data.priority = toRequiredString(body.priority, "priority")
    }

    if (hasOwn(body, "status")) {
      data.status = toRequiredString(body.status, "status")
    }

    if (hasOwn(body, "scheduledDate")) {
      const parsed = toNullableDate(body.scheduledDate, "scheduledDate")
      if (!parsed) {
        throw new Error('Το πεδίο "scheduledDate" είναι υποχρεωτικό.')
      }
      data.scheduledDate = parsed
    }

    if (hasOwn(body, "scheduledStartTime")) {
      data.scheduledStartTime = toNullableString(body.scheduledStartTime)
    }

    if (hasOwn(body, "scheduledEndTime")) {
      data.scheduledEndTime = toNullableString(body.scheduledEndTime)
    }

    if (hasOwn(body, "dueDate")) {
      data.dueDate = toNullableDate(body.dueDate, "dueDate")
    }

    if (hasOwn(body, "completedAt")) {
      data.completedAt = toNullableDate(body.completedAt, "completedAt")
    }

    if (hasOwn(body, "notes")) {
      data.notes = toNullableString(body.notes)
    }

    if (hasOwn(body, "resultNotes")) {
      data.resultNotes = toNullableString(body.resultNotes)
    }

    if (hasOwn(body, "source")) {
      data.source = toRequiredString(body.source, "source").toLowerCase()
    }

    if (hasOwn(body, "bookingId")) {
      data.bookingId = toNullableString(body.bookingId)
    }

    if (hasOwn(body, "alertEnabled")) {
      data.alertEnabled = toOptionalBoolean(body.alertEnabled)
    }

    if (hasOwn(body, "alertAt")) {
      data.alertAt = toNullableDate(body.alertAt, "alertAt")
    }

    if (hasOwn(body, "requiresPhotos")) {
      data.requiresPhotos = toOptionalBoolean(body.requiresPhotos)
    }

    if (hasOwn(body, "requiresChecklist")) {
      data.requiresChecklist = toOptionalBoolean(body.requiresChecklist)
    }

    if (hasOwn(body, "requiresApproval")) {
      data.requiresApproval = toOptionalBoolean(body.requiresApproval)
    }

    if (hasOwn(body, "sendCleaningChecklist")) {
      data.sendCleaningChecklist = toOptionalBoolean(body.sendCleaningChecklist)
    }

    if (hasOwn(body, "sendSuppliesChecklist")) {
      data.sendSuppliesChecklist = toOptionalBoolean(body.sendSuppliesChecklist)
    }

    if (hasOwn(body, "sendIssuesChecklist")) {
      data.sendIssuesChecklist = toOptionalBoolean(body.sendIssuesChecklist)
    }

    if (hasOwn(body, "usesCustomizedCleaningChecklist")) {
      data.usesCustomizedCleaningChecklist = toOptionalBoolean(body.usesCustomizedCleaningChecklist)
    }

    if (hasOwn(body, "usesCustomizedSuppliesChecklist")) {
      data.usesCustomizedSuppliesChecklist = toOptionalBoolean(body.usesCustomizedSuppliesChecklist)
    }

    if (hasOwn(body, "usesCustomizedIssuesChecklist")) {
      data.usesCustomizedIssuesChecklist = toOptionalBoolean(body.usesCustomizedIssuesChecklist)
    }

    const finalSource = String(data.source ?? existingTask.source ?? "manual")
      .trim()
      .toLowerCase()
    const finalBookingId =
      data.bookingId !== undefined
        ? toNullableString(data.bookingId)
        : existingTask.bookingId

    if (finalSource === "booking" && !finalBookingId) {
      return NextResponse.json(
        {
          error:
            'Οι εργασίες με source "booking" απαιτούν έγκυρο bookingId.',
        },
        { status: 400 }
      )
    }

    if (finalBookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: finalBookingId,
          organizationId: existingTask.organizationId,
          propertyId: existingTask.propertyId,
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

    await prisma.task.update({
      where: {
        id: taskId,
      },
      data,
    })

    await syncTaskRunsForTask(taskId)

    const payload = await getTaskPayload(taskId, access.auth)

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Task PATCH error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Αποτυχία ενημέρωσης εργασίας.",
      },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return PATCH(req, context)
}
