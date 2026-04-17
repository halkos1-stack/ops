import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access";
import {
  filterCanonicalOperationalTasks,
  getOperationalTaskValidity,
} from "@/lib/tasks/ops-task-contract";
import { buildTaskWorkWindowMap } from "@/lib/tasks/task-work-window";
import {
  computePropertyReadiness,
  getReadinessStatusLabel,
  type ReadinessConditionInput,
} from "@/lib/readiness/compute-property-readiness";
import { buildCanonicalSupplySnapshot } from "@/lib/supplies/compute-supply-state";
import {
  buildPropertyConditionSnapshot,
  mapDbConditionToRawRecord,
  type RawPropertyConditionRecord,
} from "@/lib/readiness/property-condition-mappers";
import { computePropertyOperationalStatus } from "@/lib/readiness/property-operational-status";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ExtendedRawPropertyConditionRecord = RawPropertyConditionRecord & {
  taskId?: string | null;
  bookingId?: string | null;
  propertySupplyId?: string | null;
  mergeKey?: string | null;
  description?: string | null;
  managerNotes?: string | null;
  sourceLabel?: string | null;
  sourceItemId?: string | null;
  sourceItemLabel?: string | null;
  sourceRunId?: string | null;
  sourceAnswerId?: string | null;
  firstDetectedAt?: Date | string | null;
  lastDetectedAt?: Date | string | null;
};

type LooseRecord = Record<string, unknown>;

type SortableRunItem = {
  id?: string | null;
  sortOrder?: number | null;
  label?: string | null;
  labelEn?: string | null;
};

type ChecklistRunAnswerRecord = {
  runItem?: SortableRunItem | null;
  templateItem?: SortableRunItem | null;
};

type SupplyRunAnswerRecord = {
  runItem?: SortableRunItem | null;
  propertySupply?: {
    supplyItem?: {
      name?: string | null;
      nameEl?: string | null;
      nameEn?: string | null;
    } | null;
  } | null;
};

type IssueRunAnswerRecord = {
  runItem?: SortableRunItem | null;
  templateItem?: SortableRunItem | null;
  createdAt?: Date | string | null;
};

type ChecklistRunRecord = LooseRecord & {
  status?: string | null;
  answers?: ChecklistRunAnswerRecord[] | null;
  items?: SortableRunItem[] | null;
};

type SupplyRunRecord = LooseRecord & {
  status?: string | null;
  answers?: SupplyRunAnswerRecord[] | null;
  items?: SortableRunItem[] | null;
};

type IssueRunRecord = LooseRecord & {
  status?: string | null;
  answers?: IssueRunAnswerRecord[] | null;
  items?: SortableRunItem[] | null;
  template?: {
    items?: SortableRunItem[] | null;
  } | null;
};

type PropertyTaskRecord = LooseRecord & {
  id?: string | null;
  source?: string | null;
  bookingId?: string | null;
  booking?: {
    id?: string | null;
  } | null;
  status?: string | null;
  sendCleaningChecklist?: boolean | null;
  sendSuppliesChecklist?: boolean | null;
  sendIssuesChecklist?: boolean | null;
  checklistRun?: ChecklistRunRecord | null;
  supplyRun?: SupplyRunRecord | null;
  issueRun?: IssueRunRecord | null;
};

type PropertyIssueRecord = LooseRecord & {
  status?: string | null;
  severity?: string | null;
  affectsHosting?: boolean | null;
  requiresImmediateAction?: boolean | null;
};

type PropertyBookingRecord = LooseRecord & {
  status?: string | null;
  checkInDate?: Date | string | null;
  checkOutDate?: Date | string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  sourcePlatform?: string | null;
  tasks?: Array<{ id: string }> | null;
};

type PropertyConditionDbRecord = {
  id: string;
  propertyId: string;
  taskId?: string | null;
  bookingId?: string | null;
  propertySupplyId?: string | null;
  mergeKey?: string | null;
  title: string;
  description?: string | null;
  sourceType?: string | null;
  sourceLabel?: string | null;
  sourceItemId?: string | null;
  sourceItemLabel?: string | null;
  sourceRunId?: string | null;
  sourceAnswerId?: string | null;
  conditionType: unknown;
  status: unknown;
  blockingStatus: unknown;
  severity: unknown;
  managerDecision?: unknown;
  managerNotes?: string | null;
  firstDetectedAt?: Date | string | null;
  lastDetectedAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  resolvedAt?: Date | string | null;
  dismissedAt?: Date | string | null;
};

type PropertyReadinessSource = {
  bookings?: PropertyBookingRecord[] | null;
  conditions?: PropertyConditionDbRecord[] | null;
  nextCheckInAt?: Date | string | null;
};

