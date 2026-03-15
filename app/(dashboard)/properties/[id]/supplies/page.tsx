"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type Γλώσσα = "el" | "en"
type ΚατάστασηΑναλωσίμου = "missing" | "medium" | "full"

type SupplyItemView = {
  id: string
  code: string
  name: string
  category: string
  unit: string
  minimumStock: number | null
  isActive: boolean
}

type PropertySupplyView = {
  id: string
  propertyId: string
  supplyItemId: string
  currentStock: number
  targetStock: number | null
  reorderThreshold: number | null
  lastUpdatedAt: string
  notes: string | null
  createdAt: string
  updatedAt: string
  supplyItem: SupplyItemView
}

type BuiltInCatalogItem = {
  code: string
  name: string
  category: string
  unit: string
  isActive: boolean
}

type SuppliesResponse = {
  property: {
    id: string
    code: string
    name: string
    organizationId: string
  }
  activeSupplies: PropertySupplyView[]
  builtInCatalog: BuiltInCatalogItem[]
}

const ΚΕΙΜΕΝΑ = {
  el: {
    επιστροφή: "Επιστροφή στο ακίνητο",
    τίτλος: "Αναλώσιμα ακινήτου",
    υπότιτλος:
      "Εδώ εμφανίζονται μόνο τα ενεργά αναλώσιμα του ακινήτου. Ό,τι ενεργοποιείται από τη λίστα εμφανίζεται αυτόματα εδώ και ακολουθεί τη λογική Έλλειψη / Μέτρια / Πλήρης.",
    επιλογήΑναλωσίμων: "Επιλογή αναλωσίμων",
    φόρτωση: "Φόρτωση...",
    χωρίςΑναλώσιμα:
      "Δεν υπάρχουν ενεργά αναλώσιμα ακόμη. Πάτησε «Επιλογή αναλωσίμων» για να ενεργοποιήσεις από τη βασική λίστα ή να προσθέσεις custom.",
    όλα: "Όλα",
    έλλειψη: "Έλλειψη",
    μέτρια: "Μέτρια",
    πλήρης: "Πλήρης",
    ενεργάΑναλώσιμα: "Ενεργά αναλώσιμα",
    κατηγορία: "Κατηγορία",
    μονάδα: "Μονάδα",
    κατάσταση: "Κατάσταση",
    βασικήΛίστα: "Βασικά αναλώσιμα",
    παράθυροΤίτλος: "Επιλογή αναλωσίμων για το ακίνητο",
    παράθυροΥπότιτλος:
      "Ενεργοποίησε όσα αναλώσιμα χρειάζεται αυτό το ακίνητο. Ό,τι ενεργοποιήσεις θα εμφανιστεί αυτόματα στη βασική λίστα.",
    όνομα: "Όνομα",
    ενέργεια: "Ενέργεια",
    ενεργό: "Ενεργό",
    ανενεργό: "Ανενεργό",
    ενεργοποίηση: "Ενεργοποίηση",
    απενεργοποίηση: "Απενεργοποίηση",
    κλείσιμο: "Κλείσιμο",
    customΤίτλος: "Προσθήκη custom αναλωσίμου",
    customΥπότιτλος:
      "Η custom προσθήκη δέχεται μόνο όνομα. Και αυτό θα ακολουθεί την ίδια λογική Έλλειψη / Μέτρια / Πλήρης.",
    customPlaceholder: "π.χ. χαρτομάντιλα",
    προσθήκηCustom: "Προσθήκη custom",
    ενημέρωση: "Ενημέρωση...",
    σφάλμαΦόρτωσης: "Αποτυχία φόρτωσης αναλωσίμων.",
    σφάλμαΑποθήκευσης: "Αποτυχία ενημέρωσης αναλωσίμων.",
    δώσεΌνομα: "Δώσε όνομα για το custom αναλώσιμο.",
    builtIn: "Built-in",
    custom: "Custom",
  },
  en: {
    επιστροφή: "Back to property",
    τίτλος: "Property supplies",
    υπότιτλος:
      "Only active supplies for this property are shown here. Anything activated from the list appears automatically here and follows the Missing / Medium / Full logic.",
    επιλογήΑναλωσίμων: "Choose supplies",
    φόρτωση: "Loading...",
    χωρίςΑναλώσιμα:
      "No active supplies yet. Click “Choose supplies” to activate built-in items or add a custom item.",
    όλα: "All",
    έλλειψη: "Missing",
    μέτρια: "Medium",
    πλήρης: "Full",
    ενεργάΑναλώσιμα: "Active supplies",
    κατηγορία: "Category",
    μονάδα: "Unit",
    κατάσταση: "Status",
    βασικήΛίστα: "Built-in supplies",
    παράθυροΤίτλος: "Choose supplies for this property",
    παράθυροΥπότιτλος:
      "Activate the supplies needed for this property. Anything activated appears automatically in the main list.",
    όνομα: "Name",
    ενέργεια: "Action",
    ενεργό: "Active",
    ανενεργό: "Inactive",
    ενεργοποίηση: "Activate",
    απενεργοποίηση: "Deactivate",
    κλείσιμο: "Close",
    customΤίτλος: "Add custom supply",
    customΥπότιτλος:
      "Custom addition only needs a name. It will also follow the Missing / Medium / Full logic.",
    customPlaceholder: "e.g. tissues",
    προσθήκηCustom: "Add custom",
    ενημέρωση: "Updating...",
    σφάλμαΦόρτωσης: "Failed to load supplies.",
    σφάλμαΑποθήκευσης: "Failed to update supplies.",
    δώσεΌνομα: "Please enter a name for the custom supply.",
    builtIn: "Built-in",
    custom: "Custom",
  },
}

