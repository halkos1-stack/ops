"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

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
}

type ChecklistItem = {
  id: string
  label: string
  description?: string | null
  itemType: string
  isRequired: boolean
  sortOrder: number
  category?: string | null
  requiresPhoto?: boolean
  opensIssueOnFail?: boolean
  optionsText?: string | null
}

type ChecklistTemplate = {
  id: string
  propertyId: string
  title: string
  description?: string | null
  templateType: string
  isPrimary: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  items?: ChecklistItem[]
}

type ChecklistApiResponse = {
  templates: ChecklistTemplate[]
  primaryTemplate: ChecklistTemplate | null
}

type NewItem = {
  localId: string
  label: string
  description: string
  itemType: string
  isRequired: boolean
  sortOrder: number
  category: string
  requiresPhoto: boolean
  opensIssueOnFail: boolean
  optionsText: string
}

function cls(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
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

function mapTemplateTypeToUi(templateType: string | null | undefined) {
  switch ((templateType || "").toLowerCase()) {
    case "main":
      return "Κύριο πρότυπο"
    case "damage":
      return "Ζημιές"
    case "repair":
      return "Βλάβες"
    case "supplies":
      return "Αναλώσιμα"
    case "inspection":
      return "Επιθεώρηση"
    case "photos":
      return "Φωτογραφική τεκμηρίωση"
    default:
      return templateType || "-"
  }
}

function createEmptyItem(index: number): NewItem {
  return {
    localId: `item-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    label: "",
    description: "",
    itemType: "boolean",
    isRequired: true,
    sortOrder: index,
    category: "inspection",
    requiresPhoto: false,
    opensIssueOnFail: false,
    optionsText: "",
  }
}

export default function PropertyChecklistsPage() {
  const params = useParams()
  const propertyId = Array.isArray(params?.propertyId)
    ? params.propertyId[0]
    : params?.propertyId

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const [property, setProperty] = useState<Property | null>(null)
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [primaryTemplate, setPrimaryTemplate] = useState<ChecklistTemplate | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [templateType, setTemplateType] = useState("main")
  const [isPrimary, setIsPrimary] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [items, setItems] = useState<NewItem[]>([
    createEmptyItem(1),
    createEmptyItem(2),
  ])

  async function loadPageData() {
    if (!propertyId) return

    setLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      const [propertyRes, checklistRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}`, {
          cache: "no-store",
        }),
        fetch(`/api/property-checklists/${propertyId}`, {
          cache: "no-store",
        }),
      ])

      const propertyData = await propertyRes.json().catch(() => null)
      const checklistData = await checklistRes.json().catch(() => null)

      if (!propertyRes.ok) {
        throw new Error(propertyData?.error || "Αποτυχία φόρτωσης ακινήτου.")
      }

      if (!checklistRes.ok) {
        throw new Error(
          checklistData?.error || "Αποτυχία φόρτωσης προτύπων checklist."
        )
      }

      const checklistPayload = (checklistData || {}) as ChecklistApiResponse

      setProperty(propertyData)
      setTemplates(Array.isArray(checklistPayload.templates) ? checklistPayload.templates : [])
      setPrimaryTemplate(checklistPayload.primaryTemplate || null)
    } catch (err) {
      console.error("Σφάλμα φόρτωσης checklist ακινήτου:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Παρουσιάστηκε σφάλμα κατά τη φόρτωση της σελίδας."
      )
      setProperty(null)
      setTemplates([])
      setPrimaryTemplate(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPageData()
  }, [propertyId])

  useEffect(() => {
    if (templateType !== "main" && isPrimary) {
      setIsPrimary(false)
    }
  }, [templateType, isPrimary])

  const totalItems = useMemo(() => {
    return templates.reduce((sum, template) => sum + (template.items?.length || 0), 0)
  }, [templates])

  const activeTemplates = useMemo(() => {
    return templates.filter((template) => template.isActive)
  }, [templates])

  function addItem() {
    setItems((prev) => [...prev, createEmptyItem(prev.length + 1)])
  }

  function removeItem(localId: string) {
    setItems((prev) =>
      prev
        .filter((item) => item.localId !== localId)
        .map((item, index) => ({
          ...item,
          sortOrder: index + 1,
        }))
    )
  }

  function updateItem(localId: string, patch: Partial<NewItem>) {
    setItems((prev) =>
      prev.map((item, index) =>
        item.localId === localId
          ? {
              ...item,
              ...patch,
              sortOrder: patch.sortOrder ?? index + 1,
            }
          : item
      )
    )
  }

  async function handleCreateTemplate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!propertyId) return

    try {
      setSaving(true)
      setError("")
      setSuccessMessage("")

      const cleanedItems = items
        .map((item, index) => ({
          label: item.label.trim(),
          description: item.description.trim() || null,
          itemType: item.itemType,
          isRequired: item.isRequired,
          sortOrder: index + 1,
          category: item.category.trim() || "inspection",
          requiresPhoto: item.requiresPhoto,
          opensIssueOnFail: item.opensIssueOnFail,
          optionsText: item.optionsText.trim() || null,
        }))
        .filter((item) => item.label)

      const res = await fetch(`/api/property-checklists/${propertyId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          templateType,
          isPrimary: templateType === "main" ? isPrimary : false,
          isActive,
          items: cleanedItems,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία δημιουργίας προτύπου checklist.")
      }

      setTitle("")
      setDescription("")
      setTemplateType("main")
      setIsPrimary(true)
      setIsActive(true)
      setItems([createEmptyItem(1), createEmptyItem(2)])

      setSuccessMessage("Το πρότυπο checklist δημιουργήθηκε επιτυχώς.")
      await loadPageData()
    } catch (err) {
      console.error("Σφάλμα δημιουργίας προτύπου checklist:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Παρουσιάστηκε σφάλμα κατά τη δημιουργία προτύπου checklist."
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">Φόρτωση προτύπων checklist...</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-red-700">
            Δεν βρέθηκε το ακίνητο
          </h1>
          <p className="mt-2 text-sm text-red-600">
            Το ακίνητο δεν φορτώθηκε ή δεν υπάρχει.
          </p>

          <div className="mt-6">
            <Link
              href="/properties"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Επιστροφή στα ακίνητα
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Πρότυπα checklist ακινήτου</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              {property.name}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Ανά ακίνητο επιτρέπονται πολλά πρότυπα checklist, αλλά μόνο ένα
              είναι το κύριο πρότυπο της βασικής ροής.
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {property.code} • {mapTypeToUi(property.type)} • {property.city}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/checklists"
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Επιστροφή στα checklists
            </Link>

            <Link
              href={`/properties/${property.id}`}
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Επιστροφή στο ακίνητο
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Σύνολο προτύπων</p>
          <p className="mt-3 text-4xl font-bold text-slate-950">{templates.length}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Κύρια πρότυπα</p>
          <p className="mt-3 text-4xl font-bold text-slate-950">
            {templates.filter((t) => t.isPrimary).length}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Ενεργά πρότυπα</p>
          <p className="mt-3 text-4xl font-bold text-slate-950">
            {activeTemplates.length}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Σύνολο στοιχείων</p>
          <p className="mt-3 text-4xl font-bold text-slate-950">{totalItems}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-950">Νέο πρότυπο checklist</h2>
          <p className="mt-2 text-sm text-slate-500">
            Δημιούργησε νέο πρότυπο για την κύρια ροή ή για ειδικές χρήσεις όπως
            ζημιές, βλάβες, αναλώσιμα, επιθεώρηση και φωτογραφική τεκμηρίωση.
          </p>
        </div>

        <form onSubmit={handleCreateTemplate} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Τίτλος προτύπου
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="π.χ. Βασική checklist ετοιμότητας ακινήτου"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Περιγραφή
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                placeholder="Σύντομη περιγραφή της χρήσης του προτύπου."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Τύπος προτύπου
              </label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              >
                <option value="main">Κύριο πρότυπο</option>
                <option value="damage">Ζημιές</option>
                <option value="repair">Βλάβες</option>
                <option value="supplies">Αναλώσιμα</option>
                <option value="inspection">Επιθεώρηση</option>
                <option value="photos">Φωτογραφική τεκμηρίωση</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Κατάσταση
              </label>
              <select
                value={isActive ? "active" : "inactive"}
                onChange={(e) => setIsActive(e.target.value === "active")}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              >
                <option value="active">Ενεργό</option>
                <option value="inactive">Ανενεργό</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                disabled={templateType !== "main"}
              />
              Ορισμός ως κύριο πρότυπο του ακινήτου
            </label>

            {templateType !== "main" ? (
              <p className="mt-2 text-xs text-slate-500">
                Μόνο τα πρότυπα τύπου «Κύριο πρότυπο» μπορούν να οριστούν ως κύρια.
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-950">Στοιχεία checklist</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Όρισε τα βήματα που θα εκτελούνται σε κάθε run της λίστας.
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Προσθήκη στοιχείου
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.localId}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h4 className="text-lg font-semibold text-slate-900">
                      Στοιχείο {index + 1}
                    </h4>

                    <button
                      type="button"
                      onClick={() => removeItem(item.localId)}
                      disabled={items.length === 1}
                      className={cls(
                        "rounded-xl px-3 py-2 text-sm font-semibold transition",
                        items.length === 1
                          ? "cursor-not-allowed bg-slate-100 text-slate-400"
                          : "bg-red-50 text-red-700 hover:bg-red-100"
                      )}
                    >
                      Διαγραφή
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Ετικέτα
                      </label>
                      <input
                        value={item.label}
                        onChange={(e) =>
                          updateItem(item.localId, { label: e.target.value })
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                        placeholder="π.χ. Έλεγχος καθαριότητας κουζίνας"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Περιγραφή
                      </label>
                      <textarea
                        rows={3}
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.localId, { description: e.target.value })
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                        placeholder="Προαιρετική επεξήγηση του βήματος."
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Τύπος πεδίου
                      </label>
                      <select
                        value={item.itemType}
                        onChange={(e) =>
                          updateItem(item.localId, { itemType: e.target.value })
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                      >
                        <option value="boolean">Ναι / Όχι</option>
                        <option value="text">Κείμενο</option>
                        <option value="number">Αριθμός</option>
                        <option value="select">Επιλογή</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Κατηγορία
                      </label>
                      <input
                        value={item.category}
                        onChange={(e) =>
                          updateItem(item.localId, { category: e.target.value })
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                        placeholder="π.χ. inspection"
                      />
                    </div>

                    {item.itemType === "select" ? (
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Επιλογές
                        </label>
                        <input
                          value={item.optionsText}
                          onChange={(e) =>
                            updateItem(item.localId, { optionsText: e.target.value })
                          }
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                          placeholder="π.χ. Καλή,Μέτρια,Κακή"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={item.isRequired}
                        onChange={(e) =>
                          updateItem(item.localId, { isRequired: e.target.checked })
                        }
                      />
                      Υποχρεωτικό
                    </label>

                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={item.requiresPhoto}
                        onChange={(e) =>
                          updateItem(item.localId, {
                            requiresPhoto: e.target.checked,
                          })
                        }
                      />
                      Απαιτεί φωτογραφία
                    </label>

                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={item.opensIssueOnFail}
                        onChange={(e) =>
                          updateItem(item.localId, {
                            opensIssueOnFail: e.target.checked,
                          })
                        }
                      />
                      Δημιουργεί συμβάν σε αποτυχία
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Αποθήκευση..." : "Δημιουργία προτύπου"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-950">Υπάρχοντα πρότυπα</h2>
          <p className="mt-2 text-sm text-slate-500">
            Όλα τα πρότυπα checklist του ακινήτου με ένδειξη κύριου προτύπου και
            τύπου χρήσης.
          </p>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Δεν υπάρχουν ακόμη πρότυπα checklist για αυτό το ακίνητο.
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-950">
                        {template.title}
                      </h3>

                      {template.isPrimary ? (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          Κύριο πρότυπο
                        </span>
                      ) : null}

                      <span
                        className={cls(
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          template.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-700"
                        )}
                      >
                        {template.isActive ? "Ενεργό" : "Ανενεργό"}
                      </span>

                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        {mapTemplateTypeToUi(template.templateType)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {template.description || "Δεν υπάρχει περιγραφή προτύπου."}
                    </p>

                    <p className="mt-3 text-xs text-slate-400">
                      Στοιχεία: {template.items?.length || 0}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/property-checklists/${property.id}/templates/${template.id}`}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Επεξεργασία
                    </Link>
                  </div>
                </div>

                {(template.items || []).length > 0 ? (
                  <div className="mt-4 max-h-64 space-y-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    {template.items
                      ?.slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {item.label}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.description || "Χωρίς περιγραφή"}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700">
                                {item.itemType}
                              </span>

                              <span
                                className={cls(
                                  "rounded-full border px-2 py-1 text-[11px] font-semibold",
                                  item.isRequired
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-slate-200 bg-white text-slate-600"
                                )}
                              >
                                {item.isRequired ? "Υποχρεωτικό" : "Προαιρετικό"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}