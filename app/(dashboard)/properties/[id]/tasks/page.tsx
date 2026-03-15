"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

type PropertyInfo = {
  id: string
  organizationId?: string
  code: string
  name: string
  address: string
  city: string
  region: string
  postalCode: string
  country: string
  type: string
  status: string
  defaultPartnerId?: string | null
  defaultPartner?: {
    id: string
    code: string
    name: string
    email: string
    phone?: string | null
    specialty: string
    status: string
  } | null
}

type BookingOption = {
  id: string
  sourcePlatform: string
  externalBookingId?: string | null
  guestName?: string | null
  checkInDate: string
  checkOutDate: string
  checkInTime?: string | null
  checkOutTime?: string | null
  status: string
}

type ChecklistTemplateOption = {
  id: string
  title: string
  description?: string | null
  templateType: string
  isPrimary: boolean
  isActive: boolean
}

type TaskAssignment = {
  id: string
  status: string
  assignedAt?: string | null
  acceptedAt?: string | null
  rejectedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  partner?: {
    id: string
    code: string
    name: string
    email: string
    phone?: string | null
    specialty: string
    status: string
  } | null
}

type TaskChecklistRun = {
  id: string
  status: string
  startedAt?: string | null
  completedAt?: string | null
  template?: {
    id: string
    title: string
    description?: string | null
    templateType: string
    isPrimary: boolean
    isActive: boolean
  } | null
  answers?: Array<{
    id: string
    issueCreated?: boolean
    createdAt?: string
  }>
}

type PropertyTask = {
  id: string
  title: string
  description?: string | null
  taskType: string
  source: string
  priority: string
  status: string
  scheduledDate: string
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  dueDate?: string | null
  completedAt?: string | null
  requiresPhotos?: boolean
  requiresChecklist?: boolean
  requiresApproval?: boolean
  notes?: string | null
  resultNotes?: string | null
  createdAt?: string
  updatedAt?: string
  booking?: {
    id: string
    sourcePlatform: string
    externalBookingId?: string | null
    guestName?: string | null
    checkInDate: string
    checkOutDate: string
    status: string
  } | null
  assignments?: TaskAssignment[]
  checklistRun?: TaskChecklistRun | null
  issues?: Array<{
    id: string
    issueType: string
    title: string
    severity: string
    status: string
    createdAt: string
  }>
  taskPhotos?: Array<{
    id: string
    category: string
    fileUrl: string
    fileName?: string | null
    uploadedAt?: string
  }>
  activityLogs?: Array<{
    id: string
    action: string
    message?: string | null
    actorType?: string | null
    actorName?: string | null
    createdAt?: string
  }>
}

type PropertyTasksResponse = {
  property: PropertyInfo
  checklistTemplates: ChecklistTemplateOption[]
  bookings: BookingOption[]
  tasks: PropertyTask[]
}

type TaskFilter =
  | "all"
  | "pending"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"

