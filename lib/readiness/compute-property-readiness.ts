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

export type ReadinessOperationalContext = {
  derivedReadinessStatus: "ready" | "borderline" | "not_ready" | "unknown"
  operationalReason?: string | null
}

export type ComputePropertyReadinessInput = {
  now?: Date
  nextCheckInAt?: Date | string | null
  conditions?: ReadinessConditionInput[]
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
      label: "Ενεργή μπλοκαριστική συνθήκη",
      message: `Η συνθήκη "${condition.displayLabel}" παραμένει ενεργή και μπλοκάρει την ετοιμότητα του ακινήτου σήμερα.`,
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
      label: "Επιτρέπεται με ανοιχτό θέμα",
      message: `Η συνθήκη "${condition.displayLabel}" είναι ακόμη ενεργή. Ο διαχειριστής μπορεί να επιτρέψει τη λειτουργία, αλλά το ακίνητο παραμένει οριακό μέχρι να δηλωθεί ρητά ως επιλυμένη ή απορριφθείσα.`,
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
      label: "Συνθήκη σε παρακολούθηση",
      message: `Η συνθήκη "${condition.displayLabel}" βρίσκεται ακόμη σε ενεργή παρακολούθηση. Η παρακολούθηση δεν ισοδυναμεί με επίλυση, άρα το ακίνητο δεν θεωρείται καθαρά έτοιμο σήμερα.`,
      conditionId: condition.id,
      conditionType: condition.conditionType,
      blockingStatus: condition.effectiveBlockingStatus,
      severity: condition.effectiveSeverity,
      managerDecision: condition.effectiveManagerDecision,
    }
  }

  return {
    code: "WARNING_CONDITION",
    label: "Ενεργή μη μπλοκαριστική συνθήκη",
    message: `Η συνθήκη "${condition.displayLabel}" παραμένει ενεργή. Δεν μπλοκάρει πλήρως τη λειτουργία, αλλά κρατά το ακίνητο σε οριακή κατάσταση μέχρι να κλείσει ρητά.`,
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
      label: "Επίλυση μπλοκαριστικών συνθηκών",
      message: `Επίλυσε, απόρριψε ή τεκμηρίωσε ρητά τη συνθήκη "${condition.displayLabel}" πριν θεωρηθεί το ακίνητο έτοιμο.`,
      conditionId: condition.id,
    })
  } else {
    actions.push({
      code: "REVIEW_ACTIVE_WARNINGS",
      label: "Έλεγχος ενεργών προειδοποιήσεων",
      message: `Έλεγξε τη συνθήκη "${condition.displayLabel}" και κλείσ' την ρητά όταν έχει πραγματικά επιλυθεί. Οι ενεργές προειδοποιήσεις κρατούν το ακίνητο οριακό.`,
      conditionId: condition.id,
    })
  }

  if (condition.isMonitoring) {
    actions.push({
      code: "MONITOR_ACTIVE_CONDITIONS",
      label: "Συνέχισε την παρακολούθηση",
      message: `Συνέχισε την παρακολούθηση της συνθήκης "${condition.displayLabel}" μέχρι ο διαχειριστής να καταγράψει τελική επίλυση ή απόρριψη.`,
      conditionId: condition.id,
    })
  }

  if (!condition.effectiveManagerDecision) {
    actions.push({
      code: "WAIT_FOR_MANAGER_DECISION",
      label: "Καταγραφή απόφασης διαχειριστή",
      message: `Λείπει ακόμη απόφαση διαχειριστή για τη συνθήκη "${condition.displayLabel}". Αυτό από μόνο του δεν επιλύει τη συνθήκη.`,
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
      ? " Ωστόσο υπάρχει ανοιχτό επιχειρησιακό παράθυρο turnover και το ακίνητο δεν μπορεί να επιβεβαιωθεί ως έτοιμο μέχρι να επιστραφεί απόδειξη εκτέλεσης."
      : ""

  const base =
    status === "ready"
      ? "Το ακίνητο δεν έχει ενεργές συνθήκες που να επηρεάζουν την ετοιμότητα." +
        (operationalOverride || " Μπορεί να θεωρηθεί έτοιμο για τον επόμενο επισκέπτη.")
      : status === "borderline"
        ? "Το ακίνητο είναι οριακό επειδή υπάρχουν ακόμη ενεργές συνθήκες, αλλά δεν μπλοκάρουν πλήρως τη λειτουργία του."
        : status === "not_ready"
          ? "Το ακίνητο δεν είναι έτοιμο επειδή υπάρχουν ενεργές μπλοκαριστικές συνθήκες."
          : "Η κατάσταση του ακινήτου δεν μπορεί να επιβεβαιωθεί από τα διαθέσιμα δεδομένα συνθηκών."

  const nextCheckInText = nextCheckInAt
    ? ` Επόμενο check-in: ${nextCheckInAt.toISOString()}.`
    : " Δεν υπάρχει αυτή τη στιγμή συνδεδεμένο επόμενο check-in."

  const countsText = ` Ενεργές συνθήκες: ${counts.activeConditions}. Μπλοκαριστικές: ${counts.blockingConditions}. Προειδοποιήσεις ή παρακολούθηση: ${counts.warningConditions}.`

  const reasonsText =
    reasons.length > 0
      ? ` Τρέχουσα εικόνα: ${reasons
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
    return (a.message || "").localeCompare(b.message || "", "el")
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
    return (a.message || "").localeCompare(b.message || "", "el")
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
        label: "Λείπουν canonical δεδομένα συνθηκών",
        message:
          "Λείπουν οι canonical συνθήκες ακινήτου, οπότε το σύστημα δεν μπορεί να επιβεβαιώσει την πραγματική κατάσταση του ακινήτου σήμερα.",
      },
    ]

    const nextActions: ReadinessNextAction[] = [
      {
        code: "VERIFY_PROPERTY_STATE",
        label: "Επιβεβαίωση κατάστασης ακινήτου",
        message:
          "Φόρτωσε ή ξαναχτίσε τις canonical συνθήκες ακινήτου πριν χρησιμοποιήσεις λειτουργικά την ετοιμότητα.",
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
    const operationalPending =
      operationalContext?.derivedReadinessStatus === "not_ready"

    if (operationalPending) {
      pushUniqueReason(reasons, {
        code: "OPERATIONAL_PENDING",
        label: "Εκκρεμεί επιχειρησιακή εκτέλεση",
        message:
          operationalContext?.operationalReason ||
          "Το παράθυρο προετοιμασίας turnover είναι ανοιχτό αλλά η εκτέλεση δεν έχει ακόμη επιβεβαιωθεί. Το ακίνητο δεν μπορεί να θεωρηθεί έτοιμο μέχρι να επιστραφεί απόδειξη ολοκλήρωσης.",
      })

      pushUniqueAction(nextActions, {
        code: "VERIFY_PROPERTY_STATE",
        label: "Ολοκλήρωση εκτέλεσης turnover",
        message:
          "Βεβαιώσου ότι η ανατεθειμένη εργασία έχει γίνει αποδεκτή και ότι έχουν υποβληθεί όλες οι απαιτούμενες λίστες πριν θεωρηθεί το ακίνητο έτοιμο.",
      })

      if (!nextCheckInAt) {
        pushUniqueReason(reasons, {
          code: "NO_NEXT_CHECKIN",
          label: "Δεν υπάρχει συνδεδεμένο επόμενο check-in",
          message:
            "Δεν υπάρχει αυτή τη στιγμή συνδεδεμένο επόμενο check-in. Το ακίνητο παραμένει σε ανοιχτό παράθυρο turnover.",
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
      label: "Δεν υπάρχουν ενεργές συνθήκες",
      message:
        "Δεν υπάρχουν ενεργές συνθήκες ακινήτου σήμερα. Το ακίνητο μπορεί να θεωρηθεί έτοιμο.",
    })

    if (!nextCheckInAt) {
      pushUniqueReason(reasons, {
        code: "NO_NEXT_CHECKIN",
        label: "Δεν υπάρχει συνδεδεμένο επόμενο check-in",
        message:
          "Δεν υπάρχει αυτή τη στιγμή συνδεδεμένο επόμενο check-in. Αυτό δεν μειώνει την ετοιμότητα επειδή δεν υπάρχουν ενεργές συνθήκες ακινήτου σήμερα.",
      })
    }

    pushUniqueAction(nextActions, {
      code: "NO_ACTION_REQUIRED",
      label: "Δεν απαιτείται ενέργεια ετοιμότητας",
      message:
        "Δεν υπάρχουν ενεργές συνθήκες ακινήτου που να απαιτούν ενέργεια πριν από την επόμενη λειτουργία.",
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
      label: "Δεν υπάρχει συνδεδεμένο επόμενο check-in",
      message:
        "Το ακίνητο έχει ακόμη ενεργές συνθήκες σήμερα. Δεν υπάρχει αυτή τη στιγμή συνδεδεμένο επόμενο check-in, αλλά η ετοιμότητα ακολουθεί την πραγματική κατάσταση των συνθηκών του ακινήτου.",
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
      return "Έτοιμο"
    case "borderline":
      return "Οριακό"
    case "not_ready":
      return "Μη έτοιμο"
    case "unknown":
    default:
      return "Άγνωστο"
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
    return "Δεν έχουν καταγραφεί λόγοι ετοιμότητας."
  }

  return reasons.map((reason) => reason.message || reason.label).join(" ")
}
