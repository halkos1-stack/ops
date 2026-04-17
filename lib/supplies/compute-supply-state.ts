import {
  normalizeSupplyState,
  normalizeSupplyStateMode,
  toFiniteNumberOrNull,
  type CanonicalSupplyState,
  type CanonicalSupplyStateMode,
} from "./supply-mode-rules"

/**
 * Phase 7 canonical semantics:
 *
 * 1. PropertySupply is the property-level truth + config layer.
 * 2. TaskSupplyAnswer is execution proof only and should be reconciled into PropertySupply elsewhere.
 * 3. This file defines only supply state semantics. It does not decide save/submit behavior.
 *
 * Canonical truth inputs:
 * - direct_state mode: fillLevel
 * - numeric_thresholds mode: currentStock
 *
 * Canonical config inputs:
 * - numeric_thresholds mode: mediumThreshold, fullThreshold
 *
 * Compatibility / mirror inputs:
 * - trackingMode
 * - minimumThreshold
 * - reorderThreshold
 * - warningThreshold
 * - targetStock
 * - targetLevel
 * - supplyMinimumStock
 *
 * Compatibility / mirror outputs:
 * - trackingMode
 * - reorderThreshold
 * - minimumThreshold
 * - warningThreshold
 * - targetStock
 * - targetLevel
 *
 * Derived convenience outputs:
 * - derivedState
 * - isShortage / isMissing / isMedium / isFull
 * - normalized currentStock / thresholds
 */

export type SupplyCanonicalTruthInput = {
  stateMode?: unknown
  fillLevel?: unknown
  currentStock?: unknown
}

export type SupplyCanonicalConfigInput = {
  mediumThreshold?: unknown
  fullThreshold?: unknown
}

export type SupplyCompatibilityMirrorInput = {
  minimumThreshold?: unknown
  reorderThreshold?: unknown
  warningThreshold?: unknown
  targetLevel?: unknown
  targetStock?: unknown
  supplyMinimumStock?: unknown
  trackingMode?: unknown
}

export type SupplyStateComputationInput = SupplyCanonicalTruthInput &
  SupplyCanonicalConfigInput &
  SupplyCompatibilityMirrorInput & {
    isActive?: boolean | null
  }

export type CanonicalSupplyTruth = {
  stateMode: CanonicalSupplyStateMode
  /**
   * Canonical fill state for the current snapshot.
   * - direct_state: input truth
   * - numeric_thresholds: derived convenience state from stock + thresholds
   */
  fillLevel: CanonicalSupplyState
  /**
   * Canonical stock truth only in numeric_thresholds mode.
   * In direct_state mode this is a compatibility mirror only.
   */
  currentStock: number | null
}

export type CanonicalSupplyConfig = {
  /**
   * Canonical numeric shortage boundary.
   * currentStock < mediumThreshold => missing
   */
  mediumThreshold: number | null
  /**
   * Canonical numeric full boundary.
   * mediumThreshold <= currentStock < fullThreshold => medium
   * currentStock >= fullThreshold => full
   */
  fullThreshold: number | null
}

export type CanonicalSupplyCompatibilityMirrors = {
  trackingMode: string
  reorderThreshold: number | null
  minimumThreshold: number | null
  warningThreshold: number | null
  targetStock: number | null
  targetLevel: number | null
}

export type SupplyStateSemantics = {
  truth: CanonicalSupplyTruth
  config: CanonicalSupplyConfig
  mirrors: CanonicalSupplyCompatibilityMirrors
  usesCompatibilityModeFallback: boolean
  usesCompatibilityThresholdFallback: boolean
  hasCanonicalNumericConfig: boolean
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
  canonicalTruth: CanonicalSupplyTruth
  canonicalConfig: CanonicalSupplyConfig
  compatibilityMirrors: CanonicalSupplyCompatibilityMirrors
  usesCompatibilityModeFallback: boolean
  usesCompatibilityThresholdFallback: boolean
  hasCanonicalNumericConfig: boolean
}

export type CanonicalSupplySnapshot = {
  stateMode: CanonicalSupplyStateMode
  derivedState: CanonicalSupplyState
  currentStock: number | null
  mediumThreshold: number | null
  fullThreshold: number | null
  isActive: boolean
  isShortage: boolean
  isMissing: boolean
  isMedium: boolean
  isFull: boolean
  canonicalTruth: CanonicalSupplyTruth
  canonicalConfig: CanonicalSupplyConfig
  compatibilityMirrors: CanonicalSupplyCompatibilityMirrors
  usesCompatibilityModeFallback: boolean
  usesCompatibilityThresholdFallback: boolean
  hasCanonicalNumericConfig: boolean
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
  canonicalTruth: CanonicalSupplyTruth
  canonicalConfig: CanonicalSupplyConfig
  compatibilityMirrors: CanonicalSupplyCompatibilityMirrors
}

function hasExplicitValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== ""
}

