import {
  normalizePropertyConditionRules,
  type PropertyConditionBlockingStatus,
  type PropertyConditionManagerDecision,
  type PropertyConditionRuleInput,
  type PropertyConditionSeverity,
  type PropertyConditionType,
  type PropertyReadinessStatus,
} from "./property-condition-rules"

export type ReadinessConditionInput = PropertyConditionRuleInput & {
  propertyId: string
  description?: string | null
  locationText?: string | null
  firstDetectedAt?: Date | string | null
  lastDetectedAt?: Date | string | null
  resolvedAt?: Date | string | null
  dismissedAt?: Date | string | null
  createdAt?: Date | string | null
  updatedAt?: Date | string | null
  sourceType?: string | null
  sourceLabel?: string | null
  sourceItemId?: string | null
  sourceItemLabel?: string | null
  sourceRunId?: string | null
  sourceAnswerId?: string | null
  taskId?: string | null
  bookingId?: string | null
  propertySupplyId?: string | null
  mergeKey?: string | null
}

/**
 * Operational context που μπορεί να override το conditions-only readiness.
 * Όταν υπάρχει turnover εκκρεμότητα, η ετοιμότητα δεν μπορεί να είναι "ready"
 * ακόμα και αν δεν υπάρχουν active conditions.
 */
export type ReadinessOperationalContext = {
  /**
   * Canonical readiness από το operational status module.
   * Όταν "not_ready" λόγω turnover → override των conditions-based "ready".
   */
  derivedReadinessStatus: "ready" | "borderline" | "not_ready" | "unknown"
  /** Human-readable αιτιολόγηση για το operational override */
  operationalReason?: string | null
}

export type ComputePropertyReadinessInput = {
  now?: Date
  nextCheckInAt?: Date | string | null
  conditions?: ReadinessConditionInput[]
  /**
   * Προαιρετικό operational context.
   * Όταν παρέχεται και `derivedReadinessStatus === "not_ready"`,
   * το αποτέλεσμα δεν επιστρέφει "ready" ακόμα και αν δεν υπάρχουν active conditions.
   * Αυτό διασφαλίζει ότι το readiness αντικατοπτρίζει την πραγματική επιχειρησιακή αλήθεια.
   */
  operationalContext?: ReadinessOperationalContext
}

export type ReadinessReason = {
  code:
    | "NO_NEXT_CHECKIN"
    | "NO_ACTIVE_CONDITIONS"
    | "BLOCKING_CONDITION"
    | "WARNING_CONDITION"
    | "MONITORING_CONDITION"
    | "ALLOW_WITH_ISSUE"
    | "UNKNOWN_DATA"
    | "OPERATIONAL_PENDING"
  label: string
  message: string
  conditionId?: string
  conditionType?: PropertyConditionType
  blockingStatus?: PropertyConditionBlockingStatus
  severity?: PropertyConditionSeverity
  managerDecision?: PropertyConditionManagerDecision | null
}

export type ReadinessNextAction = {
  code:
    | "WAIT_FOR_MANAGER_DECISION"
    | "RESOLVE_BLOCKING_CONDITIONS"
    | "REVIEW_ACTIVE_WARNINGS"
    | "MONITOR_ACTIVE_CONDITIONS"
    | "VERIFY_PROPERTY_STATE"
    | "NO_ACTION_REQUIRED"
  label: string
  message: string
  conditionId?: string
}

export type PropertyReadinessCounts = {
  totalConditions: number
  activeConditions: number
  openConditions: number
  monitoringConditions: number
  resolvedConditions: number
  dismissedConditions: number
  blockingConditions: number
  warningConditions: number
  nonBlockingConditions: number
  criticalConditions: number
  highConditions: number
  mediumConditions: number
  lowConditions: number
  supplyConditions: number
  issueConditions: number
  damageConditions: number
}

export type PropertyReadinessResult = {
  status: PropertyReadinessStatus
  score: number
  reasons: ReadinessReason[]
  nextActions: ReadinessNextAction[]
  counts: PropertyReadinessCounts
  activeConditionIds: string[]
  blockingConditionIds: string[]
  warningConditionIds: string[]
  computedAt: Date
  nextCheckInAt: Date | null
  explain: string
}

type NormalizedReadinessCondition = ReturnType<
  typeof normalizePropertyConditionRules
