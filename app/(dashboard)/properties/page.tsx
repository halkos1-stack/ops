"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type PartnerOption = {
  id: string
  code: string
  name: string
  email: string
  specialty: string
  status: string
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
  }>
  tasks?: Array<{
    id: string
    status: string
    priority?: string
    taskType?: string
    scheduledDate?: string
  }>
  issues?: Array<{
    id: string
    status: string
    severity?: string
  }>
  checklistTemplates?: Array<{
    id: string
    title: string
    templateType: string
    isPrimary: boolean
    isActive: boolean
  }>
}

type CreatePropertyFormState = {
  code: string
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

const initialCreateForm: CreatePropertyFormState = {
  code: "",
  name: "",
  address: "",
  city: "",
  region: "",
  postalCode: "",
  country: "Ελλάδα",
  type: "Διαμέρισμα",
  status: "active",
  bedrooms: "0",
  bathrooms: "0",
  maxGuests: "0",
  defaultPartnerId: "",
  notes: "",
}

function formatDate(value?: string | null) {
  if (!value) return "—"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value?: string | null) {
  if (!value) return "—"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function statusLabel(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "Ενεργό"
    case "inactive":
      return "Ανενεργό"
    case "maintenance":
      return "Σε συντήρηση"
    case "archived":
      return "Αρχειοθετημένο"
    default:
      return status || "—"
  }
}

function typeLabel(type?: string | null) {
  if (!type) return "—"
  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getStatusBadgeClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "active":
    case "completed":
    case "confirmed":
    case "resolved":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "pending":
    case "assigned":
    case "in_progress":
    case "maintenance":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "inactive":
    case "cancelled":
    case "archived":
    case "closed":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
    case "critical":
    case "high":
    case "open":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyListItem[]>([])
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [cityFilter, setCityFilter] = useState("all")
  const [partnerFilter, setPartnerFilter] = useState("all")
  const [sortBy, setSortBy] = useState("updatedAt_desc")

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] =
    useState<CreatePropertyFormState>(initialCreateForm)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function loadData() {
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
      setError("Αποτυχία φόρτωσης δεδομένων ακινήτων.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const typeOptions = useMemo(() => {
    const values = Array.from(
      new Set(properties.map((item) => item.type).filter(Boolean))
    )
    return values.sort((a, b) => a.localeCompare(b, "el"))
  }, [properties])

  const cityOptions = useMemo(() => {
    const values = Array.from(
      new Set(properties.map((item) => item.city).filter(Boolean))
    )
    return values.sort((a, b) => a.localeCompare(b, "el"))
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

      const matchesStatus =
        statusFilter === "all" ||
        (property.status || "").toLowerCase() === statusFilter.toLowerCase()

      const matchesType =
        typeFilter === "all" ||
        (property.type || "").toLowerCase() === typeFilter.toLowerCase()

      const matchesCity =
        cityFilter === "all" ||
        (property.city || "").toLowerCase() === cityFilter.toLowerCase()

      const matchesPartner =
        partnerFilter === "all" ||
        (partnerFilter === "none"
          ? !property.defaultPartnerId
          : property.defaultPartnerId === partnerFilter)

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesCity &&
        matchesPartner
      )
    })

    rows.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "", "el")
        case "name_desc":
          return (b.name || "").localeCompare(a.name || "", "el")
        case "city_asc":
          return (a.city || "").localeCompare(b.city || "", "el")
        case "city_desc":
          return (b.city || "").localeCompare(a.city || "", "el")
        case "createdAt_desc":
          return +new Date(b.createdAt) - +new Date(a.createdAt)
        case "createdAt_asc":
          return +new Date(a.createdAt) - +new Date(b.createdAt)
        case "updatedAt_asc":
          return +new Date(a.updatedAt) - +new Date(b.updatedAt)
        case "updatedAt_desc":
        default:
          return +new Date(b.updatedAt) - +new Date(a.updatedAt)
      }
    })

    return rows
  }, [properties, search, statusFilter, typeFilter, cityFilter, partnerFilter, sortBy])

  const summary = useMemo(() => {
    const active = properties.filter((item) => item.status === "active").length
    const inactive = properties.filter((item) => item.status === "inactive").length

    const openIssues = properties.reduce((count, property) => {
      return (
        count +
        safeArray(property.issues).filter((issue) => issue.status === "open").length
      )
    }, 0)

    const pendingTasks = properties.reduce((count, property) => {
      return (
        count +
        safeArray(property.tasks).filter((task) =>
          ["pending", "assigned", "accepted", "in_progress"].includes(task.status)
        ).length
      )
    }, 0)

    return {
      total: properties.length,
      active,
      inactive,
      openIssues,
      pendingTasks,
    }
  }, [properties])

  function openCreateDrawer() {
    setCreateError(null)
    setCreateForm(initialCreateForm)
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
        code: createForm.code.trim(),
        name: createForm.name.trim(),
        address: createForm.address.trim(),
        city: createForm.city.trim(),
        region: createForm.region.trim(),
        postalCode: createForm.postalCode.trim(),
        country: createForm.country.trim(),
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
        throw new Error(json?.error || "Αποτυχία δημιουργίας ακινήτου.")
      }

      await loadData()
      setIsCreateOpen(false)
      setCreateForm(initialCreateForm)
    } catch (err) {
      console.error("Create property error:", err)
      setCreateError(
        err instanceof Error ? err.message : "Αποτυχία δημιουργίας ακινήτου."
      )
    } finally {
      setCreateSubmitting(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Ακίνητα
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Πλήρης εικόνα χαρτοφυλακίου, κατάστασης, συνεργατών, εργασιών και
              ανοιχτών θεμάτων.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/calendar"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Ημερολόγιο
            </Link>

            <button
              type="button"
              onClick={openCreateDrawer}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Νέο ακίνητο
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Σύνολο ακινήτων</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {summary.total}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Ενεργά</div>
            <div className="mt-2 text-3xl font-bold text-emerald-700">
              {summary.active}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Ανενεργά</div>
            <div className="mt-2 text-3xl font-bold text-slate-700">
              {summary.inactive}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Εκκρεμείς εργασίες</div>
            <div className="mt-2 text-3xl font-bold text-amber-700">
              {summary.pendingTasks}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Ανοιχτά θέματα</div>
            <div className="mt-2 text-3xl font-bold text-red-700">
              {summary.openIssues}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Αναζήτηση
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Όνομα, κωδικός, διεύθυνση, πόλη..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Κατάσταση
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="all">Όλες</option>
                <option value="active">Ενεργό</option>
                <option value="inactive">Ανενεργό</option>
                <option value="maintenance">Σε συντήρηση</option>
                <option value="archived">Αρχειοθετημένο</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Τύπος
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="all">Όλοι</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {typeLabel(type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Πόλη
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="all">Όλες</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Προεπιλεγμένος συνεργάτης
              </label>
              <select
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="all">Όλοι</option>
                <option value="none">Χωρίς συνεργάτη</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name} ({partner.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ταξινόμηση
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="updatedAt_desc">Πιο πρόσφατη ενημέρωση</option>
                <option value="updatedAt_asc">Παλαιότερη ενημέρωση</option>
                <option value="createdAt_desc">Νεότερη δημιουργία</option>
                <option value="createdAt_asc">Παλαιότερη δημιουργία</option>
                <option value="name_asc">Όνομα Α-Ω</option>
                <option value="name_desc">Όνομα Ω-Α</option>
                <option value="city_asc">Πόλη Α-Ω</option>
                <option value="city_desc">Πόλη Ω-Α</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setStatusFilter("all")
                  setTypeFilter("all")
                  setCityFilter("all")
                  setPartnerFilter("all")
                  setSortBy("updatedAt_desc")
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Καθαρισμός φίλτρων
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Λίστα ακινήτων
                </h2>
                <p className="text-sm text-slate-500">
                  {filteredProperties.length} από {properties.length} ακίνητα
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">Φόρτωση ακινήτων...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : filteredProperties.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Δεν βρέθηκαν ακίνητα με τα τρέχοντα φίλτρα.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Ακίνητο</th>
                    <th className="px-4 py-3 font-semibold">Τοποθεσία</th>
                    <th className="px-4 py-3 font-semibold">Χαρακτηριστικά</th>
                    <th className="px-4 py-3 font-semibold">Κατάσταση</th>
                    <th className="px-4 py-3 font-semibold">Συνεργάτης</th>
                    <th className="px-4 py-3 font-semibold">Λειτουργία</th>
                    <th className="px-4 py-3 font-semibold">Ενημέρωση</th>
                    <th className="px-4 py-3 font-semibold text-right">Ενέργειες</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProperties.map((property) => {
                    const bookings = safeArray(property.bookings)
                    const tasks = safeArray(property.tasks)
                    const issues = safeArray(property.issues)
                    const templates = safeArray(property.checklistTemplates)

                    const openIssues = issues.filter(
                      (issue) => issue.status === "open"
                    ).length

                    const activeTasks = tasks.filter((task) =>
                      ["pending", "assigned", "accepted", "in_progress"].includes(
                        task.status
                      )
                    ).length

                    const primaryTemplate = templates.find(
                      (template) => template.isPrimary
                    )

                    return (
                      <tr key={property.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4 align-top">
                          <div className="font-semibold text-slate-900">
                            {property.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Κωδικός: {property.code}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Τύπος: {typeLabel(property.type)}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="text-slate-900">{property.address}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {property.city}, {property.region}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {property.postalCode} · {property.country}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="text-slate-900">
                            {property.bedrooms} υπν. · {property.bathrooms} μπάν. ·{" "}
                            {property.maxGuests} επισκ.
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Δημιουργία: {formatDate(property.createdAt)}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(
                              property.status
                            )}`}
                          >
                            {statusLabel(property.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top">
                          {property.defaultPartner ? (
                            <>
                              <div className="font-medium text-slate-900">
                                {property.defaultPartner.name}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {property.defaultPartner.specialty}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {property.defaultPartner.email}
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400">Δεν έχει οριστεί</span>
                          )}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1 text-xs text-slate-600">
                            <div>Κρατήσεις: {bookings.length}</div>
                            <div>Ενεργές εργασίες: {activeTasks}</div>
                            <div>Ανοιχτά θέματα: {openIssues}</div>
                            <div>
                              Κύρια checklist:{" "}
                              {primaryTemplate ? primaryTemplate.title : "—"}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="text-xs text-slate-500">
                            Τελευταία ενημέρωση
                          </div>
                          <div className="mt-1 text-sm text-slate-900">
                            {formatDateTime(property.updatedAt)}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/properties/${property.id}`}
                              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Προβολή
                            </Link>

                            <Link
                              href={`/property-checklists/${property.id}`}
                              className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                              Checklists
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Νέο ακίνητο
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Δημιουργία νέου ακινήτου με πλήρη βασικά στοιχεία.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeCreateDrawer}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Κλείσιμο
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={handleCreateProperty}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                    {createError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {createError}
                      </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Κωδικός *
                        </label>
                        <input
                          value={createForm.code}
                          onChange={(e) => updateCreateField("code", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder="π.χ. PR-001"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Όνομα *
                        </label>
                        <input
                          value={createForm.name}
                          onChange={(e) => updateCreateField("name", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder="π.χ. Villa Marina"
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Διεύθυνση *
                        </label>
                        <input
                          value={createForm.address}
                          onChange={(e) =>
                            updateCreateField("address", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder="Οδός, αριθμός"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Πόλη *
                        </label>
                        <input
                          value={createForm.city}
                          onChange={(e) => updateCreateField("city", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder="π.χ. Ηράκλειο"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Περιοχή / Νομός *
                        </label>
                        <input
                          value={createForm.region}
                          onChange={(e) => updateCreateField("region", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder="π.χ. Κρήτη"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Ταχυδρομικός κώδικας *
                        </label>
                        <input
                          value={createForm.postalCode}
                          onChange={(e) =>
                            updateCreateField("postalCode", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder="π.χ. 71307"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Χώρα *
                        </label>
                        <input
                          value={createForm.country}
                          onChange={(e) =>
                            updateCreateField("country", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Τύπος *
                        </label>
                        <select
                          value={createForm.type}
                          onChange={(e) => updateCreateField("type", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        >
                          <option value="Διαμέρισμα">Διαμέρισμα</option>
                          <option value="Βίλα">Βίλα</option>
                          <option value="Στούντιο">Στούντιο</option>
                          <option value="Μονοκατοικία">Μονοκατοικία</option>
                          <option value="Μεζονέτα">Μεζονέτα</option>
                          <option value="Loft">Loft</option>
                          <option value="Άλλο">Άλλο</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Κατάσταση *
                        </label>
                        <select
                          value={createForm.status}
                          onChange={(e) =>
                            updateCreateField("status", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        >
                          <option value="active">Ενεργό</option>
                          <option value="inactive">Ανενεργό</option>
                          <option value="maintenance">Σε συντήρηση</option>
                          <option value="archived">Αρχειοθετημένο</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Υπνοδωμάτια
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
                          Μπάνια
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
                          Μέγιστοι επισκέπτες
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

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Προεπιλεγμένος συνεργάτης
                        </label>
                        <select
                          value={createForm.defaultPartnerId}
                          onChange={(e) =>
                            updateCreateField("defaultPartnerId", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        >
                          <option value="">Χωρίς συνεργάτη</option>
                          {partners.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                              {partner.name} ({partner.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Σημειώσεις
                        </label>
                        <textarea
                          value={createForm.notes}
                          onChange={(e) => updateCreateField("notes", e.target.value)}
                          rows={5}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder="Εσωτερικές σημειώσεις για το ακίνητο"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 px-6 py-4">
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeCreateDrawer}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        disabled={createSubmitting}
                      >
                        Ακύρωση
                      </button>

                      <button
                        type="submit"
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={createSubmitting}
                      >
                        {createSubmitting ? "Δημιουργία..." : "Αποθήκευση ακινήτου"}
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