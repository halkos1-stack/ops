import { prisma } from "@/lib/prisma";
import { mergePropertyCondition } from "@/lib/checklists/merge-property-conditions";

export type PropertyConditionTypeValue = "SUPPLY" | "ISSUE" | "DAMAGE";
export type PropertyConditionSeverityValue =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";
export type PropertyConditionBlockingStatusValue =
  | "BLOCKING"
  | "WARNING"
  | "NON_BLOCKING";

export type RunConditionAnswerInput = {
  answerId: string;
  runItemId?: string | null;
  templateItemId?: string | null;
  propertyTemplateItemId?: string | null;

  templateItemLabel: string;
  templateItemCategory?: string | null;
  itemType: string;

  linkedSupplyItemId?: string | null;
  opensIssueOnFail?: boolean;
  issueTypeOnFail?: string | null;
  issueSeverityOnFail?: string | null;
  failureValuesText?: string | null;

  valueBoolean?: boolean | null;
  valueText?: string | null;
  valueNumber?: number | null;
  valueSelect?: string | null;
  notes?: string | null;
  photoUrls?: string[] | null;
};

export type RunConditionContextInput = {
  organizationId: string;
  propertyId: string;
  taskId: string;
  bookingId?: string | null;
  runId: string;
  templateId?: string | null;
  templateTitle: string;
  answers: RunConditionAnswerInput[];
  detectedAt?: Date;
};

export type CreatedOrUpdatedPropertyConditionResult = {
  id: string;
  action: "created" | "updated";
  mergeKey: string;
};

type PropertyConditionFindFirst = typeof prisma.propertyCondition.findFirst;
type PropertyConditionUpdate = typeof prisma.propertyCondition.update;
type PropertyConditionCreate = typeof prisma.propertyCondition.create;

export type PropertyConditionPrismaClient = {
  propertyCondition: {
    findFirst: PropertyConditionFindFirst;
    update: PropertyConditionUpdate;
    create: PropertyConditionCreate;
  };
};

type MergePropertyConditionResult = {
  id: string;
  action: "created" | "updated";
  mergeKey: string;
};

function getPrismaClient(
  client?: PropertyConditionPrismaClient
): PropertyConditionPrismaClient {
  return client ?? (prisma as PropertyConditionPrismaClient);
}