function resolveCanonicalMode(input: SupplyStateComputationInput): {
  mode: CanonicalSupplyStateMode
  usesCompatibilityModeFallback: boolean
} {
  if (hasExplicitValue(input.stateMode)) {
    return {
      mode: normalizeSupplyStateMode(input.stateMode),
      usesCompatibilityModeFallback: false,
    }
  }

  const trackingMode = String(input.trackingMode ?? "").trim().toLowerCase()
  const hasNumericCompatibilityHints =
    trackingMode === "numeric_thresholds" ||
    trackingMode === "numeric" ||
    trackingMode === "stock" ||
    trackingMode === "stock_level" ||
    trackingMode === "quantity" ||
    toFiniteNumberOrNull(input.mediumThreshold) !== null ||
    toFiniteNumberOrNull(input.fullThreshold) !== null ||
    toFiniteNumberOrNull(input.targetLevel) !== null ||
    toFiniteNumberOrNull(input.targetStock) !== null

  return {
    mode: hasNumericCompatibilityHints ? "numeric_thresholds" : "direct_state",
    usesCompatibilityModeFallback: hasNumericCompatibilityHints,
  }
}

function resolveNumericMediumThreshold(input: SupplyStateComputationInput) {
  const canonicalValue = toFiniteNumberOrNull(input.mediumThreshold)
  if (canonicalValue !== null) {
    return {
      value: canonicalValue,
      usedCompatibilityFallback: false,
    }
  }

  return {
    value:
      toFiniteNumberOrNull(input.minimumThreshold) ??
      toFiniteNumberOrNull(input.reorderThreshold) ??
      toFiniteNumberOrNull(input.warningThreshold) ??
      toFiniteNumberOrNull(input.supplyMinimumStock),
    usedCompatibilityFallback: true,
  }
}

function resolveNumericFullThreshold(
  input: SupplyStateComputationInput,
  mediumThreshold: number | null
) {
  const canonicalValue = toFiniteNumberOrNull(input.fullThreshold)
  if (canonicalValue !== null) {
    return {
      value: canonicalValue,
      usedCompatibilityFallback: false,
    }
  }

  return {
    value:
      toFiniteNumberOrNull(input.targetLevel) ??
      toFiniteNumberOrNull(input.targetStock) ??
      (mediumThreshold !== null ? mediumThreshold + 1 : null),
    usedCompatibilityFallback: true,
  }
}

function buildDirectStateMirrorCurrentStock(fillLevel: CanonicalSupplyState) {
  if (fillLevel === "missing") return 0
  if (fillLevel === "medium") return 1
  return 2
}

function buildCompatibilityMirrorsFromCanonical(params: {
  mode: CanonicalSupplyStateMode
  mediumThreshold: number | null
  fullThreshold: number | null
}): CanonicalSupplyCompatibilityMirrors {
  if (params.mode === "direct_state") {
    return {
      trackingMode: "fill_level",
      reorderThreshold: null,
      minimumThreshold: null,
      warningThreshold: null,
      targetStock: null,
      targetLevel: null,
    }
  }

  return {
    trackingMode: "numeric_thresholds",
    reorderThreshold: params.mediumThreshold,
    minimumThreshold: params.mediumThreshold,
    warningThreshold: params.mediumThreshold,
    targetStock: params.fullThreshold,
    targetLevel: params.fullThreshold,
  }
}

export function resolveSupplyStateSemantics(
  input: SupplyStateComputationInput
): SupplyStateSemantics {
  const modeResolution = resolveCanonicalMode(input)
  const directFillLevel = normalizeSupplyState(input.fillLevel) ?? "full"
  const rawCurrentStock = toFiniteNumberOrNull(input.currentStock)

  if (modeResolution.mode === "direct_state") {
    const mirrors = buildCompatibilityMirrorsFromCanonical({
      mode: modeResolution.mode,
      mediumThreshold: null,
      fullThreshold: null,
    })

    return {
      truth: {
        stateMode: modeResolution.mode,
        fillLevel: directFillLevel,
        currentStock: rawCurrentStock,
      },
      config: {
        mediumThreshold: null,
        fullThreshold: null,
      },
      mirrors,
      usesCompatibilityModeFallback: modeResolution.usesCompatibilityModeFallback,
      usesCompatibilityThresholdFallback: false,
      hasCanonicalNumericConfig: false,
    }
  }

  const mediumResolution = resolveNumericMediumThreshold(input)
  const fullResolution = resolveNumericFullThreshold(input, mediumResolution.value)
  const hasCanonicalNumericConfig =
    rawCurrentStock !== null &&
    mediumResolution.value !== null &&
    fullResolution.value !== null &&
    fullResolution.value > mediumResolution.value

  let derivedFillLevel = directFillLevel

  if (hasCanonicalNumericConfig) {
    if (rawCurrentStock < (mediumResolution.value as number)) {
      derivedFillLevel = "missing"
    } else if (rawCurrentStock < (fullResolution.value as number)) {
      derivedFillLevel = "medium"
    } else {
      derivedFillLevel = "full"
    }
  }

  const mirrors = buildCompatibilityMirrorsFromCanonical({
    mode: modeResolution.mode,
    mediumThreshold: mediumResolution.value,
    fullThreshold: fullResolution.value,
  })

  return {
    truth: {
      stateMode: modeResolution.mode,
      fillLevel: derivedFillLevel,
      currentStock: rawCurrentStock,
    },
    config: {
      mediumThreshold: mediumResolution.value,
      fullThreshold: fullResolution.value,
    },
    mirrors,
    usesCompatibilityModeFallback: modeResolution.usesCompatibilityModeFallback,
    usesCompatibilityThresholdFallback:
      mediumResolution.usedCompatibilityFallback ||
      fullResolution.usedCompatibilityFallback,
    hasCanonicalNumericConfig,
  }
}

