"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type PropertyRow = {
  id: string
  name: string
  code: string
  address: string
  status?: string | null
  propertyChecklistTemplate?: {
    id: string
    title?: string | null
    name?: string | null
    isActive?: boolean | null
    items?: Array<{ id: string }>
  } | null
}

type ChecklistListRow = {
  propertyId: string
  propertyName: string
  propertyCode: string
  propertyAddress: string
  propertyStatus: string
  templateId: string | null
  checklistTitle: string
  checklistStatus: string
  totalItems: number
}

function mapStatusToUi(status: string | null | undefined) {
  if (!status) return "Ανενεργό"
  return status === "active" ? "Ενεργό" : "Ανενεργό"
}

export default function ChecklistsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<ChecklistListRow[]>([])

  async function loadData() {
    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/properties", {
        cache: "no-store",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία φόρτωσης checklist ακινήτων.")
      }

      const properties = Array.isArray(data) ? data : data.properties ?? []

      const mapped: ChecklistListRow[] = properties.map((property: PropertyRow) => {
        const template = property.propertyChecklistTemplate ?? null
        const templateTitle =
          template?.title?.trim() ||
          template?.name?.trim() ||
          "Δεν έχει δημιουργηθεί checklist"

        return {
          propertyId: property.id,
          propertyName: property.name || "-",
          propertyCode: property.code || "-",
          propertyAddress: property.address || "-",
          propertyStatus: mapStatusToUi(property.status),
          templateId: template?.id || null,
          checklistTitle: templateTitle,
          checklistStatus: template
            ? template.isActive === false
              ? "Ανενεργή"
              : "Ενεργή"
            : "Δεν υπάρχει",
          totalItems: Array.isArray(template?.items) ? template!.items!.length : 0,
        }
      })

      setRows(mapped)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Αποτυχία φόρτωσης checklist ακινήτων."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()

    if (!q) return rows

    return rows.filter((row) => {
      return (
        row.propertyName.toLowerCase().includes(q) ||
        row.propertyCode.toLowerCase().includes(q) ||
        row.propertyAddress.toLowerCase().includes(q) ||
        row.checklistTitle.toLowerCase().includes(q)
      )
    })
  }, [rows, search])

  const totalProperties = rows.length
  const withChecklist = rows.filter((x) => x.templateId).length
  const withoutChecklist = rows.filter((x) => !x.templateId).length
  const totalItems = rows.reduce((sum, row) => sum + row.totalItems, 0)

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Διαχείριση checklist ακινήτων</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Checklists ακινήτων
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Μία βασική checklist ανά ακίνητο. Από εδώ βλέπεις την κατάσταση όλων
              των checklist και ανοίγεις τη σωστή φόρμα διαχείρισης ανά ακίνητο.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Δεν χρησιμοποιούμε δεύτερη φόρμα checklist. Η επεξεργασία γίνεται μόνο
            μέσα από το κάθε ακίνητο.
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Σύνολο ακινήτων</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalProperties}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Με checklist</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{withChecklist}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Χωρίς checklist</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{withoutChecklist}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Σύνολο στοιχείων checklist</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalItems}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Λίστα checklist</h2>
            <p className="mt-2 text-sm text-slate-500">
              Επίλεξε ακίνητο για να δημιουργήσεις ή να επεξεργαστείς τη βασική του checklist.
            </p>
          </div>

          <div className="w-full lg:w-96">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Αναζήτηση σε ακίνητο, κωδικό, διεύθυνση, checklist..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
            Φόρτωση checklist ακινήτων...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Δεν βρέθηκαν εγγραφές.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-sm text-slate-500">
                  <th className="px-4 py-2">Ακίνητο</th>
                  <th className="px-4 py-2">Κωδικός</th>
                  <th className="px-4 py-2">Διεύθυνση</th>
                  <th className="px-4 py-2">Κατάσταση ακινήτου</th>
                  <th className="px-4 py-2">Checklist</th>
                  <th className="px-4 py-2">Κατάσταση checklist</th>
                  <th className="px-4 py-2">Στοιχεία</th>
                  <th className="px-4 py-2">Ενέργεια</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.propertyId}
                    className="rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-700"
                  >
                    <td className="rounded-l-2xl px-4 py-4 font-semibold text-slate-900">
                      {row.propertyName}
                    </td>
                    <td className="px-4 py-4">{row.propertyCode}</td>
                    <td className="px-4 py-4">{row.propertyAddress}</td>
                    <td className="px-4 py-4">{row.propertyStatus}</td>
                    <td className="px-4 py-4">{row.checklistTitle}</td>
                    <td className="px-4 py-4">{row.checklistStatus}</td>
                    <td className="px-4 py-4">{row.totalItems}</td>
                    <td className="rounded-r-2xl px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/properties/${row.propertyId}`}
                          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                        >
                          Προβολή ακινήτου
                        </Link>

                        <Link
                          href={`/property-checklists/${row.propertyId}`}
                          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          {row.templateId ? "Επεξεργασία checklist" : "Δημιουργία checklist"}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}