type ReadinessOperationalContextInput = {
  derivedReadinessStatus: "ready" | "borderline" | "not_ready" | "unknown";
  operationalReason?: string | null;
};

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();
  return text === "" ? null : text;
}

function toRequiredString(value: unknown, fieldName: string): string {
  const text = String(value ?? "").trim();

  if (!text) {
    throw new Error(`Το πεδίο "${fieldName}" είναι υποχρεωτικό.`);
  }

  return text;
}

function toNonNegativeInt(value: unknown, fallback = 0): number {
  if (value === undefined || value === null || value === "") return fallback;

  const num = Number(value);

  if (Number.isNaN(num)) return fallback;

  return Math.max(0, Math.trunc(num));
}

function normalizePropertyStatus(value: unknown): string {
  const text = String(value ?? "").trim().toLowerCase();

  if (["active", "inactive", "maintenance", "archived"].includes(text)) {
    return text;
  }

  return "active";
}

function isOpenTaskStatus(status: unknown): boolean {
  const text = String(status ?? "").trim().toLowerCase();

  return [
    "new",
    "pending",
    "assigned",
    "waiting_acceptance",
    "accepted",
    "in_progress",
  ].includes(text);
}

function isIssueOpen(status: unknown): boolean {
  const text = String(status ?? "").trim().toLowerCase();

  return !["resolved", "closed"].includes(text);
}

function isActiveBookingStatus(status: unknown): boolean {
  const text = String(status ?? "").trim().toLowerCase();
  return text !== "cancelled" && text !== "canceled";
}

function isBookingPendingTaskCreation(
  booking: PropertyBookingRecord,
  now = new Date()
): boolean {
  if (!booking || !isActiveBookingStatus(booking.status)) return false;
  if (!booking.checkOutDate) return false;

  const checkOutDate = new Date(booking.checkOutDate);
  if (Number.isNaN(checkOutDate.getTime())) return false;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  return checkOutDate >= startOfToday;
}

function isChecklistSubmitted(status: unknown): boolean {
  const text = String(status ?? "").trim().toLowerCase();

  return ["submitted", "completed"].includes(text);
}

function normalizeChecklistRun(run: ChecklistRunRecord | null | undefined) {
  if (!run) return null;

  return {
    ...run,
    answers: safeArray(run.answers)
      .map((a) => ({
        ...(a as Record<string, unknown>),
        photoUrls: normalizePhotoUrls((a as Record<string, unknown>).photoUrls),
      }))
      .sort((a, b) => {
        const aOrder = Number(
          (a as ChecklistRunAnswerRecord)?.runItem?.sortOrder ??
            (a as ChecklistRunAnswerRecord)?.templateItem?.sortOrder ??
            0
        );
        const bOrder = Number(
          (b as ChecklistRunAnswerRecord)?.runItem?.sortOrder ??
            (b as ChecklistRunAnswerRecord)?.templateItem?.sortOrder ??
            0
        );
        return aOrder - bOrder;
      }),
    items: safeArray(run.items).sort((a, b) => {
      const aOrder = Number(a?.sortOrder ?? 0);
      const bOrder = Number(b?.sortOrder ?? 0);
      return aOrder - bOrder;
    }),
  };
}

function normalizeSupplyRun(run: SupplyRunRecord | null | undefined) {
  if (!run) return null;

  return {
    ...run,
    answers: safeArray(run.answers).sort((a, b) => {
      const aName = String(
        a?.runItem?.labelEn ||
          a?.runItem?.label ||
          a?.propertySupply?.supplyItem?.nameEn ||
          a?.propertySupply?.supplyItem?.nameEl ||
          a?.propertySupply?.supplyItem?.name ||
          ""
      ).toLowerCase();

      const bName = String(
        b?.runItem?.labelEn ||
          b?.runItem?.label ||
          b?.propertySupply?.supplyItem?.nameEn ||
          b?.propertySupply?.supplyItem?.nameEl ||
          b?.propertySupply?.supplyItem?.name ||
          ""
      ).toLowerCase();

      return aName.localeCompare(bName);
    }),
    items: safeArray(run.items).sort((a, b) => {
      const aOrder = Number(a?.sortOrder ?? 0);
      const bOrder = Number(b?.sortOrder ?? 0);
      return aOrder - bOrder;
    }),
  };
}

