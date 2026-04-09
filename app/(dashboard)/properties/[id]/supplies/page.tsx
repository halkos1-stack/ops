"use client"

import Link from "next/link"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { resolveSupplyDisplayName } from "@/lib/supply-display"
import {
  buildCanonicalSupplySnapshot,
  buildCanonicalSupplyWriteData,
} from "@/lib/supplies/compute-supply-state"

type Language = "el" | "en"
type SupplyFilter = "all" | "missing" | "medium" | "full"
type SupplyState = "missing" | "medium" | "full"
type SupplyStateMode = "direct_state" | "numeric_thresholds"

type SupplyItem = {
  id: string
  code: string
  name: string
  nameEl?: string | null
  nameEn?: string | null
  category: string
  unit: string
  minimumStock?: number | null
  isActive: boolean
}

type PropertySupply = {
  id: string
  propertyId: string
  supplyItemId: string
  fillLevel?: string | null
  stateMode?: string | null
  currentStock: number
  mediumThreshold?: number | null
  fullThreshold?: number | null
  targetStock?: number | null
  reorderThreshold?: number | null
  targetLevel?: number | null
  minimumThreshold?: number | null
  trackingMode?: string | null
  isCritical?: boolean
  warningThreshold?: number | null
  notes?: string | null
  updatedAt?: string | null
  lastUpdatedAt?: string | null
  supplyItem?: SupplyItem | null
}

type BuiltInCatalogRow = {
  presetKey: string
  code: string
  nameEl: string
  nameEn: string
  category: string
  unit: string
  minimumStock: number
  checklistLabelEl: string
  checklistLabelEn: string
  isActiveForProperty: boolean
  propertySupplyId?: string | null
}

type CustomCatalogRow = {
  id: string
  code: string
  name: string
  nameEl?: string | null
  nameEn?: string | null
  category: string
  unit: string
  minimumStock?: number | null
  isActiveForProperty: boolean
  propertySupplyId?: string | null
}

type SuppliesPayload = {
  property: {
    id: string
    code: string
    name: string
    address?: string | null
    city?: string | null
    region?: string | null
    postalCode?: string | null
    country?: string | null
    status?: string | null
  }
  activeSupplies: PropertySupply[]
  builtInCatalog: BuiltInCatalogRow[]
  customCatalog: CustomCatalogRow[]
}

type SupplyEditorState = {
  rowId: string
  displayName: string
  code: string
  category: string
  unit: string
  stateMode: SupplyStateMode
  fillLevel: SupplyState
  currentStock: string
  mediumThreshold: string
  fullThreshold: string
  isCritical: boolean
  notes: string
}

type DecoratedSupplyRow = PropertySupply & {
  derivedState: SupplyState
  safeUpdatedAt: string | null
  displayName: string
  normalizedMode: SupplyStateMode
}

function normalizeLanguage(value: string | undefined): Language {
  return value === "en" ? "en" : "el"
}

function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDateTime(value: string | null | undefined, locale: string) {
  const date = normalizeDate(value)
  if (!date) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function toNullableNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null

  return parsed
}

function toIntegerDisplay(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return Number.isInteger(value) ? String(value) : String(value)
}

function normalizeSupplyMode(value?: string | null): SupplyStateMode {
  return String(value || "").trim().toLowerCase() === "numeric_thresholds"
    ? "numeric_thresholds"
    : "direct_state"
}

