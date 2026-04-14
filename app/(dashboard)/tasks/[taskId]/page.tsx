
"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type AppLanguage = "el" | "en"

type PropertySummary = {
  id: string
  code?: string | null
  name: string
  address?: string | null
  city?: string | null
  region?: string | null
  country?: string | null
  status?: string | null
  nextCheckInAt?: string | null
  defaultPartner?: {
    id: string
    name: string
    email?: string | null
    specialty?: string | null
  } | null
}

type PartnerSummary = {
  id: string
  code?: string | null
  name: string
  email?: string | null
  specialty?: string | null
  status?: string | null
}

type BookingSummary = {
  id: string
  sourcePlatform?: string | null
  externalBookingId?: string | null
  externalListingName?: string | null
  guestName?: string | null
  checkInDate?: string | null
  checkOutDate?: string | null
  checkInTime?: string | null
  checkOutTime?: string | null
  status?: string | null
}

type TaskAssignment = {
  id: string
  status: string
  assignedAt?: string | null
  acceptedAt?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  notes?: string | null
  portalUrl?: string | null
  partner?: PartnerSummary | null
}

type TaskChecklistItem = {
  id: string
  label: string
  labelEn?: string | null
  description?: string | null
  itemType?: string | null
  sortOrder?: number | null
  isRequired?: boolean | null
  requiresPhoto?: boolean | null
  opensIssueOnFail?: boolean | null
  optionsText?: string | null
  category?: string | null
  linkedSupplyItemId?: string | null
  supplyUpdateMode?: string | null
  issueTypeOnFail?: string | null
  issueSeverityOnFail?: string | null
  failureValuesText?: string | null
  allowsIssue?: boolean | null
  allowsDamage?: boolean | null
  defaultIssueType?: string | null
  defaultSeverity?: string | null
  affectsHostingByDefault?: boolean | null
  urgentByDefault?: boolean | null
  locationHint?: string | null
}