function normalizeIssueRun(run: IssueRunRecord | null | undefined) {
  if (!run) return null;

  return {
    ...run,
    template: run.template
      ? {
          ...run.template,
          items: safeArray(run.template.items).sort((a, b) => {
            const aOrder = Number(a?.sortOrder ?? 0);
            const bOrder = Number(b?.sortOrder ?? 0);
            return aOrder - bOrder;
          }),
        }
      : null,
    items: safeArray(run.items).sort((a, b) => {
      const aOrder = Number(a?.sortOrder ?? 0);
      const bOrder = Number(b?.sortOrder ?? 0);
      return aOrder - bOrder;
    }),
    answers: safeArray(run.answers)
      .map((a) => ({
        ...(a as Record<string, unknown>),
        photoUrls: normalizePhotoUrls((a as Record<string, unknown>).photoUrls),
      }))
      .sort((a, b) => {
        const aOrder = Number(
          (a as IssueRunAnswerRecord)?.runItem?.sortOrder ??
            (a as IssueRunAnswerRecord)?.templateItem?.sortOrder ??
            0
        );
        const bOrder = Number(
          (b as IssueRunAnswerRecord)?.runItem?.sortOrder ??
            (b as IssueRunAnswerRecord)?.templateItem?.sortOrder ??
            0
        );

        if (aOrder !== bOrder) return aOrder - bOrder;

        const aCreated = new Date(
          (a as IssueRunAnswerRecord)?.createdAt || 0
        ).getTime();
        const bCreated = new Date(
          (b as IssueRunAnswerRecord)?.createdAt || 0
        ).getTime();

        return aCreated - bCreated;
      }),
  };
}

function mapTaskForPropertyPage(task: PropertyTaskRecord) {
  const checklistRun = normalizeChecklistRun(task.checklistRun);
  const supplyRun = normalizeSupplyRun(task.supplyRun);
  const issueRun = normalizeIssueRun(task.issueRun);

  return {
    ...task,
    checklistRun,
    supplyRun,
    issueRun,
    cleaningChecklistRun: checklistRun,
    suppliesChecklistRun: supplyRun,
    issuesChecklistRun: issueRun,
  };
}

function mapIssueForPropertyPage(issue: PropertyIssueRecord) {
  return {
    ...issue,
    affectsHosting: Boolean(issue?.affectsHosting ?? false),
    requiresImmediateAction: Boolean(issue?.requiresImmediateAction ?? false),
  };
}

function normalizeConditionType(value: unknown): "supply" | "issue" | "damage" {
  if (value === "supply" || value === "issue" || value === "damage") {
    return value;
  }

  return "issue";
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
    return value;
  }

  return "open";
}

function normalizeConditionBlockingStatus(
  value: unknown
): "blocking" | "non_blocking" | "warning" {
  if (
    value === "blocking" ||
    value === "non_blocking" ||
    value === "warning"
  ) {
    return value;
  }

  return "warning";
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
    return value;
  }

  return "medium";
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
    return value;
  }

  return null;
}

function mapRawConditionToReadinessInput(
  condition: ExtendedRawPropertyConditionRecord
): ReadinessConditionInput {
  return {
    id: condition.id,
    propertyId: condition.propertyId,
    conditionType: normalizeConditionType(condition.conditionType),
    status: normalizeConditionStatus(condition.status),
    blockingStatus: normalizeConditionBlockingStatus(condition.blockingStatus),
    severity: normalizeConditionSeverity(condition.severity),
    managerDecision: normalizeConditionManagerDecision(
      condition.managerDecision
    ),
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
  };
}

function mapDbConditionToExtended(condition: {
  id: string;
  propertyId: string;
  taskId: string | null;
  bookingId: string | null;
  propertySupplyId: string | null;
  mergeKey: string | null;
  title: string;
  description: string | null;
  sourceType: string;
  sourceLabel: string | null;
  sourceItemId: string | null;
  sourceItemLabel: string | null;
  sourceRunId: string | null;
  sourceAnswerId: string | null;
  conditionType: string;
  status: string;
  blockingStatus: string;
  severity: string;
  managerDecision: string | null;
  managerNotes: string | null;
  firstDetectedAt: Date | string | null;
  lastDetectedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  resolvedAt: Date | string | null;
  dismissedAt: Date | string | null;
}): ExtendedRawPropertyConditionRecord {
  const base = mapDbConditionToRawRecord(condition);
  return {
    ...base,
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
    firstDetectedAt: condition.firstDetectedAt,
    lastDetectedAt: condition.lastDetectedAt,
  };
}

