export type PropertyReadinessStatus =
  | "ready"
  | "borderline"
  | "not_ready"
  | "unknown";

export type PropertyConditionType = "supply" | "issue" | "damage";

export type PropertyConditionStatus =
  | "open"
  | "monitoring"
  | "resolved"
  | "dismissed";

export type PropertyConditionBlockingStatus =
  | "blocking"
  | "non_blocking"
  | "warning";

export type PropertyConditionSeverity =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type PropertyConditionManagerDecision =
  | "allow_with_issue"
  | "block_until_resolved"
  | "monitor"
  | "resolved"
  | "dismissed";

export type ReadinessConditionInput = {
  id: string;
  propertyId: string;
  conditionType: PropertyConditionType;
  status: PropertyConditionStatus;
  blockingStatus: PropertyConditionBlockingStatus;
  severity: PropertyConditionSeverity;
  managerDecision?: PropertyConditionManagerDecision | null;
  title?: string | null;
  description?: string | null;
  locationText?: string | null;
  firstDetectedAt?: Date | string | null;
  lastDetectedAt?: Date | string | null;
  resolvedAt?: Date | string | null;
  dismissedAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  sourceType?: string | null;
  sourceLabel?: string | null;
  sourceItemId?: string | null;
  sourceItemLabel?: string | null;
  sourceRunId?: string | null;
  sourceAnswerId?: string | null;
  taskId?: string | null;
  bookingId?: string | null;
  propertySupplyId?: string | null;
  mergeKey?: string | null;
};

export type ComputePropertyReadinessInput = {
  now?: Date;
  nextCheckInAt?: Date | string | null;
  conditions?: ReadinessConditionInput[];
};

export type ReadinessReason = {
  code:
    | "NO_NEXT_CHECKIN"
    | "NO_ACTIVE_CONDITIONS"
    | "BLOCKING_CONDITION"
    | "CRITICAL_CONDITION"
    | "HIGH_WARNING_CONDITION"
    | "MONITORING_CONDITION"
    | "NON_BLOCKING_CONDITION"
    | "ALLOW_WITH_ISSUE"
    | "UNKNOWN_DATA";
  label: string;
  message: string;
  conditionId?: string;
  conditionType?: PropertyConditionType;
  blockingStatus?: PropertyConditionBlockingStatus;
  severity?: PropertyConditionSeverity;
  managerDecision?: PropertyConditionManagerDecision | null;
};

export type ReadinessNextAction = {
  code:
    | "WAIT_FOR_MANAGER_DECISION"
    | "RESOLVE_BLOCKING_CONDITIONS"
    | "REVIEW_WARNINGS"
    | "MONITOR_ACTIVE_CONDITIONS"
    | "VERIFY_PROPERTY_STATE"
    | "NO_ACTION_REQUIRED";
  label: string;
  message: string;
  conditionId?: string;
};

export type PropertyReadinessCounts = {
  totalConditions: number;
  activeConditions: number;
  openConditions: number;
  monitoringConditions: number;
  resolvedConditions: number;
  dismissedConditions: number;
  blockingConditions: number;
  warningConditions: number;
  nonBlockingConditions: number;
  criticalConditions: number;
  highConditions: number;
  mediumConditions: number;
  lowConditions: number;
  supplyConditions: number;
  issueConditions: number;
  damageConditions: number;
};