function getTexts(language: Language) {
  if (language === "en") {
    return {
      locale: "en-GB",
      backToProperty: "Back to property",
      pageTitle: "Supplies management",
      pageSubtitle:
        "Only the active supplies of this property are shown here. Activation of built-in and custom supplies is handled through the popup. For each active supply you can define whether the state is set directly or derived from a numeric count.",
      emptyInline:
        "No active supplies have been selected for this property yet. Use the popup to activate the supplies you want.",
      loading: "Loading supplies...",
      loadError: "Failed to load supplies.",
      updateError: "Failed to update supplies.",
      activeSupplies: "Active supplies",
      chooseSupplies: "Choose supplies",
      popupTitle: "Choose supplies for this property",
      popupSubtitle:
        "Activate or deactivate built-in and custom supplies for this property.",
      builtInTitle: "Built-in supplies",
      customListTitle: "Custom supplies",
      customEmpty:
        "No custom supplies have been created yet. Add a new one below.",
      customTitle: "Add custom supply",
      customPlaceholder: "Custom supply name",
      addCustom: "Add custom supply",
      close: "Close",
      activate: "Activate",
      deactivate: "Deactivate",
      active: "Active",
      inactive: "Inactive",
      all: "All",
      missing: "Missing",
      medium: "Medium",
      full: "Full",
      status: "Status",
      updatedAt: "Last updated",
      configureSupply: "Configure supply",
      save: "Save",
      cancel: "Cancel",
      deleteRow: "Remove from property",
      deleting: "Removing...",
      saving: "Saving...",
      popupEmpty: "No available built-in supplies.",
      stateModeTitle: "State definition mode",
      stateModeDirect: "Direct state",
      stateModeNumeric: "Count based",
      stateModeDirectDescription:
        "The manager or partner selects Missing / Medium / Full directly.",
      stateModeNumericDescription:
        "The partner submits a numeric quantity and the system derives the state automatically.",
      currentQuantity: "Current quantity",
      mediumThreshold: "Medium threshold",
      fullThreshold: "Full threshold",
      derivedState: "Derived state",
      mode: "Mode",
      category: "Category",
      unit: "Unit",
      itemCode: "Code",
      notes: "Notes",
      criticalSupply: "Critical supply",
      quantityRules: "Quantity rules",
      directRules: "Direct state",
      preview: "Preview",
      thresholdsHelp:
        "Missing is below the medium threshold. Medium starts at the medium threshold. Full starts at the full threshold.",
      invalidThresholds:
        "The full threshold must be greater than the medium threshold.",
      quantityPlaceholder: "Quantity",
      thresholdPlaceholder: "Threshold",
      noNumericData: "No numeric setup",
      quantityBased: "Count based",
      directStateBased: "Direct state",
    }
  }

  return {
    locale: "el-GR",
    backToProperty: "Επιστροφή στο ακίνητο",
    pageTitle: "Διαχείριση αναλωσίμων",
    pageSubtitle:
      "Στη σελίδα εμφανίζονται μόνο τα αναλώσιμα που έχουν ενεργοποιηθεί για το συγκεκριμένο ακίνητο. Η ενεργοποίηση built-in και custom γίνεται μόνο από το popup. Για κάθε ενεργό αναλώσιμο μπορείς να ορίσεις αν η κατάσταση δίνεται άμεσα ή προκύπτει από αριθμητική καταμέτρηση.",
    emptyInline:
      "Δεν έχουν ενεργοποιηθεί ακόμη αναλώσιμα για το συγκεκριμένο ακίνητο. Πάτησε «Επιλογή αναλωσίμων» για να τα ορίσεις.",
    loading: "Φόρτωση αναλωσίμων...",
    loadError: "Αποτυχία φόρτωσης αναλωσίμων.",
    updateError: "Αποτυχία ενημέρωσης αναλωσίμων.",
    activeSupplies: "Ενεργά αναλώσιμα",
    chooseSupplies: "Επιλογή αναλωσίμων",
    popupTitle: "Επιλογή αναλωσίμων για το ακίνητο",
    popupSubtitle:
      "Από εδώ ενεργοποιείς ή απενεργοποιείς built-in και custom αναλώσιμα για το συγκεκριμένο ακίνητο.",
    builtInTitle: "Built-in αναλώσιμα",
    customListTitle: "Custom αναλώσιμα",
    customEmpty:
      "Δεν υπάρχουν ακόμη custom αναλώσιμα. Πρόσθεσε νέο από την ενότητα παρακάτω.",
    customTitle: "Προσθήκη custom αναλωσίμου",
    customPlaceholder: "Όνομα custom αναλωσίμου",
    addCustom: "Προσθήκη custom αναλωσίμου",
    close: "Κλείσιμο",
    activate: "Ενεργοποίηση",
    deactivate: "Απενεργοποίηση",
    active: "Ενεργό",
    inactive: "Ανενεργό",
    all: "Όλα",
    missing: "Έλλειψη",
    medium: "Μέτρια",
    full: "Πλήρης",
    status: "Κατάσταση",
    updatedAt: "Τελευταία ενημέρωση",
    configureSupply: "Ρύθμιση αναλωσίμου",
    save: "Αποθήκευση",
    cancel: "Ακύρωση",
    deleteRow: "Αφαίρεση από το ακίνητο",
    deleting: "Αφαίρεση...",
    saving: "Αποθήκευση...",
    popupEmpty: "Δεν υπάρχουν διαθέσιμα built-in αναλώσιμα.",
    stateModeTitle: "Τρόπος ορισμού κατάστασης",
    stateModeDirect: "Άμεση κατάσταση",
    stateModeNumeric: "Καταμέτρηση",
    stateModeDirectDescription:
      "Ο διαχειριστής ή ο συνεργάτης επιλέγει απευθείας Έλλειψη / Μέτρια / Πλήρης.",
    stateModeNumericDescription:
      "Ο συνεργάτης δίνει αριθμητική ποσότητα και το σύστημα αναγνωρίζει μόνο του την κατάσταση.",
    currentQuantity: "Τρέχουσα ποσότητα",
    mediumThreshold: "Όριο μέτριας",
    fullThreshold: "Όριο πλήρους",
    derivedState: "Παράγωγη κατάσταση",
    mode: "Τρόπος",
    category: "Κατηγορία",
    unit: "Μονάδα",
    itemCode: "Κωδικός",
    notes: "Σημειώσεις",
    criticalSupply: "Κρίσιμο αναλώσιμο",
    quantityRules: "Κανόνες καταμέτρησης",
    directRules: "Άμεση κατάσταση",
    preview: "Προεπισκόπηση",
    thresholdsHelp:
      "Κάτω από το όριο μέτριας το αναλώσιμο είναι σε έλλειψη. Από το όριο μέτριας και πάνω είναι μέτρια, και από το όριο πλήρους και πάνω θεωρείται πλήρες.",
    invalidThresholds:
      "Το όριο πλήρους πρέπει να είναι μεγαλύτερο από το όριο μέτριας.",
    quantityPlaceholder: "Ποσότητα",
    thresholdPlaceholder: "Όριο",
    noNumericData: "Δεν έχουν οριστεί αριθμητικά όρια",
    quantityBased: "Με καταμέτρηση",
    directStateBased: "Με άμεση κατάσταση",
  }
}

