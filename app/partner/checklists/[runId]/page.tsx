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

type TemplateItemRow = {
  id: string
  label: string
  description: string | null
  itemType: string | null
  isRequired: boolean
  sortOrder: number
  category: string | null
  requiresPhoto: boolean
  opensIssueOnFail: boolean
  optionsText: string | null
}

type TemplateRow = {
  id: string
  name: string
  description: string | null
  isPrimary: boolean
  items: TemplateItemRow[]
}

type AnswerRow = {
  id: string
  templateItemId: string | null
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
  template: TemplateRow | null
  answers: AnswerRow[]
}

type PageProps = {
  params: Promise<{
    runId: string
  }>
}

type EditableAnswer = {
  templateItemId: string
  itemLabel: string
  value: string
  notes: string
  status: string
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

function getAnswerStatusLabel(status: string | null | undefined) {
  if (!status) return "—"

  switch (status) {
    case "OK":
      return "ΟΚ"
    case "FAIL":
      return "Αποτυχία"
    case "WARNING":
      return "Προειδοποίηση"
    default:
      return status
  }
}

function getAnswerStatusClasses(status: string | null | undefined) {
  switch (status) {
    case "OK":
      return "bg-emerald-100 text-emerald-700"
    case "FAIL":
      return "bg-rose-100 text-rose-700"
    case "WARNING":
      return "bg-amber-100 text-amber-700"
    default:
      return "bg-slate-100 text-slate-700"
  }
}

function buildInitialAnswers(run: ChecklistRunRow | null): EditableAnswer[] {
  if (!run?.template) return []

  return run.template.items.map((item) => {
    const existingAnswer = run.answers.find(
      (answer) => answer.templateItemId === item.id
    )

    return {
      templateItemId: item.id,
      itemLabel: item.label,
      value: existingAnswer?.value ?? "",
      notes: existingAnswer?.notes ?? "",
      status: existingAnswer?.status ?? "OK",
    }
  })
}

export default function PartnerChecklistRunDetailPage({ params }: PageProps) {
  const { runId } = use(params)

  const [run, setRun] = useState<ChecklistRunRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [answers, setAnswers] = useState<EditableAnswer[]>([])

  async function loadRun(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError(null)

      const res = await fetch(`/api/partner/checklists/${runId}`, {
        method: "GET",
        cache: "no-store",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία φόρτωσης checklist run.")
      }

      setRun(data)
      setAnswers(buildInitialAnswers(data))
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα φόρτωσης run."
      setError(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadRun()
  }, [runId])

  const answersCount = useMemo(() => answers.length, [answers])

  function updateAnswer(
    templateItemId: string,
    field: "value" | "notes" | "status",
    value: string
  ) {
    setAnswers((prev) =>
      prev.map((item) =>
        item.templateItemId === templateItemId ? { ...item, [field]: value } : item
      )
    )
  }

  async function handleSubmitChecklist() {
    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)

      const payloadAnswers = answers.map((answer) => ({
        templateItemId: answer.templateItemId,
        value: answer.value.trim(),
        notes: answer.notes.trim(),
        status: answer.status.trim() || "OK",
      }))

      const res = await fetch(`/api/partner/checklists/${runId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startedAt: run?.startedAt ?? new Date().toISOString(),
          completedAt: new Date().toISOString(),
          answers: payloadAnswers,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία υποβολής checklist.")
      }

      setSuccess("Το checklist υποβλήθηκε επιτυχώς.")
      await loadRun(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα υποβολής checklist."
      setError(message)
    } finally {
      setSubmitting(false)
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
              Λεπτομέρειες checklist run
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Προβολή και υποβολή ενός checklist run που ανήκει αποκλειστικά στον
              συνδεδεμένο συνεργάτη.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => loadRun(true)}
              disabled={refreshing}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Ανανέωση..." : "Ανανέωση"}
            </button>

            <Link
              href="/partner/checklists"
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
          Φόρτωση checklist run...
        </div>
      ) : !run ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
          Το checklist run δεν βρέθηκε.
        </div>
      ) : (
        <>
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{run.id}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Δημιουργία: {formatDate(run.createdAt)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Έναρξη: {formatDate(run.startedAt)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Ολοκλήρωση: {formatDate(run.completedAt)}
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 lg:items-end">
                <span
                  className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getRunStatusClasses(
                    run.status
                  )}`}
                >
                  {getRunStatusLabel(run.status)}
                </span>

                <button
                  onClick={handleSubmitChecklist}
                  disabled={submitting || !run.template}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Υποβολή..." : "Υποβολή checklist"}
                </button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Items προτύπου</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{answersCount}</p>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Πρότυπο</p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {run.template?.name ?? "—"}
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Εργασία</p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {run.task?.title ?? "—"}
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Ακίνητο</p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {run.task?.property?.name ?? "—"}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-slate-900">Στοιχεία εργασίας</h3>

                {run.task?.id ? (
                  <Link
                    href={`/partner/tasks/${run.task.id}`}
                    className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Προβολή εργασίας
                  </Link>
                ) : null}
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <span className="font-semibold text-slate-900">Τίτλος:</span>{" "}
                  {run.task?.title ?? "—"}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Task ID:</span>{" "}
                  {run.task?.id ?? "—"}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Κατάσταση:</span>{" "}
                  {run.task?.status ?? "—"}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">Στοιχεία ακινήτου</h3>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <span className="font-semibold text-slate-900">Όνομα:</span>{" "}
                  {run.task?.property?.name ?? "—"}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Κωδικός:</span>{" "}
                  {run.task?.property?.code ?? "—"}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Διεύθυνση:</span>{" "}
                  {run.task?.property?.address ?? "—"}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900">Checklist προτύπου</h3>
              <p className="mt-1 text-sm text-slate-600">
                Ο συνεργάτης απαντά στα πραγματικά items του προτύπου που είναι
                συνδεδεμένο με αυτό το run.
              </p>
            </div>

            {!run.template ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
                Δεν υπάρχει συνδεδεμένο πρότυπο checklist για αυτό το run.
              </div>
            ) : (
              <div className="space-y-4">
                {run.template.items.map((item) => {
                  const currentAnswer = answers.find(
                    (answer) => answer.templateItemId === item.id
                  )

                  return (
                    <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{item.label}</p>

                          {item.description ? (
                            <p className="mt-1 text-sm text-slate-600">
                              {item.description}
                            </p>
                          ) : null}

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {item.itemType ?? "CHECK"}
                            </span>

                            {item.isRequired ? (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                Υποχρεωτικό
                              </span>
                            ) : null}

                            {item.requiresPhoto ? (
                              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                                Απαιτεί φωτογραφία
                              </span>
                            ) : null}

                            {item.opensIssueOnFail ? (
                              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                                Άνοιγμα ζητήματος σε αποτυχία
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getAnswerStatusClasses(
                            currentAnswer?.status
                          )}`}
                        >
                          {getAnswerStatusLabel(currentAnswer?.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Τιμή
                          </label>
                          <input
                            type="text"
                            value={currentAnswer?.value ?? ""}
                            onChange={(e) =>
                              updateAnswer(item.id, "value", e.target.value)
                            }
                            placeholder="Συμπλήρωσε απάντηση"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Σημειώσεις
                          </label>
                          <input
                            type="text"
                            value={currentAnswer?.notes ?? ""}
                            onChange={(e) =>
                              updateAnswer(item.id, "notes", e.target.value)
                            }
                            placeholder="Προαιρετικές σημειώσεις"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Κατάσταση
                          </label>
                          <select
                            value={currentAnswer?.status ?? "OK"}
                            onChange={(e) =>
                              updateAnswer(item.id, "status", e.target.value)
                            }
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                          >
                            <option value="OK">ΟΚ</option>
                            <option value="WARNING">Προειδοποίηση</option>
                            <option value="FAIL">Αποτυχία</option>
                          </select>
                        </div>
                      </div>

                      {item.optionsText ? (
                        <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                          Επιλογές: {item.optionsText}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}