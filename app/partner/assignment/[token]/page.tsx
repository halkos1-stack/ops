"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

type AssignmentPayload = {
  assignment: {
    id: string
    status: string
    partner: {
      id: string
      name: string
      email: string
    }
    task: {
      id: string
      title: string
      description?: string | null
      scheduledDate: string
      scheduledStartTime?: string | null
      scheduledEndTime?: string | null
      requiresChecklist: boolean
      property: {
        id: string
        name: string
        code: string
        address: string
      }
      checklistRun?: {
        id: string
        template?: {
          id: string
          title: string
        } | null
      } | null
    }
  }
  isExpired: boolean
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

export default function PartnerAssignmentPage() {
  const params = useParams()
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [checklistLink, setChecklistLink] = useState("")
  const [data, setData] = useState<AssignmentPayload | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  async function loadData() {
    if (!token) return

    try {
      setLoading(true)
      setError("")
      setSuccessMessage("")

      const res = await fetch(`/api/assignment-links/${token}`, {
        cache: "no-store",
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(payload?.error || "Αποτυχία φόρτωσης ανάθεσης.")
      }

      setData(payload)
    } catch (err) {
      console.error("Σφάλμα φόρτωσης ανάθεσης:", err)
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

  async function handleRespond(action: "accept" | "reject") {
    if (!token) return

    try {
      setSubmitting(true)
      setError("")
      setSuccessMessage("")
      setChecklistLink("")

      const res = await fetch(`/api/assignment-links/${token}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          rejectionReason: action === "reject" ? rejectionReason : null,
        }),
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(payload?.error || "Αποτυχία ενημέρωσης ανάθεσης.")
      }

      if (action === "accept") {
        setSuccessMessage("Η εργασία έγινε αποδεκτή επιτυχώς.")
        if (payload?.checklistLink) {
          setChecklistLink(payload.checklistLink)
        }
      } else {
        setSuccessMessage("Η εργασία απορρίφθηκε επιτυχώς.")
      }

      await loadData()
    } catch (err) {
      console.error("Σφάλμα απάντησης ανάθεσης:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Παρουσιάστηκε σφάλμα κατά την ενημέρωση."
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          Φόρτωση ανάθεσης...
        </div>
      </div>
    )
  }

  if (!data?.assignment) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm text-red-700">
          Δεν βρέθηκε η ανάθεση.
        </div>
      </div>
    )
  }

  if (data.isExpired) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm text-red-700">
          Το link αποδοχής έχει λήξει.
        </div>
      </div>
    )
  }

  const assignment = data.assignment

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Ανάθεση εργασίας</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          {assignment.task.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Συνεργάτης: {assignment.partner.name}
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
          {checklistLink ? (
            <div className="mt-3">
              <a
                href={checklistLink}
                className="inline-flex rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Άνοιγμα checklist
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3 text-sm text-slate-700">
          <div>
            <strong>Ακίνητο:</strong> {assignment.task.property.name}
          </div>
          <div>
            <strong>Κωδικός:</strong> {assignment.task.property.code}
          </div>
          <div>
            <strong>Διεύθυνση:</strong> {assignment.task.property.address}
          </div>
          <div>
            <strong>Ημερομηνία:</strong> {formatDate(assignment.task.scheduledDate)}
          </div>
          <div>
            <strong>Ώρα:</strong> {assignment.task.scheduledStartTime || "—"}
            {assignment.task.scheduledEndTime
              ? ` - ${assignment.task.scheduledEndTime}`
              : ""}
          </div>
          <div>
            <strong>Απαιτεί checklist:</strong>{" "}
            {assignment.task.requiresChecklist ? "Ναι" : "Όχι"}
          </div>
          {assignment.task.checklistRun?.template?.title ? (
            <div>
              <strong>Πρότυπο checklist:</strong>{" "}
              {assignment.task.checklistRun.template.title}
            </div>
          ) : null}
          <div>
            <strong>Περιγραφή:</strong>{" "}
            {assignment.task.description || "Δεν υπάρχει περιγραφή."}
          </div>
        </div>
      </section>

      {assignment.status === "assigned" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Αιτιολογία απόρριψης
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                placeholder="Συμπλήρωσε μόνο αν θέλεις να απορρίψεις την ανάθεση."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleRespond("accept")}
                disabled={submitting}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
              >
                {submitting ? "Αναμονή..." : "Αποδοχή"}
              </button>

              <button
                onClick={() => handleRespond("reject")}
                disabled={submitting}
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white"
              >
                {submitting ? "Αναμονή..." : "Απόρριψη"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {assignment.status === "accepted" && checklistLink ? (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <a
            href={checklistLink}
            className="inline-flex rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Μετάβαση στο checklist
          </a>
        </section>
      ) : null}
    </div>
  )
}