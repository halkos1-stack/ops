"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import {
  getPropertyStatusLabel,
  getPropertyTypeLabel,
} from "@/lib/i18n/labels"
import { getPropertiesPageTexts } from "@/lib/i18n/translations"
import {
  type PropertyListItem,
  type MetricFilter,
  type PropertyTodaySection,
  type CounterConfig,
  type PropertyCalendarDaySnapshot,
  localizeText,
  formatDisplayDateTime,
  formatCountText,
  getCounterConfigs,
  getPropertyCardClasses,
  getTodayOccupancyBadgeClasses,
  getTodayOccupancyLabel,
  getTodayTaskBadgeClasses,
  getTodayTaskLabel,
  getTodaySupplyBadgeClasses,
  getTodaySupplyLabel,
  getTodayIssuesBadgeClasses,
  getTodayIssuesLabel,
  buildPropertyTodaySection,
  matchesMetricFilter,
  matchesTodayMetricFilter,
  normalizeCountryForCreate,
  getDefaultCountry,
} from "@/lib/properties/property-list-helpers"

// ─── Τοπικοί τύποι (μόνο page-specific) ──────────────────────────────────────

type PartnerOption = {
  id: string
  code: string
  name: string
  email: string
  specialty: string
  status: string
}

type CreatePropertyFormState = {
  name: string
  address: string
  city: string
  region: string
  postalCode: string
  country: string
  type: string
  status: string
  bedrooms: string
  bathrooms: string
  maxGuests: string
  defaultPartnerId: string
  notes: string
}

type MetricCard = {
  key: Exclude<MetricFilter, "all">
  label: string
  helper: string
  value: number
  valueClassName: string
}

// ─── Τοπικές σταθερές ─────────────────────────────────────────────────────────

const PROPERTY_TYPE_OPTIONS = [
  "apartment",
  "villa",
  "studio",
  "house",
  "maisonette",
  "loft",
  "other",
] as const

const initialCreateForm: CreatePropertyFormState = {
  name: "",
  address: "",
  city: "",
  region: "",
  postalCode: "",
  country: "Ελλάδα",
  type: "apartment",
  status: "active",
  bedrooms: "0",
  bathrooms: "0",
  maxGuests: "0",
  defaultPartnerId: "",
  notes: "",
}

// ─── Τοπικά React components ──────────────────────────────────────────────────

/**
 * Inline CSS hover tooltip. Χρησιμοποιείται σε status chips / counter badges.
 */
function ListTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {label}
        <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-slate-200" />
      </span>
    </span>
  )
}

function TodaySnapshotPanel({
  title,
  badge,
  children,
}: {
  title: string
  badge: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {badge}
      </div>
      <div className="mt-3 space-y-1.5 text-sm text-slate-700">{children}</div>
    </div>
  )
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function BedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7v13M21 7v13" />
      <path d="M3 13h18" />
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2" />
      <rect x="7" y="7" width="4" height="3" rx="0.5" />
    </svg>
  )
}

function BroomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

function SupplyBarsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="20" x2="4" y2="14" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="20" y1="20" x2="20" y2="4" />
    </svg>
  )
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
    </svg>
  )
}

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ")
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const { language } = useAppLanguage()
  const texts = getPropertiesPageTexts(language)

  const [properties, setProperties] = useState<PropertyListItem[]>([])
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [propertyIdFilter, setPropertyIdFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [cityFilter, setCityFilter] = useState("all")
  const [sortBy, setSortBy] = useState("updatedAt_desc")
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("all")

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] =
    useState<CreatePropertyFormState>(initialCreateForm)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const todayReference = useMemo(() => new Date(), [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [propertiesRes, partnersRes] = await Promise.all([
        fetch("/api/properties", { cache: "no-store" }),
        fetch("/api/partners", { cache: "no-store" }),
      ])

      if (!propertiesRes.ok) {
        const errJson = await propertiesRes.json().catch(() => null)
        throw new Error(errJson?.error || `HTTP ${propertiesRes.status}`)
      }

      const propertiesJson = await propertiesRes.json().catch(() => [])
      const partnersJson = await partnersRes.json().catch(() => [])

      const propertyData = Array.isArray(propertiesJson)
        ? propertiesJson
        : Array.isArray(propertiesJson?.data)
          ? propertiesJson.data
          : Array.isArray(propertiesJson?.properties)
            ? propertiesJson.properties
            : []

      const partnerData = Array.isArray(partnersJson)
        ? partnersJson
        : Array.isArray(partnersJson?.data)
          ? partnersJson.data
          : Array.isArray(partnersJson?.partners)
            ? partnersJson.partners
            : []

      setProperties(propertyData)
      setPartners(partnerData)
    } catch (err) {
      console.error("Load properties page error:", err)
      setError(texts.loadError)
    } finally {
      setLoading(false)
    }
  }, [texts.loadError])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const typeOptions = useMemo(() => {
    const values = Array.from(
      new Set(properties.map((item) => item.type).filter(Boolean))
    )
    return values.sort((a, b) => a.localeCompare(b, texts.locale))
  }, [properties, texts.locale])

  const cityOptions = useMemo(() => {
    const values = Array.from(
      new Set(properties.map((item) => item.city).filter(Boolean))
    )
    return values.sort((a, b) => a.localeCompare(b, texts.locale))
  }, [properties, texts.locale])

  const todaySections = useMemo(() => {
    const term = search.trim().toLowerCase()

    const rows = [...properties].filter((property) => {
      const matchesSearch =
        term === "" ||
        property.name?.toLowerCase().includes(term) ||
        property.code?.toLowerCase().includes(term) ||
        property.address?.toLowerCase().includes(term) ||
        property.city?.toLowerCase().includes(term) ||
        property.region?.toLowerCase().includes(term) ||
        property.country?.toLowerCase().includes(term)

      const matchesType =
        typeFilter === "all" ||
        String(property.type || "").toLowerCase() === typeFilter.toLowerCase()

      const matchesCity =
        cityFilter === "all" ||
        String(property.city || "").toLowerCase() === cityFilter.toLowerCase()

      return matchesSearch && matchesType && matchesCity
    })

    rows.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return String(a.name || "").localeCompare(String(b.name || ""), texts.locale)
        case "name_desc":
          return String(b.name || "").localeCompare(String(a.name || ""), texts.locale)
        case "city_asc":
          return String(a.city || "").localeCompare(String(b.city || ""), texts.locale)
        case "city_desc":
          return String(b.city || "").localeCompare(String(a.city || ""), texts.locale)
        case "updatedAt_asc":
          return +new Date(a.updatedAt) - +new Date(b.updatedAt)
        case "updatedAt_desc":
        default:
          return +new Date(b.updatedAt) - +new Date(a.updatedAt)
      }
    })

    return rows.map((property) => buildPropertyTodaySection(property, todayReference))
  }, [
    cityFilter,
    properties,
    search,
    sortBy,
    texts.locale,
    todayReference,
    typeFilter,
  ])

  const todaySummary = useMemo(() => {
    return todaySections.reduce(
      (acc, section) => {
        acc.bookings += section.counts.bookings
        acc.tasks += section.counts.tasks
        acc.alerts += section.counts.alerts
        if (section.counts.shortages > 0) acc.shortages += 1
        if (section.counts.issues > 0) acc.issues += 1
        return acc
      },
      {
        bookings: 0,
        tasks: 0,
        alerts: 0,
        shortages: 0,
        issues: 0,
      }
    )
  }, [todaySections])

  const metricCards = useMemo<MetricCard[]>(() => {
    return [
      {
        key: "bookings",
        label: localizeText(language, "Κρατήσεις", "Bookings"),
        helper: localizeText(
          language,
          "Κρατήσεις που αγγίζουν το σήμερα",
          "Bookings touching today"
        ),
        value: todaySummary.bookings,
        valueClassName: "text-blue-700",
      },
      {
        key: "tasks",
        label: localizeText(language, "Εργασίες", "Tasks"),
        helper: localizeText(
          language,
          "Προγραμματισμένες εργασίες σήμερα",
          "Tasks scheduled today"
        ),
        value: todaySummary.tasks,
        valueClassName: "text-slate-900",
      },
      {
        key: "alerts",
        label: localizeText(language, "Ενεργά alert", "Active alerts"),
        helper: localizeText(
          language,
          "Εργασίες με ενεργό alert σήμερα",
          "Tasks with active alerts today"
        ),
        value: todaySummary.alerts,
        valueClassName: "text-amber-700",
      },
      {
        key: "shortages",
        label: localizeText(language, "Ακίνητα με ελλείψεις", "Properties with shortages"),
        helper: localizeText(
          language,
          "Ακίνητα με ελλείψεις αναλωσίμων",
          "Properties with supply shortages"
        ),
        value: todaySummary.shortages,
        valueClassName: "text-red-700",
      },
      {
        key: "issues",
        label: localizeText(language, "Ακίνητα με βλάβες", "Properties with issues"),
        helper: localizeText(
          language,
          "Ακίνητα με ενεργά θέματα ή ζημιές",
          "Properties with open issues or damages"
        ),
        value: todaySummary.issues,
        valueClassName: "text-red-700",
      },
    ]
  }, [language, todaySummary])

  const filteredSections = useMemo(() => {
    return metricFilter === "all"
      ? todaySections
      : todaySections.filter((section) =>
          matchesTodayMetricFilter(section, metricFilter)
        )
  }, [metricFilter, todaySections])

  const filteredProperties = useMemo(
    () =>
      filteredSections
        .map((section) => section.property)
        .filter(() => matchesMetricFilter("all")),
    [filteredSections]
  )

  const counterConfigs = useMemo(() => getCounterConfigs(language), [language])

  // ─── Μετρητές summary (readiness-based) ────────────────────────────────────
  // Το readiness διαβάζεται από property.readinessStatus (canonical field).
  // Τα BORDERLINE και NOT_READY είναι ξεχωριστές κατηγορίες.
  function openCreateDrawer() {
    setCreateError(null)
    setCreateForm({
      ...initialCreateForm,
      country: getDefaultCountry(language),
      type: "apartment",
      status: "active",
    })
    setIsCreateOpen(true)
  }

  function closeCreateDrawer() {
    if (createSubmitting) return
    setIsCreateOpen(false)
    setCreateError(null)
  }

  function updateCreateField(
    field: keyof CreatePropertyFormState,
    value: string
  ) {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleCreateProperty(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreateSubmitting(true)
    setCreateError(null)

    try {
      const payload = {
        name: createForm.name.trim(),
        address: createForm.address.trim(),
        city: createForm.city.trim(),
        region: createForm.region.trim(),
        postalCode: createForm.postalCode.trim(),
        country: normalizeCountryForCreate(createForm.country.trim(), language),
        type: createForm.type.trim(),
        status: createForm.status,
        bedrooms: Number(createForm.bedrooms || 0),
        bathrooms: Number(createForm.bathrooms || 0),
        maxGuests: Number(createForm.maxGuests || 0),
        defaultPartnerId: createForm.defaultPartnerId || null,
        notes: createForm.notes.trim() || null,
      }

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || texts.createError)
      }

      await loadData()
      setIsCreateOpen(false)
      setCreateForm({
        ...initialCreateForm,
        country: getDefaultCountry(language),
      })
    } catch (err) {
      console.error("Create property error:", err)
      setCreateError(err instanceof Error ? err.message : texts.createError)
    } finally {
      setCreateSubmitting(false)
    }
  }

  function resetFilters() {
    setSearch("")
    setPropertyIdFilter("")
    setTypeFilter("all")
    setCityFilter("all")
    setSortBy("updatedAt_desc")
    setMetricFilter("all")
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {texts.title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              {texts.subtitle}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={openCreateDrawer}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              {texts.newProperty}
            </button>
          </div>
        </div>

        {/* ─── Metric pills ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {/* Όλα */}
          <button
            type="button"
            onClick={() => setMetricFilter("all")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition hover:scale-[1.02]",
              metricFilter === "all"
                ? "border-slate-300 bg-slate-50 text-slate-700 ring-2 ring-slate-300/40 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            <span className="text-[11px] font-bold leading-none">✓</span>
            <span>{localizeText(language, "Όλα", "All")}</span>
            <span className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
              metricFilter === "all" ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-500"
            )}>{todaySections.length}</span>
          </button>

          {/* Κρατήσεις */}
          <button
            type="button"
            onClick={() => setMetricFilter(metricFilter === "bookings" ? "all" : "bookings")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition hover:scale-[1.02]",
              metricFilter === "bookings"
                ? "border-sky-200 bg-sky-50 text-sky-700 ring-2 ring-sky-200/50 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            <BedIcon className={cn("h-3.5 w-3.5", metricFilter !== "bookings" && "opacity-50")} />
            <span>{localizeText(language, "Κρατήσεις", "Bookings")}</span>
            <span className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
              metricFilter === "bookings" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500"
            )}>{todaySummary.bookings}</span>
          </button>

          {/* Εργασίες */}
          <button
            type="button"
            onClick={() => setMetricFilter(metricFilter === "tasks" ? "all" : "tasks")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition hover:scale-[1.02]",
              metricFilter === "tasks"
                ? "border-amber-200 bg-amber-50 text-amber-700 ring-2 ring-amber-200/50 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            <BroomIcon className={cn("h-3.5 w-3.5", metricFilter !== "tasks" && "opacity-50")} />
            <span>{localizeText(language, "Εργασίες", "Tasks")}</span>
            <span className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
              metricFilter === "tasks" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
            )}>{todaySummary.tasks}</span>
          </button>

          {/* Alerts */}
          <button
            type="button"
            onClick={() => setMetricFilter(metricFilter === "alerts" ? "all" : "alerts")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition hover:scale-[1.02]",
              metricFilter === "alerts"
                ? "border-red-200 bg-red-50 text-red-700 ring-2 ring-red-200/50 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            <span className={cn("text-sm leading-none", metricFilter !== "alerts" && "opacity-50")}>⚠</span>
            <span>{localizeText(language, "Ενεργά alert", "Active alerts")}</span>
            <span className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
              metricFilter === "alerts" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
            )}>{todaySummary.alerts}</span>
          </button>

          {/* Ελλείψεις */}
          <button
            type="button"
            onClick={() => setMetricFilter(metricFilter === "shortages" ? "all" : "shortages")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition hover:scale-[1.02]",
              metricFilter === "shortages"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200/50 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            <SupplyBarsIcon className={cn("h-3.5 w-3.5", metricFilter !== "shortages" && "opacity-50")} />
            <span>{localizeText(language, "Με ελλείψεις", "Shortages")}</span>
            <span className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
              metricFilter === "shortages" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            )}>{todaySummary.shortages}</span>
          </button>

          {/* Βλάβες */}
          <button
            type="button"
            onClick={() => setMetricFilter(metricFilter === "issues" ? "all" : "issues")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition hover:scale-[1.02]",
              metricFilter === "issues"
                ? "border-red-200 bg-red-50 text-red-700 ring-2 ring-red-200/50 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            <WrenchIcon className={cn("h-3.5 w-3.5", metricFilter !== "issues" && "opacity-50")} />
            <span>{localizeText(language, "Βλάβες / Ζημιές", "Issues / Damages")}</span>
            <span className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
              metricFilter === "issues" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
            )}>{todaySummary.issues}</span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {texts.search}
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={texts.searchPlaceholder}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {localizeText(language, "Ακίνητο", "Property")}
              </label>
              <select
                value={propertyIdFilter}
                onChange={(e) => setPropertyIdFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="">{localizeText(language, "Όλα τα ακίνητα", "All properties")}</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {texts.type}
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="all">{texts.allTypes}</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {getPropertyTypeLabel(language, type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {texts.city}
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="all">{texts.allCities}</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {texts.sort}
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="updatedAt_desc">{texts.sortUpdatedDesc}</option>
                <option value="updatedAt_asc">{texts.sortUpdatedAsc}</option>
                <option value="name_asc">{texts.sortNameAsc}</option>
                <option value="name_desc">{texts.sortNameDesc}</option>
                <option value="city_asc">{texts.sortCityAsc}</option>
                <option value="city_desc">{texts.sortCityDesc}</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">{texts.pageHint}</div>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.clearFilters}
            </button>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {filteredSections.filter(s => !propertyIdFilter || s.property.id === propertyIdFilter).length}
              {" / "}
              {todaySections.length}{" "}
              {localizeText(language, "ακίνητα", "properties")}
              {metricFilter !== "all" ? (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {metricCards.find((card) => card.key === metricFilter)?.label}
                </span>
              ) : null}
            </p>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">{texts.loading}</div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600">{error}</div>
          ) : filteredSections.filter(s => !propertyIdFilter || s.property.id === propertyIdFilter).length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">{texts.noResults}</div>
          ) : (
            <div className="space-y-3">
              {filteredSections
                .filter(s => !propertyIdFilter || s.property.id === propertyIdFilter)
                .map((section) => {
                  const { property, snapshot, nextBooking, location } = section
                  const shortageCount = section.counts.shortages
                  const issueCount = section.counts.issues

                  return (
                    <section
                      key={property.id}
                      className={cn("rounded-2xl border p-4 shadow-sm transition hover:shadow-md", getPropertyCardClasses(snapshot, shortageCount, issueCount))}
                    >
                      {/* ── Header: όνομα + διεύθυνση + link ────────────────── */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/properties/${property.id}`}
                              className="text-base font-semibold text-slate-900 hover:underline"
                            >
                              {property.name}
                            </Link>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                              {property.code}
                            </span>
                            <span className="text-xs text-slate-400">
                              {getPropertyTypeLabel(language, property.type)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-slate-500">{location || "—"}</p>
                        </div>
                        <div className="flex shrink-0 items-center">
                          <Link
                            href={`/properties/${property.id}`}
                            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white"
                          >
                            {texts.view}
                          </Link>
                        </div>
                      </div>

                      {/* ── 4 στήλες κατάστασης ──────────────────────────────── */}
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {/* Κρατήσεις */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                              <BedIcon className="h-4 w-4" />
                              {localizeText(language, "Κρατήσεις", "Bookings")}
                            </div>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getTodayOccupancyBadgeClasses(snapshot?.occupancy.state ?? "vacant")}`}>
                              {getTodayOccupancyLabel(language, snapshot?.occupancy.state ?? "vacant")}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-medium text-slate-900">
                            {section.counts.bookings > 0
                              ? formatCountText(section.counts.bookings, language, "κράτηση", "κρατήσεις", "booking", "bookings")
                              : localizeText(language, "Καμία σήμερα", "None today")}
                          </div>
                          {snapshot?.occupancy.primaryGuestName ? (
                            <div className="mt-0.5 truncate text-xs text-slate-500">{snapshot.occupancy.primaryGuestName}</div>
                          ) : null}
                        </div>

                        {/* Εργασίες */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                              <BroomIcon className="h-4 w-4" />
                              {localizeText(language, "Εργασίες", "Tasks")}
                            </div>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getTodayTaskBadgeClasses(snapshot?.tasks.state ?? "none")}`}>
                              {getTodayTaskLabel(language, snapshot?.tasks.state ?? "none")}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-medium text-slate-900">
                            {section.counts.tasks > 0
                              ? formatCountText(section.counts.tasks, language, "εργασία", "εργασίες", "task", "tasks")
                              : localizeText(language, "Καμία σήμερα", "None today")}
                          </div>
                          {(snapshot?.tasks.activeAlertCount ?? 0) > 0 ? (
                            <div className="mt-0.5 text-xs text-red-600">
                              ⚠ {snapshot?.tasks.activeAlertCount} {localizeText(language, "alert", "alerts")}
                            </div>
                          ) : null}
                        </div>

                        {/* Αναλώσιμα */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                              <SupplyBarsIcon className="h-4 w-4" />
                              {localizeText(language, "Αναλώσιμα", "Supplies")}
                            </div>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getTodaySupplyBadgeClasses(shortageCount)}`}>
                              {getTodaySupplyLabel(language, shortageCount)}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-medium text-slate-900">
                            {shortageCount > 0
                              ? localizeText(language, `${shortageCount} ελλείψεις`, `${shortageCount} shortages`)
                              : localizeText(language, "Πλήρη", "Covered")}
                          </div>
                          {(snapshot?.supplies.criticalShortageCount ?? 0) > 0 ? (
                            <div className="mt-0.5 text-xs text-red-600">
                              {snapshot?.supplies.criticalShortageCount} {localizeText(language, "κρίσιμες", "critical")}
                            </div>
                          ) : null}
                        </div>

                        {/* Βλάβες / Ζημιές */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                              <WrenchIcon className="h-4 w-4" />
                              {localizeText(language, "Βλάβες / Ζημιές", "Issues")}
                            </div>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getTodayIssuesBadgeClasses(snapshot?.issues.state ?? "clear")}`}>
                              {getTodayIssuesLabel(language, snapshot?.issues.state ?? "clear")}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-medium text-slate-900">
                            {issueCount > 0
                              ? formatCountText(issueCount, language, "θέμα", "θέματα", "item", "items")
                              : localizeText(language, "Καθαρό", "Clear")}
                          </div>
                          {(snapshot?.issues.blockingCount ?? 0) > 0 ? (
                            <div className="mt-0.5 text-xs text-red-600">
                              {snapshot?.issues.blockingCount} {localizeText(language, "blocking", "blocking")}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* ── Footer: επόμενο check-in ─────────────────────────── */}
                      {nextBooking ? (
                        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">
                            {localizeText(language, "Επόμενο check-in:", "Next check-in:")}
                          </span>
                          <span>{formatDisplayDateTime(nextBooking.checkInAt, texts.locale)}</span>
                          {nextBooking.guestName ? <span>· {nextBooking.guestName}</span> : null}
                        </div>
                      ) : null}
                    </section>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Create drawer ──────────────────────────────────────────────────── */}
      {isCreateOpen ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-950/35"
            onClick={closeCreateDrawer}
          />

          <div className="absolute inset-y-0 right-0 flex w-full max-w-2xl">
            <div className="ml-auto h-full w-full border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex h-full flex-col">
                <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {texts.createTitle}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {texts.createSubtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeCreateDrawer}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {texts.close}
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={handleCreateProperty}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6">
                    {createError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {createError}
                      </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formName}
                        </label>
                        <input
                          value={createForm.name}
                          onChange={(e) => updateCreateField("name", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderName}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formType}
                        </label>
                        <select
                          value={createForm.type}
                          onChange={(e) => updateCreateField("type", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        >
                          {PROPERTY_TYPE_OPTIONS.map((type) => (
                            <option key={type} value={type}>
                              {getPropertyTypeLabel(language, type)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formAddress}
                        </label>
                        <input
                          value={createForm.address}
                          onChange={(e) =>
                            updateCreateField("address", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderAddress}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formCity}
                        </label>
                        <input
                          value={createForm.city}
                          onChange={(e) => updateCreateField("city", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderCity}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formRegion}
                        </label>
                        <input
                          value={createForm.region}
                          onChange={(e) => updateCreateField("region", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderRegion}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formPostalCode}
                        </label>
                        <input
                          value={createForm.postalCode}
                          onChange={(e) =>
                            updateCreateField("postalCode", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderPostalCode}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formCountry}
                        </label>
                        <input
                          value={createForm.country}
                          onChange={(e) => updateCreateField("country", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formStatus}
                        </label>
                        <select
                          value={createForm.status}
                          onChange={(e) => updateCreateField("status", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        >
                          <option value="active">{texts.statusActive}</option>
                          <option value="inactive">{texts.statusInactive}</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formDefaultPartner}
                        </label>
                        <select
                          value={createForm.defaultPartnerId}
                          onChange={(e) =>
                            updateCreateField("defaultPartnerId", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        >
                          <option value="">{texts.noPartner}</option>
                          {partners.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                              {partner.name} ({partner.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formBedrooms}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={createForm.bedrooms}
                          onChange={(e) =>
                            updateCreateField("bedrooms", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formBathrooms}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={createForm.bathrooms}
                          onChange={(e) =>
                            updateCreateField("bathrooms", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formMaxGuests}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={createForm.maxGuests}
                          onChange={(e) =>
                            updateCreateField("maxGuests", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formNotes}
                        </label>
                        <textarea
                          value={createForm.notes}
                          onChange={(e) => updateCreateField("notes", e.target.value)}
                          rows={5}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderNotes}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 px-4 py-4 sm:px-6">
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeCreateDrawer}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        disabled={createSubmitting}
                      >
                        {texts.cancel}
                      </button>

                      <button
                        type="submit"
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={createSubmitting}
                      >
                        {createSubmitting ? texts.saving : texts.saveProperty}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
