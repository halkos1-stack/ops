import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MergePropertyConditionInput = {
  organizationId: string;
  propertyId: string;
  mergeKey: string;

  taskId?: string | null;
  bookingId?: string | null;
  propertySupplyId?: string | null;

  sourceType?: string | null;
  sourceLabel?: string | null;
  sourceItemId?: string | null;
  sourceItemLabel?: string | null;
  sourceRunId?: string | null;
  sourceAnswerId?: string | null;

  conditionType: "SUPPLY" | "ISSUE" | "DAMAGE";
  title: string;
  description?: string | null;

  blockingStatus: "BLOCKING" | "WARNING" | "NON_BLOCKING";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  evidence?: unknown;
  detectedAt?: Date | null;
};

export type MergePropertyConditionResult = {
  id: string;
  action: "created" | "updated";
  mergeKey: string;
  status: "OPEN" | "MONITORING" | "RESOLVED" | "DISMISSED";
};

export type ResolveMergedPropertyConditionsInput = {
  organizationId: string;
  propertyId: string;
  mergeKeysToKeepOpen: string[];
  sourceRunId?: string | null;
  resolvedAt?: Date | null;
};

export type ResolveMergedPropertyConditionsResult = {
  resolvedIds: string[];
  keptOpenIds: string[];
};

type MergePropertyConditionPrismaClient = {
  propertyCondition: {
    findFirst: typeof prisma.propertyCondition.findFirst;
    findMany: typeof prisma.propertyCondition.findMany;
    update: typeof prisma.propertyCondition.update;
    updateMany: typeof prisma.propertyCondition.updateMany;
    create: typeof prisma.propertyCondition.create;
  };
};

function getDb(client?: MergePropertyConditionPrismaClient) {
  return client ?? prisma;
}

function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeDetectedAt(value?: Date | null): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  return new Date();
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values.map((value) => toNullableString(value)).filter(Boolean) as string[]
    ),
  ];
}

