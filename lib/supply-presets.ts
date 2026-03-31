export type SupplyPreset = {
  key: string
  code: string
  nameEl: string
  nameEn: string
  category: string
  unit: string
  minimumStock: number
  checklistLabelEl: string
  checklistLabelEn: string
}

export const SUPPLY_STATUS_OPTIONS = ["Έλλειψη", "Μέτρια", "Πλήρης"] as const

export const SUPPLY_PRESETS: SupplyPreset[] = [
  {
    key: "toilet_paper",
    code: "SYS_TOILET_PAPER",
    nameEl: "Χαρτί υγείας",
    nameEn: "Toilet paper",
    category: "bathroom",
    unit: "τεμάχια",
    minimumStock: 2,
    checklistLabelEl: "Επάρκεια χαρτιού υγείας",
    checklistLabelEn: "Toilet paper level",
  },
  {
    key: "kitchen_paper",
    code: "SYS_KITCHEN_PAPER",
    nameEl: "Χαρτί κουζίνας",
    nameEn: "Kitchen paper",
    category: "kitchen",
    unit: "τεμάχια",
    minimumStock: 1,
    checklistLabelEl: "Επάρκεια χαρτιού κουζίνας",
    checklistLabelEn: "Kitchen paper level",
  },
  {
    key: "hand_soap",
    code: "SYS_HAND_SOAP",
    nameEl: "Σαπούνι χεριών",
    nameEn: "Hand soap",
    category: "bathroom",
    unit: "τεμάχια",
    minimumStock: 1,
    checklistLabelEl: "Επάρκεια σαπουνιού χεριών",
    checklistLabelEn: "Hand soap level",
  },
  {
    key: "shampoo",
    code: "SYS_SHAMPOO",
    nameEl: "Σαμπουάν",
    nameEn: "Shampoo",
    category: "bathroom",
    unit: "τεμάχια",
    minimumStock: 1,
    checklistLabelEl: "Επάρκεια σαμπουάν",
    checklistLabelEn: "Shampoo level",
  },
  {
    key: "body_wash",
    code: "SYS_BODY_WASH",
    nameEl: "Αφρόλουτρο",
    nameEn: "Body wash",
    category: "bathroom",
    unit: "τεμάχια",
    minimumStock: 1,
    checklistLabelEl: "Επάρκεια αφρόλουτρου",
    checklistLabelEn: "Body wash level",
  },
  {
    key: "trash_bags",
    code: "SYS_TRASH_BAGS",
    nameEl: "Σακούλες απορριμμάτων",
    nameEn: "Trash bags",
    category: "cleaning",
    unit: "τεμάχια",
    minimumStock: 3,
    checklistLabelEl: "Επάρκεια σακουλών απορριμμάτων",
    checklistLabelEn: "Trash bags level",
  },
  {
    key: "dish_soap",
    code: "SYS_DISH_SOAP",
    nameEl: "Απορρυπαντικό πιάτων",
    nameEn: "Dish soap",
    category: "kitchen",
    unit: "τεμάχια",
    minimumStock: 1,
    checklistLabelEl: "Επάρκεια απορρυπαντικού πιάτων",
    checklistLabelEn: "Dish soap level",
  },
  {
    key: "laundry_detergent",
    code: "SYS_LAUNDRY_DETERGENT",
    nameEl: "Απορρυπαντικό ρούχων",
    nameEn: "Laundry detergent",
    category: "cleaning",
    unit: "τεμάχια",
    minimumStock: 1,
    checklistLabelEl: "Επάρκεια απορρυπαντικού ρούχων",
    checklistLabelEn: "Laundry detergent level",
  },
  {
    key: "fabric_softener",
    code: "SYS_FABRIC_SOFTENER",
    nameEl: "Μαλακτικό",
    nameEn: "Fabric softener",
    category: "cleaning",
    unit: "τεμάχια",
    minimumStock: 1,
    checklistLabelEl: "Επάρκεια μαλακτικού",
    checklistLabelEn: "Fabric softener level",
  },
  {
    key: "coffee",
    code: "SYS_COFFEE",
    nameEl: "Καφές / κάψουλες",
    nameEn: "Coffee / capsules",
    category: "kitchen",
    unit: "τεμάχια",
    minimumStock: 4,
    checklistLabelEl: "Επάρκεια καφέ / καψουλών",
    checklistLabelEn: "Coffee / capsules level",
  },
  {
    key: "sugar",
    code: "SYS_SUGAR",
    nameEl: "Ζάχαρη",
    nameEn: "Sugar",
    category: "kitchen",
    unit: "τεμάχια",
    minimumStock: 2,
    checklistLabelEl: "Επάρκεια ζάχαρης",
    checklistLabelEn: "Sugar level",
  },
  {
    key: "bottled_water",
    code: "SYS_BOTTLED_WATER",
    nameEl: "Μπουκάλια νερού",
    nameEn: "Bottled water",
    category: "kitchen",
    unit: "τεμάχια",
    minimumStock: 2,
    checklistLabelEl: "Επάρκεια εμφιαλωμένου νερού",
    checklistLabelEn: "Bottled water level",
  },
]

export function getSupplyPresetByCode(code?: string | null) {
  const normalized = String(code || "").trim().toUpperCase()
  return SUPPLY_PRESETS.find((preset) => preset.code === normalized) || null
}

export function getSupplyPresetByKey(key?: string | null) {
  const normalized = String(key || "").trim().toLowerCase()
  return SUPPLY_PRESETS.find((preset) => preset.key === normalized) || null
}

export function isBuiltInSupplyCode(code?: string | null) {
  return Boolean(getSupplyPresetByCode(code))
}

export function getSupplyDisplayName(
  language: "el" | "en",
  params: {
    code?: string | null
    fallbackName?: string | null
  }
) {
  const preset = getSupplyPresetByCode(params.code)

  if (preset) {
    return language === "en" ? preset.nameEn : preset.nameEl
  }

  const fallback = String(params.fallbackName || "").trim()
  return fallback || "—"
}

export function getSupplyChecklistLabel(
  language: "el" | "en",
  params: {
    code?: string | null
    fallbackName?: string | null
  }
) {
  const preset = getSupplyPresetByCode(params.code)

  if (preset) {
    return language === "en" ? preset.checklistLabelEn : preset.checklistLabelEl
  }

  const fallback = String(params.fallbackName || "").trim()

  if (!fallback) return language === "en" ? "Supply level" : "Επάρκεια αναλωσίμου"

  return language === "en" ? `${fallback} level` : `Επάρκεια ${fallback}`
}

export function buildCustomSupplyCode(name: string) {
  const slug = String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-ZΑ-Ω0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)

  const timestamp = Date.now().toString().slice(-6)
  return `CUS_${slug || "SUPPLY"}_${timestamp}`
}