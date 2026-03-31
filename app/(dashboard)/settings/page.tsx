"use client"

import { useEffect, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

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

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      loadFailed: "Failed to load settings.",
      saveFailed: "Failed to save settings.",
      fillCompanyName: "Fill in company or organization name.",
      fillCompanyEmail: "Fill in contact email.",
      saveSuccess: "Settings were saved successfully.",
      saving: "Saving...",
      saveButton: "Save settings",

      title: "Settings",
      subtitle:
        "Central configuration for system, organization and default operational preferences.",

      systemLanguage: "System language",
      systemLanguageHint: "Active operating language",
      timezone: "Time zone",
      timezoneHint: "Default system time zone",
      notifications: "Notifications",
      notificationsHint: "Status of core notifications",
      enabled: "Enabled",
      disabled: "Disabled",

      organizationSection: "Organization details",
      organizationSectionHint: "Basic identity and contact information.",
      companyName: "Company / organization name",
      companyNamePlaceholder: "e.g. OPS Management",
      companyEmail: "Contact email",
      companyEmailPlaceholder: "e.g. info@ops.gr",
      companyPhone: "Phone",
      companyPhonePlaceholder: "e.g. 2810XXXXXX",
      companyAddress: "Address",
      companyAddressPlaceholder: "e.g. Heraklion, Crete",

      defaultsSection: "Operational defaults",
      defaultsSectionHint:
        "Settings that affect the daily operation of the system.",
      defaultTaskStatus: "Default task status",
      defaultPartnerStatus: "Default partner status",
      defaultCalendarView: "Default calendar view",
      languageLabel: "Language",
      notificationsToggle: "Enable notifications",
      notificationsToggleHint:
        "Core notifications for operations and updates",

      pending: "Pending",
      inProgress: "In progress",
      completed: "Completed",

      active: "Active",
      inactive: "Inactive",

      month: "Month",
      week: "Week",
      day: "Day",

      greek: "Greek",
      english: "English",
    }
  }

  return {
    loadFailed: "Αποτυχία φόρτωσης ρυθμίσεων.",
    saveFailed: "Αποτυχία αποθήκευσης ρυθμίσεων.",
    fillCompanyName: "Συμπλήρωσε όνομα εταιρείας ή οργανισμού.",
    fillCompanyEmail: "Συμπλήρωσε email επικοινωνίας.",
    saveSuccess: "Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς.",
    saving: "Αποθήκευση...",
    saveButton: "Αποθήκευση ρυθμίσεων",

    title: "Ρυθμίσεις",
    subtitle:
      "Κεντρική παραμετροποίηση συστήματος, οργανισμού και προεπιλεγμένων λειτουργιών.",

    systemLanguage: "Γλώσσα συστήματος",
    systemLanguageHint: "Ενεργή γλώσσα λειτουργίας",
    timezone: "Ζώνη ώρας",
    timezoneHint: "Προεπιλεγμένη ζώνη ώρας συστήματος",
    notifications: "Ειδοποιήσεις",
    notificationsHint: "Κατάσταση βασικών ειδοποιήσεων",
    enabled: "Ενεργές",
    disabled: "Ανενεργές",

    organizationSection: "Στοιχεία οργανισμού",
    organizationSectionHint: "Βασικά στοιχεία ταυτότητας και επικοινωνίας.",
    companyName: "Όνομα εταιρείας / οργανισμού",
    companyNamePlaceholder: "π.χ. OPS Management",
    companyEmail: "Email επικοινωνίας",
    companyEmailPlaceholder: "π.χ. info@ops.gr",
    companyPhone: "Τηλέφωνο",
    companyPhonePlaceholder: "π.χ. 2810XXXXXX",
    companyAddress: "Διεύθυνση",
    companyAddressPlaceholder: "π.χ. Ηράκλειο, Κρήτη",

    defaultsSection: "Λειτουργικές προεπιλογές",
    defaultsSectionHint:
      "Ρυθμίσεις που επηρεάζουν την καθημερινή λειτουργία του συστήματος.",
    defaultTaskStatus: "Προεπιλεγμένη κατάσταση εργασίας",
    defaultPartnerStatus: "Προεπιλεγμένη κατάσταση συνεργάτη",
    defaultCalendarView: "Προεπιλεγμένη προβολή ημερολογίου",
    languageLabel: "Γλώσσα",
    notificationsToggle: "Ενεργοποίηση ειδοποιήσεων",
    notificationsToggleHint:
      "Βασικές ειδοποιήσεις για λειτουργίες και ενημερώσεις",

    pending: "Σε αναμονή",
    inProgress: "Σε εξέλιξη",
    completed: "Ολοκληρωμένη",

    active: "Ενεργός",
    inactive: "Ανενεργός",

    month: "Μήνας",
    week: "Εβδομάδα",
    day: "Ημέρα",

    greek: "Ελληνικά",
    english: "English",
  }
}