type TaskChecklistAnswer = {
  id: string
  checklistItemId?: string | null
  itemLabel?: string | null
  itemType?: string | null
  valueBoolean?: boolean | null
  valueText?: string | null
  valueNumber?: number | null
  valueSelect?: string | null
  note?: string | null
  photoUrl?: string | null
  photoUrls?: string[] | null
  photos?: Array<{ url?: string | null } | string> | null
  attachments?: Array<{ url?: string | null } | string> | null
  issueCreated?: boolean | null
  linkedSupplyItemId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

type TaskChecklistRun = {
  id: string
  title?: string | null
  status: string
  startedAt?: string | null
  completedAt?: string | null
  submittedAt?: string | null
  isActive?: boolean | null
  isRequired?: boolean | null
  sendToPartner?: boolean | null
  checklistType?: string | null
  template?: {
    id: string
    title?: string | null
    name?: string | null
    isPrimary?: boolean | null
    items?: TaskChecklistItem[]
  } | null
  items?: TaskChecklistItem[]
  answers?: TaskChecklistAnswer[]
}

type ActivityLog = {
  id: string
  action?: string | null
  message?: string | null
  actorType?: string | null
  actorName?: string | null
  createdAt?: string | null
}

type PropertyLists = {
  cleaning: {
    availableOnProperty: boolean
    primaryTemplate?: {
      id: string
      title?: string | null
      description?: string | null
      templateType?: string | null
      isPrimary?: boolean | null
      isActive?: boolean | null
      updatedAt?: string | null
      items?: TaskChecklistItem[]
    } | null
  }
  supplies: {
    availableOnProperty: boolean
    activeSuppliesCount: number
    items: Array<{
      id: string
      currentStock?: number | null
      targetStock?: number | null
      reorderThreshold?: number | null
      lastUpdatedAt?: string | null
      fillLevel?: string | null
      supplyItem: {
        id: string
        code?: string | null
        name: string
        nameEl?: string | null
        nameEn?: string | null
        category?: string | null
        unit?: string | null
      }
    }>
  }
  issues: {
    availableOnProperty: boolean
    activeIssuesCount: number
    items: Array<{
      id: string
      title: string
      description?: string | null
      issueType?: string | null
      severity?: string | null
      blockingStatus?: string | null
      status?: string | null
      createdAt?: string | null
      updatedAt?: string | null
      resolvedAt?: string | null
    }>
  }
}

type TaskDetails = {
  id: string
  title: string
  description?: string | null
  taskType: string
  source?: string | null
  priority?: string | null
  status: string
  scheduledDate?: string | null
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  notes?: string | null
  resultNotes?: string | null
  property?: PropertySummary | null
  booking?: BookingSummary | null
  partners?: PartnerSummary[]
  assignments?: TaskAssignment[]
  cleaningChecklistRun?: TaskChecklistRun | null
  suppliesChecklistRun?: TaskChecklistRun | null
  issuesChecklistRun?: TaskChecklistRun | null
  checklistRun?: TaskChecklistRun | null
  activityLogs?: ActivityLog[]
  propertyLists?: PropertyLists
  sendCleaningChecklist?: boolean
  sendSuppliesChecklist?: boolean
  sendIssuesChecklist?: boolean
}

type ParsedTaskResponse = {
  error?: string
  message?: string
  task?: TaskDetails
}

type EditableChecklistItem = {
  localId: string
  sourceId?: string | null
  label: string
  description: string
  itemType: string
  isRequired: boolean
  requiresPhoto: boolean
  optionsText: string
  category: string
}

type ChecklistEditorState = {
  checklistKey: "cleaning" | "issues" | null
  title: string
  active: boolean
  items: EditableChecklistItem[]
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function getCopy(language: AppLanguage) {
  if (language === "en") {
    return {
      common: {
        dash: "—",
        yes: "Yes",
        no: "No",
        active: "Active",
        inactive: "Inactive",
        save: "Save",
        saving: "Saving...",
        cancel: "Cancel",
        close: "Close",
        retry: "Retry",
        view: "View",
        edit: "Edit",
        submitted: "Submitted",
        notSubmitted: "Not submitted",
      },
      header: {
        backToProperty: "Back to property",
        backToPropertyTasks: "Property tasks",
        propertyName: "Property",
        propertyAddress: "Address",
        taskStatus: "Task status",
        taskType: "Task type",
        taskStatusHelp: "Shows the current operational status of this task.",
        taskTypeHelp: "Explains what kind of work this task represents.",
      },
      schedule: {
        title: "Task date and time",
        description: "The execution slot of the task and the work context linked to the reservation flow.",
        scheduledDate: "Task date",
        executionWindow: "Execution window",
        duration: "Duration",
        checkoutTask: "Task after check-out",
        intermediateTask: "Intermediate cleaning task",
        intermediateTaskDescription: "This task is handled as an intermediate cleaning task and is not directly tied to a departing reservation.",
        checkoutAt: "Check-out",
        nextCheckInAt: "Next check-in",
        workContextHelp: "Shows whether the task comes from a departure workflow or from an intermediate cleaning workflow.",
      },
      assignment: {
        title: "Assignment",
        description: "Assign the task to a partner. The partner receives the portal link and the basic assignment details by email.",
        noAssignment: "No partner has been assigned yet.",
        noAssignmentHint: "Choose a partner to send the task and activate the partner portal flow.",
        assignButton: "Assign task",
        changeButton: "Change assignment",
        modalTitle: "Assign task to partner",
        modalDescription: "The default property partner is preselected. You can still choose another partner from the list.",
        selectPartner: "Partner",
        selectPartnerHelp: "The property default partner is selected automatically when available.",
        notes: "Assignment notes",
        notesPlaceholder: "Optional instructions for the partner...",
        assignedAt: "Assigned at",
        acceptedAt: "Accepted at",
        portalLink: "Partner portal link",
        emailHint: "An email with the portal link and the basic task details is sent automatically after assignment.",
        currentPartner: "Current partner",
        defaultPartnerHint: "Default property partner",
      },
      lists: {
        title: "Lists for this task",
        description: "Each category shows whether an active property list exists, whether it is enabled for this task and whether it has been sent or submitted.",
        propertyAvailability: "Property list",
        dispatchStatus: "Dispatch status",
        submissionStatus: "Submission status",
        submissionTime: "Submission time",
        previewTitle: "List preview",
        previewDescription: "Preview the current task list.",
        editTaskList: "Edit for this task",
        viewAnswers: "View submission",
        addItem: "Add item",
        remainsActive: "The list remains active for this task",
        remainsActiveHelp: "Enabled by default. Turn it off only when this specific task should not send this list to the partner.",
        noPropertyList: "No active property list exists in this category.",
        disabledForTask: "The property list exists, but it has been disabled only for this task.",
        pendingAcceptance: "The list has not been sent yet because the assignment has not been accepted.",
        waitingSubmission: "The list has been sent to the partner and the system is waiting for submission.",
        submitted: "The partner has already submitted this list.",
        suppliesManageHint: "The supplies list is generated dynamically from the active property supplies.",
      },
      answers: {
        title: "Submitted answers",
        description: "View the answers and photos returned by the partner for each active list.",
        noSubmission: "No submission has been returned yet.",
        responsesCount: "Responses",
        note: "Partner note",
        photos: "Photos",
        openPhoto: "Open photo",
      },
      history: {
        title: "History",
        description: "Operational history of the task in clear language.",
        empty: "No history has been recorded yet.",
      },
      editor: {
        title: "Edit task list",
        description: "These changes affect only this task and do not modify the main property list.",
        itemTitle: "Item title",
        itemDescription: "Instructions / description",
        answerType: "Answer type",
        category: "Category",
        required: "Required item",
        requiresPhoto: "Requires photo",
        moveUp: "Up",
        moveDown: "Down",
        remove: "Remove",
        boolean: "Yes / No",
        text: "Text",
        number: "Number",
        choice: "Choice",
        select: "Select",
        photo: "Photo",
        options: "Options",
        optionsHelp: "One option per line.",
        addChoice: "Add option",
        removeChoice: "Remove option",
        noItems: "No items in this list yet.",
        saveChanges: "Save changes",
      },
    }
  }

  return {
    common: {
      dash: "—",
      yes: "Ναι",
      no: "Όχι",
      active: "Ενεργή",
      inactive: "Ανενεργή",
      save: "Αποθήκευση",
      saving: "Αποθήκευση...",
      cancel: "Ακύρωση",
      close: "Κλείσιμο",
      retry: "Επανάληψη",
      view: "Προβολή",
      edit: "Επεξεργασία",
      submitted: "Υποβλήθηκε",
      notSubmitted: "Δεν υποβλήθηκε",
    },
    header: {
      backToProperty: "Επιστροφή στο ακίνητο",
      backToPropertyTasks: "Προβολή εργασιών ακινήτου",
      propertyName: "Ακίνητο",
      propertyAddress: "Διεύθυνση",
      taskStatus: "Κατάσταση εργασίας",
      taskType: "Τύπος εργασίας",
      taskStatusHelp: "Δείχνει την τρέχουσα λειτουργική κατάσταση της εργασίας.",
      taskTypeHelp: "Επεξηγεί τι είδους εργασία είναι και πώς εντάσσεται στη ροή του ακινήτου.",
    },
    schedule: {
      title: "Ημερομηνία και ώρα εργασίας",
      description: "Το προγραμματισμένο παράθυρο εκτέλεσης και το πλαίσιο της εργασίας σε σχέση με τη ροή κρατήσεων.",
      scheduledDate: "Ημερομηνία εργασίας",
      executionWindow: "Παράθυρο εκτέλεσης",
      duration: "Διάρκεια",
      checkoutTask: "Εργασία μετά από check-out",
      intermediateTask: "Ενδιάμεση εργασία καθαρισμού",
      intermediateTaskDescription: "Η εργασία αυτή αντιμετωπίζεται ως ενδιάμεση εργασία καθαρισμού και δεν συνδέεται άμεσα με αναχώρηση κράτησης.",
      checkoutAt: "Check-out",
      nextCheckInAt: "Επόμενο check-in",
      workContextHelp: "Δείχνει αν η εργασία προκύπτει από αναχώρηση ή αν πρόκειται για ενδιάμεση εργασία καθαρισμού.",
    },
    assignment: {
      title: "Ανάθεση",
      description: "Από εδώ γίνεται η ανάθεση της εργασίας προς τον συνεργάτη. Με την ανάθεση αποστέλλεται email με το portal link και τα βασικά στοιχεία της εργασίας.",
      noAssignment: "Δεν έχει γίνει ακόμη ανάθεση συνεργάτη.",
      noAssignmentHint: "Επίλεξε συνεργάτη για να σταλεί η εργασία και να ενεργοποιηθεί η ροή portal συνεργάτη.",
      assignButton: "Ανάθεση εργασίας",
      changeButton: "Αλλαγή ανάθεσης",
      modalTitle: "Ανάθεση εργασίας σε συνεργάτη",
      modalDescription: "Ο προεπιλεγμένος συνεργάτης του ακινήτου εμφανίζεται ήδη επιλεγμένος. Μπορείς να αλλάξεις επιλογή από τη λίστα όλων των συνεργατών.",
      selectPartner: "Συνεργάτης",
      selectPartnerHelp: "Αν υπάρχει προεπιλεγμένος συνεργάτης στο ακίνητο, επιλέγεται αυτόματα.",
      notes: "Σημειώσεις ανάθεσης",
      notesPlaceholder: "Προαιρετικές οδηγίες προς τον συνεργάτη...",
      assignedAt: "Ανατέθηκε στις",
      acceptedAt: "Αποδοχή στις",
      portalLink: "Link portal συνεργάτη",
      emailHint: "Με την ανάθεση αποστέλλεται αυτόματα email με το portal link και τα βασικά στοιχεία της εργασίας.",
      currentPartner: "Τρέχων συνεργάτης",
      defaultPartnerHint: "Προεπιλεγμένος συνεργάτης ακινήτου",
    },
    lists: {
      title: "Λίστες εργασίας",
      description: "Σε κάθε κατηγορία φαίνεται αν υπάρχει ενεργή λίστα στο ακίνητο, αν είναι ενεργή για αυτή την εργασία και αν έχει σταλεί ή υποβληθεί.",
      propertyAvailability: "Λίστα ακινήτου",
      dispatchStatus: "Κατάσταση αποστολής",
      submissionStatus: "Κατάσταση υποβολής",
      submissionTime: "Χρόνος υποβολής",
      previewTitle: "Προεπισκόπηση λίστας",
      previewDescription: "Προβολή της τρέχουσας λίστας της εργασίας.",
      editTaskList: "Επεξεργασία για αυτή την εργασία",
      viewAnswers: "Προβολή υποβολής",
      addItem: "Προσθήκη στοιχείου",
      remainsActive: "Η λίστα παραμένει ενεργή για αυτή την εργασία",
      remainsActiveHelp: "Το πεδίο είναι προεπιλεγμένα ενεργό. Απενεργοποίησέ το μόνο όταν αυτή η συγκεκριμένη εργασία δεν πρέπει να στείλει τη λίστα στον συνεργάτη.",
      noPropertyList: "Δεν υπάρχει ενεργή λίστα ακινήτου σε αυτή την κατηγορία.",
      disabledForTask: "Η λίστα υπάρχει στο ακίνητο αλλά έχει απενεργοποιηθεί μόνο για αυτή την εργασία.",
      pendingAcceptance: "Η λίστα δεν έχει αποσταλεί ακόμη γιατί δεν έχει γίνει αποδοχή της ανάθεσης.",
      waitingSubmission: "Η λίστα έχει αποσταλεί στον συνεργάτη και το σύστημα περιμένει υποβολή.",
      submitted: "Η λίστα έχει ήδη υποβληθεί από τον συνεργάτη.",
      suppliesManageHint: "Η λίστα αναλωσίμων δημιουργείται δυναμικά από τα ενεργά αναλώσιμα του ακινήτου.",
    },
    answers: {
      title: "Απαντήσεις συνεργάτη",
      description: "Οι υποβολές παραμένουν όπως είναι και μπορείς να δεις τις απαντήσεις και τις φωτογραφίες ανά λίστα.",
      noSubmission: "Δεν έχει επιστραφεί ακόμη υποβολή.",
      responsesCount: "Απαντήσεις",
      note: "Σημείωση συνεργάτη",
      photos: "Φωτογραφίες",
      openPhoto: "Άνοιγμα φωτογραφίας",
    },
    history: {
      title: "Ιστορικό",
      description: "Λειτουργικό ιστορικό της εργασίας σε καθαρή ελληνική γλώσσα.",
      empty: "Δεν υπάρχει ακόμη καταγεγραμμένο ιστορικό.",
    },
    editor: {
      title: "Επεξεργασία λίστας εργασίας",
      description: "Οι αλλαγές αυτές αφορούν μόνο αυτή την εργασία και δεν αλλάζουν την κύρια λίστα του ακινήτου.",
      itemTitle: "Τίτλος στοιχείου",
      itemDescription: "Οδηγίες / περιγραφή",
      answerType: "Τύπος απάντησης",
      category: "Κατηγορία",
      required: "Υποχρεωτικό στοιχείο",
      requiresPhoto: "Απαιτεί φωτογραφία",
      moveUp: "Πάνω",
      moveDown: "Κάτω",
      remove: "Αφαίρεση",
      boolean: "Ναι / Όχι",
      text: "Κείμενο",
      number: "Αριθμός",
      choice: "Επιλογή",
      select: "Λίστα επιλογών",
      photo: "Φωτογραφία",
      options: "Επιλογές",
      optionsHelp: "Μία επιλογή ανά γραμμή.",
      addChoice: "Προσθήκη επιλογής",
      removeChoice: "Αφαίρεση επιλογής",
      noItems: "Δεν υπάρχουν ακόμη στοιχεία σε αυτή τη λίστα.",
      saveChanges: "Αποθήκευση αλλαγών",
    },
  }
}

function formatDate(value?: string | null, locale = "el-GR", empty = "—") {
  if (!value) return empty
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return empty

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function formatDateTime(value?: string | null, locale = "el-GR", empty = "—") {
  if (!value) return empty
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return empty

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatTime(value?: string | null, empty = "—") {
  if (!value) return empty
  return value.slice(0, 5)
}

function toDateInputValue(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function buildExecutionWindow(date?: string | null, start?: string | null, end?: string | null, locale = "el-GR", empty = "—") {
  if (!date) return empty
  const dateLabel = formatDate(date, locale, empty)
  if (start && end) return `${dateLabel} · ${formatTime(start, empty)} - ${formatTime(end, empty)}`
  if (start) return `${dateLabel} · ${formatTime(start, empty)}`
  return dateLabel
}

function calculateDurationLabel(start?: string | null, end?: string | null, language: AppLanguage = "el", empty = "—") {
  if (!start || !end) return empty
  const [startHour, startMinute] = start.split(":").map(Number)
  const [endHour, endMinute] = end.split(":").map(Number)

  if ([startHour, startMinute, endHour, endMinute].some((value) => Number.isNaN(value))) {
    return empty
  }

  const diff = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  if (diff <= 0) return `${start.slice(0, 5)} - ${end.slice(0, 5)}`

  const hours = Math.floor(diff / 60)
  const minutes = diff % 60
  const base = `${start.slice(0, 5)} - ${end.slice(0, 5)}`

  if (language === "en") {
    if (hours > 0 && minutes > 0) return `${base} (${hours}h ${minutes}m)`
    if (hours > 0) return `${base} (${hours}h)`
    return `${base} (${minutes}m)`
  }

  if (hours > 0 && minutes > 0) return `${base} (${hours}ω ${minutes}λ)`
  if (hours > 0) return `${base} (${hours}ω)`
  return `${base} (${minutes}λ)`
}

function parseJsonSafely(raw: string): ParsedTaskResponse | null {
  try {
    return raw ? (JSON.parse(raw) as ParsedTaskResponse) : null
  } catch {
    return null
  }
}

function extractTaskDetails(payload: ParsedTaskResponse | null): TaskDetails | null {
  if (!payload) return null
  if (payload.task) return payload.task
  if ("id" in payload && typeof (payload as TaskDetails).id === "string") {
    return payload as unknown as TaskDetails
  }
  return null
}

function getTaskStatusTone(value: unknown): "slate" | "blue" | "amber" | "green" | "red" {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "completed") return "green"
  if (normalized === "in_progress" || normalized === "in-progress") return "blue"
  if (normalized === "assigned" || normalized === "pending") return "amber"
  if (normalized === "cancelled" || normalized === "canceled") return "red"
  return "slate"
}

function getTaskStatusLabel(value: unknown, language: AppLanguage) {
  const normalized = String(value ?? "").trim().toLowerCase()
  const labels: Record<string, { el: string; en: string }> = {
    pending: { el: "Σε αναμονή", en: "Pending" },
    assigned: { el: "Ανατέθηκε", en: "Assigned" },
    in_progress: { el: "Σε εξέλιξη", en: "In progress" },
    completed: { el: "Ολοκληρώθηκε", en: "Completed" },
    cancelled: { el: "Ακυρώθηκε", en: "Cancelled" },
  }
  const label = labels[normalized]
  if (!label) return String(value ?? "").trim() || (language === "en" ? "Unknown" : "Άγνωστο")
  return language === "en" ? label.en : label.el
}

function getTaskTypeLabel(value: unknown, language: AppLanguage) {
  const normalized = String(value ?? "").trim().toLowerCase()

  if (normalized.includes("clean")) return language === "en" ? "Cleaning" : "Καθαρισμός"
  if (normalized.includes("suppl")) return language === "en" ? "Supplies" : "Αναλώσιμα"
  if (normalized.includes("issue") || normalized.includes("damage") || normalized.includes("repair")) {
    return language === "en" ? "Issues / Damages" : "Βλάβες / Ζημιές"
  }
  if (normalized.includes("inspection")) return language === "en" ? "Inspection" : "Επιθεώρηση"

  return String(value ?? "").trim() || (language === "en" ? "Task" : "Εργασία")
}

function getTaskTypeHelp(value: unknown, language: AppLanguage) {
  const normalized = String(value ?? "").trim().toLowerCase()

  if (normalized.includes("clean")) {
    return language === "en"
      ? "Cleaning work connected to the property turnover flow."
      : "Εργασία καθαρισμού που συνδέεται με τη ροή ετοιμασίας του ακινήτου."
  }

  if (normalized.includes("suppl")) {
    return language === "en"
      ? "Task focused on supply status and refill checks."
      : "Εργασία που αφορά έλεγχο και αναπλήρωση αναλωσίμων."
  }

  if (normalized.includes("issue") || normalized.includes("damage") || normalized.includes("repair")) {
    return language === "en"
      ? "Task focused on issues, damages or repair findings."
      : "Εργασία που αφορά βλάβες, ζημιές ή τεχνικά ευρήματα."
  }

  if (normalized.includes("inspection")) {
    return language === "en"
      ? "Inspection task before operational readiness confirmation."
      : "Εργασία επιθεώρησης πριν από την επιβεβαίωση επιχειρησιακής ετοιμότητας."
  }

  return language === "en"
    ? "General operational task for the property."
    : "Γενική επιχειρησιακή εργασία για το ακίνητο."
}

function getAssignmentStatusLabel(value: unknown, language: AppLanguage) {
  const normalized = String(value ?? "").trim().toLowerCase()
  const labels: Record<string, { el: string; en: string }> = {
    assigned: { el: "Ανατέθηκε", en: "Assigned" },
    accepted: { el: "Αποδέχτηκε", en: "Accepted" },
    rejected: { el: "Απέρριψε", en: "Rejected" },
    in_progress: { el: "Σε εξέλιξη", en: "In progress" },
    completed: { el: "Ολοκληρώθηκε", en: "Completed" },
    cancelled: { el: "Ακυρώθηκε", en: "Cancelled" },
  }
  const label = labels[normalized]
  if (!label) return String(value ?? "").trim() || (language === "en" ? "Unknown" : "Άγνωστο")
  return language === "en" ? label.en : label.el
}

function getAssignmentStatusTone(value: unknown): "slate" | "blue" | "amber" | "green" | "red" {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "accepted" || normalized === "completed") return "green"
  if (normalized === "assigned") return "amber"
  if (normalized === "in_progress") return "blue"
  if (normalized === "rejected" || normalized === "cancelled") return "red"
  return "slate"
}

function normalizeActorName(actorName: unknown, actorType: unknown, language: AppLanguage) {
  const rawName = String(actorName ?? "").trim()
  const rawType = String(actorType ?? "").trim().toLowerCase()

  if (!rawName) {
    if (rawType === "manager" || rawType === "admin") return language === "en" ? "Manager" : "Διαχειριστής"
    if (rawType === "system") return language === "en" ? "System" : "Σύστημα"
    if (rawType === "partner") return language === "en" ? "Partner" : "Συνεργάτης"
    return language === "en" ? "System" : "Σύστημα"
  }

  const normalized = rawName.toLowerCase()
  if (normalized === "manager" || normalized === "διαχειριστής" || normalized === "διαχειριστης") {
    return language === "en" ? "Manager" : "Διαχειριστής"
  }
  if (normalized === "system" || normalized === "σύστημα" || normalized === "συστημα") {
    return language === "en" ? "System" : "Σύστημα"
  }

  return rawName
}

function normalizeActivityMessage(rawMessage: unknown, language: AppLanguage) {
  const message = String(rawMessage ?? "").trim()
  if (!message) return language === "en" ? "No message" : "Χωρίς μήνυμα"

  const normalized = message.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")

  let match = normalized.match(/^Task\s+"(.+)"\s+was assigned to partner\s+(.+)\.?$/i)
  if (match?.[1] && match?.[2]) {
    return language === "en"
      ? `The task "${match[1].trim()}" was assigned to partner ${match[2].trim()}.`
      : `Η εργασία "${match[1].trim()}" ανατέθηκε στον συνεργάτη ${match[2].trim()}.`
  }

  match = normalized.match(/^Partner\s+(.+?)\s+accepted task\s+"(.+)"\s+from the portal\.?$/i)
  if (match?.[1] && match?.[2]) {
    return language === "en"
      ? `Partner ${match[1].trim()} accepted the task "${match[2].trim()}" from the portal.`
      : `Ο συνεργάτης ${match[1].trim()} αποδέχτηκε την εργασία "${match[2].trim()}" από το portal.`
  }

  match = normalized.match(/^Partner\s+(.+?)\s+rejected task\s+"(.+)"\s+from the portal\.?$/i)
  if (match?.[1] && match?.[2]) {
    return language === "en"
      ? `Partner ${match[1].trim()} rejected the task "${match[2].trim()}" from the portal.`
      : `Ο συνεργάτης ${match[1].trim()} απέρριψε την εργασία "${match[2].trim()}" από το portal.`
  }

  match = normalized.match(/^Partner\s+(.+?)\s+submitted the cleaning list from the portal\.?$/i)
  if (match?.[1]) {
    return language === "en"
      ? `Partner ${match[1].trim()} submitted the cleaning list from the portal.`
      : `Ο συνεργάτης ${match[1].trim()} υπέβαλε τη λίστα καθαριότητας από το portal.`
  }

  match = normalized.match(/^Partner\s+(.+?)\s+submitted the supplies from the portal\.?$/i)
  if (match?.[1]) {
    return language === "en"
      ? `Partner ${match[1].trim()} submitted the supplies from the portal.`
      : `Ο συνεργάτης ${match[1].trim()} υπέβαλε τα αναλώσιμα από το portal.`
  }

  match = normalized.match(/^Partner\s+(.+?)\s+submitted the issues and damages list from the portal\.?$/i)
  if (match?.[1]) {
    return language === "en"
      ? `Partner ${match[1].trim()} submitted the issues and damages list from the portal.`
      : `Ο συνεργάτης ${match[1].trim()} υπέβαλε τη λίστα βλαβών και ζημιών από το portal.`
  }

  match = normalized.match(/^Previous pending assignment was replaced by a newer assignment before acceptance\.?$/i)
  if (match) {
    return language === "en"
      ? "A previous pending assignment was replaced by a newer assignment before acceptance."
      : "Μία παλαιότερη εκκρεμής ανάθεση αντικαταστάθηκε από νεότερη πριν από την αποδοχή."
  }

  return normalized
}

function getSupplyLevelLabel(value: unknown, language: AppLanguage) {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (["missing", "low", "έλλειψη", "λειπει", "λείπει"].includes(normalized)) {
    return language === "en" ? "Missing" : "Έλλειψη"
  }
  if (["medium", "moderate", "μέτρια", "μετρια", "μεσαία"].includes(normalized)) {
    return language === "en" ? "Medium" : "Μέτρια"
  }
  if (["full", "ok", "good", "πλήρης", "πληρης", "γεμάτο", "γεματο"].includes(normalized)) {
    return language === "en" ? "Full" : "Πλήρης"
  }
  return language === "en" ? "Unknown" : "Άγνωστο"
}

function getAnswerPhotos(answer?: TaskChecklistAnswer | null): string[] {
  if (!answer) return []

  const result: string[] = []

  if (answer.photoUrl && typeof answer.photoUrl === "string") {
    result.push(answer.photoUrl)
  }

  if (Array.isArray(answer.photoUrls)) {
    for (const url of answer.photoUrls) {
      if (typeof url === "string" && url.trim()) result.push(url)
    }
  }

  if (Array.isArray(answer.photos)) {
    for (const item of answer.photos) {
      if (typeof item === "string" && item.trim()) result.push(item)
      if (item && typeof item === "object" && "url" in item && typeof item.url === "string" && item.url.trim()) {
        result.push(item.url)
      }
    }
  }

  if (Array.isArray(answer.attachments)) {
    for (const item of answer.attachments) {
      if (typeof item === "string" && item.trim()) result.push(item)
      if (item && typeof item === "object" && "url" in item && typeof item.url === "string" && item.url.trim()) {
        result.push(item.url)
      }
    }
  }

  return Array.from(new Set(result))
}

function answerHasData(answer?: TaskChecklistAnswer | null) {
  if (!answer) return false
  if (answer.valueBoolean !== null && answer.valueBoolean !== undefined) return true
  if (answer.valueText && answer.valueText.trim()) return true
  if (answer.valueSelect && answer.valueSelect.trim()) return true
  if (answer.valueNumber !== null && answer.valueNumber !== undefined) return true
  if (answer.note && answer.note.trim()) return true
  if (Boolean(answer.issueCreated)) return true
  if (getAnswerPhotos(answer).length > 0) return true
  return false
}

function runHasSubmission(run?: TaskChecklistRun | null) {
  if (!run) return false
  const rawStatus = String(run.status ?? "").trim().toLowerCase()
  if (["completed", "submitted", "done", "ολοκληρώθηκε", "υποβλήθηκε"].includes(rawStatus)) {
    return true
  }
  if (run.completedAt || run.submittedAt) return true
  return (run.answers || []).some((answer) => answerHasData(answer))
}

function getRunSubmittedAt(run?: TaskChecklistRun | null) {
  if (!run) return null
  return run.completedAt || run.submittedAt || null
}

function getChecklistResponseCount(run?: TaskChecklistRun | null) {
  if (!run?.answers?.length) return 0
  return run.answers.filter((answer) => answerHasData(answer)).length
}

function getActiveAssignment(assignments?: TaskAssignment[]) {
  if (!assignments || assignments.length === 0) return null

  const order: Record<string, number> = {
    accepted: 1,
    assigned: 2,
    pending: 3,
    rejected: 4,
    cancelled: 5,
    completed: 6,
  }

  const sorted = [...assignments].sort((a, b) => {
    const aStatus = String(a.status ?? "").trim().toLowerCase()
    const bStatus = String(b.status ?? "").trim().toLowerCase()
    const byStatus = (order[aStatus] ?? 99) - (order[bStatus] ?? 99)
    if (byStatus !== 0) return byStatus

    const aTime = new Date(a.assignedAt || 0).getTime()
    const bTime = new Date(b.assignedAt || 0).getTime()
    return bTime - aTime
  })

  return sorted[0] ?? null
}

function hasAcceptedAssignment(assignment?: TaskAssignment | null) {
  if (!assignment) return false
  const status = String(assignment.status ?? "").trim().toLowerCase()
  return status === "accepted" || Boolean(assignment.acceptedAt)
}

function getChecklistDispatchText(params: {
  propertyAvailable: boolean
  enabledForTask: boolean
  accepted: boolean
  submitted: boolean
  language: AppLanguage
}) {
  if (!params.propertyAvailable) {
    return params.language === "en"
      ? "No active property list exists in this category."
      : "Δεν υπάρχει ενεργή λίστα ακινήτου σε αυτή την κατηγορία."
  }

  if (!params.enabledForTask) {
    return params.language === "en"
      ? "The list exists on the property but it has been disabled only for this task."
      : "Η λίστα υπάρχει στο ακίνητο αλλά έχει απενεργοποιηθεί μόνο για αυτή την εργασία."
  }

  if (params.submitted) {
    return params.language === "en"
      ? "The list has already been submitted by the partner."
      : "Η λίστα έχει ήδη υποβληθεί από τον συνεργάτη."
  }

  if (!params.accepted) {
    return params.language === "en"
      ? "The list has not been sent yet because the assignment has not been accepted."
      : "Η λίστα δεν έχει αποσταλεί ακόμη γιατί δεν έχει γίνει αποδοχή της ανάθεσης."
  }

  return params.language === "en"
    ? "The list has been sent to the partner and the system is waiting for submission."
    : "Η λίστα έχει αποσταλεί στον συνεργάτη και το σύστημα περιμένει υποβολή."
}

function buildEditableItemsFromCleaning(task: TaskDetails | null): EditableChecklistItem[] {
  const source = task?.cleaningChecklistRun?.items?.length
    ? task.cleaningChecklistRun.items
    : task?.propertyLists?.cleaning?.primaryTemplate?.items || []

  return source.map((item, index) => ({
    localId: `cleaning-${item.id || index}-${index}`,
    sourceId: item.id,
    label: item.label || "",
    description: item.description || "",
    itemType: item.itemType || "boolean",
    isRequired: Boolean(item.isRequired),
    requiresPhoto: Boolean(item.requiresPhoto),
    optionsText: item.optionsText || "",
    category: item.category || "inspection",
  }))
}

function buildEditableItemsFromIssues(task: TaskDetails | null): EditableChecklistItem[] {
  const source = task?.issuesChecklistRun?.items?.length
    ? task.issuesChecklistRun.items
    : task?.issuesChecklistRun?.template?.items || []

  return source.map((item, index) => ({
    localId: `issues-${item.id || index}-${index}`,
    sourceId: item.id,
    label: item.label || "",
    description: item.description || "",
    itemType: "text",
    isRequired: Boolean(item.isRequired),
    requiresPhoto: Boolean(item.requiresPhoto),
    optionsText: "",
    category: "issue",
  }))
}

function getTaskAddress(task: TaskDetails | null) {
  return [task?.property?.address, task?.property?.city, task?.property?.region, task?.property?.country]
    .filter(Boolean)
    .join(", ")
}

function formatDateTimeFromParts(date?: string | null, time?: string | null, locale = "el-GR", empty = "—") {
  if (!date) return empty
  const dateLabel = formatDate(date, locale, empty)
  if (!time) return dateLabel
  return `${dateLabel} · ${formatTime(time, empty)}`
}

function answerValueLabel(answer: TaskChecklistAnswer, language: AppLanguage, empty = "—") {
  if (answer.valueBoolean !== null && answer.valueBoolean !== undefined) {
    return answer.valueBoolean ? (language === "en" ? "Yes" : "Ναι") : (language === "en" ? "No" : "Όχι")
  }
  if (answer.valueSelect) {
    return getSupplyLevelLabel(answer.valueSelect, language)
  }
  if (answer.valueNumber !== null && answer.valueNumber !== undefined) {
    return String(answer.valueNumber)
  }
  if (answer.valueText) {
    return answer.valueText
  }
  if (answer.issueCreated) {
    return language === "en" ? "Issue created" : "Δημιουργήθηκε θέμα"
  }
  return empty
}

function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "blue" | "amber" | "green" | "red" | "violet" }) {
  const tones: Record<string, string> = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  }

  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", tones[tone])}>{children}</span>
}

