"use client"

import { useState } from "react"

type PasswordFormState = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const initialFormState: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
}

export default function AccountPage() {
  const [form, setForm] = useState<PasswordFormState>(initialFormState)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία αλλαγής κωδικού.")
      }

      setForm(initialFormState)
      setSuccess("Ο κωδικός άλλαξε επιτυχώς.")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα αλλαγής κωδικού."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Λογαριασμός
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Ο λογαριασμός μου
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Από εδώ μπορείς να αλλάξεις τον προσωπικό σου κωδικό πρόσβασης με
            ασφαλή τρόπο, χρησιμοποιώντας τον τρέχοντα κωδικό σου.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,720px)_minmax(280px,1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Αλλαγή κωδικού</h2>
            <p className="mt-2 text-sm text-slate-600">
              Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες και να
              περιέχει τουλάχιστον ένα γράμμα και έναν αριθμό.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Τρέχων κωδικός
              </label>
              <input
                type="password"
                value={form.currentPassword}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    currentPassword: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                placeholder="Εισαγωγή τρέχοντος κωδικού"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Νέος κωδικός
              </label>
              <input
                type="password"
                value={form.newPassword}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    newPassword: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                placeholder="Εισαγωγή νέου κωδικού"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Επιβεβαίωση νέου κωδικού
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    confirmPassword: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                placeholder="Επανάληψη νέου κωδικού"
                required
              />
            </div>

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

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Αποθήκευση..." : "Αλλαγή κωδικού"}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Οδηγίες ασφάλειας</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>
              Χρησιμοποίησε διαφορετικό κωδικό από άλλες υπηρεσίες ή λογαριασμούς.
            </p>
            <p>
              Απόφυγε απλές λέξεις, ονόματα ή προβλέψιμους συνδυασμούς.
            </p>
            <p>
              Προτίμησε κωδικό με γράμματα, αριθμούς και μεγαλύτερο μήκος.
            </p>
            <p>
              Μετά την αλλαγή, χρησιμοποίησε μόνο τον νέο κωδικό στις επόμενες συνδέσεις.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}