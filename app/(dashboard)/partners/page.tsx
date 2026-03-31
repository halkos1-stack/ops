"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type Partner = {
  id: string
  code: string
  name: string
  email: string
  phone: string | null
  specialty: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

type PortalAccessResponse = {
  partner: {
    id: string
    name: string
    email: string
  }
  portalAccess: {
    id: string
    token: string
    isActive: boolean
    expiresAt?: string | null
    createdAt: string
    lastUsedAt?: string | null
    portalUrl: string
  } | null
}

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      loadFailed: "Failed to load partners.",
      createFailed: "Failed to create partner.",
      createSuccess: "The partner was created successfully.",
      fillName: "Fill in partner name.",
      fillEmail: "Fill in partner email.",
      fillSpecialty: "Fill in specialty.",
      portalCreateFailed: "Failed to create portal link.",
      portalLoadFailed: "Failed to load portal link.",
      portalMissing: "There is no active portal link for this partner yet.",
      portalCreateSuccess: "Portal link was created successfully.",
      portalLoadSuccess: "Portal link was loaded successfully.",
      portalCopySuccess: "Portal link was copied.",
      portalCopyFailed: "Failed to copy portal link.",
      noPhone: "—",

      title: "Partners",
      subtitle:
        "Manage partners, specialties, availability and access to the partner portal.",

      totalPartners: "Total partners",
      activePartners: "Active",
      inactivePartners: "Inactive",

      createSection: "Create partner",
      name: "Name",
      email: "Email",
      phone: "Phone",
      specialty: "Specialty",
      status: "Status",
      notes: "Notes",
      save: "Save...",
      addPartner: "Add partner",

      cleaning: "Cleaning",
      maintenance: "Maintenance",
      technicalCheck: "Technical check",
      inspection: "Inspection",
      supplies: "Supplies",

      active: "Active",
      inactive: "Inactive",

      notesPlaceholder: "Internal notes for the partner",

      portalTitle: "Partner portal",
      portalPartner: "Partner",
      portalLink: "Portal link",
      portalCreatedAt: "Created at",
      portalLastUsedAt: "Last used",
      copyLink: "Copy link",
      openPortal: "Open portal",

      listTitle: "Partners list",
      searchPlaceholder: "Search by code, name, email...",
      loading: "Loading partners...",
      empty: "There are no partners yet.",

      code: "Code",
      portal: "Portal",

      generateLink: "New link",
      loadingCreate: "Creating...",
      viewLink: "View link",
      loadingLoad: "Loading...",
    }
  }

  return {
    loadFailed: "Αποτυχία φόρτωσης συνεργατών.",
    createFailed: "Αποτυχία δημιουργίας συνεργάτη.",
    createSuccess: "Ο συνεργάτης δημιουργήθηκε επιτυχώς.",
    fillName: "Συμπλήρωσε όνομα συνεργάτη.",
    fillEmail: "Συμπλήρωσε email συνεργάτη.",
    fillSpecialty: "Συμπλήρωσε ειδικότητα.",
    portalCreateFailed: "Αποτυχία δημιουργίας portal link.",
    portalLoadFailed: "Αποτυχία φόρτωσης portal link.",
    portalMissing: "Δεν υπάρχει ακόμη ενεργό portal link για αυτόν τον συνεργάτη.",
    portalCreateSuccess: "Το portal link δημιουργήθηκε επιτυχώς.",
    portalLoadSuccess: "Το portal link φορτώθηκε επιτυχώς.",
    portalCopySuccess: "Το portal link αντιγράφηκε.",
    portalCopyFailed: "Δεν ήταν δυνατή η αντιγραφή του link.",
    noPhone: "—",

    title: "Συνεργάτες",
    subtitle:
      "Διαχείριση συνεργατών, ειδικοτήτων, διαθεσιμότητας και πρόσβασης στο partner portal.",

    totalPartners: "Σύνολο συνεργατών",
    activePartners: "Ενεργοί",
    inactivePartners: "Ανενεργοί",

    createSection: "Δημιουργία συνεργάτη",
    name: "Όνομα",
    email: "Email",
    phone: "Τηλέφωνο",
    specialty: "Ειδικότητα",
    status: "Κατάσταση",
    notes: "Σημειώσεις",
    save: "Αποθήκευση...",
    addPartner: "Προσθήκη συνεργάτη",

    cleaning: "Καθαρισμός",
    maintenance: "Συντήρηση",
    technicalCheck: "Τεχνικός έλεγχος",
    inspection: "Επιθεώρηση",
    supplies: "Αναλώσιμα",

    active: "Ενεργός",
    inactive: "Ανενεργός",

    notesPlaceholder: "Εσωτερικές σημειώσεις για τον συνεργάτη",

    portalTitle: "Partner portal",
    portalPartner: "Συνεργάτης",
    portalLink: "Portal link",
    portalCreatedAt: "Δημιουργία",
    portalLastUsedAt: "Τελευταία χρήση",
    copyLink: "Αντιγραφή link",
    openPortal: "Άνοιγμα portal",

    listTitle: "Λίστα συνεργατών",
    searchPlaceholder: "Αναζήτηση σε κωδικό, όνομα, email...",
    loading: "Φόρτωση συνεργατών...",
    empty: "Δεν υπάρχουν ακόμη συνεργάτες.",

    code: "Κωδικός",
    portal: "Portal",

    generateLink: "Νέο link",
    loadingCreate: "Δημιουργία...",
    viewLink: "Προβολή link",
    loadingLoad: "Φόρτωση...",
  }
}

