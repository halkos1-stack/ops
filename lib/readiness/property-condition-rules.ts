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

export interface PropertyConditionRuleInput {
  id?: string;
  propertyId?: string;

  title?: string | null;
  code?: string | null;
  itemKey?: string | null;
  itemLabel?: string | null;
  notes?: string | null;

  conditionType: PropertyConditionType;
  status: PropertyConditionStatus;
  blockingStatus: PropertyConditionBlockingStatus;
  severity: PropertyConditionSeverity;
  managerDecision?: PropertyConditionManagerDecision | null;
}

export interface NormalizedPropertyConditionRules {
  id?: string;
  propertyId?: string;

  title: string | null;
  code: string | null;
  itemKey: string | null;
  itemLabel: string | null;
  notes: string | null;

  conditionType: PropertyConditionType;
  status: PropertyConditionStatus;
  blockingStatus: PropertyConditionBlockingStatus;
  severity: PropertyConditionSeverity;
  managerDecision: PropertyConditionManagerDecision | null;

  displayLabel: string;

  isActive: boolean;
  isResolvedLike: boolean;

  isBlocking: boolean;
  isWarning: boolean;
  isMonitoring: boolean;

  shouldAppearInActiveConditions: boolean;
  shouldAffectReadiness: boolean;

  readinessImpact: "none" | "warning" | "blocking";
  readinessStatusSuggestion: PropertyReadinessStatus;

  effectiveStatus: PropertyConditionStatus;
  effectiveBlockingStatus: PropertyConditionBlockingStatus;
  effectiveSeverity: PropertyConditionSeverity;
  effectiveManagerDecision: PropertyConditionManagerDecision | null;

  sortPriority: number;
}

