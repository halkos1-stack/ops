"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type PartnerOption = {
  id: string
  code: string
  name: string
  email: string
  phone?: string | null
  specialty: string
  status: string
}

type ChecklistRunLite = {
  id: string
  status: string
  startedAt?: string | null
  completedAt?: string | null
  template?: {
    id: string
    title: string
    templateType?: string | null
    isPrimary?: boolean
  } | null
  answers?: Array<{
    id: string
    issueCreated?: boolean
  }>
}

type PropertyDetail = {
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
  defaultPartnerId: string | null
  createdAt: string
  updatedAt: string

  defaultPartner?: {
    id: string
    code: string
    name: string
    email: string
    phone?: string | null
    specialty: string
    status: string
    notes?: string | null
  } | null

  tasks?: Array<{
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

    assignments?: Array<{
      id: string
      status: string
      assignedAt: string
      acceptedAt?: string | null
      rejectedAt?: string | null
      startedAt?: string | null
      completedAt?: string | null
      rejectionReason?: string | null
      notes?: string | null
      partner?: {
        id: string
        code: string
        name: string
        email: string
        phone?: string | null
        specialty: string
        status: string
      } | null
    }>

    booking?: {
      id: string
      guestName?: string | null
      checkInDate: string
      checkOutDate: string
      status: string
    } | null

    cleaningChecklistRun?: ChecklistRunLite | null
    suppliesChecklistRun?: ChecklistRunLite | null

    /**
     * Συμβατότητα με παλιότερη δομή.
     * Όταν δεν έχουν ακόμη καθαριστεί όλα τα routes, μπορεί να έρχεται μόνο ένα checklistRun.
     */
    checklistRun?: ChecklistRunLite | null
  }>

  issues?: Array<{
    id: string
    issueType: string
    title: string
    description?: string | null
    severity: string
    status: string
    reportedBy?: string | null
    resolutionNotes?: string | null
    resolvedAt?: string | null
    createdAt: string
    updatedAt: string
    task?: {
      id: string
      title: string
      status: string
    } | null
  }>

  checklistTemplates?: Array<{
    id: string
    title: string
    description?: string | null
    templateType: string
    isPrimary: boolean
    isActive: boolean
    createdAt: string
    updatedAt: string
    items?: Array<{
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
    }>
  }>

  propertySupplies?: Array<{
    id: string
    currentStock: number
    targetStock?: number | null
    reorderThreshold?: number | null
    notes?: string | null
    updatedAt?: string | null
    lastUpdatedAt?: string | null
    supplyItem?: {
      id: string
      code: string
      name: string
      category: string
      unit: string
      minimumStock?: number | null
      isActive: boolean
    } | null
  }>
}

type ModalKey = null | "property" | "partner" | "cleaningChecklist" | "supplies" | "issues"

type PropertyEditForm = {
  code: string
  name: string
  address: string
  city: string
  region: string
  postalCode: string
  country: string
  type: string
  status: string
  bedrooms: string
  bathrooms: string
  maxGuests: string
  notes: string
}

