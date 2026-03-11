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
  assignedAt: string | null
  respondedAt: string | null
  createdAt: string
  partner?: PartnerRow | null
}

type ChecklistAnswerRow = {
  id: string
}

type ChecklistRunRow = {
  id: string
  status: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  answers?: ChecklistAnswerRow[]
}

type IssueRow = {
  id: string
  title: string
  status: string | null
}

type EventRow = {
  id: string
  title: string
  status: string | null
}

type TaskRow = {
  id: string
  title: string
  description: string | null
  type: string | null
  status: string | null
  createdAt: string
  property: PropertyRow | null
  assignments: AssignmentRow[]
  checklistRuns: ChecklistRunRow[]
  issues: IssueRow[]
  events: EventRow[]
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

function getTaskStatusLabel(status: string | null | undefined) {
  if (!status) return "—"

  switch (status) {
    case "PENDING":
      return "Σε αναμονή"
    case "ASSIGNED":
      return "Ανατέθηκε"
    case "WAITING_ACCEPTANCE":
      return "Αναμονή αποδοχής"
    case "ACCEPTED":
      return "Αποδεκτή"
    case "REJECTED":
      return "Απορρίφθηκε"
    case "IN_PROGRESS":
      return "Σε εξέλιξη"
    case "COMPLETED":
      return "Ολοκληρωμένη"
    case "CANCELLED":
      return "Ακυρωμένη"
    default:
      return status
  }
}

function getTaskStatusClasses(status: string | null | undefined) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700"
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700"
    case "WAITING_ACCEPTANCE":
      return "bg-amber-100 text-amber-700"
    case "ACCEPTED":
      return "bg-sky-100 text-sky-700"
    case "REJECTED":
      return "bg-rose-100 text-rose-700"
    case "CANCELLED":
      return "bg-slate-200 text-slate-700"
    default:
      return "bg-slate-100 text-slate-700"
  }
}

function getTaskTypeLabel(type: string | null | undefined) {
  if (!type) return "—"

  switch (type) {
    case "CLEANING":
      return "Καθαρισμός"
    case "MAINTENANCE":
      return "Συντήρηση"
    case "INSPECTION":
      return "Επιθεώρηση"
    case "RESTOCK":
      return "Αναλώσιμα"
    case "ISSUE":
      return "Αποκατάσταση προβλήματος"
    default:
      return type
  }
}

export default function PartnerTasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  async function loadTasks(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError(null)

      const res = await fetch("/api/partner/tasks", {
        method: "GET",
        cache: "no-store",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία φόρτωσης εργασιών συνεργάτη.")
      }

      setTasks(Array.isArray(data) ? data : [])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα φόρτωσης εργασιών."
      setError(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase()

    if (!q) return tasks

    return tasks.filter((task) => {
      const propertyName = task.property?.name?.toLowerCase() ?? ""
      const propertyCode = task.property?.code?.toLowerCase() ?? ""
      const propertyAddress = task.property?.address?.toLowerCase() ?? ""

      return (
        task.title.toLowerCase().includes(q) ||
        (task.description ?? "").toLowerCase().includes(q) ||
        propertyName.includes(q) ||
        propertyCode.includes(q) ||
        propertyAddress.includes(q) ||
        (task.type ?? "").toLowerCase().includes(q)
      )
    })
  }, [tasks, search])

  const stats = useMemo(() => {
    const total = tasks.length
    const open = tasks.filter(
      (task) =>
        task.status !== "COMPLETED" &&
        task.status !== "CANCELLED" &&
        task.status !== "REJECTED"
    ).length
    const waitingAcceptance = tasks.filter(
      (task) => task.status === "WAITING_ACCEPTANCE"
    ).length
    const inProgress = tasks.filter(
      (task) => task.status === "IN_PROGRESS"
    ).length
    const completed = tasks.filter(
      (task) => task.status === "COMPLETED"
    ).length

    return {
      total,
      open,
      waitingAcceptance,
      inProgress,
      completed,
    }
  }, [tasks])

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Partner Area
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Οι εργασίες μου
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Εδώ εμφανίζονται αποκλειστικά οι εργασίες που ανήκουν στον
              συνδεδεμένο συνεργάτη μέσω του partner isolation layer.
            </p>
          </div>

          <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Αναζήτηση με τίτλο, ακίνητο, κωδικό, διεύθυνση..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />

            <button
              onClick={() => loadTasks(true)}
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
          <p className="text-sm text-slate-500">Σύνολο εργασιών</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ανοιχτές</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.open}</p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Αναμονή αποδοχής</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {stats.waitingAcceptance}
          </p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Σε εξέλιξη</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {stats.inProgress}
          </p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ολοκληρωμένες</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {stats.completed}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">Λίστα εργασιών</h2>
          <p className="mt-1 text-sm text-slate-600">
            Τα δεδομένα φορτώνονται από το ασφαλές route
            <span className="font-semibold"> /api/partner/tasks</span>.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            Φόρτωση εργασιών...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            Δεν υπάρχουν εργασίες για τον συνεργάτη.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Εργασία</th>
                    <th className="px-4 py-3 font-semibold">Ακίνητο</th>
                    <th className="px-4 py-3 font-semibold">Τύπος</th>
                    <th className="px-4 py-3 font-semibold">Κατάσταση</th>
                    <th className="px-4 py-3 font-semibold">Ανάθεση</th>
                    <th className="px-4 py-3 font-semibold">Checklist</th>
                    <th className="px-4 py-3 font-semibold text-right">Ενέργεια</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTasks.map((task) => {
                    const latestAssignment = task.assignments[0] ?? null
                    const latestRun = task.checklistRuns[0] ?? null

                    return (
                      <tr key={task.id} className="border-t">
                        <td className="px-4 py-4 align-top">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {task.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              ID: {task.id}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Δημιουργία: {formatDate(task.createdAt)}
                            </p>
                            {task.description ? (
                              <p className="mt-2 max-w-xs text-xs text-slate-600">
                                {task.description}
                              </p>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div>
                            <p className="font-medium text-slate-900">
                              {task.property?.name ?? "—"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {task.property?.code ?? "—"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {task.property?.address ?? "—"}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top text-slate-700">
                          {getTaskTypeLabel(task.type)}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTaskStatusClasses(
                              task.status
                            )}`}
                          >
                            {getTaskStatusLabel(task.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top">
                          {latestAssignment ? (
                            <div className="text-xs text-slate-600">
                              <p>
                                Κατάσταση:{" "}
                                <span className="font-medium text-slate-900">
                                  {getTaskStatusLabel(latestAssignment.status)}
                                </span>
                              </p>
                              <p className="mt-1">
                                Ανάθεση: {formatDate(latestAssignment.assignedAt)}
                              </p>
                              <p className="mt-1">
                                Απάντηση: {formatDate(latestAssignment.respondedAt)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>

                        <td className="px-4 py-4 align-top">
                          {latestRun ? (
                            <div className="text-xs text-slate-600">
                              <p>
                                Κατάσταση:{" "}
                                <span className="font-medium text-slate-900">
                                  {getTaskStatusLabel(latestRun.status)}
                                </span>
                              </p>
                              <p className="mt-1">
                                Έναρξη: {formatDate(latestRun.startedAt)}
                              </p>
                              <p className="mt-1">
                                Ολοκλήρωση: {formatDate(latestRun.completedAt)}
                              </p>
                              <p className="mt-1">
                                Απαντήσεις: {latestRun.answers?.length ?? 0}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Δεν υπάρχει run
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 align-top text-right">
                          <Link
                            href={`/partner/tasks/${task.id}`}
                            className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Προβολή
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}