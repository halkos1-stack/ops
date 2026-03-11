"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"

type PropertyRow = {
  id: string
  name: string | null
  code: string | null
  address: string | null
}

type PartnerRow = {
  id: string
  fullName: string
  email?: string | null
  phone?: string | null
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
  answers: ChecklistAnswerRow[]
}

type IssueRow = {
  id: string
  title: string
  description?: string | null
  status: string | null
  severity?: string | null
  createdAt?: string
}

type EventRow = {
  id: string
  title: string
  description?: string | null
  status: string | null
  type?: string | null
  createdAt?: string
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

type PageProps = {
  params: Promise<{
    taskId: string
  }>
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

function canRespondAssignment(status: string | null | undefined) {
  return status === "ASSIGNED" || status === "WAITING_ACCEPTANCE"
}

export default function PartnerTaskDetailPage({ params }: PageProps) {
  const { taskId } = use(params)

  const [task, setTask] = useState<TaskRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [respondingAction, setRespondingAction] = useState<"ACCEPTED" | "REJECTED" | null>(null)

  async function loadTask(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError(null)

      const res = await fetch(`/api/partner/tasks/${taskId}`, {
        method: "GET",
        cache: "no-store",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία φόρτωσης εργασίας συνεργάτη.")
      }

      setTask(data)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα φόρτωσης εργασίας."
      setError(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadTask()
  }, [taskId])

  const latestAssignment = useMemo(() => {
    return task?.assignments?.[0] ?? null
  }, [task])

  const latestRun = useMemo(() => {
    return task?.checklistRuns?.[0] ?? null
  }, [task])

  async function handleRespondAssignment(action: "ACCEPTED" | "REJECTED") {
    if (!latestAssignment?.id) return

    try {
      setRespondingAction(action)
      setError(null)
      setSuccess(null)

      const res = await fetch(
        `/api/partner/assignments/${latestAssignment.id}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία απάντησης ανάθεσης.")
      }

      setSuccess(
        action === "ACCEPTED"
          ? "Η ανάθεση έγινε αποδεκτή επιτυχώς."
          : "Η ανάθεση απορρίφθηκε επιτυχώς."
      )

      await loadTask(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα απάντησης ανάθεσης."
      setError(message)
    } finally {
      setRespondingAction(null)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Partner Area
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Λεπτομέρειες εργασίας
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Προβολή μίας εργασίας που ανήκει αποκλειστικά στον συνδεδεμένο
              συνεργάτη.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => loadTask(true)}
              disabled={refreshing}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Ανανέωση..." : "Ανανέωση"}
            </button>

            <Link
              href="/partner/tasks"
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Επιστροφή
            </Link>
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

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
          Φόρτωση εργασίας...
        </div>
      ) : !task ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
          Η εργασία δεν βρέθηκε.
        </div>
      ) : (
        <>
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{task.title}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  ID εργασίας: <span className="font-medium">{task.id}</span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Δημιουργία: {formatDate(task.createdAt)}
                </p>
                {task.description ? (
                  <p className="mt-4 max-w-3xl text-sm text-slate-700">
                    {task.description}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3">
                <span
                  className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getTaskStatusClasses(
                    task.status
                  )}`}
                >
                  {getTaskStatusLabel(task.status)}
                </span>

                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Τύπος: <span className="font-semibold">{getTaskTypeLabel(task.type)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Αναθέσεις</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {task.assignments.length}
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Checklist runs</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {task.checklistRuns.length}
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Ζητήματα</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {task.issues.length}
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Συμβάντα</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {task.events.length}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">Στοιχεία ακινήτου</h3>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <span className="font-semibold text-slate-900">Όνομα:</span>{" "}
                  {task.property?.name ?? "—"}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Κωδικός:</span>{" "}
                  {task.property?.code ?? "—"}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Διεύθυνση:</span>{" "}
                  {task.property?.address ?? "—"}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Τελευταία ανάθεση</h3>
                </div>

                {latestAssignment && canRespondAssignment(latestAssignment.status) ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespondAssignment("ACCEPTED")}
                      disabled={respondingAction !== null}
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {respondingAction === "ACCEPTED" ? "Αποδοχή..." : "Αποδοχή"}
                    </button>

                    <button
                      onClick={() => handleRespondAssignment("REJECTED")}
                      disabled={respondingAction !== null}
                      className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {respondingAction === "REJECTED" ? "Απόρριψη..." : "Απόρριψη"}
                    </button>
                  </div>
                ) : null}
              </div>

              {latestAssignment ? (
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <div>
                    <span className="font-semibold text-slate-900">Κατάσταση:</span>{" "}
                    {getTaskStatusLabel(latestAssignment.status)}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Ανάθεση:</span>{" "}
                    {formatDate(latestAssignment.assignedAt)}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Απάντηση:</span>{" "}
                    {formatDate(latestAssignment.respondedAt)}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Συνεργάτης:</span>{" "}
                    {latestAssignment.partner?.fullName ?? "—"}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  Δεν υπάρχει ανάθεση.
                </div>
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-slate-900">Checklist runs</h3>

                {latestRun ? (
                  <Link
                    href={`/partner/checklists/${latestRun.id}`}
                    className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Άνοιγμα τελευταίου run
                  </Link>
                ) : null}
              </div>

              {task.checklistRuns.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  Δεν υπάρχουν checklist runs.
                </div>
              ) : (
                <div className="space-y-3">
                  {task.checklistRuns.map((run) => (
                    <div key={run.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{run.id}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Δημιουργία: {formatDate(run.createdAt)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Έναρξη: {formatDate(run.startedAt)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Ολοκλήρωση: {formatDate(run.completedAt)}
                          </p>
                          <p className="mt-2 text-xs text-slate-600">
                            Απαντήσεις: {run.answers.length}
                          </p>
                        </div>

                        <div className="flex flex-col items-start gap-3 lg:items-end">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRunStatusClasses(
                              run.status
                            )}`}
                          >
                            {getRunStatusLabel(run.status)}
                          </span>

                          <Link
                            href={`/partner/checklists/${run.id}`}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Προβολή run
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">Ζητήματα και συμβάντα</h3>

              <div className="mt-4 grid grid-cols-1 gap-4">
                <div>
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Ζητήματα
                  </h4>

                  {task.issues.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                      Δεν υπάρχουν ζητήματα.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {task.issues.map((issue) => (
                        <div key={issue.id} className="rounded-2xl border border-slate-200 p-4">
                          <p className="font-semibold text-slate-900">{issue.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Κατάσταση: {issue.status ?? "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Σοβαρότητα: {issue.severity ?? "—"}
                          </p>
                          {issue.description ? (
                            <p className="mt-2 text-sm text-slate-700">
                              {issue.description}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Συμβάντα
                  </h4>

                  {task.events.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                      Δεν υπάρχουν συμβάντα.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {task.events.map((event) => (
                        <div key={event.id} className="rounded-2xl border border-slate-200 p-4">
                          <p className="font-semibold text-slate-900">{event.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Κατάσταση: {event.status ?? "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Τύπος: {event.type ?? "—"}
                          </p>
                          {event.description ? (
                            <p className="mt-2 text-sm text-slate-700">
                              {event.description}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}