type OpenTaskFilter = "all_open" | "pending" | "assigned" | "accepted" | "in_progress"
type SupplyFilter = "all" | "missing" | "medium" | "full"

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDate(value: string | null | undefined, locale: string) {
  const date = normalizeDate(value)
  if (!date) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value: string | null | undefined, locale: string) {
  const date = normalizeDate(value)
  if (!date) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      locale: "en-GB",
      back: "Properties",
      loading: "Loading property...",
      loadError: "Property loading error",
      noPropertyData: "No property data found.",
      propertyDetails: "Property details",
      editProperty: "Edit property",
      saveChanges: "Save changes",
      saving: "Saving...",
      cancel: "Cancel",
      close: "Close",
      openPropertyTasksPage: "Open property tasks",
      overviewTitle: "Property summary",
      overviewSubtitle:
        "Dynamic counters for open tasks, completed history and supplies.",
      openTasksTitle: "Open property tasks",
      openTasksSubtitle:
        "Only open tasks are shown here, based on the selected filter.",
      noOpenTasks: "There are no open tasks right now.",
      suppliesTitle: "Supplies",
      suppliesSubtitle: "Only active supplies are shown here, with status filters.",
      issuesTitle: "Open issues / Repairs",
      issuesSubtitle: "Only open or in-progress issues are shown here.",
      noIssues: "There are no open issues.",
      noSupplies: "There are no active supplies.",
      viewTask: "View task",
      viewIssue: "View issue",
      propertyStatus: "Property status",
      readiness: "Readiness",
      ready: "Ready",
      actionNeeded: "Action needed",
      notReady: "Not ready",
      unknown: "Unknown",
      details: "Details",
      defaultPartnerTitle: "Default cleaning partner",
      defaultPartnerSubtitle: "Main cleaning partner for this property.",
      editPartner: "Edit partner",
      noDefaultPartner: "No default partner assigned.",
      choosePartner: "Choose partner",
      noPartner: "No partner",
      savePartner: "Save partner",

      cleaningChecklistTitle: "Base cleaning checklist",
      cleaningChecklistSubtitle:
        "The property's main cleaning checklist used in the daily workflow.",
      noCleaningChecklist: "No base cleaning checklist has been defined.",
      openChecklistManagement: "Open checklist management",
      editChecklist: "Edit checklist",
      suppliesFlowTitle: "Supplies flow",
      suppliesFlowSubtitle:
        "The supplies list is generated automatically from the property's active supplies.",
      suppliesFlowInfo:
        "Supplies are not configured as a separate manual template in the main workflow.",
      openSuppliesPage: "Open supplies page",
      openIssuesPage: "Open issues page",

      code: "Code",
      name: "Name",
      address: "Address",
      city: "City",
      region: "Region",
      postalCode: "Postal code",
      country: "Country",
      type: "Type",
      bedrooms: "Bedrooms",
      bathrooms: "Bathrooms",
      maxGuests: "Max guests",
      notes: "Notes",
      createdAt: "Created",
      updatedAt: "Last update",
      lastUpdate: "Last update",

      statusActive: "Active",
      statusInactive: "Inactive",
      statusMaintenance: "Maintenance",
      statusArchived: "Archived",

      taskAllOpen: "All open tasks",
      taskPending: "New tasks",
      taskAssigned: "Assigned / waiting acceptance",
      taskAccepted: "Accepted / waiting checklist",
      taskInProgress: "In progress",
      completedHistory: "Completed history",

      supplyAll: "All supplies",
      supplyMissing: "Missing",
      supplyMedium: "Medium",
      supplyFull: "Full",

      schedule: "Execution",
      partner: "Partner",
      priority: "Priority",
      normal: "Normal",
      borderline: "Borderline",

      cleaningSection: "Cleaning checklist",
      suppliesSection: "Supplies checklist",
      enabled: "Enabled",
      notEnabled: "Not enabled",
      submitted: "Submitted",
      notSubmitted: "Not submitted",
      noChecklist: "No checklist",
      autoFromPropertySupplies: "Automatic from active supplies",

      taskStatusHelpNew: "New task — click for assignment",
      taskStatusHelpAssigned: "Assigned — waiting acceptance",
      taskStatusHelpAccepted: "Accepted — waiting checklist",
      taskStatusHelpInProgress: "In progress",
      taskStatusHelpCompleted: "Task completed",

      saveError: "Failed to save changes.",
      partnerSaveError: "Failed to update default partner.",
      propertySaveSuccess: "Property updated successfully.",
      partnerSaveSuccess: "Default partner updated successfully.",
    }
  }

  return {
    locale: "el-GR",
    back: "Ακίνητα",
    loading: "Φόρτωση ακινήτου...",
    loadError: "Σφάλμα φόρτωσης ακινήτου",
    noPropertyData: "Δεν βρέθηκαν δεδομένα ακινήτου.",
    propertyDetails: "Στοιχεία ακινήτου",
    editProperty: "Επεξεργασία ακινήτου",
    saveChanges: "Αποθήκευση αλλαγών",
    saving: "Αποθήκευση...",
    cancel: "Ακύρωση",
    close: "Κλείσιμο",
    openPropertyTasksPage: "Άνοιγμα εργασιών ακινήτου",
    overviewTitle: "Σύνοψη ακινήτου",
    overviewSubtitle:
      "Δυναμικοί μετρητές για ανοιχτές εργασίες, ιστορικό ολοκληρωμένων και αναλώσιμα.",
    openTasksTitle: "Ανοιχτές εργασίες ακινήτου",
    openTasksSubtitle:
      "Εμφανίζονται μόνο οι ανοιχτές εργασίες, με βάση το επιλεγμένο φίλτρο.",
    noOpenTasks: "Δεν υπάρχουν ανοιχτές εργασίες αυτή τη στιγμή.",
    suppliesTitle: "Αναλώσιμα",
    suppliesSubtitle: "Εμφανίζονται μόνο τα ενεργά αναλώσιμα με φίλτρα κατάστασης.",
    issuesTitle: "Ανοιχτά θέματα / Βλάβες",
    issuesSubtitle: "Εμφανίζονται μόνο τα ανοιχτά ή σε εξέλιξη θέματα.",
    noIssues: "Δεν υπάρχουν ανοιχτά θέματα.",
    noSupplies: "Δεν υπάρχουν ενεργά αναλώσιμα.",
    viewTask: "Προβολή εργασίας",
    viewIssue: "Προβολή θέματος",
    propertyStatus: "Κατάσταση ακινήτου",
    readiness: "Ετοιμότητα",
    ready: "Έτοιμο",
    actionNeeded: "Θέλει ενέργειες",
    notReady: "Μη έτοιμο",
    unknown: "Άγνωστη",
    details: "Λεπτομέρειες",
    defaultPartnerTitle: "Προεπιλεγμένος συνεργάτης καθαριότητας",
    defaultPartnerSubtitle: "Ο βασικός συνεργάτης καθαριότητας για το ακίνητο.",
    editPartner: "Επεξεργασία συνεργάτη",
    noDefaultPartner: "Δεν έχει οριστεί προεπιλεγμένος συνεργάτης.",
    choosePartner: "Επιλογή συνεργάτη",
    noPartner: "Χωρίς συνεργάτη",
    savePartner: "Αποθήκευση συνεργάτη",

    cleaningChecklistTitle: "Βασική λίστα καθαριότητας",
    cleaningChecklistSubtitle:
      "Η κύρια λίστα καθαριότητας του ακινήτου που χρησιμοποιείται στη βασική ροή.",
    noCleaningChecklist: "Δεν έχει οριστεί βασική λίστα καθαριότητας.",
    openChecklistManagement: "Άνοιγμα διαχείρισης λίστας",
    editChecklist: "Επεξεργασία λίστας",
    suppliesFlowTitle: "Ροή αναλωσίμων",
    suppliesFlowSubtitle:
      "Η λίστα αναλωσίμων χτίζεται αυτόματα από τα ενεργά αναλώσιμα του ακινήτου.",
    suppliesFlowInfo:
      "Τα αναλώσιμα δεν ορίζονται ως ξεχωριστό χειροκίνητο template στη βασική ροή.",
    openSuppliesPage: "Άνοιγμα σελίδας αναλωσίμων",
    openIssuesPage: "Άνοιγμα σελίδας θεμάτων",

    code: "Κωδικός",
    name: "Όνομα",
    address: "Διεύθυνση",
    city: "Πόλη",
    region: "Περιοχή",
    postalCode: "ΤΚ",
    country: "Χώρα",
    type: "Τύπος",
    bedrooms: "Υπνοδωμάτια",
    bathrooms: "Μπάνια",
    maxGuests: "Μέγιστοι επισκέπτες",
    notes: "Σημειώσεις",
    createdAt: "Δημιουργία",
    updatedAt: "Τελευταία ενημέρωση",
    lastUpdate: "Τελευταία ενημέρωση",

    statusActive: "Ενεργό",
    statusInactive: "Ανενεργό",
    statusMaintenance: "Σε συντήρηση",
    statusArchived: "Αρχειοθετημένο",

    taskAllOpen: "Όλες οι ανοιχτές εργασίες",
    taskPending: "Νέες εργασίες",
    taskAssigned: "Ανατεθειμένες / αναμονή αποδοχής",
    taskAccepted: "Αποδεκτές / αναμονή checklist",
    taskInProgress: "Σε εξέλιξη",
    completedHistory: "Ιστορικό ολοκληρωμένων",

    supplyAll: "Όλα τα αναλώσιμα",
    supplyMissing: "Έλλειψη",
    supplyMedium: "Μέτρια",
    supplyFull: "Πλήρης",

    schedule: "Εκτέλεση",
    partner: "Συνεργάτης",
    priority: "Προτεραιότητα",
    normal: "Κανονικό",
    borderline: "Οριακό",

    cleaningSection: "Λίστα καθαριότητας",
    suppliesSection: "Λίστα αναλωσίμων",
    enabled: "Ενεργή",
    notEnabled: "Δεν στάλθηκε",
    submitted: "Υποβλήθηκε",
    notSubmitted: "Δεν υποβλήθηκε",
    noChecklist: "Χωρίς λίστα",
    autoFromPropertySupplies: "Αυτόματα από τα ενεργά αναλώσιμα",

    taskStatusHelpNew: "Νέα εργασία — πατήστε για ανάθεση",
    taskStatusHelpAssigned: "Ανατεθειμένη — αναμονή αποδοχής",
    taskStatusHelpAccepted: "Αποδεκτή — αναμονή checklist",
    taskStatusHelpInProgress: "Σε εξέλιξη",
    taskStatusHelpCompleted: "Η εργασία ολοκληρώθηκε",

    saveError: "Αποτυχία αποθήκευσης αλλαγών.",
    partnerSaveError: "Αποτυχία ενημέρωσης προεπιλεγμένου συνεργάτη.",
    propertySaveSuccess: "Το ακίνητο ενημερώθηκε επιτυχώς.",
    partnerSaveSuccess: "Ο προεπιλεγμένος συνεργάτης ενημερώθηκε επιτυχώς.",
  }
}

