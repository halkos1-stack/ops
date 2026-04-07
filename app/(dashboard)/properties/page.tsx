"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { isTaskAlertActive } from "@/components/tasks/task-ui"
import {
  getPropertyStatusLabel,
  getPropertyTypeLabel,
} from "@/lib/i18n/labels"
import {
  normalizeBookingStatus,
  normalizeIssueStatus,
  normalizePropertyStatus,
  normalizeTaskStatus,
} from "@/lib/i18n/normalizers"
import { getPropertiesPageTexts } from "@/lib/i18n/translations"

type PartnerOption = {
  id: string
  code: string
  name: string
  email: string
  specialty: string
  status: string
}

type PropertySupplyListItem = {
  id: string
  isActive?: boolean
  fillLevel?: string | null
  currentStock?: number | null
  targetStock?: number | null
  reorderThreshold?: number | null
  targetLevel?: number | null
  minimumThreshold?: number | null
  trackingMode?: string | null
  isCritical?: boolean
  warningThreshold?: number | null
  updatedAt?: string | null
  lastUpdatedAt?: string | null
  supplyItem?: {
    id: string
    code: string
    name: string
    nameEl?: string | null
    nameEn?: string | null
    category?: string | null
    unit?: string | null
    minimumStock?: number | null
    isActive?: boolean
  } | null
}

type PropertyIssueListItem = {
  id: string
  status: string
  severity?: string | null
  issueType?: string | null
  requiresImmediateAction?: boolean
}

type PropertyTaskListItem = {
  id: string
  status: string
  priority?: string | null
  taskType?: string | null
  scheduledDate?: string | null
  alertEnabled?: boolean
  alertAt?: string | null
}

type PropertyListItem = {
  id: string
  code: string
  name: string
  address: string
  city: string
  region: string
  postalCode: string
  country: string
  type: string
  status: string
  bedrooms: number
  bathrooms: number
  maxGuests: number
  notes?: string | null
  defaultPartnerId?: string | null
  readinessStatus?: string | null
  readinessUpdatedAt?: string | null
  readinessReasonsText?: string | null
  nextCheckInAt?: string | null
  openConditionCount?: number | null
  openBlockingConditionCount?: number | null
  openWarningConditionCount?: number | null
  createdAt: string
  updatedAt: string
  defaultPartner?: {
    id: string
    code: string
    name: string
    email: string
    phone?: string | null
    specialty: string
    status: string
  } | null
  bookings?: Array<{
    id: string
    status: string
    checkInDate: string
    checkOutDate: string
    checkInTime?: string | null
  }>
  tasks?: PropertyTaskListItem[]
  issues?: PropertyIssueListItem[]
  propertySupplies?: PropertySupplyListItem[]
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

type MetricFilter =
  | "all"
  | "active"
  | "inactive"
  | "ready"
  | "not_ready"

type CanonicalReadinessStatus = "READY" | "BORDERLINE" | "NOT_READY" | "UNKNOWN"

type PropertyOperationalCounts = {
  todayOpenTasks: number
  activeAlerts: number
  openIssues: number
  openDamages: number
  supplyShortages: number
}

type CounterConfig = {
  key: keyof PropertyOperationalCounts
  label: string
  description: string
}

const PROPERTY_TYPE_OPTIONS = [
  "apartment",
  "villa",
  "studio",
  "house",
  "maisonette",
  "loft",
  "other",
] as const

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
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

function combineCheckInDateTime(
  checkInDate?: string | null,
  checkInTime?: string | null
) {
  const date = normalizeDate(checkInDate)
  if (!date) return null

  if (checkInTime && /^\d{2}:\d{2}$/.test(checkInTime)) {
    const [hours, minutes] = checkInTime.split(":").map(Number)
    const merged = new Date(date)
    merged.setHours(hours, minutes, 0, 0)
    return merged
  }

  const merged = new Date(date)
  merged.setHours(15, 0, 0, 0)
  return merged
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function normalizeLooseText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
}

function toNumericOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function getMetricCardClasses(active: boolean) {
  if (active) {
    return "border-slate-900 bg-slate-900 text-white"
  }

  return "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
}

function getReadinessBadgeClasses(status: CanonicalReadinessStatus) {
  if (status === "READY") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
  }

  if (status === "BORDERLINE") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  }

  if (status === "NOT_READY") {
    return "bg-red-50 text-red-700 ring-1 ring-red-200"
  }

  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
}