function buildPropertyReadinessFromConditions(
  property: PropertyReadinessSource,
  operationalContext?: ReadinessOperationalContextInput
) {
  const now = new Date();

  const bookings = safeArray(property.bookings);
  const nextBooking =
    bookings
      .filter((booking) => {
        if (!booking.checkInDate) return false;
        if (!isActiveBookingStatus(booking.status)) return false;
        const checkInDate = new Date(booking.checkInDate);
        return !Number.isNaN(checkInDate.getTime()) && checkInDate >= now;
      })
      .sort(
        (a, b) =>
          new Date(a.checkInDate ?? 0).getTime() -
          new Date(b.checkInDate ?? 0).getTime()
      )[0] || null;

  const rawConditions: ExtendedRawPropertyConditionRecord[] = safeArray(
    property.conditions
  ).map((condition) =>
    mapDbConditionToExtended({
      id: condition.id,
      propertyId: condition.propertyId,
      taskId: condition.taskId ?? null,
      bookingId: condition.bookingId ?? null,
      propertySupplyId: condition.propertySupplyId ?? null,
      mergeKey: condition.mergeKey ?? null,
      title: condition.title,
      description: condition.description ?? null,
      sourceType: condition.sourceType ?? "",
      sourceLabel: condition.sourceLabel ?? null,
      sourceItemId: condition.sourceItemId ?? null,
      sourceItemLabel: condition.sourceItemLabel ?? null,
      sourceRunId: condition.sourceRunId ?? null,
      sourceAnswerId: condition.sourceAnswerId ?? null,
      conditionType: String(condition.conditionType).toLowerCase(),
      status: String(condition.status).toLowerCase(),
      blockingStatus: String(condition.blockingStatus).toLowerCase(),
      severity: String(condition.severity).toLowerCase(),
      managerDecision: condition.managerDecision
        ? String(condition.managerDecision).toLowerCase()
        : null,
      managerNotes: condition.managerNotes ?? null,
      firstDetectedAt: condition.firstDetectedAt ?? null,
      lastDetectedAt: condition.lastDetectedAt ?? null,
      createdAt: condition.createdAt ?? new Date(0),
      updatedAt: condition.updatedAt ?? new Date(0),
      resolvedAt: condition.resolvedAt ?? null,
      dismissedAt: condition.dismissedAt ?? null,
    })
  );

  const conditionSnapshot = buildPropertyConditionSnapshot(rawConditions);

  const readiness = computePropertyReadiness({
    now,
    nextCheckInAt: nextBooking?.checkInDate ?? property.nextCheckInAt ?? null,
    conditions: rawConditions.map((condition) =>
      mapRawConditionToReadinessInput(condition)
    ),
    operationalContext: operationalContext ?? undefined,
  });

  return {
    status: readiness.status,
    statusLabel: getReadinessStatusLabel(readiness.status, "el"),
    readinessUpdatedAt: readiness.computedAt,
    readinessReasonsText: readiness.reasons
      .map((reason) => reason.message)
      .join("\n"),
    nextCheckInAt: readiness.nextCheckInAt,
    score: readiness.score,
    explain: readiness.explain,
    reasons: readiness.reasons,
    nextActions: readiness.nextActions,
    counts: readiness.counts,
    conditionSnapshot,
    nextBooking: nextBooking
      ? {
          id: nextBooking.id,
          guestName: nextBooking.guestName,
          checkInDate: nextBooking.checkInDate,
          checkOutDate: nextBooking.checkOutDate,
          status: nextBooking.status,
          checkInTime: nextBooking.checkInTime,
          checkOutTime: nextBooking.checkOutTime,
          sourcePlatform: nextBooking.sourcePlatform,
        }
      : null,
  };
}

async function getPropertyBase(id: string) {
  return prisma.property.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      defaultPartnerId: true,
    },
  });
}