function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeTextListFromCsv(value: unknown): string[] {
  const text = toNullableString(value);
  if (!text) return [];

  return text
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function normalizePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function normalizeItemType(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function buildAnswerValueSummary(answer: RunConditionAnswerInput): string | null {
  if (typeof answer.valueBoolean === "boolean") {
    return answer.valueBoolean ? "true" : "false";
  }

  if (
    typeof answer.valueNumber === "number" &&
    Number.isFinite(answer.valueNumber)
  ) {
    return String(answer.valueNumber);
  }

  if (toNullableString(answer.valueSelect)) {
    return toNullableString(answer.valueSelect);
  }

  if (toNullableString(answer.valueText)) {
    return toNullableString(answer.valueText);
  }

  return null;
}

function inferConditionType(input: {
  linkedSupplyItemId?: string | null;
  category?: string | null;
  issueTypeOnFail?: string | null;
}): PropertyConditionTypeValue {
  if (input.linkedSupplyItemId) {
    return "SUPPLY";
  }

  const category = String(input.category ?? "").trim().toLowerCase();
  const issueTypeOnFail = String(input.issueTypeOnFail ?? "")
    .trim()
    .toLowerCase();

  if (
    category.includes("damage") ||
    category.includes("ζημι") ||
    issueTypeOnFail.includes("damage") ||
    issueTypeOnFail.includes("ζημι")
  ) {
    return "DAMAGE";
  }

  return "ISSUE";
}

function inferSeverity(value: unknown): PropertyConditionSeverityValue {
  const text = String(value ?? "").trim().toLowerCase();

  if (text === "low") return "LOW";
  if (text === "medium") return "MEDIUM";
  if (text === "high") return "HIGH";
  if (text === "critical" || text === "urgent") return "CRITICAL";

  return "MEDIUM";
}

function inferBlockingStatus(
  severity: PropertyConditionSeverityValue
): PropertyConditionBlockingStatusValue {
  if (severity === "CRITICAL") return "BLOCKING";
  if (severity === "HIGH") return "WARNING";
  return "WARNING";
}

function evaluateFailure(answer: RunConditionAnswerInput): {
  failed: boolean;
  failureReason: string | null;
} {
  const itemType = normalizeItemType(answer.itemType);
  const failureValues = normalizeTextListFromCsv(answer.failureValuesText);
  const valueSummary = buildAnswerValueSummary(answer);
  const normalizedValue = valueSummary?.trim().toLowerCase() ?? null;

  if (
    itemType === "boolean" ||
    itemType === "yes_no" ||
    itemType === "pass_fail" ||
    itemType === "checkbox"
  ) {
    if (answer.valueBoolean === false) {
      return {
        failed: true,
        failureReason: "Η απάντηση boolean δήλωσε αποτυχία.",
      };
    }

    if (
      normalizedValue &&
      failureValues.length > 0 &&
      failureValues.includes(normalizedValue)
    ) {
      return {
        failed: true,
        failureReason: "Η απάντηση αντιστοιχεί σε δηλωμένη τιμή αποτυχίας.",
      };
    }

    return {
      failed: false,
      failureReason: null,
    };
  }

  if (normalizedValue && failureValues.length > 0) {
    if (failureValues.includes(normalizedValue)) {
      return {
        failed: true,
        failureReason: "Η απάντηση αντιστοιχεί σε δηλωμένη τιμή αποτυχίας.",
      };
    }
  }

  if (answer.opensIssueOnFail === true) {
    if (
      answer.valueBoolean === false ||
      normalizedValue === "fail" ||
      normalizedValue === "failed" ||
      normalizedValue === "no" ||
      normalizedValue === "problem" ||
      normalizedValue === "issue" ||
      normalizedValue === "damage"
    ) {
      return {
        failed: true,
        failureReason:
          "Το item έχει λογική αποτυχίας και η απάντηση δηλώνει πρόβλημα.",
      };
    }
  }

  return {
    failed: false,
    failureReason: null,
  };
}

function resolveSourceItemId(answer: RunConditionAnswerInput): string {
  return (
    toNullableString(answer.propertyTemplateItemId) ??
    toNullableString(answer.templateItemId) ??
    toNullableString(answer.runItemId) ??
    answer.answerId
  );
}

function resolveMergeKeyTargetItemId(answer: RunConditionAnswerInput): string {
  return (
    toNullableString(answer.propertyTemplateItemId) ??
    toNullableString(answer.templateItemId) ??
    toNullableString(answer.runItemId) ??
    answer.answerId
  );
}

function buildConditionMergeKey(input: {
  propertyId: string;
  targetItemId: string;
  linkedSupplyItemId?: string | null;
  conditionType: PropertyConditionTypeValue;
}): string {
  if (input.linkedSupplyItemId) {
    return `property:${input.propertyId}:supply:${input.linkedSupplyItemId}`;
  }

  return `property:${input.propertyId}:template-item:${input.targetItemId}:type:${input.conditionType.toLowerCase()}`;
}

function buildConditionTitle(input: {
  label: string;
  conditionType: PropertyConditionTypeValue;
}): string {
  if (input.conditionType === "SUPPLY") {
    return `Έλλειψη αναλωσίμου: ${input.label}`;
  }

  if (input.conditionType === "DAMAGE") {
    return `Ζημιά: ${input.label}`;
  }

  return `Βλάβη / θέμα: ${input.label}`;
}

function buildConditionDescription(input: {
  label: string;
  answer: RunConditionAnswerInput;
  failureReason: string | null;
}): string {
  const parts: string[] = [];

  parts.push(`Το item "${input.label}" δηλώθηκε ως προβληματικό στο checklist.`);

  const valueSummary = buildAnswerValueSummary(input.answer);
  if (valueSummary) {
    parts.push(`Τιμή απάντησης: ${valueSummary}.`);
  }

  const notes = toNullableString(input.answer.notes);
  if (notes) {
    parts.push(`Σχόλιο συνεργάτη: ${notes}.`);
  }

  if (input.failureReason) {
    parts.push(`Αιτία δημιουργίας condition: ${input.failureReason}`);
  }

  return parts.join(" ");
}

function buildEvidence(answer: RunConditionAnswerInput): {
  photoUrls: string[];
  valueBoolean: boolean | null;
  valueText: string | null;
  valueNumber: number | null;
  valueSelect: string | null;
  notes: string | null;
} {
  return {
    photoUrls: normalizePhotoUrls(answer.photoUrls),
    valueBoolean:
      typeof answer.valueBoolean === "boolean" ? answer.valueBoolean : null,
    valueText: toNullableString(answer.valueText),
    valueNumber:
      typeof answer.valueNumber === "number" && Number.isFinite(answer.valueNumber)
        ? answer.valueNumber
        : null,
    valueSelect: toNullableString(answer.valueSelect),
    notes: toNullableString(answer.notes),
  };
}

function normalizeMergeResult(
  value: unknown
): CreatedOrUpdatedPropertyConditionResult {
  const row = (value ?? {}) as {
    id?: unknown;
    action?: unknown;
    mergeKey?: unknown;
  };

  const id =
    typeof row.id === "string" && row.id.trim().length > 0
      ? row.id.trim()
      : "";

  const action =
    row.action === "created" || row.action === "updated"
      ? row.action
      : "updated";

  const mergeKey =
    typeof row.mergeKey === "string" && row.mergeKey.trim().length > 0
      ? row.mergeKey.trim()
      : "";

  if (!id) {
    throw new Error(
      "Η mergePropertyCondition επέστρεψε αποτέλεσμα χωρίς έγκυρο id."
    );
  }

  if (!mergeKey) {
    throw new Error(
      "Η mergePropertyCondition επέστρεψε αποτέλεσμα χωρίς έγκυρο mergeKey."
    );
  }

  return {
    id,
    action,
    mergeKey,
  };
}

export async function createPropertyConditionsFromRun(
  input: RunConditionContextInput,
  client?: PropertyConditionPrismaClient
): Promise<CreatedOrUpdatedPropertyConditionResult[]> {
  const db = getPrismaClient(client);
  const detectedAt = input.detectedAt ?? new Date();
  const results: CreatedOrUpdatedPropertyConditionResult[] = [];

  for (const answer of input.answers) {
    const failure = evaluateFailure(answer);

    if (!failure.failed) {
      continue;
    }

    const conditionType = inferConditionType({
      linkedSupplyItemId: answer.linkedSupplyItemId,
      category: answer.templateItemCategory,
      issueTypeOnFail: answer.issueTypeOnFail,
    });

    const severity = inferSeverity(answer.issueSeverityOnFail);
    const blockingStatus = inferBlockingStatus(severity);

    const targetItemId = resolveMergeKeyTargetItemId(answer);
    const sourceItemId = resolveSourceItemId(answer);

    const mergeKey = buildConditionMergeKey({
      propertyId: input.propertyId,
      targetItemId,
      linkedSupplyItemId: answer.linkedSupplyItemId,
      conditionType,
    });

    const mergeResult = (await mergePropertyCondition(
      {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        mergeKey,
        taskId: input.taskId,
        bookingId: input.bookingId ?? null,
        propertySupplyId: answer.linkedSupplyItemId ?? null,
        sourceType: "checklist_submit",
        sourceLabel: input.templateTitle,
        sourceItemId,
        sourceItemLabel: answer.templateItemLabel,
        sourceRunId: input.runId,
        sourceAnswerId: answer.answerId,
        conditionType,
        title: buildConditionTitle({
          label: answer.templateItemLabel,
          conditionType,
        }),
        description: buildConditionDescription({
          label: answer.templateItemLabel,
          answer,
          failureReason: failure.failureReason,
        }),
        blockingStatus,
        severity,
        evidence: buildEvidence(answer),
        detectedAt,
      },
      db as any
    )) as MergePropertyConditionResult | unknown;

    const normalized = normalizeMergeResult(mergeResult);

    results.push(normalized);
  }

  return results;
}

/**
 * Συμβατό export για το παλιό όνομα χρήσης.
 */
export type CleaningRunAnswerInput = RunConditionAnswerInput;
export type CleaningRunContextInput = RunConditionContextInput;