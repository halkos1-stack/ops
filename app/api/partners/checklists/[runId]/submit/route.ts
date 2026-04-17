import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireApiPartnerAccess,
  canPartnerAccessChecklistRun,
} from "@/lib/partner-route-access";
import {
  createPropertyConditionsFromRun,
  type RunConditionAnswerInput,
  type CreatedOrUpdatedPropertyConditionResult,
} from "@/lib/checklists/create-property-conditions-from-run";
import { resolveMergedPropertyConditionsNotSeenInRun } from "@/lib/checklists/merge-property-conditions";
import { validateChecklistSubmitAnswers } from "@/lib/checklists/checklist-proof-rules";
import {
  buildPropertyConditionSnapshot,
  mapDbConditionToRawRecord,
  type RawPropertyConditionRecord,
} from "@/lib/readiness/property-condition-mappers";
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

type AnswerInput = {
  templateItemId?: unknown;
  valueBoolean?: unknown;
  valueText?: unknown;
  valueNumber?: unknown;
  valueSelect?: unknown;
  notes?: unknown;
  photoUrls?: unknown;
};

type NormalizedAnswer = {
  templateItemId: string;
  valueBoolean: boolean | null;
  valueText: string | null;
  valueNumber: number | null;
  valueSelect: string | null;
  notes: string | null;
  photoUrls: string[];
};

type EffectiveChecklistItem = {
  id: string;
  propertyTemplateItemId: string | null;
  label: string;
  labelEn: string | null;
  description: string | null;
  itemType: string;
  isRequired: boolean;
  sortOrder: number;
  category: string | null;
  requiresPhoto: boolean;
  opensIssueOnFail: boolean;
  optionsText: string | null;
  issueTypeOnFail: string | null;
  issueSeverityOnFail: string | null;
  failureValuesText: string | null;
  linkedSupplyItemId: string | null;
  linkedSupplyItemName: string | null;
  linkedSupplyItemNameEl: string | null;
  linkedSupplyItemNameEn: string | null;
  supplyUpdateMode: string | null;
  supplyQuantity: number | null;
};

type SavedAnswerRow = {
  id: string;
  checklistRunId: string;
  templateItemId?: string | null;
  runItemId?: string | null;
};

type LatestAssignmentRow = {
  id: string;
} | null;

type RefreshedRunConditionRow = {
  id: string;
  propertyId: string;
  taskId: string | null;
  bookingId: string | null;
  propertySupplyId: string | null;
  mergeKey: string | null;
  sourceType: string | null;
  sourceLabel: string | null;
  sourceItemId: string | null;
  sourceItemLabel: string | null;
  sourceRunId: string | null;
  sourceAnswerId: string | null;
  conditionType: unknown;
  title: string;
  description: string | null;
  status: unknown;
  blockingStatus: unknown;
  severity: unknown;
  managerDecision: unknown;
  managerNotes: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  resolvedAt: Date | string | null;
  dismissedAt: Date | string | null;
};

type RefreshedRunRow = {
  task?: {
    propertyConditions?: RefreshedRunConditionRow[] | null;
  } | null;
} | null;