const ΕΤΙΚΕΤΕΣ_ΚΑΤΗΓΟΡΙΑΣ: Record<string, { el: string; en: string }> = {
  bathroom: { el: "Μπάνιο", en: "Bathroom" },
  kitchen: { el: "Κουζίνα", en: "Kitchen" },
  laundry: { el: "Πλυντήριο", en: "Laundry" },
  custom: { el: "Custom", en: "Custom" },
}

const ΕΤΙΚΕΤΕΣ_ΜΟΝΑΔΑΣ: Record<string, { el: string; en: string }> = {
  pcs: { el: "τεμ.", en: "pcs" },
  pack: { el: "πακέτο", en: "pack" },
}

function ομαλοποίησηΓλώσσας(value: string | undefined): Γλώσσα {
  return value === "en" ? "en" : "el"
}

function μετάφρασηΚατηγορίας(value: string, γλώσσα: Γλώσσα) {
  return ΕΤΙΚΕΤΕΣ_ΚΑΤΗΓΟΡΙΑΣ[value]?.[γλώσσα] || value
}

function μετάφρασηΜονάδας(value: string, γλώσσα: Γλώσσα) {
  return ΕΤΙΚΕΤΕΣ_ΜΟΝΑΔΑΣ[value]?.[γλώσσα] || value
}

function υπολογισμόςΚατάστασης(item: PropertySupplyView): ΚατάστασηΑναλωσίμου {
  const currentStock = Number(item.currentStock ?? 0)
  const targetStock = Number(item.targetStock ?? 0)
  const reorderThreshold = Number(item.reorderThreshold ?? 0)

  if (currentStock <= 0) return "missing"
  if (targetStock > 0 && currentStock >= targetStock) return "full"
  if (reorderThreshold > 0 && currentStock <= reorderThreshold) return "medium"
  if (targetStock <= 0) return currentStock > 0 ? "full" : "missing"

  return "medium"
}