function getReadinessLabel(
  language: "el" | "en",
  status: CanonicalReadinessStatus
) {
  if (status === "READY") {
    return language === "en" ? "Ready" : "Ετοιμο"
  }

  if (status === "BORDERLINE") {
    return language === "en" ? "Borderline" : "Οριακο"
  }

  if (status === "NOT_READY") {
    return language === "en" ? "Not ready" : "Μη ετοιμο"
  }

  return language === "en" ? "Unknown" : "Αγνωστο"
}

function isTodayOpenTask(task: PropertyTaskListItem, now: Date) {
  const scheduledDate = normalizeDate(task.scheduledDate)
  if (!scheduledDate) return false

  const taskStatus = normalizeTaskStatus(task.status)
  const isOpenStatus = [
    "PENDING",
    "ASSIGNED",
    "WAITING_ACCEPTANCE",
    "ACCEPTED",
    "IN_PROGRESS",
    "NEW",
  ].includes(taskStatus)

  if (!isOpenStatus) {
    return false
  }

  return isSameCalendarDay(scheduledDate, now)
}

function isOpenIssue(issue: PropertyIssueListItem) {
  const issueStatus = normalizeIssueStatus(issue.status)
  return issueStatus === "OPEN" || issueStatus === "IN_PROGRESS"
}

function isDamageIssue(issue: PropertyIssueListItem) {
  const normalizedType = normalizeLooseText(issue.issueType)
  return normalizedType.includes("damage") || normalizedType.includes("ζημια")
}

function isSupplyShortage(supply: PropertySupplyListItem) {
  if (!supply.isActive) {
    return false
  }

  const fillLevel = normalizeLooseText(supply.fillLevel)
  if (["missing", "empty", "low"].includes(fillLevel)) {
    return true
  }

  const currentStock = toNumericOrNull(supply.currentStock)
  const minimumThreshold = toNumericOrNull(supply.minimumThreshold)
  const reorderThreshold = toNumericOrNull(supply.reorderThreshold)
  const warningThreshold = toNumericOrNull(supply.warningThreshold)
  const supplyMinimumStock = toNumericOrNull(supply.supplyItem?.minimumStock)

  const threshold =
    minimumThreshold ??
    reorderThreshold ??
    warningThreshold ??
    supplyMinimumStock

  if (currentStock !== null && threshold !== null) {
    return currentStock <= threshold
  }

  return false
}

function getOperationalCountsForToday(
  property: PropertyListItem,
  now: Date
): PropertyOperationalCounts {
  return {
    todayOpenTasks: safeArray(property.tasks).filter((task) =>
      isTodayOpenTask(task, now)
    ).length,
    activeAlerts: safeArray(property.tasks).filter((task) =>
      isTaskAlertActive(task)
    ).length,
    openIssues: safeArray(property.issues).filter(
      (issue) => isOpenIssue(issue) && !isDamageIssue(issue)
    ).length,
    openDamages: safeArray(property.issues).filter(
      (issue) => isOpenIssue(issue) && isDamageIssue(issue)
    ).length,
    supplyShortages: safeArray(property.propertySupplies).filter((supply) =>
      isSupplyShortage(supply)
    ).length,
  }
}

function getCanonicalReadinessStatus(
  property: PropertyListItem
): CanonicalReadinessStatus {
  const normalized = String(property.readinessStatus || "")
    .trim()
    .toLowerCase()

  if (normalized === "ready") return "READY"
  if (normalized === "borderline") return "BORDERLINE"
  if (normalized === "not_ready") return "NOT_READY"
  return "UNKNOWN"
}

