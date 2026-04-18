"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { TaskAlertPanel } from "@/components/tasks/TaskAlertPanel"
import { TaskChecklistPanel } from "@/components/tasks/TaskChecklistPanel"

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

type IssueTemplate = {
  id: string
  title: string
  isPrimary: boolean
  isActive: boolean
  items?: Array<{ id: string }>
}

type ChecklistResponse = {
  templates?: ChecklistTemplate[]
  primaryTemplate?: ChecklistTemplate | null
}

type IssueTemplateResponse = {
  template?: IssueTemplate | null
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

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      apartment: "Apartment",
      villa: "Villa",
      house: "House",
      studio: "Studio",
      maisonette: "Maisonette",
      noType: "-",
      loadPropertiesFailed: "Failed to load properties.",
      loadPartnersFailed: "Failed to load partners.",
      loadingError: "An error occurred while loading.",
      propertyDetailsLoadError: "Failed to load property details.",
      selectProperty: "You must select a property.",
      selectPartner: "You must select a partner.",
      fillTitle: "You must fill in a task title.",
      fillDate: "You must fill in a task date.",
      missingCleaningChecklist:
        "The property does not have a primary cleaning checklist.",
      missingSuppliesChecklist:
        "The property does not have active supplies for sending a supplies checklist.",
      missingIssuesChecklist:
        "The property does not have a primary issues and damages checklist.",
      selectSection: "You must select at least one task section.",
      setAlertTime: "You must define an alert time.",
      taskCreateFailed: "Failed to create task.",
      assignmentCreateFailed: "Failed to assign task.",
      taskIdMissing:
        "The task was created but no identifier was returned.",
      loading: "Loading task creation...",
      titleEyebrow: "Task creation and assignment",
      title: "Task",
      subtitle:
        "The task is created first and then assigned to the partner.",
      backToTasks: "Back to tasks",
      successEmail:
        "The task was created and assigned successfully. An email was sent to the partner.",
      successNoEmail:
        "The task was created and assigned successfully.",
      partnerPortalLink: "Partner portal link",
      property: "Property",
      propertyPlaceholder: "Select property",
      partner: "Partner",
      partnerPlaceholder: "Select partner",
      saveAsDefaultPartner:
        "Save this partner as the default for the property",
      taskTitle: "Task title",
      taskTitlePlaceholder: "e.g. Cleaning before arrival",
      description: "Description",
      descriptionPlaceholder: "Task details",
      taskCategory: "Task category",
      priority: "Priority",
      taskDate: "Task date",
      startTime: "Start time",
      endTime: "End time",
      alertTitle: "Alert",
      alertDescription:
        "Enable a scheduled alert for a specific time.",
      alertEnabled: "Enable alert",
      alertTime: "Alert time",
      notes: "Notes",
      notesPlaceholder: "Internal notes",
      sectionsTitle: "Task sections",
      sendCleaningChecklist: "Send cleaning checklist",
      sendSuppliesChecklist: "Send supplies checklist",
      sendIssuesChecklist: "Send issues and damages checklist",
      requiresPhotos: "Requires photos",
      requiresApproval: "Requires approval",
      primaryCleaningChecklist: "Primary cleaning checklist",
      primaryIssuesChecklist: "Primary issues and damages checklist",
      notDefined: "Not defined",
      activePropertySupplies: "Active property supplies",
      sectionsHelp:
        "If a cleaning checklist is sent, the primary property checklist is used. If a supplies checklist is sent, only the active property supplies are used. If an issues checklist is sent, the primary issues and damages checklist is used.",
      missingCleaningHelp:
        "To send a cleaning checklist, the property must first have a primary cleaning checklist.",
      missingSuppliesHelp:
        "To send a supplies checklist, the property must first have active supplies.",
      missingIssuesHelp:
        "To send an issues and damages checklist, the property must first have a primary issues and damages checklist.",
      createAndAssign: "Create and assign task",
      saving: "Saving...",
      cleaning: "Cleaning",
      inspection: "Inspection",
      damages: "Damages",
      repairs: "Repairs",
      supplies: "Supplies",
      photos: "Photo documentation",
      low: "Low",
      normal: "Normal",
      urgent: "Urgent",
    }
  }

  return {
    apartment: "Διαμέρισμα",
    villa: "Βίλα",
    house: "Κατοικία",
    studio: "Στούντιο",
    maisonette: "Μεζονέτα",
    noType: "-",
    loadPropertiesFailed: "Αποτυχία φόρτωσης ακινήτων.",
    loadPartnersFailed: "Αποτυχία φόρτωσης συνεργατών.",
    loadingError: "Παρουσιάστηκε σφάλμα κατά τη φόρτωση.",
    propertyDetailsLoadError: "Σφάλμα φόρτωσης στοιχείων ακινήτου.",
    selectProperty: "Πρέπει να επιλέξεις ακίνητο.",
    selectPartner: "Πρέπει να επιλέξεις συνεργάτη.",
    fillTitle: "Πρέπει να συμπληρώσεις τίτλο εργασίας.",
    fillDate: "Πρέπει να συμπληρώσεις ημερομηνία εργασίας.",
    missingCleaningChecklist:
      "Το ακίνητο δεν έχει κύρια λίστα καθαριότητας.",
    missingSuppliesChecklist:
      "Το ακίνητο δεν έχει ενεργά αναλώσιμα για αποστολή λίστας.",
    missingIssuesChecklist:
      "Το ακίνητο δεν έχει κύρια λίστα βλαβών και ζημιών.",
    selectSection: "Πρέπει να επιλέξεις τουλάχιστον μία ενότητα εργασίας.",
    setAlertTime: "Πρέπει να ορίσεις ώρα alert.",
    taskCreateFailed: "Αποτυχία δημιουργίας εργασίας.",
    assignmentCreateFailed: "Αποτυχία ανάθεσης εργασίας.",
    taskIdMissing:
      "Η εργασία δημιουργήθηκε αλλά δεν επιστράφηκε αναγνωριστικό.",
    loading: "Φόρτωση δημιουργίας εργασίας...",
    titleEyebrow: "Δημιουργία και ανάθεση εργασίας",
    title: "Εργασία",
    subtitle:
      "Η εργασία δημιουργείται πρώτα και μετά ανατίθεται στον συνεργάτη.",
    backToTasks: "Επιστροφή στις εργασίες",
    successEmail:
      "Η εργασία δημιουργήθηκε και ανατέθηκε επιτυχώς. Στάλθηκε email στον συνεργάτη.",
    successNoEmail:
      "Η εργασία δημιουργήθηκε και ανατέθηκε επιτυχώς.",
    partnerPortalLink: "Link portal συνεργάτη",
    property: "Ακίνητο",
    propertyPlaceholder: "Επιλογή ακινήτου",
    partner: "Συνεργάτης",
    partnerPlaceholder: "Επιλογή συνεργάτη",
    saveAsDefaultPartner:
      "Αποθήκευση αυτού του συνεργάτη ως προεπιλεγμένου για το ακίνητο",
    taskTitle: "Τίτλος εργασίας",
    taskTitlePlaceholder: "π.χ. Καθαρισμός πριν την άφιξη",
    description: "Περιγραφή",
    descriptionPlaceholder: "Λεπτομέρειες εργασίας",
    taskCategory: "Κατηγορία εργασίας",
    priority: "Προτεραιότητα",
    taskDate: "Ημερομηνία εργασίας",
    startTime: "Ώρα έναρξης",
    endTime: "Ώρα λήξης",
    alertTitle: "Alert",
    alertDescription:
      "Ενεργοποίησε προγραμματισμένο alert για συγκεκριμένη ώρα.",
    alertEnabled: "Ενεργοποίηση alert",
    alertTime: "Ώρα alert",
    notes: "Σημειώσεις",
    notesPlaceholder: "Εσωτερικές σημειώσεις",
    sectionsTitle: "Ενότητες εργασίας",
    sendCleaningChecklist: "Αποστολή λίστας καθαριότητας",
    sendSuppliesChecklist: "Αποστολή λίστας αναλωσίμων",
    sendIssuesChecklist: "Αποστολή λίστας βλαβών και ζημιών",
    requiresPhotos: "Απαιτεί φωτογραφίες",
    requiresApproval: "Απαιτεί έγκριση",
    primaryCleaningChecklist: "Βασική λίστα καθαριότητας",
    primaryIssuesChecklist: "Βασική λίστα βλαβών και ζημιών",
    notDefined: "Δεν έχει οριστεί",
    activePropertySupplies: "Ενεργά αναλώσιμα ακινήτου",
    sectionsHelp:
      "Αν σταλεί λίστα καθαριότητας, χρησιμοποιείται η βασική λίστα του ακινήτου. Αν σταλεί λίστα αναλωσίμων, χρησιμοποιούνται μόνο τα ενεργά αναλώσιμα του ακινήτου. Αν σταλεί λίστα βλαβών και ζημιών, χρησιμοποιείται η βασική λίστα βλαβών και ζημιών του ακινήτου.",
    missingCleaningHelp:
      "Για να σταλεί λίστα καθαριότητας, πρέπει πρώτα να υπάρχει βασική λίστα καθαριότητας στο ακίνητο.",
    missingSuppliesHelp:
      "Για να σταλεί λίστα αναλωσίμων, πρέπει πρώτα να υπάρχουν ενεργά αναλώσιμα στο ακίνητο.",
    missingIssuesHelp:
      "Για να σταλεί λίστα βλαβών και ζημιών, πρέπει πρώτα να υπάρχει βασική λίστα βλαβών και ζημιών στο ακίνητο.",
    createAndAssign: "Δημιουργία και ανάθεση εργασίας",
    saving: "Αποθήκευση...",
    cleaning: "Καθαρισμός",
    inspection: "Επιθεώρηση",
    damages: "Ζημιές",
    repairs: "Βλάβες",
    supplies: "Αναλώσιμα",
    photos: "Φωτογραφική τεκμηρίωση",
    low: "Χαμηλή",
    normal: "Κανονική",
    urgent: "Επείγουσα",
  }
}