type SubmitTransactionResult = {
  run: RefreshedRunRow;
  createdOrUpdatedConditionIds: string[];
};

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function toNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toNullableDate(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Το πεδίο "${label}" δεν είναι έγκυρη ημερομηνία.`);
  }

  return date;
}

function normalizePhotoUrls(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeAnswers(input: unknown): NormalizedAnswer[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      const row = (item ?? {}) as AnswerInput;
      const templateItemId = toNullableString(row.templateItemId);

      if (!templateItemId) return null;

      return {
        templateItemId,
        valueBoolean:
          typeof row.valueBoolean === "boolean" ? row.valueBoolean : null,
        valueText: toNullableString(row.valueText),
        valueNumber: toNullableNumber(row.valueNumber),
        valueSelect: toNullableString(row.valueSelect),
        notes: toNullableString(row.notes),
        photoUrls: normalizePhotoUrls(row.photoUrls),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function normalizeEffectiveChecklistItem(item: unknown): EffectiveChecklistItem {
  const row = (item ?? {}) as Record<string, unknown>;

  return {
    id: String(row.id ?? "").trim(),
    propertyTemplateItemId: toNullableString(row.propertyTemplateItemId),
    label: String(row.label ?? "").trim(),
    labelEn: toNullableString(row.labelEn),
    description: toNullableString(row.description),
    itemType: String(row.itemType ?? "").trim(),
    isRequired: Boolean(row.isRequired),
    sortOrder: Number(row.sortOrder ?? 0),
    category: toNullableString(row.category),
    requiresPhoto: Boolean(row.requiresPhoto),
    opensIssueOnFail: Boolean(row.opensIssueOnFail),
    optionsText: toNullableString(row.optionsText),
    issueTypeOnFail: toNullableString(row.issueTypeOnFail),
    issueSeverityOnFail: toNullableString(row.issueSeverityOnFail),
    failureValuesText: toNullableString(row.failureValuesText),
    linkedSupplyItemId: toNullableString(row.linkedSupplyItemId),
    linkedSupplyItemName: toNullableString(row.linkedSupplyItemName),
    linkedSupplyItemNameEl: toNullableString(row.linkedSupplyItemNameEl),
    linkedSupplyItemNameEn: toNullableString(row.linkedSupplyItemNameEn),
    supplyUpdateMode: toNullableString(row.supplyUpdateMode),
    supplyQuantity:
      typeof row.supplyQuantity === "number"
        ? row.supplyQuantity
        : toNullableNumber(row.supplyQuantity),
  };
}

function mapToRunConditionAnswerInput(
  item: EffectiveChecklistItem,
  savedAnswer: { id: string },
  submitted: NormalizedAnswer
): RunConditionAnswerInput {
  return {
    answerId: savedAnswer.id,
    runItemId: item.id,
    templateItemId: item.id,
    propertyTemplateItemId: item.propertyTemplateItemId,
    templateItemLabel: item.label,
    templateItemCategory: item.category,
    itemType: item.itemType,
    linkedSupplyItemId: item.linkedSupplyItemId,
    opensIssueOnFail: item.opensIssueOnFail,
    issueTypeOnFail: item.issueTypeOnFail,
    issueSeverityOnFail: item.issueSeverityOnFail,
    failureValuesText: item.failureValuesText,
    valueBoolean: submitted.valueBoolean,
    valueText: submitted.valueText,
    valueNumber: submitted.valueNumber,
    valueSelect: submitted.valueSelect,
    notes: submitted.notes,
    photoUrls: submitted.photoUrls,
  };
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiPartnerAccess();

    if (!access.ok) {
      return access.response;
    }

    const { auth } = access;
    const { runId } = await context.params;
    const body = await req.json();

    const allowed = await canPartnerAccessChecklistRun(auth, runId);

    if (!allowed) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το checklist run." },
        { status: 403 }
      );
    }

    const submittedAnswers = normalizeAnswers(body.answers);

    if (submittedAnswers.length === 0) {
      return NextResponse.json(
        { error: "Δεν υπάρχουν answers για υποβολή." },
        { status: 400 }
      );
    }

    const startedAt = toNullableDate(body.startedAt, "startedAt");
    const completedAt = toNullableDate(body.completedAt, "completedAt");

    const existingRun = await prisma.taskChecklistRun.findFirst({
      where: {
        id: runId,
        task: {
          organizationId: auth.organizationId,
        },
      },
      include: {
        template: {
          include: {
            items: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        },
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        answers: true,
        task: {
          select: {
            id: true,
            organizationId: true,
            propertyId: true,
            bookingId: true,
            status: true,
            sendCleaningChecklist: true,
            sendSuppliesChecklist: true,
            sendIssuesChecklist: true,
          },
        },
      },
    });

    if (!existingRun) {
      return NextResponse.json(
        { error: "Το checklist run δεν βρέθηκε." },
        { status: 404 }
      );
    }

    if (String(existingRun.status || "").toLowerCase() === "completed") {
      return NextResponse.json(
        { error: "Το checklist run έχει ήδη υποβληθεί και δεν μπορεί να τροποποιηθεί." },
        { status: 409 }
      );
    }

    const runItems = safeArray(existingRun.items).map(normalizeEffectiveChecklistItem);
    const fallbackTemplateItems = safeArray(existingRun.template?.items).map(
      normalizeEffectiveChecklistItem
    );

    const effectiveItems: EffectiveChecklistItem[] =
      runItems.length > 0 ? runItems : fallbackTemplateItems;

    if (runItems.length === 0) {
      return NextResponse.json(
        {
          error:
            "Το checklist run δεν έχει materialized run items και δεν μπορεί να δεχτεί canonical submit.",
        },
        { status: 409 }
      );
    }

    const itemIds = new Set(effectiveItems.map((item) => item.id));

    for (const answer of submittedAnswers) {
      if (!itemIds.has(answer.templateItemId)) {
        return NextResponse.json(
          {
            error: "Υπάρχει answer με item που δεν ανήκει στο συγκεκριμένο run.",
          },
          { status: 400 }
        );
      }
    }

    const validationResult = validateChecklistSubmitAnswers({
      items: effectiveItems.map((item) => ({
        id: item.id,
        label: item.label,
        itemType: item.itemType,
        isRequired: item.isRequired,
        requiresPhoto: item.requiresPhoto,
        opensIssueOnFail: item.opensIssueOnFail,
        failureValuesText: item.failureValuesText,
      })),
      answers: submittedAnswers,
    });

    if (!validationResult.ok) {
      return NextResponse.json(
        {
          error: validationResult.error,
          missingItems: validationResult.missingItems,
        },
        { status: 400 }
      );
    }

    const submittedMap = new Map(
      submittedAnswers.map((answer) => [answer.templateItemId, answer])
    );

    const now = new Date();

    const result: SubmitTransactionResult = await prisma.$transaction(
      async (tx) => {
        const savedAnswers = new Map<string, SavedAnswerRow>();

        for (const item of effectiveItems) {
          const submitted = submittedMap.get(item.id);
          const existing = safeArray(existingRun.answers).find((row) => {
            return row.runItemId === item.id || row.templateItemId === item.id;
          });

          if (!submitted) {
            if (existing) {
              await tx.taskChecklistAnswer.delete({
                where: { id: existing.id },
              });
            }
            continue;
          }

          const data = {
            valueBoolean: submitted.valueBoolean,
            valueText: submitted.valueText,
            valueNumber: submitted.valueNumber,
            valueSelect: submitted.valueSelect,
            notes: submitted.notes,
            photoUrls: submitted.photoUrls,
            issueCreated: false,
          };

          if (existing) {
            const updated = await tx.taskChecklistAnswer.update({
              where: { id: existing.id },
              data,
              select: {
                id: true,
                checklistRunId: true,
                templateItemId: true,
                runItemId: true,
              },
            });

            savedAnswers.set(item.id, updated);
          } else {
            const createData = {
              checklistRunId: runId,
              runItemId: item.id,
              templateItemId: item.propertyTemplateItemId ?? item.id,
              ...data,
            };

            const created = await tx.taskChecklistAnswer.create({
              data: createData,
              select: {
                id: true,
                checklistRunId: true,
                templateItemId: true,
                runItemId: true,
              },
            });

            savedAnswers.set(item.id, created);
          }
        }

        const runConditionAnswers: RunConditionAnswerInput[] = [];

        for (const item of effectiveItems) {
          const submitted = submittedMap.get(item.id);
          const savedAnswer = savedAnswers.get(item.id);

          if (!submitted || !savedAnswer) {
            continue;
          }

          runConditionAnswers.push(
            mapToRunConditionAnswerInput(item, savedAnswer, submitted)
          );
        }

        const conditionResults: CreatedOrUpdatedPropertyConditionResult[] =
          await createPropertyConditionsFromRun(
            {
              organizationId: existingRun.task.organizationId,
              propertyId: existingRun.task.propertyId,
              taskId: existingRun.task.id,
              bookingId: existingRun.task.bookingId ?? null,
              runId: existingRun.id,
              templateId: existingRun.templateId ?? null,
              templateTitle:
                toNullableString(existingRun.sourceTemplateTitle) ??
                toNullableString(existingRun.template?.title) ??
                "Checklist",
              answers: runConditionAnswers,
              detectedAt: now,
            },
            tx
          );

        await resolveMergedPropertyConditionsNotSeenInRun(
          {
            organizationId: existingRun.task.organizationId,
            propertyId: existingRun.task.propertyId,
            mergeKeysToKeepOpen: conditionResults.map((item) => item.mergeKey),
            sourceRunId: existingRun.id,
            resolvedAt: now,
          },
          tx
        );

        const createdOrUpdatedConditionIds = conditionResults.map(
          (item) => item.id
        );

        const createdAnswerIds = new Set(
          runConditionAnswers.map((answer) => answer.answerId)
        );

        for (const savedAnswer of savedAnswers.values()) {
          await tx.taskChecklistAnswer.update({
            where: {
              id: savedAnswer.id,
            },
            data: {
              issueCreated: createdAnswerIds.has(savedAnswer.id),
            },
          });
        }

        await tx.taskChecklistRun.update({
          where: {
            id: runId,
          },
          data: {
            status: "completed",
            startedAt: startedAt ?? now,
            completedAt: completedAt ?? now,
          },
        });

        const refreshedTask = await tx.task.findUnique({
          where: { id: existingRun.task.id },
          include: {
            checklistRun: true,
            supplyRun: true,
            issueRun: true,
          },
        });

        const cleaningCompleted =
          !refreshedTask?.checklistRun ||
          refreshedTask.checklistRun.status === "completed";

        const suppliesCompleted =
          !refreshedTask?.supplyRun ||
          refreshedTask.supplyRun.status === "completed";

        const issuesCompleted =
          !refreshedTask?.issueRun ||
          refreshedTask.issueRun.status === "completed";

        if (cleaningCompleted && suppliesCompleted && issuesCompleted) {
          await tx.task.update({
            where: { id: existingRun.task.id },
            data: {
              status: "completed",
              completedAt: now,
            },
          });

          const latestAssignment: LatestAssignmentRow =
            await tx.taskAssignment.findFirst({
              where: {
                partnerId: auth.partnerId,
                taskId: existingRun.task.id,
              },
              orderBy: [{ assignedAt: "desc" }, { createdAt: "desc" }],
              select: { id: true },
            });

          if (latestAssignment) {
            await tx.taskAssignment.update({
              where: { id: latestAssignment.id },
              data: {
                status: "completed",
                completedAt: now,
              },
            });
          }
        }

        const refreshedRun = await tx.taskChecklistRun.findUnique({
          where: { id: runId },
          include: {
            template: {
              include: {
                items: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
              },
            },
            items: {
              orderBy: {
                sortOrder: "asc",
              },
            },
            answers: {
              orderBy: {
                createdAt: "asc",
              },
            },
            task: {
              include: {
                propertyConditions: {
                  where: {
                    taskId: existingRun.task.id,
                  },
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
                },
              },
            },
          },
        });

        return {
          run: refreshedRun,
          createdOrUpdatedConditionIds,
        };
      }
    );

    const taskRawConditions: RawPropertyConditionRecord[] = safeArray(
      result.run?.task?.propertyConditions
    ).map((condition) =>
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
        createdAt: condition.createdAt,
        updatedAt: condition.updatedAt,
        resolvedAt: condition.resolvedAt,
        dismissedAt: condition.dismissedAt,
      })
    );

    const taskConditionSnapshot = buildPropertyConditionSnapshot(taskRawConditions);
    const propertyTruth = await refreshPropertyReadiness(existingRun.task.propertyId);

    return NextResponse.json({
      run: result.run,
      propertyReadiness: {
        status: propertyTruth.readiness.status,
        explain: propertyTruth.readiness.explain,
        reasons: propertyTruth.readiness.reasons,
        nextActions: propertyTruth.readiness.nextActions,
        counts: propertyTruth.readiness.counts,
        updatedAt:
          propertyTruth.updatedProperty.readinessUpdatedAt?.toISOString() ?? null,
        nextCheckInAt: propertyTruth.nextBooking?.checkInDate?.toISOString() ?? null,
      },
      propertyConditions: {
        summary: propertyTruth.snapshot.summary,
        reasons: propertyTruth.snapshot.reasons,
        active: propertyTruth.snapshot.buckets.active,
        blocking: propertyTruth.snapshot.buckets.blocking,
        warning: propertyTruth.snapshot.buckets.warning,
        monitoring: propertyTruth.snapshot.buckets.monitoring,
        all: propertyTruth.snapshot.conditions,
        createdOrUpdatedForTask: taskConditionSnapshot.conditions,
      },
      createdOrUpdatedConditionIds: result.createdOrUpdatedConditionIds,
    });
  } catch (error) {
    console.error("Partner checklist submit POST error:", error);
    return NextResponse.json(
      { error: "Αποτυχία υποβολής checklist." },
      { status: 500 }
    );
  }
}
