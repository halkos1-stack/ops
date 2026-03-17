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
  requiresApproval?: boolean
  sendCleaningChecklist?: boolean
  sendSuppliesChecklist?: boolean
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
  cleaningChecklistRun?: TaskChecklistRun | null
  suppliesChecklistRun?: TaskChecklistRun | null
  checklistRun?: TaskChecklistRun | null
  issues?: Array<{
    id: string
    issueType: string
    title: string
    severity: string
    status: string
    createdAt: string
  }>
}

type PropertyTasksResponse = {
  property: PropertyInfo
  checklistTemplates: ChecklistTemplateOption[]
  bookings: BookingOption[]
  tasks: PropertyTask[]
}

type PropertyChecklistResponse = {
  primaryTemplate?: ChecklistTemplateOption | null
}

type PropertySuppliesResponse = {
  activeSupplies?: Array<{
    id: string
    propertyId?: string
    supplyItemId?: string
  }>
}

type TaskFilter =
  | "all_open"
  | "pending"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "without_assignment"
  | "with_cleaning"
  | "with_supplies"

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
  sendCleaningChecklist: boolean
  sendSuppliesChecklist: boolean
  requiresPhotos: boolean
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
      cancelTask: "Cancel task",
      cancelling: "Cancelling...",
      cancelTaskConfirm:
        "Are you sure you want to cancel this task?",
      cancelSuccess: "Task cancelled successfully.",
      cancelError: "Task cancellation failed.",

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
        withCleaning: "With cleaning list",
        withSupplies: "With supplies list",
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
        blockTitle: "Task sections and requirements",
        sendCleaningChecklist: "Send cleaning checklist",
        sendSuppliesChecklist: "Send supplies checklist",
        requiresPhotos: "Requires photos",
        requiresApproval: "Requires approval",
        managerNotes: "Manager notes",
        resultNotes: "Final result",
        submit: "Create task",
        submitting: "Creating...",
        cancel: "Cancel",
        noBooking: "No booking",
        primaryChecklistLabel: "Primary cleaning checklist",
        activeSuppliesLabel: "Active property supplies",
        noPrimaryChecklist:
          "No primary cleaning checklist has been set for this property.",
        noActiveSupplies:
          "There are no active supplies for this property yet.",
        helperText:
          "The cleaning checklist uses the property's primary list. The supplies checklist uses the property's active supplies.",
        atLeastOneSection:
          "You must select at least one task section.",
      },

      list: {
        title: "Open property tasks",
        subtitle: "Operational view of tasks that still need action.",
        noTasks: "No open tasks found.",
        viewTask: "View task",
        noBooking: "No booking",
        notAssigned: "Not assigned",
        notes: "Notes",
        result: "Result",
        cleaningSection: "Cleaning checklist",
        suppliesSection: "Supplies checklist",
        notEnabled: "Not sent",
        submitted: "Submitted",
        notSubmitted: "Not submitted",
        autoSupplies: "Automatic from active supplies",
      },

      fields: {
        date: "Date",
        time: "Time",
        booking: "Booking",
        partner: "Assigned partner",
        status: "Task status",
        nextStep: "Next step",
        actionGuide: "What is needed now",
        requirements: "Requirements",
        createdAt: "Created",
        assignment: "Assignment",
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
        cleaning: "Cleaning list",
        supplies: "Supplies list",
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
    cancelTask: "Ακύρωση εργασίας",
    cancelling: "Ακύρωση...",
    cancelTaskConfirm:
      "Είσαι σίγουρος ότι θέλεις να ακυρώσεις αυτή την εργασία;",
    cancelSuccess: "Η εργασία ακυρώθηκε επιτυχώς.",
    cancelError: "Αποτυχία ακύρωσης εργασίας.",

    status: {
      active: "Ενεργό",
      inactive: "Ανενεργό",
      maintenance: "Σε συντήρηση",
      archived: "Αρχειοθετημένο",
      pending: "Νέα",
      assigned: "Ανατεθειμένες",
      accepted: "Αποδεκτές",
      in_progress: "Σε εξέλιξη",
      completed: "Ολοκληρωμένες",
      cancelled: "Ακυρωμένες",
    },

    metrics: {
      allOpen: "Ανοιχτές εργασίες",
      pending: "Νέες",
      assigned: "Ανατεθειμένες",
      accepted: "Αποδεκτές",
      inProgress: "Σε εξέλιξη",
      completed: "Ολοκληρωμένες",
      withoutAssignment: "Χωρίς ανάθεση",
      withCleaning: "Με λίστα καθαριότητας",
      withSupplies: "Με λίστα αναλωσίμων",
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
      blockTitle: "Ενότητες εργασίας και απαιτήσεις",
      sendCleaningChecklist: "Αποστολή λίστας καθαριότητας",
      sendSuppliesChecklist: "Αποστολή λίστας αναλωσίμων",
      requiresPhotos: "Απαιτεί φωτογραφίες",
      requiresApproval: "Απαιτεί έγκριση",
      managerNotes: "Σημειώσεις διαχειριστή",
      resultNotes: "Τελικό αποτέλεσμα",
      submit: "Δημιουργία εργασίας",
      submitting: "Δημιουργία...",
      cancel: "Ακύρωση",
      noBooking: "Χωρίς κράτηση",
      primaryChecklistLabel: "Βασική λίστα καθαριότητας",
      activeSuppliesLabel: "Ενεργά αναλώσιμα ακινήτου",
      noPrimaryChecklist:
        "Δεν έχει οριστεί βασική λίστα καθαριότητας για αυτό το ακίνητο.",
      noActiveSupplies:
        "Δεν υπάρχουν ακόμη ενεργά αναλώσιμα για αυτό το ακίνητο.",
      helperText:
        "Η λίστα καθαριότητας χρησιμοποιεί αυτόματα τη βασική λίστα του ακινήτου. Η λίστα αναλωσίμων χρησιμοποιεί τα ενεργά αναλώσιμα του ακινήτου.",
      atLeastOneSection:
        "Πρέπει να επιλέξεις τουλάχιστον μία ενότητα εργασίας.",
    },

    list: {
      title: "Ανοιχτές εργασίες ακινήτου",
      subtitle:
        "Καθαρή εικόνα μόνο για εργασίες που χρειάζονται ακόμη ενέργεια.",
      noTasks: "Δεν υπάρχουν ανοιχτές εργασίες.",
      viewTask: "Προβολή εργασίας",
      noBooking: "Χωρίς κράτηση",
      notAssigned: "Δεν έχει ανατεθεί",
      notes: "Σημειώσεις",
      result: "Αποτέλεσμα",
      cleaningSection: "Λίστα καθαριότητας",
      suppliesSection: "Λίστα αναλωσίμων",
      notEnabled: "Δεν στάλθηκε",
      submitted: "Υποβλήθηκε",
      notSubmitted: "Δεν υποβλήθηκε",
      autoSupplies: "Αυτόματα από τα ενεργά αναλώσιμα",
    },

    fields: {
      date: "Ημερομηνία",
      time: "Ώρα",
      booking: "Κράτηση",
      partner: "Ανατεθειμένος συνεργάτης",
      status: "Κατάσταση εργασίας",
      nextStep: "Επόμενο βήμα",
      actionGuide: "Τι χρειάζεται τώρα",
      requirements: "Απαιτήσεις",
      createdAt: "Δημιουργία",
      assignment: "Ανάθεση",
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
      cleaning: "Λίστα καθαριότητας",
      supplies: "Λίστα αναλωσίμων",
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
  const key = (status || "").toLowerCase() as keyof ReturnType<
    typeof getTexts
  >["status"]
  return texts?.status[key] || status || "—"
}

function taskStatusLabel(
  status?: string | null,
  texts?: ReturnType<typeof getTexts>
) {
  const key = (status || "").toLowerCase() as keyof ReturnType<
    typeof getTexts
  >["status"]
  return texts?.status[key] || status || "—"
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
    if (normalized === "submitted") return "Submitted"
    return status || "—"
  }

  if (normalized === "pending") return "Σε αναμονή"
  if (normalized === "in_progress") return "Σε εξέλιξη"
  if (normalized === "completed") return "Υποβλήθηκε"
  if (normalized === "submitted") return "Υποβλήθηκε"
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
  const key = (value || "").toLowerCase() as keyof ReturnType<
    typeof getTexts
  >["types"]
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
  const key = (value || "").toLowerCase() as keyof ReturnType<
    typeof getTexts
  >["sources"]
  return texts?.sources[key] || value || "—"
}