export function computeSupplyState(
  input: SupplyStateComputationInput
): SupplyStateComputationResult {
  const isActive = input.isActive !== false
  const semantics = resolveSupplyStateSemantics(input)
  const state = semantics.truth.fillLevel

  return {
    mode: semantics.truth.stateMode,
    state,
    currentStock: semantics.truth.currentStock,
    mediumThreshold: semantics.config.mediumThreshold,
    fullThreshold: semantics.config.fullThreshold,
    isActive,
    isShortage: isActive && state !== "full",
    isMissing: state === "missing",
    isMedium: state === "medium",
    isFull: state === "full",
    canonicalTruth: semantics.truth,
    canonicalConfig: semantics.config,
    compatibilityMirrors: semantics.mirrors,
    usesCompatibilityModeFallback: semantics.usesCompatibilityModeFallback,
    usesCompatibilityThresholdFallback:
      semantics.usesCompatibilityThresholdFallback,
    hasCanonicalNumericConfig: semantics.hasCanonicalNumericConfig,
  }
}

export function buildCanonicalSupplySnapshot(
  input: SupplyStateComputationInput
): CanonicalSupplySnapshot {
  const computed = computeSupplyState(input)

  return {
    stateMode: computed.mode,
    derivedState: computed.state,
    currentStock: computed.currentStock,
    mediumThreshold: computed.mediumThreshold,
    fullThreshold: computed.fullThreshold,
    isActive: computed.isActive,
    isShortage: computed.isShortage,
    isMissing: computed.isMissing,
    isMedium: computed.isMedium,
    isFull: computed.isFull,
    canonicalTruth: computed.canonicalTruth,
    canonicalConfig: computed.canonicalConfig,
    compatibilityMirrors: computed.compatibilityMirrors,
    usesCompatibilityModeFallback: computed.usesCompatibilityModeFallback,
    usesCompatibilityThresholdFallback:
      computed.usesCompatibilityThresholdFallback,
    hasCanonicalNumericConfig: computed.hasCanonicalNumericConfig,
  }
}

export function buildCanonicalSupplyWriteData(
  input: CanonicalSupplyWriteInput
): CanonicalSupplyWriteResult {
  const mode = normalizeSupplyStateMode(input.stateMode)

  if (mode === "direct_state") {
    const fillLevel = normalizeSupplyState(input.fillLevel) ?? "full"
    const currentStock = buildDirectStateMirrorCurrentStock(fillLevel)
    const mirrors = buildCompatibilityMirrorsFromCanonical({
      mode,
      mediumThreshold: null,
      fullThreshold: null,
    })

    return {
      stateMode: mode,
      fillLevel,
      currentStock,
      mediumThreshold: null,
      fullThreshold: null,
      trackingMode: mirrors.trackingMode,
      reorderThreshold: mirrors.reorderThreshold,
      minimumThreshold: mirrors.minimumThreshold,
      warningThreshold: mirrors.warningThreshold,
      targetStock: mirrors.targetStock,
      targetLevel: mirrors.targetLevel,
      canonicalTruth: {
        stateMode: mode,
        fillLevel,
        currentStock: null,
      },
      canonicalConfig: {
        mediumThreshold: null,
        fullThreshold: null,
      },
      compatibilityMirrors: mirrors,
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
    trackingMode: computed.compatibilityMirrors.trackingMode,
    reorderThreshold: computed.compatibilityMirrors.reorderThreshold,
    minimumThreshold: computed.compatibilityMirrors.minimumThreshold,
    warningThreshold: computed.compatibilityMirrors.warningThreshold,
    targetStock: computed.compatibilityMirrors.targetStock,
    targetLevel: computed.compatibilityMirrors.targetLevel,
    canonicalTruth: {
      stateMode: computed.mode,
      fillLevel: computed.state,
      currentStock,
    },
    canonicalConfig: {
      mediumThreshold,
      fullThreshold,
    },
    compatibilityMirrors: computed.compatibilityMirrors,
  }
}
