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
  templates?: ChecklistTemplate[]
  primaryTemplate?: ChecklistTemplate | null
}

type PropertySuppliesResponse = {
  activeSupplies?: Array<{
    id: string
    propertySupplyId?: string
    propertyId?: string
    supplyItemId?: string
    name?: string
    code?: string
  }>
  supplies?: Array<{
    id: string
    propertySupplyId?: string
    propertyId?: string
    supplyItemId?: string
    name?: string
    code?: string
  }>
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
  const [portalLink, setPortalLink] = useState("")

  const [properties, setProperties] = useState<Property[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [primaryTemplate, setPrimaryTemplate] = useState<ChecklistTemplate | null>(null)
  const [activeSuppliesCount, setActiveSuppliesCount] = useState(0)

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

  const [sendCleaningChecklist, setSendCleaningChecklist] = useState(true)
  const [sendSuppliesChecklist, setSendSuppliesChecklist] = useState(false)
  const [requiresPhotos, setRequiresPhotos] = useState(false)
  const [requiresApproval, setRequiresApproval] = useState(false)

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === propertyId) || null,
    [properties, propertyId]
  )

  const canSendCleaningChecklist = Boolean(primaryTemplate)
  const canSendSuppliesChecklist = activeSuppliesCount > 0

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
      setPrimaryTemplate(null)
      setActiveSuppliesCount(0)
      setPartnerId("")
      setSendCleaningChecklist(false)
      setSendSuppliesChecklist(false)
      return
    }

    try {
      const [propertyRes, checklistRes, suppliesRes] = await Promise.all([
        fetch(`/api/properties/${currentPropertyId}`, { cache: "no-store" }),
        fetch(`/api/property-checklists/${currentPropertyId}`, {
          cache: "no-store",
        }),
        fetch(`/api/properties/${currentPropertyId}/supplies`, {
          cache: "no-store",
        }),
      ])

      const propertyData = await propertyRes.json().catch(() => null)
      const checklistData = (await checklistRes.json().catch(() => null)) as
        | ChecklistResponse
        | null
      const suppliesData = (await suppliesRes.json().catch(() => null)) as
        | PropertySuppliesResponse
        | null

      if (propertyRes.ok) {
        if (propertyData?.defaultPartnerId) {
          setPartnerId(propertyData.defaultPartnerId)
        } else {
          setPartnerId("")
        }
      }

      const nextPrimaryTemplate =
        checklistRes.ok && checklistData ? checklistData.primaryTemplate || null : null

      const suppliesArray =
        suppliesRes.ok && suppliesData
          ? Array.isArray(suppliesData.activeSupplies)
            ? suppliesData.activeSupplies
            : Array.isArray(suppliesData.supplies)
            ? suppliesData.supplies
            : []
          : []

      const nextActiveSuppliesCount = suppliesArray.length

      setPrimaryTemplate(nextPrimaryTemplate)
      setActiveSuppliesCount(nextActiveSuppliesCount)

      setSendCleaningChecklist(Boolean(nextPrimaryTemplate))
      setSendSuppliesChecklist(nextActiveSuppliesCount > 0)
    } catch (loadError) {
      console.error("Σφάλμα φόρτωσης στοιχείων ακινήτου:", loadError)
      setPrimaryTemplate(null)
      setActiveSuppliesCount(0)
      setSendCleaningChecklist(false)
      setSendSuppliesChecklist(false)
    }
  }

  useEffect(() => {
    void loadBaseData()
  }, [])

  useEffect(() => {
    if (propertyId) {
      void loadPropertyDetails(propertyId)
    } else {
      setPrimaryTemplate(null)
      setActiveSuppliesCount(0)
      setPartnerId("")
      setSendCleaningChecklist(false)
      setSendSuppliesChecklist(false)
    }
  }, [propertyId])

  useEffect(() => {
    if (!canSendCleaningChecklist && sendCleaningChecklist) {
      setSendCleaningChecklist(false)
    }
  }, [canSendCleaningChecklist, sendCleaningChecklist])

  useEffect(() => {
    if (!canSendSuppliesChecklist && sendSuppliesChecklist) {
      setSendSuppliesChecklist(false)
    }
  }, [canSendSuppliesChecklist, sendSuppliesChecklist])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    try {
      setSaving(true)
      setError("")
      setSuccessMessage("")
      setPortalLink("")

      if (!propertyId) {
        throw new Error("Πρέπει να επιλέξεις ακίνητο.")
      }

      if (!partnerId) {
        throw new Error("Πρέπει να επιλέξεις συνεργάτη.")
      }

      if (!title.trim()) {
        throw new Error("Πρέπει να συμπληρώσεις τίτλο εργασίας.")
      }

      if (!scheduledDate) {
        throw new Error("Πρέπει να συμπληρώσεις ημερομηνία εργασίας.")
      }

      if (sendCleaningChecklist && !primaryTemplate) {
        throw new Error(
          "Το ακίνητο δεν έχει κύρια λίστα καθαριότητας."
        )
      }

      if (sendSuppliesChecklist && activeSuppliesCount === 0) {
        throw new Error(
          "Το ακίνητο δεν έχει ενεργά αναλώσιμα για αποστολή λίστας."
        )
      }

      if (!sendCleaningChecklist && !sendSuppliesChecklist) {
        throw new Error(
          "Πρέπει να επιλέξεις τουλάχιστον μία ενότητα εργασίας."
        )
      }

      const createTaskRes = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId,
          title: title.trim(),
          description: description.trim() || null,
          taskType,
          priority,
          scheduledDate,
          scheduledStartTime: scheduledStartTime || null,
          scheduledEndTime: scheduledEndTime || null,
          notes: notes.trim() || null,
          requiresPhotos,
          requiresApproval,
          sendCleaningChecklist,
          sendSuppliesChecklist,
          requiresChecklist: sendCleaningChecklist,
          source: "manual",
        }),
      })

      const createTaskData = await createTaskRes.json().catch(() => null)

      if (!createTaskRes.ok) {
        throw new Error(createTaskData?.error || "Αποτυχία δημιουργίας εργασίας.")
      }

      const taskId = String(createTaskData?.task?.id || "").trim()

      if (!taskId) {
        throw new Error("Η εργασία δημιουργήθηκε αλλά δεν επέστρεψε αναγνωριστικό.")
      }

      const assignRes = await fetch("/api/task-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId,
          partnerId,
          notes: null,
          saveAsDefaultPartner,
        }),
      })

      const assignData = await assignRes.json().catch(() => null)

      if (!assignRes.ok) {
        throw new Error(assignData?.error || "Αποτυχία ανάθεσης εργασίας.")
      }

      setSuccessMessage(
        assignData?.assignmentEmailSent
          ? "Η εργασία δημιουργήθηκε και ανατέθηκε επιτυχώς. Στάλθηκε email στον συνεργάτη."
          : "Η εργασία δημιουργήθηκε και ανατέθηκε επιτυχώς."
      )

      setPortalLink(assignData?.portalLink || "")

      setTitle("")
      setDescription("")
      setTaskType("cleaning")
      setPriority("normal")
      setScheduledDate("")
      setScheduledStartTime("")
      setScheduledEndTime("")
      setNotes("")
      setSendCleaningChecklist(Boolean(primaryTemplate))
      setSendSuppliesChecklist(activeSuppliesCount > 0)
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
              Η εργασία δημιουργείται πρώτα και μετά ανατίθεται στον συνεργάτη.
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
          {portalLink ? (
            <div className="mt-2 break-all text-xs text-emerald-800">
              Link portal συνεργάτη: {portalLink}
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
          <h2 className="text-xl font-bold text-slate-950">Ενότητες εργασίας</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label
              className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium ${
                canSendCleaningChecklist
                  ? "text-slate-700"
                  : "cursor-not-allowed text-slate-400"
              }`}
            >
              <input
                type="checkbox"
                checked={sendCleaningChecklist}
                onChange={(e) => setSendCleaningChecklist(e.target.checked)}
                disabled={!canSendCleaningChecklist}
              />
              Αποστολή λίστας καθαριότητας
            </label>

            <label
              className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium ${
                canSendSuppliesChecklist
                  ? "text-slate-700"
                  : "cursor-not-allowed text-slate-400"
              }`}
            >
              <input
                type="checkbox"
                checked={sendSuppliesChecklist}
                onChange={(e) => setSendSuppliesChecklist(e.target.checked)}
                disabled={!canSendSuppliesChecklist}
              />
              Αποστολή λίστας αναλωσίμων
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
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

          <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <div>
              <strong>Βασική λίστα καθαριότητας:</strong>{" "}
              {primaryTemplate ? primaryTemplate.title : "Δεν έχει οριστεί"}
            </div>

            <div>
              <strong>Ενεργά αναλώσιμα ακινήτου:</strong> {activeSuppliesCount}
            </div>

            <div className="text-xs text-slate-500">
              Αν σταλεί λίστα καθαριότητας, χρησιμοποιείται η βασική λίστα του
              ακινήτου. Αν σταλεί λίστα αναλωσίμων, χρησιμοποιούνται μόνο τα ενεργά
              αναλώσιμα του ακινήτου.
            </div>

            {!canSendCleaningChecklist ? (
              <div className="text-xs text-red-600">
                Για να σταλεί λίστα καθαριότητας, πρέπει πρώτα να υπάρχει βασική
                λίστα καθαριότητας στο ακίνητο.
              </div>
            ) : null}

            {!canSendSuppliesChecklist ? (
              <div className="text-xs text-amber-600">
                Για να σταλεί λίστα αναλωσίμων, πρέπει πρώτα να υπάρχουν ενεργά
                αναλώσιμα στο ακίνητο.
              </div>
            ) : null}
          </div>
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