function priorityLabel(
  value?: string | null,
  texts?: ReturnType<typeof getTexts>
) {
  const key = (value || "").toLowerCase() as keyof ReturnType<
    typeof getTexts
  >["priorities"]
  return texts?.priorities[key] || value || "—"
}

function getLatestAssignment(task: PropertyTask) {
  const assignments = safeArray(task.assignments)
  return assignments[0] || null
}

function getCleaningRun(task: PropertyTask) {
  if (task.cleaningChecklistRun) return task.cleaningChecklistRun
  if (task.sendCleaningChecklist && task.checklistRun) return task.checklistRun
  return null
}

function getSuppliesRun(task: PropertyTask) {
  if (task.suppliesChecklistRun) return task.suppliesChecklistRun
  return null
}

function isRunSubmitted(run?: TaskChecklistRun | null) {
  if (!run) return false
  if (run.completedAt) return true

  return ["completed", "submitted"].includes(
    String(run.status || "").toLowerCase()
  )
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
    sendCleaningChecklist: true,
    sendSuppliesChecklist: false,
    requiresPhotos: false,
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

function canCancelTask(task: PropertyTask) {
  const status = String(task.status || "").toLowerCase()
  return ["pending", "assigned", "accepted", "in_progress"].includes(status)
}

function getTaskActionGuide(
  task: PropertyTask,
  texts: ReturnType<typeof getTexts>
) {
  const status = String(task.status || "").toLowerCase()

  const cleaningEnabled = Boolean(task.sendCleaningChecklist)
  const suppliesEnabled = Boolean(task.sendSuppliesChecklist)

  const cleaningRun = getCleaningRun(task)
  const suppliesRun = getSuppliesRun(task)

  const cleaningSubmitted = isRunSubmitted(cleaningRun)
  const suppliesSubmitted = isRunSubmitted(suppliesRun)

  if (status === "pending") {
    return {
      step: texts.locale === "en-GB" ? "Assign partner" : "Ανάθεση συνεργάτη",
      guide:
        texts.locale === "en-GB"
          ? "The task is new and needs assignment."
          : "Η εργασία είναι νέα και χρειάζεται ανάθεση.",
    }
  }

  if (status === "assigned") {
    return {
      step: texts.locale === "en-GB" ? "Waiting acceptance" : "Αναμονή αποδοχής",
      guide:
        texts.locale === "en-GB"
          ? "The task has been assigned and is waiting for acceptance."
          : "Η εργασία έχει ανατεθεί και περιμένει αποδοχή.",
    }
  }

  if (status === "accepted" || status === "in_progress") {
    if (cleaningEnabled && !cleaningSubmitted) {
      return {
        step:
          texts.locale === "en-GB"
            ? "Waiting cleaning checklist"
            : "Αναμονή λίστας καθαριότητας",
        guide:
          texts.locale === "en-GB"
            ? "The cleaning checklist still needs to be submitted."
            : "Η λίστα καθαριότητας δεν έχει ακόμη υποβληθεί.",
      }
    }

    if (suppliesEnabled && !suppliesSubmitted) {
      return {
        step:
          texts.locale === "en-GB"
            ? "Waiting supplies checklist"
            : "Αναμονή λίστας αναλωσίμων",
        guide:
          texts.locale === "en-GB"
            ? "The supplies checklist still needs to be submitted."
            : "Η λίστα αναλωσίμων δεν έχει ακόμη υποβληθεί.",
      }
    }

    if (
      (!cleaningEnabled || cleaningSubmitted) &&
      (!suppliesEnabled || suppliesSubmitted)
    ) {
      return {
        step:
          texts.locale === "en-GB"
            ? "Review and complete"
            : "Έλεγχος και ολοκλήρωση",
        guide:
          texts.locale === "en-GB"
            ? "The required sections are submitted and the task can be reviewed."
            : "Οι απαιτούμενες ενότητες έχουν υποβληθεί και η εργασία μπορεί να ελεγχθεί.",
      }
    }

    return {
      step:
        texts.locale === "en-GB"
          ? "Start execution"
          : "Έναρξη εκτέλεσης",
      guide:
        texts.locale === "en-GB"
          ? "The partner has accepted the task."
          : "Ο συνεργάτης έχει αποδεχτεί την εργασία.",
    }
  }

  return {
    step:
      texts.locale === "en-GB"
        ? "Review task"
        : "Έλεγχος εργασίας",
    guide:
      texts.locale === "en-GB"
        ? "Open the task for full details."
        : "Άνοιξε την εργασία για πλήρη εικόνα.",
  }
}

function getRequirementsText(
  task: PropertyTask,
  texts: ReturnType<typeof getTexts>
) {
  const values: string[] = []

  if (task.sendCleaningChecklist) {
    values.push(texts.requirements.cleaning)
  }

  if (task.sendSuppliesChecklist) {
    values.push(texts.requirements.supplies)
  }

  if (task.requiresPhotos) values.push(texts.requirements.photos)
  if (task.requiresApproval) values.push(texts.requirements.approval)

  if (values.length === 0) return texts.requirements.none

  return values.join(" • ")
}

function getSectionStatusText(
  enabled: boolean,
  submitted: boolean,
  texts: ReturnType<typeof getTexts>
) {
  if (!enabled) return texts.list.notEnabled
  if (submitted) return texts.list.submitted
  return texts.list.notSubmitted
}

export default function PropertyTasksPage({ params }: PageProps) {
  const { id } = use(params)
  const { language } = useAppLanguage()
  const texts = getTexts(language)

  const [data, setData] = useState<PropertyTasksResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [primaryChecklist, setPrimaryChecklist] =
    useState<ChecklistTemplateOption | null>(null)
  const [activeSuppliesCount, setActiveSuppliesCount] = useState(0)

  const [activeFilter, setActiveFilter] = useState<TaskFilter>("all_open")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancellingTaskId, setCancellingTaskId] = useState<string | null>(null)

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

  async function loadTaskCreationOptions() {
    try {
      const [checklistRes, suppliesRes] = await Promise.all([
        fetch(`/api/property-checklists/${id}`, {
          cache: "no-store",
        }),
        fetch(`/api/properties/${id}/supplies`, {
          cache: "no-store",
        }),
      ])

      const checklistJson = (await checklistRes.json().catch(() => null)) as
        | PropertyChecklistResponse
        | null
      const suppliesJson = (await suppliesRes.json().catch(() => null)) as
        | PropertySuppliesResponse
        | null

      const nextPrimaryChecklist =
        checklistRes.ok && checklistJson?.primaryTemplate
          ? checklistJson.primaryTemplate
          : null

      const nextActiveSuppliesCount =
        suppliesRes.ok && Array.isArray(suppliesJson?.activeSupplies)
          ? suppliesJson.activeSupplies.length
          : 0

      setPrimaryChecklist(nextPrimaryChecklist)
      setActiveSuppliesCount(nextActiveSuppliesCount)

      setForm((prev) => ({
        ...prev,
        sendCleaningChecklist: Boolean(nextPrimaryChecklist),
        sendSuppliesChecklist: nextActiveSuppliesCount > 0,
      }))
    } catch (err) {
      console.error("Load task creation options error:", err)
      setPrimaryChecklist(null)
      setActiveSuppliesCount(0)

      setForm((prev) => ({
        ...prev,
        sendCleaningChecklist: false,
        sendSuppliesChecklist: false,
      }))
    }
  }

  useEffect(() => {
    loadPropertyTasks()
    loadTaskCreationOptions()
  }, [id])

  const property = data?.property ?? null
  const tasks = safeArray(data?.tasks)
  const bookings = safeArray(data?.bookings)

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
    const withCleaning = openTasks.filter((task) => Boolean(task.sendCleaningChecklist)).length
    const withSupplies = openTasks.filter((task) => Boolean(task.sendSuppliesChecklist)).length

    return {
      allOpen,
      pending,
      assigned,
      accepted,
      inProgress,
      completed,
      withoutAssignment,
      withCleaning,
      withSupplies,
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

    if (activeFilter === "with_cleaning") {
      result = result.filter((task) => Boolean(task.sendCleaningChecklist))
    }

    if (activeFilter === "with_supplies") {
      result = result.filter((task) => Boolean(task.sendSuppliesChecklist))
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

      if (!form.sendCleaningChecklist && !form.sendSuppliesChecklist) {
        throw new Error(texts.create.atLeastOneSection)
      }

      if (form.sendCleaningChecklist && !primaryChecklist) {
        throw new Error(texts.create.noPrimaryChecklist)
      }

      if (form.sendSuppliesChecklist && activeSuppliesCount === 0) {
        throw new Error(texts.create.noActiveSupplies)
      }

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
        sendCleaningChecklist: form.sendCleaningChecklist,
        sendSuppliesChecklist: form.sendSuppliesChecklist,
        requiresPhotos: form.requiresPhotos,
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

      setForm({
        ...getInitialCreateForm(),
        sendCleaningChecklist: Boolean(primaryChecklist),
        sendSuppliesChecklist: activeSuppliesCount > 0,
      })
      setShowCreateForm(false)
      await loadPropertyTasks()
      await loadTaskCreationOptions()
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

  async function handleCancelTask(task: PropertyTask) {
    try {
      setCancelError(null)

      if (!canCancelTask(task)) {
        throw new Error(texts.cancelError)
      }

      const confirmed = window.confirm(texts.cancelTaskConfirm)
      if (!confirmed) return

      setCancellingTaskId(task.id)

      const res = await fetch(`/api/tasks/${task.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason:
            language === "en"
              ? "Cancelled from property open tasks page"
              : "Ακύρωση από τη σελίδα ανοιχτών εργασιών ακινήτου",
        }),
      })

      const rawText = await res.text()
      let json: Record<string, unknown> | null = null

      try {
        json = rawText ? JSON.parse(rawText) : null
      } catch {
        json = null
      }

      if (!res.ok) {
        const backendError =
          (typeof json?.error === "string" && json.error) ||
          rawText ||
          texts.cancelError

        throw new Error(backendError)
      }

      await loadPropertyTasks()
    } catch (err) {
      console.error("Cancel task error:", err)
      setCancelError(err instanceof Error ? err.message : texts.cancelError)
    } finally {
      setCancellingTaskId(null)
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

        <div className="grid gap-4">
          <button
            type="button"
            onClick={() => setActiveFilter("with_cleaning")}
            className={`rounded-2xl border p-5 shadow-sm text-left transition ${
              activeFilter === "with_cleaning"
                ? "border-slate-900 bg-slate-50"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <div className="text-sm text-slate-500">{texts.metrics.withCleaning}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{metrics.withCleaning}</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("with_supplies")}
            className={`rounded-2xl border p-5 shadow-sm text-left transition ${
              activeFilter === "with_supplies"
                ? "border-slate-900 bg-slate-50"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <div className="text-sm text-slate-500">{texts.metrics.withSupplies}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{metrics.withSupplies}</div>
          </button>
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
                      {formatDate(booking.checkInDate, texts.locale)} - {formatDate(
                        booking.checkOutDate,
                        texts.locale
                      )}
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
              <h3 className="text-sm font-semibold text-slate-900">
                {texts.create.blockTitle}
              </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                <label
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                    primaryChecklist
                      ? "border-slate-200 bg-white text-slate-700"
                      : "border-slate-200 bg-slate-100 text-slate-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.sendCleaningChecklist}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        sendCleaningChecklist: e.target.checked,
                      }))
                    }
                    disabled={!primaryChecklist}
                  />
                  {texts.create.sendCleaningChecklist}
                </label>

                <label
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                    activeSuppliesCount > 0
                      ? "border-slate-200 bg-white text-slate-700"
                      : "border-slate-200 bg-slate-100 text-slate-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.sendSuppliesChecklist}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        sendSuppliesChecklist: e.target.checked,
                      }))
                    }
                    disabled={activeSuppliesCount === 0}
                  />
                  {texts.create.sendSuppliesChecklist}
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
              </div>

              <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <div>
                  <strong>{texts.create.primaryChecklistLabel}:</strong>{" "}
                  {primaryChecklist?.title || texts.create.noPrimaryChecklist}
                </div>

                <div>
                  <strong>{texts.create.activeSuppliesLabel}:</strong> {activeSuppliesCount}
                </div>

                <div className="text-xs text-slate-500">{texts.create.helperText}</div>

                {!primaryChecklist ? (
                  <div className="text-xs text-red-600">
                    {texts.create.noPrimaryChecklist}
                  </div>
                ) : null}

                {activeSuppliesCount === 0 ? (
                  <div className="text-xs text-amber-600">
                    {texts.create.noActiveSupplies}
                  </div>
                ) : null}
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
                  setForm({
                    ...getInitialCreateForm(),
                    sendCleaningChecklist: Boolean(primaryChecklist),
                    sendSuppliesChecklist: activeSuppliesCount > 0,
                  })
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

      {cancelError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {cancelError}
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

              const cleaningEnabled = Boolean(task.sendCleaningChecklist)
              const suppliesEnabled = Boolean(task.sendSuppliesChecklist)

              const cleaningRun = getCleaningRun(task)
              const suppliesRun = getSuppliesRun(task)

              const cleaningSubmitted = isRunSubmitted(cleaningRun)
              const suppliesSubmitted = isRunSubmitted(suppliesRun)

              const taskCanBeCancelled = canCancelTask(task)
              const isCancelling = cancellingTaskId === task.id

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

                        {taskCanBeCancelled ? (
                          <button
                            type="button"
                            onClick={() => handleCancelTask(task)}
                            disabled={isCancelling}
                            className="inline-flex items-center rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            {isCancelling ? texts.cancelling : texts.cancelTask}
                          </button>
                        ) : null}
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
                          {texts.fields.requirements}
                        </div>
                        <div className="mt-2 text-sm text-slate-900">
                          {getRequirementsText(task, texts)}
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
                          {texts.list.cleaningSection}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {cleaningEnabled
                            ? cleaningRun?.template?.title || texts.list.cleaningSection
                            : texts.list.notEnabled}
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          {getSectionStatusText(cleaningEnabled, cleaningSubmitted, texts)}
                          {cleaningEnabled && cleaningRun
                            ? ` · ${checklistStatusLabel(cleaningRun.status, texts)}`
                            : ""}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {texts.list.suppliesSection}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {suppliesEnabled
                            ? texts.list.autoSupplies
                            : texts.list.notEnabled}
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          {getSectionStatusText(suppliesEnabled, suppliesSubmitted, texts)}
                          {suppliesEnabled && suppliesRun
                            ? ` · ${checklistStatusLabel(suppliesRun.status, texts)}`
                            : ""}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {texts.fields.createdAt}
                        </div>
                        <div className="mt-2 text-sm text-slate-900">
                          {formatDateTime(task.createdAt, texts.locale)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {texts.fields.assignment}
                        </div>
                        <div className="mt-2 text-sm text-slate-900">
                          {latestAssignment?.status || texts.list.notAssigned}
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