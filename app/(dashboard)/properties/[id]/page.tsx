"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

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

  bookings?: Array<{
    id: string
    sourcePlatform: string
    externalBookingId?: string | null
    guestName?: string | null
    guestPhone?: string | null
    guestEmail?: string | null
    checkInDate: string
    checkOutDate: string
    checkInTime?: string | null
    checkOutTime?: string | null
    adults?: number | null
    children?: number | null
    infants?: number | null
    status: string
    notes?: string | null
    createdAt?: string
    updatedAt?: string
  }>

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
    requiresChecklist?: boolean
    requiresApproval?: boolean
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
    checklistRun?: {
      id: string
      status: string
      startedAt?: string | null
      completedAt?: string | null
      template?: {
        id: string
        title: string
        templateType: string
        isPrimary: boolean
      } | null
      answers?: Array<{
        id: string
        issueCreated?: boolean
      }>
    } | null
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
    booking?: {
      id: string
      guestName?: string | null
      checkInDate: string
      checkOutDate: string
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
      issueTypeOnFail?: string | null
      issueSeverityOnFail?: string | null
      failureValuesText?: string | null
      linkedSupplyItemId?: string | null
      supplyUpdateMode?: string | null
      supplyQuantity?: number | null
      supplyItem?: {
        id: string
        code: string
        name: string
        category: string
        unit: string
        minimumStock?: number | null
      } | null
    }>
  }>

  propertySupplies?: Array<{
    id: string
    currentStock: number
    targetStock?: number | null
    reorderThreshold?: number | null
    notes?: string | null
    updatedAt?: string | null
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

  taskPhotos?: Array<{
    id: string
    category: string
    fileUrl: string
    fileName?: string | null
    caption?: string | null
    takenAt?: string | null
    uploadedAt: string
  }>

  events?: Array<{
    id: string
    title: string
    description?: string | null
    eventType: string
    status: string
    startAt?: string | null
    endAt?: string | null
    createdAt: string
  }>

  activityLogs?: Array<{
    id: string
    entityType: string
    entityId: string
    action: string
    message?: string | null
    actorType?: string | null
    actorName?: string | null
    createdAt: string
    metadata?: Record<string, unknown> | null
  }>
}

type PropertyTask = NonNullable<PropertyDetail["tasks"]>[number]
type TaskChecklistRun = NonNullable<PropertyTask["checklistRun"]>
type TaskChecklistAnswer = NonNullable<TaskChecklistRun["answers"]>[number]

type ModalKey =
  | null
  | "property"
  | "partner"
  | "template"
  | "bookings"
  | "issues"
  | "supplies"
  | "photos"
  | "events"

type MetricKey =
  | "bookings"
  | "pendingTasks"
  | "completedTasks"
  | "openIssues"
  | "criticalIssues"
  | "activeTemplates"
  | "lowStock"