function HelpDot({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-slate-300 text-[11px] text-slate-500">?</span>
      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700 opacity-0 shadow-lg transition duration-150 group-hover:opacity-100">
        {text}
      </span>
    </span>
  )
}

function FieldCard({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <p className="text-xs font-semibold tracking-wide text-slate-500">{label}</p>
        {help ? <HelpDot text={help} /> : null}
      </div>
      <p className="break-words text-sm font-semibold text-slate-950">{value || "—"}</p>
    </div>
  )
}

function Modal({ open, onClose, title, description, children, maxWidth = "max-w-5xl" }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; maxWidth?: string }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8">
      <div className={cn("w-full rounded-3xl bg-white shadow-2xl", maxWidth)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Κλείσιμο
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  )
}

function SubmittedAnswersView({
  run,
  submitted,
  submittedAt,
  locale,
  language,
  emptyText,
  closeLabel,
  onClose,
  notesLabel,
  photosLabel,
  openPhotoLabel,
}: {
  run?: TaskChecklistRun | null
  submitted: boolean
  submittedAt?: string | null
  locale: string
  language: AppLanguage
  emptyText: string
  closeLabel: string
  onClose: () => void
  notesLabel: string
  photosLabel: string
  openPhotoLabel: string
}) {
  if (!submitted) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">{emptyText}</div>
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {closeLabel}
          </button>
        </div>
      </div>
    )
  }

  const answers = (run?.answers || []).filter((answer) => answerHasData(answer))

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        {formatDateTime(submittedAt, locale, language === "en" ? "—" : "—")}
      </div>

      {answers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">{emptyText}</div>
      ) : (
        <div className="space-y-4">
          {answers.map((answer) => {
            const photos = getAnswerPhotos(answer)
            return (
              <div key={answer.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{answer.itemLabel || (language === "en" ? "List item" : "Στοιχείο λίστας")}</p>
                    <p className="mt-1 text-sm text-slate-700">{answerValueLabel(answer, language)}</p>
                  </div>
                  <p className="text-xs text-slate-500">{formatDateTime(answer.updatedAt || answer.createdAt, locale, "—")}</p>
                </div>

                {answer.note?.trim() ? (
                  <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold tracking-wide text-slate-500">{notesLabel}</p>
                    <p className="mt-1 text-sm text-slate-700">{answer.note}</p>
                  </div>
                ) : null}

                {photos.length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500">{photosLabel}</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {photos.map((photo, index) => (
                        <a key={`${answer.id}-photo-${index}`} href={photo} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-slate-200 bg-white" title={openPhotoLabel}>
                          <img src={photo} alt={`${photosLabel} ${index + 1}`} className="h-44 w-full object-cover transition group-hover:scale-[1.02]" />
                          <div className="border-t border-slate-100 px-3 py-2 text-xs font-medium text-slate-600">{photosLabel} {index + 1}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {closeLabel}
        </button>
      </div>
    </div>
  )
}

export default function TaskDetailsPage() {
  const params = useParams<{ taskId: string }>()
  const taskId = String(params?.taskId || "")
  const { language: appLanguage } = useAppLanguage()
  const language: AppLanguage = appLanguage === "en" ? "en" : "el"
  const copy = getCopy(language)
  const locale = language === "en" ? "en-GB" : "el-GR"

  const [task, setTask] = useState<TaskDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<string | null>(null)

  const [openAssignmentModal, setOpenAssignmentModal] = useState(false)
  const [openCleaningPreviewModal, setOpenCleaningPreviewModal] = useState(false)
  const [openSuppliesPreviewModal, setOpenSuppliesPreviewModal] = useState(false)
  const [openIssuesPreviewModal, setOpenIssuesPreviewModal] = useState(false)
  const [openChecklistEditorModal, setOpenChecklistEditorModal] = useState(false)
  const [openCleaningAnswersModal, setOpenCleaningAnswersModal] = useState(false)
  const [openSuppliesAnswersModal, setOpenSuppliesAnswersModal] = useState(false)
  const [openIssuesAnswersModal, setOpenIssuesAnswersModal] = useState(false)

  const [savingAssignment, setSavingAssignment] = useState(false)
  const [savingChecklistEditor, setSavingChecklistEditor] = useState(false)

  const [assignmentForm, setAssignmentForm] = useState({
    partnerId: "",
    notes: "",
  })

  const [checklistEditor, setChecklistEditor] = useState<ChecklistEditorState>({
    checklistKey: null,
    title: "",
    active: true,
    items: [],
  })

  async function loadTask() {
    try {
      setLoading(true)
      setError(null)
      setPageMessage(null)

      const taskRes = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" })
      const raw = await taskRes.text()
      const json = parseJsonSafely(raw)

      if (!taskRes.ok) {
        throw new Error(json?.error || raw || (language === "en" ? "Failed to load task." : "Αποτυχία φόρτωσης εργασίας."))
      }

      const nextTask = extractTaskDetails(json)
      if (!nextTask) {
        throw new Error(language === "en" ? "Failed to load task." : "Αποτυχία φόρτωσης εργασίας.")
      }

      let mergedTask = nextTask

      try {
        const assignmentsRes = await fetch(`/api/task-assignments?taskId=${taskId}`, { cache: "no-store" })
        if (assignmentsRes.ok) {
          const assignmentsJson = (await assignmentsRes.json()) as TaskAssignment[]
          const byId = new Map(assignmentsJson.map((assignment) => [assignment.id, assignment]))
          mergedTask = {
            ...nextTask,
            assignments: (nextTask.assignments || []).map((assignment) => {
              const enriched = byId.get(assignment.id)
              return enriched ? { ...assignment, portalUrl: enriched.portalUrl ?? assignment.portalUrl ?? null } : assignment
            }),
          }
        }
      } catch {
        mergedTask = nextTask
      }

      setTask(mergedTask)

      const activeAssignment = getActiveAssignment(mergedTask.assignments)
      setAssignmentForm({
        partnerId: activeAssignment?.partner?.id || mergedTask.property?.defaultPartner?.id || "",
        notes: activeAssignment?.notes || "",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : language === "en" ? "Failed to load task." : "Αποτυχία φόρτωσης εργασίας.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!taskId) return
    void loadTask()
  }, [taskId, language])

  const activeAssignment = useMemo(() => getActiveAssignment(task?.assignments), [task?.assignments])
  const propertyAddress = useMemo(() => getTaskAddress(task), [task])
  const taskStatusTone = useMemo(() => getTaskStatusTone(task?.status), [task?.status])

  const cleaningRun = task?.cleaningChecklistRun || null
  const suppliesRun = task?.suppliesChecklistRun || null
  const issuesRun = task?.issuesChecklistRun || null

  const cleaningSubmittedAt = useMemo(() => getRunSubmittedAt(cleaningRun), [cleaningRun])
  const suppliesSubmittedAt = useMemo(() => getRunSubmittedAt(suppliesRun), [suppliesRun])
  const issuesSubmittedAt = useMemo(() => getRunSubmittedAt(issuesRun), [issuesRun])

  const cleaningSubmitted = useMemo(() => runHasSubmission(cleaningRun), [cleaningRun])
  const suppliesSubmitted = useMemo(() => runHasSubmission(suppliesRun), [suppliesRun])
  const issuesSubmitted = useMemo(() => runHasSubmission(issuesRun), [issuesRun])

  const cleaningEnabled = Boolean(task?.sendCleaningChecklist)
  const suppliesEnabled = Boolean(task?.sendSuppliesChecklist)
  const issuesEnabled = Boolean(task?.sendIssuesChecklist)

  const assignmentAccepted = hasAcceptedAssignment(activeAssignment)

  const workContext = useMemo(() => {
    if (task?.booking?.id) {
      return {
        title: copy.schedule.checkoutTask,
        checkout: formatDateTimeFromParts(task.booking.checkOutDate, task.booking.checkOutTime, locale, copy.common.dash),
        nextCheckIn: task.property?.nextCheckInAt
          ? formatDateTime(task.property.nextCheckInAt, locale, copy.common.dash)
          : formatDateTimeFromParts(task.booking.checkInDate, task.booking.checkInTime, locale, copy.common.dash),
      }
    }

    return {
      title: copy.schedule.intermediateTask,
      checkout: copy.schedule.intermediateTaskDescription,
      nextCheckIn: null,
    }
  }, [task, copy, locale])

  const cleaningPreviewItems = useMemo(() => {
    return (cleaningRun?.items?.length ? cleaningRun.items : task?.propertyLists?.cleaning?.primaryTemplate?.items || []).map((item, index) => ({
      id: item.id || `cleaning-${index}`,
      label: item.label,
      description: item.description || "",
      isRequired: Boolean(item.isRequired),
      requiresPhoto: Boolean(item.requiresPhoto),
    }))
  }, [cleaningRun?.items, task?.propertyLists?.cleaning?.primaryTemplate?.items])

  const suppliesPreviewItems = useMemo(() => {
    return (task?.propertyLists?.supplies?.items || []).map((item, index) => ({
      id: item.id || `supply-${index}`,
      label: item.supplyItem.nameEl || item.supplyItem.name || `Αναλώσιμο ${index + 1}`,
      description: item.supplyItem.category || "",
      isRequired: true,
      requiresPhoto: false,
    }))
  }, [task?.propertyLists?.supplies?.items])

  const issuesPreviewItems = useMemo(() => {
    return (issuesRun?.items?.length ? issuesRun.items : issuesRun?.template?.items || []).map((item, index) => ({
      id: item.id || `issue-${index}`,
      label: item.label,
      description: item.description || item.locationHint || "",
      isRequired: Boolean(item.isRequired),
      requiresPhoto: Boolean(item.requiresPhoto),
    }))
  }, [issuesRun?.items, issuesRun?.template?.items])

  function openCleaningEditor() {
    setChecklistEditor({
      checklistKey: "cleaning",
      title: language === "en" ? "Cleaning list" : "Λίστα καθαριότητας",
      active: cleaningEnabled,
      items: buildEditableItemsFromCleaning(task),
    })
    setOpenChecklistEditorModal(true)
  }

  function openIssuesEditor() {
    setChecklistEditor({
      checklistKey: "issues",
      title: language === "en" ? "Issues and damages list" : "Λίστα βλαβών και ζημιών",
      active: issuesEnabled,
      items: buildEditableItemsFromIssues(task),
    })
    setOpenChecklistEditorModal(true)
  }

  function addChecklistItem() {
    setChecklistEditor((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          localId: `new-${prev.checklistKey || "list"}-${Date.now()}-${prev.items.length}`,
          sourceId: null,
          label: "",
          description: "",
          itemType: prev.checklistKey === "cleaning" ? "boolean" : "text",
          isRequired: false,
          requiresPhoto: false,
          optionsText: "",
          category: prev.checklistKey === "cleaning" ? "inspection" : "issue",
        },
      ],
    }))
  }

  function removeChecklistItem(localId: string) {
    setChecklistEditor((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.localId !== localId),
    }))
  }

  function moveChecklistItem(localId: string, direction: "up" | "down") {
    setChecklistEditor((prev) => {
      const index = prev.items.findIndex((item) => item.localId === localId)
      if (index < 0) return prev
      const nextIndex = direction === "up" ? index - 1 : index + 1
      if (nextIndex < 0 || nextIndex >= prev.items.length) return prev

      const nextItems = [...prev.items]
      const [moved] = nextItems.splice(index, 1)
      if (!moved) return prev
      nextItems.splice(nextIndex, 0, moved)

      return { ...prev, items: nextItems }
    })
  }

  function updateChecklistItem(localId: string, patch: Partial<EditableChecklistItem>) {
    setChecklistEditor((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    }))
  }

  function addChecklistChoice(localId: string) {
    setChecklistEditor((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.localId !== localId) return item
        const current = item.optionsText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)
        return { ...item, optionsText: [...current, ""].join("\n") }
      }),
    }))
  }

  function removeChecklistChoice(localId: string, choiceIndex: number) {
    setChecklistEditor((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.localId !== localId) return item
        const current = item.optionsText.split(/\r?\n/).map((value) => value.trim())
        return { ...item, optionsText: current.filter((_, index) => index !== choiceIndex).join("\n") }
      }),
    }))
  }

  function updateChecklistChoice(localId: string, choiceIndex: number, value: string) {
    setChecklistEditor((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.localId !== localId) return item
        const current = item.optionsText.split(/\r?\n/).map((entry) => entry.trim())
        while (current.length <= choiceIndex) current.push("")
        current[choiceIndex] = value
        return { ...item, optionsText: current.join("\n") }
      }),
    }))
  }

  async function handleAssignTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!task) return

    try {
      setSavingAssignment(true)
      setPageMessage(null)

      const res = await fetch("/api/task-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          partnerId: assignmentForm.partnerId || null,
          notes: assignmentForm.notes.trim() || null,
        }),
      })

      const raw = await res.text()
      const json = parseJsonSafely(raw)

      if (!res.ok) {
        throw new Error(json?.error || raw || (language === "en" ? "Assignment failed." : "Αποτυχία ανάθεσης."))
      }

      setPageMessage(language === "en" ? "The assignment was saved successfully." : "Η ανάθεση αποθηκεύτηκε επιτυχώς.")
      setOpenAssignmentModal(false)
      await loadTask()
    } catch (err) {
      setPageMessage(err instanceof Error ? err.message : language === "en" ? "Assignment failed." : "Αποτυχία ανάθεσης.")
    } finally {
      setSavingAssignment(false)
    }
  }

  async function handleSaveChecklistEditor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!task || !checklistEditor.checklistKey) return

    try {
      setSavingChecklistEditor(true)
      setPageMessage(null)

      const res = await fetch(`/api/tasks/${task.id}/checklists/customize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistKey: checklistEditor.checklistKey,
          isActive: checklistEditor.active,
          items: checklistEditor.items.map((item, index) => ({
            sourceId: item.sourceId || null,
            label: item.label.trim(),
            description: item.description.trim() || null,
            itemType: item.itemType,
            sortOrder: index + 1,
            isRequired: Boolean(item.isRequired),
            requiresPhoto: Boolean(item.requiresPhoto),
            optionsText: item.optionsText.trim() || null,
            category: item.category || null,
          })),
        }),
      })

      const raw = await res.text()
      const json = parseJsonSafely(raw)

      if (!res.ok) {
        throw new Error(json?.error || raw || (language === "en" ? "Failed to save the task list." : "Αποτυχία αποθήκευσης λίστας εργασίας."))
      }

      setPageMessage(json?.message || (language === "en" ? "The task list was updated successfully." : "Η λίστα εργασίας ενημερώθηκε επιτυχώς."))
      setOpenChecklistEditorModal(false)
      await loadTask()
    } catch (err) {
      setPageMessage(err instanceof Error ? err.message : language === "en" ? "Failed to save the task list." : "Αποτυχία αποθήκευσης λίστας εργασίας.")
    } finally {
      setSavingChecklistEditor(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-4 w-80 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-700">{language === "en" ? "Task loading error" : "Σφάλμα φόρτωσης εργασίας"}</h1>
          <p className="mt-2 text-sm text-red-700">{error || (language === "en" ? "Failed to load task." : "Αποτυχία φόρτωσης εργασίας.")}</p>
          <button type="button" onClick={() => void loadTask()} className="mt-4 rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
            {copy.common.retry}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{task.property?.name || copy.common.dash}</h1>
            <p className="mt-2 text-sm text-slate-600">{propertyAddress || copy.common.dash}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone={taskStatusTone}>{getTaskStatusLabel(task.status, language)}</Badge>
              <HelpDot text={copy.header.taskStatusHelp} />

              <Badge tone="blue">{getTaskTypeLabel(task.taskType, language)}</Badge>
              <HelpDot text={getTaskTypeHelp(task.taskType, language)} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {task.property?.id ? (
              <Link href={`/properties/${task.property.id}`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {copy.header.backToProperty}
              </Link>
            ) : null}

            {task.property?.id ? (
              <Link href={`/tasks?propertyId=${task.property.id}&scope=open`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {copy.header.backToPropertyTasks}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {pageMessage ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{pageMessage}</div>
      ) : null}

      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-950">{copy.schedule.title}</h2>
            <HelpDot text={copy.schedule.workContextHelp} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{copy.schedule.description}</p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <FieldCard label={copy.schedule.scheduledDate} value={formatDate(task.scheduledDate, locale, copy.common.dash)} />
            <FieldCard label={copy.schedule.executionWindow} value={buildExecutionWindow(task.scheduledDate, task.scheduledStartTime, task.scheduledEndTime, locale, copy.common.dash)} />
            <FieldCard label={copy.schedule.duration} value={calculateDurationLabel(task.scheduledStartTime, task.scheduledEndTime, language, copy.common.dash)} />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="violet">{workContext.title}</Badge>
              <HelpDot text={copy.schedule.workContextHelp} />
            </div>

            {task.booking?.id ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FieldCard label={copy.schedule.checkoutAt} value={workContext.checkout || copy.common.dash} />
                <FieldCard label={copy.schedule.nextCheckInAt} value={workContext.nextCheckIn || copy.common.dash} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-700">{copy.schedule.intermediateTaskDescription}</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-950">{copy.assignment.title}</h2>
                <HelpDot text={copy.assignment.description} />
              </div>
              <p className="mt-1 text-sm text-slate-500">{copy.assignment.description}</p>
            </div>

            <button type="button" onClick={() => setOpenAssignmentModal(true)} className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              {activeAssignment ? copy.assignment.changeButton : copy.assignment.assignButton}
            </button>
          </div>

          {activeAssignment ? (
            <div className="mt-5 rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-slate-950">{activeAssignment.partner?.name || copy.common.dash}</p>
                <Badge tone={getAssignmentStatusTone(activeAssignment.status)}>{getAssignmentStatusLabel(activeAssignment.status, language)}</Badge>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FieldCard label={copy.assignment.currentPartner} value={activeAssignment.partner?.name || copy.common.dash} />
                <FieldCard label={copy.assignment.assignedAt} value={formatDateTime(activeAssignment.assignedAt, locale, copy.common.dash)} />
                <FieldCard label={copy.assignment.acceptedAt} value={formatDateTime(activeAssignment.acceptedAt, locale, copy.common.dash)} />
              </div>

              {activeAssignment.portalUrl ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold tracking-wide text-slate-500">{copy.assignment.portalLink}</p>
                  <a href={activeAssignment.portalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex break-all text-sm font-medium text-slate-900 underline">
                    {activeAssignment.portalUrl}
                  </a>
                </div>
              ) : null}

              {activeAssignment.notes?.trim() ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold tracking-wide text-slate-500">{copy.assignment.notes}</p>
                  <p className="mt-2 text-sm text-slate-700">{activeAssignment.notes}</p>
                </div>
              ) : null}

              <p className="mt-4 text-sm text-slate-500">{copy.assignment.emailHint}</p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5">
              <p className="text-sm font-medium text-slate-700">{copy.assignment.noAssignment}</p>
              <p className="mt-1 text-sm text-slate-500">{copy.assignment.noAssignmentHint}</p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-950">{copy.lists.title}</h2>
            <HelpDot text={copy.lists.description} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{copy.lists.description}</p>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-950">{language === "en" ? "Cleaning list" : "Λίστα καθαριότητας"}</h3>
                    <Badge tone={task?.propertyLists?.cleaning?.availableOnProperty ? "green" : "slate"}>
                      {task?.propertyLists?.cleaning?.availableOnProperty ? copy.common.active : copy.common.inactive}
                    </Badge>
                    <Badge tone={cleaningEnabled ? "green" : "slate"}>{cleaningEnabled ? copy.common.active : copy.common.inactive}</Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setOpenCleaningPreviewModal(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{copy.common.view}</button>
                  <button type="button" onClick={openCleaningEditor} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{copy.lists.editTaskList}</button>
                  <button type="button" onClick={() => setOpenCleaningAnswersModal(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{copy.lists.viewAnswers}</button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <FieldCard label={copy.lists.propertyAvailability} value={task?.propertyLists?.cleaning?.availableOnProperty ? copy.common.active : copy.common.inactive} />
                <FieldCard label={copy.lists.dispatchStatus} value={getChecklistDispatchText({ propertyAvailable: Boolean(task?.propertyLists?.cleaning?.availableOnProperty), enabledForTask: cleaningEnabled, accepted: assignmentAccepted, submitted: cleaningSubmitted, language })} />
                <FieldCard label={copy.lists.submissionStatus} value={cleaningSubmitted ? copy.common.submitted : copy.common.notSubmitted} />
              </div>

              <div className="mt-4">
                <FieldCard label={copy.lists.submissionTime} value={formatDateTime(cleaningSubmittedAt, locale, copy.common.dash)} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-950">{language === "en" ? "Supplies list" : "Λίστα αναλωσίμων"}</h3>
                    <Badge tone={task?.propertyLists?.supplies?.availableOnProperty ? "green" : "slate"}>
                      {task?.propertyLists?.supplies?.availableOnProperty ? copy.common.active : copy.common.inactive}
                    </Badge>
                    <Badge tone={suppliesEnabled ? "green" : "slate"}>{suppliesEnabled ? copy.common.active : copy.common.inactive}</Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setOpenSuppliesPreviewModal(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{copy.common.view}</button>
                  <button type="button" onClick={() => setOpenSuppliesAnswersModal(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{copy.lists.viewAnswers}</button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <FieldCard label={copy.lists.propertyAvailability} value={task?.propertyLists?.supplies?.availableOnProperty ? copy.common.active : copy.common.inactive} />
                <FieldCard label={copy.lists.dispatchStatus} value={getChecklistDispatchText({ propertyAvailable: Boolean(task?.propertyLists?.supplies?.availableOnProperty), enabledForTask: suppliesEnabled, accepted: assignmentAccepted, submitted: suppliesSubmitted, language })} />
                <FieldCard label={copy.lists.submissionStatus} value={suppliesSubmitted ? copy.common.submitted : copy.common.notSubmitted} />
              </div>

              <div className="mt-4">
                <FieldCard label={copy.lists.submissionTime} value={formatDateTime(suppliesSubmittedAt, locale, copy.common.dash)} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-950">{language === "en" ? "Issues and damages list" : "Λίστα βλαβών και ζημιών"}</h3>
                    <Badge tone={task?.propertyLists?.issues?.availableOnProperty ? "green" : "slate"}>
                      {task?.propertyLists?.issues?.availableOnProperty ? copy.common.active : copy.common.inactive}
                    </Badge>
                    <Badge tone={issuesEnabled ? "green" : "slate"}>{issuesEnabled ? copy.common.active : copy.common.inactive}</Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setOpenIssuesPreviewModal(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{copy.common.view}</button>
                  <button type="button" onClick={openIssuesEditor} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{copy.lists.editTaskList}</button>
                  <button type="button" onClick={() => setOpenIssuesAnswersModal(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{copy.lists.viewAnswers}</button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <FieldCard label={copy.lists.propertyAvailability} value={task?.propertyLists?.issues?.availableOnProperty ? copy.common.active : copy.common.inactive} />
                <FieldCard label={copy.lists.dispatchStatus} value={getChecklistDispatchText({ propertyAvailable: Boolean(task?.propertyLists?.issues?.availableOnProperty), enabledForTask: issuesEnabled, accepted: assignmentAccepted, submitted: issuesSubmitted, language })} />
                <FieldCard label={copy.lists.submissionStatus} value={issuesSubmitted ? copy.common.submitted : copy.common.notSubmitted} />
              </div>

              <div className="mt-4">
                <FieldCard label={copy.lists.submissionTime} value={formatDateTime(issuesSubmittedAt, locale, copy.common.dash)} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-950">{copy.answers.title}</h2>
            <HelpDot text={copy.answers.description} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{copy.answers.description}</p>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-950">{language === "en" ? "Cleaning list" : "Λίστα καθαριότητας"}</p>
                <Badge tone={cleaningSubmitted ? "green" : "slate"}>{cleaningSubmitted ? copy.common.submitted : copy.common.notSubmitted}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-500">{copy.answers.responsesCount}: {getChecklistResponseCount(cleaningRun)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-950">{language === "en" ? "Supplies list" : "Λίστα αναλωσίμων"}</p>
                <Badge tone={suppliesSubmitted ? "green" : "slate"}>{suppliesSubmitted ? copy.common.submitted : copy.common.notSubmitted}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-500">{copy.answers.responsesCount}: {getChecklistResponseCount(suppliesRun)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-950">{language === "en" ? "Issues and damages list" : "Λίστα βλαβών και ζημιών"}</p>
                <Badge tone={issuesSubmitted ? "green" : "slate"}>{issuesSubmitted ? copy.common.submitted : copy.common.notSubmitted}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-500">{copy.answers.responsesCount}: {getChecklistResponseCount(issuesRun)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-950">{copy.history.title}</h2>
            <HelpDot text={copy.history.description} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{copy.history.description}</p>

          {!task.activityLogs || task.activityLogs.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">{copy.history.empty}</div>
          ) : (
            <div className="mt-5 space-y-3">
              {task.activityLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{normalizeActivityMessage(log.message, language)}</p>
                      <p className="mt-1 text-xs text-slate-500">{normalizeActorName(log.actorName, log.actorType, language)}</p>
                    </div>
                    <p className="text-xs text-slate-500">{formatDateTime(log.createdAt, locale, copy.common.dash)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal open={openAssignmentModal} onClose={() => setOpenAssignmentModal(false)} title={copy.assignment.modalTitle} description={copy.assignment.modalDescription} maxWidth="max-w-2xl">
        <form onSubmit={handleAssignTask} className="space-y-5">
          {task.property?.defaultPartner ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <span className="font-semibold">{copy.assignment.defaultPartnerHint}:</span> {task.property.defaultPartner.name}
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              {copy.assignment.selectPartner}
              <HelpDot text={copy.assignment.selectPartnerHelp} />
            </span>
            <select
              value={assignmentForm.partnerId}
              onChange={(e) => setAssignmentForm((prev) => ({ ...prev, partnerId: e.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="">{language === "en" ? "Select partner" : "Επιλογή συνεργάτη"}</option>
              {(task.partners || []).map((partner) => (
                <option key={partner.id} value={partner.id}>{partner.name}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">{copy.assignment.notes}</span>
            <textarea
              rows={5}
              value={assignmentForm.notes}
              onChange={(e) => setAssignmentForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder={copy.assignment.notesPlaceholder}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
            />
          </label>

          <p className="text-sm text-slate-500">{copy.assignment.emailHint}</p>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setOpenAssignmentModal(false)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{copy.common.cancel}</button>
            <button type="submit" disabled={savingAssignment} className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              {savingAssignment ? copy.common.saving : copy.assignment.assignButton}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={openCleaningPreviewModal} onClose={() => setOpenCleaningPreviewModal(false)} title={copy.lists.previewTitle} description={copy.lists.previewDescription}>
        <div className="space-y-4">
          {cleaningPreviewItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">{copy.lists.noPropertyList}</div>
          ) : (
            cleaningPreviewItems.map((item, index) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-950">{index + 1}. {item.label}</p>
                  {item.isRequired ? <Badge tone="amber">{copy.editor.required}</Badge> : null}
                  {item.requiresPhoto ? <Badge tone="blue">{copy.editor.requiresPhoto}</Badge> : null}
                </div>
                {item.description ? <p className="mt-2 text-sm text-slate-600">{item.description}</p> : null}
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal open={openSuppliesPreviewModal} onClose={() => setOpenSuppliesPreviewModal(false)} title={copy.lists.previewTitle} description={copy.lists.suppliesManageHint}>
        <div className="space-y-4">
          {suppliesPreviewItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">{copy.lists.noPropertyList}</div>
          ) : (
            suppliesPreviewItems.map((item, index) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-950">{index + 1}. {item.label}</p>
                {item.description ? <p className="mt-2 text-sm text-slate-600">{item.description}</p> : null}
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal open={openIssuesPreviewModal} onClose={() => setOpenIssuesPreviewModal(false)} title={copy.lists.previewTitle} description={copy.lists.previewDescription}>
        <div className="space-y-4">
          {issuesPreviewItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">{copy.lists.noPropertyList}</div>
          ) : (
            issuesPreviewItems.map((item, index) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-950">{index + 1}. {item.label}</p>
                  {item.isRequired ? <Badge tone="amber">{copy.editor.required}</Badge> : null}
                  {item.requiresPhoto ? <Badge tone="blue">{copy.editor.requiresPhoto}</Badge> : null}
                </div>
                {item.description ? <p className="mt-2 text-sm text-slate-600">{item.description}</p> : null}
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal open={openChecklistEditorModal} onClose={() => setOpenChecklistEditorModal(false)} title={copy.editor.title} description={copy.editor.description} maxWidth="max-w-6xl">
        <form onSubmit={handleSaveChecklistEditor} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 p-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={checklistEditor.active}
                onChange={(e) => setChecklistEditor((prev) => ({ ...prev, active: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">{copy.lists.remainsActive}</span>
              <HelpDot text={copy.lists.remainsActiveHelp} />
            </label>
          </div>

          <div className="space-y-4">
            {checklistEditor.items.map((item, index) => {
              const choiceValues = (item.itemType === "choice" || item.itemType === "select")
                ? item.optionsText.split(/\r?\n/).map((value) => value.trim())
                : []

              return (
                <div key={item.localId} className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{language === "en" ? "List item" : "Στοιχείο λίστας"} {index + 1}</p>
                      <p className="text-sm text-slate-500">{checklistEditor.title}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => moveChecklistItem(item.localId, "up")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{copy.editor.moveUp}</button>
                      <button type="button" onClick={() => moveChecklistItem(item.localId, "down")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{copy.editor.moveDown}</button>
                      <button type="button" onClick={() => removeChecklistItem(item.localId)} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">{copy.editor.remove}</button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">{copy.editor.itemTitle}</span>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateChecklistItem(item.localId, { label: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">{copy.editor.itemDescription}</span>
                      <textarea
                        rows={3}
                        value={item.description}
                        onChange={(e) => updateChecklistItem(item.localId, { description: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      />
                    </label>

                    {checklistEditor.checklistKey === "cleaning" ? (
                      <>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-slate-700">{copy.editor.answerType}</span>
                          <select
                            value={item.itemType}
                            onChange={(e) => updateChecklistItem(item.localId, { itemType: e.target.value })}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                          >
                            <option value="boolean">{copy.editor.boolean}</option>
                            <option value="text">{copy.editor.text}</option>
                            <option value="number">{copy.editor.number}</option>
                            <option value="choice">{copy.editor.choice}</option>
                            <option value="select">{copy.editor.select}</option>
                            <option value="photo">{copy.editor.photo}</option>
                          </select>
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-medium text-slate-700">{copy.editor.category}</span>
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => updateChecklistItem(item.localId, { category: e.target.value })}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                          />
                        </label>
                      </>
                    ) : null}

                    {(checklistEditor.checklistKey === "cleaning" && (item.itemType === "choice" || item.itemType === "select")) ? (
                      <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-slate-950">{copy.editor.options}</p>
                          <p className="mt-1 text-xs text-slate-500">{copy.editor.optionsHelp}</p>
                        </div>

                        <div className="space-y-3">
                          {choiceValues.map((choice, choiceIndex) => (
                            <div key={`${item.localId}-choice-${choiceIndex}`} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <input
                                type="text"
                                value={choice}
                                onChange={(e) => updateChecklistChoice(item.localId, choiceIndex, e.target.value)}
                                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                              />
                              <button type="button" onClick={() => removeChecklistChoice(item.localId, choiceIndex)} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                                {copy.editor.removeChoice}
                              </button>
                            </div>
                          ))}

                          <button type="button" onClick={() => addChecklistChoice(item.localId)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            {copy.editor.addChoice}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="md:col-span-2 grid gap-4 lg:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <input type="checkbox" checked={item.isRequired} onChange={(e) => updateChecklistItem(item.localId, { isRequired: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                        <span className="text-sm text-slate-700">{copy.editor.required}</span>
                      </label>

                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <input type="checkbox" checked={item.requiresPhoto} onChange={(e) => updateChecklistItem(item.localId, { requiresPhoto: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                        <span className="text-sm text-slate-700">{copy.editor.requiresPhoto}</span>
                      </label>
                    </div>
                  </div>
                </div>
              )
            })}

            {checklistEditor.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">{copy.editor.noItems}</div>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={addChecklistItem} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {copy.lists.addItem}
            </button>
            <button type="button" onClick={() => setOpenChecklistEditorModal(false)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {copy.common.cancel}
            </button>
            <button type="submit" disabled={savingChecklistEditor} className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              {savingChecklistEditor ? copy.common.saving : copy.editor.saveChanges}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={openCleaningAnswersModal} onClose={() => setOpenCleaningAnswersModal(false)} title={language === "en" ? "Cleaning submission" : "Υποβολή λίστας καθαριότητας"} description={copy.answers.description}>
        <SubmittedAnswersView
          run={cleaningRun}
          submitted={cleaningSubmitted}
          submittedAt={cleaningSubmittedAt}
          locale={locale}
          language={language}
          emptyText={copy.answers.noSubmission}
          closeLabel={copy.common.close}
          onClose={() => setOpenCleaningAnswersModal(false)}
          notesLabel={copy.answers.note}
          photosLabel={copy.answers.photos}
          openPhotoLabel={copy.answers.openPhoto}
        />
      </Modal>

      <Modal open={openSuppliesAnswersModal} onClose={() => setOpenSuppliesAnswersModal(false)} title={language === "en" ? "Supplies submission" : "Υποβολή λίστας αναλωσίμων"} description={copy.answers.description}>
        <SubmittedAnswersView
          run={suppliesRun}
          submitted={suppliesSubmitted}
          submittedAt={suppliesSubmittedAt}
          locale={locale}
          language={language}
          emptyText={copy.answers.noSubmission}
          closeLabel={copy.common.close}
          onClose={() => setOpenSuppliesAnswersModal(false)}
          notesLabel={copy.answers.note}
          photosLabel={copy.answers.photos}
          openPhotoLabel={copy.answers.openPhoto}
        />
      </Modal>

      <Modal open={openIssuesAnswersModal} onClose={() => setOpenIssuesAnswersModal(false)} title={language === "en" ? "Issues and damages submission" : "Υποβολή λίστας βλαβών και ζημιών"} description={copy.answers.description}>
        <SubmittedAnswersView
          run={issuesRun}
          submitted={issuesSubmitted}
          submittedAt={issuesSubmittedAt}
          locale={locale}
          language={language}
          emptyText={copy.answers.noSubmission}
          closeLabel={copy.common.close}
          onClose={() => setOpenIssuesAnswersModal(false)}
          notesLabel={copy.answers.note}
          photosLabel={copy.answers.photos}
          openPhotoLabel={copy.answers.openPhoto}
        />
      </Modal>
    </div>
  )
}