function propertyStatusLabel(language: "el" | "en", status?: string | null) {
  const value = (status || "").toLowerCase()

  if (language === "en") {
    switch (value) {
      case "active":
        return "Active"
      case "inactive":
        return "Inactive"
      case "maintenance":
        return "Maintenance"
      case "archived":
        return "Archived"
      default:
        return status || "—"
    }
  }

  switch (value) {
    case "active":
      return "Ενεργό"
    case "inactive":
      return "Ανενεργό"
    case "maintenance":
      return "Σε συντήρηση"
    case "archived":
      return "Αρχειοθετημένο"
    default:
      return status || "—"
  }
}

function taskStatusLabel(language: "el" | "en", status?: string | null) {
  const value = (status || "").toLowerCase()

  if (language === "en") {
    switch (value) {
      case "pending":
        return "Pending"
      case "assigned":
        return "Assigned"
      case "accepted":
        return "Accepted"
      case "in_progress":
        return "In progress"
      case "completed":
        return "Completed"
      case "cancelled":
        return "Cancelled"
      default:
        return status || "—"
    }
  }

  switch (value) {
    case "pending":
      return "Εκκρεμεί"
    case "assigned":
      return "Ανατέθηκε"
    case "accepted":
      return "Αποδεκτή"
    case "in_progress":
      return "Σε εξέλιξη"
    case "completed":
      return "Ολοκληρωμένη"
    case "cancelled":
      return "Ακυρωμένη"
    default:
      return status || "—"
  }
}

function getTaskStatusHelp(language: "el" | "en", status?: string | null) {
  const value = (status || "").toLowerCase()

  if (language === "en") {
    switch (value) {
      case "pending":
        return "New task — click for assignment"
      case "assigned":
        return "Assigned — waiting acceptance"
      case "accepted":
        return "Accepted — waiting checklist"
      case "in_progress":
        return "In progress"
      case "completed":
        return "Task completed"
      default:
        return "—"
    }
  }

  switch (value) {
    case "pending":
      return "Νέα εργασία — πατήστε για ανάθεση"
    case "assigned":
      return "Ανατεθειμένη — αναμονή αποδοχής"
    case "accepted":
      return "Αποδεκτή — αναμονή checklist"
    case "in_progress":
      return "Σε εξέλιξη"
    case "completed":
      return "Η εργασία ολοκληρώθηκε"
    default:
      return "—"
  }
}

function issueStatusLabel(language: "el" | "en", status?: string | null) {
  const value = (status || "").toLowerCase()

  if (language === "en") {
    switch (value) {
      case "open":
        return "Open"
      case "in_progress":
        return "In progress"
      case "resolved":
        return "Resolved"
      case "closed":
        return "Closed"
      default:
        return status || "—"
    }
  }

  switch (value) {
    case "open":
      return "Ανοιχτό"
    case "in_progress":
      return "Σε εξέλιξη"
    case "resolved":
      return "Επιλυμένο"
    case "closed":
      return "Κλειστό"
    default:
      return status || "—"
  }
}

function severityLabel(language: "el" | "en", severity?: string | null) {
  const value = (severity || "").toLowerCase()

  if (language === "en") {
    switch (value) {
      case "low":
        return "Low"
      case "medium":
        return "Medium"
      case "high":
        return "High"
      case "critical":
        return "Critical"
      default:
        return severity || "—"
    }
  }

  switch (value) {
    case "low":
      return "Χαμηλή"
    case "medium":
      return "Μεσαία"
    case "high":
      return "Υψηλή"
    case "critical":
      return "Κρίσιμη"
    default:
      return severity || "—"
  }
}

function typeLabel(language: "el" | "en", value?: string | null) {
  if (!value) return "—"

  const normalized = value.toLowerCase()

  if (language === "en") {
    switch (normalized) {
      case "apartment":
      case "διαμέρισμα":
        return "Apartment"
      case "villa":
      case "βίλα":
        return "Villa"
      case "house":
      case "μονοκατοικία":
        return "House"
      case "studio":
      case "στούντιο":
        return "Studio"
      case "maisonette":
      case "μεζονέτα":
        return "Maisonette"
      case "loft":
        return "Loft"
      default:
        return value
    }
  }

  switch (normalized) {
    case "apartment":
    case "διαμέρισμα":
      return "Διαμέρισμα"
    case "villa":
    case "βίλα":
      return "Βίλα"
    case "house":
    case "μονοκατοικία":
      return "Μονοκατοικία"
    case "studio":
    case "στούντιο":
      return "Στούντιο"
    case "maisonette":
    case "μεζονέτα":
      return "Μεζονέτα"
    case "loft":
      return "Loft"
    default:
      return value
  }
}

function badgeClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "active":
    case "completed":
    case "resolved":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "pending":
    case "assigned":
    case "accepted":
    case "in_progress":
    case "maintenance":
    case "medium":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "inactive":
    case "cancelled":
    case "archived":
    case "closed":
    case "low":
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
    case "critical":
    case "urgent":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    case "high":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "normal":
    case "medium":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
    case "low":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getSupplyStateThree(
  current: number,
  target?: number | null,
  threshold?: number | null
): "missing" | "medium" | "full" {
  if (current <= 0) return "missing"

  const safeTarget =
    typeof target === "number" && Number.isFinite(target) ? target : null
  const safeThreshold =
    typeof threshold === "number" && Number.isFinite(threshold) ? threshold : null

  if (safeTarget !== null && safeTarget > 0 && current >= safeTarget) {
    return "full"
  }

  if (safeThreshold !== null && current <= safeThreshold) {
    return "medium"
  }

  if (safeTarget !== null && safeTarget > 0 && current < safeTarget) {
    return "medium"
  }

  return "full"
}

function supplyStateLabel(language: "el" | "en", state: "missing" | "medium" | "full") {
  if (language === "en") {
    if (state === "missing") return "Missing"
    if (state === "medium") return "Medium"
    return "Full"
  }

  if (state === "missing") return "Έλλειψη"
  if (state === "medium") return "Μέτρια"
  return "Πλήρης"
}

function supplyStateBadgeClass(state: "missing" | "medium" | "full") {
  if (state === "missing") return "bg-red-50 text-red-700 ring-1 ring-red-200"
  if (state === "medium") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
}

function getLatestAssignment(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  return safeArray(task.assignments)[0] || null
}

function buildPropertyEditForm(property: PropertyDetail): PropertyEditForm {
  return {
    code: property.code || "",
    name: property.name || "",
    address: property.address || "",
    city: property.city || "",
    region: property.region || "",
    postalCode: property.postalCode || "",
    country: property.country || "",
    type: property.type || "Διαμέρισμα",
    status: property.status || "active",
    bedrooms: String(property.bedrooms ?? 0),
    bathrooms: String(property.bathrooms ?? 0),
    maxGuests: String(property.maxGuests ?? 0),
    notes: property.notes || "",
  }
}

function parseDateAndTime(dateValue?: string | null, timeValue?: string | null) {
  if (!dateValue) return null

  const datePart = String(dateValue).slice(0, 10)
  const timePart =
    timeValue && /^\d{2}:\d{2}/.test(timeValue) ? String(timeValue).slice(0, 5) : "12:00"

  const composed = new Date(`${datePart}T${timePart}:00`)
  if (Number.isNaN(composed.getTime())) return null
  return composed
}

function isTaskBorderline(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  const status = String(task.status || "").toLowerCase()
  if (!["pending", "assigned", "accepted", "in_progress"].includes(status)) {
    return false
  }

  const now = new Date()
  const scheduled = parseDateAndTime(task.scheduledDate, task.scheduledStartTime || null)
  const due = task.dueDate ? new Date(task.dueDate) : null
  const candidates = [scheduled, due].filter(
    (row): row is Date => Boolean(row && !Number.isNaN(row.getTime()))
  )

  if (candidates.length === 0) return false

  const nearest = candidates.sort((a, b) => a.getTime() - b.getTime())[0]
  const diff = nearest.getTime() - now.getTime()
  const threeHours = 3 * 60 * 60 * 1000

  return diff <= threeHours
}

function getPrimaryCleaningChecklist(property: PropertyDetail | null) {
  if (!property) return null

  return (
    safeArray(property.checklistTemplates).find((template) => {
      const templateType = String(template.templateType || "").toLowerCase()
      return template.isPrimary && template.isActive && templateType !== "supplies"
    }) || null
  )
}

function getCleaningRun(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  if (task.cleaningChecklistRun) return task.cleaningChecklistRun
  if (task.sendCleaningChecklist && task.checklistRun) return task.checklistRun
  return null
}

function getSuppliesRun(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  if (task.suppliesChecklistRun) return task.suppliesChecklistRun
  return null
}

function isRunSubmitted(run?: ChecklistRunLite | null) {
  if (!run) return false
  if (run.completedAt) return true
  return ["completed", "submitted"].includes(String(run.status || "").toLowerCase())
}

function getChecklistSectionStateLabel(
  language: "el" | "en",
  enabled: boolean,
  submitted: boolean
) {
  if (!enabled) return language === "en" ? "Not enabled" : "Δεν στάλθηκε"
  if (submitted) return language === "en" ? "Submitted" : "Υποβλήθηκε"
  return language === "en" ? "Not submitted" : "Δεν υποβλήθηκε"
}

function getReadinessState(property: PropertyDetail | null, language: "el" | "en") {
  if (!property) {
    return {
      label: language === "en" ? "Unknown" : "Άγνωστη",
      tone: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
      details: language === "en" ? "No data available." : "Δεν υπάρχουν διαθέσιμα δεδομένα.",
    }
  }

  const issues = safeArray(property.issues)
  const openIssues = issues.filter((issue) =>
    ["open", "in_progress"].includes((issue.status || "").toLowerCase())
  )
  const criticalIssues = openIssues.filter((issue) =>
    ["high", "critical"].includes((issue.severity || "").toLowerCase())
  )

  const openTasks = safeArray(property.tasks).filter((task) =>
    ["pending", "assigned", "accepted", "in_progress"].includes(
      (task.status || "").toLowerCase()
    )
  )

  const hasPrimaryCleaningChecklist = Boolean(getPrimaryCleaningChecklist(property))

  const notFullSupplies = safeArray(property.propertySupplies).filter((supply) => {
    const current = Number(supply.currentStock || 0)
    const target = supply.targetStock ?? null
    const threshold = supply.reorderThreshold ?? supply.supplyItem?.minimumStock ?? null
    return getSupplyStateThree(current, target, threshold) !== "full"
  })

  if (criticalIssues.length > 0) {
    return {
      label: language === "en" ? "Not ready" : "Μη έτοιμο",
      tone: "bg-red-50 text-red-700 ring-1 ring-red-200",
      details:
        language === "en"
          ? `There are ${criticalIssues.length} critical open issues.`
          : `Υπάρχουν ${criticalIssues.length} κρίσιμα ανοιχτά θέματα.`,
    }
  }

  if (
    openIssues.length > 0 ||
    openTasks.length > 0 ||
    !hasPrimaryCleaningChecklist ||
    notFullSupplies.length > 0
  ) {
    return {
      label: language === "en" ? "Action needed" : "Θέλει ενέργειες",
      tone: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      details:
        language === "en"
          ? `Open tasks: ${openTasks.length} · Open issues: ${openIssues.length} · Supplies not full: ${notFullSupplies.length}`
          : `Ανοιχτές εργασίες: ${openTasks.length} · Ανοιχτά θέματα: ${openIssues.length} · Αναλώσιμα μη πλήρη: ${notFullSupplies.length}`,
    }
  }

  return {
    label: language === "en" ? "Ready" : "Έτοιμο",
    tone: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    details:
      language === "en"
        ? "No open blockers were detected."
        : "Δεν εντοπίστηκαν ανοιχτά blockers.",
  }
}

