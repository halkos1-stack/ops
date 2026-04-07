export type PropertyReadinessStatus =
  | "ready"
  | "borderline"
  | "not_ready"
  | "unknown"

export type PropertyConditionType = "supply" | "issue" | "damage"

export type PropertyConditionStatus =
  | "open"
  | "monitoring"
  | "resolved"
  | "dismissed"

export type PropertyConditionBlockingStatus =
  | "blocking"
  | "non_blocking"
  | "warning"

export type PropertyConditionSeverity =
  | "low"
  | "medium"
  | "high"
  | "critical"

export type PropertyConditionManagerDecision =
  | "allow_with_issue"
  | "block_until_resolved"
  | "monitor"
  | "resolved"
  | "dismissed"

export type ReadinessConditionInput = {
  id: string
  propertyId: string
  conditionType: PropertyConditionType
  status: PropertyConditionStatus
  blockingStatus: PropertyConditionBlockingStatus
  severity: PropertyConditionSeverity
  managerDecision?: PropertyConditionManagerDecision | null
  title?: string | null
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

export type ComputePropertyReadinessInput = {
  now?: Date
  nextCheckInAt?: Date | string | null
  conditions?: ReadinessConditionInput[]
}

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
    | "UNKNOWN_DATA"
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
    | "REVIEW_WARNINGS"
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
): ReadinessConditionInput {
  return {
    ...condition,
    firstDetectedAt: toDateOrNull(condition.firstDetectedAt),
    lastDetectedAt: toDateOrNull(condition.lastDetectedAt),
    resolvedAt: toDateOrNull(condition.resolvedAt),
    dismissedAt: toDateOrNull(condition.dismissedAt),
    createdAt: toDateOrNull(condition.createdAt),
    updatedAt: toDateOrNull(condition.updatedAt),
  }
}

function getConditionLabel(condition: ReadinessConditionInput): string {
  const title = String(condition.title ?? "").trim()
  if (title) return title

  const sourceItemLabel = String(condition.sourceItemLabel ?? "").trim()
  if (sourceItemLabel) return sourceItemLabel

  if (condition.conditionType === "supply") return "Supply shortage"
  if (condition.conditionType === "damage") return "Property damage"
  return "Property issue"
}

function getConditionPriority(condition: ReadinessConditionInput): number {
  if (isConditionBlocking(condition)) return 1
  if (condition.severity === "critical") return 2
  if (condition.managerDecision === "allow_with_issue") return 3
  if (condition.blockingStatus === "warning") return 4
  if (condition.blockingStatus === "non_blocking") return 5
  if (condition.status === "monitoring") return 6
  return 7
}

function isResolvedByManagerDecision(
  condition: ReadinessConditionInput
): boolean {
  return (
    condition.managerDecision === "resolved" ||
    condition.managerDecision === "dismissed"
  )
}

function isActiveCondition(condition: ReadinessConditionInput): boolean {
  if (condition.status !== "open" && condition.status !== "monitoring") {
    return false
  }

  if (isResolvedByManagerDecision(condition)) {
    return false
  }

  return true
}

function isConditionBlocking(condition: ReadinessConditionInput): boolean {
  if (condition.managerDecision === "block_until_resolved") {
    return true
  }

  return condition.blockingStatus === "blocking"
}

