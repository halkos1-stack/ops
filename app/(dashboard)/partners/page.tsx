"use client"

import { useEffect, useMemo, useState } from "react"

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

function getStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "Ενεργός"
    case "inactive":
      return "Ανενεργός"
    default:
      return status
  }
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [specialty, setSpecialty] = useState("Καθαρισμός")
  const [status, setStatus] = useState("active")
  const [notes, setNotes] = useState("")
  const [search, setSearch] = useState("")

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function loadPartners() {
    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/partners", {
        cache: "no-store",
      })

      if (!res.ok) {
        throw new Error("Αποτυχία φόρτωσης συνεργατών")
      }

      const data = await res.json()
      setPartners(data)
    } catch (err) {
      console.error("Load partners error:", err)
      setError("Δεν ήταν δυνατή η φόρτωση των συνεργατών.")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreatePartner(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setError("")
    setSuccess("")

    if (!name.trim()) {
      setError("Συμπλήρωσε όνομα συνεργάτη.")
      return
    }

    if (!email.trim()) {
      setError("Συμπλήρωσε email συνεργάτη.")
      return
    }

    if (!specialty.trim()) {
      setError("Συμπλήρωσε ειδικότητα.")
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
        throw new Error(data?.error || "Αποτυχία δημιουργίας συνεργάτη")
      }

      setName("")
      setEmail("")
      setPhone("")
      setSpecialty("Καθαρισμός")
      setStatus("active")
      setNotes("")
      setSuccess("Ο συνεργάτης δημιουργήθηκε επιτυχώς.")

      await loadPartners()
    } catch (err) {
      console.error("Create partner error:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Δεν ήταν δυνατή η δημιουργία του συνεργάτη."
      )
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadPartners()
  }, [])

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
          Συνεργάτες
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Διαχείριση συνεργατών, ειδικοτήτων και λειτουργικής διαθεσιμότητας.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Σύνολο συνεργατών</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {totalPartners}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Ενεργοί</p>
          <p className="mt-3 text-3xl font-bold text-green-600">
            {activePartners}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Ανενεργοί</p>
          <p className="mt-3 text-3xl font-bold text-slate-700">
            {inactivePartners}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Δημιουργία συνεργάτη
          </h2>
        </div>

        <form
          onSubmit={handleCreatePartner}
          className="grid grid-cols-1 gap-4 lg:grid-cols-12"
        >
          <div className="lg:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Όνομα
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="π.χ. Μαρία Παπαδάκη"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
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
              Τηλέφωνο
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
              Ειδικότητα
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Καθαρισμός">Καθαρισμός</option>
              <option value="Συντήρηση">Συντήρηση</option>
              <option value="Τεχνικός έλεγχος">Τεχνικός έλεγχος</option>
              <option value="Επιθεώρηση">Επιθεώρηση</option>
              <option value="Αναλώσιμα">Αναλώσιμα</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Κατάσταση
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="active">Ενεργός</option>
              <option value="inactive">Ανενεργός</option>
            </select>
          </div>

          <div className="lg:col-span-9">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Σημειώσεις
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Εσωτερικές σημειώσεις για τον συνεργάτη"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-end lg:col-span-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Αποθήκευση..." : "Προσθήκη συνεργάτη"}
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

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Λίστα συνεργατών
            </h2>
          </div>

          <div className="w-full md:w-80">
            <input
              type="text"
              placeholder="Αναζήτηση σε κωδικό, όνομα, email..."
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
                  Κωδικός
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Όνομα
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Τηλέφωνο
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Ειδικότητα
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Κατάσταση
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-sm text-slate-500">
                    Φόρτωση συνεργατών...
                  </td>
                </tr>
              ) : filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    Δεν υπάρχουν ακόμη συνεργάτες.
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
                      {partner.phone || "—"}
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
                        {getStatusLabel(partner.status)}
                      </span>
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