function getCanonicalReadinessExplanation(
  property: PropertyListItem,
  language: "el" | "en"
) {
  const storedReason = String(property.readinessReasonsText || "").trim()
  if (storedReason) {
    return storedReason
  }

  const status = getCanonicalReadinessStatus(property)

  if (status === "READY") {
    return language === "en"
      ? "The property is ready today because there are no active property conditions."
      : "Το ακινητο ειναι ετοιμο σημερα επειδη δεν υπαρχουν ενεργα property conditions."
  }

  if (status === "NOT_READY") {
    return language === "en"
      ? "The property is not ready today because active property conditions remain open."
      : "Το ακινητο δεν ειναι ετοιμο σημερα επειδη παραμενουν ενεργα property conditions."
  }

  if (status === "BORDERLINE") {
    return language === "en"
      ? "The property remains in a borderline state and should not be treated as fully ready."
      : "Το ακινητο παραμενει σε οριακη κατασταση και δεν πρεπει να θεωρειται πληρως ετοιμο."
  }

  return language === "en"
    ? "Canonical readiness has not been confirmed yet."
    : "Η canonical readiness εικονα δεν εχει επιβεβαιωθει ακομα."
}

function getNextUpcomingBooking(property: PropertyListItem) {
  const now = Date.now()

  return safeArray(property.bookings)
    .map((booking) => {
      const checkInAt = combineCheckInDateTime(
        booking.checkInDate,
        booking.checkInTime || null
      )

      return {
        ...booking,
        checkInAt,
      }
    })
    .filter((booking) => {
      const status = normalizeBookingStatus(booking.status)
      return (
        booking.checkInAt &&
        booking.checkInAt.getTime() >= now &&
        (status === "CONFIRMED" || status === "PENDING")
      )
    })
    .sort((a, b) => {
      return (
        (a.checkInAt?.getTime() || Number.MAX_SAFE_INTEGER) -
        (b.checkInAt?.getTime() || Number.MAX_SAFE_INTEGER)
      )
    })[0]
}

function getCounterToneClasses(count: number) {
  return count > 0
    ? "bg-red-50 text-red-700 ring-red-200"
    : "bg-slate-100 text-slate-700 ring-slate-200"
}

function getCounterConfigs(language: "el" | "en"): CounterConfig[] {
  return [
    {
      key: "todayOpenTasks",
      label: language === "en" ? "Tasks" : "Εργ.",
      description:
        language === "en"
          ? "Open tasks scheduled for today. Execution detail only; canonical readiness still comes from active property conditions."
          : "Ανοιχτες εργασιες με σημερινη ημερομηνια. Δειχνει execution detail και οχι την canonical αποφαση readiness.",
    },
    {
      key: "activeAlerts",
      label: language === "en" ? "Alerts" : "Alert",
      description:
        language === "en"
          ? "Active alerts on open tasks. This is an execution urgency signal from task creation."
          : "Ενεργα alert σε ανοιχτες εργασιες. Δειχνει επειγον execution signal απο τη δημιουργια εργασιας.",
    },
    {
      key: "openIssues",
      label: language === "en" ? "Issues" : "Βλαβ.",
      description:
        language === "en"
          ? "Open non-damage issues visible in operations. Canonical readiness comes from the linked active property conditions."
          : "Ανοιχτες βλαβες που φαινονται επιχειρησιακα. Το canonical readiness προκυπτει απο τα συνδεδεμενα ενεργα property conditions.",
    },
    {
      key: "openDamages",
      label: language === "en" ? "Damages" : "Ζημ.",
      description:
        language === "en"
          ? "Open damage records visible in operations. Canonical readiness comes from the active property conditions."
          : "Ανοιχτες ζημιες στην επιχειρησιακη εικονα. Το canonical readiness προκυπτει απο τα ενεργα property conditions.",
    },
    {
      key: "supplyShortages",
      label: language === "en" ? "Supply" : "Ελλ.",
      description:
        language === "en"
          ? "Visible supply shortages in operations. Canonical readiness stays tied to active supply conditions."
          : "Ορατες ελλειψεις αναλωσιμων στην επιχειρησιακη εικονα. Το canonical readiness μενει δεμενο με τα ενεργα supply conditions.",
    },
  ]
}

function formatLocation(property: PropertyListItem) {
  return [property.address, property.city, property.region].filter(Boolean).join(", ")
}