function getSupplyDisplayName(
  language: Language,
  supplyItem?: {
    code?: string | null
    name?: string | null
    nameEl?: string | null
    nameEn?: string | null
  } | null
) {
  return resolveSupplyDisplayName(language, supplyItem)
}

function getSupplyState(row: PropertySupply): SupplyState {
  return buildCanonicalSupplySnapshot({
    isActive: true,
    stateMode: row.stateMode,
    fillLevel: row.fillLevel,
    currentStock: row.currentStock,
    mediumThreshold: row.mediumThreshold,
    fullThreshold: row.fullThreshold,
    minimumThreshold: row.minimumThreshold,
    reorderThreshold: row.reorderThreshold,
    targetLevel: row.targetLevel,
    targetStock: row.targetStock,
    supplyMinimumStock: row.supplyItem?.minimumStock,
    trackingMode: row.trackingMode,
  }).derivedState
}

function getSupplyStateLabel(language: Language, state: SupplyState) {
  if (language === "en") {
    if (state === "missing") return "Missing"
    if (state === "medium") return "Medium"
    return "Full"
  }

  if (state === "missing") return "Έλλειψη"
  if (state === "medium") return "Μέτρια"
  return "Πλήρης"
}

function getSupplyModeLabel(language: Language, mode: SupplyStateMode) {
  if (language === "en") {
    return mode === "numeric_thresholds" ? "Count based" : "Direct state"
  }

  return mode === "numeric_thresholds" ? "Καταμέτρηση" : "Άμεση κατάσταση"
}

function supplyStateBadgeClass(state: SupplyState) {
  if (state === "missing") {
    return "bg-red-50 text-red-700 ring-1 ring-red-200"
  }

  if (state === "medium") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  }

  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
}

function getEditorPreview(editor: SupplyEditorState) {
  const mediumThreshold = toNullableNumber(editor.mediumThreshold)
  const fullThreshold = toNullableNumber(editor.fullThreshold)
  const currentStock = toNullableNumber(editor.currentStock)

  return buildCanonicalSupplySnapshot({
    isActive: true,
    stateMode: editor.stateMode,
    fillLevel: editor.fillLevel,
    currentStock,
    mediumThreshold,
    fullThreshold,
  })
}

