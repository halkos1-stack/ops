"use client"

import Link from "next/link"
import { use, useEffect, useState } from "react"

type ActivationInfo = {
  valid: boolean
  user: {
    id: string
    name: string | null
    email: string
  }
  organization: {
    id: string
    name: string
    slug: string
  }
  expiresAt: string
}

type PageProps = {
  params: Promise<{
    token: string
  }>
}

async function readJsonSafely(res: Response) {
  const text = await res.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return {
      error: text.startsWith("<!DOCTYPE") || text.startsWith("<html")
        ? "Το route ενεργοποίησης επέστρεψε HTML αντί για JSON."
        : "Μη έγκυρη απάντηση από τον server.",
    }
  }
}

export default function ActivateAccountPage({ params }: PageProps) {
  const { token } = use(params)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [info, setInfo] = useState<ActivationInfo | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function loadActivationInfo() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/activation/${token}`, {
        method: "GET",
        cache: "no-store",
      })

      const data = await readJsonSafely(res)

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία φόρτωσης στοιχείων ενεργοποίησης.")
      }

      if (!data) {
        throw new Error("Δεν επιστράφηκαν στοιχεία ενεργοποίησης.")
      }

      setInfo(data)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Άγνωστο σφάλμα φόρτωσης στοιχείων ενεργοποίησης."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivationInfo()
  }, [token])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)

      const res = await fetch(`/api/activation/${token}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword,
          confirmPassword,
        }),
      })

      const data = await readJsonSafely(res)

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία ενεργοποίησης λογαριασμού.")
      }

      setSuccess("Ο λογαριασμός ενεργοποιήθηκε επιτυχώς. Μπορείς τώρα να συνδεθείς.")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Άγνωστο σφάλμα ενεργοποίησης λογαριασμού."
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {loading ? (
          <div className="text-center text-sm text-slate-500">
            Φόρτωση στοιχείων ενεργοποίησης...
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>

            <Link
              href="/login"
              className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Επιστροφή στη σύνδεση
            </Link>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>

            <Link
              href="/login"
              className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Μετάβαση στη σύνδεση
            </Link>
          </div>
        ) : info ? (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Ενεργοποίηση λογαριασμού
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                {info.organization.name}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Ο λογαριασμός <span className="font-semibold">{info.user.email}</span> είναι έτοιμος για ενεργοποίηση.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold">Χρήστης:</span>{" "}
                {info.user.name || "—"}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Email:</span> {info.user.email}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Νέος κωδικός
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  placeholder="τουλάχιστον 8 χαρακτήρες"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Επιβεβαίωση νέου κωδικού
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  placeholder="επανάληψη νέου κωδικού"
                  required
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Ενεργοποίηση..." : "Ενεργοποίηση λογαριασμού"}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  )
}