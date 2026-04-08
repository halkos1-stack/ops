import {
  getPropertyConditionBlockingStatusLabel,
  getPropertyConditionDisplayLabel,
  getPropertyConditionManagerDecisionLabel,
  getPropertyConditionSeverityLabel,
  getPropertyConditionStatusLabel,
  getPropertyConditionTypeLabel,
  normalizePropertyConditionRules,
  sortPropertyConditionsByPriority,
  type PropertyConditionBlockingStatus,
  type PropertyConditionManagerDecision,
  type PropertyConditionRuleInput,
  type PropertyConditionSeverity,
  type PropertyConditionStatus,
  type PropertyConditionType,
  type PropertyReadinessStatus,
} from "./property-condition-rules"

export interface RawPropertyConditionRecord {
  id: string
  propertyId: string
  title?: string | null
  code?: string | null
  itemKey?: string | null
  itemLabel?: string | null
  notes?: string | null
  conditionType: PropertyConditionType | string
  status: PropertyConditionStatus | string
  blockingStatus: PropertyConditionBlockingStatus | string
  severity: PropertyConditionSeverity | string
  managerDecision?: PropertyConditionManagerDecision | string | null
  sourceType?: string | null
  sourceTaskId?: string | null
  sourceChecklistRunId?: string | null
  sourceChecklistAnswerId?: string | null
  createdAt?: Date | string | null
  updatedAt?: Date | string | null
  resolvedAt?: Date | string | null
  dismissedAt?: Date | string | null
}

export interface PropertyConditionExplainabilityReason {
  conditionId: string
  readinessImpact: "warning" | "blocking"
  reasonCode:
    | "blocking_condition"
    | "warning_condition"
    | "monitoring_condition"
  title: string
  message: string
  conditionType: PropertyConditionType
  status: PropertyConditionStatus
  blockingStatus: PropertyConditionBlockingStatus
  severity: PropertyConditionSeverity
  managerDecision: PropertyConditionManagerDecision | null
}

export interface PropertyConditionApiItem {
  id: string
  propertyId: string
  title: string
  code: string | null
  itemKey: string | null
  itemLabel: string | null
  notes: string | null
  conditionType: PropertyConditionType
  status: PropertyConditionStatus
  blockingStatus: PropertyConditionBlockingStatus
  severity: PropertyConditionSeverity
  managerDecision: PropertyConditionManagerDecision | null
  conditionTypeLabel: string
  statusLabel: string
  blockingStatusLabel: string
  severityLabel: string
  managerDecisionLabel: string
  displayLabel: string
  sourceType: string | null
  sourceTaskId: string | null
  sourceChecklistRunId: string | null
  sourceChecklistAnswerId: string | null
  createdAt: string | null
  updatedAt: string | null
  resolvedAt: string | null
  dismissedAt: string | null
  isActive: boolean
  isResolvedLike: boolean
  isBlocking: boolean
  isWarning: boolean
  isMonitoring: boolean
  shouldAppearInActiveConditions: boolean
  shouldAffectReadiness: boolean
  readinessImpact: "none" | "warning" | "blocking"
  readinessStatusSuggestion: PropertyReadinessStatus
  effectiveStatus: PropertyConditionStatus
  effectiveBlockingStatus: PropertyConditionBlockingStatus
  effectiveSeverity: PropertyConditionSeverity
  effectiveManagerDecision: PropertyConditionManagerDecision | null
  sortPriority: number
}

export interface PropertyConditionCountsByType {
  supply: number
  issue: number
  damage: number
}

export interface PropertyConditionCountsByStatus {
  open: number
  monitoring: number
  resolved: number
  dismissed: number
}

export interface PropertyConditionCountsByBlockingStatus {
  blocking: number
  non_blocking: number
  warning: number
}

export interface PropertyConditionCountsBySeverity {
  low: number
  medium: number
  high: number
  critical: number
}

