"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type PropertyRow = {
  id: string
  name: string | null
  code: string | null
  address: string | null
}

type PartnerRow = {
  id: string
  fullName: string
}

type AssignmentRow = {
  id: string
  status: string | null
  partner?: PartnerRow | null
}

type TaskRow = {
  id: string
  title: string
  status: string | null
  property: PropertyRow | null
  assignments: AssignmentRow[]
}

type AnswerRow = {
  id: string
  itemLabel: string | null
  value: string | null
  notes: string | null
  status: string | null
}

type ChecklistRunRow = {
  id: string
  status: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  task: TaskRow | null
  answers: AnswerRow[]
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"

  try {
    return new Intl.DateTimeFormat("el-GR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return "—"
  }
}

function getRunStatusLabel(status: string | null | undefined) {
  if (!status) return "—"

  switch (status) {
    case "PENDING":
      return "Σε αναμονή"
    case "IN_PROGRESS":
      return "Σε εξέλιξη"
    case "COMPLETED":
      return "Ολοκληρωμένο"
    case "FAILED":
      return "Απέτυχε"
    case "CANCELLED":
      return "Ακυρωμένο"
    default:
      return status
  }
}

function getRunStatusClasses(status: string | null | undefined) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700"
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700"
    case "FAILED":
      return "bg-rose-100 text-rose-700"
    case "CANCELLED":
      return "bg-slate-200 text-slate-700"
    default:
      return "bg-slate-100 text-slate-700"
  }
}

export default function PartnerChecklistsPage() {
  const [runs, setRuns] = useState<ChecklistRunRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  async function loadRuns(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError(null)

      const res = await fetch("/api/partner/checklists", {
        method: "GET",
        cache: "no-store",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data?.error || "Αποτυχία φόρτωσης checklist runs συνεργάτη."
        )
      }

      setRuns(Array.isArray(data) ? data : [])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα φόρτωσης runs."
      setError(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadRuns()
  }, [])

  const filteredRuns = useMemo(() => {
    const q = search.trim().toLowerCase()

    if (!q) return runs

    return runs.filter((run) => {
      const taskTitle = run.task?.title?.toLowerCase() ?? ""
      const propertyName = run.task?.property?.name?.toLowerCase() ?? ""
      const propertyCode = run.task?.property?.code?.toLowerCase() ?? ""

      return (
        run.id.toLowerCase().includes(q) ||
        taskTitle.includes(q) ||
        propertyName.includes(q) ||
        propertyCode.includes(q) ||
        (run.status ?? "").toLowerCase().includes(q)
      )
    })
  }, [runs, search])

  const stats = useMemo(() => {
    const total = runs.length
    const pending = runs.filter((run) => run.status === "PENDING").length
    const inProgress = runs.filter((run) => run.status === "IN_PROGRESS").length
    const completed = runs.filter((run) => run.status === "COMPLETED").length
    const failed = runs.filter((run) => run.status === "FAILED").length

    return {
      total,
      pending,
      inProgress,
      completed,
      failed,
    }
  }, [runs])

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Partner Area
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Οι λίστες μου
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Εδώ εμφανίζονται μόνο τα checklist runs που συνδέονται με εργασίες
              του συνδεδεμένου συνεργάτη.
            </p>
          </div>

          <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Αναζήτηση με run id, εργασία, ακίνητο, κωδικό..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />

            <button
              onClick={() => loadRuns(true)}
              disabled={refreshing}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Ανανέωση..." : "Ανανέωση"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Σύνολο runs</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Σε αναμονή</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats.pending}
          </p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Σε εξέλιξη</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {stats.inProgress}
          </p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ολοκληρωμένα</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {stats.completed}
          </p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Αποτυχημένα</p>
          <p className="mt-2 text-3xl font-bold text-rose-600">{stats.failed}</p>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            Ιστορικό checklist runs
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Τα δεδομένα φορτώνονται από το ασφαλές route
            <span className="font-semibold"> /api/partner/checklists</span>.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            Φόρτωση checklist runs...
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            Δεν υπάρχουν checklist runs για τον συνεργάτη.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Run</th>
                    <th className="px-4 py-3 font-semibold">Εργασία</th>
                    <th className="px-4 py-3 font-semibold">Ακίνητο</th>
                    <th className="px-4 py-3 font-semibold">Κατάσταση</th>
                    <th className="px-4 py-3 font-semibold">Απαντήσεις</th>
                    <th className="px-4 py-3 font-semibold">Χρόνος</th>
                    <th className="px-4 py-3 font-semibold text-right">Ενέργεια</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRuns.map((run) => (
                    <tr key={run.id} className="border-t">
                      <td className="px-4 py-4 align-top">
                        <div>
                          <p className="font-semibold text-slate-900">{run.id}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Δημιουργία: {formatDate(run.createdAt)}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div>
                          <p className="font-medium text-slate-900">
                            {run.task?.title ?? "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Task ID: {run.task?.id ?? "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Κατάσταση εργασίας: {run.task?.status ?? "—"}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div>
                          <p className="font-medium text-slate-900">
                            {run.task?.property?.name ?? "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {run.task?.property?.code ?? "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {run.task?.property?.address ?? "—"}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRunStatusClasses(
                            run.status
                          )}`}
                        >
                          {getRunStatusLabel(run.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top text-slate-700">
                        {run.answers.length}
                      </td>

                      <td className="px-4 py-4 align-top text-xs text-slate-600">
                        <p>Έναρξη: {formatDate(run.startedAt)}</p>
                        <p className="mt-1">
                          Ολοκλήρωση: {formatDate(run.completedAt)}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top text-right">
                        <Link
                          href={`/partner/checklists/${run.id}`}
                          className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Προβολή
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}