function CounterButton({
  label,
  value,
  active,
  onClick,
  tone = "slate",
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
  tone?: "slate" | "red" | "amber" | "emerald"
}) {
  const className =
    tone === "red"
      ? active
        ? "border-red-600 bg-red-600 text-white"
        : "border-red-200 bg-white text-red-700 hover:bg-red-50"
      : tone === "amber"
        ? active
          ? "border-amber-500 bg-amber-500 text-white"
          : "border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
        : tone === "emerald"
          ? active
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
          : active
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left shadow-sm transition ${className}`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </button>
  )
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  closeLabel,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  closeLabel: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {closeLabel}
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">{children}</div>
      </div>
    </div>
  )
}

export default function PropertySuppliesPage() {
  const params = useParams()
  const propertyId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { language } = useAppLanguage()
  const lang = normalizeLanguage(language)
  const t = getTexts(lang)

  const [data, setData] = useState<SuppliesPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [popupOpen, setPopupOpen] = useState(false)
  const [filter, setFilter] = useState<SupplyFilter>("all")
  const [customName, setCustomName] = useState("")
  const [editingRow, setEditingRow] = useState<SupplyEditorState | null>(null)

  async function loadData() {
    if (!propertyId) return

    try {
      setLoading(true)
      setError("")

      const res = await fetch(`/api/properties/${propertyId}/supplies`, {
        cache: "no-store",
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || t.loadError)
      }

      setData(json)
    } catch (err) {
      console.error("Load property supplies error:", err)
      setError(err instanceof Error ? err.message : t.loadError)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  async function silentSyncTemplate() {
    if (!propertyId) return

    try {
      await fetch(`/api/properties/${propertyId}/supplies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "sync_template",
        }),
      })
    } catch (syncError) {
      console.error("Silent sync template error:", syncError)
    }
  }

  async function refreshAfterMutation() {
    await silentSyncTemplate()
    await loadData()
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId])

  const activeSupplies = data?.activeSupplies || []

  const supplyRows = useMemo<DecoratedSupplyRow[]>(() => {
    return activeSupplies.map((row) => ({
      ...row,
      derivedState: getSupplyState(row),
      safeUpdatedAt: row.lastUpdatedAt || row.updatedAt || null,
      displayName: getSupplyDisplayName(lang, row.supplyItem),
      normalizedMode: normalizeSupplyMode(row.stateMode),
    }))
  }, [activeSupplies, lang])

  const hasActiveSupplies = supplyRows.length > 0

  const counts = useMemo(() => {
    return {
      all: supplyRows.length,
      missing: supplyRows.filter((row) => row.derivedState === "missing").length,
      medium: supplyRows.filter((row) => row.derivedState === "medium").length,
      full: supplyRows.filter((row) => row.derivedState === "full").length,
    }
  }, [supplyRows])

  const visibleRows = useMemo(() => {
    if (filter === "all") return supplyRows
    return supplyRows.filter((row) => row.derivedState === filter)
  }, [supplyRows, filter])

  const editorPreview = useMemo(() => {
    return editingRow ? getEditorPreview(editingRow) : null
  }, [editingRow])

  function openEditor(row: DecoratedSupplyRow) {
    setEditingRow({
      rowId: row.id,
      displayName: row.displayName,
      code: row.supplyItem?.code || "—",
      category: row.supplyItem?.category || "—",
      unit: row.supplyItem?.unit || "—",
      stateMode: row.normalizedMode,
      fillLevel: row.derivedState,
      currentStock:
        row.currentStock === null || row.currentStock === undefined
          ? ""
          : String(row.currentStock),
      mediumThreshold:
        row.mediumThreshold === null || row.mediumThreshold === undefined
          ? ""
          : String(row.mediumThreshold),
      fullThreshold:
        row.fullThreshold === null || row.fullThreshold === undefined
          ? ""
          : String(row.fullThreshold),
      isCritical: Boolean(row.isCritical),
      notes: row.notes || "",
    })
  }

  async function toggleBuiltIn(code: string, enabled: boolean) {
    if (!propertyId) return

    try {
      setSaving(true)
      setError("")

      const res = await fetch(`/api/properties/${propertyId}/supplies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "toggle_builtin",
          code,
          enabled,
        }),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || t.updateError)
      }

      await refreshAfterMutation()
    } catch (err) {
      console.error("Toggle built-in supply error:", err)
      setError(err instanceof Error ? err.message : t.updateError)
    } finally {
      setSaving(false)
    }
  }

  async function toggleCustom(supplyItemId: string, enabled: boolean) {
    if (!propertyId) return

    try {
      setSaving(true)
      setError("")

      const res = await fetch(`/api/properties/${propertyId}/supplies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "toggle_custom",
          supplyItemId,
          enabled,
        }),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || t.updateError)
      }

      await refreshAfterMutation()
    } catch (err) {
      console.error("Toggle custom supply error:", err)
      setError(err instanceof Error ? err.message : t.updateError)
    } finally {
      setSaving(false)
    }
  }

  async function addCustomSupply() {
    if (!propertyId || !customName.trim()) return

    try {
      setSaving(true)
      setError("")

      const res = await fetch(`/api/properties/${propertyId}/supplies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add_custom",
          name: customName.trim(),
        }),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || t.updateError)
      }

      setCustomName("")
      await refreshAfterMutation()
    } catch (err) {
      console.error("Add custom supply error:", err)
      setError(err instanceof Error ? err.message : t.updateError)
    } finally {
      setSaving(false)
    }
  }

  async function updateSupplyConfiguration() {
    if (!propertyId || !editingRow) return

    try {
      setSaving(true)
      setError("")

      if (editingRow.stateMode === "numeric_thresholds") {
        const mediumThreshold = toNullableNumber(editingRow.mediumThreshold)
        const fullThreshold = toNullableNumber(editingRow.fullThreshold)

        if (
          mediumThreshold === null ||
          fullThreshold === null ||
          fullThreshold <= mediumThreshold
        ) {
          throw new Error(t.invalidThresholds)
        }
      }

      const patchPayload =
        editingRow.stateMode === "numeric_thresholds"
          ? {
              stateMode: "numeric_thresholds",
              currentStock: toNullableNumber(editingRow.currentStock) ?? 0,
              mediumThreshold: toNullableNumber(editingRow.mediumThreshold) ?? 1,
              fullThreshold:
                toNullableNumber(editingRow.fullThreshold) ??
                Math.max((toNullableNumber(editingRow.mediumThreshold) ?? 1) + 1, 2),
              isCritical: editingRow.isCritical,
              notes: editingRow.notes || null,
            }
          : {
              stateMode: "direct_state",
              fillLevel: editingRow.fillLevel,
              isCritical: editingRow.isCritical,
              notes: editingRow.notes || null,
            }

      const res = await fetch(
        `/api/properties/${propertyId}/supplies/${editingRow.rowId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patchPayload),
        }
      )

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || t.updateError)
      }

      setEditingRow(null)
      await refreshAfterMutation()
    } catch (err) {
      console.error("Update supply configuration error:", err)
      setError(err instanceof Error ? err.message : t.updateError)
    } finally {
      setSaving(false)
    }
  }

  async function removeSupplyFromProperty(rowId: string) {
    if (!propertyId) return

    try {
      setSaving(true)
      setError("")

      const res = await fetch(`/api/properties/${propertyId}/supplies/${rowId}`, {
        method: "DELETE",
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || t.updateError)
      }

      await refreshAfterMutation()
    } catch (err) {
      console.error("Remove property supply error:", err)
      setError(err instanceof Error ? err.message : t.updateError)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {t.loading}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-6 text-red-700 shadow-sm">
        {error || t.loadError}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <Link
                href={`/properties/${propertyId}`}
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                ← {t.backToProperty}
              </Link>

              <h1 className="mt-4 text-3xl font-bold text-slate-950">{t.pageTitle}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">{t.pageSubtitle}</p>
              <p className="mt-2 text-sm text-slate-500">
                {data.property.code} · {data.property.name}
              </p>

              {!hasActiveSupplies ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  {t.emptyInline}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPopupOpen(true)}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {t.chooseSupplies}
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {hasActiveSupplies ? (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <CounterButton
                label={t.all}
                value={counts.all}
                active={filter === "all"}
                onClick={() => setFilter("all")}
                tone="slate"
              />
              <CounterButton
                label={t.missing}
                value={counts.missing}
                active={filter === "missing"}
                onClick={() => setFilter("missing")}
                tone="red"
              />
              <CounterButton
                label={t.medium}
                value={counts.medium}
                active={filter === "medium"}
                onClick={() => setFilter("medium")}
                tone="amber"
              />
              <CounterButton
                label={t.full}
                value={counts.full}
                active={filter === "full"}
                onClick={() => setFilter("full")}
                tone="emerald"
              />
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">{t.activeSupplies}</h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleRows.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{row.displayName}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {row.supplyItem?.code || "—"}
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${supplyStateBadgeClass(
                          row.derivedState
                        )}`}
                      >
                        {getSupplyStateLabel(lang, row.derivedState)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {t.mode}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {getSupplyModeLabel(lang, row.normalizedMode)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {t.currentQuantity}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {toIntegerDisplay(row.currentStock)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {t.mediumThreshold}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {row.normalizedMode === "numeric_thresholds"
                            ? toIntegerDisplay(row.mediumThreshold)
                            : "—"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {t.fullThreshold}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {row.normalizedMode === "numeric_thresholds"
                            ? toIntegerDisplay(row.fullThreshold)
                            : "—"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {t.unit}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {row.supplyItem?.unit || "—"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {t.category}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {row.supplyItem?.category || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-slate-500">
                      {t.updatedAt}: {formatDateTime(row.safeUpdatedAt, t.locale)}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditor(row)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {t.configureSupply}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeSupplyFromProperty(row.id)}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                      >
                        {saving ? t.deleting : t.deleteRow}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>

      {popupOpen ? (
        <Modal
          title={t.popupTitle}
          subtitle={t.popupSubtitle}
          onClose={() => setPopupOpen(false)}
          closeLabel={t.close}
        >
          <div className="space-y-8">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{t.builtInTitle}</h3>

              {data.builtInCatalog.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  {t.popupEmpty}
                </div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {data.builtInCatalog.map((row) => (
                    <div key={row.code} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">
                            {lang === "en" ? row.nameEn : row.nameEl}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">{row.code}</div>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.isActiveForProperty
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                          }`}
                        >
                          {row.isActiveForProperty ? t.active : t.inactive}
                        </span>
                      </div>

                      <div className="mt-4">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => toggleBuiltIn(row.code, !row.isActiveForProperty)}
                          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                            row.isActiveForProperty
                              ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-slate-900 text-white hover:bg-slate-800"
                          }`}
                        >
                          {row.isActiveForProperty ? t.deactivate : t.activate}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900">{t.customListTitle}</h3>

              {data.customCatalog?.length ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {data.customCatalog.map((row) => (
                    <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">
                            {resolveSupplyDisplayName(lang, row)}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">{row.code}</div>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.isActiveForProperty
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                          }`}
                        >
                          {row.isActiveForProperty ? t.active : t.inactive}
                        </span>
                      </div>

                      <div className="mt-4">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => toggleCustom(row.id, !row.isActiveForProperty)}
                          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                            row.isActiveForProperty
                              ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-slate-900 text-white hover:bg-slate-800"
                          }`}
                        >
                          {row.isActiveForProperty ? t.deactivate : t.activate}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  {t.customEmpty}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-900">{t.customTitle}</h3>

              <div className="mt-3 flex flex-col gap-3 md:flex-row">
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={t.customPlaceholder}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                />
                <button
                  type="button"
                  disabled={saving || !customName.trim()}
                  onClick={addCustomSupply}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {t.addCustom}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {editingRow ? (
        <Modal
          title={editingRow.displayName || t.configureSupply}
          subtitle={`${t.itemCode}: ${editingRow.code}`}
          onClose={() => setEditingRow(null)}
          closeLabel={t.close}
        >
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setEditingRow((prev) =>
                    prev
                      ? {
                          ...prev,
                          stateMode: "direct_state",
                        }
                      : prev
                  )
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  editingRow.stateMode === "direct_state"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                <div className="text-sm font-semibold">{t.stateModeDirect}</div>
                <div className="mt-2 text-xs opacity-80">{t.stateModeDirectDescription}</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setEditingRow((prev) =>
                    prev
                      ? {
                          ...prev,
                          stateMode: "numeric_thresholds",
                          currentStock:
                            prev.currentStock.trim() === "" ? "0" : prev.currentStock,
                          mediumThreshold:
                            prev.mediumThreshold.trim() === "" ? "1" : prev.mediumThreshold,
                          fullThreshold:
                            prev.fullThreshold.trim() === ""
                              ? String(
                                  Math.max(
                                    (toNullableNumber(prev.mediumThreshold) ?? 1) + 1,
                                    2
                                  )
                                )
                              : prev.fullThreshold,
                        }
                      : prev
                  )
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  editingRow.stateMode === "numeric_thresholds"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                <div className="text-sm font-semibold">{t.stateModeNumeric}</div>
                <div className="mt-2 text-xs opacity-80">{t.stateModeNumericDescription}</div>
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t.category}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {editingRow.category || "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t.unit}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {editingRow.unit || "—"}
                </div>
              </div>
            </div>

            {editingRow.stateMode === "direct_state" ? (
              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{t.directRules}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {t.stateModeDirectDescription}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingRow((prev) =>
                        prev
                          ? {
                              ...prev,
                              fillLevel: "missing",
                            }
                          : prev
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      editingRow.fillLevel === "missing"
                        ? "border-red-600 bg-red-600 text-white"
                        : "border-red-200 bg-white text-red-700 hover:bg-red-50"
                    }`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                      {t.status}
                    </div>
                    <div className="mt-2 text-xl font-bold">{t.missing}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingRow((prev) =>
                        prev
                          ? {
                              ...prev,
                              fillLevel: "medium",
                            }
                          : prev
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      editingRow.fillLevel === "medium"
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                    }`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                      {t.status}
                    </div>
                    <div className="mt-2 text-xl font-bold">{t.medium}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingRow((prev) =>
                        prev
                          ? {
                              ...prev,
                              fillLevel: "full",
                            }
                          : prev
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      editingRow.fillLevel === "full"
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                      {t.status}
                    </div>
                    <div className="mt-2 text-xl font-bold">{t.full}</div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{t.quantityRules}</div>
                  <div className="mt-1 text-sm text-slate-500">{t.thresholdsHelp}</div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t.currentQuantity}
                    </label>
                    <input
                      type="number"
                      value={editingRow.currentStock}
                      onChange={(e) =>
                        setEditingRow((prev) =>
                          prev
                            ? {
                                ...prev,
                                currentStock: e.target.value,
                              }
                            : prev
                        )
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                      placeholder={t.quantityPlaceholder}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t.mediumThreshold}
                    </label>
                    <input
                      type="number"
                      value={editingRow.mediumThreshold}
                      onChange={(e) =>
                        setEditingRow((prev) =>
                          prev
                            ? {
                                ...prev,
                                mediumThreshold: e.target.value,
                              }
                            : prev
                        )
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                      placeholder={t.thresholdPlaceholder}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t.fullThreshold}
                    </label>
                    <input
                      type="number"
                      value={editingRow.fullThreshold}
                      onChange={(e) =>
                        setEditingRow((prev) =>
                          prev
                            ? {
                                ...prev,
                                fullThreshold: e.target.value,
                              }
                            : prev
                        )
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                      placeholder={t.thresholdPlaceholder}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t.preview}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${supplyStateBadgeClass(
                      editorPreview?.derivedState || "full"
                    )}`}
                  >
                    {getSupplyStateLabel(lang, editorPreview?.derivedState || "full")}
                  </span>

                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {getSupplyModeLabel(lang, editingRow.stateMode)}
                  </span>
                </div>

                {editingRow.stateMode === "numeric_thresholds" ? (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {t.currentQuantity}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {toIntegerDisplay(toNullableNumber(editingRow.currentStock))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {t.mediumThreshold}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {toIntegerDisplay(toNullableNumber(editingRow.mediumThreshold))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {t.fullThreshold}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {toIntegerDisplay(toNullableNumber(editingRow.fullThreshold))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={editingRow.isCritical}
                    onChange={(e) =>
                      setEditingRow((prev) =>
                        prev
                          ? {
                              ...prev,
                              isCritical: e.target.checked,
                            }
                          : prev
                      )
                    }
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {t.criticalSupply}
                  </span>
                </label>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t.notes}
                  </label>
                  <textarea
                    rows={4}
                    value={editingRow.notes}
                    onChange={(e) =>
                      setEditingRow((prev) =>
                        prev
                          ? {
                              ...prev,
                              notes: e.target.value,
                            }
                          : prev
                      )
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                disabled={saving}
              >
                {t.cancel}
              </button>

              <button
                type="button"
                onClick={updateSupplyConfiguration}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  )
}