type CreateTaskFormState = {
  title: string
  description: string
  taskType: string
  source: string
  priority: string
  status: string
  scheduledDate: string
  scheduledStartTime: string
  scheduledEndTime: string
  dueDate: string
  bookingId: string
  checklistTemplateId: string
  requiresPhotos: boolean
  requiresChecklist: boolean
  requiresApproval: boolean
  notes: string
  resultNotes: string
}

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      locale: "en-GB",
      breadcrumbsProperties: "Properties",
      breadcrumbsTasks: "Property tasks",
      pageTitle: "Property tasks",
      backToProperty: "Back to property",
      newTask: "New task",
      closeForm: "Close form",
      status: {
        active: "Active",
        inactive: "Inactive",
        maintenance: "Maintenance",
        archived: "Archived",
        pending: "Pending",
        assigned: "Assigned",
        accepted: "Accepted",
        in_progress: "In progress",
        completed: "Completed",
        cancelled: "Cancelled",
      },
      metrics: {
        total: "Total",
        pending: "Pending",
        assigned: "Assigned",
        accepted: "Accepted",
        inProgress: "In progress",
        completed: "Completed",
        withChecklist: "With checklist",
        withIssues: "With issues",
      },
      create: {
        title: "New property task",
        subtitle:
          "Create a new task already connected to this property.",
        taskTitle: "Task title",
        taskType: "Task type",
        source: "Source",
        priority: "Priority",
        taskStatus: "Status",
        scheduledDate: "Task date",
        startTime: "Start time",
        endTime: "End time",
        dueDate: "Deadline",
        booking: "Linked booking",
        description: "Description",
        blockTitle: "Checklist and requirements",
        requiresChecklist: "Requires checklist",
        requiresPhotos: "Requires photos",
        requiresApproval: "Requires approval",
        checklistTemplate: "Checklist template",
        managerNotes: "Manager notes",
        resultNotes: "Final result",
        submit: "Create task",
        submitting: "Creating...",
        cancel: "Cancel",
        noBooking: "No booking",
        fallbackChecklist: "Use property primary checklist (if available)",
        checklistDisabled: "Checklist is disabled",
      },
      filters: {
        all: "All",
        pending: "Pending",
        assigned: "Assigned",
        accepted: "Accepted",
        inProgress: "In progress",
        completed: "Completed",
        cancelled: "Cancelled",
        searchPlaceholder: "Search task...",
      },
      list: {
        title: "Property task list",
        subtitle: "All tasks related to this property appear here.",
        noTasks: "No tasks match the current filters.",
        viewTask: "View task",
        assignment: "Assignment",
        checklist: "Checklist",
        booking: "Booking",
        issuesPhotos: "Issues / Photos",
        requirements: "Requirements",
        notAssigned: "Not assigned",
        noChecklist: "No checklist",
        noBooking: "No booking",
        issues: "issues",
        photos: "photos",
        noRequirements: "No special requirements",
        checklistWord: "Checklist",
        photosWord: "Photos",
        approvalWord: "Approval",
        date: "Date",
        time: "Time",
        createdAt: "Created",
        priorityPrefix: "Priority",
        notes: "Notes",
        result: "Result",
      },
      loading: "Loading property tasks...",
      errorTitle: "Property tasks loading error",
      backToProperties: "Back to properties",
      types: {
        apartment: "Apartment",
        villa: "Villa",
        house: "House",
        studio: "Studio",
        maisonette: "Maisonette",
      },
      sources: {
        manual: "Manual",
        platform: "Platform",
        booking: "Booking",
        system: "System",
      },
      priorities: {
        low: "Low",
        normal: "Normal",
        medium: "Medium",
        high: "High",
        urgent: "Urgent",
      },
    }
  }

  return {
    locale: "el-GR",
    breadcrumbsProperties: "Ακίνητα",
    breadcrumbsTasks: "Εργασίες ακινήτου",
    pageTitle: "Εργασίες ακινήτου",
    backToProperty: "Επιστροφή στο ακίνητο",
    newTask: "Νέα εργασία",
    closeForm: "Κλείσιμο φόρμας",
    status: {
      active: "Ενεργό",
      inactive: "Ανενεργό",
      maintenance: "Σε συντήρηση",
      archived: "Αρχειοθετημένο",
      pending: "Εκκρεμεί",
      assigned: "Ανατέθηκε",
      accepted: "Αποδεκτή",
      in_progress: "Σε εξέλιξη",
      completed: "Ολοκληρωμένη",
      cancelled: "Ακυρωμένη",
    },
    metrics: {
      total: "Σύνολο",
      pending: "Εκκρεμείς",
      assigned: "Ανατεθειμένες",
      accepted: "Αποδεκτές",
      inProgress: "Σε εξέλιξη",
      completed: "Ολοκληρωμένες",
      withChecklist: "Με checklist",
      withIssues: "Με θέματα",
    },
    create: {
      title: "Νέα εργασία ακινήτου",
      subtitle:
        "Δημιουργία νέας εργασίας ήδη συνδεδεμένης με το συγκεκριμένο ακίνητο.",
      taskTitle: "Τίτλος εργασίας",
      taskType: "Τύπος εργασίας",
      source: "Πηγή",
      priority: "Προτεραιότητα",
      taskStatus: "Κατάσταση",
      scheduledDate: "Ημερομηνία εργασίας",
      startTime: "Ώρα έναρξης",
      endTime: "Ώρα λήξης",
      dueDate: "Προθεσμία",
      booking: "Συνδεδεμένη κράτηση",
      description: "Περιγραφή",
      blockTitle: "Checklist και απαιτήσεις",
      requiresChecklist: "Απαιτεί checklist",
      requiresPhotos: "Απαιτεί φωτογραφίες",
      requiresApproval: "Απαιτεί έγκριση",
      checklistTemplate: "Πρότυπο checklist",
      managerNotes: "Σημειώσεις διαχειριστή",
      resultNotes: "Τελικό αποτέλεσμα",
      submit: "Δημιουργία εργασίας",
      submitting: "Δημιουργία...",
      cancel: "Ακύρωση",
      noBooking: "Χωρίς κράτηση",
      fallbackChecklist: "Χρήση κύριου checklist ακινήτου (αν υπάρχει)",
      checklistDisabled: "Το checklist είναι απενεργοποιημένο",
    },
    filters: {
      all: "Όλες",
      pending: "Εκκρεμείς",
      assigned: "Ανατεθειμένες",
      accepted: "Αποδεκτές",
      inProgress: "Σε εξέλιξη",
      completed: "Ολοκληρωμένες",
      cancelled: "Ακυρωμένες",
      searchPlaceholder: "Αναζήτηση εργασίας...",
    },
    list: {
      title: "Λίστα εργασιών ακινήτου",
      subtitle:
        "Εδώ εμφανίζονται όλες οι εργασίες που συνδέονται με το συγκεκριμένο ακίνητο.",
      noTasks: "Δεν υπάρχουν εργασίες που να ταιριάζουν με τα τρέχοντα φίλτρα.",
      viewTask: "Προβολή εργασίας",
      assignment: "Ανάθεση",
      checklist: "Checklist",
      booking: "Κράτηση",
      issuesPhotos: "Θέματα / Φωτογραφίες",
      requirements: "Απαιτήσεις",
      notAssigned: "Δεν έχει ανατεθεί",
      noChecklist: "Δεν υπάρχει",
      noBooking: "Χωρίς κράτηση",
      issues: "θέματα",
      photos: "φωτογραφίες",
      noRequirements: "Καμία ειδική απαίτηση",
      checklistWord: "Checklist",
      photosWord: "Φωτογραφίες",
      approvalWord: "Έγκριση",
      date: "Ημερομηνία",
      time: "Ώρα",
      createdAt: "Δημιουργία",
      priorityPrefix: "Προτεραιότητα",
      notes: "Σημειώσεις",
      result: "Αποτέλεσμα",
    },
    loading: "Φόρτωση εργασιών ακινήτου...",
    errorTitle: "Σφάλμα φόρτωσης εργασιών ακινήτου",
    backToProperties: "Επιστροφή στα ακίνητα",
    types: {
      apartment: "Διαμέρισμα",
      villa: "Βίλα",
      house: "Κατοικία",
      studio: "Στούντιο",
      maisonette: "Μεζονέτα",
    },
    sources: {
      manual: "Χειροκίνητη",
      platform: "Από πλατφόρμα",
      booking: "Από κράτηση",
      system: "Συστήματος",
    },
    priorities: {
      low: "Χαμηλή",
      normal: "Κανονική",
      medium: "Μεσαία",
      high: "Υψηλή",
      urgent: "Επείγουσα",
    },
  }
}

