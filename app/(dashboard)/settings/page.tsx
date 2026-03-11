"use client"

import { useEffect, useState } from "react"

type SettingsData = {
  id?: string
  companyName: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
  defaultTaskStatus: string
  defaultPartnerStatus: string
  timezone: string
  language: string
  notificationsEnabled: boolean
  calendarDefaultView: string
  createdAt?: string
  updatedAt?: string
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsData>({
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    companyAddress: "",
    defaultTaskStatus: "pending",
    defaultPartnerStatus: "active",
    timezone: "Europe/Athens",
    language: "el",
    notificationsEnabled: true,
    calendarDefaultView: "month",
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  function updateField<K extends keyof SettingsData>(
    field: K,
    value: SettingsData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function loadSettings() {
    try {
      setLoading(true)
      setError("")
      setSuccess("")

      const res = await fetch("/api/settings", {
        cache: "no-store",
      })

      if (!res.ok) {
        throw new Error("Αποτυχία φόρτωσης ρυθμίσεων")
      }

      const data = await res.json()

      if (data) {
        setForm({
          id: data.id,
          companyName: data.companyName || "",
          companyEmail: data.companyEmail || "",
          companyPhone: data.companyPhone || "",
          companyAddress: data.companyAddress || "",
          defaultTaskStatus: data.defaultTaskStatus || "pending",
          defaultPartnerStatus: data.defaultPartnerStatus || "active",
          timezone: data.timezone || "Europe/Athens",
          language: data.language || "el",
          notificationsEnabled:
            typeof data.notificationsEnabled === "boolean"
              ? data.notificationsEnabled
              : true,
          calendarDefaultView: data.calendarDefaultView || "month",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
      }
    } catch (err) {
      console.error("Load settings error:", err)
      setError("Δεν ήταν δυνατή η φόρτωση των ρυθμίσεων.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setError("")
    setSuccess("")

    if (!form.companyName.trim()) {
      setError("Συμπλήρωσε όνομα εταιρείας ή οργανισμού.")
      return
    }

    if (!form.companyEmail.trim()) {
      setError("Συμπλήρωσε email επικοινωνίας.")
      return
    }

    try {
      setSaving(true)

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          companyEmail: form.companyEmail.trim(),
          companyPhone: form.companyPhone.trim(),
          companyAddress: form.companyAddress.trim(),
          defaultTaskStatus: form.defaultTaskStatus,
          defaultPartnerStatus: form.defaultPartnerStatus,
          timezone: form.timezone,
          language: form.language,
          notificationsEnabled: form.notificationsEnabled,
          calendarDefaultView: form.calendarDefaultView,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία αποθήκευσης ρυθμίσεων")
      }

      setForm({
        id: data.id,
        companyName: data.companyName || "",
        companyEmail: data.companyEmail || "",
        companyPhone: data.companyPhone || "",
        companyAddress: data.companyAddress || "",
        defaultTaskStatus: data.defaultTaskStatus || "pending",
        defaultPartnerStatus: data.defaultPartnerStatus || "active",
        timezone: data.timezone || "Europe/Athens",
        language: data.language || "el",
        notificationsEnabled:
          typeof data.notificationsEnabled === "boolean"
            ? data.notificationsEnabled
            : true,
        calendarDefaultView: data.calendarDefaultView || "month",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })

      setSuccess("Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς.")
    } catch (err) {
      console.error("Save settings error:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Δεν ήταν δυνατή η αποθήκευση των ρυθμίσεων."
      )
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <section>
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-96 animate-pulse rounded bg-slate-200" />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 h-8 w-20 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-3 w-32 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-52 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index}>
                <div className="mb-2 h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-12 rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Ρυθμίσεις
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Κεντρική παραμετροποίηση συστήματος, οργανισμού και προεπιλεγμένων
            λειτουργιών.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Γλώσσα συστήματος</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {form.language === "el" ? "Ελληνικά" : "English"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Ενεργή γλώσσα λειτουργίας
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Ζώνη ώρας</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {form.timezone}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Προεπιλεγμένη ζώνη ώρας συστήματος
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Ειδοποιήσεις</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {form.notificationsEnabled ? "Ενεργές" : "Ανενεργές"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Κατάσταση βασικών ειδοποιήσεων
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Στοιχεία οργανισμού
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Βασικά στοιχεία ταυτότητας και επικοινωνίας.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Όνομα εταιρείας / οργανισμού
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder="π.χ. OPS Management"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email επικοινωνίας
              </label>
              <input
                type="email"
                value={form.companyEmail}
                onChange={(e) => updateField("companyEmail", e.target.value)}
                placeholder="π.χ. info@ops.gr"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Τηλέφωνο
              </label>
              <input
                type="text"
                value={form.companyPhone}
                onChange={(e) => updateField("companyPhone", e.target.value)}
                placeholder="π.χ. 2810XXXXXX"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Διεύθυνση
              </label>
              <input
                type="text"
                value={form.companyAddress}
                onChange={(e) => updateField("companyAddress", e.target.value)}
                placeholder="π.χ. Ηράκλειο, Κρήτη"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Λειτουργικές προεπιλογές
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ρυθμίσεις που επηρεάζουν την καθημερινή λειτουργία του συστήματος.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Προεπιλεγμένη κατάσταση εργασίας
              </label>
              <select
                value={form.defaultTaskStatus}
                onChange={(e) =>
                  updateField("defaultTaskStatus", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="pending">Σε αναμονή</option>
                <option value="in_progress">Σε εξέλιξη</option>
                <option value="completed">Ολοκληρωμένη</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Προεπιλεγμένη κατάσταση συνεργάτη
              </label>
              <select
                value={form.defaultPartnerStatus}
                onChange={(e) =>
                  updateField("defaultPartnerStatus", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="active">Ενεργός</option>
                <option value="inactive">Ανενεργός</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Ζώνη ώρας
              </label>
              <select
                value={form.timezone}
                onChange={(e) => updateField("timezone", e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Europe/Athens">Europe/Athens</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Προεπιλεγμένη προβολή ημερολογίου
              </label>
              <select
                value={form.calendarDefaultView}
                onChange={(e) =>
                  updateField("calendarDefaultView", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="month">Μήνας</option>
                <option value="week">Εβδομάδα</option>
                <option value="day">Ημέρα</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Γλώσσα
              </label>
              <select
                value={form.language}
                onChange={(e) => updateField("language", e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="el">Ελληνικά</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Ενεργοποίηση ειδοποιήσεων
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Βασικές ειδοποιήσεις για λειτουργίες και ενημερώσεις
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateField("notificationsEnabled", !form.notificationsEnabled)
                }
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                  form.notificationsEnabled ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    form.notificationsEnabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {(error || success) && (
          <section>
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}
          </section>
        )}

        <section className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Αποθήκευση..." : "Αποθήκευση ρυθμίσεων"}
          </button>
        </section>
      </form>
    </div>
  )
}