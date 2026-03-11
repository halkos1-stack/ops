"use client"

import { useEffect, useMemo, useState } from "react"

type OrganizationItem = {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    properties?: number
    bookings?: number
    partners?: number
    tasks?: number
    issues?: number
    events?: number
    memberships?: number
  }
}

type CreateOrganizationFormState = {
  name: string
  slug: string
  isActive: boolean
}

const initialCreateForm: CreateOrganizationFormState = {
  name: "",
  slug: "",
  isActive: true,
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

function statusLabel(isActive?: boolean) {
  return isActive ? "Ενεργός" : "Ανενεργός"
}

function statusBadgeClasses(isActive?: boolean) {
  return isActive
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
}

function slugifyGreekSafe(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_άέήίόύώα-ω]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] =
    useState<CreateOrganizationFormState>(initialCreateForm)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function loadOrganizations() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/organizations", {
        cache: "no-store",
      })

      const json = await res.json().catch(() => [])

      if (!res.ok) {
        throw new Error(json?.error || "Αποτυχία φόρτωσης οργανισμών.")
      }

      const data = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.organizations)
        ? json.organizations
        : []

      setOrganizations(data)
    } catch (err) {
      console.error("Load organizations error:", err)
      setError("Αποτυχία φόρτωσης οργανισμών.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrganizations()
  }, [])

  const filteredOrganizations = useMemo(() => {
    const term = search.trim().toLowerCase()

    return organizations.filter((organization) => {
      const matchesSearch =
        term === "" ||
        organization.name?.toLowerCase().includes(term) ||
        organization.slug?.toLowerCase().includes(term)

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && organization.isActive) ||
        (statusFilter === "inactive" && !organization.isActive)

      return matchesSearch && matchesStatus
    })
  }, [organizations, search, statusFilter])

  const summary = useMemo(() => {
    const total = organizations.length
    const active = organizations.filter((item) => item.isActive).length
    const inactive = organizations.filter((item) => !item.isActive).length

    const totalProperties = organizations.reduce(
      (sum, item) => sum + (item._count?.properties || 0),
      0
    )

    const totalTasks = organizations.reduce(
      (sum, item) => sum + (item._count?.tasks || 0),
      0
    )

    return {
      total,
      active,
      inactive,
      totalProperties,
      totalTasks,
    }
  }, [organizations])

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
    field: keyof CreateOrganizationFormState,
    value: string | boolean
  ) {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleCreateOrganization(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()
    setCreateSubmitting(true)
    setCreateError(null)

    try {
      const payload = {
        name: createForm.name.trim(),
        slug: createForm.slug.trim(),
        isActive: createForm.isActive,
      }

      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || "Αποτυχία δημιουργίας οργανισμού.")
      }

      await loadOrganizations()
      setIsCreateOpen(false)
      setCreateForm(initialCreateForm)
    } catch (err) {
      console.error("Create organization error:", err)
      setCreateError(
        err instanceof Error ? err.message : "Αποτυχία δημιουργίας οργανισμού."
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
              Διαχείριση οργανισμών
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Κεντρικός έλεγχος οργανισμών, κατάστασης και βασικών μεγεθών
              πλατφόρμας.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openCreateDrawer}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Νέος οργανισμός
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Σύνολο οργανισμών</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {summary.total}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Ενεργοί</div>
            <div className="mt-2 text-3xl font-bold text-emerald-700">
              {summary.active}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Ανενεργοί</div>
            <div className="mt-2 text-3xl font-bold text-slate-700">
              {summary.inactive}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Σύνολο ακινήτων</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {summary.totalProperties}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Σύνολο εργασιών</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {summary.totalTasks}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Αναζήτηση
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Όνομα οργανισμού ή slug..."
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
                <option value="all">Όλοι</option>
                <option value="active">Ενεργοί</option>
                <option value="inactive">Ανενεργοί</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Λίστα οργανισμών
              </h2>
              <p className="text-sm text-slate-500">
                {filteredOrganizations.length} από {organizations.length} οργανισμούς
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">Φόρτωση οργανισμών...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Δεν βρέθηκαν οργανισμοί.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Οργανισμός</th>
                    <th className="px-4 py-3 font-semibold">Κατάσταση</th>
                    <th className="px-4 py-3 font-semibold">Μέγεθος</th>
                    <th className="px-4 py-3 font-semibold">Ενημέρωση</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredOrganizations.map((organization) => (
                    <tr key={organization.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold text-slate-900">
                          {organization.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Slug: {organization.slug}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          ID: {organization.id}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(
                            organization.isActive
                          )}`}
                        >
                          {statusLabel(organization.isActive)}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1 text-xs text-slate-600">
                          <div>Ακίνητα: {organization._count?.properties || 0}</div>
                          <div>Συνεργάτες: {organization._count?.partners || 0}</div>
                          <div>Εργασίες: {organization._count?.tasks || 0}</div>
                          <div>Μέλη: {organization._count?.memberships || 0}</div>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="text-xs text-slate-500">
                          Τελευταία ενημέρωση
                        </div>
                        <div className="mt-1 text-sm text-slate-900">
                          {formatDateTime(organization.updatedAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
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

          <div className="absolute inset-y-0 right-0 flex w-full max-w-xl">
            <div className="ml-auto h-full w-full border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex h-full flex-col">
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Νέος οργανισμός
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Δημιουργία νέου οργανισμού πλατφόρμας.
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
                  onSubmit={handleCreateOrganization}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                    {createError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {createError}
                      </div>
                    ) : null}

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Όνομα οργανισμού *
                        </label>
                        <input
                          value={createForm.name}
                          onChange={(e) => {
                            const nextName = e.target.value
                            updateCreateField("name", nextName)

                            if (!createForm.slug.trim()) {
                              updateCreateField(
                                "slug",
                                slugifyGreekSafe(nextName)
                              )
                            }
                          }}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder="π.χ. OPS Demo Crete"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Slug *
                        </label>
                        <input
                          value={createForm.slug}
                          onChange={(e) =>
                            updateCreateField(
                              "slug",
                              slugifyGreekSafe(e.target.value)
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder="π.χ. ops-demo-crete"
                          required
                        />
                      </div>

                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                        <input
                          id="organization-active"
                          type="checkbox"
                          checked={createForm.isActive}
                          onChange={(e) =>
                            updateCreateField("isActive", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <label
                          htmlFor="organization-active"
                          className="text-sm text-slate-700"
                        >
                          Ο οργανισμός να είναι ενεργός
                        </label>
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
                        {createSubmitting
                          ? "Δημιουργία..."
                          : "Αποθήκευση οργανισμού"}
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