function buildCounts(
  allConditions: ReadinessConditionInput[],
  activeConditions: ReadinessConditionInput[]
): PropertyReadinessCounts {
  return {
    totalConditions: allConditions.length,
    activeConditions: activeConditions.length,
    openConditions: allConditions.filter((item) => item.status === "open").length,
    monitoringConditions: allConditions.filter(
      (item) => item.status === "monitoring"
    ).length,
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
    highConditions: activeConditions.filter((item) => item.severity === "high")
      .length,
    mediumConditions: activeConditions.filter((item) => item.severity === "medium")
      .length,
    lowConditions: activeConditions.filter((item) => item.severity === "low").length,
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
  condition: ReadinessConditionInput
): ReadinessReason {
  const label = getConditionLabel(condition)

  if (condition.managerDecision === "allow_with_issue") {
    return {
      code: "ALLOW_WITH_ISSUE",
      label: "Manager override without resolution",
      message: `"${label}" is still active. Manager override may allow operations, but it does not restore the property to ready until the condition is explicitly resolved or dismissed.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.blockingStatus,
      severity: condition.severity,
      managerDecision: condition.managerDecision ?? null,
    }
  }

  if (isConditionBlocking(condition)) {
    return {
      code: "BLOCKING_CONDITION",
      label: "Active blocking condition",
      message: `"${label}" is active and blocks the property from being ready today.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.blockingStatus,
      severity: condition.severity,
      managerDecision: condition.managerDecision ?? null,
    }
  }

  if (condition.severity === "critical") {
    return {
      code: "CRITICAL_CONDITION",
      label: "Active critical condition",
      message: `"${label}" remains active with critical severity. The property is not ready until it is explicitly resolved or dismissed.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.blockingStatus,
      severity: condition.severity,
      managerDecision: condition.managerDecision ?? null,
    }
  }

  if (condition.blockingStatus === "warning" && condition.severity === "high") {
    return {
      code: "HIGH_WARNING_CONDITION",
      label: "Active high-severity warning",
      message: `"${label}" is still active. Even if it is classified as a warning, the property cannot be treated as ready while the condition remains open.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.blockingStatus,
      severity: condition.severity,
      managerDecision: condition.managerDecision ?? null,
    }
  }

  if (condition.status === "monitoring" || condition.managerDecision === "monitor") {
    return {
      code: "MONITORING_CONDITION",
      label: "Active monitoring condition",
      message: `"${label}" is still active and under monitoring. Monitoring is not the same as resolution, so the property is not ready today.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.blockingStatus,
      severity: condition.severity,
      managerDecision: condition.managerDecision ?? null,
    }
  }

  if (condition.blockingStatus === "non_blocking") {
    return {
      code: "NON_BLOCKING_CONDITION",
      label: "Active non-blocking condition",
      message: `"${label}" is still active. Non-blocking classification does not mean resolved, so the property remains not ready until the condition is explicitly closed.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.blockingStatus,
      severity: condition.severity,
      managerDecision: condition.managerDecision ?? null,
    }
  }

  return {
    code: "UNKNOWN_DATA",
    label: "Active unresolved condition",
    message: `"${label}" is still active and keeps the property out of ready status until it is explicitly resolved or dismissed.`,
    conditionId: condition.id,
    conditionType: condition.conditionType,
    blockingStatus: condition.blockingStatus,
    severity: condition.severity,
    managerDecision: condition.managerDecision ?? null,
  }
}

function buildActionsForCondition(
  condition: ReadinessConditionInput
): ReadinessNextAction[] {
  const actions: ReadinessNextAction[] = []
  const label = getConditionLabel(condition)

  if (isConditionBlocking(condition)) {
    actions.push({
      code: "RESOLVE_BLOCKING_CONDITIONS",
      label: "Resolve active blockers",
      message: `Explicitly resolve, dismiss, or remediate "${label}" before treating the property as ready.`,
      conditionId: condition.id,
    })
  } else {
    actions.push({
      code: "REVIEW_WARNINGS",
      label: "Resolve active conditions",
      message: `Review and explicitly resolve or dismiss "${label}". Active conditions cannot leave the property in ready status.`,
      conditionId: condition.id,
    })
  }

  if (condition.status === "monitoring" || condition.managerDecision === "monitor") {
    actions.push({
      code: "MONITOR_ACTIVE_CONDITIONS",
      label: "Continue monitoring until closure",
      message: `Monitoring may continue operationally, but "${label}" must still be explicitly resolved or dismissed to restore ready status.`,
      conditionId: condition.id,
    })
  }

  if (!condition.managerDecision) {
    actions.push({
      code: "WAIT_FOR_MANAGER_DECISION",
      label: "Record manager decision",
      message: `A manager decision is still missing for "${label}". This does not resolve the condition by itself.`,
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
}): string {
  const { status, nextCheckInAt, reasons, counts } = params

  const base =
    status === "ready"
      ? "The property is ready today because there are no active property conditions."
      : status === "not_ready"
        ? "The property is not ready today because active property conditions still exist."
        : status === "borderline"
          ? "The property remains in a borderline state today and should not be treated as fully ready."
          : "The property state for today cannot be confirmed from the available canonical condition data."

  const nextCheckInText = nextCheckInAt
    ? ` Next check-in: ${nextCheckInAt.toISOString()}.`
    : " No next check-in is currently linked."

  const countsText = ` Active conditions: ${counts.activeConditions}. Blocking: ${counts.blockingConditions}. Warnings: ${counts.warningConditions}. Non-blocking: ${counts.nonBlockingConditions}.`

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
    CRITICAL_CONDITION: 2,
    ALLOW_WITH_ISSUE: 3,
    HIGH_WARNING_CONDITION: 4,
    MONITORING_CONDITION: 5,
    NON_BLOCKING_CONDITION: 6,
    UNKNOWN_DATA: 7,
    NO_ACTIVE_CONDITIONS: 8,
    NO_NEXT_CHECKIN: 9,
  }

  return [...reasons].sort((a, b) => {
    const aPriority = priorityMap[a.code] ?? 999
    const bPriority = priorityMap[b.code] ?? 999

    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }

    return (a.message || "").localeCompare(b.message || "", "en")
  })
}

function sortActions(actions: ReadinessNextAction[]): ReadinessNextAction[] {
  const priorityMap: Record<ReadinessNextAction["code"], number> = {
    RESOLVE_BLOCKING_CONDITIONS: 1,
    REVIEW_WARNINGS: 2,
    MONITOR_ACTIVE_CONDITIONS: 3,
    WAIT_FOR_MANAGER_DECISION: 4,
    VERIFY_PROPERTY_STATE: 5,
    NO_ACTION_REQUIRED: 6,
  }

  return [...actions].sort((a, b) => {
    const aPriority = priorityMap[a.code] ?? 999
    const bPriority = priorityMap[b.code] ?? 999

    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }

    return (a.message || "").localeCompare(b.message || "", "en")
  })
}