function getStatusBadgeClasses(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-green-100 text-green-700 border border-green-200"
    case "inactive":
      return "bg-slate-100 text-slate-700 border border-slate-200"
    default:
      return "bg-amber-100 text-amber-700 border border-amber-200"
  }
}

function getStatusLabel(status: string, language: "el" | "en") {
  const texts = getTexts(language)

  switch (status.toLowerCase()) {
    case "active":
      return texts.active
    case "inactive":
      return texts.inactive
    default:
      return status
  }
}

function formatDateTime(value: string | null | undefined, language: "el" | "en") {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat(language === "el" ? "el-GR" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default function PartnersPage() {
  const { language } = useAppLanguage()
  const texts = getTexts(language)

  const [partners, setPartners] = useState<Partner[]>([])

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [specialty, setSpecialty] = useState(
    language === "en" ? texts.cleaning : texts.cleaning
  )
  const [status, setStatus] = useState("active")
  const [notes, setNotes] = useState("")
  const [search, setSearch] = useState("")

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [portalLoadingId, setPortalLoadingId] = useState<string | null>(null)
  const [portalError, setPortalError] = useState("")
  const [portalSuccess, setPortalSuccess] = useState("")
  const [portalPartnerName, setPortalPartnerName] = useState("")
  const [portalUrl, setPortalUrl] = useState("")
  const [portalCreatedAt, setPortalCreatedAt] = useState<string | null>(null)
  const [portalLastUsedAt, setPortalLastUsedAt] = useState<string | null>(null)
  const [showPortalBox, setShowPortalBox] = useState(false)

  async function loadPartners() {
    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/partners", {
        cache: "no-store",
      })

      if (!res.ok) {
        throw new Error(texts.loadFailed)
      }

      const data = await res.json()
      setPartners(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Load partners error:", err)
      setError(texts.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreatePartner(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setError("")
    setSuccess("")

    if (!name.trim()) {
      setError(texts.fillName)
      return
    }

    if (!email.trim()) {
      setError(texts.fillEmail)
      return
    }

    if (!specialty.trim()) {
      setError(texts.fillSpecialty)
      return
    }

    try {
      setSubmitting(true)

      const res = await fetch("/api/partners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          specialty: specialty.trim(),
          status,
          notes: notes.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || texts.createFailed)
      }

      setName("")
      setEmail("")
      setPhone("")
      setSpecialty(texts.cleaning)
      setStatus("active")
      setNotes("")
      setSuccess(texts.createSuccess)

      await loadPartners()
    } catch (err) {
      console.error("Create partner error:", err)
      setError(
        err instanceof Error ? err.message : texts.createFailed
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGeneratePortalLink(partnerId: string) {
    try {
      setPortalLoadingId(partnerId)
      setPortalError("")
      setPortalSuccess("")
      setShowPortalBox(false)

      const res = await fetch(`/api/partners/${partnerId}/portal-link`, {
        method: "POST",
      })

      const data = (await res.json().catch(() => null)) as PortalAccessResponse | null

      if (!res.ok) {
        throw new Error(
          data && "error" in (data as any)
            ? (data as any).error
            : texts.portalCreateFailed
        )
      }

      setPortalPartnerName(data?.partner?.name || "")
      setPortalUrl(data?.portalAccess?.portalUrl || "")
      setPortalCreatedAt(data?.portalAccess?.createdAt || null)
      setPortalLastUsedAt(data?.portalAccess?.lastUsedAt || null)
      setPortalSuccess(texts.portalCreateSuccess)
      setShowPortalBox(true)
    } catch (err) {
      console.error("Generate portal link error:", err)
      setPortalError(
        err instanceof Error ? err.message : texts.portalCreateFailed
      )
    } finally {
      setPortalLoadingId(null)
    }
  }

  async function handleLoadExistingPortalLink(partnerId: string) {
    try {
      setPortalLoadingId(partnerId)
      setPortalError("")
      setPortalSuccess("")
      setShowPortalBox(false)

      const res = await fetch(`/api/partners/${partnerId}/portal-link`, {
        cache: "no-store",
      })

      const data = (await res.json().catch(() => null)) as PortalAccessResponse | null

      if (!res.ok) {
        throw new Error(
          data && "error" in (data as any)
            ? (data as any).error
            : texts.portalLoadFailed
        )
      }

      if (!data?.portalAccess?.portalUrl) {
        throw new Error(texts.portalMissing)
      }

      setPortalPartnerName(data?.partner?.name || "")
      setPortalUrl(data?.portalAccess?.portalUrl || "")
      setPortalCreatedAt(data?.portalAccess?.createdAt || null)
      setPortalLastUsedAt(data?.portalAccess?.lastUsedAt || null)
      setPortalSuccess(texts.portalLoadSuccess)
      setShowPortalBox(true)
    } catch (err) {
      console.error("Load portal link error:", err)
      setPortalError(
        err instanceof Error ? err.message : texts.portalLoadFailed
      )
    } finally {
      setPortalLoadingId(null)
    }
  }

  async function handleCopyPortalLink() {
    try {
      if (!portalUrl) return
      await navigator.clipboard.writeText(portalUrl)
      setPortalSuccess(texts.portalCopySuccess)
    } catch (err) {
      console.error("Copy portal link error:", err)
      setPortalError(texts.portalCopyFailed)
    }
  }

  useEffect(() => {
    loadPartners()
  }, [language])

  useEffect(() => {
    setSpecialty((prev) => {
      const values = [
        "Καθαρισμός",
        "Συντήρηση",
        "Τεχνικός έλεγχος",
        "Επιθεώρηση",
        "Αναλώσιμα",
        "Cleaning",
        "Maintenance",
        "Technical check",
        "Inspection",
        "Supplies",
      ]

      if (values.includes(prev)) {
        return texts.cleaning
      }

      return prev
    })
  }, [texts.cleaning])

  const filteredPartners = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return partners

    return partners.filter((partner) => {
      return (
        partner.code.toLowerCase().includes(query) ||
        partner.name.toLowerCase().includes(query) ||
        partner.email.toLowerCase().includes(query) ||
        (partner.phone || "").toLowerCase().includes(query) ||
        partner.specialty.toLowerCase().includes(query)
      )
    })
  }, [partners, search])

  const totalPartners = partners.length
  const activePartners = partners.filter(
    (partner) => partner.status === "active"
  ).length
  const inactivePartners = partners.filter(
    (partner) => partner.status !== "active"
  ).length

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {texts.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{texts.subtitle}</p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{texts.totalPartners}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {totalPartners}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{texts.activePartners}</p>
          <p className="mt-3 text-3xl font-bold text-green-600">
            {activePartners}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{texts.inactivePartners}</p>
          <p className="mt-3 text-3xl font-bold text-slate-700">
            {inactivePartners}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {texts.createSection}
          </h2>
        </div>

        <form
          onSubmit={handleCreatePartner}
          className="grid grid-cols-1 gap-4 lg:grid-cols-12"
        >
          <div className="lg:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.name}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === "en" ? "e.g. Maria Papadaki" : "π.χ. Μαρία Παπαδάκη"}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="partner@email.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.phone}
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="69XXXXXXXX"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.specialty}
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value={texts.cleaning}>{texts.cleaning}</option>
              <option value={texts.maintenance}>{texts.maintenance}</option>
              <option value={texts.technicalCheck}>{texts.technicalCheck}</option>
              <option value={texts.inspection}>{texts.inspection}</option>
              <option value={texts.supplies}>{texts.supplies}</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.status}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="active">{texts.active}</option>
              <option value="inactive">{texts.inactive}</option>
            </select>
          </div>

          <div className="lg:col-span-9">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.notes}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={texts.notesPlaceholder}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-end lg:col-span-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? texts.save : texts.addPartner}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}
      </section>

      {(portalError || portalSuccess || showPortalBox) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {texts.portalTitle}
            </h2>
          </div>

          {portalError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {portalError}
            </div>
          ) : null}

          {portalSuccess ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {portalSuccess}
            </div>
          ) : null}

          {showPortalBox && portalUrl ? (
            <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {texts.portalPartner}
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  {portalPartnerName}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {texts.portalLink}
                </div>
                <div className="mt-1 break-all rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  {portalUrl}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{texts.portalCreatedAt}:</span>{" "}
                  {formatDateTime(portalCreatedAt, language)}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{texts.portalLastUsedAt}:</span>{" "}
                  {formatDateTime(portalLastUsedAt, language)}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopyPortalLink}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {texts.copyLink}
                </button>

                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {texts.openPortal}
                </a>
              </div>
            </div>
          ) : null}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {texts.listTitle}
            </h2>
          </div>

          <div className="w-full md:w-80">
            <input
              type="text"
              placeholder={texts.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  {texts.code}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  {texts.name}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  {texts.email}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  {texts.phone}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  {texts.specialty}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  {texts.status}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  {texts.portal}
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-sm text-slate-500">
                    {texts.loading}
                  </td>
                </tr>
              ) : filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                    {texts.empty}
                  </td>
                </tr>
              ) : (
                filteredPartners.map((partner) => (
                  <tr
                    key={partner.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {partner.code}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {partner.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {partner.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {partner.phone || texts.noPhone}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {partner.specialty}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
                          partner.status
                        )}`}
                      >
                        {getStatusLabel(partner.status, language)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleGeneratePortalLink(partner.id)}
                          disabled={portalLoadingId === partner.id}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {portalLoadingId === partner.id
                            ? texts.loadingCreate
                            : texts.generateLink}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleLoadExistingPortalLink(partner.id)}
                          disabled={portalLoadingId === partner.id}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {portalLoadingId === partner.id
                            ? texts.loadingLoad
                            : texts.viewLink}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}