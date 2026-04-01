import { getSupplyPresetByCode } from "@/lib/supply-presets"

type SupplyItemForDisplay = {
  code?: string | null
  name?: string | null
  nameEl?: string | null
  nameEn?: string | null
}

/**
 * Resolves the display name of a supply item for a given language.
 *
 * Priority:
 * 1. Preset items: always use the preset multilingual name (nameEl / nameEn).
 * 2. Non-preset items (custom): prefer new schema fields, fallback to legacy name.
 *    - Greek:   nameEl ?? name
 *    - English: nameEn ?? nameEl ?? name
 */
export function resolveSupplyDisplayName(
  language: "el" | "en",
  supplyItem: SupplyItemForDisplay | null | undefined
): string {
  if (!supplyItem) return "—"

  const preset = getSupplyPresetByCode(supplyItem.code)
  if (preset) {
    return language === "en" ? preset.nameEn : preset.nameEl
  }

  if (language === "en") {
    return (
      String(supplyItem.nameEn || "").trim() ||
      String(supplyItem.nameEl || "").trim() ||
      String(supplyItem.name || "").trim() ||
      "—"
    )
  }

  return (
    String(supplyItem.nameEl || "").trim() ||
    String(supplyItem.name || "").trim() ||
    "—"
  )
}