function κλάσειςΣήματος(status: ΚατάστασηΑναλωσίμου) {
  if (status === "missing") {
    return "border border-red-200 bg-red-50 text-red-700"
  }

  if (status === "medium") {
    return "border border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border border-emerald-200 bg-emerald-50 text-emerald-700"
}

export default function SuppliesPage() {
  const params = useParams<{ id: string }>()
  const propertyId = String(params?.id || "")
  const { language } = useAppLanguage()
  const γλώσσα = ομαλοποίησηΓλώσσας(language)
  const κείμενα = ΚΕΙΜΕΝΑ[γλώσσα]

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [data, setData] = useState<SuppliesResponse | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customName, setCustomName] = useState("")
  const [filter, setFilter] = useState<"all" | ΚατάστασηΑναλωσίμου>("all")

  async function loadData() {
    if (!propertyId) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/properties/${propertyId}/supplies`, {
        method: "GET",
        cache: "no-store",
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || κείμενα.σφάλμαΦόρτωσης)
      }

      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : κείμενα.σφάλμαΦόρτωσης)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [propertyId])

  async function toggleBuiltIn(code: string, enabled: boolean) {
    setSaving(true)
    setError("")

    try {
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

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || κείμενα.σφάλμαΑποθήκευσης)
      }

      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : κείμενα.σφάλμαΑποθήκευσης)
    } finally {
      setSaving(false)
    }
  }

  async function addCustom() {
    const trimmedName = customName.trim()

    if (!trimmedName) {
      setError(κείμενα.δώσεΌνομα)
      return
    }

    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/properties/${propertyId}/supplies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add_custom",
          name: trimmedName,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || κείμενα.σφάλμαΑποθήκευσης)
      }

      setData(json)
      setCustomName("")
    } catch (err) {
      setError(err instanceof Error ? err.message : κείμενα.σφάλμαΑποθήκευσης)
    } finally {
      setSaving(false)
    }
  }

  const activeSupplies = data?.activeSupplies || []
  const builtInCatalog = data?.builtInCatalog || []

  const filteredSupplies = useMemo(() => {
    if (filter === "all") return activeSupplies
    return activeSupplies.filter((item) => υπολογισμόςΚατάστασης(item) === filter)
  }, [activeSupplies, filter])

  const counts = useMemo(() => {
    const missing = activeSupplies.filter((item) => υπολογισμόςΚατάστασης(item) === "missing").length
    const medium = activeSupplies.filter((item) => υπολογισμόςΚατάστασης(item) === "medium").length
    const full = activeSupplies.filter((item) => υπολογισμόςΚατάστασης(item) === "full").length

    return {
      all: activeSupplies.length,
      missing,
      medium,
      full,
    }
  }, [activeSupplies])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <Link
            href={`/properties/${propertyId}`}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {κείμενα.επιστροφή}
          </Link>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {κείμενα.τίτλος}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {κείμενα.υπότιτλος}
            </p>
            {data?.property ? (
              <p className="mt-2 text-sm text-slate-500">
                {data.property.code} · {data.property.name}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {κείμενα.επιλογήΑναλωσίμων}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-2xl border px-4 py-4 text-left transition ${
            filter === "all"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <div className="text-xs uppercase tracking-wide opacity-80">{κείμενα.όλα}</div>
          <div className="mt-2 text-2xl font-bold">{counts.all}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("missing")}
          className={`rounded-2xl border px-4 py-4 text-left transition ${
            filter === "missing"
              ? "border-red-600 bg-red-600 text-white"
              : "border-red-200 bg-white text-red-700 hover:bg-red-50"
          }`}
        >
          <div className="text-xs uppercase tracking-wide opacity-80">{κείμενα.έλλειψη}</div>
          <div className="mt-2 text-2xl font-bold">{counts.missing}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("medium")}
          className={`rounded-2xl border px-4 py-4 text-left transition ${
            filter === "medium"
              ? "border-amber-500 bg-amber-500 text-white"
              : "border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
          }`}
        >
          <div className="text-xs uppercase tracking-wide opacity-80">{κείμενα.μέτρια}</div>
          <div className="mt-2 text-2xl font-bold">{counts.medium}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("full")}
          className={`rounded-2xl border px-4 py-4 text-left transition ${
            filter === "full"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          <div className="text-xs uppercase tracking-wide opacity-80">{κείμενα.πλήρης}</div>
          <div className="mt-2 text-2xl font-bold">{counts.full}</div>
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{κείμενα.ενεργάΑναλώσιμα}</h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-sm text-slate-500">{κείμενα.φόρτωση}</div>
          ) : filteredSupplies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              {κείμενα.χωρίςΑναλώσιμα}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredSupplies.map((item) => {
                const κατάσταση = υπολογισμόςΚατάστασης(item)
                const isCustom = item.supplyItem.code.startsWith("CUSTOM_")

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {item.supplyItem.name}
                        </h3>
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                          {isCustom ? κείμενα.custom : κείμενα.builtIn}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${κλάσειςΣήματος(
                          κατάσταση
                        )}`}
                      >
                        {κατάσταση === "missing"
                          ? κείμενα.έλλειψη
                          : κατάσταση === "medium"
                          ? κείμενα.μέτρια
                          : κείμενα.πλήρης}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-4">
                        <span>{κείμενα.κατηγορία}</span>
                        <span className="font-medium text-slate-900">
                          {μετάφρασηΚατηγορίας(item.supplyItem.category, γλώσσα)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span>{κείμενα.μονάδα}</span>
                        <span className="font-medium text-slate-900">
                          {μετάφρασηΜονάδας(item.supplyItem.unit, γλώσσα)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span>{κείμενα.κατάσταση}</span>
                        <span className="font-medium text-slate-900">
                          {κατάσταση === "missing"
                            ? κείμενα.έλλειψη
                            : κατάσταση === "medium"
                            ? κείμενα.μέτρια
                            : κείμενα.πλήρης}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {κείμενα.παράθυροΤίτλος}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                  {κείμενα.παράθυροΥπότιτλος}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {κείμενα.κλείσιμο}
              </button>
            </div>

            <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-6">
              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {κείμενα.βασικήΛίστα}
                </h3>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.9fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
                    <div>{κείμενα.όνομα}</div>
                    <div>{κείμενα.κατηγορία}</div>
                    <div>{κείμενα.κατάσταση}</div>
                    <div>{κείμενα.ενέργεια}</div>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {builtInCatalog.map((item) => (
                      <div
                        key={item.code}
                        className="grid gap-3 px-4 py-4 md:grid-cols-[1.4fr_1fr_0.8fr_0.9fr] md:items-center"
                      >
                        <div>
                          <div className="font-medium text-slate-900">{item.name}</div>
                          <div className="mt-1 text-xs text-slate-400">{item.code}</div>
                        </div>

                        <div className="text-sm text-slate-600">
                          {μετάφρασηΚατηγορίας(item.category, γλώσσα)}
                        </div>

                        <div>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              item.isActive
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.isActive ? κείμενα.ενεργό : κείμενα.ανενεργό}
                          </span>
                        </div>

                        <div>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => toggleBuiltIn(item.code, !item.isActive)}
                            className={`inline-flex min-w-[140px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
                              item.isActive
                                ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                : "bg-slate-900 text-white hover:bg-slate-800"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {saving
                              ? κείμενα.ενημέρωση
                              : item.isActive
                              ? κείμενα.απενεργοποίηση
                              : κείμενα.ενεργοποίηση}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  {κείμενα.customΤίτλος}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{κείμενα.customΥπότιτλος}</p>

                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={κείμενα.customPlaceholder}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />

                  <button
                    type="button"
                    disabled={saving}
                    onClick={addCustom}
                    className="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? κείμενα.ενημέρωση : κείμενα.προσθήκηCustom}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}