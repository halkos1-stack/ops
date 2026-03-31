"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { getSupplyPresetByCode } from "@/lib/supply-presets"

type Language = "el" | "en"
type SupplyFilter = "all" | "missing" | "medium" | "full"
type SupplyState = "missing" | "medium" | "full"

type SupplyItem = {
  id: string
  code: string
  name: string
  category: string
  unit: string
  minimumStock?: number | null
  isActive: boolean
}

type PropertySupply = {
  id: string
  propertyId: string
  supplyItemId: string
  currentStock: number
  targetStock?: number | null
  reorderThreshold?: number | null
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

function getTexts(language: Language) {
  if (language === "en") {
    return {
      locale: "en-GB",
      backToProperty: "Back to property",
      pageTitle: "Supplies management",
      pageSubtitle:
        "Only the active supplies of this property are shown here. Activation of built-in and custom supplies is handled through the popup.",
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
      changeStatus: "Update status",
      save: "Save",
      cancel: "Cancel",
      deleteRow: "Remove from property",
      deleting: "Removing...",
      saving: "Saving...",
      popupEmpty: "No available built-in supplies.",
    }
  }

  return {
    locale: "el-GR",
    backToProperty: "Επιστροφή στο ακίνητο",
    pageTitle: "Διαχείριση αναλωσίμων",
    pageSubtitle:
      "Στη σελίδα εμφανίζονται μόνο τα αναλώσιμα που έχουν ενεργοποιηθεί για το συγκεκριμένο ακίνητο. Η ενεργοποίηση built-in και custom γίνεται μόνο από το popup.",
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
    changeStatus: "Ενημέρωση κατάστασης",
    save: "Αποθήκευση",
    cancel: "Ακύρωση",
    deleteRow: "Αφαίρεση από το ακίνητο",
    deleting: "Αφαίρεση...",
    saving: "Αποθήκευση...",
    popupEmpty: "Δεν υπάρχουν διαθέσιμα built-in αναλώσιμα.",
  }
}

function getSupplyDisplayName(
  language: Language,
  supplyItem?: { code?: string | null; name?: string | null } | null
) {
  const fallback = String(supplyItem?.name || "").trim() || "—"
  const preset = getSupplyPresetByCode(supplyItem?.code)

  if (!preset) return fallback

  return language === "en" ? preset.nameEn : preset.nameEl
}

function getSupplyState(row: PropertySupply): SupplyState {
  const current = Number(row.currentStock || 0)
  const target =
    typeof row.targetStock === "number" && Number.isFinite(row.targetStock)
      ? row.targetStock
      : null
  const threshold =
    typeof row.reorderThreshold === "number" &&
    Number.isFinite(row.reorderThreshold)
      ? row.reorderThreshold
      : row.supplyItem?.minimumStock ?? null

  if (current <= 0) return "missing"

  if (target !== null && target > 0 && current >= target) {
    return "full"
  }

  if (threshold !== null && current <= threshold) {
    return "medium"
  }

  if (target !== null && target > 0 && current < target) {
    return "medium"
  }

  return "full"
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

function supplyStateBadgeClass(state: SupplyState) {
  if (state === "missing") {
    return "bg-red-50 text-red-700 ring-1 ring-red-200"
  }

  if (state === "medium") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  }

  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
}

function computeStockForState(row: PropertySupply, state: SupplyState) {
  const current =
    typeof row.currentStock === "number" && Number.isFinite(row.currentStock)
      ? row.currentStock
      : 0

  const target =
    typeof row.targetStock === "number" && Number.isFinite(row.targetStock)
      ? row.targetStock
      : null

  const threshold =
    typeof row.reorderThreshold === "number" &&
    Number.isFinite(row.reorderThreshold)
      ? row.reorderThreshold
      : row.supplyItem?.minimumStock ?? null

  const minimum =
    typeof row.supplyItem?.minimumStock === "number" &&
    Number.isFinite(row.supplyItem.minimumStock)
      ? row.supplyItem.minimumStock
      : 0

  if (state === "missing") return 0

  if (state === "medium") {
    if (threshold !== null && threshold > 0) return threshold
    if (target !== null && target > 1) return Math.max(1, Math.ceil(target / 2))
    if (minimum > 0) return minimum
    return Math.max(1, current || 1)
  }

  if (target !== null && target > 0) return target
  if (threshold !== null && threshold > 0) return Math.max(threshold + 1, 2)
  if (minimum > 0) return Math.max(minimum + 1, 2)
  return Math.max(current, 3)
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
  children: React.ReactNode
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
  const [editingRow, setEditingRow] = useState<PropertySupply | null>(null)
  const [selectedState, setSelectedState] = useState<SupplyState>("full")

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

  const supplyRows = useMemo(() => {
    return activeSupplies.map((row) => ({
      ...row,
      derivedState: getSupplyState(row),
      safeUpdatedAt: row.lastUpdatedAt || row.updatedAt || null,
      displayName: getSupplyDisplayName(lang, row.supplyItem),
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

  async function updateSupplyState() {
    if (!propertyId || !editingRow) return

    try {
      setSaving(true)
      setError("")

      const nextStock = computeStockForState(editingRow, selectedState)

      const res = await fetch(
        `/api/properties/${propertyId}/supplies/${editingRow.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentStock: nextStock,
          }),
        }
      )

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || t.updateError)
      }

      setEditingRow(null)
      await refreshAfterMutation()
    } catch (err) {
      console.error("Update supply state error:", err)
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
                        <div className="font-semibold text-slate-900">
                          {row.displayName}
                        </div>
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

                    <div className="mt-4 text-sm text-slate-500">
                      {t.updatedAt}: {formatDateTime(row.safeUpdatedAt, t.locale)}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRow(row)
                          setSelectedState(row.derivedState)
                        }}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {t.changeStatus}
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
                          onClick={() =>
                            toggleBuiltIn(row.code, !row.isActiveForProperty)
                          }
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
                          <div className="font-semibold text-slate-900">{row.name}</div>
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
                          onClick={() =>
                            toggleCustom(row.id, !row.isActiveForProperty)
                          }
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
          title={getSupplyDisplayName(lang, editingRow.supplyItem) || t.changeStatus}
          subtitle={t.status}
          onClose={() => setEditingRow(null)}
          closeLabel={t.close}
        >
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => setSelectedState("missing")}
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedState === "missing"
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
                onClick={() => setSelectedState("medium")}
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedState === "medium"
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
                onClick={() => setSelectedState("full")}
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedState === "full"
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
                onClick={updateSupplyState}
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