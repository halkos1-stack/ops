"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type ChecklistTemplateSummary = {
  id: string
  title: string
  isPrimary: boolean
  isActive: boolean
  items?: Array<{ id: string }>
}

type Property = {
  id: string
  code: string
  name: string
  address: string
  city: string
  region: string
  postalCode: string
  country: string
  type: string
  status: string
  bedrooms: number
  bathrooms: number
  maxGuests: number
  notes: string | null
  checklistTemplates?: ChecklistTemplateSummary[]
  primaryChecklist?: ChecklistTemplateSummary | null
}

function createPropertyCode(name: string) {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-ZΑ-Ω0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 12)

  const random = Math.floor(1000 + Math.random() * 9000)
  return base ? `${base}-${random}` : `PROP-${random}`
}

function mapTypeToUi(type: string | null | undefined) {
  switch (type) {
    case "apartment":
      return "Διαμέρισμα"
    case "villa":
      return "Βίλα"
    case "house":
      return "Κατοικία"
    case "studio":
      return "Στούντιο"
    case "maisonette":
      return "Μεζονέτα"
    default:
      return type || "-"
  }
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [region, setRegion] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [country, setCountry] = useState("GR")
  const [type, setType] = useState("apartment")
  const [status, setStatus] = useState("Ενεργό")
  const [bedrooms, setBedrooms] = useState("0")
  const [bathrooms, setBathrooms] = useState("0")
  const [maxGuests, setMaxGuests] = useState("0")
  const [notes, setNotes] = useState("")

  async function loadProperties() {
    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/properties", {
        cache: "no-store",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία φόρτωσης ακινήτων.")
      }

      setProperties(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Αποτυχία φόρτωσης ακινήτων."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProperties()
  }, [])

  useEffect(() => {
    if (!code.trim() && name.trim()) {
      setCode(createPropertyCode(name))
    }
  }, [name, code])

  async function handleCreateProperty() {
    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const finalCode = code.trim() || createPropertyCode(name)

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: finalCode,
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          region: region.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
          type,
          status,
          bedrooms: Number(bedrooms || 0),
          bathrooms: Number(bathrooms || 0),
          maxGuests: Number(maxGuests || 0),
          notes: notes.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία δημιουργίας ακινήτου.")
      }

      setCode("")
      setName("")
      setAddress("")
      setCity("")
      setRegion("")
      setPostalCode("")
      setCountry("GR")
      setType("apartment")
      setStatus("Ενεργό")
      setBedrooms("0")
      setBathrooms("0")
      setMaxGuests("0")
      setNotes("")

      setSuccess("Το ακίνητο δημιουργήθηκε επιτυχώς.")
      await loadProperties()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Αποτυχία δημιουργίας ακινήτου."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm text-slate-500">Διαχείριση ακινήτων</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Ακίνητα</h1>
          <p className="mt-2 text-sm text-slate-500">
            Δημιουργία και διαχείριση ακινήτων του συστήματος OPS.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-2xl font-bold text-slate-900">Δημιουργία ακινήτου</h2>
          <p className="mt-2 text-sm text-slate-500">
            Καταχώρηση νέου ακινήτου με πλήρη βασικά στοιχεία.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Κωδικός ακινήτου
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="π.χ. PROP-1001"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Όνομα ακινήτου
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="π.χ. Βίλα Μαρία"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Διεύθυνση
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="Οδός / τοποθεσία ακινήτου"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Τύπος ακινήτου
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              >
                <option value="apartment">Διαμέρισμα</option>
                <option value="villa">Βίλα</option>
                <option value="house">Κατοικία</option>
                <option value="studio">Στούντιο</option>
                <option value="maisonette">Μεζονέτα</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Πόλη
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="π.χ. Ηράκλειο"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Περιοχή
              </label>
              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="π.χ. Κρήτη"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Τ.Κ.
              </label>
              <input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="π.χ. 71307"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Χώρα
              </label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="GR"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Κατάσταση
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              >
                <option value="Ενεργό">Ενεργό</option>
                <option value="Ανενεργό">Ανενεργό</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Υπνοδωμάτια
              </label>
              <input
                type="number"
                min="0"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Μπάνια
              </label>
              <input
                type="number"
                min="0"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Μέγιστοι επισκέπτες
              </label>
              <input
                type="number"
                min="0"
                value={maxGuests}
                onChange={(e) => setMaxGuests(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Σημειώσεις
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="Εσωτερικές σημειώσεις για το ακίνητο"
              />
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="mt-6">
            <button
              onClick={handleCreateProperty}
              disabled={saving}
              className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Αποθήκευση..." : "Προσθήκη ακινήτου"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Λίστα ακινήτων</h2>
          <p className="mt-2 text-sm text-slate-500">
            Όλα τα ακίνητα του συστήματος με πρόσβαση σε προβολή και checklist.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
            Φόρτωση ακινήτων...
          </div>
        ) : properties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Δεν υπάρχουν ακόμη ακίνητα.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-sm text-slate-500">
                  <th className="px-4 py-2">Όνομα</th>
                  <th className="px-4 py-2">Κωδικός</th>
                  <th className="px-4 py-2">Διεύθυνση</th>
                  <th className="px-4 py-2">Τύπος</th>
                  <th className="px-4 py-2">Κατάσταση</th>
                  <th className="px-4 py-2">Checklist</th>
                  <th className="px-4 py-2">Ενέργειες</th>
                </tr>
              </thead>

              <tbody>
                {properties.map((property) => {
                  const primaryTemplate =
                    property.primaryChecklist ||
                    property.checklistTemplates?.find((t) => t.isPrimary) ||
                    property.checklistTemplates?.[0]

                  return (
                    <tr
                      key={property.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-700"
                    >
                      <td className="rounded-l-2xl px-4 py-4 font-semibold text-slate-900">
                        {property.name}
                      </td>
                      <td className="px-4 py-4">{property.code}</td>
                      <td className="px-4 py-4">{property.address}</td>
                      <td className="px-4 py-4">{mapTypeToUi(property.type)}</td>
                      <td className="px-4 py-4">{property.status}</td>
                      <td className="px-4 py-4">
                        {primaryTemplate
                          ? `${primaryTemplate.title} (${primaryTemplate.items?.length || 0})`
                          : "Δεν υπάρχει"}
                      </td>
                      <td className="rounded-r-2xl px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/properties/${property.id}`}
                            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                          >
                            Προβολή
                          </Link>

                          <Link
                            href={`/property-checklists/${property.id}`}
                            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            Checklists
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}