export default function SettingsPage() {
  const { language } = useAppLanguage()
  const texts = getTexts(language)

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
        throw new Error(texts.loadFailed)
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
      setError(texts.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setError("")
    setSuccess("")

    if (!form.companyName.trim()) {
      setError(texts.fillCompanyName)
      return
    }

    if (!form.companyEmail.trim()) {
      setError(texts.fillCompanyEmail)
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
        throw new Error(data?.error || texts.saveFailed)
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

      setSuccess(texts.saveSuccess)
    } catch (err) {
      console.error("Save settings error:", err)
      setError(
        err instanceof Error ? err.message : texts.saveFailed
      )
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [language])

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
            {texts.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{texts.subtitle}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{texts.systemLanguage}</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {form.language === "el" ? texts.greek : texts.english}
          </p>
          <p className="mt-2 text-xs text-slate-500">{texts.systemLanguageHint}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{texts.timezone}</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {form.timezone}
          </p>
          <p className="mt-2 text-xs text-slate-500">{texts.timezoneHint}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{texts.notifications}</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {form.notificationsEnabled ? texts.enabled : texts.disabled}
          </p>
          <p className="mt-2 text-xs text-slate-500">{texts.notificationsHint}</p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {texts.organizationSection}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {texts.organizationSectionHint}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.companyName}
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder={texts.companyNamePlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.companyEmail}
              </label>
              <input
                type="email"
                value={form.companyEmail}
                onChange={(e) => updateField("companyEmail", e.target.value)}
                placeholder={texts.companyEmailPlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.companyPhone}
              </label>
              <input
                type="text"
                value={form.companyPhone}
                onChange={(e) => updateField("companyPhone", e.target.value)}
                placeholder={texts.companyPhonePlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.companyAddress}
              </label>
              <input
                type="text"
                value={form.companyAddress}
                onChange={(e) => updateField("companyAddress", e.target.value)}
                placeholder={texts.companyAddressPlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {texts.defaultsSection}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {texts.defaultsSectionHint}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.defaultTaskStatus}
              </label>
              <select
                value={form.defaultTaskStatus}
                onChange={(e) =>
                  updateField("defaultTaskStatus", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="pending">{texts.pending}</option>
                <option value="in_progress">{texts.inProgress}</option>
                <option value="completed">{texts.completed}</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.defaultPartnerStatus}
              </label>
              <select
                value={form.defaultPartnerStatus}
                onChange={(e) =>
                  updateField("defaultPartnerStatus", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="active">{texts.active}</option>
                <option value="inactive">{texts.inactive}</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.timezone}
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
                {texts.defaultCalendarView}
              </label>
              <select
                value={form.calendarDefaultView}
                onChange={(e) =>
                  updateField("calendarDefaultView", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="month">{texts.month}</option>
                <option value="week">{texts.week}</option>
                <option value="day">{texts.day}</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.languageLabel}
              </label>
              <select
                value={form.language}
                onChange={(e) => updateField("language", e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="el">{texts.greek}</option>
                <option value="en">{texts.english}</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {texts.notificationsToggle}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {texts.notificationsToggleHint}
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
            {saving ? texts.saving : texts.saveButton}
          </button>
        </section>
      </form>
    </div>
  )
}