type TaskFilterKey = "all" | "pending" | "completed" | "critical"

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
      manageChecklists: "Manage checklists",
      propertyTasks: "Property tasks",
      suppliesCenter: "Supplies center",
      propertyDetailsButton: "Property details",
      readiness: "Readiness",
      unknown: "Unknown",
      noData: "No data available.",
      notReady: "Not ready",
      actionNeeded: "Needs action",
      ready: "Ready",
      noPending: "There are no open pending items right now.",
      createdFromChecklist: "Created from checklist",
      overviewTitle: "Operational summary",
      overviewSubtitle: "Choose the action you want to inspect.",
      tasksSectionTopTitle: "Work queue",
      tasksSectionTopSubtitle:
        "The highest-priority tasks are shown first so you can move faster.",
      loading: "Loading property...",
      loadError: "Property loading error",
      noPropertyData: "No property data found.",
      open: "Open",
      close: "Close",
      noItems: "No items available.",
      noNotes: "There are no notes.",
      noDefaultPartner: "No default partner assigned.",
      noPrimaryTemplate: "No primary checklist template assigned.",
      openTaskHistory: "Open full task center",
      viewTask: "View task",
      viewBooking: "View booking",
      viewIssue: "View issue",
      viewPartner: "View partner",
      viewTemplate: "View template",
      openFile: "Open file",
      details: "Details",
      summary: "Summary",
      seeDetails: "See details",
      descriptionChooseAction: "Choose the action you want to inspect.",
      dynamicInfoNote: "All sections below are dynamic and update from live data.",
      modalClose: "Close",

      cardDescriptions: {
        bookings: "View current and recent bookings for this property.",
        pendingTasks: "See tasks that still need action.",
        completedTasks: "Review recently completed work.",
        openIssues: "Inspect issues and repairs still open.",
        criticalIssues: "Focus on the highest-severity issues.",
        activeTemplates: "See which checklist templates are active.",
        lowStock: "See supplies that are not yet at full level.",
      },

      sectionDescriptions: {
        property: "Basic property profile and operational details.",
        partner: "The default partner assigned to this property.",
        template: "The main checklist template currently used.",
        bookings: "Recent bookings linked to this property.",
        issues: "Issues, damages and repair items.",
        supplies: "Active supplies and their latest level.",
        photos: "Photo documentation uploaded for tasks.",
        events: "Timeline of events and activity history.",
      },

      metrics: {
        bookings: "Bookings",
        pendingTasks: "Pending tasks",
        completedTasks: "Completed tasks",
        openIssues: "Open issues",
        criticalIssues: "Critical issues",
        activeTemplates: "Active templates",
        lowStock: "Not full supplies",
      },

      sections: {
        property: "Property details",
        partner: "Default partner",
        template: "Primary checklist template",
        bookings: "Bookings",
        issues: "Issues / Repairs",
        supplies: "Supplies",
        photos: "Photo documentation",
        events: "Events & activity",
      },

      taskFilters: {
        all: "All tasks",
        pending: "Pending",
        completed: "Completed",
        critical: "Urgent first",
      },

      labels: {
        code: "Code",
        type: "Type",
        status: "Status",
        bedrooms: "Bedrooms",
        bathrooms: "Bathrooms",
        maxGuests: "Max guests",
        createdAt: "Created",
        updatedAt: "Updated",
        address: "Address",
        cityRegionPostal: "City / Region / Postal code",
        notes: "Notes",
        name: "Name",
        email: "Email",
        phone: "Phone",
        specialty: "Specialty",
        source: "Source",
        guest: "Guest",
        checkIn: "Check-in",
        checkOut: "Check-out",
        priority: "Priority",
        assignment: "Assignment",
        checklist: "Checklist",
        completion: "Completion",
        requirements: "Requirements",
        result: "Result",
        current: "Current",
        target: "Target",
        threshold: "Threshold",
        supplyStatus: "Supply level",
        category: "Category",
        issueType: "Issue type",
        severity: "Severity",
        lastUpdate: "Last update",
        scheduledDate: "Scheduled",
        itemCount: "Items",
        templateType: "Template type",
      },

      inline: {
        primaryChecklist: "Primary checklist",
        noSpecialRequirements: "No special requirements",
        noActivityLogs: "No activity history.",
        checklistIssues: "Checklist issues",
        missing: "Missing",
        medium: "Medium",
        full: "Full",
        openNeeds: "Open needs",
        translatedDynamicDataHint:
          "Dynamic item names are shown as stored in the system.",
      },
    }
  }

  return {
    locale: "el-GR",
    back: "Ακίνητα",
    manageChecklists: "Διαχείριση checklists",
    propertyTasks: "Εργασίες ακινήτου",
    suppliesCenter: "Κέντρο αναλωσίμων",
    propertyDetailsButton: "Στοιχεία ακινήτου",
    readiness: "Ετοιμότητα",
    unknown: "Άγνωστη",
    noData: "Δεν υπάρχουν διαθέσιμα δεδομένα.",
    notReady: "Μη έτοιμο",
    actionNeeded: "Θέλει ενέργειες",
    ready: "Έτοιμο",
    noPending: "Δεν υπάρχουν ανοιχτές εκκρεμότητες αυτή τη στιγμή.",
    createdFromChecklist: "Από checklist",
    overviewTitle: "Συνοπτική επιχειρησιακή εικόνα",
    overviewSubtitle: "Δες την ενέργεια που επιλέγεις.",
    tasksSectionTopTitle: "Ουρά εργασιών",
    tasksSectionTopSubtitle:
      "Εμφανίζονται πρώτα οι σημαντικότερες εργασίες για πιο γρήγορο έλεγχο.",
    loading: "Φόρτωση ακινήτου...",
    loadError: "Σφάλμα φόρτωσης ακινήτου",
    noPropertyData: "Δεν βρέθηκαν δεδομένα ακινήτου.",
    open: "Άνοιγμα",
    close: "Κλείσιμο",
    noItems: "Δεν υπάρχουν διαθέσιμα στοιχεία.",
    noNotes: "Δεν υπάρχουν σημειώσεις.",
    noDefaultPartner: "Δεν έχει οριστεί προεπιλεγμένος συνεργάτης.",
    noPrimaryTemplate: "Δεν έχει οριστεί κύριο πρότυπο checklist.",
    openTaskHistory: "Άνοιγμα πλήρους κέντρου εργασιών",
    viewTask: "Προβολή εργασίας",
    viewBooking: "Προβολή κράτησης",
    viewIssue: "Προβολή θέματος",
    viewPartner: "Προβολή συνεργάτη",
    viewTemplate: "Προβολή προτύπου",
    openFile: "Άνοιγμα αρχείου",
    details: "Λεπτομέρειες",
    summary: "Σύνοψη",
    seeDetails: "Δες λεπτομέρειες",
    descriptionChooseAction: "Δες την ενέργεια που επιλέγεις.",
    dynamicInfoNote:
      "Όλες οι ενότητες παρακάτω είναι δυναμικές και ενημερώνονται από τα ζωντανά δεδομένα.",
    modalClose: "Κλείσιμο",

    cardDescriptions: {
      bookings: "Δες τις τρέχουσες και πρόσφατες κρατήσεις του ακινήτου.",
      pendingTasks: "Δες ποιες εργασίες θέλουν ακόμη ενέργεια.",
      completedTasks: "Δες τι ολοκληρώθηκε πρόσφατα.",
      openIssues: "Δες ανοιχτά θέματα, ζημιές και βλάβες.",
      criticalIssues: "Εστίασε πρώτα στα πιο σοβαρά θέματα.",
      activeTemplates: "Δες ποια πρότυπα checklist είναι ενεργά.",
      lowStock: "Δες αναλώσιμα που δεν είναι ακόμη σε πλήρη κατάσταση.",
    },

    sectionDescriptions: {
      property: "Βασικό προφίλ ακινήτου και λειτουργικά στοιχεία.",
      partner: "Ο προεπιλεγμένος συνεργάτης του ακινήτου.",
      template: "Το κύριο πρότυπο checklist που χρησιμοποιείται τώρα.",
      bookings: "Οι πιο πρόσφατες κρατήσεις του ακινήτου.",
      issues: "Θέματα, ζημιές και βλάβες που έχουν καταγραφεί.",
      supplies: "Τα ενεργά αναλώσιμα και η τελευταία τους κατάσταση.",
      photos: "Η φωτογραφική τεκμηρίωση που έχει ανέβει από εργασίες.",
      events: "Χρονολογική εικόνα συμβάντων και ιστορικού ενεργειών.",
    },

    metrics: {
      bookings: "Κρατήσεις",
      pendingTasks: "Εκκρεμείς εργασίες",
      completedTasks: "Ολοκληρωμένες εργασίες",
      openIssues: "Ανοιχτά θέματα",
      criticalIssues: "Κρίσιμα θέματα",
      activeTemplates: "Ενεργά checklist",
      lowStock: "Μη πλήρη αναλώσιμα",
    },

    sections: {
      property: "Στοιχεία ακινήτου",
      partner: "Προεπιλεγμένος συνεργάτης",
      template: "Κύριο πρότυπο checklist",
      bookings: "Κρατήσεις",
      issues: "Θέματα / Βλάβες",
      supplies: "Αναλώσιμα",
      photos: "Φωτογραφική τεκμηρίωση",
      events: "Συμβάντα & ιστορικό",
    },

    taskFilters: {
      all: "Όλες οι εργασίες",
      pending: "Εκκρεμείς",
      completed: "Ολοκληρωμένες",
      critical: "Επείγουσες πρώτα",
    },

    labels: {
      code: "Κωδικός",
      type: "Τύπος",
      status: "Κατάσταση",
      bedrooms: "Υπνοδωμάτια",
      bathrooms: "Μπάνια",
      maxGuests: "Μέγιστοι επισκέπτες",
      createdAt: "Δημιουργία",
      updatedAt: "Τελευταία ενημέρωση",
      address: "Διεύθυνση",
      cityRegionPostal: "Πόλη / Περιοχή / ΤΚ",
      notes: "Σημειώσεις",
      name: "Όνομα",
      email: "Email",
      phone: "Τηλέφωνο",
      specialty: "Ειδικότητα",
      source: "Πηγή",
      guest: "Επισκέπτης",
      checkIn: "Check-in",
      checkOut: "Check-out",
      priority: "Προτεραιότητα",
      assignment: "Ανάθεση",
      checklist: "Checklist",
      completion: "Ολοκλήρωση",
      requirements: "Απαιτήσεις",
      result: "Αποτέλεσμα",
      current: "Τρέχον",
      target: "Στόχος",
      threshold: "Όριο",
      supplyStatus: "Κατάσταση αναλωσίμου",
      category: "Κατηγορία",
      issueType: "Τύπος θέματος",
      severity: "Σοβαρότητα",
      lastUpdate: "Τελευταία ενημέρωση",
      scheduledDate: "Προγραμματισμός",
      itemCount: "Στοιχεία",
      templateType: "Τύπος προτύπου",
    },

    inline: {
      primaryChecklist: "Κύριο checklist",
      noSpecialRequirements: "Καμία ειδική απαίτηση",
      noActivityLogs: "Δεν υπάρχει ιστορικό ενεργειών.",
      checklistIssues: "Θέματα checklist",
      missing: "Έλλειψη",
      medium: "Μέτρια",
      full: "Πλήρης",
      openNeeds: "Ανοιχτές ανάγκες",
      translatedDynamicDataHint:
        "Τα δυναμικά ονόματα στοιχείων εμφανίζονται όπως είναι αποθηκευμένα στο σύστημα.",
    },
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

function bookingStatusLabel(language: "el" | "en", status?: string | null) {
  const value = (status || "").toLowerCase()

  if (language === "en") {
    switch (value) {
      case "confirmed":
        return "Confirmed"
      case "pending":
        return "Pending"
      case "cancelled":
        return "Cancelled"
      case "completed":
        return "Completed"
      default:
        return status || "—"
    }
  }

  switch (value) {
    case "confirmed":
      return "Επιβεβαιωμένη"
    case "pending":
      return "Σε αναμονή"
    case "cancelled":
      return "Ακυρωμένη"
    case "completed":
      return "Ολοκληρωμένη"
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

function issueTypeLabel(language: "el" | "en", value?: string | null) {
  const normalized = String(value || "").toLowerCase()

  if (language === "en") {
    switch (normalized) {
      case "damage":
        return "Damage"
      case "repair":
        return "Repair"
      case "supplies":
        return "Supplies"
      case "inspection":
        return "Inspection"
      case "cleaning":
        return "Cleaning"
      case "general":
        return "General"
      default:
        return value || "—"
    }
  }

  switch (normalized) {
    case "damage":
      return "Ζημιά"
    case "repair":
      return "Βλάβη"
    case "supplies":
      return "Αναλώσιμα"
    case "inspection":
      return "Επιθεώρηση"
    case "cleaning":
      return "Καθαριότητα"
    case "general":
      return "Γενικό"
    default:
      return value || "—"
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
    case "confirmed":
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

function supplyStateLabel(
  language: "el" | "en",
  state: "missing" | "medium" | "full",
  texts: ReturnType<typeof getTexts>
) {
  if (state === "missing") return texts.inline.missing
  if (state === "medium") return texts.inline.medium
  return texts.inline.full
}

function supplyStateBadgeClass(state: "missing" | "medium" | "full") {
  if (state === "missing") {
    return "bg-red-50 text-red-700 ring-1 ring-red-200"
  }

  if (state === "medium") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  }

  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
}

function getReadinessState(
  property: PropertyDetail | null,
  language: "el" | "en",
  texts: ReturnType<typeof getTexts>
) {
  if (!property) {
    return {
      label: texts.unknown,
      tone: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
      details: texts.noData,
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

  const hasPrimaryChecklist = safeArray(property.checklistTemplates).some(
    (template) => template.isPrimary && template.isActive
  )

  const notFullSupplies = safeArray(property.propertySupplies).filter((supply) => {
    const current = Number(supply.currentStock || 0)
    const target = supply.targetStock ?? null
    const threshold = supply.reorderThreshold ?? supply.supplyItem?.minimumStock ?? null
    return getSupplyStateThree(current, target, threshold) !== "full"
  })

  if (criticalIssues.length > 0) {
    return {
      label: texts.notReady,
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
    !hasPrimaryChecklist ||
    notFullSupplies.length > 0
  ) {
    return {
      label: texts.actionNeeded,
      tone: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      details:
        language === "en"
          ? `Open tasks: ${openTasks.length} · Open issues: ${openIssues.length} · Supplies not full: ${notFullSupplies.length} · Primary checklist: ${
              hasPrimaryChecklist ? "Yes" : "No"
            }`
          : `Ανοιχτές εργασίες: ${openTasks.length} · Ανοιχτά θέματα: ${openIssues.length} · Αναλώσιμα μη πλήρη: ${notFullSupplies.length} · Κύρια checklist: ${
              hasPrimaryChecklist ? "Ναι" : "Όχι"
            }`,
    }
  }

  return {
    label: texts.ready,
    tone: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    details: texts.noPending,
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
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
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

function MetricCard({
  label,
  description,
  value,
  active,
  onClick,
  tone = "slate",
}: {
  label: string
  description: string
  value: number
  active: boolean
  onClick: () => void
  tone?: "slate" | "amber" | "emerald" | "red" | "orange"
}) {
  const tones = {
    slate: active
      ? "border-slate-900 bg-slate-50"
      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
    amber: active
      ? "border-amber-300 bg-amber-50"
      : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50",
    emerald: active
      ? "border-emerald-300 bg-emerald-50"
      : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50",
    red: active
      ? "border-red-300 bg-red-50"
      : "border-slate-200 bg-white hover:border-red-300 hover:bg-red-50",
    orange: active
      ? "border-orange-300 bg-orange-50"
      : "border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50",
  }

  const valueTones = {
    slate: "text-slate-900",
    amber: "text-amber-700",
    emerald: "text-emerald-700",
    red: "text-red-700",
    orange: "text-orange-700",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left shadow-sm transition sm:p-5 ${tones[tone]}`}
    >
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
      <div className={`mt-4 text-3xl font-bold ${valueTones[tone]}`}>{value}</div>
    </button>
  )
}

function SummaryCard({
  title,
  description,
  onOpen,
  actionLabel,
  count,
}: {
  title: string
  description: string
  onOpen: () => void
  actionLabel: string
  count?: number
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {typeof count === "number" ? (
              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {count}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="inline-flex shrink-0 items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  )
}

function MiniInfo({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-900">{value}</div>
    </div>
  )
}

export default function PropertyDetailPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { language } = useAppLanguage()
  const texts = getTexts(language)

  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>("pendingTasks")
  const [taskFilter, setTaskFilter] = useState<TaskFilterKey>("pending")
  const [activeModal, setActiveModal] = useState<ModalKey>(null)

  useEffect(() => {
    async function loadProperty() {
      if (!id) return

      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/properties/${id}`, {
          cache: "no-store",
        })

        const json = await res.json().catch(() => null)

        if (!res.ok) {
          throw new Error(json?.error || "Αποτυχία φόρτωσης ακινήτου.")
        }

        const normalized = json?.property ?? json?.data ?? json

        if (!normalized || typeof normalized !== "object") {
          throw new Error("Μη έγκυρη απόκριση από το API ακινήτου.")
        }

        setProperty(normalized as PropertyDetail)
      } catch (err) {
        console.error("Load property detail error:", err)
        setError(
          err instanceof Error
            ? err.message
            : "Αποτυχία φόρτωσης σελίδας ακινήτου."
        )
        setProperty(null)
      } finally {
        setLoading(false)
      }
    }

    loadProperty()
  }, [id])

  const bookings = safeArray(property?.bookings)
  const tasks = safeArray(property?.tasks)
  const issues = safeArray(property?.issues)
  const templates = safeArray(property?.checklistTemplates)
  const supplies = safeArray(property?.propertySupplies)
  const taskPhotos = safeArray(property?.taskPhotos)
  const events = safeArray(property?.events)
  const activityLogs = safeArray(property?.activityLogs)

  const metrics = useMemo(() => {
    const pendingTasks = tasks.filter((task) =>
      ["pending", "assigned", "accepted", "in_progress"].includes(
        (task.status || "").toLowerCase()
      )
    ).length

    const completedTasks = tasks.filter(
      (task) => (task.status || "").toLowerCase() === "completed"
    ).length

    const openIssues = issues.filter((issue) =>
      ["open", "in_progress"].includes((issue.status || "").toLowerCase())
    ).length

    const criticalIssues = issues.filter((issue) =>
      ["high", "critical"].includes((issue.severity || "").toLowerCase())
    ).length

    const activeTemplates = templates.filter((template) => template.isActive).length

    const primaryTemplate =
      templates.find((template) => template.isPrimary) || null

    const notFullSuppliesCount = supplies.filter((supply) => {
      const current = Number(supply.currentStock || 0)
      const target = supply.targetStock ?? null
      const threshold = supply.reorderThreshold ?? supply.supplyItem?.minimumStock ?? null
      return getSupplyStateThree(current, target, threshold) !== "full"
    }).length

    return {
      bookings: bookings.length,
      pendingTasks,
      completedTasks,
      openIssues,
      criticalIssues,
      activeTemplates,
      primaryTemplate,
      notFullSuppliesCount,
    }
  }, [bookings, tasks, issues, templates, supplies])

  const readiness = useMemo(
    () => getReadinessState(property, language, texts),
    [property, language, texts]
  )

  const checklistGeneratedIssues = useMemo(() => {
    return issues.filter((issue) => {
      const title = String(issue.title || "").toLowerCase()
      return (
        title.startsWith("ζημιά:") ||
        title.startsWith("βλάβη:") ||
        title.startsWith("αναλώσιμα:") ||
        title.startsWith("damage:") ||
        title.startsWith("repair:") ||
        title.startsWith("supplies:")
      )
    })
  }, [issues])

  const topTasks = useMemo(() => {
    const rows = [...tasks]

    const scoreTask = (task: PropertyTask) => {
      const status = String(task.status || "").toLowerCase()
      const priority = String(task.priority || "").toLowerCase()
      const checklistIssues = safeArray(task.checklistRun?.answers).filter(
        (answer: TaskChecklistAnswer) => Boolean(answer.issueCreated)
      ).length

      let score = 0

      if (status === "in_progress") score += 100
      if (status === "accepted") score += 90
      if (status === "assigned") score += 80
      if (status === "pending") score += 70
      if (status === "completed") score += 10

      if (priority === "critical" || priority === "urgent") score += 50
      if (priority === "high") score += 30
      if (priority === "medium" || priority === "normal") score += 10

      score += checklistIssues * 20

      return score
    }

    let filtered = rows

    if (taskFilter === "pending") {
      filtered = rows.filter((task) =>
        ["pending", "assigned", "accepted", "in_progress"].includes(
          String(task.status || "").toLowerCase()
        )
      )
    }

    if (taskFilter === "completed") {
      filtered = rows.filter(
        (task) => String(task.status || "").toLowerCase() === "completed"
      )
    }

    if (taskFilter === "critical") {
      filtered = rows.filter((task) => {
        const priority = String(task.priority || "").toLowerCase()
        const checklistIssues = safeArray(task.checklistRun?.answers).filter(
          (answer: TaskChecklistAnswer) => Boolean(answer.issueCreated)
        ).length

        return (
          ["critical", "urgent", "high"].includes(priority) ||
          checklistIssues > 0 ||
          ["in_progress", "accepted"].includes(String(task.status || "").toLowerCase())
        )
      })
    }

    return filtered.sort((a, b) => scoreTask(b) - scoreTask(a)).slice(0, 6)
  }, [tasks, taskFilter])

  const supplyRows = useMemo(() => {
    return supplies.map((supply) => {
      const current = Number(supply.currentStock || 0)
      const target = supply.targetStock ?? null
      const threshold = supply.reorderThreshold ?? supply.supplyItem?.minimumStock ?? null
      const state = getSupplyStateThree(current, target, threshold)

      return {
        ...supply,
        derivedState: state,
      }
    })
  }, [supplies])

  const visibleIssues = useMemo(() => {
    if (activeMetric === "criticalIssues") {
      return issues.filter((issue) =>
        ["high", "critical"].includes((issue.severity || "").toLowerCase())
      )
    }

    if (activeMetric === "openIssues") {
      return issues.filter((issue) =>
        ["open", "in_progress"].includes((issue.status || "").toLowerCase())
      )
    }

    return issues
  }, [issues, activeMetric])

  const visibleSupplies = useMemo(() => {
    if (activeMetric === "lowStock") {
      return supplyRows.filter((supply) => supply.derivedState !== "full")
    }

    return supplyRows
  }, [supplyRows, activeMetric])

  function openMetric(metric: MetricKey) {
    setActiveMetric(metric)

    if (metric === "bookings") setActiveModal("bookings")
    if (metric === "openIssues" || metric === "criticalIssues") setActiveModal("issues")
    if (metric === "activeTemplates") setActiveModal("template")
    if (metric === "lowStock") setActiveModal("supplies")
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
        <h1 className="text-lg font-semibold text-slate-900">{texts.loadError}</h1>
        <p className="mt-2 text-sm text-red-600">
          {error || texts.noPropertyData}
        </p>
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
                <Link
                  href="/properties"
                  className="font-medium text-slate-500 hover:text-slate-900"
                >
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

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {readiness.details}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal("property")}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {texts.propertyDetailsButton}
                </button>

                <Link
                  href={`/property-checklists/${property.id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {texts.manageChecklists}
                </Link>

                <Link
                  href={`/properties/${property.id}/supplies`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {texts.suppliesCenter}
                </Link>

                <Link
                  href={`/properties/${property.id}/tasks`}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {texts.propertyTasks}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {texts.overviewTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {texts.overviewSubtitle}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {texts.dynamicInfoNote}
              </p>
            </div>

            <div className="text-sm text-slate-500">
              {texts.descriptionChooseAction}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            <MetricCard
              label={texts.metrics.bookings}
              description={texts.cardDescriptions.bookings}
              value={metrics.bookings}
              active={activeMetric === "bookings"}
              onClick={() => openMetric("bookings")}
              tone="slate"
            />

            <MetricCard
              label={texts.metrics.pendingTasks}
              description={texts.cardDescriptions.pendingTasks}
              value={metrics.pendingTasks}
              active={activeMetric === "pendingTasks"}
              onClick={() => setActiveMetric("pendingTasks")}
              tone="amber"
            />

            <MetricCard
              label={texts.metrics.completedTasks}
              description={texts.cardDescriptions.completedTasks}
              value={metrics.completedTasks}
              active={activeMetric === "completedTasks"}
              onClick={() => setActiveMetric("completedTasks")}
              tone="emerald"
            />

            <MetricCard
              label={texts.metrics.openIssues}
              description={texts.cardDescriptions.openIssues}
              value={metrics.openIssues}
              active={activeMetric === "openIssues"}
              onClick={() => openMetric("openIssues")}
              tone="red"
            />

            <MetricCard
              label={texts.metrics.criticalIssues}
              description={texts.cardDescriptions.criticalIssues}
              value={metrics.criticalIssues}
              active={activeMetric === "criticalIssues"}
              onClick={() => openMetric("criticalIssues")}
              tone="red"
            />

            <MetricCard
              label={texts.metrics.activeTemplates}
              description={texts.cardDescriptions.activeTemplates}
              value={metrics.activeTemplates}
              active={activeMetric === "activeTemplates"}
              onClick={() => openMetric("activeTemplates")}
              tone="slate"
            />

            <MetricCard
              label={texts.metrics.lowStock}
              description={texts.cardDescriptions.lowStock}
              value={metrics.notFullSuppliesCount}
              active={activeMetric === "lowStock"}
              onClick={() => openMetric("lowStock")}
              tone="orange"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {texts.tasksSectionTopTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {texts.tasksSectionTopSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "pending", label: texts.taskFilters.pending },
                  { key: "critical", label: texts.taskFilters.critical },
                  { key: "completed", label: texts.taskFilters.completed },
                  { key: "all", label: texts.taskFilters.all },
                ] as Array<{ key: TaskFilterKey; label: string }>
              ).map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setTaskFilter(filter.key)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    taskFilter === filter.key
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            {topTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                {texts.noItems}
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {topTasks.map((task) => {
                  const latestAssignment = safeArray(task.assignments)[0] || null
                  const checklistIssuesCount = safeArray(task.checklistRun?.answers).filter(
                    (answer: TaskChecklistAnswer) => Boolean(answer.issueCreated)
                  ).length

                  return (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold text-slate-900">
                              {task.title}
                            </div>

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                                task.status
                              )}`}
                            >
                              {taskStatusLabel(language, task.status)}
                            </span>

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadgeClasses(
                                task.priority
                              )}`}
                            >
                              {task.priority || "—"}
                            </span>

                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                              {task.taskType}
                            </span>
                          </div>

                          {task.description ? (
                            <div className="mt-2 text-sm text-slate-700">
                              {task.description}
                            </div>
                          ) : null}
                        </div>

                        <Link
                          href={`/tasks/${task.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {texts.viewTask}
                        </Link>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <MiniInfo
                          label={texts.labels.scheduledDate}
                          value={formatDate(task.scheduledDate, texts.locale)}
                        />
                        <MiniInfo
                          label={texts.labels.assignment}
                          value={latestAssignment?.partner?.name || "—"}
                        />
                        <MiniInfo
                          label={texts.labels.checklist}
                          value={task.checklistRun?.template?.title || "—"}
                        />
                        <MiniInfo
                          label={texts.inline.checklistIssues}
                          value={String(checklistIssuesCount)}
                        />
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                        {task.requiresChecklist ? "Checklist " : ""}
                        {task.requiresPhotos ? "Photos " : ""}
                        {task.requiresApproval ? "Approval " : ""}
                        {!task.requiresChecklist &&
                        !task.requiresPhotos &&
                        !task.requiresApproval
                          ? texts.inline.noSpecialRequirements
                          : ""}
                      </div>

                      {task.resultNotes ? (
                        <div className="mt-3 text-sm text-slate-600">
                          {texts.labels.result}: {task.resultNotes}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-5">
            <Link
              href={`/properties/${property.id}/tasks`}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {texts.openTaskHistory}
            </Link>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title={texts.sections.property}
            description={texts.sectionDescriptions.property}
            onOpen={() => setActiveModal("property")}
            actionLabel={texts.seeDetails}
          />

          <SummaryCard
            title={texts.sections.partner}
            description={texts.sectionDescriptions.partner}
            onOpen={() => setActiveModal("partner")}
            actionLabel={texts.seeDetails}
          />

          <SummaryCard
            title={texts.sections.template}
            description={texts.sectionDescriptions.template}
            onOpen={() => setActiveModal("template")}
            actionLabel={texts.seeDetails}
            count={metrics.primaryTemplate ? 1 : 0}
          />

          <SummaryCard
            title={texts.sections.bookings}
            description={texts.sectionDescriptions.bookings}
            onOpen={() => setActiveModal("bookings")}
            actionLabel={texts.seeDetails}
            count={bookings.length}
          />

          <SummaryCard
            title={texts.sections.issues}
            description={texts.sectionDescriptions.issues}
            onOpen={() => setActiveModal("issues")}
            actionLabel={texts.seeDetails}
            count={issues.length}
          />

          <SummaryCard
            title={texts.sections.supplies}
            description={texts.sectionDescriptions.supplies}
            onOpen={() => setActiveModal("supplies")}
            actionLabel={texts.seeDetails}
            count={supplies.length}
          />

          <SummaryCard
            title={texts.sections.photos}
            description={texts.sectionDescriptions.photos}
            onOpen={() => setActiveModal("photos")}
            actionLabel={texts.seeDetails}
            count={taskPhotos.length}
          />

          <SummaryCard
            title={texts.sections.events}
            description={texts.sectionDescriptions.events}
            onOpen={() => setActiveModal("events")}
            actionLabel={texts.seeDetails}
            count={events.length + activityLogs.length}
          />
        </div>
      </div>

      <Modal
        open={activeModal === "property"}
        title={texts.sections.property}
        description={texts.sectionDescriptions.property}
        onClose={() => setActiveModal(null)}
        closeLabel={texts.modalClose}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MiniInfo label={texts.labels.code} value={property.code} />
          <MiniInfo label={texts.labels.type} value={typeLabel(language, property.type)} />
          <MiniInfo
            label={texts.labels.status}
            value={propertyStatusLabel(language, property.status)}
          />
          <MiniInfo label={texts.labels.bedrooms} value={String(property.bedrooms)} />
          <MiniInfo label={texts.labels.bathrooms} value={String(property.bathrooms)} />
          <MiniInfo label={texts.labels.maxGuests} value={String(property.maxGuests)} />
          <MiniInfo
            label={texts.labels.createdAt}
            value={formatDateTime(property.createdAt, texts.locale)}
          />
          <MiniInfo
            label={texts.labels.updatedAt}
            value={formatDateTime(property.updatedAt, texts.locale)}
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <MiniInfo label={texts.labels.address} value={property.address} />
          <MiniInfo
            label={texts.labels.cityRegionPostal}
            value={`${property.city} / ${property.region} / ${property.postalCode}`}
          />
        </div>

        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {texts.labels.notes}
          </div>
          <div className="mt-1 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            {property.notes?.trim() ? property.notes : texts.noNotes}
          </div>
        </div>
      </Modal>

      <Modal
        open={activeModal === "partner"}
        title={texts.sections.partner}
        description={texts.sectionDescriptions.partner}
        onClose={() => setActiveModal(null)}
        closeLabel={texts.modalClose}
      >
        {property.defaultPartner ? (
          <div className="grid gap-4 md:grid-cols-2">
            <MiniInfo label={texts.labels.name} value={property.defaultPartner.name} />
            <MiniInfo label={texts.labels.code} value={property.defaultPartner.code} />
            <MiniInfo label={texts.labels.email} value={property.defaultPartner.email} />
            <MiniInfo
              label={texts.labels.phone}
              value={property.defaultPartner.phone || "—"}
            />
            <MiniInfo
              label={texts.labels.specialty}
              value={property.defaultPartner.specialty}
            />
            <MiniInfo
              label={texts.labels.status}
              value={propertyStatusLabel(language, property.defaultPartner.status)}
            />
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            {texts.noDefaultPartner}
          </div>
        )}
      </Modal>

      <Modal
        open={activeModal === "template"}
        title={texts.sections.template}
        description={texts.sectionDescriptions.template}
        onClose={() => setActiveModal(null)}
        closeLabel={texts.modalClose}
      >
        {metrics.primaryTemplate ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <MiniInfo
                label={texts.labels.name}
                value={metrics.primaryTemplate.title}
              />
              <MiniInfo
                label={texts.labels.templateType}
                value={metrics.primaryTemplate.templateType}
              />
              <MiniInfo
                label={texts.labels.itemCount}
                value={String(safeArray(metrics.primaryTemplate.items).length)}
              />
            </div>

            {metrics.primaryTemplate.description ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                {metrics.primaryTemplate.description}
              </div>
            ) : null}

            <div className="space-y-3">
              {safeArray(metrics.primaryTemplate.items).map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="font-medium text-slate-900">{item.label}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {(item.category || "inspection") + " · " + item.itemType}
                  </div>
                  {item.description ? (
                    <div className="mt-2 text-sm text-slate-700">{item.description}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            {texts.noPrimaryTemplate}
          </div>
        )}
      </Modal>

      <Modal
        open={activeModal === "bookings"}
        title={texts.sections.bookings}
        description={texts.sectionDescriptions.bookings}
        onClose={() => setActiveModal(null)}
        closeLabel={texts.modalClose}
      >
        {bookings.length === 0 ? (
          <div className="text-sm text-slate-500">{texts.noItems}</div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-slate-900">
                        {booking.guestName || "—"}
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                          booking.status
                        )}`}
                      >
                        {bookingStatusLabel(language, booking.status)}
                      </span>
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      {texts.labels.source}: {booking.sourcePlatform}
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <MiniInfo
                        label={texts.labels.checkIn}
                        value={formatDate(booking.checkInDate, texts.locale)}
                      />
                      <MiniInfo
                        label={texts.labels.checkOut}
                        value={formatDate(booking.checkOutDate, texts.locale)}
                      />
                      <MiniInfo
                        label={texts.labels.guest}
                        value={booking.guestName || "—"}
                      />
                      <MiniInfo
                        label={texts.labels.status}
                        value={bookingStatusLabel(language, booking.status)}
                      />
                    </div>
                  </div>

                  <Link
                    href={`/bookings/${booking.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {texts.viewBooking}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={activeModal === "issues"}
        title={texts.sections.issues}
        description={texts.sectionDescriptions.issues}
        onClose={() => setActiveModal(null)}
        closeLabel={texts.modalClose}
      >
        {visibleIssues.length === 0 ? (
          <div className="text-sm text-slate-500">{texts.noItems}</div>
        ) : (
          <div className="space-y-4">
            {visibleIssues.map((issue) => {
              const looksChecklistGenerated = checklistGeneratedIssues.some(
                (row) => row.id === issue.id
              )

              return (
                <div
                  key={issue.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
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

                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {issueTypeLabel(language, issue.issueType)}
                        </span>

                        {looksChecklistGenerated ? (
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                            {texts.createdFromChecklist}
                          </span>
                        ) : null}
                      </div>

                      {issue.description ? (
                        <div className="mt-2 whitespace-pre-line text-sm text-slate-700">
                          {issue.description}
                        </div>
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
              )
            })}
          </div>
        )}
      </Modal>

      <Modal
        open={activeModal === "supplies"}
        title={texts.sections.supplies}
        description={texts.sectionDescriptions.supplies}
        onClose={() => setActiveModal(null)}
        closeLabel={texts.modalClose}
      >
        <div className="mb-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
          {texts.inline.translatedDynamicDataHint}
        </div>

        {visibleSupplies.length === 0 ? (
          <div className="text-sm text-slate-500">{texts.noItems}</div>
        ) : (
          <div className="space-y-4">
            {visibleSupplies.map((supply) => {
              const current = Number(supply.currentStock || 0)
              const target = supply.targetStock ?? null
              const threshold =
                supply.reorderThreshold ?? supply.supplyItem?.minimumStock ?? null
              const state = supply.derivedState

              return (
                <div
                  key={supply.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">
                        {supply.supplyItem?.name || "—"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {(supply.supplyItem?.category || "—") +
                          " · " +
                          (supply.supplyItem?.unit || "—")}
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${supplyStateBadgeClass(
                        state
                      )}`}
                    >
                      {supplyStateLabel(language, state, texts)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MiniInfo label={texts.labels.current} value={String(current)} />
                    <MiniInfo label={texts.labels.target} value={String(target ?? "—")} />
                    <MiniInfo
                      label={texts.labels.threshold}
                      value={String(threshold ?? "—")}
                    />
                    <MiniInfo
                      label={texts.labels.lastUpdate}
                      value={formatDateTime(supply.updatedAt, texts.locale)}
                    />
                  </div>

                  {supply.notes ? (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                      {supply.notes}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      <Modal
        open={activeModal === "photos"}
        title={texts.sections.photos}
        description={texts.sectionDescriptions.photos}
        onClose={() => setActiveModal(null)}
        closeLabel={texts.modalClose}
      >
        {taskPhotos.length === 0 ? (
          <div className="text-sm text-slate-500">{texts.noItems}</div>
        ) : (
          <div className="space-y-4">
            {taskPhotos.map((photo) => (
              <div
                key={photo.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900">
                      {photo.fileName || "Photo file"}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {texts.labels.category}: {photo.category}
                    </div>
                    {photo.caption ? (
                      <div className="mt-2 text-sm text-slate-700">{photo.caption}</div>
                    ) : null}
                  </div>

                  <a
                    href={photo.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {texts.openFile}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={activeModal === "events"}
        title={texts.sections.events}
        description={texts.sectionDescriptions.events}
        onClose={() => setActiveModal(null)}
        closeLabel={texts.modalClose}
      >
        {events.length === 0 && activityLogs.length === 0 ? (
          <div className="text-sm text-slate-500">{texts.inline.noActivityLogs}</div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={`event-${event.id}`}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="font-medium text-slate-900">{event.title}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {event.eventType} · {event.status}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatDateTime(event.startAt, texts.locale)}
                  {event.endAt ? ` — ${formatDateTime(event.endAt, texts.locale)}` : ""}
                </div>
                {event.description ? (
                  <div className="mt-2 text-sm text-slate-700">{event.description}</div>
                ) : null}
              </div>
            ))}

            {activityLogs.map((log) => (
              <div
                key={`log-${log.id}`}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="font-medium text-slate-900">{log.action}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {log.entityType} · {log.actorName || log.actorType || "Σύστημα"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatDateTime(log.createdAt, texts.locale)}
                </div>
                {log.message ? (
                  <div className="mt-2 text-sm text-slate-700">{log.message}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  )
}