export function computePropertyReadiness(
  input: ComputePropertyReadinessInput
): PropertyReadinessResult {
  const computedAt = input.now instanceof Date ? input.now : new Date()
  const nextCheckInAt = toDateOrNull(input.nextCheckInAt)

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
    .filter(isActiveCondition)
    .sort((a, b) => getConditionPriority(a) - getConditionPriority(b))

  const counts = buildCounts(allConditions, activeConditions)
  const reasons: ReadinessReason[] = []
  const nextActions: ReadinessNextAction[] = []

  if (activeConditions.length === 0) {
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
        "The property still has active conditions today. No next check-in is currently linked, but readiness remains not ready until those conditions are explicitly resolved or dismissed.",
    })
  }

  const sortedReasons = sortReasons(reasons)
  const sortedActions = sortActions(nextActions)

  return {
    status: "not_ready",
    score: 15,
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
    explain: buildExplainText({
      status: "not_ready",
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
    "conditionType" | "title" | "sourceItemLabel"
  >
): string {
  const title = String(condition.title ?? "").trim()
  if (title) return title

  const sourceItemLabel = String(condition.sourceItemLabel ?? "").trim()
  if (sourceItemLabel) return sourceItemLabel

  if (condition.conditionType === "supply") return "Supply shortage"
  if (condition.conditionType === "damage") return "Damage"
  return "Issue"
}

export function summarizeReadinessReasons(reasons: ReadinessReason[]): string {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    return "No readiness reasons recorded."
  }

  return reasons.map((reason) => reason.message || reason.label).join(" ")
}
