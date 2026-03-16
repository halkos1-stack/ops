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
  | "all_open"
  | "pending"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "without_assignment"
  | "with_checklist"

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
      pageSubtitle:
        "This page shows only open tasks for the selected property.",
      backToProperty: "Back to property",
      newTask: "New task",
      closeForm: "Close form",
      completedHistory: "Completed task history",

      status: {
        active: "Active",
        inactive: "Inactive",
        maintenance: "Maintenance",
        archived: "Archived",
        pending: "New",
        assigned: "Assigned",
        accepted: "Accepted",
        in_progress: "In progress",
        completed: "Completed",
        cancelled: "Cancelled",
      },

      metrics: {
        allOpen: "Open tasks",
        pending: "New",
        assigned: "Assigned",
        accepted: "Accepted",
        inProgress: "In progress",
        completed: "Completed",
        withoutAssignment: "Without assignment",
        withChecklist: "With checklist",
      },

      create: {
        title: "New property task",
        subtitle: "Create a new task linked directly to this property.",
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

      list: {
        title: "Open property tasks",
        subtitle: "Operational view of tasks that still need action.",
        noTasks: "No open tasks found.",
        viewTask: "View task",
        activeChecklist: "Active checklist",
        noChecklist: "No checklist",
        noBooking: "No booking",
        notAssigned: "Not assigned",
        notes: "Notes",
        result: "Result",
      },

      fields: {
        date: "Date",
        time: "Time",
        booking: "Booking",
        partner: "Assigned partner",
        status: "Task status",
        nextStep: "Next step",
        actionGuide: "What is needed now",
        checklistStatus: "Checklist status",
        requirements: "Requirements",
        createdAt: "Created",
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

      requirements: {
        checklist: "Checklist",
        photos: "Photos",
        approval: "Approval",
        none: "No special requirements",
      },
    }
  }

  return {
    locale: "el-GR",
    breadcrumbsProperties: "Ακίνητα",
    breadcrumbsTasks: "Εργασίες ακινήτου",
    pageTitle: "Εργασίες ακινήτου",
    pageSubtitle:
      "Η σελίδα αυτή δείχνει μόνο τις ανοιχτές εργασίες του συγκεκριμένου ακινήτου.",
    backToProperty: "Επιστροφή στο ακίνητο",
    newTask: "Νέα εργασία",
    closeForm: "Κλείσιμο φόρμας",
    completedHistory: "Ιστορικό ολοκληρωμένων εργασιών",

    status: {
      active: "Ενεργό",
      inactive: "Ανενεργό",
      maintenance: "Σε συντήρηση",
      archived: "Αρχειοθετημένο",
      pending: "Νέα",
      assigned: "Ανατέθηκε",
      accepted: "Αποδεκτή",
      in_progress: "Σε εξέλιξη",
      completed: "Ολοκληρωμένη",
      cancelled: "Ακυρωμένη",
    },

    metrics: {
      allOpen: "Ανοιχτές εργασίες",
      pending: "Νέες",
      assigned: "Ανατεθειμένες",
      accepted: "Αποδεκτές",
      inProgress: "Σε εξέλιξη",
      completed: "Ολοκληρωμένες",
      withoutAssignment: "Χωρίς ανάθεση",
      withChecklist: "Με checklist",
    },

    create: {
      title: "Νέα εργασία ακινήτου",
      subtitle:
        "Δημιουργία νέας εργασίας συνδεδεμένης απευθείας με το συγκεκριμένο ακίνητο.",
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

    list: {
      title: "Ανοιχτές εργασίες ακινήτου",
      subtitle:
        "Καθαρή εικόνα μόνο για εργασίες που χρειάζονται ακόμη ενέργεια.",
      noTasks: "Δεν υπάρχουν ανοιχτές εργασίες.",
      viewTask: "Προβολή εργασίας",
      activeChecklist: "Ενεργή λίστα",
      noChecklist: "Δεν υπάρχει λίστα",
      noBooking: "Χωρίς κράτηση",
      notAssigned: "Δεν έχει ανατεθεί",
      notes: "Σημειώσεις",
      result: "Αποτέλεσμα",
    },

    fields: {
      date: "Ημερομηνία",
      time: "Ώρα",
      booking: "Κράτηση",
      partner: "Ανατεθειμένος συνεργάτης",
      status: "Κατάσταση εργασίας",
      nextStep: "Επόμενο βήμα",
      actionGuide: "Τι χρειάζεται τώρα",
      checklistStatus: "Κατάσταση λίστας",
      requirements: "Απαιτήσεις",
      createdAt: "Δημιουργία",
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

    requirements: {
      checklist: "Checklist",
      photos: "Φωτογραφίες",
      approval: "Έγκριση",
      none: "Καμία ειδική απαίτηση",
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
  const normalized = (status || "").toLowerCase()

  if (texts?.locale === "en-GB") {
    if (normalized === "pending") return "Pending"
    if (normalized === "in_progress") return "In progress"
    if (normalized === "completed") return "Submitted"
    return status || "—"
  }

  if (normalized === "pending") return "Σε αναμονή"
  if (normalized === "in_progress") return "Σε εξέλιξη"
  if (normalized === "completed") return "Υποβλήθηκε"
  return status || "—"
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

function priorityBadgeClasses(priority?: string | null) {
  switch ((priority || "").toLowerCase()) {
    case "urgent":
    case "critical":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    case "high":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "medium":
    case "normal":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
    case "low":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
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

function isOpenTask(task: PropertyTask) {
  return ["pending", "assigned", "accepted", "in_progress"].includes(
    String(task.status || "").toLowerCase()
  )
}

function getTaskActionGuide(
  task: PropertyTask,
  texts: ReturnType<typeof getTexts>
) {
  const status = String(task.status || "").toLowerCase()
  const checklistStatus = String(task.checklistRun?.status || "").toLowerCase()

  if (status === "pending") {
    return {
      step: "Ανάθεση συνεργάτη",
      guide: "Η εργασία είναι νέα και χρειάζεται ανάθεση.",
    }
  }

  if (status === "assigned") {
    return {
      step: "Αναμονή αποδοχής",
      guide: "Η εργασία έχει ανατεθεί και περιμένει αποδοχή.",
    }
  }

  if (status === "accepted" && task.requiresChecklist && checklistStatus !== "completed") {
    return {
      step: "Αναμονή υποβολής λίστας",
      guide: "Ο συνεργάτης αποδέχτηκε την εργασία.",
    }
  }

  if (status === "accepted" && !task.requiresChecklist) {
    return {
      step: "Έναρξη εκτέλεσης",
      guide: "Ο συνεργάτης αποδέχτηκε την εργασία.",
    }
  }

  if (status === "in_progress" && task.requiresChecklist && checklistStatus !== "completed") {
    return {
      step: "Αναμονή υποβολής λίστας",
      guide: "Η εργασία εκτελείται και αναμένεται η υποβολή της λίστας.",
    }
  }

  if (status === "in_progress" && checklistStatus === "completed") {
    return {
      step: "Έλεγχος και ολοκλήρωση",
      guide: "Η λίστα υποβλήθηκε και μένει ο τελικός έλεγχος.",
    }
  }

  return {
    step: "Έλεγχος εργασίας",
    guide: "Άνοιξε την εργασία για πλήρη εικόνα.",
  }
}

function getRequirementsText(
  task: PropertyTask,
  texts: ReturnType<typeof getTexts>
) {
  const values: string[] = []

  if (task.requiresChecklist) values.push(texts.requirements.checklist)
  if (task.requiresPhotos) values.push(texts.requirements.photos)
  if (task.requiresApproval) values.push(texts.requirements.approval)

  if (values.length === 0) return texts.requirements.none

  return values.join(" • ")
}

export default function PropertyTasksPage({ params }: PageProps) {
  const { id } = use(params)
  const { language } = useAppLanguage()
  const texts = getTexts(language)

  const [data, setData] = useState<PropertyTasksResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeFilter, setActiveFilter] = useState<TaskFilter>("all_open")
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

  const openTasks = useMemo(() => {
    return tasks.filter(isOpenTask)
  }, [tasks])

  const metrics = useMemo(() => {
    const allOpen = openTasks.length
    const pending = openTasks.filter((task) => task.status === "pending").length
    const assigned = openTasks.filter((task) => task.status === "assigned").length
    const accepted = openTasks.filter((task) => task.status === "accepted").length
    const inProgress = openTasks.filter((task) => task.status === "in_progress").length
    const completed = tasks.filter((task) => task.status === "completed").length
    const withoutAssignment = openTasks.filter(
      (task) => !getLatestAssignment(task)?.partner?.id
    ).length
    const withChecklist = openTasks.filter((task) => !!task.checklistRun).length

    return {
      allOpen,
      pending,
      assigned,
      accepted,
      inProgress,
      completed,
      withoutAssignment,
      withChecklist,
    }
  }, [openTasks, tasks])

  const filteredTasks = useMemo(() => {
    let result = [...openTasks]

    if (activeFilter === "pending") {
      result = result.filter((task) => task.status === "pending")
    }

    if (activeFilter === "assigned") {
      result = result.filter((task) => task.status === "assigned")
    }

    if (activeFilter === "accepted") {
      result = result.filter((task) => task.status === "accepted")
    }

    if (activeFilter === "in_progress") {
      result = result.filter((task) => task.status === "in_progress")
    }

    if (activeFilter === "without_assignment") {
      result = result.filter((task) => !getLatestAssignment(task)?.partner?.id)
    }

    if (activeFilter === "with_checklist") {
      result = result.filter((task) => !!task.checklistRun)
    }

    return result.sort((a, b) => {
      const aDate = new Date(a.scheduledDate).getTime()
      const bDate = new Date(b.scheduledDate).getTime()
      return aDate - bDate
    })
  }, [openTasks, activeFilter])

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

          <p className="mt-2 text-sm text-slate-500">{texts.pageSubtitle}</p>
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
        <button
          type="button"
          onClick={() => setActiveFilter("all_open")}
          className={`rounded-2xl border p-5 shadow-sm text-left transition ${
            activeFilter === "all_open"
              ? "border-slate-900 bg-slate-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.metrics.allOpen}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{metrics.allOpen}</div>
        </button>

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
              ? "border-blue-300 bg-blue-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.metrics.accepted}</div>
          <div className="mt-2 text-3xl font-bold text-blue-700">{metrics.accepted}</div>
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

        <Link
          href={`/properties/${property.id}/tasks/history`}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-left transition hover:bg-slate-50"
        >
          <div className="text-sm text-slate-500">{texts.metrics.completed}</div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">{metrics.completed}</div>
          <div className="mt-2 text-xs text-slate-500">{texts.completedHistory}</div>
        </Link>

        <button
          type="button"
          onClick={() => setActiveFilter("without_assignment")}
          className={`rounded-2xl border p-5 shadow-sm text-left transition ${
            activeFilter === "without_assignment"
              ? "border-red-300 bg-red-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.metrics.withoutAssignment}</div>
          <div className="mt-2 text-3xl font-bold text-red-700">{metrics.withoutAssignment}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("with_checklist")}
          className={`rounded-2xl border p-5 shadow-sm text-left transition ${
            activeFilter === "with_checklist"
              ? "border-slate-900 bg-slate-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.metrics.withChecklist}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{metrics.withChecklist}</div>
        </button>
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
                  placeholder="π.χ. Καθαρισμός πριν άφιξη"
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
                  <option value="cleaning">Καθαρισμός</option>
                  <option value="inspection">Επιθεώρηση</option>
                  <option value="repair">Βλάβη / Επισκευή</option>
                  <option value="damage">Ζημιά</option>
                  <option value="supplies">Αναλώσιμα</option>
                  <option value="photos">Φωτογραφική τεκμηρίωση</option>
                  <option value="custom">Άλλη εργασία</option>
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
                  placeholder="Λεπτομέρειες για την εργασία"
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
                        {template.isPrimary ? " · Κύριο" : ""}
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
                  placeholder="Εσωτερικές σημειώσεις"
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
                  placeholder="Προαιρετικό πεδίο"
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
              const taskGuide = getTaskActionGuide(task, texts)
              const activeChecklistName =
                task.checklistRun?.template?.title || texts.list.noChecklist

              return (
                <div key={task.id} className="p-5">
                  <div className="flex flex-col gap-4">
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

                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadgeClasses(
                              task.priority
                            )}`}
                          >
                            {priorityLabel(task.priority, texts)}
                          </span>

                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                            {typeLabel(task.taskType)}
                          </span>

                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                            {sourceLabel(task.source, texts)}
                          </span>
                        </div>

                        {task.description ? (
                          <div className="mt-2 text-sm text-slate-700">{task.description}</div>
                        ) : null}
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

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {texts.fields.status}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {taskStatusLabel(task.status, texts)}
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          {taskGuide.guide}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {texts.fields.nextStep}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {taskGuide.step}
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          {texts.fields.actionGuide}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {texts.list.activeChecklist}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {activeChecklistName}
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          {texts.fields.checklistStatus}:{" "}
                          {task.checklistRun
                            ? checklistStatusLabel(task.checklistRun.status, texts)
                            : "—"}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <InfoBox
                        label={texts.fields.date}
                        value={formatDate(task.scheduledDate, texts.locale)}
                      />

                      <InfoBox
                        label={texts.fields.time}
                        value={`${task.scheduledStartTime || "—"}${
                          task.scheduledEndTime ? ` - ${task.scheduledEndTime}` : ""
                        }`}
                      />

                      <InfoBox
                        label={texts.fields.partner}
                        value={latestAssignment?.partner?.name || texts.list.notAssigned}
                      />

                      <InfoBox
                        label={texts.fields.booking}
                        value={
                          task.booking?.guestName
                            ? `${task.booking.guestName} · ${formatDate(
                                task.booking.checkInDate,
                                texts.locale
                              )}`
                            : texts.list.noBooking
                        }
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {texts.fields.requirements}
                        </div>
                        <div className="mt-2 text-sm text-slate-900">
                          {getRequirementsText(task, texts)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {texts.fields.createdAt}
                        </div>
                        <div className="mt-2 text-sm text-slate-900">
                          {formatDateTime(task.createdAt, texts.locale)}
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          {latestAssignment
                            ? assignmentStatusLabel(latestAssignment.status, texts)
                            : texts.list.notAssigned}
                        </div>
                      </div>
                    </div>

                    {task.notes ? (
                      <div className="text-sm text-slate-600">
                        {texts.list.notes}: {task.notes}
                      </div>
                    ) : null}

                    {task.resultNotes ? (
                      <div className="text-sm text-slate-600">
                        {texts.list.result}: {task.resultNotes}
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  )
}