function Modal({
  open,
  title,
  description,
  onClose,
  children,
  closeLabel,
}: {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  closeLabel: string
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {closeLabel}
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">{children}</div>
      </div>
    </div>
  )
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-900">{value}</div>
    </div>
  )
}

function CounterButton({
  label,
  value,
  active,
  onClick,
  tone = "slate",
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
  tone?: "slate" | "amber" | "blue" | "emerald" | "red"
}) {
  const tones = {
    slate: active
      ? "border-slate-900 bg-slate-900 text-white"
      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
    amber: active
      ? "border-amber-500 bg-amber-500 text-white"
      : "border-amber-200 bg-white text-amber-800 hover:bg-amber-50",
    blue: active
      ? "border-sky-500 bg-sky-500 text-white"
      : "border-sky-200 bg-white text-sky-800 hover:bg-sky-50",
    emerald: active
      ? "border-emerald-600 bg-emerald-600 text-white"
      : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
    red: active
      ? "border-red-600 bg-red-600 text-white"
      : "border-red-200 bg-white text-red-800 hover:bg-red-50",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left shadow-sm transition ${tones[tone]}`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </button>
  )
}

export default function PropertyDetailPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { language } = useAppLanguage()
  const texts = getTexts(language)

  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeModal, setActiveModal] = useState<ModalKey>(null)

  const [propertyForm, setPropertyForm] = useState<PropertyEditForm | null>(null)
  const [propertySaving, setPropertySaving] = useState(false)
  const [propertyFormMessage, setPropertyFormMessage] = useState<string | null>(null)

  const [selectedPartnerId, setSelectedPartnerId] = useState("")
  const [partnerSaving, setPartnerSaving] = useState(false)
  const [partnerFormMessage, setPartnerFormMessage] = useState<string | null>(null)

  const [openTaskFilter, setOpenTaskFilter] = useState<OpenTaskFilter>("all_open")
  const [supplyFilter, setSupplyFilter] = useState<SupplyFilter>("all")

  async function loadPage() {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const [propertyRes, partnersRes] = await Promise.all([
        fetch(`/api/properties/${id}`, { cache: "no-store" }),
        fetch("/api/partners", { cache: "no-store" }),
      ])

      const propertyJson = await propertyRes.json().catch(() => null)
      const partnersJson = await partnersRes.json().catch(() => [])

      if (!propertyRes.ok) {
        throw new Error(propertyJson?.error || texts.loadError)
      }

      const normalizedProperty = propertyJson?.property ?? propertyJson?.data ?? propertyJson
      const normalizedPartners = Array.isArray(partnersJson)
        ? partnersJson
        : Array.isArray(partnersJson?.partners)
          ? partnersJson.partners
          : Array.isArray(partnersJson?.data)
            ? partnersJson.data
            : []

      setProperty(normalizedProperty as PropertyDetail)
      setPartners(normalizedPartners as PartnerOption[])
      setPropertyForm(buildPropertyEditForm(normalizedProperty as PropertyDetail))
      setSelectedPartnerId(String((normalizedProperty as PropertyDetail)?.defaultPartnerId || ""))
    } catch (err) {
      console.error("Load property detail error:", err)
      setError(err instanceof Error ? err.message : texts.loadError)
      setProperty(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const tasks = useMemo(() => safeArray(property?.tasks), [property])

  const openTasksBase = useMemo(() => {
    return tasks.filter((task) =>
      ["pending", "assigned", "accepted", "in_progress"].includes(
        String(task.status || "").toLowerCase()
      )
    )
  }, [tasks])

  const completedCount = useMemo(() => {
    return tasks.filter((task) => String(task.status || "").toLowerCase() === "completed").length
  }, [tasks])

  const openTaskCounts = useMemo(() => {
    return {
      all_open: openTasksBase.length,
      pending: openTasksBase.filter((task) => String(task.status || "").toLowerCase() === "pending").length,
      assigned: openTasksBase.filter((task) => String(task.status || "").toLowerCase() === "assigned").length,
      accepted: openTasksBase.filter((task) => String(task.status || "").toLowerCase() === "accepted").length,
      in_progress: openTasksBase.filter((task) => String(task.status || "").toLowerCase() === "in_progress").length,
    }
  }, [openTasksBase])

  const visibleOpenTasks = useMemo(() => {
    let rows = [...openTasksBase]

    if (openTaskFilter !== "all_open") {
      rows = rows.filter(
        (task) => String(task.status || "").toLowerCase() === openTaskFilter
      )
    }

    return rows.sort((a, b) => {
      const aBorder = isTaskBorderline(a) ? 1 : 0
      const bBorder = isTaskBorderline(b) ? 1 : 0

      if (aBorder !== bBorder) return bBorder - aBorder

      const aDate = parseDateAndTime(a.scheduledDate, a.scheduledStartTime || null)
      const bDate = parseDateAndTime(b.scheduledDate, b.scheduledStartTime || null)

      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1

      return aDate.getTime() - bDate.getTime()
    })
  }, [openTasksBase, openTaskFilter])

  const openIssues = useMemo(() => {
    return safeArray(property?.issues).filter((issue) =>
      ["open", "in_progress"].includes(String(issue.status || "").toLowerCase())
    )
  }, [property])

  const supplyRows = useMemo(() => {
    return safeArray(property?.propertySupplies).map((supply) => {
      const current = Number(supply.currentStock || 0)
      const target = supply.targetStock ?? null
      const threshold = supply.reorderThreshold ?? supply.supplyItem?.minimumStock ?? null
      const derivedState = getSupplyStateThree(current, target, threshold)

      return {
        ...supply,
        derivedState,
        lastSeenUpdate: supply.lastUpdatedAt || supply.updatedAt || null,
      }
    })
  }, [property])

  const supplyCounts = useMemo(() => {
    return {
      all: supplyRows.length,
      missing: supplyRows.filter((item) => item.derivedState === "missing").length,
      medium: supplyRows.filter((item) => item.derivedState === "medium").length,
      full: supplyRows.filter((item) => item.derivedState === "full").length,
    }
  }, [supplyRows])

  const visibleSupplies = useMemo(() => {
    if (supplyFilter === "all") return supplyRows
    return supplyRows.filter((item) => item.derivedState === supplyFilter)
  }, [supplyRows, supplyFilter])

  const primaryCleaningChecklist = useMemo(() => {
    return getPrimaryCleaningChecklist(property)
  }, [property])

  const readiness = useMemo(() => getReadinessState(property, language), [property, language])

  async function savePropertyChanges(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!property || !propertyForm) return

    try {
      setPropertySaving(true)
      setPropertyFormMessage(null)

      const payload = {
        code: propertyForm.code.trim(),
        name: propertyForm.name.trim(),
        address: propertyForm.address.trim(),
        city: propertyForm.city.trim(),
        region: propertyForm.region.trim(),
        postalCode: propertyForm.postalCode.trim(),
        country: propertyForm.country.trim(),
        type: propertyForm.type.trim(),
        status: propertyForm.status,
        bedrooms: Number(propertyForm.bedrooms || 0),
        bathrooms: Number(propertyForm.bathrooms || 0),
        maxGuests: Number(propertyForm.maxGuests || 0),
        notes: propertyForm.notes.trim() || null,
      }

      const res = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || texts.saveError)
      }

      const updatedProperty = json?.property ?? json?.data ?? property
      setProperty(updatedProperty as PropertyDetail)
      setPropertyForm(buildPropertyEditForm(updatedProperty as PropertyDetail))
      setPropertyFormMessage(texts.propertySaveSuccess)
    } catch (err) {
      console.error("Save property changes error:", err)
      setPropertyFormMessage(err instanceof Error ? err.message : texts.saveError)
    } finally {
      setPropertySaving(false)
    }
  }

  async function savePartnerChanges(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!property) return

    try {
      setPartnerSaving(true)
      setPartnerFormMessage(null)

      const payload = {
        defaultPartnerId: selectedPartnerId || null,
      }

      const res = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || texts.partnerSaveError)
      }

      const updatedProperty = json?.property ?? json?.data ?? property
      setProperty(updatedProperty as PropertyDetail)
      setSelectedPartnerId(String((updatedProperty as PropertyDetail)?.defaultPartnerId || ""))
      setPartnerFormMessage(texts.partnerSaveSuccess)
    } catch (err) {
      console.error("Save default partner error:", err)
      setPartnerFormMessage(err instanceof Error ? err.message : texts.partnerSaveError)
    } finally {
      setPartnerSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">{texts.loading}</div>
      </div>
    )
  }

  if (error || !property || !propertyForm) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{texts.loadError}</h1>
        <p className="mt-2 text-sm text-red-600">{error || texts.noPropertyData}</p>
        <div className="mt-4">
          <Link
            href="/properties"
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {texts.back}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link href="/properties" className="font-medium text-slate-500 hover:text-slate-900">
                  {texts.back}
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-slate-600">{property.code}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {property.name}
                </h1>

                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                    property.status
                  )}`}
                >
                  {propertyStatusLabel(language, property.status)}
                </span>

                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {typeLabel(language, property.type)}
                </span>

                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${readiness.tone}`}
                >
                  {texts.readiness}: {readiness.label}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {property.address}, {property.city}, {property.region}, {property.postalCode},{" "}
                {property.country}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">{readiness.details}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setPropertyForm(buildPropertyEditForm(property))
                  setPropertyFormMessage(null)
                  setActiveModal("property")
                }}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {texts.propertyDetails}
              </button>

              <Link
                href={`/properties/${property.id}/tasks`}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {texts.openPropertyTasksPage}
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-slate-900">{texts.overviewTitle}</h2>
            <p className="text-sm text-slate-500">{texts.overviewSubtitle}</p>
          </div>

          <div className="mt-5 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-800">Καταστάσεις ανοιχτών εργασιών</div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <CounterButton
                  label={texts.taskAllOpen}
                  value={openTaskCounts.all_open}
                  active={openTaskFilter === "all_open"}
                  onClick={() => setOpenTaskFilter("all_open")}
                  tone="slate"
                />
                <CounterButton
                  label={texts.taskPending}
                  value={openTaskCounts.pending}
                  active={openTaskFilter === "pending"}
                  onClick={() => setOpenTaskFilter("pending")}
                  tone="amber"
                />
                <CounterButton
                  label={texts.taskAssigned}
                  value={openTaskCounts.assigned}
                  active={openTaskFilter === "assigned"}
                  onClick={() => setOpenTaskFilter("assigned")}
                  tone="amber"
                />
                <CounterButton
                  label={texts.taskAccepted}
                  value={openTaskCounts.accepted}
                  active={openTaskFilter === "accepted"}
                  onClick={() => setOpenTaskFilter("accepted")}
                  tone="blue"
                />
                <CounterButton
                  label={texts.taskInProgress}
                  value={openTaskCounts.in_progress}
                  active={openTaskFilter === "in_progress"}
                  onClick={() => setOpenTaskFilter("in_progress")}
                  tone="blue"
                />
                <CounterButton
                  label={texts.completedHistory}
                  value={completedCount}
                  active={false}
                  onClick={() => {
                    window.location.href = `/properties/${property.id}/tasks/history?status=completed`
                  }}
                  tone="emerald"
                />
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-slate-800">Κατάσταση αναλωσίμων</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <CounterButton
                  label={texts.supplyAll}
                  value={supplyCounts.all}
                  active={supplyFilter === "all"}
                  onClick={() => setSupplyFilter("all")}
                  tone="slate"
                />
                <CounterButton
                  label={texts.supplyMissing}
                  value={supplyCounts.missing}
                  active={supplyFilter === "missing"}
                  onClick={() => setSupplyFilter("missing")}
                  tone="red"
                />
                <CounterButton
                  label={texts.supplyMedium}
                  value={supplyCounts.medium}
                  active={supplyFilter === "medium"}
                  onClick={() => setSupplyFilter("medium")}
                  tone="amber"
                />
                <CounterButton
                  label={texts.supplyFull}
                  value={supplyCounts.full}
                  active={supplyFilter === "full"}
                  onClick={() => setSupplyFilter("full")}
                  tone="emerald"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{texts.openTasksTitle}</h2>
              <p className="mt-1 text-sm text-slate-500">{texts.openTasksSubtitle}</p>
            </div>

            <Link
              href={`/properties/${property.id}/tasks`}
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.openPropertyTasksPage}
            </Link>
          </div>

          <div className="mt-5">
            {visibleOpenTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                {texts.noOpenTasks}
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {visibleOpenTasks.map((task) => {
                  const latestAssignment = getLatestAssignment(task)
                  const borderline = isTaskBorderline(task)
                  const cleaningEnabled = Boolean(task.sendCleaningChecklist)
                  const suppliesEnabled = Boolean(task.sendSuppliesChecklist)
                  const cleaningRun = getCleaningRun(task)
                  const suppliesRun = getSuppliesRun(task)
                  const cleaningSubmitted = isRunSubmitted(cleaningRun)
                  const suppliesSubmitted = isRunSubmitted(suppliesRun)

                  const showNormalBadge =
                    !borderline &&
                    ["accepted", "in_progress"].includes(String(task.status || "").toLowerCase())

                  const partnerValue =
                    String(task.status || "").toLowerCase() === "accepted"
                      ? latestAssignment?.partner?.name
                        ? `${latestAssignment.partner.name} · Ο συνεργάτης αποδέχτηκε την εργασία`
                        : "Ο συνεργάτης αποδέχτηκε την εργασία"
                      : latestAssignment?.partner?.name || "—"

                  return (
                    <div
                      key={task.id}
                      className={`rounded-2xl border p-4 ${
                        borderline ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold text-slate-900">{task.title}</div>

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                                task.status
                              )}`}
                            >
                              {taskStatusLabel(language, task.status)}
                            </span>

                            {borderline ? (
                              <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                                {texts.borderline}
                              </span>
                            ) : null}

                            {showNormalBadge ? (
                              <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
                                {texts.normal}
                              </span>
                            ) : null}

                            {task.priority ? (
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadgeClasses(
                                  task.priority
                                )}`}
                              >
                                {task.priority}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-2 text-sm font-medium text-slate-700">
                            {getTaskStatusHelp(language, task.status)}
                          </div>

                          {task.description ? (
                            <div className="mt-2 text-sm text-slate-600">{task.description}</div>
                          ) : null}
                        </div>

                        <Link
                          href={`/tasks/${task.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {texts.viewTask}
                        </Link>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <InfoChip
                          label={texts.schedule}
                          value={`${formatDate(task.scheduledDate, texts.locale)}${
                            task.scheduledStartTime ? ` · ${task.scheduledStartTime}` : ""
                          }`}
                        />
                        <InfoChip label={texts.partner} value={partnerValue} />
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <InfoChip
                          label={texts.cleaningSection}
                          value={
                            cleaningEnabled
                              ? `${cleaningRun?.template?.title || texts.cleaningSection} · ${getChecklistSectionStateLabel(
                                  language,
                                  true,
                                  cleaningSubmitted
                                )}`
                              : texts.notEnabled
                          }
                        />

                        <InfoChip
                          label={texts.suppliesSection}
                          value={
                            suppliesEnabled
                              ? `${texts.autoFromPropertySupplies} · ${getChecklistSectionStateLabel(
                                  language,
                                  true,
                                  suppliesSubmitted
                                )}`
                              : texts.notEnabled
                          }
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">{texts.suppliesTitle}</h3>
              <p className="mt-1 text-sm text-slate-500">{texts.suppliesSubtitle}</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal("supplies")}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.details}
            </button>
          </div>

          <div className="mt-3">
            {visibleSupplies.length > 0 ? (
              <div className="space-y-2">
                {visibleSupplies.slice(0, 3).map((supply) => (
                  <div
                    key={supply.id}
                    className="rounded-xl bg-slate-50 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-900">
                        {supply.supplyItem?.name || "—"}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${supplyStateBadgeClass(
                          supply.derivedState
                        )}`}
                      >
                        {supplyStateLabel(language, supply.derivedState)}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      {texts.lastUpdate}: {formatDateTime(supply.lastSeenUpdate, texts.locale)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                {texts.noSupplies}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">{texts.issuesTitle}</h3>
                <p className="mt-1 text-sm text-slate-500">{texts.issuesSubtitle}</p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal("issues")}
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {texts.details}
              </button>
            </div>

            <div className="mt-3">
              {openIssues.length > 0 ? (
                <div className="space-y-2">
                  {openIssues.slice(0, 3).map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-sm text-slate-900">{issue.title}</span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                          issue.severity
                        )}`}
                      >
                        {severityLabel(language, issue.severity)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  {texts.noIssues}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900">{texts.defaultPartnerTitle}</h3>
                  <p className="mt-1 text-sm text-slate-500">{texts.defaultPartnerSubtitle}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPartnerId(String(property.defaultPartnerId || ""))
                    setPartnerFormMessage(null)
                    setActiveModal("partner")
                  }}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {texts.editPartner}
                </button>
              </div>

              <div className="mt-3">
                {property.defaultPartner ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    <InfoChip label={texts.name} value={property.defaultPartner.name} />
                    <InfoChip label="Email" value={property.defaultPartner.email || "—"} />
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                    {texts.noDefaultPartner}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900">{texts.cleaningChecklistTitle}</h3>
                  <p className="mt-1 text-sm text-slate-500">{texts.cleaningChecklistSubtitle}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModal("cleaningChecklist")}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {texts.details}
                </button>
              </div>

              <div className="mt-3">
                {primaryCleaningChecklist ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    <InfoChip label={texts.name} value={primaryCleaningChecklist.title} />
                    <InfoChip
                      label="Στοιχεία"
                      value={String(safeArray(primaryCleaningChecklist.items).length)}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                    {texts.noCleaningChecklist}
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                {texts.suppliesFlowInfo}
              </div>
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={activeModal === "property"}
        title={texts.propertyDetails}
        description={texts.editProperty}
        onClose={() => setActiveModal(null)}
        closeLabel={texts.close}
      >
        <form onSubmit={savePropertyChanges} className="space-y-5">
          {propertyFormMessage ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                propertyFormMessage === texts.propertySaveSuccess
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {propertyFormMessage}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{texts.code}</label>
              <input
                value={propertyForm.code}
                onChange={(e) =>
                  setPropertyForm((prev) => (prev ? { ...prev, code: e.target.value } : prev))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{texts.name}</label>
              <input
                value={propertyForm.name}
                onChange={(e) =>
                  setPropertyForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">{texts.address}</label>
              <input
                value={propertyForm.address}
                onChange={(e) =>
                  setPropertyForm((prev) => (prev ? { ...prev, address: e.target.value } : prev))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{texts.city}</label>
              <input
                value={propertyForm.city}
                onChange={(e) =>
                  setPropertyForm((prev) => (prev ? { ...prev, city: e.target.value } : prev))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{texts.region}</label>
              <input
                value={propertyForm.region}
                onChange={(e) =>
                  setPropertyForm((prev) => (prev ? { ...prev, region: e.target.value } : prev))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{texts.postalCode}</label>
              <input
                value={propertyForm.postalCode}
                onChange={(e) =>
                  setPropertyForm((prev) => (prev ? { ...prev, postalCode: e.target.value } : prev))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{texts.country}</label>
              <input
                value={propertyForm.country}
                onChange={(e) =>
                  setPropertyForm((prev) => (prev ? { ...prev, country: e.target.value } : prev))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{texts.type}</label>
              <input
                value={propertyForm.type}
                onChange={(e) =>
                  setPropertyForm((prev) => (prev ? { ...prev, type: e.target.value } : prev))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{texts.propertyStatus}</label>
              <select
                value={propertyForm.status}
                onChange={(e) =>
                  setPropertyForm((prev) => (prev ? { ...prev, status: e.target.value } : prev))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="active">{texts.statusActive}</option>
                <option value="inactive">{texts.statusInactive}</option>
                <option value="maintenance">{texts.statusMaintenance}</option>
                <option value="archived">{texts.statusArchived}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{texts.bedrooms}</label>
              <input
                type="number"
                min="0"
                value={propertyForm.bedrooms}
                onChange={(e) =>
                  setPropertyForm((prev) => (prev ? { ...prev, bedrooms: e.target.value } : prev))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{texts.bathrooms}</label>
              <input
                type="number"
                min="0"
                value={propertyForm.bathrooms}
                onChange={(e) =>
                  setPropertyForm((prev) => (prev ? { ...prev, bathrooms: e.target.value } : prev))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{texts.maxGuests}</label>
              <input
                type="number"
                min="0"
                value={propertyForm.maxGuests}
                onChange={(e) =>
                  setPropertyForm((prev) => (prev ? { ...prev, maxGuests: e.target.value } : prev))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">{texts.notes}</label>
              <textarea
                value={propertyForm.notes}
                onChange={(e) =>
                  setPropertyForm((prev) => (prev ? { ...prev, notes: e.target.value } : prev))
                }
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={propertySaving}
            >
              {texts.cancel}
            </button>

            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              disabled={propertySaving}
            >
              {propertySaving ? texts.saving : texts.saveChanges}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={activeModal === "partner"}
        title={texts.defaultPartnerTitle}
        description={texts.defaultPartnerSubtitle}
        onClose={() => setActiveModal(null)}
        closeLabel={texts.close}
      >
        <form onSubmit={savePartnerChanges} className="space-y-5">
          {partnerFormMessage ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                partnerFormMessage === texts.partnerSaveSuccess
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {partnerFormMessage}
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{texts.choosePartner}</label>
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
            >
              <option value="">{texts.noPartner}</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name} ({partner.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={partnerSaving}
            >
              {texts.cancel}
            </button>

            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              disabled={partnerSaving}
            >
              {partnerSaving ? texts.saving : texts.savePartner}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={activeModal === "cleaningChecklist"}
        title={texts.cleaningChecklistTitle}
        description={texts.cleaningChecklistSubtitle}
        onClose={() => setActiveModal(null)}
        closeLabel={texts.close}
      >
        {primaryCleaningChecklist ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <InfoChip label={texts.name} value={primaryCleaningChecklist.title} />
              <InfoChip
                label="Στοιχεία"
                value={String(safeArray(primaryCleaningChecklist.items).length)}
              />
              <InfoChip
                label={texts.updatedAt}
                value={formatDateTime(primaryCleaningChecklist.updatedAt, texts.locale)}
              />
            </div>

            {primaryCleaningChecklist.description ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                {primaryCleaningChecklist.description}
              </div>
            ) : null}

            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              {texts.suppliesFlowInfo}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/property-checklists/${property.id}`}
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {texts.openChecklistManagement}
              </Link>

              <Link
                href={`/property-checklists/${property.id}/templates/${primaryCleaningChecklist.id}`}
                className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {texts.editChecklist}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              {texts.noCleaningChecklist}
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              {texts.suppliesFlowInfo}
            </div>

            <Link
              href={`/property-checklists/${property.id}`}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {texts.openChecklistManagement}
            </Link>
          </div>
        )}
      </Modal>

      <Modal
        open={activeModal === "supplies"}
        title={texts.suppliesTitle}
        description={texts.suppliesSubtitle}
        onClose={() => setActiveModal(null)}
        closeLabel={texts.close}
      >
        {visibleSupplies.length === 0 ? (
          <div className="space-y-4">
            <div className="text-sm text-slate-500">{texts.noSupplies}</div>
            <Link
              href={`/properties/${property.id}/supplies`}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {texts.openSuppliesPage}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleSupplies.map((supply) => (
              <div key={supply.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900">
                      {supply.supplyItem?.name || "—"}
                    </div>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${supplyStateBadgeClass(
                      supply.derivedState
                    )}`}
                  >
                    {supplyStateLabel(language, supply.derivedState)}
                  </span>
                </div>

                <div className="mt-3 text-sm text-slate-500">
                  {texts.lastUpdate}: {formatDateTime(supply.lastSeenUpdate, texts.locale)}
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Link
                href={`/properties/${property.id}/supplies`}
                className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {texts.openSuppliesPage}
              </Link>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={activeModal === "issues"}
        title={texts.issuesTitle}
        description={texts.issuesSubtitle}
        onClose={() => setActiveModal(null)}
        closeLabel={texts.close}
      >
        {openIssues.length === 0 ? (
          <div className="space-y-4">
            <div className="text-sm text-slate-500">{texts.noIssues}</div>
            <Link
              href="/issues"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {texts.openIssuesPage}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {openIssues.map((issue) => (
              <div key={issue.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-slate-900">{issue.title}</div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                          issue.status
                        )}`}
                      >
                        {issueStatusLabel(language, issue.status)}
                      </span>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                          issue.severity
                        )}`}
                      >
                        {severityLabel(language, issue.severity)}
                      </span>
                    </div>

                    {issue.description ? (
                      <div className="mt-2 text-sm text-slate-700">{issue.description}</div>
                    ) : null}
                  </div>

                  <Link
                    href={`/issues/${issue.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {texts.viewIssue}
                  </Link>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Link
                href="/issues"
                className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {texts.openIssuesPage}
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}