export interface PropertyConditionSummary {
  total: number
  active: number
  resolvedLike: number
  open: number
  monitoring: number
  resolved: number
  dismissed: number
  blocking: number
  warning: number
  nonBlockingActive: number
  affectingReadiness: number
  supply: number
  issue: number
  damage: number
  low: number
  medium: number
  high: number
  critical: number
  byType: PropertyConditionCountsByType
  byStatus: PropertyConditionCountsByStatus
  byBlockingStatus: PropertyConditionCountsByBlockingStatus
  bySeverity: PropertyConditionCountsBySeverity
}

export interface PropertyConditionBuckets {
  all: PropertyConditionApiItem[]
  active: PropertyConditionApiItem[]
  resolvedLike: PropertyConditionApiItem[]
  blocking: PropertyConditionApiItem[]
  warning: PropertyConditionApiItem[]
  monitoring: PropertyConditionApiItem[]
  supply: PropertyConditionApiItem[]
  issue: PropertyConditionApiItem[]
  damage: PropertyConditionApiItem[]
}

export interface PropertyConditionSnapshot {
  conditions: PropertyConditionApiItem[]
  summary: PropertyConditionSummary
  reasons: PropertyConditionExplainabilityReason[]
  buckets: PropertyConditionBuckets
}

function normalizeText(value?: string | null): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toIsoString(value?: Date | string | null): string | null {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function coerceConditionType(
  value: RawPropertyConditionRecord["conditionType"]
): PropertyConditionType {
  if (value === "supply" || value === "issue" || value === "damage") {
    return value
  }

  return "issue"
}

function coerceStatus(
  value: RawPropertyConditionRecord["status"]
): PropertyConditionStatus {
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

function coerceBlockingStatus(
  value: RawPropertyConditionRecord["blockingStatus"]
): PropertyConditionBlockingStatus {
  if (
    value === "blocking" ||
    value === "non_blocking" ||
    value === "warning"
  ) {
    return value
  }

  return "warning"
}

function coerceSeverity(
  value: RawPropertyConditionRecord["severity"]
): PropertyConditionSeverity {
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

function coerceManagerDecision(
  value?: RawPropertyConditionRecord["managerDecision"]
): PropertyConditionManagerDecision | null {
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

export interface DbPropertyConditionInput {
  id: string
  propertyId: string
  taskId?: string | null
  bookingId?: string | null
  propertySupplyId?: string | null
  mergeKey?: string | null
  title: string
  description?: string | null
  sourceType?: string | null
  sourceLabel?: string | null
  sourceItemId?: string | null
  sourceItemLabel?: string | null
  sourceRunId?: string | null
  sourceAnswerId?: string | null
  conditionType: string
  status: string
  blockingStatus: string
  severity: string
  managerDecision?: string | null
  managerNotes?: string | null
  firstDetectedAt?: Date | string | null
  lastDetectedAt?: Date | string | null
  createdAt?: Date | string | null
  updatedAt?: Date | string | null
  resolvedAt?: Date | string | null
  dismissedAt?: Date | string | null
}

export function mapDbConditionToRawRecord(
  input: DbPropertyConditionInput
): RawPropertyConditionRecord {
  const toLower = (v: unknown) => String(v ?? "").trim().toLowerCase()
  return {
    id: input.id,
    propertyId: input.propertyId,
    title: input.title,
    code: normalizeText(input.sourceLabel),
    itemKey: normalizeText(input.sourceItemId),
    itemLabel: normalizeText(input.sourceItemLabel),
    notes: normalizeText(input.managerNotes) ?? normalizeText(input.description),
    conditionType: coerceConditionType(toLower(input.conditionType)),
    status: coerceStatus(toLower(input.status)),
    blockingStatus: coerceBlockingStatus(toLower(input.blockingStatus)),
    severity: coerceSeverity(toLower(input.severity)),
    managerDecision: coerceManagerDecision(toLower(input.managerDecision) || undefined),
    sourceType: normalizeText(input.sourceType),
    sourceTaskId: input.taskId ?? null,
    sourceChecklistRunId: normalizeText(input.sourceRunId),
    sourceChecklistAnswerId: normalizeText(input.sourceAnswerId),
    createdAt: input.createdAt ?? null,
    updatedAt: input.updatedAt ?? null,
    resolvedAt: input.resolvedAt ?? null,
    dismissedAt: input.dismissedAt ?? null,
  }
}

export function mapRawPropertyConditionToRuleInput(
  condition: RawPropertyConditionRecord
): PropertyConditionRuleInput {
  return {
    id: condition.id,
    propertyId: condition.propertyId,
    title: normalizeText(condition.title),
    code: normalizeText(condition.code),
    itemKey: normalizeText(condition.itemKey),
    itemLabel: normalizeText(condition.itemLabel),
    notes: normalizeText(condition.notes),
    conditionType: coerceConditionType(condition.conditionType),
    status: coerceStatus(condition.status),
    blockingStatus: coerceBlockingStatus(condition.blockingStatus),
    severity: coerceSeverity(condition.severity),
    managerDecision: coerceManagerDecision(condition.managerDecision),
  }
}

export function mapPropertyConditionRecord(
  condition: RawPropertyConditionRecord
): PropertyConditionApiItem {
  const ruleInput = mapRawPropertyConditionToRuleInput(condition)
  const normalized = normalizePropertyConditionRules(ruleInput)
  const rawTitle = normalizeText(condition.title)
  const rawCode = normalizeText(condition.code)
  const rawItemKey = normalizeText(condition.itemKey)
  const rawItemLabel = normalizeText(condition.itemLabel)
  const rawNotes = normalizeText(condition.notes)

  return {
    id: condition.id,
    propertyId: condition.propertyId,
    title: rawTitle ?? normalized.displayLabel,
    code: rawCode,
    itemKey: rawItemKey,
    itemLabel: rawItemLabel,
    notes: rawNotes,
    conditionType: ruleInput.conditionType,
    status: ruleInput.status,
    blockingStatus: ruleInput.blockingStatus,
    severity: ruleInput.severity,
    managerDecision: ruleInput.managerDecision ?? null,
    conditionTypeLabel: getPropertyConditionTypeLabel(ruleInput.conditionType),
    statusLabel: getPropertyConditionStatusLabel(normalized.effectiveStatus),
    blockingStatusLabel: getPropertyConditionBlockingStatusLabel(
      normalized.effectiveBlockingStatus
    ),
    severityLabel: getPropertyConditionSeverityLabel(normalized.effectiveSeverity),
    managerDecisionLabel: getPropertyConditionManagerDecisionLabel(
      normalized.effectiveManagerDecision
    ),
    displayLabel:
      rawTitle ??
      getPropertyConditionDisplayLabel({
        title: rawTitle,
        itemLabel: rawItemLabel,
        code: rawCode,
        conditionType: ruleInput.conditionType,
      }),
    sourceType: normalizeText(condition.sourceType),
    sourceTaskId: normalizeText(condition.sourceTaskId),
    sourceChecklistRunId: normalizeText(condition.sourceChecklistRunId),
    sourceChecklistAnswerId: normalizeText(condition.sourceChecklistAnswerId),
    createdAt: toIsoString(condition.createdAt),
    updatedAt: toIsoString(condition.updatedAt),
    resolvedAt: toIsoString(condition.resolvedAt),
    dismissedAt: toIsoString(condition.dismissedAt),
    isActive: normalized.isActive,
    isResolvedLike: normalized.isResolvedLike,
    isBlocking: normalized.isBlocking,
    isWarning: normalized.isWarning,
    isMonitoring: normalized.isMonitoring,
    shouldAppearInActiveConditions: normalized.shouldAppearInActiveConditions,
    shouldAffectReadiness: normalized.shouldAffectReadiness,
    readinessImpact: normalized.readinessImpact,
    readinessStatusSuggestion: normalized.readinessStatusSuggestion,
    effectiveStatus: normalized.effectiveStatus,
    effectiveBlockingStatus: normalized.effectiveBlockingStatus,
    effectiveSeverity: normalized.effectiveSeverity,
    effectiveManagerDecision: normalized.effectiveManagerDecision ?? null,
    sortPriority: normalized.sortPriority,
  }
}

export function mapPropertyConditionRecords(
  conditions: RawPropertyConditionRecord[]
): PropertyConditionApiItem[] {
  const sorted = sortPropertyConditionsByPriority(
    conditions.map((condition) => mapRawPropertyConditionToRuleInput(condition))
  )

  const orderMap = new Map<string, number>()
  sorted.forEach((condition, index) => {
    if (condition.id) {
      orderMap.set(condition.id, index)
    }
  })

  return [...conditions]
    .map((condition) => mapPropertyConditionRecord(condition))
    .sort((a, b) => {
      const aOrder = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER
      const bOrder = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER

      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }

      return a.displayLabel.localeCompare(b.displayLabel, "en")
    })
}

export function buildPropertyConditionExplainabilityReason(
  condition: PropertyConditionApiItem
): PropertyConditionExplainabilityReason | null {
  if (!condition.isActive || !condition.shouldAffectReadiness) {
    return null
  }

  let reasonCode:
    | "blocking_condition"
    | "warning_condition"
    | "monitoring_condition" = "warning_condition"

  let message = `${condition.displayLabel} is still active, so the property is not ready today.`

  if (condition.isBlocking) {
    reasonCode = "blocking_condition"
    message = `${condition.displayLabel} is an active blocking condition, so the property is not ready today.`
  } else if (condition.isMonitoring) {
    reasonCode = "monitoring_condition"
    message = `${condition.displayLabel} remains active under monitoring. Monitoring does not resolve the condition, so the property is not ready today.`
  }

  if (condition.effectiveManagerDecision === "allow_with_issue") {
    message = `${condition.displayLabel} is still active. Manager override may allow operations, but it does not restore ready status until explicit resolution or dismissal.`
  }

  if (condition.effectiveManagerDecision === "block_until_resolved") {
    reasonCode = "blocking_condition"
    message = `${condition.displayLabel} has a manager decision to block until resolved, so the property is not ready today.`
  }

  return {
    conditionId: condition.id,
    readinessImpact: condition.readinessImpact === "blocking" ? "blocking" : "warning",
    reasonCode,
    title: condition.displayLabel,
    message,
    conditionType: condition.conditionType,
    status: condition.effectiveStatus,
    blockingStatus: condition.effectiveBlockingStatus,
    severity: condition.effectiveSeverity,
    managerDecision: condition.effectiveManagerDecision,
  }
}

export function buildPropertyConditionExplainabilityReasons(
  conditions: PropertyConditionApiItem[]
): PropertyConditionExplainabilityReason[] {
  return conditions
    .map((condition) => buildPropertyConditionExplainabilityReason(condition))
    .filter(
      (reason): reason is PropertyConditionExplainabilityReason =>
        reason !== null
    )
    .sort((a, b) => {
      if (a.readinessImpact !== b.readinessImpact) {
        return a.readinessImpact === "blocking" ? -1 : 1
      }

      const severityOrder: Record<PropertyConditionSeverity, number> = {
        critical: 1,
        high: 2,
        medium: 3,
        low: 4,
      }

      const severityCompare = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityCompare !== 0) {
        return severityCompare
      }

      return a.title.localeCompare(b.title, "en")
    })
}

export function buildEmptyPropertyConditionSummary(): PropertyConditionSummary {
  return {
    total: 0,
    active: 0,
    resolvedLike: 0,
    open: 0,
    monitoring: 0,
    resolved: 0,
    dismissed: 0,
    blocking: 0,
    warning: 0,
    nonBlockingActive: 0,
    affectingReadiness: 0,
    supply: 0,
    issue: 0,
    damage: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
    byType: {
      supply: 0,
      issue: 0,
      damage: 0,
    },
    byStatus: {
      open: 0,
      monitoring: 0,
      resolved: 0,
      dismissed: 0,
    },
    byBlockingStatus: {
      blocking: 0,
      non_blocking: 0,
      warning: 0,
    },
    bySeverity: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
  }
}

export function buildPropertyConditionSummary(
  conditions: PropertyConditionApiItem[]
): PropertyConditionSummary {
  const summary = buildEmptyPropertyConditionSummary()

  for (const condition of conditions) {
    summary.total += 1

    if (condition.isActive) {
      summary.active += 1
    }

    if (condition.isResolvedLike) {
      summary.resolvedLike += 1
    }

    summary.byType[condition.conditionType] += 1
    summary.byStatus[condition.effectiveStatus] += 1
    summary.byBlockingStatus[condition.effectiveBlockingStatus] += 1
    summary.bySeverity[condition.effectiveSeverity] += 1

    summary[condition.conditionType] += 1
    summary[condition.effectiveStatus] += 1
    summary[condition.effectiveSeverity] += 1

    if (condition.isBlocking) {
      summary.blocking += 1
    } else if (condition.isWarning) {
      summary.warning += 1
    } else if (condition.isActive) {
      summary.nonBlockingActive += 1
    }

    if (condition.shouldAffectReadiness) {
      summary.affectingReadiness += 1
    }
  }

  return summary
}

export function buildPropertyConditionBuckets(
  conditions: PropertyConditionApiItem[]
): PropertyConditionBuckets {
  return {
    all: [...conditions],
    active: conditions.filter((condition) => condition.isActive),
    resolvedLike: conditions.filter((condition) => condition.isResolvedLike),
    blocking: conditions.filter((condition) => condition.isBlocking),
    warning: conditions.filter((condition) => condition.isWarning),
    monitoring: conditions.filter((condition) => condition.isMonitoring),
    supply: conditions.filter((condition) => condition.conditionType === "supply"),
    issue: conditions.filter((condition) => condition.conditionType === "issue"),
    damage: conditions.filter((condition) => condition.conditionType === "damage"),
  }
}

export function buildPropertyConditionSnapshot(
  rawConditions: RawPropertyConditionRecord[]
): PropertyConditionSnapshot {
  const conditions = mapPropertyConditionRecords(rawConditions)

  return {
    conditions,
    summary: buildPropertyConditionSummary(conditions),
    reasons: buildPropertyConditionExplainabilityReasons(conditions),
    buckets: buildPropertyConditionBuckets(conditions),
  }
}

export function mapSinglePropertyConditionForApi(
  rawCondition: RawPropertyConditionRecord
): PropertyConditionApiItem {
  return mapPropertyConditionRecord(rawCondition)
}

export function mapPropertyConditionsForApi(
  rawConditions: RawPropertyConditionRecord[]
): PropertyConditionApiItem[] {
  return mapPropertyConditionRecords(rawConditions)
}

export function buildPropertyConditionsSummaryFromRaw(
  rawConditions: RawPropertyConditionRecord[]
): PropertyConditionSummary {
  return buildPropertyConditionSummary(mapPropertyConditionRecords(rawConditions))
}

export function buildPropertyConditionReasonsFromRaw(
  rawConditions: RawPropertyConditionRecord[]
): PropertyConditionExplainabilityReason[] {
  return buildPropertyConditionExplainabilityReasons(
    mapPropertyConditionRecords(rawConditions)
  )
}

export function getActivePropertyConditions(
  conditions: PropertyConditionApiItem[]
): PropertyConditionApiItem[] {
  return conditions.filter((condition) => condition.isActive)
}

export function getBlockingPropertyConditions(
  conditions: PropertyConditionApiItem[]
): PropertyConditionApiItem[] {
  return conditions.filter((condition) => condition.isBlocking)
}

export function getWarningPropertyConditions(
  conditions: PropertyConditionApiItem[]
): PropertyConditionApiItem[] {
  return conditions.filter((condition) => condition.isWarning)
}

export function getMonitoringPropertyConditions(
  conditions: PropertyConditionApiItem[]
): PropertyConditionApiItem[] {
  return conditions.filter((condition) => condition.isMonitoring)
}

export function getResolvedLikePropertyConditions(
  conditions: PropertyConditionApiItem[]
): PropertyConditionApiItem[] {
  return conditions.filter((condition) => condition.isResolvedLike)
}

export function getLatestPropertyConditionUpdateAt(
  conditions: PropertyConditionApiItem[]
): string | null {
  const timestamps = conditions
    .map((condition) => condition.updatedAt ?? condition.createdAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value))

  if (timestamps.length === 0) {
    return null
  }

  return new Date(Math.max(...timestamps)).toISOString()
}

export function buildMinimalPropertyConditionReference(
  condition: PropertyConditionApiItem
): {
  id: string
  title: string
  conditionType: PropertyConditionType
  status: PropertyConditionStatus
  blockingStatus: PropertyConditionBlockingStatus
  severity: PropertyConditionSeverity
  managerDecision: PropertyConditionManagerDecision | null
  readinessImpact: "none" | "warning" | "blocking"
} {
  return {
    id: condition.id,
    title: condition.displayLabel,
    conditionType: condition.conditionType,
    status: condition.effectiveStatus,
    blockingStatus: condition.effectiveBlockingStatus,
    severity: condition.effectiveSeverity,
    managerDecision: condition.effectiveManagerDecision,
    readinessImpact: condition.readinessImpact,
  }
}

export function buildMinimalPropertyConditionReferences(
  conditions: PropertyConditionApiItem[]
): Array<ReturnType<typeof buildMinimalPropertyConditionReference>> {
  return conditions.map((condition) =>
    buildMinimalPropertyConditionReference(condition)
  )
}

export function getPropertyConditionReadableStateLine(
  condition: PropertyConditionApiItem
): string {
  const pieces: string[] = [
    condition.displayLabel,
    `type: ${condition.conditionTypeLabel.toLowerCase()}`,
    `status: ${condition.statusLabel.toLowerCase()}`,
    `severity: ${condition.severityLabel.toLowerCase()}`,
    `blocking: ${condition.blockingStatusLabel.toLowerCase()}`,
  ]

  if (condition.effectiveManagerDecision) {
    pieces.push(`manager decision: ${condition.managerDecisionLabel.toLowerCase()}`)
  }

  if (condition.isActive) {
    pieces.push("readiness: property remains not ready")
  } else {
    pieces.push("readiness: no active impact")
  }

  return pieces.join(" | ")
}

export function getPropertyConditionReadableStateLines(
  conditions: PropertyConditionApiItem[]
): string[] {
  return conditions.map((condition) =>
    getPropertyConditionReadableStateLine(condition)
  )
}

export function buildPropertyConditionTypeSummaryLine(
  summary: PropertyConditionSummary
): string {
  return `Supply: ${summary.supply}, Issue: ${summary.issue}, Damage: ${summary.damage}`
}

export function buildPropertyConditionReadinessSummaryLine(
  summary: PropertyConditionSummary
): string {
  return `Active: ${summary.active}, Blocking: ${summary.blocking}, Warning: ${summary.warning}, Affecting readiness: ${summary.affectingReadiness}`
}

export function mapRawConditionRecordArrayToSnapshot(
  rawConditions: RawPropertyConditionRecord[]
): PropertyConditionSnapshot {
  return buildPropertyConditionSnapshot(rawConditions)
}

export function buildConditionIdMap(
  conditions: PropertyConditionApiItem[]
): Map<string, PropertyConditionApiItem> {
  return new Map(conditions.map((condition) => [condition.id, condition]))
}

export function buildRawConditionIdMap(
  rawConditions: RawPropertyConditionRecord[]
): Map<string, RawPropertyConditionRecord> {
  return new Map(rawConditions.map((condition) => [condition.id, condition]))
}

export function getPropertyConditionById(
  conditions: PropertyConditionApiItem[],
  conditionId: string
): PropertyConditionApiItem | null {
  return conditions.find((condition) => condition.id === conditionId) ?? null
}

export function getRawPropertyConditionById(
  rawConditions: RawPropertyConditionRecord[],
  conditionId: string
): RawPropertyConditionRecord | null {
  return rawConditions.find((condition) => condition.id === conditionId) ?? null
}

export function hasBlockingPropertyConditions(
  conditions: PropertyConditionApiItem[]
): boolean {
  return conditions.some((condition) => condition.isBlocking)
}

export function hasWarningPropertyConditions(
  conditions: PropertyConditionApiItem[]
): boolean {
  return conditions.some((condition) => condition.isWarning)
}

export function hasActivePropertyConditions(
  conditions: PropertyConditionApiItem[]
): boolean {
  return conditions.some((condition) => condition.isActive)
}