> &
  ReadinessConditionInput & {
    firstDetectedAt: Date | null
    lastDetectedAt: Date | null
    resolvedAt: Date | null
    dismissedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizeConditionDates(
  condition: ReadinessConditionInput
): NormalizedReadinessCondition {
  return {
    ...condition,
    ...normalizePropertyConditionRules(condition),
    firstDetectedAt: toDateOrNull(condition.firstDetectedAt),
    lastDetectedAt: toDateOrNull(condition.lastDetectedAt),
    resolvedAt: toDateOrNull(condition.resolvedAt),
    dismissedAt: toDateOrNull(condition.dismissedAt),
    createdAt: toDateOrNull(condition.createdAt),
    updatedAt: toDateOrNull(condition.updatedAt),
  }
}

function getConditionPriority(condition: NormalizedReadinessCondition): number {
  if (condition.readinessImpact === "blocking") return 1
  if (condition.effectiveManagerDecision === "allow_with_issue") return 2
  if (condition.isMonitoring) return 3
  if (condition.readinessImpact === "warning") return 4
  return 10
}

function buildCounts(
  allConditions: NormalizedReadinessCondition[],
  activeConditions: NormalizedReadinessCondition[]
): PropertyReadinessCounts {
  return {
    totalConditions: allConditions.length,
    activeConditions: activeConditions.length,
    openConditions: allConditions.filter((item) => item.effectiveStatus === "open")
      .length,
    monitoringConditions: allConditions.filter(
      (item) => item.effectiveStatus === "monitoring"
    ).length,
    resolvedConditions: allConditions.filter(
      (item) => item.effectiveStatus === "resolved"
    ).length,
    dismissedConditions: allConditions.filter(
      (item) => item.effectiveStatus === "dismissed"
    ).length,
    blockingConditions: activeConditions.filter((item) => item.isBlocking).length,
    warningConditions: activeConditions.filter(
      (item) => item.readinessImpact === "warning"
    ).length,
    nonBlockingConditions: activeConditions.filter(
      (item) => item.effectiveBlockingStatus === "non_blocking"
    ).length,
    criticalConditions: activeConditions.filter(
      (item) => item.effectiveSeverity === "critical"
    ).length,
    highConditions: activeConditions.filter((item) => item.effectiveSeverity === "high")
      .length,
    mediumConditions: activeConditions.filter(
      (item) => item.effectiveSeverity === "medium"
    ).length,
    lowConditions: activeConditions.filter((item) => item.effectiveSeverity === "low")
      .length,
    supplyConditions: activeConditions.filter((item) => item.conditionType === "supply")
      .length,
    issueConditions: activeConditions.filter((item) => item.conditionType === "issue")
      .length,
    damageConditions: activeConditions.filter((item) => item.conditionType === "damage")
      .length,
  }
}

function pushUniqueReason(reasons: ReadinessReason[], reason: ReadinessReason): void {
  const exists = reasons.some(
    (item) =>
      item.code === reason.code &&
      item.conditionId === reason.conditionId &&
      item.message === reason.message
  )

  if (!exists) {
    reasons.push(reason)
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
  )

  if (!exists) {
    actions.push(action)
  }
}

function buildReasonForCondition(
  condition: NormalizedReadinessCondition
): ReadinessReason {
  if (condition.readinessImpact === "blocking") {
    return {
      code: "BLOCKING_CONDITION",
      label: "Active blocking condition",
      message: `"${condition.displayLabel}" remains active and blocks the property from being ready today.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.effectiveBlockingStatus,
      severity: condition.effectiveSeverity,
      managerDecision: condition.effectiveManagerDecision,
    }
  }

  if (condition.effectiveManagerDecision === "allow_with_issue") {
    return {
      code: "ALLOW_WITH_ISSUE",
      label: "Allowed with unresolved issue",
      message: `"${condition.displayLabel}" is still active. The manager may allow operations, but the property stays borderline until the condition is explicitly resolved or dismissed.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.effectiveBlockingStatus,
      severity: condition.effectiveSeverity,
      managerDecision: condition.effectiveManagerDecision,
    }
  }

  if (condition.isMonitoring) {
    return {
      code: "MONITORING_CONDITION",
      label: "Active monitoring condition",
      message: `"${condition.displayLabel}" remains under active monitoring. Monitoring is not resolution, so the property is not cleanly ready today.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.effectiveBlockingStatus,
      severity: condition.effectiveSeverity,
      managerDecision: condition.effectiveManagerDecision,
    }
  }

  return {
    code: "WARNING_CONDITION",
    label: "Active non-blocking condition",
    message: `"${condition.displayLabel}" is still active. It does not fully block operations, but it keeps the property in a borderline readiness state until explicit closure.`,
    conditionId: condition.id,
    conditionType: condition.conditionType,
    blockingStatus: condition.effectiveBlockingStatus,
    severity: condition.effectiveSeverity,
    managerDecision: condition.effectiveManagerDecision,
  }
}

function buildActionsForCondition(
  condition: NormalizedReadinessCondition
): ReadinessNextAction[] {
  const actions: ReadinessNextAction[] = []

  if (condition.readinessImpact === "blocking") {
    actions.push({
      code: "RESOLVE_BLOCKING_CONDITIONS",
      label: "Resolve blocking conditions",
      message: `Explicitly resolve, dismiss, or remediate "${condition.displayLabel}" before treating the property as ready.`,
      conditionId: condition.id,
    })
  } else {
    actions.push({
      code: "REVIEW_ACTIVE_WARNINGS",
      label: "Review active warning conditions",
      message: `Review "${condition.displayLabel}" and explicitly close it when it is truly resolved. Active warning conditions keep the property borderline.`,
      conditionId: condition.id,
    })
  }

  if (condition.isMonitoring) {
    actions.push({
      code: "MONITOR_ACTIVE_CONDITIONS",
      label: "Continue monitoring",
      message: `Continue monitoring "${condition.displayLabel}" until the property manager records a final resolved or dismissed state.`,
      conditionId: condition.id,
    })
  }

  if (!condition.effectiveManagerDecision) {
    actions.push({
      code: "WAIT_FOR_MANAGER_DECISION",
      label: "Record manager decision",
      message: `A manager decision is still missing for "${condition.displayLabel}". This does not resolve the condition by itself.`,
      conditionId: condition.id,
    })
  }

  return actions
}

function buildExplainText(params: {
  status: PropertyReadinessStatus
  nextCheckInAt: Date | null
  reasons: ReadinessReason[]
  counts: PropertyReadinessCounts
  operationalContext?: ReadinessOperationalContext
}): string {
  const { status, nextCheckInAt, reasons, counts } = params

  const operationalOverride =
    params.operationalContext?.derivedReadinessStatus === "not_ready" &&
    status === "ready"
      ? " However, an operational turnover window is pending — the property cannot be confirmed ready until execution proof is returned."
      : ""

  const base =
    status === "ready"
      ? "The property has no active conditions affecting readiness." + (operationalOverride || " It is available for the next guest.")
      : status === "borderline"
        ? "The property is borderline because active conditions still exist, but they do not currently block operations outright."
        : status === "not_ready"
          ? "The property is not ready because active blocking conditions still exist."
          : "The property state cannot be confirmed from the available condition data."

  const nextCheckInText = nextCheckInAt
    ? ` Next check-in: ${nextCheckInAt.toISOString()}.`
    : " No next check-in is currently linked."

  const countsText = ` Active conditions: ${counts.activeConditions}. Blocking: ${counts.blockingConditions}. Warning or monitoring: ${counts.warningConditions}.`

  const reasonsText =
    reasons.length > 0
      ? ` Current state: ${reasons
          .slice(0, 3)
          .map((item) => item.message)
          .join(" ")}`
      : ""

  return `${base}${nextCheckInText}${countsText}${reasonsText}`.trim()
}

function sortReasons(reasons: ReadinessReason[]): ReadinessReason[] {
  const priorityMap: Record<ReadinessReason["code"], number> = {
    BLOCKING_CONDITION: 1,
    OPERATIONAL_PENDING: 2,
    ALLOW_WITH_ISSUE: 3,
    MONITORING_CONDITION: 4,
    WARNING_CONDITION: 5,
    UNKNOWN_DATA: 6,
    NO_ACTIVE_CONDITIONS: 7,
    NO_NEXT_CHECKIN: 8,
  }

  return [...reasons].sort((a, b) => {
    const aPriority = priorityMap[a.code] ?? 999
    const bPriority = priorityMap[b.code] ?? 999
    if (aPriority !== bPriority) return aPriority - bPriority
    return (a.message || "").localeCompare(b.message || "", "en")
  })
}

function sortActions(actions: ReadinessNextAction[]): ReadinessNextAction[] {
  const priorityMap: Record<ReadinessNextAction["code"], number> = {
    RESOLVE_BLOCKING_CONDITIONS: 1,
    REVIEW_ACTIVE_WARNINGS: 2,
    MONITOR_ACTIVE_CONDITIONS: 3,
    WAIT_FOR_MANAGER_DECISION: 4,
    VERIFY_PROPERTY_STATE: 5,
    NO_ACTION_REQUIRED: 6,
  }

  return [...actions].sort((a, b) => {
    const aPriority = priorityMap[a.code] ?? 999
    const bPriority = priorityMap[b.code] ?? 999
    if (aPriority !== bPriority) return aPriority - bPriority
    return (a.message || "").localeCompare(b.message || "", "en")
  })
}

export function computePropertyReadiness(
  input: ComputePropertyReadinessInput
): PropertyReadinessResult {
  const computedAt = input.now instanceof Date ? input.now : new Date()
  const nextCheckInAt = toDateOrNull(input.nextCheckInAt)
  const operationalContext = input.operationalContext

  if (!Array.isArray(input.conditions)) {
    const reasons: ReadinessReason[] = [
      {
        code: "UNKNOWN_DATA",
        label: "Missing canonical condition data",
        message:
          "Canonical property conditions are missing, so the system cannot confirm the real property state for today.",
      },
    ]

    const nextActions: ReadinessNextAction[] = [
      {
        code: "VERIFY_PROPERTY_STATE",
        label: "Verify property truth",
        message:
          "Load or rebuild the canonical property conditions before using readiness operationally.",
      },
    ]

    const counts = buildCounts([], [])

    return {
      status: "unknown",
      score: 0,
      reasons,
      nextActions,
      counts,
      activeConditionIds: [],
      blockingConditionIds: [],
      warningConditionIds: [],
      computedAt,
      nextCheckInAt,
      explain: buildExplainText({
        status: "unknown",
        nextCheckInAt,
        reasons,
        counts,
      }),
    }
  }

  const allConditions = input.conditions.map(normalizeConditionDates)
  const activeConditions = allConditions
    .filter((condition) => condition.shouldAffectReadiness)
    .sort((a, b) => getConditionPriority(a) - getConditionPriority(b))

  const counts = buildCounts(allConditions, activeConditions)
  const reasons: ReadinessReason[] = []
  const nextActions: ReadinessNextAction[] = []

  if (activeConditions.length === 0) {
    // ΚΑΝΟΝΑΣ: Ακόμα και αν δεν υπάρχουν active conditions,
    // αν το operational context δείχνει turnover pending → "not_ready".
    // Η απόδειξη ετοιμότητας δεν έχει επιστραφεί ακόμα.
    const operationalPending =
      operationalContext?.derivedReadinessStatus === "not_ready"

    if (operationalPending) {
      pushUniqueReason(reasons, {
        code: "OPERATIONAL_PENDING",
        label: "Operational execution pending",
        message:
          operationalContext?.operationalReason ||
          "The turnover preparation window is open but execution has not been confirmed. The property cannot be treated as ready until proof of completion is returned.",
      })

      pushUniqueAction(nextActions, {
        code: "VERIFY_PROPERTY_STATE",
        label: "Complete turnover execution",
        message:
          "Ensure the assigned task has been accepted and all required checklists have been submitted before treating the property as ready.",
      })

      if (!nextCheckInAt) {
        pushUniqueReason(reasons, {
          code: "NO_NEXT_CHECKIN",
          label: "No next check-in linked",
          message:
            "No next check-in is currently linked. The property is still in an open turnover window.",
        })
      }

      const sortedReasons = sortReasons(reasons)
      const sortedActions = sortActions(nextActions)

      return {
        status: "not_ready",
        score: 10,
        reasons: sortedReasons,
        nextActions: sortedActions,
        counts,
        activeConditionIds: [],
        blockingConditionIds: [],
        warningConditionIds: [],
        computedAt,
        nextCheckInAt,
        explain: buildExplainText({
          status: "not_ready",
          nextCheckInAt,
          reasons: sortedReasons,
          counts,
          operationalContext,
        }),
      }
    }

    pushUniqueReason(reasons, {
      code: "NO_ACTIVE_CONDITIONS",
      label: "No active conditions",
      message:
        "There are no active property conditions today. The property can be treated as ready.",
    })

    if (!nextCheckInAt) {
      pushUniqueReason(reasons, {
        code: "NO_NEXT_CHECKIN",
        label: "No next check-in linked",
        message:
          "No next check-in is currently linked. This does not reduce readiness because no active property conditions exist today.",
      })
    }

    pushUniqueAction(nextActions, {
      code: "NO_ACTION_REQUIRED",
      label: "No readiness action required",
      message:
        "No active property conditions require action before the next operation.",
    })

    const sortedReasons = sortReasons(reasons)
    const sortedActions = sortActions(nextActions)

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
      explain: buildExplainText({
        status: "ready",
        nextCheckInAt,
        reasons: sortedReasons,
        counts,
      }),
    }
  }

  for (const condition of activeConditions) {
    pushUniqueReason(reasons, buildReasonForCondition(condition))

    for (const action of buildActionsForCondition(condition)) {
      pushUniqueAction(nextActions, action)
    }
  }

  if (!nextCheckInAt) {
    pushUniqueReason(reasons, {
      code: "NO_NEXT_CHECKIN",
      label: "No next check-in linked",
      message:
        "The property still has active conditions today. No next check-in is currently linked, but readiness still follows the real property condition state.",
    })
  }

  const hasBlockingConditions = activeConditions.some(
    (condition) => condition.readinessImpact === "blocking"
  )
  const status: PropertyReadinessStatus = hasBlockingConditions
    ? "not_ready"
    : "borderline"

  const sortedReasons = sortReasons(reasons)
  const sortedActions = sortActions(nextActions)

  return {
    status,
    score: status === "not_ready" ? 15 : 60,
    reasons: sortedReasons,
    nextActions: sortedActions,
    counts,
    activeConditionIds: activeConditions.map((item) => item.id ?? "").filter(Boolean),
    blockingConditionIds: activeConditions
      .filter((item) => item.readinessImpact === "blocking")
      .map((item) => item.id ?? "")
      .filter(Boolean),
    warningConditionIds: activeConditions
      .filter((item) => item.readinessImpact === "warning")
      .map((item) => item.id ?? "")
      .filter(Boolean),
    computedAt,
    nextCheckInAt,
    explain: buildExplainText({
      status,
      nextCheckInAt,
      reasons: sortedReasons,
      counts,
    }),
  }
}

export function getReadinessStatusLabel(
  status: PropertyReadinessStatus,
  language: "el" | "en" = "el"
): string {
  if (language === "en") {
    switch (status) {
      case "ready":
        return "Ready"
      case "borderline":
        return "Borderline"
      case "not_ready":
        return "Not ready"
      case "unknown":
      default:
        return "Unknown"
    }
  }

  switch (status) {
    case "ready":
      return "Ετοιμο"
    case "borderline":
      return "Οριακο"
    case "not_ready":
      return "Μη ετοιμο"
    case "unknown":
    default:
      return "Αγνωστο"
  }
}

export function getReadinessStatusSortWeight(
  status: PropertyReadinessStatus
): number {
  switch (status) {
    case "not_ready":
      return 1
    case "borderline":
      return 2
    case "unknown":
      return 3
    case "ready":
    default:
      return 4
  }
}

export function getConditionDisplayTitle(
  condition: Pick<
    ReadinessConditionInput,
    "conditionType" | "title" | "itemLabel" | "sourceItemLabel"
  >
): string {
  const normalized = normalizePropertyConditionRules({
    conditionType: condition.conditionType,
    title: condition.title,
    itemLabel: condition.itemLabel ?? condition.sourceItemLabel ?? null,
    status: "open",
    blockingStatus: "warning",
    severity: "medium",
  })

  return normalized.displayLabel
}

export function summarizeReadinessReasons(reasons: ReadinessReason[]): string {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    return "No readiness reasons recorded."
  }

  return reasons.map((reason) => reason.message || reason.label).join(" ")
}