function normalizeText(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function coerceConditionType(value: unknown): PropertyConditionType {
  if (value === "supply" || value === "issue" || value === "damage") {
    return value;
  }

  return "issue";
}

function coerceStatus(value: unknown): PropertyConditionStatus {
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

function coerceBlockingStatus(value: unknown): PropertyConditionBlockingStatus {
  if (
    value === "blocking" ||
    value === "non_blocking" ||
    value === "warning"
  ) {
    return value;
  }

  return "warning";
}

function coerceSeverity(value: unknown): PropertyConditionSeverity {
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

function coerceManagerDecision(
  value: unknown
): PropertyConditionManagerDecision | null {
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

export function getPropertyConditionTypeLabel(
  value: PropertyConditionType
): string {
  switch (value) {
    case "supply":
      return "Αναλώσιμο";
    case "issue":
      return "Βλάβη / θέμα";
    case "damage":
      return "Ζημιά";
    default:
      return "Θέμα";
  }
}

export function getPropertyConditionStatusLabel(
  value: PropertyConditionStatus
): string {
  switch (value) {
    case "open":
      return "Ανοιχτό";
    case "monitoring":
      return "Σε παρακολούθηση";
    case "resolved":
      return "Επιλυμένο";
    case "dismissed":
      return "Απορρίφθηκε";
    default:
      return "Άγνωστο";
  }
}

export function getPropertyConditionBlockingStatusLabel(
  value: PropertyConditionBlockingStatus
): string {
  switch (value) {
    case "blocking":
      return "Μπλοκάρει";
    case "non_blocking":
      return "Μη μπλοκαριστικό";
    case "warning":
      return "Προειδοποίηση";
    default:
      return "Προειδοποίηση";
  }
}

export function getPropertyConditionSeverityLabel(
  value: PropertyConditionSeverity
): string {
  switch (value) {
    case "low":
      return "Χαμηλή";
    case "medium":
      return "Μεσαία";
    case "high":
      return "Υψηλή";
    case "critical":
      return "Κρίσιμη";
    default:
      return "Μεσαία";
  }
}

export function getPropertyConditionManagerDecisionLabel(
  value: PropertyConditionManagerDecision | null | undefined
): string {
  switch (value) {
    case "allow_with_issue":
      return "Επιτρέπεται με εκκρεμότητα";
    case "block_until_resolved":
      return "Μπλοκάρισμα μέχρι επίλυση";
    case "monitor":
      return "Παρακολούθηση";
    case "resolved":
      return "Επιλύθηκε";
    case "dismissed":
      return "Απορρίφθηκε";
    default:
      return "Χωρίς απόφαση";
  }
}

function getFallbackTitleByType(type: PropertyConditionType): string {
  switch (type) {
    case "supply":
      return "Έλλειψη αναλωσίμου";
    case "damage":
      return "Ενεργή ζημιά";
    case "issue":
    default:
      return "Ενεργή βλάβη";
  }
}

export function getPropertyConditionDisplayLabel(
  input: Pick<
    PropertyConditionRuleInput,
    "title" | "itemLabel" | "code" | "conditionType"
  >
): string {
  const title = normalizeText(input.title);
  if (title) {
    return title;
  }

  const itemLabel = normalizeText(input.itemLabel);
  if (itemLabel) {
    return itemLabel;
  }

  const code = normalizeText(input.code);
  if (code) {
    return `${getFallbackTitleByType(input.conditionType)} (${code})`;
  }

  return getFallbackTitleByType(input.conditionType);
}

function getEffectiveStatus(
  input: PropertyConditionRuleInput
): PropertyConditionStatus {
  const status = coerceStatus(input.status);
  const managerDecision = coerceManagerDecision(input.managerDecision);

  if (status === "resolved" || status === "dismissed") {
    return status;
  }

  if (managerDecision === "resolved") {
    return "resolved";
  }

  if (managerDecision === "dismissed") {
    return "dismissed";
  }

  if (managerDecision === "monitor") {
    return "monitoring";
  }

  return status;
}

function getEffectiveBlockingStatus(
  input: PropertyConditionRuleInput
): PropertyConditionBlockingStatus {
  const status = getEffectiveStatus(input);
  const blockingStatus = coerceBlockingStatus(input.blockingStatus);
  const managerDecision = coerceManagerDecision(input.managerDecision);

  if (status === "resolved" || status === "dismissed") {
    return "non_blocking";
  }

  if (managerDecision === "block_until_resolved") {
    return "blocking";
  }

  if (managerDecision === "allow_with_issue") {
    if (blockingStatus === "blocking") {
      return "warning";
    }

    return blockingStatus;
  }

  if (managerDecision === "monitor") {
    return "warning";
  }

  return blockingStatus;
}

function getEffectiveSeverity(
  input: PropertyConditionRuleInput
): PropertyConditionSeverity {
  return coerceSeverity(input.severity);
}

function getEffectiveManagerDecision(
  input: PropertyConditionRuleInput
): PropertyConditionManagerDecision | null {
  return coerceManagerDecision(input.managerDecision);
}

function getIsActive(status: PropertyConditionStatus): boolean {
  return status === "open" || status === "monitoring";
}

function getIsResolvedLike(status: PropertyConditionStatus): boolean {
  return status === "resolved" || status === "dismissed";
}

function getShouldAppearInActiveConditions(
  effectiveStatus: PropertyConditionStatus
): boolean {
  return getIsActive(effectiveStatus);
}

function getShouldAffectReadiness(
  effectiveStatus: PropertyConditionStatus,
  effectiveBlockingStatus: PropertyConditionBlockingStatus,
  effectiveSeverity: PropertyConditionSeverity
): boolean {
  if (!getIsActive(effectiveStatus)) {
    return false;
  }

  if (effectiveBlockingStatus === "blocking") {
    return true;
  }

  if (effectiveBlockingStatus === "warning") {
    return true;
  }

  if (effectiveSeverity === "critical") {
    return true;
  }

  return false;
}

function getReadinessImpact(
  effectiveStatus: PropertyConditionStatus,
  effectiveBlockingStatus: PropertyConditionBlockingStatus,
  effectiveSeverity: PropertyConditionSeverity
): "none" | "warning" | "blocking" {
  if (!getIsActive(effectiveStatus)) {
    return "none";
  }

  if (effectiveBlockingStatus === "blocking") {
    return "blocking";
  }

  if (
    effectiveBlockingStatus === "warning" ||
    effectiveSeverity === "critical"
  ) {
    return "warning";
  }

  return "none";
}

function getReadinessStatusSuggestion(
  effectiveStatus: PropertyConditionStatus,
  effectiveBlockingStatus: PropertyConditionBlockingStatus,
  effectiveSeverity: PropertyConditionSeverity
): PropertyReadinessStatus {
  if (!getIsActive(effectiveStatus)) {
    return "ready";
  }

  if (effectiveBlockingStatus === "blocking") {
    return "not_ready";
  }

  if (effectiveSeverity === "critical") {
    return "not_ready";
  }

  if (effectiveBlockingStatus === "warning") {
    return "borderline";
  }

  return "ready";
}

function getSortPriority(
  effectiveStatus: PropertyConditionStatus,
  effectiveBlockingStatus: PropertyConditionBlockingStatus,
  effectiveSeverity: PropertyConditionSeverity,
  conditionType: PropertyConditionType
): number {
  const statusWeight: Record<PropertyConditionStatus, number> = {
    open: 0,
    monitoring: 10,
    resolved: 100,
    dismissed: 110,
  };

  const blockingWeight: Record<PropertyConditionBlockingStatus, number> = {
    blocking: 0,
    warning: 10,
    non_blocking: 20,
  };

  const severityWeight: Record<PropertyConditionSeverity, number> = {
    critical: 0,
    high: 5,
    medium: 10,
    low: 15,
  };

  const typeWeight: Record<PropertyConditionType, number> = {
    damage: 0,
    issue: 5,
    supply: 10,
  };

  return (
    statusWeight[effectiveStatus] +
    blockingWeight[effectiveBlockingStatus] +
    severityWeight[effectiveSeverity] +
    typeWeight[conditionType]
  );
}

export function normalizePropertyConditionRules(
  input: PropertyConditionRuleInput
): NormalizedPropertyConditionRules {
  const conditionType = coerceConditionType(input.conditionType);
  const status = coerceStatus(input.status);
  const blockingStatus = coerceBlockingStatus(input.blockingStatus);
  const severity = coerceSeverity(input.severity);
  const managerDecision = coerceManagerDecision(input.managerDecision);

  const effectiveStatus = getEffectiveStatus({
    ...input,
    conditionType,
    status,
    blockingStatus,
    severity,
    managerDecision,
  });

  const effectiveBlockingStatus = getEffectiveBlockingStatus({
    ...input,
    conditionType,
    status,
    blockingStatus,
    severity,
    managerDecision,
  });

  const effectiveSeverity = getEffectiveSeverity({
    ...input,
    conditionType,
    status,
    blockingStatus,
    severity,
    managerDecision,
  });

  const effectiveManagerDecision = getEffectiveManagerDecision({
    ...input,
    conditionType,
    status,
    blockingStatus,
    severity,
    managerDecision,
  });

  const displayLabel = getPropertyConditionDisplayLabel({
    title: normalizeText(input.title),
    itemLabel: normalizeText(input.itemLabel),
    code: normalizeText(input.code),
    conditionType,
  });

  const isActive = getIsActive(effectiveStatus);
  const isResolvedLike = getIsResolvedLike(effectiveStatus);

  const shouldAppearInActiveConditions =
    getShouldAppearInActiveConditions(effectiveStatus);

  const shouldAffectReadiness = getShouldAffectReadiness(
    effectiveStatus,
    effectiveBlockingStatus,
    effectiveSeverity
  );

  const readinessImpact = getReadinessImpact(
    effectiveStatus,
    effectiveBlockingStatus,
    effectiveSeverity
  );

  const readinessStatusSuggestion = getReadinessStatusSuggestion(
    effectiveStatus,
    effectiveBlockingStatus,
    effectiveSeverity
  );

  const isBlocking = readinessImpact === "blocking";
  const isWarning = readinessImpact === "warning";
  const isMonitoring = effectiveStatus === "monitoring";

  return {
    id: input.id,
    propertyId: input.propertyId,

    title: normalizeText(input.title),
    code: normalizeText(input.code),
    itemKey: normalizeText(input.itemKey),
    itemLabel: normalizeText(input.itemLabel),
    notes: normalizeText(input.notes),

    conditionType,
    status,
    blockingStatus,
    severity,
    managerDecision,

    displayLabel,

    isActive,
    isResolvedLike,

    isBlocking,
    isWarning,
    isMonitoring,

    shouldAppearInActiveConditions,
    shouldAffectReadiness,

    readinessImpact,
    readinessStatusSuggestion,

    effectiveStatus,
    effectiveBlockingStatus,
    effectiveSeverity,
    effectiveManagerDecision,

    sortPriority: getSortPriority(
      effectiveStatus,
      effectiveBlockingStatus,
      effectiveSeverity,
      conditionType
    ),
  };
}

export function normalizePropertyConditionRulesList(
  inputs: PropertyConditionRuleInput[]
): NormalizedPropertyConditionRules[] {
  return inputs.map((input) => normalizePropertyConditionRules(input));
}

export function sortPropertyConditionsByPriority(
  conditions: PropertyConditionRuleInput[]
): NormalizedPropertyConditionRules[] {
  return normalizePropertyConditionRulesList(conditions).sort((a, b) => {
    if (a.sortPriority !== b.sortPriority) {
      return a.sortPriority - b.sortPriority;
    }

    return a.displayLabel.localeCompare(b.displayLabel, "el");
  });
}

export function getHighestReadinessStatusFromConditions(
  conditions: PropertyConditionRuleInput[]
): PropertyReadinessStatus {
  const normalized = normalizePropertyConditionRulesList(conditions);

  const hasNotReady = normalized.some(
    (condition) => condition.readinessStatusSuggestion === "not_ready"
  );
  if (hasNotReady) {
    return "not_ready";
  }

  const hasBorderline = normalized.some(
    (condition) => condition.readinessStatusSuggestion === "borderline"
  );
  if (hasBorderline) {
    return "borderline";
  }

  const hasReady = normalized.some(
    (condition) => condition.readinessStatusSuggestion === "ready"
  );
  if (hasReady) {
    return "ready";
  }

  return "unknown";
}

export function isPropertyConditionResolvedLike(
  input: PropertyConditionRuleInput
): boolean {
  return normalizePropertyConditionRules(input).isResolvedLike;
}

export function isPropertyConditionActive(
  input: PropertyConditionRuleInput
): boolean {
  return normalizePropertyConditionRules(input).isActive;
}

export function doesPropertyConditionAffectReadiness(
  input: PropertyConditionRuleInput
): boolean {
  return normalizePropertyConditionRules(input).shouldAffectReadiness;
}

export function isPropertyConditionBlocking(
  input: PropertyConditionRuleInput
): boolean {
  return normalizePropertyConditionRules(input).isBlocking;
}

export function isPropertyConditionWarning(
  input: PropertyConditionRuleInput
): boolean {
  return normalizePropertyConditionRules(input).isWarning;
}

export function getPropertyConditionReadableImpactLine(
  input: PropertyConditionRuleInput
): string {
  const normalized = normalizePropertyConditionRules(input);

  const pieces: string[] = [
    normalized.displayLabel,
    `τύπος: ${getPropertyConditionTypeLabel(normalized.conditionType).toLowerCase()}`,
    `κατάσταση: ${getPropertyConditionStatusLabel(normalized.effectiveStatus).toLowerCase()}`,
    `βαρύτητα: ${getPropertyConditionSeverityLabel(normalized.effectiveSeverity).toLowerCase()}`,
    `blocking: ${getPropertyConditionBlockingStatusLabel(normalized.effectiveBlockingStatus).toLowerCase()}`,
  ];

  if (normalized.effectiveManagerDecision) {
    pieces.push(
      `απόφαση: ${getPropertyConditionManagerDecisionLabel(
        normalized.effectiveManagerDecision
      ).toLowerCase()}`
    );
  }

  if (normalized.readinessImpact === "blocking") {
    pieces.push("impact: μπλοκάρει readiness");
  } else if (normalized.readinessImpact === "warning") {
    pieces.push("impact: οριακό readiness");
  } else {
    pieces.push("impact: χωρίς άμεσο readiness impact");
  }

  return pieces.join(" | ");
}

export function getPropertyConditionReadableImpactLines(
  inputs: PropertyConditionRuleInput[]
): string[] {
  return sortPropertyConditionsByPriority(inputs).map((condition) =>
    getPropertyConditionReadableImpactLine(condition)
  );
}