async function getFullProperty(id: string) {
  const property = await prisma.property.findUnique({
    where: { id },
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
      type: true,
      status: true,
      bedrooms: true,
      bathrooms: true,
      maxGuests: true,
      notes: true,
      defaultPartnerId: true,
      readinessStatus: true,
      readinessUpdatedAt: true,
      readinessReasonsText: true,
      openConditionCount: true,
      openBlockingConditionCount: true,
      openWarningConditionCount: true,
      nextCheckInAt: true,
      createdAt: true,
      updatedAt: true,

      defaultPartner: {
        select: {
          id: true,
          code: true,
          name: true,
          email: true,
          phone: true,
          specialty: true,
          status: true,
          notes: true,
        },
      },

      bookings: {
        orderBy: {
          checkInDate: "asc",
        },
        take: 20,
        select: {
          id: true,
          guestName: true,
          checkInDate: true,
          checkOutDate: true,
          status: true,
          checkInTime: true,
          checkOutTime: true,
          sourcePlatform: true,
          externalBookingId: true,
          tasks: {
            select: {
              id: true,
            },
            take: 5,
          },
        },
      },

      tasks: {
        orderBy: {
          scheduledDate: "desc",
        },
        take: 50,
        select: {
          id: true,
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
          requiresApproval: true,
          requiresChecklist: true,
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

          booking: {
            select: {
              id: true,
              guestName: true,
              checkInDate: true,
              checkOutDate: true,
              status: true,
              checkInTime: true,
              checkOutTime: true,
            },
          },

          assignments: {
            orderBy: {
              assignedAt: "desc",
            },
            select: {
              id: true,
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
                  runItemId: true,
                  templateItemId: true,
                  issueCreated: true,
                  valueBoolean: true,
                  valueText: true,
                  valueNumber: true,
                  valueSelect: true,
                  notes: true,
                  photoUrls: true,
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
                  runItemId: true,
                  propertySupplyId: true,
                  fillLevel: true,
                  quantityValue: true,
                  notes: true,
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
                    orderBy: {
                      sortOrder: "asc",
                    },
                    select: {
                      id: true,
                      label: true,
                      labelEn: true,
                      sortOrder: true,
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
                  runItemId: true,
                  templateItemId: true,
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
        },
      },

      issues: {
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
        select: {
          id: true,
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
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      },

      conditions: {
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
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
          locationText: true,
          status: true,
          blockingStatus: true,
          severity: true,
          managerDecision: true,
          managerNotes: true,
          evidence: true,
          firstDetectedAt: true,
          lastDetectedAt: true,
          resolvedAt: true,
          dismissedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },

      checklistTemplates: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          description: true,
          templateType: true,
          isPrimary: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
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
            },
          },
        },
      },

      issueTemplates: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          description: true,
          isPrimary: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
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
      },

      propertySupplies: {
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          currentStock: true,
          stateMode: true,
          mediumThreshold: true,
          fullThreshold: true,
          targetStock: true,
          reorderThreshold: true,
          minimumThreshold: true,
          trackingMode: true,
          isCritical: true,
          notes: true,
          updatedAt: true,
          lastUpdatedAt: true,
          fillLevel: true,
          isActive: true,
          targetLevel: true,
          warningThreshold: true,
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
  });

  if (!property) return null;

  const taskWorkWindowMap = buildTaskWorkWindowMap(
    safeArray(property.tasks),
    safeArray(property.bookings)
  );

  const allNormalizedTasks = safeArray(property.tasks).map((task) => {
    const normalizedTask = mapTaskForPropertyPage(task);
    const taskId = toNullableString(task.id);

    return {
      ...normalizedTask,
      workWindow: taskId ? taskWorkWindowMap[taskId] ?? null : null,
    };
  });
  const normalizedTasks = filterCanonicalOperationalTasks(allNormalizedTasks);
  const invalidOperationalTasks = allNormalizedTasks.filter(
    (task) => getOperationalTaskValidity(task).isCanonicalOperational !== true
  );

  const normalizedIssues = safeArray(property.issues).map((issue) =>
    mapIssueForPropertyPage(issue)
  );

  const normalizedSupplies = safeArray(property.propertySupplies)
    .filter((supply) => Boolean(supply?.isActive))
    .map((supply) => {
      const canonical = buildCanonicalSupplySnapshot({
        isActive: supply.isActive,
        stateMode: supply.stateMode,
        fillLevel: supply.fillLevel,
        currentStock: supply.currentStock,
        mediumThreshold: supply.mediumThreshold,
        fullThreshold: supply.fullThreshold,
        minimumThreshold: supply.minimumThreshold,
        reorderThreshold: supply.reorderThreshold,
        warningThreshold: supply.warningThreshold,
        targetLevel: supply.targetLevel,
        targetStock: supply.targetStock,
        trackingMode: supply.trackingMode,
        supplyMinimumStock: supply.supplyItem?.minimumStock,
      });

      return {
        ...supply,
        currentStock: canonical.currentStock ?? Number(supply.currentStock || 0),
        stateMode: canonical.stateMode,
        mediumThreshold: canonical.mediumThreshold,
        fullThreshold: canonical.fullThreshold,
        threshold:
          canonical.mediumThreshold ??
          supply.minimumThreshold ??
          supply.reorderThreshold ??
          supply.supplyItem?.minimumStock ??
          null,
        derivedState: canonical.derivedState,
      };
    });

  const openTasks = normalizedTasks.filter((task) =>
    isOpenTaskStatus(task.status)
  );

  const openIssues = normalizedIssues.filter((issue) =>
    isIssueOpen(issue.status)
  );

  const pendingCleaningTasks = openTasks.filter(
    (task) => task.sendCleaningChecklist === true
  );

  const pendingSuppliesTasks = openTasks.filter(
    (task) => task.sendSuppliesChecklist === true
  );

  const pendingIssuesTasks = openTasks.filter(
    (task) => task.sendIssuesChecklist === true
  );

  const pendingProofTasks = openTasks.filter((task) => {
    const cleaningPending =
      task.sendCleaningChecklist === true &&
      !isChecklistSubmitted(task.cleaningChecklistRun?.status);

    const suppliesPending =
      task.sendSuppliesChecklist === true &&
      !isChecklistSubmitted(task.suppliesChecklistRun?.status);

    const issuesPending =
      task.sendIssuesChecklist === true &&
      !isChecklistSubmitted(task.issuesChecklistRun?.status);

    return cleaningPending || suppliesPending || issuesPending;
  });

  const missingCriticalSupplies = normalizedSupplies.filter((supply) => {
    if (!supply.isCritical) return false;
    return ["missing", "empty", "low"].includes(String(supply.derivedState));
  });

  const mediumSupplies = normalizedSupplies.filter((supply) => {
    return ["medium", "low"].includes(String(supply.derivedState));
  });

  const operationalStatusResult = computePropertyOperationalStatus({
    readinessStatus: null,
    bookings: safeArray(property.bookings).map((b) => ({
      id: b.id,
      status: b.status ?? null,
      checkInDate: b.checkInDate ?? null,
      checkOutDate: b.checkOutDate ?? null,
      guestName: b.guestName ?? null,
    })),
    tasks: normalizedTasks.map((t) => {
      const task = t as LooseRecord;
      const assignments = Array.isArray(task.assignments)
        ? (task.assignments as Array<{ status?: string | null }>)
        : [];
      const checklistRun = (task.checklistRun ?? null) as {
        status?: string | null;
      } | null;
      const supplyRun = (task.supplyRun ?? null) as {
        status?: string | null;
      } | null;
      const issueRun = (task.issueRun ?? null) as {
        status?: string | null;
      } | null;

      return {
        id: String(task.id ?? ""),
        title: String(task.title ?? ""),
        taskType: String(task.taskType ?? ""),
        status: String(task.status ?? ""),
        scheduledDate: (task.scheduledDate as Date | null) ?? null,
        sendCleaningChecklist: Boolean(task.sendCleaningChecklist),
        sendSuppliesChecklist: Boolean(task.sendSuppliesChecklist),
        sendIssuesChecklist: Boolean(task.sendIssuesChecklist),
        alertEnabled: Boolean(task.alertEnabled),
        alertAt: (task.alertAt as Date | null) ?? null,
        completedAt: (task.completedAt as Date | null) ?? null,
        bookingId: (task.bookingId as string | null) ?? null,
        latestAssignmentStatus: assignments[0]?.status ?? null,
        checklistRunStatus: checklistRun?.status ?? null,
        supplyRunStatus: supplyRun?.status ?? null,
        issueRunStatus: issueRun?.status ?? null,
      };
    }),
  });

  const readinessComputed = buildPropertyReadinessFromConditions(
    {
      bookings: property.bookings,
      conditions: property.conditions,
      nextCheckInAt: property.nextCheckInAt,
    },
    operationalStatusResult.derivedReadinessStatus !== "unknown"
      ? {
          derivedReadinessStatus: operationalStatusResult.derivedReadinessStatus,
          operationalReason: operationalStatusResult.reason.en,
        }
      : undefined
  );

  const normalizedChecklistTemplates = safeArray(property.checklistTemplates);

  const normalizedIssueTemplates = safeArray(property.issueTemplates);
  const normalizedBookings = safeArray(property.bookings).map((booking) => {
    const linkedTasks = safeArray(booking.tasks);

    return {
      ...booking,
      tasks: linkedTasks,
      taskCount: linkedTasks.length,
      hasTask: linkedTasks.length > 0,
    };
  });
  const bookingsWithoutTask = normalizedBookings
    .filter((booking) => isBookingPendingTaskCreation(booking))
    .filter((booking) => booking.hasTask !== true);

  const cleaningTemplate =
    normalizedChecklistTemplates.find((template) => {
      const templateType = String(template?.templateType || "")
        .trim()
        .toLowerCase();

      return template?.isPrimary === true && templateType === "cleaning";
    }) || null;

  const issuesTemplate =
    normalizedIssueTemplates.find((template) => {
      return template?.isPrimary === true;
    }) || null;

  const canonicalConditions = readinessComputed.conditionSnapshot.conditions;
  const canonicalConditionSummary = readinessComputed.conditionSnapshot.summary;

  return {
    ...property,
    // Canonical condition surface — αντικαθιστά το raw DB conditions spread
    conditions: canonicalConditions,
    openConditionCount: canonicalConditionSummary.active,
    openBlockingConditionCount: canonicalConditionSummary.blocking,
    openWarningConditionCount: canonicalConditionSummary.warning,

    bookings: normalizedBookings,
    bookingsWithoutTask,
    bookingsWithoutTaskCount: bookingsWithoutTask.length,
    tasks: normalizedTasks,
    auditSummary: {
      invalidOperationalTaskCount: invalidOperationalTasks.length,
    },
    issues: normalizedIssues,
    propertySupplies: normalizedSupplies,

    cleaningTemplate,
    issuesTemplate,

    checklistHints: {
      cleaning: "Επιβεβαίωση καθαριότητας και ετοιμότητας χώρου",
      supplies: "Καταγραφή επιπέδου αναλωσίμων",
      issues: "Αναφορά ζημιών, βλαβών ή προβλημάτων",
    },

    operationalStatus: operationalStatusResult.operationalStatus,
    operationalStatusLabel: operationalStatusResult.label,
    operationalStatusReason: operationalStatusResult.reason,
    operationalStatusExplanation: operationalStatusResult.explanation,
    operationalAlertActive: operationalStatusResult.alertActive,
    operationalAlertTask: operationalStatusResult.alertTask,
    operationalActiveBooking: operationalStatusResult.activeBooking,
    operationalRelevantTask: operationalStatusResult.relevantTask,

    readinessStatus: readinessComputed.status,
    readinessUpdatedAt: readinessComputed.readinessUpdatedAt,
    readinessReasonsText: readinessComputed.readinessReasonsText,
    nextCheckInAt: readinessComputed.nextCheckInAt,
    nextBooking: readinessComputed.nextBooking,
    readinessSummary: {
      status: readinessComputed.status,
      statusLabel: readinessComputed.statusLabel,
      score: readinessComputed.score,
      explain: readinessComputed.explain,
      reasons: readinessComputed.reasons,
      nextActions: readinessComputed.nextActions,
      counts: readinessComputed.counts,
      counters: {
        openTasks: openTasks.length,
        pendingCleaningTasks: pendingCleaningTasks.length,
        pendingSuppliesTasks: pendingSuppliesTasks.length,
        pendingIssuesTasks: pendingIssuesTasks.length,
        pendingProofTasks: pendingProofTasks.length,
        bookingsWithoutTask: bookingsWithoutTask.length,
        openIssues: openIssues.length,
        criticalIssues: openIssues.filter((issue) =>
          ["high", "urgent", "critical"].includes(
            String(issue.severity || "").trim().toLowerCase()
          )
        ).length,
        missingCriticalSupplies: missingCriticalSupplies.length,
        mediumSupplies: mediumSupplies.length,
      },
      conditions: {
        summary: canonicalConditionSummary,
        reasons: readinessComputed.conditionSnapshot.reasons,
        active: readinessComputed.conditionSnapshot.buckets.active,
        blocking: readinessComputed.conditionSnapshot.buckets.blocking,
        warning: readinessComputed.conditionSnapshot.buckets.warning,
        monitoring: readinessComputed.conditionSnapshot.buckets.monitoring,
      },
    },
  };
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess();

    if (!access.ok) {
      return access.response;
    }

    const auth = access.auth;
    const { id } = await context.params;

    const base = await getPropertyBase(id);

    if (!base) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      );
    }

    if (!canAccessOrganization(auth, base.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      );
    }

    const property = await getFullProperty(id);

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      );
    }

    return NextResponse.json({ property });
  } catch (error) {
    console.error("GET /api/properties/[id] error:", error);

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης ακινήτου." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess();

    if (!access.ok) {
      return access.response;
    }

    const auth = access.auth;
    const { id } = await context.params;
    const body = await req.json();

    const existing = await getPropertyBase(id);

    if (!existing) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      );
    }

    if (!canAccessOrganization(auth, existing.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      );
    }

    const code = toRequiredString(body.code, "code");
    const name = toRequiredString(body.name, "name");
    const address = toRequiredString(body.address, "address");
    const city = toRequiredString(body.city, "city");
    const region = toRequiredString(body.region, "region");
    const postalCode = toRequiredString(body.postalCode, "postalCode");
    const country = toRequiredString(body.country, "country");
    const type = toRequiredString(body.type, "type");
    const status = normalizePropertyStatus(body.status);
    const bedrooms = toNonNegativeInt(body.bedrooms, 0);
    const bathrooms = toNonNegativeInt(body.bathrooms, 0);
    const maxGuests = toNonNegativeInt(body.maxGuests, 0);
    const notes = toNullableString(body.notes);
    const defaultPartnerId = toNullableString(body.defaultPartnerId);

    const duplicateCode = await prisma.property.findFirst({
      where: {
        organizationId: existing.organizationId,
        code,
        NOT: {
          id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateCode) {
      return NextResponse.json(
        { error: "Υπάρχει ήδη άλλο ακίνητο με αυτόν τον κωδικό." },
        { status: 400 }
      );
    }

    if (defaultPartnerId) {
      const partner = await prisma.partner.findFirst({
        where: {
          id: defaultPartnerId,
          organizationId: existing.organizationId,
        },
        select: {
          id: true,
        },
      });

      if (!partner) {
        return NextResponse.json(
          {
            error:
              "Ο προεπιλεγμένος συνεργάτης δεν ανήκει στον ίδιο οργανισμό.",
          },
          { status: 400 }
        );
      }
    }

    await prisma.property.update({
      where: { id },
      data: {
        code,
        name,
        address,
        city,
        region,
        postalCode,
        country,
        type,
        status,
        bedrooms,
        bathrooms,
        maxGuests,
        notes,
        defaultPartnerId,
      },
    });

    const property = await getFullProperty(id);

    return NextResponse.json({
      success: true,
      property,
    });
  } catch (error) {
    console.error("PUT /api/properties/[id] error:", error);

    const message =
      error instanceof Error ? error.message : "Αποτυχία ενημέρωσης ακινήτου.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess();

    if (!access.ok) {
      return access.response;
    }

    const auth = access.auth;
    const { id } = await context.params;
    const body = await req.json();

    const existing = await getPropertyBase(id);

    if (!existing) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      );
    }

    if (!canAccessOrganization(auth, existing.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      );
    }

    const data: {
      code?: string;
      name?: string;
      address?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      type?: string;
      status?: string;
      bedrooms?: number;
      bathrooms?: number;
      maxGuests?: number;
      notes?: string | null;
      defaultPartnerId?: string | null;
    } = {};

    if ("code" in body) data.code = toRequiredString(body.code, "code");
    if ("name" in body) data.name = toRequiredString(body.name, "name");
    if ("address" in body) {
      data.address = toRequiredString(body.address, "address");
    }
    if ("city" in body) data.city = toRequiredString(body.city, "city");
    if ("region" in body) data.region = toRequiredString(body.region, "region");
    if ("postalCode" in body) {
      data.postalCode = toRequiredString(body.postalCode, "postalCode");
    }
    if ("country" in body) {
      data.country = toRequiredString(body.country, "country");
    }
    if ("type" in body) data.type = toRequiredString(body.type, "type");
    if ("status" in body) data.status = normalizePropertyStatus(body.status);
    if ("bedrooms" in body) data.bedrooms = toNonNegativeInt(body.bedrooms, 0);
    if ("bathrooms" in body) {
      data.bathrooms = toNonNegativeInt(body.bathrooms, 0);
    }
    if ("maxGuests" in body) {
      data.maxGuests = toNonNegativeInt(body.maxGuests, 0);
    }
    if ("notes" in body) data.notes = toNullableString(body.notes);
    if ("defaultPartnerId" in body) {
      data.defaultPartnerId = toNullableString(body.defaultPartnerId);
    }

    if (data.code) {
      const duplicateCode = await prisma.property.findFirst({
        where: {
          organizationId: existing.organizationId,
          code: data.code,
          NOT: {
            id,
          },
        },
        select: {
          id: true,
        },
      });

      if (duplicateCode) {
        return NextResponse.json(
          { error: "Υπάρχει ήδη άλλο ακίνητο με αυτόν τον κωδικό." },
          { status: 400 }
        );
      }
    }

    if (data.defaultPartnerId) {
      const partner = await prisma.partner.findFirst({
        where: {
          id: data.defaultPartnerId,
          organizationId: existing.organizationId,
        },
        select: {
          id: true,
        },
      });

      if (!partner) {
        return NextResponse.json(
          {
            error:
              "Ο προεπιλεγμένος συνεργάτης δεν ανήκει στον ίδιο οργανισμό.",
          },
          { status: 400 }
        );
      }
    }

    await prisma.property.update({
      where: { id },
      data,
    });

    const property = await getFullProperty(id);

    return NextResponse.json({
      success: true,
      property,
    });
  } catch (error) {
    console.error("PATCH /api/properties/[id] error:", error);

    const message =
      error instanceof Error ? error.message : "Αποτυχία ενημέρωσης ακινήτου.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
