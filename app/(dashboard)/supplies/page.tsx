"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { getSuppliesHistoryPageTexts } from "@/lib/i18n/translations"
import { resolveSupplyDisplayName } from "@/lib/supply-display"

type Language = "el" | "en"

type PropertySummary = {
  id: string
  code: string
  name: string
}

type SupplyItemSummary = {
  id: string
  code: string
  name: string
  nameEl?: string | null
  nameEn?: string | null
  unit?: string | null
}

type ReplenishmentLog = {
  id: string
  propertyId: string
  propertySupplyId?: string | null
  supplyItemId: string
  taskId?: string | null
  quantityBefore?: number | null
  quantityAdded?: number | null
  quantityAfter?: number | null
  stateBefore?: string | null
  stateAfter?: string | null
  performedBy?: string | null
  notes?: string | null
  loggedAt: string
  property?: PropertySummary | null
  supplyItem?: SupplyItemSummary | null
}

type HistoryPayload = {
  logs: ReplenishmentLog[]
  properties: PropertySummary[]
}

function stateBadgeClass(state?: string | null) {
  if (state === "missing") return "bg-red-50 text-red-700 ring-1 ring-red-200"
  if (state === "medium") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
}

function formatQty(value?: number | null, noValue = "—") {
  if (value === null || value === undefined) return noValue
  return String(value)
}

function formatDate(value: string, locale: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export default function SuppliesHistoryPage() {
  const { language } = useAppLanguage()
  const lang = language as Language
  const t = getSuppliesHistoryPageTexts(lang)

  const [propertyFilter, setPropertyFilter] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const [payload, setPayload] = useState<HistoryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const params = new URLSearchParams()
    if (propertyFilter) params.set("propertyId", propertyFilter)
    if (fromDate) params.set("fromDate", fromDate)
    if (toDate) params.set("toDate", toDate)

    setLoading(true)
    setError("")

    fetch(`/api/supplies/history?${params.toString()}`)
      .then((res) => res.json())
      .then((data: HistoryPayload) => {
        setPayload(data)
        setLoading(false)
      })
      .catch(() => {
        setError(lang === "en" ? "Failed to load data." : "Αποτυχία φόρτωσης δεδομένων.")
        setLoading(false)
      })
  }, [propertyFilter, fromDate, toDate, lang])

  const logs = useMemo(() => payload?.logs ?? [], [payload])
  const properties = useMemo(() => payload?.properties ?? [], [payload])

  function resolvePerformedBy(value?: string | null) {
    if (!value) return t.noValue
    if (value === "admin_manual") return t.adminManual
    return value
  }

  function resolveStateLabel(state?: string | null) {
    if (!state) return t.noValue
    return t.stateLabels[state as keyof typeof t.stateLabels] ?? state
  }

  function resolvePropertyLabel(log: ReplenishmentLog) {
    if (!log.property) return t.noValue
    return `${log.property.code} · ${log.property.name}`
  }

  function resetFilters() {
    setPropertyFilter("")
    setFromDate("")
    setToDate("")
  }

  const hasFilters = Boolean(propertyFilter || fromDate || toDate)

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <h1 className="text-3xl font-bold text-slate-950">{t.pageTitle}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{t.pageSubtitle}</p>
      </section>

      {/* Filters */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Property */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t.filterProperty}
            </label>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-900 min-w-[200px]"
            >
              <option value="">{t.filterAllProperties}</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* From */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t.filterFrom}
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-900"
            />
          </div>

          {/* To */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t.filterTo}
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-900"
            />
          </div>

          {/* Reset */}
          {hasFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.filterReset}
            </button>
          ) : null}
        </div>
      </section>

      {/* Error */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Results */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="py-6 text-center text-sm text-slate-500">{t.loading}</div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-600">{t.noLogs}</p>
            <p className="mt-1 text-xs text-slate-400">{t.noLogsHint}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                {/* Top row: supply name + property + date */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">
                      {resolveSupplyDisplayName(lang, log.supplyItem ?? null)}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {resolvePropertyLabel(log)}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {t.loggedAt}: {formatDate(log.loggedAt, t.locale)}
                      {" · "}
                      {t.performedBy}: {resolvePerformedBy(log.performedBy)}
                    </div>
                  </div>

                  {/* State badges */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {log.stateBefore ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stateBadgeClass(log.stateBefore)}`}
                      >
                        {t.stateBefore}: {resolveStateLabel(log.stateBefore)}
                      </span>
                    ) : null}
                    <span className="text-slate-300">→</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stateBadgeClass(log.stateAfter)}`}
                    >
                      {t.stateAfter}: {resolveStateLabel(log.stateAfter)}
                    </span>
                  </div>
                </div>

                {/* Quantity grid */}
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t.quantityBefore}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {formatQty(log.quantityBefore, t.noValue)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t.quantityAdded}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {formatQty(log.quantityAdded, t.noValue)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t.quantityAfter}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {formatQty(log.quantityAfter, t.noValue)}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {log.notes ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t.notes}:{" "}
                    </span>
                    <span className="text-sm text-slate-700">{log.notes}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