export type PropertyReadinessResult = {
  status: PropertyReadinessStatus;
  score: number;
  reasons: ReadinessReason[];
  nextActions: ReadinessNextAction[];
  counts: PropertyReadinessCounts;
  activeConditionIds: string[];
  blockingConditionIds: string[];
  warningConditionIds: string[];
  computedAt: Date;
  nextCheckInAt: Date | null;
  explain: string;
};

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getSafeText(value: string | null | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeConditionDates(
  condition: ReadinessConditionInput
): ReadinessConditionInput {
  return {
    ...condition,
    firstDetectedAt: toDateOrNull(condition.firstDetectedAt),
    lastDetectedAt: toDateOrNull(condition.lastDetectedAt),
    resolvedAt: toDateOrNull(condition.resolvedAt),
    dismissedAt: toDateOrNull(condition.dismissedAt),
    createdAt: toDateOrNull(condition.createdAt),
    updatedAt: toDateOrNull(condition.updatedAt),
  };
}

function isResolvedByManagerDecision(
  condition: ReadinessConditionInput
): boolean {
  return (
    condition.managerDecision === "resolved" ||
    condition.managerDecision === "dismissed"
  );
}

function isActiveCondition(condition: ReadinessConditionInput): boolean {
  if (condition.status !== "open" && condition.status !== "monitoring") {
    return false;
  }

  if (isResolvedByManagerDecision(condition)) {
    return false;
  }

  return true;
}

function getConditionLabel(condition: ReadinessConditionInput): string {
  if (condition.title && condition.title.trim().length > 0) {
    return condition.title.trim();
  }

  if (condition.sourceItemLabel && condition.sourceItemLabel.trim().length > 0) {
    return condition.sourceItemLabel.trim();
  }

  if (condition.conditionType === "supply") {
    return "Έλλειψη αναλωσίμου";
  }

  if (condition.conditionType === "damage") {
    return "Ενεργή ζημιά";
  }

  return "Ενεργή βλάβη";
}

function getConditionPriority(condition: ReadinessConditionInput): number {
  if (isConditionBlocking(condition)) return 1;
  if (condition.severity === "critical") return 2;
  if (condition.blockingStatus === "warning" && condition.severity === "high") {
    return 3;
  }
  if (condition.status === "monitoring") return 4;
  if (condition.managerDecision === "allow_with_issue") return 5;
  if (condition.blockingStatus === "non_blocking") return 6;
  return 7;
}

function buildCounts(
  allConditions: ReadinessConditionInput[],
  activeConditions: ReadinessConditionInput[]
): PropertyReadinessCounts {
  return {
    totalConditions: allConditions.length,
    activeConditions: activeConditions.length,
    openConditions: allConditions.filter((item) => item.status === "open").length,
    monitoringConditions: allConditions.filter((item) => item.status === "monitoring")
      .length,
    resolvedConditions: allConditions.filter(
      (item) =>
        item.status === "resolved" || item.managerDecision === "resolved"
    ).length,
    dismissedConditions: allConditions.filter(
      (item) =>
        item.status === "dismissed" || item.managerDecision === "dismissed"
    ).length,
    blockingConditions: activeConditions.filter((item) => isConditionBlocking(item))
      .length,
    warningConditions: activeConditions.filter(
      (item) => item.blockingStatus === "warning"
    ).length,
    nonBlockingConditions: activeConditions.filter(
      (item) => item.blockingStatus === "non_blocking"
    ).length,
    criticalConditions: activeConditions.filter((item) => item.severity === "critical")
      .length,
    highConditions: activeConditions.filter((item) => item.severity === "high").length,
    mediumConditions: activeConditions.filter((item) => item.severity === "medium")
      .length,
    lowConditions: activeConditions.filter((item) => item.severity === "low").length,
    supplyConditions: activeConditions.filter((item) => item.conditionType === "supply")
      .length,
    issueConditions: activeConditions.filter((item) => item.conditionType === "issue")
      .length,
    damageConditions: activeConditions.filter((item) => item.conditionType === "damage")
      .length,
  };
}

function pushUniqueReason(reasons: ReadinessReason[], reason: ReadinessReason): void {
  const exists = reasons.some(
    (item) =>
      item.code === reason.code &&
      item.conditionId === reason.conditionId &&
      item.message === reason.message
  );

  if (!exists) {
    reasons.push(reason);
  }
}

function pushUniqueAction(
  actions: ReadinessNextAction[],
  action: ReadinessNextAction
): void {
  const exists = actions.some(
    (item) =>
      item.code === action.code &&
      item.conditionId === action.conditionId &&
      item.message === action.message
  );

  if (!exists) {
    actions.push(action);
  }
}

function isConditionBlocking(condition: ReadinessConditionInput): boolean {
  if (condition.managerDecision === "block_until_resolved") {
    return true;
  }

  return condition.blockingStatus === "blocking";
}

function buildReasonForCondition(
  condition: ReadinessConditionInput
): ReadinessReason | null {
  const label = getConditionLabel(condition);

  if (isConditionBlocking(condition)) {
    return {
      code: "BLOCKING_CONDITION",
      label: "Μπλοκαριστική εκκρεμότητα",
      message: `Το συμβάν "${label}" παραμένει ενεργό και μπλοκάρει την ετοιμότητα του ακινήτου.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.blockingStatus,
      severity: condition.severity,
      managerDecision: condition.managerDecision ?? null,
    };
  }

  if (condition.severity === "critical") {
    return {
      code: "CRITICAL_CONDITION",
      label: "Κρίσιμη ενεργή εκκρεμότητα",
      message: `Το συμβάν "${label}" έχει κρίσιμη σοβαρότητα και απαιτεί διαχειριστική απόφαση.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.blockingStatus,
      severity: condition.severity,
      managerDecision: condition.managerDecision ?? null,
    };
  }

  if (condition.blockingStatus === "warning" && condition.severity === "high") {
    return {
      code: "HIGH_WARNING_CONDITION",
      label: "Ισχυρή προειδοποίηση",
      message: `Το συμβάν "${label}" δεν μπλοκάρει τυπικά, αλλά η σοβαρότητά του είναι υψηλή και επηρεάζει το readiness.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.blockingStatus,
      severity: condition.severity,
      managerDecision: condition.managerDecision ?? null,
    };
  }

  if (condition.status === "monitoring" || condition.managerDecision === "monitor") {
    return {
      code: "MONITORING_CONDITION",
      label: "Συμβάν σε παρακολούθηση",
      message: `Το συμβάν "${label}" παραμένει ενεργό σε κατάσταση παρακολούθησης.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.blockingStatus,
      severity: condition.severity,
      managerDecision: condition.managerDecision ?? null,
    };
  }

  if (condition.managerDecision === "allow_with_issue") {
    return {
      code: "ALLOW_WITH_ISSUE",
      label: "Επιτρεπτή διάθεση με ενεργό θέμα",
      message: `Για το συμβάν "${label}" υπάρχει διαχειριστική απόφαση συνέχισης διάθεσης με ενεργό θέμα.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.blockingStatus,
      severity: condition.severity,
      managerDecision: condition.managerDecision ?? null,
    };
  }

  if (condition.blockingStatus === "non_blocking") {
    return {
      code: "NON_BLOCKING_CONDITION",
      label: "Μη μπλοκαριστική εκκρεμότητα",
      message: `Το συμβάν "${label}" παραμένει ενεργό αλλά έχει χαρακτηριστεί ως μη μπλοκαριστικό.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.blockingStatus,
      severity: condition.severity,
      managerDecision: condition.managerDecision ?? null,
    };
  }

  return null;
}

function buildActionsForCondition(
  condition: ReadinessConditionInput
): ReadinessNextAction[] {
  const actions: ReadinessNextAction[] = [];
  const label = getConditionLabel(condition);

  if (isConditionBlocking(condition)) {
    actions.push({
      code: "RESOLVE_BLOCKING_CONDITIONS",
      label: "Επίλυση μπλοκαριστικών θεμάτων",
      message: `Απαιτείται επίλυση ή ρητή διαχειριστική επανεκτίμηση για το "${label}".`,
      conditionId: condition.id,
    });
  }

  if (
    condition.blockingStatus === "warning" ||
    condition.severity === "high" ||
    condition.severity === "critical"
  ) {
    actions.push({
      code: "REVIEW_WARNINGS",
      label: "Έλεγχος προειδοποιήσεων",
      message: `Χρειάζεται αξιολόγηση του "${label}" πριν το επόμενο check-in.`,
      conditionId: condition.id,
    });
  }

  if (condition.status === "monitoring" || condition.managerDecision === "monitor") {
    actions.push({
      code: "MONITOR_ACTIVE_CONDITIONS",
      label: "Παρακολούθηση ενεργών θεμάτων",
      message: `Το "${label}" παραμένει σε παρακολούθηση και πρέπει να ελεγχθεί εκ νέου.`,
      conditionId: condition.id,
    });
  }

  if (!condition.managerDecision) {
    actions.push({
      code: "WAIT_FOR_MANAGER_DECISION",
      label: "Αναμονή διαχειριστικής απόφασης",
      message: `Δεν υπάρχει ακόμη ρητή διαχειριστική απόφαση για το "${label}".`,
      conditionId: condition.id,
    });
  }

  return actions;
}

function buildExplainText(
  status: PropertyReadinessStatus,
  nextCheckInAt: Date | null,
  reasons: ReadinessReason[],
  counts: PropertyReadinessCounts
): string {
  const base =
    status === "ready"
      ? "Το ακίνητο θεωρείται έτοιμο για το επόμενο check-in."
      : status === "borderline"
      ? "Το ακίνητο βρίσκεται σε οριακή κατάσταση readiness."
      : status === "not_ready"
      ? "Το ακίνητο δεν θεωρείται έτοιμο για το επόμενο check-in."
      : "Η κατάσταση readiness του ακινήτου παραμένει άγνωστη.";

  const nextCheckInText = nextCheckInAt
    ? ` Επόμενο check-in: ${nextCheckInAt.toISOString()}.`
    : " Δεν υπάρχει καταγεγραμμένο επόμενο check-in.";

  const countsText = ` Ενεργά συμβάντα: ${counts.activeConditions}, μπλοκαριστικά: ${counts.blockingConditions}, προειδοποιήσεις: ${counts.warningConditions}.`;

  const firstReasons = reasons.slice(0, 3).map((item) => item.message);
  const reasonsText =
    firstReasons.length > 0 ? ` Κύριοι λόγοι: ${firstReasons.join(" ")}` : "";

  return `${base}${nextCheckInText}${countsText}${reasonsText}`.trim();
}

function sortReasons(reasons: ReadinessReason[]): ReadinessReason[] {
  const priorityMap: Record<ReadinessReason["code"], number> = {
    BLOCKING_CONDITION: 1,
    CRITICAL_CONDITION: 2,
    HIGH_WARNING_CONDITION: 3,
    MONITORING_CONDITION: 4,
    ALLOW_WITH_ISSUE: 5,
    NON_BLOCKING_CONDITION: 6,
    NO_NEXT_CHECKIN: 7,
    NO_ACTIVE_CONDITIONS: 8,
    UNKNOWN_DATA: 9,
  };

  return [...reasons].sort((a, b) => {
    const aPriority = priorityMap[a.code] ?? 999;
    const bPriority = priorityMap[b.code] ?? 999;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return (a.message || "").localeCompare(b.message || "", "el");
  });
}

function sortActions(actions: ReadinessNextAction[]): ReadinessNextAction[] {
  const priorityMap: Record<ReadinessNextAction["code"], number> = {
    RESOLVE_BLOCKING_CONDITIONS: 1,
    REVIEW_WARNINGS: 2,
    WAIT_FOR_MANAGER_DECISION: 3,
    MONITOR_ACTIVE_CONDITIONS: 4,
    VERIFY_PROPERTY_STATE: 5,
    NO_ACTION_REQUIRED: 6,
  };

  return [...actions].sort((a, b) => {
    const aPriority = priorityMap[a.code] ?? 999;
    const bPriority = priorityMap[b.code] ?? 999;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return (a.message || "").localeCompare(b.message || "", "el");
  });
}

export function computePropertyReadiness(
  input: ComputePropertyReadinessInput
): PropertyReadinessResult {
  const computedAt = input.now instanceof Date ? input.now : new Date();
  const nextCheckInAt = toDateOrNull(input.nextCheckInAt);

  const allConditions = Array.isArray(input.conditions)
    ? input.conditions.map(normalizeConditionDates)
    : [];

  const activeConditions = allConditions
    .filter(isActiveCondition)
    .sort((a, b) => getConditionPriority(a) - getConditionPriority(b));

  const counts = buildCounts(allConditions, activeConditions);
  const reasons: ReadinessReason[] = [];
  const nextActions: ReadinessNextAction[] = [];

  if (!nextCheckInAt) {
    pushUniqueReason(reasons, {
      code: "NO_NEXT_CHECKIN",
      label: "Δεν υπάρχει επόμενο check-in",
      message:
        "Δεν υπάρχει καταγεγραμμένο επόμενο check-in, άρα το readiness δεν μπορεί να αξιολογηθεί επιχειρησιακά με ακρίβεια.",
    });

    pushUniqueAction(nextActions, {
      code: "VERIFY_PROPERTY_STATE",
      label: "Έλεγχος κατάστασης ακινήτου",
      message:
        "Χρειάζεται επιβεβαίωση του επόμενου check-in ή της τρέχουσας επιχειρησιακής κατάστασης του ακινήτου.",
    });

    const sortedReasons = sortReasons(reasons);
    const sortedActions = sortActions(nextActions);

    return {
      status: "unknown",
      score: 0,
      reasons: sortedReasons,
      nextActions: sortedActions,
      counts,
      activeConditionIds: activeConditions.map((item) => item.id),
      blockingConditionIds: activeConditions
        .filter((item) => isConditionBlocking(item))
        .map((item) => item.id),
      warningConditionIds: activeConditions
        .filter((item) => item.blockingStatus === "warning")
        .map((item) => item.id),
      computedAt,
      nextCheckInAt,
      explain: buildExplainText("unknown", nextCheckInAt, sortedReasons, counts),
    };
  }

  if (activeConditions.length === 0) {
    pushUniqueReason(reasons, {
      code: "NO_ACTIVE_CONDITIONS",
      label: "Δεν υπάρχουν ενεργές εκκρεμότητες",
      message:
        "Δεν υπάρχουν ανοιχτά ή σε παρακολούθηση συμβάντα που να επηρεάζουν το readiness του ακινήτου.",
    });

    pushUniqueAction(nextActions, {
      code: "NO_ACTION_REQUIRED",
      label: "Δεν απαιτείται ενέργεια",
      message:
        "Δεν υπάρχει αυτή τη στιγμή ενεργό συμβάν που να απαιτεί ενέργεια πριν το επόμενο check-in.",
    });

    const sortedReasons = sortReasons(reasons);
    const sortedActions = sortActions(nextActions);

    return {
      status: "ready",
      score: 100,
      reasons: sortedReasons,
      nextActions: sortedActions,
      counts,
      activeConditionIds: [],
      blockingConditionIds: [],
      warningConditionIds: [],
      computedAt,
      nextCheckInAt,
      explain: buildExplainText("ready", nextCheckInAt, sortedReasons, counts),
    };
  }

  for (const condition of activeConditions) {
    const reason = buildReasonForCondition(condition);
    if (reason) {
      pushUniqueReason(reasons, reason);
    }

    const actions = buildActionsForCondition(condition);
    for (const action of actions) {
      pushUniqueAction(nextActions, action);
    }
  }

  const hasBlockingCondition = activeConditions.some((item) =>
    isConditionBlocking(item)
  );

  const hasCriticalCondition = activeConditions.some(
    (item) => item.severity === "critical"
  );

  const hasHighWarningCondition = activeConditions.some(
    (item) => item.blockingStatus === "warning" && item.severity === "high"
  );

  const hasMonitoringCondition = activeConditions.some(
    (item) => item.status === "monitoring" || item.managerDecision === "monitor"
  );

  const hasWarnings = activeConditions.some(
    (item) => item.blockingStatus === "warning"
  );

  const hasOnlySoftConditions = activeConditions.every(
    (item) =>
      !isConditionBlocking(item) &&
      item.severity !== "critical" &&
      (item.blockingStatus === "non_blocking" ||
        item.blockingStatus === "warning" ||
        item.status === "monitoring" ||
        item.managerDecision === "allow_with_issue" ||
        item.managerDecision === "monitor")
  );

  let status: PropertyReadinessStatus = "unknown";
  let score = 0;

  if (hasBlockingCondition || hasCriticalCondition) {
    status = "not_ready";
    score = 20;
  } else if (hasHighWarningCondition || hasMonitoringCondition || hasWarnings) {
    status = "borderline";
    score = 60;
  } else if (hasOnlySoftConditions) {
    status = "ready";
    score = 85;
  } else {
    status = "borderline";
    score = 50;

    pushUniqueReason(reasons, {
      code: "UNKNOWN_DATA",
      label: "Μερικώς ασαφές readiness",
      message:
        "Υπάρχουν ενεργά συμβάντα αλλά δεν προκύπτει πλήρως καθαρή κατηγοριοποίηση από τα διαθέσιμα δεδομένα.",
    });

    pushUniqueAction(nextActions, {
      code: "VERIFY_PROPERTY_STATE",
      label: "Επιβεβαίωση κατάστασης ακινήτου",
      message:
        "Χρειάζεται επανέλεγχος των ενεργών συμβάντων και των διαχειριστικών αποφάσεων.",
    });
  }

  const sortedReasons = sortReasons(reasons);
  const sortedActions = sortActions(nextActions);

  return {
    status,
    score,
    reasons: sortedReasons,
    nextActions: sortedActions,
    counts,
    activeConditionIds: activeConditions.map((item) => item.id),
    blockingConditionIds: activeConditions
      .filter((item) => isConditionBlocking(item))
      .map((item) => item.id),
    warningConditionIds: activeConditions
      .filter((item) => item.blockingStatus === "warning")
      .map((item) => item.id),
    computedAt,
    nextCheckInAt,
    explain: buildExplainText(status, nextCheckInAt, sortedReasons, counts),
  };
}

export function getReadinessStatusLabel(
  status: PropertyReadinessStatus,
  language: "el" | "en" = "el"
): string {
  if (language === "en") {
    switch (status) {
      case "ready":
        return "Ready";
      case "borderline":
        return "Borderline";
      case "not_ready":
        return "Not ready";
      case "unknown":
      default:
        return "Unknown";
    }
  }

  switch (status) {
    case "ready":
      return "Έτοιμο";
    case "borderline":
      return "Οριακό";
    case "not_ready":
      return "Μη έτοιμο";
    case "unknown":
    default:
      return "Άγνωστο";
  }
}

export function getReadinessStatusSortWeight(
  status: PropertyReadinessStatus
): number {
  switch (status) {
    case "not_ready":
      return 1;
    case "borderline":
      return 2;
    case "unknown":
      return 3;
    case "ready":
    default:
      return 4;
  }
}

export function getConditionDisplayTitle(
  condition: Pick<
    ReadinessConditionInput,
    "conditionType" | "title" | "sourceItemLabel"
  >
): string {
  if (condition.title && condition.title.trim().length > 0) {
    return condition.title.trim();
  }

  if (condition.sourceItemLabel && condition.sourceItemLabel.trim().length > 0) {
    return condition.sourceItemLabel.trim();
  }

  if (condition.conditionType === "supply") {
    return "Έλλειψη αναλωσίμου";
  }

  if (condition.conditionType === "damage") {
    return "Ζημιά";
  }

  return "Βλάβη";
}

export function summarizeReadinessReasons(reasons: ReadinessReason[]): string {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    return "Δεν υπάρχουν καταγεγραμμένοι λόγοι readiness.";
  }

  return reasons.map((reason) => getSafeText(reason.message, reason.label)).join(" ");
}