function matchesMetricFilter(
  property: PropertyListItem,
  metricFilter: MetricFilter
) {
  const propertyStatus = normalizePropertyStatus(property.status)
  const readinessStatus = getCanonicalReadinessStatus(property)

  switch (metricFilter) {
    case "active":
      return propertyStatus === "ACTIVE"
    case "inactive":
      return propertyStatus === "INACTIVE"
    case "ready":
      return readinessStatus === "READY"
    case "not_ready":
      return readinessStatus === "NOT_READY" || readinessStatus === "BORDERLINE"
    case "all":
    default:
      return true
  }
}

function normalizeCountryForCreate(value: string, language: "el" | "en") {
  const normalized = value.trim().toLowerCase()

  if (language === "en") {
    if (normalized === "ελλάδα" || normalized === "ελλαδα") return "Greece"
    return value
  }

  if (normalized === "greece") return "Ελλάδα"
  return value
}

function getDefaultCountry(language: "el" | "en") {
  return language === "en" ? "Greece" : "Ελλάδα"
}

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

export default function PropertiesPage() {
  const { language } = useAppLanguage()
  const texts = getPropertiesPageTexts(language)

  const [properties, setProperties] = useState<PropertyListItem[]>([])
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
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
  const counterConfigs = useMemo(() => getCounterConfigs(language), [language])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [propertiesRes, partnersRes] = await Promise.all([
        fetch("/api/properties", { cache: "no-store" }),
        fetch("/api/partners", { cache: "no-store" }),
      ])

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

  const summary = useMemo(() => {
    const active = properties.filter(
      (item) => normalizePropertyStatus(item.status) === "ACTIVE"
    ).length

    const inactive = properties.filter(
      (item) => normalizePropertyStatus(item.status) === "INACTIVE"
    ).length

    const ready = properties.filter(
      (item) => getCanonicalReadinessStatus(item) === "READY"
    ).length

    const notReady = properties.filter(
      (item) => {
        const status = getCanonicalReadinessStatus(item)
        return status === "NOT_READY" || status === "BORDERLINE"
      }
    ).length

    return {
      total: properties.length,
      active,
      inactive,
      ready,
      notReady,
    }
  }, [properties])

  const filteredProperties = useMemo(() => {
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

      const matchesMetric = matchesMetricFilter(property, metricFilter)

      return matchesSearch && matchesType && matchesCity && matchesMetric
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

    return rows
  }, [
    properties,
    search,
    typeFilter,
    cityFilter,
    sortBy,
    metricFilter,
    texts.locale,
  ])

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

  async function handleCreateProperty(e: React.FormEvent<HTMLFormElement>) {
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

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <button
            type="button"
            onClick={() => setMetricFilter("all")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "all"
            )}`}
          >
            <div className="text-sm text-slate-500">{texts.total}</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {summary.total}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMetricFilter("active")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "active"
            )}`}
          >
            <div className="text-sm text-slate-500">{texts.active}</div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              {summary.active}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMetricFilter("inactive")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "inactive"
            )}`}
          >
            <div className="text-sm text-slate-500">{texts.inactive}</div>
            <div className="mt-2 text-2xl font-bold text-slate-700">
              {summary.inactive}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMetricFilter("ready")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "ready"
            )}`}
          >
            <div className="text-sm text-slate-500">{texts.ready}</div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              {summary.ready}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMetricFilter("not_ready")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "not_ready"
            )}`}
          >
            <div className="text-sm text-slate-500">
              {language === "en" ? "Not ready" : "Μη ετοιμα"}
            </div>
            <div className="mt-2 text-2xl font-bold text-red-700">
              {summary.notReady}
            </div>
          </button>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
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

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {texts.listTitle}
                </h2>
                <p className="text-sm text-slate-500">
                  {filteredProperties.length} / {properties.length}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">{texts.loading}</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : filteredProperties.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">{texts.noResults}</div>
          ) : (
            <>
              <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">{texts.property}</th>
                      <th className="px-4 py-3 font-semibold">{texts.address}</th>
                      <th className="px-4 py-3 font-semibold">{texts.readiness}</th>
                      <th className="px-4 py-3 font-semibold">
                        {language === "en" ? "Next check-in" : "Επομενο check-in"}
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        {language === "en"
                          ? "Operational counters"
                          : "Επιχειρησιακοι μετρητες"}
                      </th>
                      <th className="px-4 py-3 font-semibold">{texts.updated}</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        {texts.actions}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredProperties.map((property) => {
                      const readinessStatus =
                        getCanonicalReadinessStatus(property)
                      const readinessExplanation =
                        getCanonicalReadinessExplanation(property, language)
                      const counts = getOperationalCountsForToday(
                        property,
                        todayReference
                      )
                      const nextBooking = getNextUpcomingBooking(property)
                      const location = formatLocation(property)

                      return (
                        <tr key={property.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-4 align-top">
                            <div className="font-semibold text-slate-900">
                              {property.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {property.code}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {getPropertyTypeLabel(language, property.type)} ·{" "}
                              {getPropertyStatusLabel(language, property.status)}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="text-slate-900">
                              {location || "—"}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="flex max-w-xs flex-col gap-2">
                              <span
                                className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getReadinessBadgeClasses(
                                  readinessStatus
                                )}`}
                              >
                                {getReadinessLabel(language, readinessStatus)}
                              </span>

                              <div className="text-xs leading-5 text-slate-500">
                                {readinessExplanation}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            {nextBooking ? (
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {formatDateTime(
                                    nextBooking.checkInAt?.toISOString(),
                                    texts.locale
                                  )}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {language === "en"
                                    ? "Upcoming confirmed or pending arrival"
                                    : "Επομενη επιβεβαιωμενη ή εκκρεμης αφιξη"}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-slate-500">—</div>
                            )}
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              {counterConfigs.map((config) => {
                                const count = counts[config.key]

                                return (
                                  <span
                                    key={config.key}
                                    title={config.description}
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getCounterToneClasses(
                                      count
                                    )}`}
                                  >
                                    {config.label}: {count}
                                  </span>
                                )
                              })}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="text-sm text-slate-900">
                              {formatDateTime(property.updatedAt, texts.locale)}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top text-right">
                            <Link
                              href={`/properties/${property.id}`}
                              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {texts.view}
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 p-4 sm:p-6 xl:hidden">
                {filteredProperties.map((property) => {
                  const readinessStatus = getCanonicalReadinessStatus(property)
                  const readinessExplanation =
                    getCanonicalReadinessExplanation(property, language)
                  const counts = getOperationalCountsForToday(
                    property,
                    todayReference
                  )
                  const nextBooking = getNextUpcomingBooking(property)
                  const location = formatLocation(property)

                  return (
                    <div
                      key={property.id}
                      className="rounded-2xl border border-slate-200 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-slate-900">
                            {property.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {property.code}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {getPropertyTypeLabel(language, property.type)} ·{" "}
                            {getPropertyStatusLabel(language, property.status)}
                          </div>
                        </div>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getReadinessBadgeClasses(
                            readinessStatus
                          )}`}
                        >
                          {getReadinessLabel(language, readinessStatus)}
                        </span>
                      </div>

                      <div className="mt-4 text-sm text-slate-900">
                        {location || "—"}
                      </div>

                      <div className="mt-3 text-xs leading-5 text-slate-500">
                        {readinessExplanation}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {counterConfigs.map((config) => {
                          const count = counts[config.key]

                          return (
                            <span
                              key={config.key}
                              title={config.description}
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getCounterToneClasses(
                                count
                              )}`}
                            >
                              {config.label}: {count}
                            </span>
                          )
                        })}
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {language === "en" ? "Next check-in" : "Επομενο check-in"}
                          </div>
                          <div className="mt-1 text-sm text-slate-900">
                            {nextBooking
                              ? formatDateTime(
                                  nextBooking.checkInAt?.toISOString(),
                                  texts.locale
                                )
                              : "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {texts.updated}
                          </div>
                          <div className="mt-1 text-sm text-slate-900">
                            {formatDateTime(property.updatedAt, texts.locale)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Link
                          href={`/properties/${property.id}`}
                          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {texts.view}
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

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