function normalizeEvidenceForPrisma(
  value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

function normalizeStatus(
  value: unknown
): "OPEN" | "MONITORING" | "RESOLVED" | "DISMISSED" {
  const text = String(value ?? "").trim().toUpperCase();

  if (
    text === "OPEN" ||
    text === "MONITORING" ||
    text === "RESOLVED" ||
    text === "DISMISSED"
  ) {
    return text;
  }

  return "OPEN";
}

export async function mergePropertyCondition(
  input: MergePropertyConditionInput,
  client?: MergePropertyConditionPrismaClient
): Promise<MergePropertyConditionResult> {
  const db = getDb(client);
  const detectedAt = normalizeDetectedAt(input.detectedAt);

  const existingOpenCondition = await db.propertyCondition.findFirst({
    where: {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      mergeKey: input.mergeKey,
      status: {
        in: ["OPEN", "MONITORING"],
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      status: true,
    },
  });

  const evidence = normalizeEvidenceForPrisma(input.evidence);

  const data: Prisma.PropertyConditionUncheckedUpdateInput = {
    taskId: input.taskId ?? null,
    bookingId: input.bookingId ?? null,
    propertySupplyId: input.propertySupplyId ?? null,
    mergeKey: input.mergeKey,
    sourceType: toNullableString(input.sourceType) ?? "system",
    sourceLabel: toNullableString(input.sourceLabel),
    sourceItemId: toNullableString(input.sourceItemId),
    sourceItemLabel: toNullableString(input.sourceItemLabel),
    sourceRunId: toNullableString(input.sourceRunId),
    sourceAnswerId: toNullableString(input.sourceAnswerId),
    conditionType: input.conditionType,
    title: input.title,
    description: toNullableString(input.description),
    status: "OPEN",
    blockingStatus: input.blockingStatus,
    severity: input.severity,
    managerDecision: null,
    lastDetectedAt: detectedAt,
  };

  if (evidence !== undefined) {
    data.evidence = evidence;
  }

  if (existingOpenCondition) {
    const updatedCondition = await db.propertyCondition.update({
      where: {
        id: existingOpenCondition.id,
      },
      data,
      select: {
        id: true,
        status: true,
      },
    });

    return {
      id: updatedCondition.id,
      action: "updated",
      mergeKey: input.mergeKey,
      status: normalizeStatus(updatedCondition.status),
    };
  }

  const createData: Prisma.PropertyConditionUncheckedCreateInput = {
    organizationId: input.organizationId,
    propertyId: input.propertyId,
    taskId: input.taskId ?? null,
    bookingId: input.bookingId ?? null,
    propertySupplyId: input.propertySupplyId ?? null,
    mergeKey: input.mergeKey,
    sourceType: toNullableString(input.sourceType) ?? "system",
    sourceLabel: toNullableString(input.sourceLabel),
    sourceItemId: toNullableString(input.sourceItemId),
    sourceItemLabel: toNullableString(input.sourceItemLabel),
    sourceRunId: toNullableString(input.sourceRunId),
    sourceAnswerId: toNullableString(input.sourceAnswerId),
    conditionType: input.conditionType,
    title: input.title,
    description: toNullableString(input.description),
    status: "OPEN",
    blockingStatus: input.blockingStatus,
    severity: input.severity,
    managerDecision: null,
    firstDetectedAt: detectedAt,
    lastDetectedAt: detectedAt,
  };

  if (evidence !== undefined) {
    createData.evidence = evidence;
  }

  const createdCondition = await db.propertyCondition.create({
    data: createData,
    select: {
      id: true,
      status: true,
    },
  });

  return {
    id: createdCondition.id,
    action: "created",
    mergeKey: input.mergeKey,
    status: normalizeStatus(createdCondition.status),
  };
}

export async function mergePropertyConditions(
  inputs: MergePropertyConditionInput[],
  client?: MergePropertyConditionPrismaClient
): Promise<MergePropertyConditionResult[]> {
  const results: MergePropertyConditionResult[] = [];

  for (const input of inputs) {
    const result = await mergePropertyCondition(input, client);
    results.push(result);
  }

  return results;
}

export async function resolveMergedPropertyConditionsNotSeenInRun(
  input: ResolveMergedPropertyConditionsInput,
  client?: MergePropertyConditionPrismaClient
): Promise<ResolveMergedPropertyConditionsResult> {
  const db = getDb(client);
  const resolvedAt = normalizeDetectedAt(input.resolvedAt);
  const mergeKeysToKeepOpen = uniqueStrings(input.mergeKeysToKeepOpen);

  const openConditions = await db.propertyCondition.findMany({
    where: {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      status: {
        in: ["OPEN", "MONITORING"],
      },
      ...(toNullableString(input.sourceRunId)
        ? {
            sourceRunId: toNullableString(input.sourceRunId),
          }
        : {}),
    },
    select: {
      id: true,
      mergeKey: true,
    },
  });

  const idsToKeepOpen = openConditions
    .filter((condition) => {
      const mergeKey = toNullableString(condition.mergeKey);
      if (!mergeKey) return false;
      return mergeKeysToKeepOpen.includes(mergeKey);
    })
    .map((condition) => condition.id);

  const idsToResolve = openConditions
    .filter((condition) => {
      const mergeKey = toNullableString(condition.mergeKey);
      if (!mergeKey) return false;
      return !mergeKeysToKeepOpen.includes(mergeKey);
    })
    .map((condition) => condition.id);

  if (idsToResolve.length > 0) {
    await db.propertyCondition.updateMany({
      where: {
        id: {
          in: idsToResolve,
        },
      },
      data: {
        status: "RESOLVED",
        managerDecision: "RESOLVED",
        resolvedAt,
      },
    });
  }

  return {
    resolvedIds: idsToResolve,
    keptOpenIds: idsToKeepOpen,
  };
}