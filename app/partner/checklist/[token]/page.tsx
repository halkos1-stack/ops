"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

type ChecklistItem = {
  id: string
  label: string
  description?: string | null
  itemType: string
  isRequired: boolean
  sortOrder: number
  category?: string | null
  requiresPhoto?: boolean
  opensIssueOnFail?: boolean
  optionsText?: string | null
}

type Payload = {
  assignment: {
    id: string
    partner: {
      name: string
      email: string
    }
    task: {
      id: string
      title: string
      description?: string | null
      property: {
        name: string
        code: string
        address: string
      }
      checklistRun: {
        id: string
        template: {
          id: string
          title: string
          items: ChecklistItem[]
        }
      } | null
    }
  }
  isExpired: boolean
}

type AnswerState = {
  templateItemId: string
  valueBoolean?: boolean | null
  valueText?: string | null
  valueNumber?: number | null
  valueSelect?: string | null
  notes?: string | null
  photoUrls?: string[] | null
}

function currentLocalDateTimeValue() {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

export default function PartnerChecklistPage() {
  const params = useParams()
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [data, setData] = useState<Payload | null>(null)
  const [startedAt, setStartedAt] = useState(currentLocalDateTimeValue())
  const [completedAt, setCompletedAt] = useState(currentLocalDateTimeValue())
  const [resultNotes, setResultNotes] = useState("")
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})

  async function loadData() {
    if (!token) return

    try {
      setLoading(true)
      setError("")
      setSuccessMessage("")

      const res = await fetch(`/api/checklist-links/${token}`, {
        cache: "no-store",
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(payload?.error || "Αποτυχία φόρτωσης checklist.")
      }

      setData(payload)

      const items =
        payload?.assignment?.task?.checklistRun?.template?.items || []

      const initialAnswers: Record<string, AnswerState> = {}

      for (const item of items) {
        initialAnswers[item.id] = {
          templateItemId: item.id,
          valueBoolean: null,
          valueText: "",
          valueNumber: null,
          valueSelect: "",
          notes: "",
          photoUrls: [],
        }
      }

      setAnswers(initialAnswers)
    } catch (err) {
      console.error("Σφάλμα φόρτωσης checklist:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Παρουσιάστηκε σφάλμα κατά τη φόρτωση."
      )
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  function updateAnswer(itemId: string, patch: Partial<AnswerState>) {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        templateItemId: itemId,
        ...patch,
      },
    }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!token || !data?.assignment?.task?.checklistRun?.template?.items) return

    try {
      setSubmitting(true)
      setError("")
      setSuccessMessage("")

      const orderedItems = data.assignment.task.checklistRun.template.items

      const finalAnswers = orderedItems.map((item) => {
        const answer = answers[item.id] || {
          templateItemId: item.id,
        }

        return {
          templateItemId: item.id,
          valueBoolean:
            item.itemType === "boolean"
              ? answer.valueBoolean ?? null
              : null,
          valueText:
            item.itemType === "text" ? answer.valueText ?? null : null,
          valueNumber:
            item.itemType === "number" ? answer.valueNumber ?? null : null,
          valueSelect:
            item.itemType === "select" ? answer.valueSelect ?? null : null,
          notes: answer.notes ?? null,
          photoUrls: answer.photoUrls ?? [],
        }
      })

      const res = await fetch(`/api/checklist-links/${token}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startedAt,
          completedAt,
          resultNotes,
          answers: finalAnswers,
        }),
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(payload?.error || "Αποτυχία υποβολής checklist.")
      }

      setSuccessMessage(
        payload?.createdIssuesCount && payload.createdIssuesCount > 0
          ? `Το checklist υποβλήθηκε επιτυχώς. Δημιουργήθηκαν ${payload.createdIssuesCount} νέο/νέα συμβάντα.`
          : "Το checklist υποβλήθηκε επιτυχώς και η εργασία ενημερώθηκε."
      )
    } catch (err) {
      console.error("Σφάλμα υποβολής checklist:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Παρουσιάστηκε σφάλμα κατά την υποβολή."
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          Φόρτωση checklist...
        </div>
      </div>
    )
  }

  if (!data?.assignment) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm text-red-700">
          Δεν βρέθηκε το checklist.
        </div>
      </div>
    )
  }

  if (data.isExpired) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm text-red-700">
          Το link checklist έχει λήξει.
        </div>
      </div>
    )
  }

  const checklistTemplate = data.assignment.task.checklistRun?.template

  if (!checklistTemplate) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm text-red-700">
          Δεν υπάρχει ενεργό checklist για αυτή την εργασία.
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Checklist εργασίας</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          {data.assignment.task.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {data.assignment.task.property.name} • {data.assignment.task.property.code}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Πρότυπο: {checklistTemplate.title}
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ώρα έναρξης εργασίας
            </label>
            <input
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ώρα λήξης εργασίας
            </label>
            <input
              type="datetime-local"
              value={completedAt}
              onChange={(e) => setCompletedAt(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              required
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {checklistTemplate.items
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item, index) => {
              const current = answers[item.id] || { templateItemId: item.id }

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">
                        {index + 1}. {item.label}
                      </h3>

                      {item.isRequired ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                          Υποχρεωτικό
                        </span>
                      ) : null}

                      {item.requiresPhoto ? (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                          Με φωτογραφία
                        </span>
                      ) : null}

                      {item.opensIssueOnFail ? (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                          Δημιουργία συμβάντος
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {item.description || "Χωρίς περιγραφή"}
                    </p>
                  </div>

                  {item.itemType === "boolean" ? (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          updateAnswer(item.id, { valueBoolean: true })
                        }
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                          current.valueBoolean === true
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        Ναι
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateAnswer(item.id, { valueBoolean: false })
                        }
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                          current.valueBoolean === false
                            ? "bg-red-600 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        Όχι
                      </button>
                    </div>
                  ) : null}

                  {item.itemType === "text" ? (
                    <textarea
                      rows={3}
                      value={current.valueText || ""}
                      onChange={(e) =>
                        updateAnswer(item.id, { valueText: e.target.value })
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                      placeholder="Συμπλήρωσε απάντηση"
                    />
                  ) : null}

                  {item.itemType === "number" ? (
                    <input
                      type="number"
                      value={current.valueNumber ?? ""}
                      onChange={(e) =>
                        updateAnswer(item.id, {
                          valueNumber:
                            e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                      placeholder="Συμπλήρωσε αριθμό"
                    />
                  ) : null}

                  {item.itemType === "select" ? (
                    <select
                      value={current.valueSelect || ""}
                      onChange={(e) =>
                        updateAnswer(item.id, { valueSelect: e.target.value })
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                    >
                      <option value="">Επιλογή</option>
                      {(item.optionsText || "")
                        .split(",")
                        .map((option) => option.trim())
                        .filter(Boolean)
                        .map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                    </select>
                  ) : null}

                  <div className="mt-3">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Σημειώσεις βήματος
                    </label>
                    <textarea
                      rows={2}
                      value={current.notes || ""}
                      onChange={(e) =>
                        updateAnswer(item.id, { notes: e.target.value })
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                      placeholder="Προαιρετικές σημειώσεις"
                    />
                  </div>
                </div>
              )
            })}
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Συνολικές σημειώσεις εργασίας
          </label>
          <textarea
            rows={4}
            value={resultNotes}
            onChange={(e) => setResultNotes(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            placeholder="Συνολικό αποτέλεσμα εργασίας"
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
          >
            {submitting ? "Υποβολή..." : "Υποβολή checklist"}
          </button>
        </div>
      </form>
    </div>
  )
}