"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type OrganizationRow = {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: string
  _count?: {
    memberships: number
    properties: number
    partners: number
    tasks: number
    issues: number
    events: number
  }
}

type CreateFormState = {
  name: string
  slug: string
  isActive: boolean
}

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE"
type SortBy =
  | "NEWEST"
  | "OLDEST"
  | "NAME_ASC"
  | "NAME_DESC"
  | "PROPERTIES_DESC"
  | "TASKS_DESC"
  | "PARTNERS_DESC"

const initialFormState: CreateFormState = {
  name: "",
  slug: "",
  isActive: true,
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("el-GR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return value
  }
}

async function readJsonSafely(res: Response) {
  const text = await res.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export default function SuperAdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [sortBy, setSortBy] = useState<SortBy>("NEWEST")
  const [showOnlyWithProperties, setShowOnlyWithProperties] = useState(false)
  const [showOnlyWithTasks, setShowOnlyWithTasks] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(true)
  const [form, setForm] = useState<CreateFormState>(initialFormState)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function loadOrganizations() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch("/api/super-admin/organizations", {
        method: "GET",
        cache: "no-store",
      })

      const data = await readJsonSafely(res)

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία φόρτωσης οργανισμών.")
      }

      setOrganizations(Array.isArray(data) ? data : [])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα φόρτωσης οργανισμών."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrganizations()
  }, [])

  const stats = useMemo(() => {
    const total = organizations.length
    const active = organizations.filter((org) => org.isActive).length
    const inactive = total - active

    const totalProperties = organizations.reduce(
      (sum, org) => sum + (org._count?.properties ?? 0),
      0
    )

    const totalPartners = organizations.reduce(
      (sum, org) => sum + (org._count?.partners ?? 0),
      0
    )

    const totalTasks = organizations.reduce(
      (sum, org) => sum + (org._count?.tasks ?? 0),
      0
    )

    const totalMembers = organizations.reduce(
      (sum, org) => sum + (org._count?.memberships ?? 0),
      0
    )

    return {
      total,
      active,
      inactive,
      totalProperties,
      totalPartners,
      totalTasks,
      totalMembers,
    }
  }, [organizations])

  const filteredOrganizations = useMemo(() => {
    const q = search.trim().toLowerCase()

    let result = [...organizations]

    if (q) {
      result = result.filter((org) => {
        return (
          org.name.toLowerCase().includes(q) ||
          org.slug.toLowerCase().includes(q)
        )
      })
    }

    if (statusFilter === "ACTIVE") {
      result = result.filter((org) => org.isActive)
    }

    if (statusFilter === "INACTIVE") {
      result = result.filter((org) => !org.isActive)
    }

    if (showOnlyWithProperties) {
      result = result.filter((org) => (org._count?.properties ?? 0) > 0)
    }

    if (showOnlyWithTasks) {
      result = result.filter((org) => (org._count?.tasks ?? 0) > 0)
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "OLDEST":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )

        case "NAME_ASC":
          return a.name.localeCompare(b.name, "el")

        case "NAME_DESC":
          return b.name.localeCompare(a.name, "el")

        case "PROPERTIES_DESC":
          return (b._count?.properties ?? 0) - (a._count?.properties ?? 0)

        case "TASKS_DESC":
          return (b._count?.tasks ?? 0) - (a._count?.tasks ?? 0)

        case "PARTNERS_DESC":
          return (b._count?.partners ?? 0) - (a._count?.partners ?? 0)

        case "NEWEST":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
      }
    })

    return result
  }, [
    organizations,
    search,
    statusFilter,
    sortBy,
    showOnlyWithProperties,
    showOnlyWithTasks,
  ])

  async function handleCreateOrganization(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const res = await fetch("/api/super-admin/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })

      const data = await readJsonSafely(res)

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία δημιουργίας οργανισμού.")
      }

      setForm(initialFormState)
      setSuccess("Ο οργανισμός δημιουργήθηκε επιτυχώς.")
      await loadOrganizations()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα δημιουργίας οργανισμού."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleOrganization(org: OrganizationRow) {
    try {
      setTogglingId(org.id)
      setError(null)
      setSuccess(null)

      const res = await fetch(`/api/super-admin/organizations/${org.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !org.isActive,
        }),
      })

      const data = await readJsonSafely(res)

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία ενημέρωσης οργανισμού.")
      }

      setSuccess(
        data?.isActive
          ? "Ο οργανισμός ενεργοποιήθηκε επιτυχώς."
          : "Ο οργανισμός απενεργοποιήθηκε επιτυχώς."
      )

      await loadOrganizations()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα ενημέρωσης οργανισμού."
      setError(message)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDeleteOrganization(org: OrganizationRow) {
    const confirmed = window.confirm(
      `Θέλεις σίγουρα να διαγράψεις τον οργανισμό "${org.name}"; Η ενέργεια είναι οριστική.`
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(org.id)
      setError(null)
      setSuccess(null)

      const res = await fetch(`/api/super-admin/organizations/${org.id}`, {
        method: "DELETE",
      })

      const data = await readJsonSafely(res)

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία διαγραφής οργανισμού.")
      }

      setSuccess(data?.message || "Ο οργανισμός διαγράφηκε επιτυχώς.")
      await loadOrganizations()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα διαγραφής οργανισμού."
      setError(message)
    } finally {
      setDeletingId(null)
    }
  }

  function resetFilters() {
    setSearch("")
    setStatusFilter("ALL")
    setSortBy("NEWEST")
    setShowOnlyWithProperties(false)
    setShowOnlyWithTasks(false)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              SUPER ADMIN
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Διαχείριση οργανισμών
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Κεντρική διαχείριση όλων των οργανισμών της πλατφόρμας με αναζήτηση,
              φίλτρα, ενεργοποίηση, απενεργοποίηση, διαγραφή και συνολική εικόνα χρήσης.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadOrganizations}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ανανέωση
            </button>

            <button
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {showCreateForm ? "Απόκρυψη φόρμας" : "Νέος οργανισμός"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Σύνολο οργανισμών</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ενεργοί</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.active}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ανενεργοί</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {stats.inactive}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Συνολικά ακίνητα</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats.totalProperties}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Συνολικοί συνεργάτες</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats.totalPartners}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Συνολικά μέλη</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats.totalMembers}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Έξυπνα φίλτρα διαχείρισης
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Βρες γρήγορα οργανισμούς με βάση κατάσταση, δραστηριότητα και χρήση.
            </p>
          </div>

          <button
            onClick={resetFilters}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Καθαρισμός φίλτρων
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Αναζήτηση
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Όνομα ή slug οργανισμού..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Κατάσταση
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            >
              <option value="ALL">Όλοι</option>
              <option value="ACTIVE">Μόνο ενεργοί</option>
              <option value="INACTIVE">Μόνο ανενεργοί</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ταξινόμηση
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            >
              <option value="NEWEST">Νεότεροι πρώτα</option>
              <option value="OLDEST">Παλαιότεροι πρώτα</option>
              <option value="NAME_ASC">Όνομα Α-Ω</option>
              <option value="NAME_DESC">Όνομα Ω-Α</option>
              <option value="PROPERTIES_DESC">Περισσότερα ακίνητα</option>
              <option value="TASKS_DESC">Περισσότερες εργασίες</option>
              <option value="PARTNERS_DESC">Περισσότεροι συνεργάτες</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Πρόσθετα φίλτρα
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <input
                type="checkbox"
                checked={showOnlyWithProperties}
                onChange={(e) => setShowOnlyWithProperties(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-slate-700">
                Μόνο με ακίνητα
              </span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <input
                type="checkbox"
                checked={showOnlyWithTasks}
                onChange={(e) => setShowOnlyWithTasks(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-slate-700">
                Μόνο με εργασίες
              </span>
            </label>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[420px_minmax(0,1fr)]">
        {showCreateForm ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Νέος οργανισμός</h2>
              <p className="mt-2 text-sm text-slate-600">
                Δημιούργησε νέο οργανισμό για onboarding νέου πελάτη στο SaaS.
              </p>
            </div>

            <form onSubmit={handleCreateOrganization} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Όνομα οργανισμού
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="π.χ. Crete Stay Management"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Slug οργανισμού
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="π.χ. crete-stay-management"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Αν μείνει κενό, θα παραχθεί αυτόματα από το όνομα του οργανισμού.
                </p>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700">
                  Ο οργανισμός να είναι ενεργός από την αρχή
                </span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Αποθήκευση..." : "Δημιουργία οργανισμού"}
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
              <h2 className="text-xl font-bold text-slate-900">
                Η φόρμα δημιουργίας είναι κρυφή
              </h2>
              <p className="mt-2 max-w-sm text-sm text-slate-600">
                Μπορείς να την εμφανίσεις ξανά από το κουμπί «Νέος οργανισμός».
              </p>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Οργανισμοί πλατφόρμας
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Πλήρης λίστα οργανισμών με φίλτρα, προβολή και γρήγορες ενέργειες.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              Εμφανίζονται: {filteredOrganizations.length}
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
              Φόρτωση οργανισμών...
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
              Δεν βρέθηκαν οργανισμοί με τα τρέχοντα φίλτρα.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 xl:hidden">
                {filteredOrganizations.map((org) => (
                  <div
                    key={org.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Link
                          href={`/super-admin/organizations/${org.id}`}
                          className="block text-base font-bold text-slate-900 transition hover:text-slate-700"
                        >
                          {org.name}
                        </Link>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {org.slug}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              org.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {org.isActive ? "Ενεργός" : "Ανενεργός"}
                          </span>

                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            Ακίνητα: {org._count?.properties ?? 0}
                          </span>

                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            Συνεργάτες: {org._count?.partners ?? 0}
                          </span>

                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            Εργασίες: {org._count?.tasks ?? 0}
                          </span>

                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            Μέλη: {org._count?.memberships ?? 0}
                          </span>
                        </div>

                        <p className="mt-3 text-xs text-slate-500">
                          Δημιουργία: {formatDate(org.createdAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Link
                          href={`/super-admin/organizations/${org.id}`}
                          className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Προβολή
                        </Link>

                        <button
                          onClick={() => handleToggleOrganization(org)}
                          disabled={togglingId === org.id}
                          className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {togglingId === org.id
                            ? "Αποθήκευση..."
                            : org.isActive
                              ? "Απενεργοποίηση"
                              : "Ενεργοποίηση"}
                        </button>

                        <button
                          onClick={() => handleDeleteOrganization(org)}
                          disabled={deletingId === org.id}
                          className="inline-flex rounded-xl border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === org.id ? "Διαγραφή..." : "Διαγραφή"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 xl:block">
                <div className="overflow-x-auto">
                  <table className="min-w-[1100px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Οργανισμός</th>
                        <th className="px-4 py-3 font-semibold">Κατάσταση</th>
                        <th className="px-4 py-3 font-semibold">Ακίνητα</th>
                        <th className="px-4 py-3 font-semibold">Συνεργάτες</th>
                        <th className="px-4 py-3 font-semibold">Εργασίες</th>
                        <th className="px-4 py-3 font-semibold">Μέλη</th>
                        <th className="px-4 py-3 font-semibold">Δημιουργία</th>
                        <th className="px-4 py-3 font-semibold text-right">
                          Ενέργειες
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredOrganizations.map((org) => (
                        <tr key={org.id} className="border-t border-slate-200">
                          <td className="px-4 py-4 align-top">
                            <div className="min-w-[220px]">
                              <Link
                                href={`/super-admin/organizations/${org.id}`}
                                className="font-semibold text-slate-900 transition hover:text-slate-600"
                              >
                                {org.name}
                              </Link>
                              <p className="mt-1 break-all text-xs text-slate-500">
                                {org.slug}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                org.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {org.isActive ? "Ενεργός" : "Ανενεργός"}
                            </span>
                          </td>

                          <td className="px-4 py-4 align-top">
                            {org._count?.properties ?? 0}
                          </td>

                          <td className="px-4 py-4 align-top">
                            {org._count?.partners ?? 0}
                          </td>

                          <td className="px-4 py-4 align-top">
                            {org._count?.tasks ?? 0}
                          </td>

                          <td className="px-4 py-4 align-top">
                            {org._count?.memberships ?? 0}
                          </td>

                          <td className="px-4 py-4 align-top text-slate-600">
                            <div className="min-w-[150px]">
                              {formatDate(org.createdAt)}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="flex min-w-[280px] justify-end gap-2">
                              <Link
                                href={`/super-admin/organizations/${org.id}`}
                                className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                Προβολή
                              </Link>

                              <button
                                onClick={() => handleToggleOrganization(org)}
                                disabled={togglingId === org.id}
                                className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {togglingId === org.id
                                  ? "Αποθήκευση..."
                                  : org.isActive
                                    ? "Απενεργοποίηση"
                                    : "Ενεργοποίηση"}
                              </button>

                              <button
                                onClick={() => handleDeleteOrganization(org)}
                                disabled={deletingId === org.id}
                                className="inline-flex rounded-xl border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingId === org.id ? "Διαγραφή..." : "Διαγραφή"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}