function formatDate(value?: string | null, locale = "el-GR") {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value?: string | null, locale = "el-GR") {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function propertyStatusLabel(
  status?: string | null,
  texts?: ReturnType<typeof getTexts>
) {
  const key = (status || "").toLowerCase() as keyof ReturnType<typeof getTexts>["status"]
  return texts?.status[key] || status || "—"
}

function taskStatusLabel(
  status?: string | null,
  texts?: ReturnType<typeof getTexts>
) {
  const key = (status || "").toLowerCase() as keyof ReturnType<typeof getTexts>["status"]
  return texts?.status[key] || status || "—"
}

function assignmentStatusLabel(
  status?: string | null,
  texts?: ReturnType<typeof getTexts>
) {
  return taskStatusLabel(status, texts)
}

function checklistStatusLabel(
  status?: string | null,
  texts?: ReturnType<typeof getTexts>
) {
  return taskStatusLabel(status, texts)
}

function typeLabel(value?: string | null) {
  if (!value) return "—"

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function propertyTypeLabel(
  value?: string | null,
  texts?: ReturnType<typeof getTexts>
) {
  const key = (value || "").toLowerCase() as keyof ReturnType<typeof getTexts>["types"]
  return texts?.types[key] || value || "—"
}

function badgeClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "active":
    case "completed":
    case "confirmed":
    case "resolved":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "pending":
    case "assigned":
    case "accepted":
    case "in_progress":
    case "maintenance":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "inactive":
    case "cancelled":
    case "archived":
    case "closed":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
    case "open":
    case "critical":
    case "high":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function sourceLabel(
  value?: string | null,
  texts?: ReturnType<typeof getTexts>
) {
  const key = (value || "").toLowerCase() as keyof ReturnType<typeof getTexts>["sources"]
  return texts?.sources[key] || value || "—"
}

function priorityLabel(
  value?: string | null,
  texts?: ReturnType<typeof getTexts>
) {
  const key = (value || "").toLowerCase() as keyof ReturnType<typeof getTexts>["priorities"]
  return texts?.priorities[key] || value || "—"
}

function getLatestAssignment(task: PropertyTask) {
  const assignments = safeArray(task.assignments)
  return assignments[0] || null
}

function getInitialCreateForm(): CreateTaskFormState {
  const today = new Date()
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)

  return {
    title: "",
    description: "",
    taskType: "cleaning",
    source: "manual",
    priority: "normal",
    status: "pending",
    scheduledDate: localDate,
    scheduledStartTime: "",
    scheduledEndTime: "",
    dueDate: "",
    bookingId: "",
    checklistTemplateId: "",
    requiresPhotos: false,
    requiresChecklist: true,
    requiresApproval: false,
    notes: "",
    resultNotes: "",
  }
}

export default function PropertyTasksPage({ params }: PageProps) {
  const { id } = use(params)
  const { language } = useAppLanguage()
  const texts = getTexts(language)

  const [data, setData] = useState<PropertyTasksResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeFilter, setActiveFilter] = useState<TaskFilter>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [form, setForm] = useState<CreateTaskFormState>(getInitialCreateForm())

  async function loadPropertyTasks() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/properties/${id}/tasks`, {
        cache: "no-store",
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || "Αποτυχία φόρτωσης εργασιών ακινήτου.")
      }

      if (!json || typeof json !== "object") {
        throw new Error("Μη έγκυρη απόκριση από το API εργασιών ακινήτου.")
      }

      setData(json)
    } catch (err) {
      console.error("Load property tasks error:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Αποτυχία φόρτωσης σελίδας εργασιών ακινήτου."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPropertyTasks()
  }, [id])

  const property = data?.property ?? null
  const tasks = safeArray(data?.tasks)
  const bookings = safeArray(data?.bookings)
  const checklistTemplates = safeArray(data?.checklistTemplates)

  const metrics = useMemo(() => {
    const pending = tasks.filter((task) => task.status === "pending").length
    const assigned = tasks.filter((task) => task.status === "assigned").length
    const accepted = tasks.filter((task) => task.status === "accepted").length
    const inProgress = tasks.filter((task) => task.status === "in_progress").length
    const completed = tasks.filter((task) => task.status === "completed").length
    const cancelled = tasks.filter((task) => task.status === "cancelled").length
    const withChecklist = tasks.filter((task) => !!task.checklistRun).length
    const withIssues = tasks.filter((task) => safeArray(task.issues).length > 0).length

    return {
      total: tasks.length,
      pending,
      assigned,
      accepted,
      inProgress,
      completed,
      cancelled,
      withChecklist,
      withIssues,
    }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    let result = [...tasks]

    if (activeFilter !== "all") {
      result = result.filter((task) => task.status === activeFilter)
    }

    const term = searchTerm.trim().toLowerCase()

    if (term) {
      result = result.filter((task) => {
        const text = [
          task.title,
          task.description,
          task.taskType,
          task.source,
          task.priority,
          task.status,
          task.booking?.guestName,
          getLatestAssignment(task)?.partner?.name,
          task.checklistRun?.template?.title,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return text.includes(term)
      })
    }

    return result
  }, [tasks, activeFilter, searchTerm])

  async function handleCreateTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    try {
      setSubmitting(true)
      setSubmitError(null)

      const payload = {
        title: form.title,
        description: form.description || null,
        taskType: form.taskType,
        source: form.source,
        priority: form.priority,
        status: form.status,
        scheduledDate: form.scheduledDate,
        scheduledStartTime: form.scheduledStartTime || null,
        scheduledEndTime: form.scheduledEndTime || null,
        dueDate: form.dueDate || null,
        bookingId: form.bookingId || null,
        checklistTemplateId: form.checklistTemplateId || null,
        requiresPhotos: form.requiresPhotos,
        requiresChecklist: form.requiresChecklist,
        requiresApproval: form.requiresApproval,
        notes: form.notes || null,
        resultNotes: form.resultNotes || null,
      }

      const res = await fetch(`/api/properties/${id}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || "Αποτυχία δημιουργίας εργασίας.")
      }

      setForm(getInitialCreateForm())
      setShowCreateForm(false)
      await loadPropertyTasks()
    } catch (err) {
      console.error("Create property task error:", err)
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Παρουσιάστηκε σφάλμα κατά τη δημιουργία εργασίας."
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">{texts.loading}</div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          {texts.errorTitle}
        </h1>
        <p className="mt-2 text-sm text-red-600">
          {error || "Δεν βρέθηκαν δεδομένα ακινήτου."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/properties/${id}`}
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {texts.backToProperty}
          </Link>

          <Link
            href="/properties"
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {texts.backToProperties}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/properties"
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              {texts.breadcrumbsProperties}
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href={`/properties/${property.id}`}
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              {property.code}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-600">{texts.breadcrumbsTasks}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {texts.pageTitle}
            </h1>

            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                property.status
              )}`}
            >
              {propertyStatusLabel(property.status, texts)}
            </span>

            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              {propertyTypeLabel(property.type, texts)}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            {property.name} · {property.address}, {property.city}, {property.region},{" "}
            {property.postalCode}, {property.country}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/properties/${property.id}`}
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {texts.backToProperty}
          </Link>

          <button
            type="button"
            onClick={() => {
              setShowCreateForm((prev) => !prev)
              setSubmitError(null)
            }}
            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {showCreateForm ? texts.closeForm : texts.newTask}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">{texts.metrics.total}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{metrics.total}</div>
        </div>

        <button
          type="button"
          onClick={() => setActiveFilter("pending")}
          className={`rounded-2xl border p-5 shadow-sm text-left transition ${
            activeFilter === "pending"
              ? "border-amber-300 bg-amber-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.metrics.pending}</div>
          <div className="mt-2 text-3xl font-bold text-amber-700">{metrics.pending}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("assigned")}
          className={`rounded-2xl border p-5 shadow-sm text-left transition ${
            activeFilter === "assigned"
              ? "border-amber-300 bg-amber-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.metrics.assigned}</div>
          <div className="mt-2 text-3xl font-bold text-amber-700">{metrics.assigned}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("accepted")}
          className={`rounded-2xl border p-5 shadow-sm text-left transition ${
            activeFilter === "accepted"
              ? "border-amber-300 bg-amber-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.metrics.accepted}</div>
          <div className="mt-2 text-3xl font-bold text-amber-700">{metrics.accepted}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("in_progress")}
          className={`rounded-2xl border p-5 shadow-sm text-left transition ${
            activeFilter === "in_progress"
              ? "border-blue-300 bg-blue-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.metrics.inProgress}</div>
          <div className="mt-2 text-3xl font-bold text-blue-700">{metrics.inProgress}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("completed")}
          className={`rounded-2xl border p-5 shadow-sm text-left transition ${
            activeFilter === "completed"
              ? "border-emerald-300 bg-emerald-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.metrics.completed}</div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">{metrics.completed}</div>
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">{texts.metrics.withChecklist}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{metrics.withChecklist}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">{texts.metrics.withIssues}</div>
          <div className="mt-2 text-3xl font-bold text-red-700">{metrics.withIssues}</div>
        </div>
      </div>

      {showCreateForm ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">{texts.create.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{texts.create.subtitle}</p>
          </div>

          <form onSubmit={handleCreateTask} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {texts.create.taskTitle}
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder={language === "en" ? "e.g. Cleaning before arrival" : "π.χ. Καθαρισμός πριν άφιξη"}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {texts.create.taskType}
                </label>
                <select
                  value={form.taskType}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, taskType: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="cleaning">{language === "en" ? "Cleaning" : "Καθαρισμός"}</option>
                  <option value="inspection">{language === "en" ? "Inspection" : "Επιθεώρηση"}</option>
                  <option value="repair">{language === "en" ? "Repair / Maintenance" : "Βλάβη / Επισκευή"}</option>
                  <option value="damage">{language === "en" ? "Damage" : "Ζημιά"}</option>
                  <option value="supplies">{language === "en" ? "Supplies" : "Αναλώσιμα"}</option>
                  <option value="photos">{language === "en" ? "Photo documentation" : "Φωτογραφική τεκμηρίωση"}</option>
                  <option value="custom">{language === "en" ? "Other task" : "Άλλη εργασία"}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {texts.create.source}
                </label>
                <select
                  value={form.source}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, source: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="manual">{texts.sources.manual}</option>
                  <option value="platform">{texts.sources.platform}</option>
                  <option value="booking">{texts.sources.booking}</option>
                  <option value="system">{texts.sources.system}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {texts.create.priority}
                </label>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, priority: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="low">{texts.priorities.low}</option>
                  <option value="normal">{texts.priorities.normal}</option>
                  <option value="medium">{texts.priorities.medium}</option>
                  <option value="high">{texts.priorities.high}</option>
                  <option value="urgent">{texts.priorities.urgent}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {texts.create.taskStatus}
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="pending">{texts.status.pending}</option>
                  <option value="assigned">{texts.status.assigned}</option>
                  <option value="accepted">{texts.status.accepted}</option>
                  <option value="in_progress">{texts.status.in_progress}</option>
                  <option value="completed">{texts.status.completed}</option>
                  <option value="cancelled">{texts.status.cancelled}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {texts.create.scheduledDate}
                </label>
                <input
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, scheduledDate: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {texts.create.startTime}
                </label>
                <input
                  type="time"
                  value={form.scheduledStartTime}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      scheduledStartTime: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {texts.create.endTime}
                </label>
                <input
                  type="time"
                  value={form.scheduledEndTime}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      scheduledEndTime: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {texts.create.dueDate}
                </label>
                <input
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div className="xl:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {texts.create.booking}
                </label>
                <select
                  value={form.bookingId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, bookingId: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="">{texts.create.noBooking}</option>
                  {bookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.guestName || texts.create.noBooking} · {booking.sourcePlatform} ·{" "}
                      {formatDate(booking.checkInDate, texts.locale)} - {formatDate(booking.checkOutDate, texts.locale)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="xl:col-span-3">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {texts.create.description}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder={language === "en" ? "Task details" : "Λεπτομέρειες για την εργασία"}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">{texts.create.blockTitle}</h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.requiresChecklist}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        requiresChecklist: e.target.checked,
                        checklistTemplateId: e.target.checked
                          ? prev.checklistTemplateId
                          : "",
                      }))
                    }
                  />
                  {texts.create.requiresChecklist}
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.requiresPhotos}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        requiresPhotos: e.target.checked,
                      }))
                    }
                  />
                  {texts.create.requiresPhotos}
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.requiresApproval}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        requiresApproval: e.target.checked,
                      }))
                    }
                  />
                  {texts.create.requiresApproval}
                </label>

                <div className="md:col-span-2 xl:col-span-3">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {texts.create.checklistTemplate}
                  </label>
                  <select
                    value={form.checklistTemplateId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        checklistTemplateId: e.target.value,
                      }))
                    }
                    disabled={!form.requiresChecklist}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500"
                  >
                    <option value="">
                      {form.requiresChecklist
                        ? texts.create.fallbackChecklist
                        : texts.create.checklistDisabled}
                    </option>
                    {checklistTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                        {template.isPrimary ? ` · ${language === "en" ? "Primary" : "Κύριο"}` : ""}
                        {template.templateType ? ` · ${typeLabel(template.templateType)}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {texts.create.managerNotes}
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder={language === "en" ? "Internal notes" : "Εσωτερικές σημειώσεις"}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {texts.create.resultNotes}
                </label>
                <textarea
                  value={form.resultNotes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, resultNotes: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder={language === "en" ? "Optional field" : "Προαιρετικό πεδίο"}
                />
              </div>
            </div>

            {submitError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? texts.create.submitting : texts.create.submit}
              </button>

              <button
                type="button"
                onClick={() => {
                  setForm(getInitialCreateForm())
                  setSubmitError(null)
                  setShowCreateForm(false)
                }}
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {texts.create.cancel}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              { key: "all", label: texts.filters.all },
              { key: "pending", label: texts.filters.pending },
              { key: "assigned", label: texts.filters.assigned },
              { key: "accepted", label: texts.filters.accepted },
              { key: "in_progress", label: texts.filters.inProgress },
              { key: "completed", label: texts.filters.completed },
              { key: "cancelled", label: texts.filters.cancelled },
            ] as Array<{ key: TaskFilter; label: string }>).map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${
                  activeFilter === filter.key
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="w-full xl:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={texts.filters.searchPlaceholder}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{texts.list.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{texts.list.subtitle}</p>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">{texts.list.noTasks}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTasks.map((task) => {
              const latestAssignment = getLatestAssignment(task)
              const issueCount = safeArray(task.issues).length
              const photoCount = safeArray(task.taskPhotos).length
              const checklistAnswers = safeArray(task.checklistRun?.answers).length

              return (
                <div key={task.id} className="p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-slate-900">{task.title}</div>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                            task.status
                          )}`}
                        >
                          {taskStatusLabel(task.status, texts)}
                        </span>

                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {typeLabel(task.taskType)}
                        </span>

                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {sourceLabel(task.source, texts)}
                        </span>

                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {texts.list.priorityPrefix}: {priorityLabel(task.priority, texts)}
                        </span>
                      </div>

                      {task.description ? (
                        <div className="mt-2 text-sm text-slate-700">{task.description}</div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>
                          {texts.list.date}: {formatDate(task.scheduledDate, texts.locale)}
                        </span>
                        <span>•</span>
                        <span>
                          {texts.list.time}: {task.scheduledStartTime || "—"}
                          {task.scheduledEndTime ? ` - ${task.scheduledEndTime}` : ""}
                        </span>
                        <span>•</span>
                        <span>
                          {texts.list.createdAt}: {formatDateTime(task.createdAt, texts.locale)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        {texts.list.viewTask}
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {texts.list.assignment}
                      </div>
                      <div className="mt-1 text-sm text-slate-900">
                        {latestAssignment?.partner?.name || texts.list.notAssigned}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {latestAssignment
                          ? assignmentStatusLabel(latestAssignment.status, texts)
                          : "—"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {texts.list.checklist}
                      </div>
                      <div className="mt-1 text-sm text-slate-900">
                        {task.checklistRun?.template?.title || texts.list.noChecklist}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {task.checklistRun
                          ? `${checklistStatusLabel(task.checklistRun.status, texts)} · ${checklistAnswers}`
                          : "—"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {texts.list.booking}
                      </div>
                      <div className="mt-1 text-sm text-slate-900">
                        {task.booking?.guestName || texts.list.noBooking}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {task.booking
                          ? `${task.booking.sourcePlatform} · ${formatDate(task.booking.checkInDate, texts.locale)}`
                          : "—"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {texts.list.issuesPhotos}
                      </div>
                      <div className="mt-1 text-sm text-slate-900">
                        {issueCount} {texts.list.issues}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {photoCount} {texts.list.photos}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {texts.list.requirements}
                      </div>
                      <div className="mt-1 text-sm text-slate-900">
                        {task.requiresChecklist ? `${texts.list.checklistWord} ` : ""}
                        {task.requiresPhotos ? `${texts.list.photosWord} ` : ""}
                        {task.requiresApproval ? `${texts.list.approvalWord} ` : ""}
                        {!task.requiresChecklist &&
                        !task.requiresPhotos &&
                        !task.requiresApproval
                          ? texts.list.noRequirements
                          : ""}
                      </div>
                    </div>
                  </div>

                  {task.notes ? (
                    <div className="mt-3 text-sm text-slate-600">
                      {texts.list.notes}: {task.notes}
                    </div>
                  ) : null}

                  {task.resultNotes ? (
                    <div className="mt-2 text-sm text-slate-600">
                      {texts.list.result}: {task.resultNotes}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}