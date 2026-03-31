"use client"

import { useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { getAccountPageTexts } from "@/lib/i18n/translations"

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
  const { language } = useAppLanguage()
  const texts = getAccountPageTexts(language)

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
        throw new Error(data?.error || texts.apiChangeFailed)
      }

      setForm(initialFormState)
      setSuccess(texts.successMessage)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : texts.apiUnknownError
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
            {texts.pageEyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {texts.pageTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {texts.pageDescription}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,720px)_minmax(280px,1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {texts.formTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {texts.formDescription}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.currentPassword}
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
                placeholder={texts.currentPasswordPlaceholder}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.newPassword}
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
                placeholder={texts.newPasswordPlaceholder}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.confirmPassword}
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
                placeholder={texts.confirmPasswordPlaceholder}
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
              {saving ? texts.saving : texts.submit}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            {texts.securityTitle}
          </h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            {texts.securityTips.map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}