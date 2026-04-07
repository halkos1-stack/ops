import {
  normalizeSupplyState,
  normalizeSupplyStateMode,
  toFiniteNumberOrNull,
  type CanonicalSupplyState,
  type CanonicalSupplyStateMode,
} from "./supply-mode-rules"

export type SupplyStateComputationInput = {
  isActive?: boolean | null
  stateMode?: unknown
  fillLevel?: unknown
  currentStock?: unknown
  mediumThreshold?: unknown
  fullThreshold?: unknown
  minimumThreshold?: unknown
  reorderThreshold?: unknown
  warningThreshold?: unknown
  targetLevel?: unknown
  targetStock?: unknown
  supplyMinimumStock?: unknown
  trackingMode?: unknown
}

export type SupplyStateComputationResult = {
  mode: CanonicalSupplyStateMode
  state: CanonicalSupplyState
  currentStock: number | null
  mediumThreshold: number | null
  fullThreshold: number | null
  isActive: boolean
  isShortage: boolean
  isMissing: boolean
  isMedium: boolean
  isFull: boolean
}

export type CanonicalSupplyWriteInput = {
  stateMode?: unknown
  fillLevel?: unknown
  currentStock?: unknown
  mediumThreshold?: unknown
  fullThreshold?: unknown
  isActive?: boolean | null
}

export type CanonicalSupplyWriteResult = {
  stateMode: CanonicalSupplyStateMode
  fillLevel: CanonicalSupplyState
  currentStock: number
  mediumThreshold: number | null
  fullThreshold: number | null
  trackingMode: string
  reorderThreshold: number | null
  minimumThreshold: number | null
  warningThreshold: number | null
  targetStock: number | null
  targetLevel: number | null
}

function getLegacyModeFallback(input: SupplyStateComputationInput) {
  const explicitMode = normalizeSupplyStateMode(input.stateMode)
  if (input.stateMode !== undefined && input.stateMode !== null && String(input.stateMode).trim() !== "") {
    return explicitMode
  }

  const trackingMode = String(input.trackingMode ?? "").trim().toLowerCase()
  if (
    trackingMode === "numeric_thresholds" ||
    trackingMode === "numeric" ||
    trackingMode === "stock" ||
    trackingMode === "stock_level" ||
    trackingMode === "quantity"
  ) {
    return "numeric_thresholds" as const
  }

  if (
    toFiniteNumberOrNull(input.mediumThreshold) !== null ||
    toFiniteNumberOrNull(input.fullThreshold) !== null
  ) {
    return "numeric_thresholds" as const
  }

  if (
    toFiniteNumberOrNull(input.targetLevel) !== null ||
    toFiniteNumberOrNull(input.targetStock) !== null
  ) {
    return "numeric_thresholds" as const
  }

  return "direct_state" as const
}

function getLegacyMediumThreshold(input: SupplyStateComputationInput) {
  return (
    toFiniteNumberOrNull(input.mediumThreshold) ??
    toFiniteNumberOrNull(input.minimumThreshold) ??
    toFiniteNumberOrNull(input.reorderThreshold) ??
    toFiniteNumberOrNull(input.warningThreshold) ??
    toFiniteNumberOrNull(input.supplyMinimumStock)
  )
}

function getLegacyFullThreshold(
  input: SupplyStateComputationInput,
  mediumThreshold: number | null
) {
  return (
    toFiniteNumberOrNull(input.fullThreshold) ??
    toFiniteNumberOrNull(input.targetLevel) ??
    toFiniteNumberOrNull(input.targetStock) ??
    (mediumThreshold !== null ? mediumThreshold + 1 : null)
  )
}

export function computeSupplyState(
  input: SupplyStateComputationInput
): SupplyStateComputationResult {
  const isActive = input.isActive !== false
  const mode = getLegacyModeFallback(input)

  const currentStock = toFiniteNumberOrNull(input.currentStock)
  const mediumThreshold = getLegacyMediumThreshold(input)
  const fullThreshold = getLegacyFullThreshold(input, mediumThreshold)

  let state: CanonicalSupplyState = normalizeSupplyState(input.fillLevel) ?? "full"

  if (
    mode === "numeric_thresholds" &&
    currentStock !== null &&
    mediumThreshold !== null &&
    fullThreshold !== null &&
    fullThreshold > mediumThreshold
  ) {
    if (currentStock < mediumThreshold) {
      state = "missing"
    } else if (currentStock < fullThreshold) {
      state = "medium"
    } else {
      state = "full"
    }
  }

  return {
    mode,
    state,
    currentStock,
    mediumThreshold,
    fullThreshold,
    isActive,
    isShortage: isActive && state !== "full",
    isMissing: state === "missing",
    isMedium: state === "medium",
    isFull: state === "full",
  }
}

export function buildCanonicalSupplySnapshot(
  input: SupplyStateComputationInput
) {
  const computed = computeSupplyState(input)

  return {
    stateMode: computed.mode,
    derivedState: computed.state,
    currentStock: computed.currentStock,
    mediumThreshold: computed.mediumThreshold,
    fullThreshold: computed.fullThreshold,
    isActive: computed.isActive,
    isShortage: computed.isShortage,
  }
}

export function buildCanonicalSupplyWriteData(
  input: CanonicalSupplyWriteInput
): CanonicalSupplyWriteResult {
  const mode = normalizeSupplyStateMode(input.stateMode)

  if (mode === "direct_state") {
    const fillLevel = normalizeSupplyState(input.fillLevel) ?? "full"

    return {
      stateMode: mode,
      fillLevel,
      currentStock:
        fillLevel === "missing" ? 0 : fillLevel === "medium" ? 1 : 2,
      mediumThreshold: null,
      fullThreshold: null,
      trackingMode: "fill_level",
      reorderThreshold: null,
      minimumThreshold: null,
      warningThreshold: null,
      targetStock: null,
      targetLevel: null,
    }
  }

  const currentStock = toFiniteNumberOrNull(input.currentStock) ?? 0
  const mediumThreshold = toFiniteNumberOrNull(input.mediumThreshold) ?? 0
  const fullThreshold =
    toFiniteNumberOrNull(input.fullThreshold) ?? Math.max(mediumThreshold + 1, 1)

  const computed = computeSupplyState({
    stateMode: mode,
    currentStock,
    mediumThreshold,
    fullThreshold,
    isActive: input.isActive,
  })

  return {
    stateMode: computed.mode,
    fillLevel: computed.state,
    currentStock,
    mediumThreshold,
    fullThreshold,
    trackingMode: "numeric_thresholds",
    reorderThreshold: mediumThreshold,
    minimumThreshold: mediumThreshold,
    warningThreshold: mediumThreshold,
    targetStock: fullThreshold,
    targetLevel: fullThreshold,
  }
}
