import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  buildTenantWhere,
  requireApiAppAccess,
  type RouteAccessContext,
} from "@/lib/route-access"
import { filterCanonicalOperationalTasks, getOperationalTaskValidity } from "@/lib/tasks/ops-task-contract"
import {
  buildPropertyConditionSnapshot,
  mapDbConditionToRawRecord,
  type RawPropertyConditionRecord,
} from "@/lib/readiness/property-condition-mappers"
import {
  syncTaskChecklistRun,
  syncTaskSupplyRun,
  syncTaskIssueRun,
} from "@/lib/tasks/task-run-sync"
import {
  computePropertyReadiness,
  getReadinessStatusLabel,
  type ReadinessConditionInput,
} from "@/lib/readiness/compute-property-readiness"
import { computePropertyOperationalStatus } from "@/lib/readiness/property-operational-status"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"

type RouteContext = {
  params: Promise<{
    taskId: string
  }>
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

function mapDbConditionToExtended(condition: {
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
  const toNS = (v: unknown) => { const s = String(v ?? "").trim(); return s || null }
  const base = mapDbConditionToRawRecord(condition)
  return {
    ...base,
    taskId: condition.taskId,
    bookingId: condition.bookingId,
    propertySupplyId: condition.propertySupplyId,
    mergeKey: condition.mergeKey ?? null,
    description: condition.description,
    managerNotes: toNS(condition.managerNotes),
    sourceLabel: toNS(condition.sourceLabel),
    sourceItemId: toNS(condition.sourceItemId),
    sourceItemLabel: toNS(condition.sourceItemLabel),
    sourceRunId: toNS(condition.sourceRunId),
    sourceAnswerId: toNS(condition.sourceAnswerId),
    firstDetectedAt: condition.firstDetectedAt ?? null,
    lastDetectedAt: condition.lastDetectedAt ?? null,
  }
}

function mapRawConditionToReadinessInput(
  condition: ExtendedRawPropertyConditionRecord
): ReadinessConditionInput {
  return {
    id: condition.id,
    propertyId: condition.propertyId,
    conditionType: condition.conditionType as "supply" | "issue" | "damage",
    status: condition.status as "open" | "monitoring" | "resolved" | "dismissed",
    blockingStatus: condition.blockingStatus as "blocking" | "non_blocking" | "warning",
    severity: condition.severity as "low" | "medium" | "high" | "critical",
    managerDecision: (condition.managerDecision ?? null) as
      | "allow_with_issue"
      | "block_until_resolved"
      | "monitor"
      | "resolved"
      | "dismissed"
      | null,
    title: condition.title ?? null,
    description: condition.description ?? condition.managerNotes ?? null,
    firstDetectedAt: condition.firstDetectedAt ?? null,
    lastDetectedAt: condition.lastDetectedAt ?? null,
    createdAt: condition.createdAt ?? null,
    updatedAt: condition.updatedAt ?? null,
    resolvedAt: condition.resolvedAt ?? null,
    dismissedAt: condition.dismissedAt ?? null,
    sourceType: condition.sourceType ?? null,
    sourceLabel: condition.sourceLabel ?? null,
    sourceItemId: condition.sourceItemId ?? null,
    sourceItemLabel: condition.sourceItemLabel ?? null,
    sourceRunId: condition.sourceRunId ?? null,
    sourceAnswerId: condition.sourceAnswerId ?? null,
    taskId: condition.taskId ?? null,
    bookingId: condition.bookingId ?? null,
    propertySupplyId: condition.propertySupplyId ?? null,
    mergeKey: condition.mergeKey ?? null,
  }
}

async function resolveTaskId(context: RouteContext) {
  const params = await context.params
  return String(params.taskId || "").trim()
}

async function getTaskPayload(taskId: string, auth: RouteAccessContext) {
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
          nextCheckInAt: true,
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
          notes: true,
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

  const propertyBookingsPromise = task.propertyId
    ? prisma.booking.findMany({
        where: { propertyId: task.propertyId, ...tenantWhere },
        select: { id: true, status: true, checkInDate: true, checkOutDate: true, guestName: true },
        orderBy: { checkInDate: "asc" },
        take: 20,
      })
    : Promise.resolve(
        [] as { id: string; status: string | null; checkInDate: Date | null; checkOutDate: Date | null; guestName: string | null }[]
      )

  const propertyAllTasksPromise = task.propertyId
    ? prisma.task.findMany({
        where: { propertyId: task.propertyId, ...tenantWhere },
        select: {
          id: true,
          title: true,
          taskType: true,
          source: true,
          status: true,
          scheduledDate: true,
          sendCleaningChecklist: true,
          sendSuppliesChecklist: true,
          sendIssuesChecklist: true,
          alertEnabled: true,
          alertAt: true,
          completedAt: true,
          bookingId: true,
          assignments: {
            select: { status: true },
            orderBy: { assignedAt: "desc" },
            take: 1,
          },
          checklistRun: { select: { status: true } },
          supplyRun: { select: { status: true } },
          issueRun: { select: { status: true } },
        },
        orderBy: { scheduledDate: "desc" },
        take: 50,
      })
    : Promise.resolve(
        [] as {
          id: string; title: string; taskType: string; source: string; status: string;
          scheduledDate: Date | null; sendCleaningChecklist: boolean; sendSuppliesChecklist: boolean;
          sendIssuesChecklist: boolean; alertEnabled: boolean; alertAt: Date | null;
          completedAt: Date | null; bookingId: string | null;
          assignments: { status: string }[];
          checklistRun: { status: string } | null;
          supplyRun: { status: string } | null;
          issueRun: { status: string } | null;
        }[]
      )

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
        updatedAt: true,
      },
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

  const [propertyBookings, propertyAllTasks] = await Promise.all([
    propertyBookingsPromise,
    propertyAllTasksPromise,
  ])

  const cleanedChecklistRun = sortChecklistRun(task.checklistRun)
  const cleanedSupplyRun = sortSupplyRun(task.supplyRun)
  const cleanedIssueRun = sortIssueRun(task.issueRun)

  const propertyConditionSnapshot = buildPropertyConditionSnapshot(
    propertyConditions.map((condition) =>
      mapDbConditionToExtended({
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
        conditionType: condition.conditionType,
        status: condition.status,
        blockingStatus: condition.blockingStatus,
        severity: condition.severity,
        managerDecision: condition.managerDecision,
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

  const normalizedPropertyTasks = filterCanonicalOperationalTasks(
    propertyAllTasks.map((t) => ({
      ...t,
      cleaningChecklistRun: t.checklistRun ?? null,
      suppliesChecklistRun: t.supplyRun ?? null,
      issuesChecklistRun: t.issueRun ?? null,
    })) as LooseRecord[]
  )

  const operationalStatusResult = computePropertyOperationalStatus({
    readinessStatus: null,
    bookings: propertyBookings.map((b) => ({
      id: b.id,
      status: b.status as string | null,
      checkInDate: b.checkInDate ?? null,
      checkOutDate: b.checkOutDate ?? null,
      guestName: b.guestName ?? null,
    })),
    tasks: normalizedPropertyTasks.map((t) => {
      const assignments = Array.isArray(t.assignments)
        ? (t.assignments as Array<{ status?: string | null }>)
        : []
      const checklistRun = (t.checklistRun ?? t.cleaningChecklistRun) as { status?: string | null } | null
      const supplyRun = (t.supplyRun ?? t.suppliesChecklistRun) as { status?: string | null } | null
      const issueRun = (t.issueRun ?? t.issuesChecklistRun) as { status?: string | null } | null
      return {
        id: String(t.id ?? ""),
        title: String(t.title ?? ""),
        taskType: String(t.taskType ?? ""),
        status: String(t.status ?? ""),
        scheduledDate: (t.scheduledDate as Date | null) ?? null,
        sendCleaningChecklist: Boolean(t.sendCleaningChecklist),
        sendSuppliesChecklist: Boolean(t.sendSuppliesChecklist),
        sendIssuesChecklist: Boolean(t.sendIssuesChecklist),
        alertEnabled: Boolean(t.alertEnabled),
        alertAt: (t.alertAt as Date | null) ?? null,
        completedAt: (t.completedAt as Date | null) ?? null,
        bookingId: (t.bookingId as string | null) ?? null,
        latestAssignmentStatus: assignments[0]?.status ?? null,
        checklistRunStatus: checklistRun?.status ?? null,
        supplyRunStatus: supplyRun?.status ?? null,
        issueRunStatus: issueRun?.status ?? null,
      }
    }),
  })

  const readinessConditionInputs: ReadinessConditionInput[] = propertyConditions.map(
    (condition) =>
      mapRawConditionToReadinessInput(
        mapDbConditionToExtended({
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

  const readinessResult = computePropertyReadiness({
    now: new Date(),
    nextCheckInAt: task.property?.nextCheckInAt ?? null,
    conditions: readinessConditionInputs,
    operationalContext:
      operationalStatusResult.derivedReadinessStatus !== "unknown"
        ? {
            derivedReadinessStatus: operationalStatusResult.derivedReadinessStatus,
            operationalReason: operationalStatusResult.reason.en,
          }
        : undefined,
  })

  const warnings: Array<{ code: string; title: string; message: string; severity: string }> = []

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
    property: task.property
      ? {
          id: task.property.id,
          code: task.property.code,
          name: task.property.name,
          address: task.property.address,
          city: task.property.city,
          region: task.property.region,
          postalCode: task.property.postalCode,
          country: task.property.country,
          type: task.property.type,
          status: task.property.status,
          nextCheckInAt: task.property.nextCheckInAt,
          defaultPartner: task.property.defaultPartner,
          readinessStatus: readinessResult.status,
          readinessUpdatedAt: readinessResult.computedAt,
          readinessReasonsText: readinessResult.reasons.map((r) => r.message).join("\n"),
          openConditionCount: propertyConditionSnapshot.summary.active,
          openBlockingConditionCount: propertyConditionSnapshot.summary.blocking,
          openWarningConditionCount: propertyConditionSnapshot.summary.warning,
        }
      : null,
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
    legacyIssues: issues,
    warnings,
    readiness: {
      status: readinessResult.status,
      statusLabel: getReadinessStatusLabel(readinessResult.status, "el"),
      score: readinessResult.score,
      explain: readinessResult.explain,
      reasons: readinessResult.reasons,
      reasonSummary: readinessResult.reasons.map((r) => r.message),
      summary: readinessResult.reasons.map((r) => r.message).join(" · ") || null,
      blockingCount: propertyConditionSnapshot.summary.blocking,
      warningCount: propertyConditionSnapshot.summary.warning,
      openConditionsCount: propertyConditionSnapshot.summary.active,
      nextCheckInAt: task.property?.nextCheckInAt ?? readinessResult.nextCheckInAt ?? null,
    },
    sendCleaningChecklist: Boolean(task.sendCleaningChecklist),
    sendSuppliesChecklist: Boolean(task.sendSuppliesChecklist),
    sendIssuesChecklist: Boolean(task.sendIssuesChecklist),
  }

  return {
    task: shapedTask,
  }
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const access = await requireApiAppAccess()
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
  const access = await requireApiAppAccess()
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
        sendCleaningChecklist: true,
        sendSuppliesChecklist: true,
        sendIssuesChecklist: true,
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

    const finalSendCleaningChecklist = data.sendCleaningChecklist !== undefined
      ? Boolean(data.sendCleaningChecklist)
      : existingTask.sendCleaningChecklist
    const finalSendSuppliesChecklist = data.sendSuppliesChecklist !== undefined
      ? Boolean(data.sendSuppliesChecklist)
      : existingTask.sendSuppliesChecklist
    const finalSendIssuesChecklist = data.sendIssuesChecklist !== undefined
      ? Boolean(data.sendIssuesChecklist)
      : existingTask.sendIssuesChecklist

    await syncTaskChecklistRun({
      taskId,
      organizationId: existingTask.organizationId ?? "",
      propertyId: existingTask.propertyId,
      sendCleaningChecklist: finalSendCleaningChecklist,
    })
    await syncTaskSupplyRun({
      taskId,
      propertyId: existingTask.propertyId,
      sendSuppliesChecklist: finalSendSuppliesChecklist,
    })
    await syncTaskIssueRun({
      taskId,
      organizationId: existingTask.organizationId ?? "",
      propertyId: existingTask.propertyId,
      sendIssuesChecklist: finalSendIssuesChecklist,
    })

    try {
      await refreshPropertyReadiness(existingTask.propertyId)
    } catch (readinessError) {
      console.warn("Task PATCH: readiness refresh failed (non-critical):", readinessError)
    }

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
