export type CanonicalSupplyStateMode = "direct_state" | "numeric_thresholds"

export type CanonicalSupplyState = "missing" | "medium" | "full"

export type SupplyModeValidationInput = {
  stateMode?: unknown
  fillLevel?: unknown
  currentStock?: unknown
  mediumThreshold?: unknown
  fullThreshold?: unknown
}

export type SupplyModeValidationResult =
  | {
      ok: true
      mode: CanonicalSupplyStateMode
      fillLevel: CanonicalSupplyState | null
      currentStock: number | null
      mediumThreshold: number | null
      fullThreshold: number | null
    }
  | {
      ok: false
      error: string
    }

export function normalizeSupplyStateMode(
  value: unknown
): CanonicalSupplyStateMode {
  const text = String(value ?? "").trim().toLowerCase()

  if (
    text === "numeric_thresholds" ||
    text === "numeric" ||
    text === "stock" ||
    text === "stock_level" ||
    text === "quantity"
  ) {
    return "numeric_thresholds"
  }

  return "direct_state"
}

export function normalizeSupplyState(
  value: unknown
): CanonicalSupplyState | null {
  const text = String(value ?? "").trim().toLowerCase()

  if (["missing", "empty", "low"].includes(text)) {
    return "missing"
  }

  if (["medium", "partial"].includes(text)) {
    return "medium"
  }

  if (["full", "ok", "available"].includes(text)) {
    return "full"
  }

  return null
}

export function toFiniteNumberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function validateSupplyModeInput(
  input: SupplyModeValidationInput
): SupplyModeValidationResult {
  const mode = normalizeSupplyStateMode(input.stateMode)
  const fillLevel = normalizeSupplyState(input.fillLevel)
  const currentStock = toFiniteNumberOrNull(input.currentStock)
  const mediumThreshold = toFiniteNumberOrNull(input.mediumThreshold)
  const fullThreshold = toFiniteNumberOrNull(input.fullThreshold)

  if (mode === "direct_state") {
    if (!fillLevel) {
      return {
        ok: false,
        error: "Direct state mode requires a canonical fill level.",
      }
    }

    return {
      ok: true,
      mode,
      fillLevel,
      currentStock,
      mediumThreshold,
      fullThreshold,
    }
  }

  if (currentStock === null) {
    return {
      ok: false,
      error: "Numeric thresholds mode requires currentStock.",
    }
  }

  if (mediumThreshold === null || fullThreshold === null) {
    return {
      ok: false,
      error: "Numeric thresholds mode requires mediumThreshold and fullThreshold.",
    }
  }

  if (fullThreshold <= mediumThreshold) {
    return {
      ok: false,
      error: "fullThreshold must be greater than mediumThreshold.",
    }
  }

  return {
    ok: true,
    mode,
    fillLevel: null,
    currentStock,
    mediumThreshold,
    fullThreshold,
  }
}
