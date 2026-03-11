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

export default function SuperAdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
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

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία φόρτωσης οργανισμών.")
      }

      setOrganizations(data)
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

  const filteredOrganizations = useMemo(() => {
    const q = search.trim().toLowerCase()

    if (!q) return organizations

    return organizations.filter((org) => {
      return (
        org.name.toLowerCase().includes(q) ||
        org.slug.toLowerCase().includes(q)
      )
    })
  }, [organizations, search])

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

    return {
      total,
      active,
      inactive,
      totalProperties,
      totalPartners,
      totalTasks,
    }
  }, [organizations])

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

      const data = await res.json()

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

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία ενημέρωσης οργανισμού.")
      }

      setSuccess(
        data.isActive
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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              SUPER ADMIN
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Διαχείριση οργανισμών
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Εδώ προβάλλονται όλοι οι οργανισμοί της πλατφόρμας, η κατάσταση
              λειτουργίας τους και η βασική συνολική εικόνα χρήσης τους.
            </p>
          </div>

          <div className="w-full max-w-sm">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Αναζήτηση οργανισμού
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Αναζήτηση με όνομα ή slug..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Σύνολο οργανισμών</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ενεργοί</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.active}</p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ανενεργοί</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {stats.inactive}
          </p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Συνολικά ακίνητα</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats.totalProperties}
          </p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Συνολικοί συνεργάτες</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats.totalPartners}
          </p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Συνολικές εργασίες</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats.totalTasks}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
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

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Οργανισμοί πλατφόρμας
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Πλήρης λίστα οργανισμών με βασικές μετρήσεις χρήσης.
              </p>
            </div>

            <button
              onClick={loadOrganizations}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Ανανέωση
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
              Φόρτωση οργανισμών...
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
              Δεν βρέθηκαν οργανισμοί.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
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
                      <tr key={org.id} className="border-t">
                        <td className="px-4 py-4 align-top">
                          <div>
                            <Link
                              href={`/super-admin/organizations/${org.id}`}
                              className="font-semibold text-slate-900 transition hover:text-slate-600"
                            >
                              {org.name}
                            </Link>
                            <p className="mt-1 text-xs text-slate-500">{org.slug}</p>
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
                          {formatDate(org.createdAt)}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex justify-end gap-2">
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}