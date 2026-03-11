"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

type Property = {
  id: string
  code: string
  name: string
  address: string
  city: string
  type: string
  defaultPartnerId?: string | null
  defaultPartner?: {
    id: string
    name: string
  } | null
}

type Partner = {
  id: string
  code: string
  name: string
  email: string
  specialty: string
  status: string
}

type ChecklistTemplate = {
  id: string
  title: string
  templateType: string
  isPrimary: boolean
  isActive: boolean
  items?: Array<{ id: string }>
}

type ChecklistResponse = {
  templates: ChecklistTemplate[]
  primaryTemplate: ChecklistTemplate | null
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

export default function NewTaskPage() {
  const searchParams = useSearchParams()
  const propertyIdFromUrl = searchParams.get("propertyId") || ""

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [assignmentLink, setAssignmentLink] = useState("")

  const [properties, setProperties] = useState<Property[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])

  const [propertyId, setPropertyId] = useState(propertyIdFromUrl)
  const [partnerId, setPartnerId] = useState("")
  const [saveAsDefaultPartner, setSaveAsDefaultPartner] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [taskType, setTaskType] = useState("cleaning")
  const [priority, setPriority] = useState("normal")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledStartTime, setScheduledStartTime] = useState("")
  const [scheduledEndTime, setScheduledEndTime] = useState("")
  const [notes, setNotes] = useState("")

  const [requiresChecklist, setRequiresChecklist] = useState(true)
  const [requiresPhotos, setRequiresPhotos] = useState(false)
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [templateId, setTemplateId] = useState("")

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === propertyId) || null,
    [properties, propertyId]
  )

  async function loadBaseData() {
    try {
      setLoading(true)
      setError("")

      const [propertiesRes, partnersRes] = await Promise.all([
        fetch("/api/properties", { cache: "no-store" }),
        fetch("/api/partners", { cache: "no-store" }),
      ])

      const propertiesData = await propertiesRes.json().catch(() => [])
      const partnersData = await partnersRes.json().catch(() => [])

      if (!propertiesRes.ok) {
        throw new Error(propertiesData?.error || "Αποτυχία φόρτωσης ακινήτων.")
      }

      if (!partnersRes.ok) {
        throw new Error(partnersData?.error || "Αποτυχία φόρτωσης συνεργατών.")
      }

      setProperties(Array.isArray(propertiesData) ? propertiesData : [])
      setPartners(Array.isArray(partnersData) ? partnersData : [])
    } catch (err) {
      console.error("Σφάλμα φόρτωσης δημιουργίας εργασίας:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Παρουσιάστηκε σφάλμα κατά τη φόρτωση."
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadPropertyDetails(currentPropertyId: string) {
    if (!currentPropertyId) {
      setTemplates([])
      setTemplateId("")
      return
    }

    try {
      const [propertyRes, checklistRes] = await Promise.all([
        fetch(`/api/properties/${currentPropertyId}`, { cache: "no-store" }),
        fetch(`/api/property-checklists/${currentPropertyId}`, {
          cache: "no-store",
        }),
      ])

      const propertyData = await propertyRes.json().catch(() => null)
      const checklistData = (await checklistRes.json().catch(() => null)) as
        | ChecklistResponse
        | null

      if (propertyRes.ok && propertyData?.defaultPartnerId) {
        setPartnerId(propertyData.defaultPartnerId)
      }

      if (checklistRes.ok && checklistData) {
        const availableTemplates = Array.isArray(checklistData.templates)
          ? checklistData.templates.filter((t) => t.isActive)
          : []

        setTemplates(availableTemplates)

        if (checklistData.primaryTemplate?.id) {
          setTemplateId(checklistData.primaryTemplate.id)
        } else if (availableTemplates[0]?.id) {
          setTemplateId(availableTemplates[0].id)
        } else {
          setTemplateId("")
        }
      } else {
        setTemplates([])
        setTemplateId("")
      }
    } catch (error) {
      console.error("Σφάλμα φόρτωσης στοιχείων ακινήτου:", error)
      setTemplates([])
      setTemplateId("")
    }
  }

  useEffect(() => {
    loadBaseData()
  }, [])

  useEffect(() => {
    if (propertyId) {
      loadPropertyDetails(propertyId)
    }
  }, [propertyId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    try {
      setSaving(true)
      setError("")
      setSuccessMessage("")
      setAssignmentLink("")

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId,
          partnerId,
          saveAsDefaultPartner,
          title: title.trim(),
          description: description.trim() || null,
          taskType,
          priority,
          scheduledDate,
          scheduledStartTime: scheduledStartTime || null,
          scheduledEndTime: scheduledEndTime || null,
          notes: notes.trim() || null,
          requiresChecklist,
          requiresPhotos,
          requiresApproval,
          templateId: requiresChecklist ? templateId : null,
          source: "manual",
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία δημιουργίας εργασίας.")
      }

      setSuccessMessage(
        data?.emailSent
          ? "Η εργασία δημιουργήθηκε και στάλθηκε email ανάθεσης."
          : "Η εργασία δημιουργήθηκε. Το link ανάθεσης παράχθηκε επιτυχώς."
      )

      setAssignmentLink(data?.assignmentLink || "")

      setTitle("")
      setDescription("")
      setTaskType("cleaning")
      setPriority("normal")
      setScheduledDate("")
      setScheduledStartTime("")
      setScheduledEndTime("")
      setNotes("")
      setRequiresChecklist(true)
      setRequiresPhotos(false)
      setRequiresApproval(false)
      setSaveAsDefaultPartner(false)
    } catch (err) {
      console.error("Σφάλμα δημιουργίας εργασίας:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Παρουσιάστηκε σφάλμα κατά τη δημιουργία εργασίας."
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Φόρτωση δημιουργίας εργασίας...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Δημιουργία και ανάθεση εργασίας</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Νέα εργασία</h1>
            <p className="mt-2 text-sm text-slate-500">
              Ο διαχειριστής δημιουργεί εργασία, επιλέγει συνεργάτη, στέλνεται link
              αποδοχής και μετά αποστέλλεται το checklist.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/tasks"
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Επιστροφή στις εργασίες
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
          {assignmentLink ? (
            <div className="mt-2 break-all text-xs text-emerald-800">
              Link ανάθεσης: {assignmentLink}
            </div>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ακίνητο
            </label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              required
            >
              <option value="">Επιλογή ακινήτου</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} • {property.code}
                </option>
              ))}
            </select>

            {selectedProperty ? (
              <p className="mt-2 text-xs text-slate-500">
                {selectedProperty.address} • {selectedProperty.city} •{" "}
                {mapTypeToUi(selectedProperty.type)}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Συνεργάτης
            </label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              required
            >
              <option value="">Επιλογή συνεργάτη</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name} • {partner.specialty}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={saveAsDefaultPartner}
                onChange={(e) => setSaveAsDefaultPartner(e.target.checked)}
              />
              Αποθήκευση αυτού του συνεργάτη ως προεπιλεγμένου για το ακίνητο
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Τίτλος εργασίας
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              placeholder="π.χ. Καθαρισμός πριν την άφιξη"
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
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              placeholder="Λεπτομέρειες εργασίας"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Κατηγορία εργασίας
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            >
              <option value="cleaning">Καθαρισμός</option>
              <option value="inspection">Επιθεώρηση</option>
              <option value="damage">Ζημιές</option>
              <option value="repair">Βλάβες</option>
              <option value="supplies">Αναλώσιμα</option>
              <option value="photos">Φωτογραφική τεκμηρίωση</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Προτεραιότητα
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            >
              <option value="low">Χαμηλή</option>
              <option value="normal">Κανονική</option>
              <option value="urgent">Επείγουσα</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ημερομηνία εργασίας
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ώρα έναρξης
            </label>
            <input
              type="time"
              value={scheduledStartTime}
              onChange={(e) => setScheduledStartTime(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ώρα λήξης
            </label>
            <input
              type="time"
              value={scheduledEndTime}
              onChange={(e) => setScheduledEndTime(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Σημειώσεις
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              placeholder="Εσωτερικές σημειώσεις"
            />
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">Κανόνες εκτέλεσης</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={requiresChecklist}
                onChange={(e) => setRequiresChecklist(e.target.checked)}
              />
              Απαιτεί checklist
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={requiresPhotos}
                onChange={(e) => setRequiresPhotos(e.target.checked)}
              />
              Απαιτεί φωτογραφίες
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
              />
              Απαιτεί έγκριση
            </label>
          </div>

          {requiresChecklist ? (
            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Πρότυπο checklist
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                required={requiresChecklist}
              >
                <option value="">Επιλογή προτύπου checklist</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title} {template.isPrimary ? "• κύριο" : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Αποθήκευση..." : "Δημιουργία και ανάθεση εργασίας"}
          </button>
        </div>
      </form>
    </div>
  )
}