function mapTypeToUi(type: string | null | undefined, language: "el" | "en") {
  const texts = getTexts(language)

  switch (type) {
    case "apartment":
      return texts.apartment
    case "villa":
      return texts.villa
    case "house":
      return texts.house
    case "studio":
      return texts.studio
    case "maisonette":
      return texts.maisonette
    default:
      return type || texts.noType
  }
}

export default function NewTaskPage() {
  const { language } = useAppLanguage()
  const texts = getTexts(language)

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
  const [primaryIssueTemplate, setPrimaryIssueTemplate] = useState<IssueTemplate | null>(null)
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
  const [sendIssuesChecklist, setSendIssuesChecklist] = useState(false)
  const [requiresPhotos, setRequiresPhotos] = useState(false)
  const [requiresApproval, setRequiresApproval] = useState(false)

  const [alertEnabled, setAlertEnabled] = useState(false)
  const [alertAt, setAlertAt] = useState("")

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === propertyId) || null,
    [properties, propertyId]
  )

  const canSendCleaningChecklist = Boolean(primaryTemplate)
  const canSendSuppliesChecklist = activeSuppliesCount > 0
  const canSendIssuesChecklist = Boolean(primaryIssueTemplate)

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
        throw new Error(propertiesData?.error || texts.loadPropertiesFailed)
      }

      if (!partnersRes.ok) {
        throw new Error(partnersData?.error || texts.loadPartnersFailed)
      }

      setProperties(Array.isArray(propertiesData) ? propertiesData : [])
      setPartners(Array.isArray(partnersData) ? partnersData : [])
    } catch (err) {
      console.error("Σφάλμα φόρτωσης δημιουργίας εργασίας:", err)
      setError(
        err instanceof Error
          ? err.message
          : texts.loadingError
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadPropertyDetails(currentPropertyId: string) {
    if (!currentPropertyId) {
      setPrimaryTemplate(null)
      setPrimaryIssueTemplate(null)
      setActiveSuppliesCount(0)
      setPartnerId("")
      setSendCleaningChecklist(false)
      setSendSuppliesChecklist(false)
      setSendIssuesChecklist(false)
      return
    }

    try {
      const [propertyRes, checklistRes, suppliesRes, issuesRes] = await Promise.all([
        fetch(`/api/properties/${currentPropertyId}`, { cache: "no-store" }),
        fetch(`/api/property-checklists/${currentPropertyId}`, {
          cache: "no-store",
        }),
        fetch(`/api/properties/${currentPropertyId}/supplies`, {
          cache: "no-store",
        }),
        fetch(`/api/property-checklists/${currentPropertyId}/issues`, {
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
      const issuesData = (await issuesRes.json().catch(() => null)) as
        | IssueTemplateResponse
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

      const nextPrimaryIssueTemplate =
        issuesRes.ok && issuesData ? issuesData.template || null : null

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
      setPrimaryIssueTemplate(nextPrimaryIssueTemplate)
      setActiveSuppliesCount(nextActiveSuppliesCount)

      setSendCleaningChecklist(Boolean(nextPrimaryTemplate))
      setSendSuppliesChecklist(nextActiveSuppliesCount > 0)
      setSendIssuesChecklist(Boolean(nextPrimaryIssueTemplate))
    } catch (loadError) {
      console.error("Σφάλμα φόρτωσης στοιχείων ακινήτου:", loadError)
      setPrimaryTemplate(null)
      setPrimaryIssueTemplate(null)
      setActiveSuppliesCount(0)
      setSendCleaningChecklist(false)
      setSendSuppliesChecklist(false)
      setSendIssuesChecklist(false)
    }
  }

  useEffect(() => {
    void loadBaseData()
  }, [language])

  useEffect(() => {
    if (propertyId) {
      void loadPropertyDetails(propertyId)
    } else {
      setPrimaryTemplate(null)
      setPrimaryIssueTemplate(null)
      setActiveSuppliesCount(0)
      setPartnerId("")
      setSendCleaningChecklist(false)
      setSendSuppliesChecklist(false)
      setSendIssuesChecklist(false)
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

  useEffect(() => {
    if (!canSendIssuesChecklist && sendIssuesChecklist) {
      setSendIssuesChecklist(false)
    }
  }, [canSendIssuesChecklist, sendIssuesChecklist])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    try {
      setSaving(true)
      setError("")
      setSuccessMessage("")
      setPortalLink("")

      if (!propertyId) {
        throw new Error(texts.selectProperty)
      }

      if (!partnerId) {
        throw new Error(texts.selectPartner)
      }

      if (!title.trim()) {
        throw new Error(texts.fillTitle)
      }

      if (!scheduledDate) {
        throw new Error(texts.fillDate)
      }

      if (sendCleaningChecklist && !primaryTemplate) {
        throw new Error(texts.missingCleaningChecklist)
      }

      if (sendSuppliesChecklist && activeSuppliesCount === 0) {
        throw new Error(texts.missingSuppliesChecklist)
      }

      if (sendIssuesChecklist && !primaryIssueTemplate) {
        throw new Error(texts.missingIssuesChecklist)
      }

      if (!sendCleaningChecklist && !sendSuppliesChecklist && !sendIssuesChecklist) {
        throw new Error(texts.selectSection)
      }

      if (alertEnabled && !alertAt) {
        throw new Error(texts.setAlertTime)
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
          sendIssuesChecklist,
          source: "manual",
          alertEnabled,
          alertAt: alertEnabled ? alertAt : null,
        }),
      })

      const createTaskData = await createTaskRes.json().catch(() => null)

      if (!createTaskRes.ok) {
        throw new Error(createTaskData?.error || texts.taskCreateFailed)
      }

      const taskId = String(createTaskData?.task?.id || "").trim()

      if (!taskId) {
        throw new Error(texts.taskIdMissing)
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
        throw new Error(assignData?.error || texts.assignmentCreateFailed)
      }

      setSuccessMessage(
        assignData?.assignmentEmailSent
          ? texts.successEmail
          : texts.successNoEmail
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
      setSendIssuesChecklist(Boolean(primaryIssueTemplate))
      setRequiresPhotos(false)
      setRequiresApproval(false)
      setSaveAsDefaultPartner(false)
      setAlertEnabled(false)
      setAlertAt("")
    } catch (err) {
      console.error("Σφάλμα δημιουργίας εργασίας:", err)
      setError(
        err instanceof Error
          ? err.message
          : texts.taskCreateFailed
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">{texts.loading}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">{texts.titleEyebrow}</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">{texts.title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {texts.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/tasks"
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {texts.backToTasks}
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
              {texts.partnerPortalLink}: {portalLink}
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
              {texts.property}
            </label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              required
            >
              <option value="">{texts.propertyPlaceholder}</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} · {property.code}
                </option>
              ))}
            </select>

            {selectedProperty ? (
              <p className="mt-2 text-xs text-slate-500">
                {selectedProperty.address} · {selectedProperty.city} ·{" "}
                {mapTypeToUi(selectedProperty.type, language)}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.partner}
            </label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              required
            >
              <option value="">{texts.partnerPlaceholder}</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name} · {partner.specialty}
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
              {texts.saveAsDefaultPartner}
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.taskTitle}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              placeholder={texts.taskTitlePlaceholder}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.description}
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              placeholder={texts.descriptionPlaceholder}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.taskCategory}
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            >
              <option value="cleaning">{texts.cleaning}</option>
              <option value="inspection">{texts.inspection}</option>
              <option value="damage">{texts.damages}</option>
              <option value="repair">{texts.repairs}</option>
              <option value="supplies">{texts.supplies}</option>
              <option value="photos">{texts.photos}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.priority}
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            >
              <option value="low">{texts.low}</option>
              <option value="normal">{texts.normal}</option>
              <option value="urgent">{texts.urgent}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.taskDate}
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
              {texts.startTime}
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
              {texts.endTime}
            </label>
            <input
              type="time"
              value={scheduledEndTime}
              onChange={(e) => setScheduledEndTime(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            />
          </div>

          <TaskAlertPanel
            className="md:col-span-2"
            title={texts.alertTitle}
            description={texts.alertDescription}
            enabledLabel={texts.alertEnabled}
            timeLabel={texts.alertTime}
            enabled={alertEnabled}
            value={alertAt}
            onEnabledChange={(checked) => {
              setAlertEnabled(checked)
              if (!checked) setAlertAt("")
            }}
            onValueChange={setAlertAt}
          />

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.notes}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              placeholder={texts.notesPlaceholder}
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <TaskChecklistPanel
            title={texts.sectionsTitle}
            options={[
              {
                label: texts.sendCleaningChecklist,
                checked: sendCleaningChecklist,
                onChange: setSendCleaningChecklist,
                disabled: !canSendCleaningChecklist,
              },
              {
                label: texts.sendSuppliesChecklist,
                checked: sendSuppliesChecklist,
                onChange: setSendSuppliesChecklist,
                disabled: !canSendSuppliesChecklist,
              },
              {
                label: texts.sendIssuesChecklist,
                checked: sendIssuesChecklist,
                onChange: setSendIssuesChecklist,
                disabled: !canSendIssuesChecklist,
              },
            ]}
            footer={
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <div>
                  <strong>{texts.primaryCleaningChecklist}:</strong>{" "}
                  {primaryTemplate ? primaryTemplate.title : texts.notDefined}
                </div>

                <div>
                  <strong>{texts.primaryIssuesChecklist}:</strong>{" "}
                  {primaryIssueTemplate ? primaryIssueTemplate.title : texts.notDefined}
                </div>

                <div>
                  <strong>{texts.activePropertySupplies}:</strong> {activeSuppliesCount}
                </div>

                <div className="text-xs text-slate-500">{texts.sectionsHelp}</div>

                {!canSendCleaningChecklist ? (
                  <div className="text-xs text-red-600">{texts.missingCleaningHelp}</div>
                ) : null}

                {!canSendSuppliesChecklist ? (
                  <div className="text-xs text-amber-600">{texts.missingSuppliesHelp}</div>
                ) : null}

                {!canSendIssuesChecklist ? (
                  <div className="text-xs text-red-600">{texts.missingIssuesHelp}</div>
                ) : null}
              </div>
            }
          />

          <div className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={requiresPhotos}
                onChange={(e) => setRequiresPhotos(e.target.checked)}
              />
              {texts.requiresPhotos}
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
              />
              {texts.requiresApproval}
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? texts.saving : texts.createAndAssign}
          </button>
        </div>
      </form>
    </div>
  )
}
