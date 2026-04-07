"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import {
  getChecklistStatusLabel,
  getIssuePriorityLabel,
  getIssueStatusLabel,
  getPriorityLabel,
  getPropertyStatusLabel,
  getPropertyTypeLabel,
  getSupplyLevelLabel,
  getTaskStatusLabel,
} from "@/lib/i18n/labels"
import {
  normalizeChecklistStatus,
  normalizeIssuePriority,
  normalizeIssueStatus,
  normalizePriority,
  normalizePropertyStatus,
  normalizeSupplyLevel,
  normalizeTaskStatus,
} from "@/lib/i18n/normalizers"
import { getPropertyDetailTexts } from "@/lib/i18n/translations"
import { getSupplyDisplayName } from "@/lib/supply-presets"
import { buildCanonicalSupplySnapshot } from "@/lib/supplies/compute-supply-state"

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

type SuppliesRunLite = {
  id: string
  status: string
  startedAt?: string | null
  completedAt?: string | null
  answers?: Array<{
    id: string
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
    alertEnabled?: boolean
    alertAt?: string | null
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
    suppliesChecklistRun?: SuppliesRunLite | null
    checklistRun?: ChecklistRunLite | null
    supplyRun?: SuppliesRunLite | null
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
    fillLevel?: string | null
    stateMode?: string | null
    currentStock: number
    mediumThreshold?: number | null
    fullThreshold?: number | null
    targetStock?: number | null
    reorderThreshold?: number | null
    minimumThreshold?: number | null
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

type ModalKey =
  | null
  | "property"
  | "partner"
  | "cleaningChecklist"
  | "supplies"
  | "issues"

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

type OpenTaskFilter =
  | "all_open"
  | "pending"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "alerts"

type SupplyFilter = "all" | "missing" | "medium" | "full"

type StateTone = "neutral" | "success" | "warning" | "danger"

type PropertyStateBlock = {
  tone: StateTone
  title: string
  description: string
  helper?: string
  nextStep?: string
}

const PROPERTY_TYPE_OPTIONS = [
  "apartment",
  "villa",
  "studio",
  "house",
  "maisonette",
  "loft",
  "other",
] as const

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

function badgeClasses(status?: string | null) {
  const propertyStatus = normalizePropertyStatus(status)
  const taskStatus = normalizeTaskStatus(status)
  const issueStatus = normalizeIssueStatus(status)
  const issuePriority = normalizeIssuePriority(status)
  const supplyLevel = normalizeSupplyLevel(status)

  if (
    propertyStatus === "ACTIVE" ||
    taskStatus === "COMPLETED" ||
    issueStatus === "RESOLVED" ||
    supplyLevel === "FULL"
  ) {
    return "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
  }

  if (
    taskStatus === "PENDING" ||
    taskStatus === "ASSIGNED" ||
    taskStatus === "WAITING_ACCEPTANCE" ||
    taskStatus === "ACCEPTED" ||
    taskStatus === "IN_PROGRESS" ||
    supplyLevel === "MEDIUM"
  ) {
    return "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
  }

  if (
    propertyStatus === "INACTIVE" ||
    taskStatus === "CANCELLED" ||
    issueStatus === "CLOSED"
  ) {
    return "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
  }

  if (
    issueStatus === "OPEN" ||
    issuePriority === "URGENT" ||
    issuePriority === "HIGH" ||
    supplyLevel === "MISSING"
  ) {
    return "rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
  }

  return "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
}

function priorityBadgeClasses(priority?: string | null) {
  const normalized = normalizePriority(priority)

  if (normalized === "URGENT") {
    return "rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
  }

  if (normalized === "HIGH") {
    return "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
  }

  if (normalized === "NORMAL") {
    return "rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700"
  }

  if (normalized === "LOW") {
    return "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
  }

  return "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
}

function getDerivedSupplyState(
  supply: NonNullable<PropertyDetail["propertySupplies"]>[number]
): "missing" | "medium" | "full" {
  return buildCanonicalSupplySnapshot({
    isActive: true,
    stateMode: supply.stateMode,
    fillLevel: supply.fillLevel,
    currentStock: supply.currentStock,
    mediumThreshold: supply.mediumThreshold,
    fullThreshold: supply.fullThreshold,
    minimumThreshold: supply.minimumThreshold,
    reorderThreshold: supply.reorderThreshold,
    targetStock: supply.targetStock,
    supplyMinimumStock: supply.supplyItem?.minimumStock,
  }).derivedState
}

function supplyStateBadgeClass(state: "missing" | "medium" | "full") {
  const normalized = normalizeSupplyLevel(state)

  if (normalized === "MISSING") {
    return "rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
  }

  if (normalized === "MEDIUM") {
    return "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
  }

  return "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
}

function getLatestAssignment(
  task: NonNullable<PropertyDetail["tasks"]>[number]
) {
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
    type: property.type || "apartment",
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
    timeValue && /^\d{2}:\d{2}/.test(timeValue)
      ? String(timeValue).slice(0, 5)
      : "12:00"

  const composed = new Date(`${datePart}T${timePart}:00`)
  if (Number.isNaN(composed.getTime())) return null
  return composed
}

function isTaskAlertActive(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  const status = normalizeTaskStatus(task.status)

  if (
    !["PENDING", "ASSIGNED", "WAITING_ACCEPTANCE", "ACCEPTED", "IN_PROGRESS"].includes(
      status
    )
  ) {
    return false
  }

  if (!task.alertEnabled) return false
  if (!task.alertAt) return false

  const alertDate = normalizeDate(task.alertAt)
  if (!alertDate) return false

  return alertDate.getTime() <= Date.now()
}

function isTaskBorderline(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  if (isTaskAlertActive(task)) return true

  const status = normalizeTaskStatus(task.status)
  if (
    !["PENDING", "ASSIGNED", "WAITING_ACCEPTANCE", "ACCEPTED", "IN_PROGRESS"].includes(
      status
    )
  ) {
    return false
  }

  const now = new Date()
  const scheduled = parseDateAndTime(
    task.scheduledDate,
    task.scheduledStartTime || null
  )
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
  if (task.checklistRun) return task.checklistRun
  return null
}

function getSuppliesRun(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  if (task.suppliesChecklistRun) return task.suppliesChecklistRun
  if (task.supplyRun) return task.supplyRun
  return null
}

function isRunSubmitted(run?: ChecklistRunLite | SuppliesRunLite | null) {
  if (!run) return false

  const normalized = normalizeChecklistStatus(run.status, {
    enabled: true,
    submitted: Boolean(run.completedAt),
    completed: Boolean(run.completedAt),
  })

  return normalized === "SUBMITTED" || normalized === "COMPLETED"
}

function getChecklistSectionStateLabel(
  language: "el" | "en",
  enabled: boolean,
  submitted: boolean
) {
  return getChecklistStatusLabel(language, submitted ? "submitted" : "pending", {
    enabled,
    submitted,
    completed: submitted,
  })
}

function getReadinessState(
  property: PropertyDetail | null,
  language: "el" | "en",
  texts: ReturnType<typeof getPropertyDetailTexts>
) {
  if (!property) {
    return {
      label: texts.unknown,
      tone: "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700",
      details: texts.noPropertyData,
    }
  }

  const issues = safeArray(property.issues)
  const openIssues = issues.filter((issue) => {
    const normalized = normalizeIssueStatus(issue.status)
    return normalized === "OPEN" || normalized === "IN_PROGRESS"
  })

  const criticalIssues = openIssues.filter((issue) => {
    const normalized = normalizeIssuePriority(issue.severity)
    return normalized === "HIGH" || normalized === "URGENT"
  })

  const openTasks = safeArray(property.tasks).filter((task) => {
    const normalized = normalizeTaskStatus(task.status)
    return ["PENDING", "ASSIGNED", "WAITING_ACCEPTANCE", "ACCEPTED", "IN_PROGRESS"].includes(
      normalized
    )
  })

  const activeAlerts = openTasks.filter((task) => isTaskAlertActive(task))
  const hasPrimaryCleaningChecklist = Boolean(getPrimaryCleaningChecklist(property))

  const notFullSupplies = safeArray(property.propertySupplies).filter((supply) => {
    return getDerivedSupplyState(supply) !== "full"
  })

  if (criticalIssues.length > 0) {
    return {
      label: texts.notReady,
      tone: "rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700",
      details:
        language === "en"
          ? `There are ${criticalIssues.length} critical open issues.`
          : `Υπάρχουν ${criticalIssues.length} κρίσιμα ανοιχτά θέματα.`,
    }
  }

  if (
    activeAlerts.length > 0 ||
    openIssues.length > 0 ||
    openTasks.length > 0 ||
    !hasPrimaryCleaningChecklist ||
    notFullSupplies.length > 0
  ) {
    return {
      label: texts.actionNeeded,
      tone: "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700",
      details:
        language === "en"
          ? `Alerts: ${activeAlerts.length} · Open tasks: ${openTasks.length} · Open issues: ${openIssues.length} · Supplies not full: ${notFullSupplies.length}`
          : `Alert: ${activeAlerts.length} · Ανοιχτές εργασίες: ${openTasks.length} · Ανοιχτά θέματα: ${openIssues.length} · Αναλώσιμα μη πλήρη: ${notFullSupplies.length}`,
    }
  }

  return {
    label: texts.ready,
    tone: "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700",
    details:
      language === "en"
        ? "No open blockers were detected."
        : "Δεν εντοπίστηκαν ανοιχτά blockers.",
  }
}

function getStatePanelClassName(tone: StateTone) {
  if (tone === "success") {
    return "rounded-3xl border border-emerald-200 bg-emerald-50 p-4"
  }

  if (tone === "warning") {
    return "rounded-3xl border border-amber-200 bg-amber-50 p-4"
  }

  if (tone === "danger") {
    return "rounded-3xl border border-red-200 bg-red-50 p-4"
  }

  return "rounded-3xl border border-slate-200 bg-slate-50 p-4"
}

function getStateTitleClassName(tone: StateTone) {
  if (tone === "success") return "text-sm font-semibold text-emerald-900"
  if (tone === "warning") return "text-sm font-semibold text-amber-900"
  if (tone === "danger") return "text-sm font-semibold text-red-900"
  return "text-sm font-semibold text-slate-900"
}

function getStateTextClassName(tone: StateTone) {
  if (tone === "success") return "mt-1 text-sm text-emerald-800"
  if (tone === "warning") return "mt-1 text-sm text-amber-800"
  if (tone === "danger") return "mt-1 text-sm text-red-800"
  return "mt-1 text-sm text-slate-700"
}

function buildPropertyStateBlock(
  property: PropertyDetail,
  language: "el" | "en"
): PropertyStateBlock {
  const tasks = safeArray(property.tasks)
  const issues = safeArray(property.issues)
  const supplies = safeArray(property.propertySupplies)
  const primaryCleaningChecklist = getPrimaryCleaningChecklist(property)

  const openTasks = tasks.filter((task) => {
    const normalized = normalizeTaskStatus(task.status)
    return ["PENDING", "ASSIGNED", "WAITING_ACCEPTANCE", "ACCEPTED", "IN_PROGRESS"].includes(
      normalized
    )
  })

  const activeAlerts = openTasks.filter((task) => isTaskAlertActive(task))
  const borderlineTasks = openTasks.filter(
    (task) => !isTaskAlertActive(task) && isTaskBorderline(task)
  )

  const openIssues = issues.filter((issue) => {
    const normalized = normalizeIssueStatus(issue.status)
    return normalized === "OPEN" || normalized === "IN_PROGRESS"
  })

  const criticalIssues = openIssues.filter((issue) => {
    const normalized = normalizeIssuePriority(issue.severity)
    return normalized === "HIGH" || normalized === "URGENT"
  })

  const missingSupplies = supplies.filter((supply) => {
    return getDerivedSupplyState(supply) === "missing"
  })

  const mediumSupplies = supplies.filter((supply) => {
    return getDerivedSupplyState(supply) === "medium"
  })

  if (normalizePropertyStatus(property.status) === "INACTIVE") {
    return {
      tone: "danger",
      title:
        language === "en"
          ? "This property is inactive"
          : "Το ακίνητο είναι ανενεργό",
      description:
        language === "en"
          ? "The property is not in operational active state."
          : "Το ακίνητο δεν βρίσκεται σε ενεργή λειτουργική κατάσταση.",
      nextStep:
        language === "en"
          ? "Review property settings"
          : "Έλεγχος στοιχείων ακινήτου",
    }
  }

  if (criticalIssues.length > 0) {
    return {
      tone: "danger",
      title:
        language === "en"
          ? "Critical issues require immediate attention"
          : "Υπάρχουν κρίσιμα θέματα που χρειάζονται άμεση ενέργεια",
      description:
        language === "en"
          ? "The property has high or urgent open issues."
          : "Το ακίνητο έχει ανοιχτά θέματα υψηλής ή επείγουσας σοβαρότητας.",
      helper:
        language === "en"
          ? `Critical open issues: ${criticalIssues.length}.`
          : `Κρίσιμα ανοιχτά θέματα: ${criticalIssues.length}.`,
      nextStep:
        language === "en"
          ? "Open issues"
          : "Άνοιγμα θεμάτων",
    }
  }

  if (activeAlerts.length > 0) {
    return {
      tone: "danger",
      title:
        language === "en"
          ? "There are active alerts in open tasks"
          : "Υπάρχουν ενεργά alert σε ανοιχτές εργασίες",
      description:
        language === "en"
          ? "At least one open task has already reached its alert time."
          : "Τουλάχιστον μία ανοιχτή εργασία έχει ήδη φτάσει στο alert time.",
      helper:
        language === "en"
          ? `Active task alerts: ${activeAlerts.length}.`
          : `Ενεργά alert εργασιών: ${activeAlerts.length}.`,
      nextStep:
        language === "en"
          ? "Open task"
          : "Άνοιγμα εργασίας",
    }
  }

  if (!primaryCleaningChecklist) {
    return {
      tone: "warning",
      title:
        language === "en"
          ? "Primary cleaning checklist is missing"
          : "Λείπει η βασική λίστα καθαριότητας",
      description:
        language === "en"
          ? "The property does not have a main cleaning checklist in the core flow."
          : "Το ακίνητο δεν έχει κύρια λίστα καθαριότητας στη βασική ροή.",
      helper:
        language === "en"
          ? "Without it, cleaning execution is incomplete."
          : "Χωρίς αυτήν, η ροή καθαριότητας μένει ελλιπής.",
      nextStep:
        language === "en"
          ? "Set primary checklist"
          : "Ορισμός βασικής λίστας",
    }
  }

  if (missingSupplies.length > 0) {
    return {
      tone: "warning",
      title:
        language === "en"
          ? "Supplies need replenishment"
          : "Τα αναλώσιμα χρειάζονται αναπλήρωση",
      description:
        language === "en"
          ? "Some supplies are in missing state."
          : "Κάποια αναλώσιμα βρίσκονται σε κατάσταση έλλειψης.",
      helper:
        language === "en"
          ? `Missing supplies: ${missingSupplies.length}. Medium supplies: ${mediumSupplies.length}.`
          : `Αναλώσιμα σε έλλειψη: ${missingSupplies.length}. Αναλώσιμα σε μέτρια στάθμη: ${mediumSupplies.length}.`,
      nextStep:
        language === "en"
          ? "Review supplies"
          : "Έλεγχος αναλωσίμων",
    }
  }

  if (openTasks.length > 0) {
    return {
      tone: "success",
      title:
        language === "en"
          ? "The property already has open operational work"
          : "Το ακίνητο έχει ήδη ανοιχτή λειτουργική ροή",
      description:
        language === "en"
          ? "There are open tasks already connected to this property."
          : "Υπάρχουν ήδη ανοιχτές εργασίες συνδεδεμένες με αυτό το ακίνητο.",
      helper:
        language === "en"
          ? `Open tasks: ${openTasks.length}. Borderline tasks: ${borderlineTasks.length}. Open issues: ${openIssues.length}.`
          : `Ανοιχτές εργασίες: ${openTasks.length}. Οριακές εργασίες: ${borderlineTasks.length}. Ανοιχτά θέματα: ${openIssues.length}.`,
      nextStep:
        language === "en"
          ? "Continue execution"
          : "Συνέχεια εκτέλεσης",
    }
  }

  return {
    tone: "neutral",
    title:
      language === "en"
        ? "The property is currently operationally clear"
        : "Το ακίνητο είναι αυτή τη στιγμή λειτουργικά καθαρό",
    description:
      language === "en"
        ? "No open tasks or blockers were detected at this moment."
        : "Δεν εντοπίστηκαν αυτή τη στιγμή ανοιχτές εργασίες ή blockers.",
    helper:
      language === "en"
        ? "Use the property control sections to review readiness, supplies, partner and checklist setup."
        : "Χρησιμοποίησε τις ενότητες ελέγχου για readiness, αναλώσιμα, συνεργάτη και βασική λίστα.",
    nextStep:
      language === "en"
        ? "Review property setup"
        : "Έλεγχος ρυθμίσεων ακινήτου",
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

        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  )
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
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
      ? "border-slate-950 bg-slate-950 text-white"
      : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
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
      className={`rounded-3xl border p-5 text-left shadow-sm transition ${tones[tone]}`}
    >
      <div className="text-sm font-medium opacity-80">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
    </button>
  )
}

export default function PropertyTasksPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { language } = useAppLanguage()
  const texts = getPropertyDetailTexts(language)

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

  const [openTaskFilter, setOpenTaskFilter] =
    useState<OpenTaskFilter>("all_open")
  const [supplyFilter, setSupplyFilter] = useState<SupplyFilter>("all")

  async function loadPage() {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const [propertyRes, partnersRes] = await Promise.all([
        fetch(`/api/properties/${id}/tasks`, { cache: "no-store" }),
        fetch("/api/partners", { cache: "no-store" }),
      ])

      const propertyJson = await propertyRes.json().catch(() => null)
      const partnersJson = await partnersRes.json().catch(() => [])

      if (!propertyRes.ok) {
        throw new Error(propertyJson?.error || texts.loadError)
      }

      const normalizedProperty =
        propertyJson?.property ?? propertyJson?.data ?? propertyJson

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
      setSelectedPartnerId(
        String((normalizedProperty as PropertyDetail)?.defaultPartnerId || "")
      )
    } catch (err) {
      console.error("Load property tasks error:", err)
      setError(err instanceof Error ? err.message : texts.loadError)
      setProperty(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const tasks = useMemo(() => safeArray(property?.tasks), [property])

  const openTasksBase = useMemo(() => {
    return tasks.filter((task) => {
      const normalized = normalizeTaskStatus(task.status)
      return ["PENDING", "ASSIGNED", "WAITING_ACCEPTANCE", "ACCEPTED", "IN_PROGRESS"].includes(
        normalized
      )
    })
  }, [tasks])

  const completedCount = useMemo(() => {
    return tasks.filter((task) => normalizeTaskStatus(task.status) === "COMPLETED")
      .length
  }, [tasks])

  const alertCount = useMemo(() => {
    return openTasksBase.filter((task) => isTaskAlertActive(task)).length
  }, [openTasksBase])

  const openTaskCounts = useMemo(() => {
    return {
      all_open: openTasksBase.length,
      pending: openTasksBase.filter((task) => {
        const normalized = normalizeTaskStatus(task.status)
        return normalized === "PENDING" || normalized === "NEW"
      }).length,
      assigned: openTasksBase.filter((task) => {
        const normalized = normalizeTaskStatus(task.status)
        return normalized === "ASSIGNED" || normalized === "WAITING_ACCEPTANCE"
      }).length,
      accepted: openTasksBase.filter(
        (task) => normalizeTaskStatus(task.status) === "ACCEPTED"
      ).length,
      in_progress: openTasksBase.filter(
        (task) => normalizeTaskStatus(task.status) === "IN_PROGRESS"
      ).length,
      alerts: openTasksBase.filter((task) => isTaskAlertActive(task)).length,
    }
  }, [openTasksBase])

  const visibleOpenTasks = useMemo(() => {
    let rows = [...openTasksBase]

    if (openTaskFilter === "alerts") {
      rows = rows.filter((task) => isTaskAlertActive(task))
    } else if (openTaskFilter !== "all_open") {
      rows = rows.filter((task) => {
        const normalized = normalizeTaskStatus(task.status)

        if (openTaskFilter === "pending") {
          return normalized === "PENDING" || normalized === "NEW"
        }

        if (openTaskFilter === "assigned") {
          return normalized === "ASSIGNED" || normalized === "WAITING_ACCEPTANCE"
        }

        if (openTaskFilter === "accepted") {
          return normalized === "ACCEPTED"
        }

        if (openTaskFilter === "in_progress") {
          return normalized === "IN_PROGRESS"
        }

        return false
      })
    }

    return rows.sort((a, b) => {
      const aAlert = isTaskAlertActive(a) ? 1 : 0
      const bAlert = isTaskAlertActive(b) ? 1 : 0

      if (aAlert !== bAlert) return bAlert - aAlert

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
    return safeArray(property?.issues).filter((issue) => {
      const normalized = normalizeIssueStatus(issue.status)
      return normalized === "OPEN" || normalized === "IN_PROGRESS"
    })
  }, [property])

  const supplyRows = useMemo(() => {
    return safeArray(property?.propertySupplies).map((supply) => {
      const derivedState = getDerivedSupplyState(supply)

      return {
        ...supply,
        derivedState,
        lastSeenUpdate: supply.lastUpdatedAt || supply.updatedAt || null,
        displayName: getSupplyDisplayName(language, {
          code: supply.supplyItem?.code,
          fallbackName: supply.supplyItem?.name,
        }),
      }
    })
  }, [property, language])

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

  const readiness = useMemo(
    () => getReadinessState(property, language, texts),
    [property, language, texts]
  )

  const stateBlock = useMemo(() => {
    if (!property) return null
    return buildPropertyStateBlock(property, language)
  }, [property, language])

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

      await loadPage()
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

      await loadPage()
      setPartnerFormMessage(texts.partnerSaveSuccess)
    } catch (err) {
      console.error("Save default partner error:", err)
      setPartnerFormMessage(
        err instanceof Error ? err.message : texts.partnerSaveError
      )
    } finally {
      setPartnerSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">{texts.loading}</div>
      </div>
    )
  }

  if (error || !property || !propertyForm || !stateBlock) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{texts.loadError}</h1>
        <p className="mt-2 text-sm text-red-600">
          {error || texts.noPropertyData}
        </p>
        <div className="mt-4">
          <Link
            href="/properties"
            className="inline-flex rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {texts.back}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6 p-6">
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

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {property.name}
                </h1>

                <span className={badgeClasses(property.status)}>
                  {getPropertyStatusLabel(language, property.status)}
                </span>

                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {getPropertyTypeLabel(language, property.type)}
                </span>

                <span className={readiness.tone}>
                  {texts.readiness}: {readiness.label}
                </span>

                {alertCount > 0 ? (
                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                    {texts.activeAlert}: {alertCount}
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {property.address}, {property.city}, {property.region}, {property.postalCode},{" "}
                {property.country}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {readiness.details}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/properties/${property.id}`}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {language === "en" ? "Property page" : "Σελίδα ακινήτου"}
              </Link>

              <button
                type="button"
                onClick={() => {
                  setPropertyForm(buildPropertyEditForm(property))
                  setPropertyFormMessage(null)
                  setActiveModal("property")
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {texts.propertyDetails}
              </button>
            </div>
          </div>
        </section>

        <section className={getStatePanelClassName(stateBlock.tone)}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className={getStateTitleClassName(stateBlock.tone)}>
                {stateBlock.title}
              </div>

              <div className={getStateTextClassName(stateBlock.tone)}>
                {stateBlock.description}
              </div>

              {stateBlock.helper ? (
                <div className={getStateTextClassName(stateBlock.tone)}>
                  {stateBlock.helper}
                </div>
              ) : null}
            </div>

            {stateBlock.nextStep ? (
              <div className="shrink-0 rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm font-medium text-slate-900">
                {language === "en" ? "Next step:" : "Επόμενο βήμα:"}{" "}
                <span className="font-semibold">{stateBlock.nextStep}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-slate-900">
              {language === "en" ? "Operational overview" : "Λειτουργική εικόνα"}
            </h2>
            <p className="text-sm text-slate-500">
              {language === "en"
                ? "See open work states first, then supplies state, and continue from the right control point."
                : "Δες πρώτα τις καταστάσεις ανοιχτών εργασιών, μετά την κατάσταση αναλωσίμων και συνέχισε από το σωστό σημείο ελέγχου."}
            </p>
          </div>

          <div className="mt-5 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-800">
                {language === "en"
                  ? "Open task states"
                  : "Καταστάσεις ανοιχτών εργασιών"}
              </div>
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
                  label={texts.taskAlerts}
                  value={openTaskCounts.alerts}
                  active={openTaskFilter === "alerts"}
                  onClick={() => setOpenTaskFilter("alerts")}
                  tone="red"
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
              <div className="mb-3 text-sm font-semibold text-slate-800">
                {language === "en" ? "Supplies status" : "Κατάσταση αναλωσίμων"}
              </div>
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
              <h2 className="text-xl font-semibold text-slate-900">
                {texts.openTasksTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {texts.openTasksSubtitle}
              </p>
            </div>

            <Link
              href={`/properties/${property.id}`}
              className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              {language === "en" ? "Back to property" : "Επιστροφή στο ακίνητο"}
            </Link>
          </div>

          <div className="mt-5">
            {visibleOpenTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                {texts.noOpenTasks}
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {visibleOpenTasks.map((task) => {
                  const latestAssignment = getLatestAssignment(task)
                  const borderline = isTaskBorderline(task)
                  const activeAlert = isTaskAlertActive(task)
                  const cleaningEnabled = Boolean(task.sendCleaningChecklist)
                  const suppliesEnabled = Boolean(task.sendSuppliesChecklist)
                  const cleaningRun = getCleaningRun(task)
                  const suppliesRun = getSuppliesRun(task)
                  const cleaningSubmitted = isRunSubmitted(cleaningRun)
                  const suppliesSubmitted = isRunSubmitted(suppliesRun)

                  const normalizedTaskStatus = normalizeTaskStatus(task.status)
                  const showNormalBadge =
                    !borderline &&
                    !activeAlert &&
                    ["ACCEPTED", "IN_PROGRESS"].includes(normalizedTaskStatus)

                  const partnerValue =
                    normalizedTaskStatus === "ACCEPTED"
                      ? latestAssignment?.partner?.name
                        ? `${latestAssignment.partner.name} · ${texts.partnerAcceptedTask}`
                        : texts.partnerAcceptedTask
                      : latestAssignment?.partner?.name || "—"

                  return (
                    <div
                      key={task.id}
                      className={`rounded-3xl border p-4 ${
                        activeAlert || borderline
                          ? "border-red-200 bg-red-50/40"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold text-slate-900">
                              {task.title || "—"}
                            </div>

                            <span className={badgeClasses(task.status)}>
                              {getTaskStatusLabel(language, task.status)}
                            </span>

                            {activeAlert ? (
                              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                {texts.activeAlert}
                              </span>
                            ) : null}

                            {!activeAlert && borderline ? (
                              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                {texts.borderline}
                              </span>
                            ) : null}

                            {showNormalBadge ? (
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                                {texts.normal}
                              </span>
                            ) : null}

                            {task.priority ? (
                              <span className={priorityBadgeClasses(task.priority)}>
                                {getPriorityLabel(language, task.priority)}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-2 text-sm font-medium text-slate-700">
                            {(() => {
                              switch (normalizeTaskStatus(task.status)) {
                                case "PENDING":
                                case "NEW":
                                  return texts.taskStatusHelpNew
                                case "ASSIGNED":
                                case "WAITING_ACCEPTANCE":
                                  return texts.taskStatusHelpAssigned
                                case "ACCEPTED":
                                  return texts.taskStatusHelpAccepted
                                case "IN_PROGRESS":
                                  return texts.taskStatusHelpInProgress
                                case "COMPLETED":
                                  return texts.taskStatusHelpCompleted
                                default:
                                  return "—"
                              }
                            })()}
                          </div>

                          {task.description ? (
                            <div className="mt-2 whitespace-pre-line text-sm text-slate-600">
                              {task.description}
                            </div>
                          ) : null}
                        </div>

                        <Link
                          href={`/tasks/${task.id}`}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
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

                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
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

                        <InfoChip
                          label={texts.alert}
                          value={
                            activeAlert
                              ? formatDateTime(task.alertAt || null, texts.locale)
                              : "—"
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

        <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {language === "en" ? "Property identity" : "Ταυτότητα ακινήτου"}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoChip label={texts.code} value={property.code || "—"} />
              <InfoChip
                label={texts.propertyStatus}
                value={getPropertyStatusLabel(language, property.status)}
              />
              <InfoChip
                label={texts.type}
                value={getPropertyTypeLabel(language, property.type)}
              />
              <InfoChip
                label={texts.readiness}
                value={readiness.label}
              />
              <InfoChip
                label={texts.createdAt}
                value={formatDateTime(property.createdAt, texts.locale)}
              />
              <InfoChip
                label={texts.updatedAt}
                value={formatDateTime(property.updatedAt, texts.locale)}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {language === "en" ? "Core setup" : "Βασική ρύθμιση"}
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {texts.defaultPartnerTitle}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {property.defaultPartner
                    ? `${property.defaultPartner.name} · ${property.defaultPartner.code}`
                    : texts.noDefaultPartner}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {texts.cleaningChecklistTitle}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {primaryCleaningChecklist
                    ? primaryCleaningChecklist.title
                    : texts.noCleaningChecklist}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {language === "en" ? "Open issues" : "Ανοιχτά θέματα"}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {openIssues.length}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">
                  {texts.suppliesTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {texts.suppliesSubtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal("supplies")}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {texts.details}
              </button>
            </div>

            <div className="mt-3">
              {visibleSupplies.length > 0 ? (
                <div className="space-y-2">
                  {visibleSupplies.slice(0, 3).map((supply) => (
                    <div key={supply.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-900">
                          {supply.displayName}
                        </span>
                        <span className={supplyStateBadgeClass(supply.derivedState)}>
                          {getSupplyLevelLabel(language, supply.derivedState)}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        {texts.lastUpdate}:{" "}
                        {formatDateTime(supply.lastSeenUpdate, texts.locale)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">
                  {texts.noSupplies}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">
                  {texts.issuesTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {texts.issuesSubtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal("issues")}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
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
                      className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3"
                    >
                      <span className="min-w-0 truncate text-sm text-slate-900">
                        {issue.title}
                      </span>
                      <span className={badgeClasses(issue.severity)}>
                        {getIssuePriorityLabel(language, issue.severity)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">
                  {texts.noIssues}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">
                  {texts.defaultPartnerTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {texts.defaultPartnerSubtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPartnerId(String(property.defaultPartnerId || ""))
                  setPartnerFormMessage(null)
                  setActiveModal("partner")
                }}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {texts.editPartner}
              </button>
            </div>

            <div className="mt-3">
              {property.defaultPartner ? (
                <div className="grid gap-2 md:grid-cols-2">
                  <InfoChip label={texts.name} value={property.defaultPartner.name} />
                  <InfoChip
                    label={texts.email}
                    value={property.defaultPartner.email || "—"}
                  />
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">
                  {texts.noDefaultPartner}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">
                  {texts.cleaningChecklistTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {texts.cleaningChecklistSubtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal("cleaningChecklist")}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {texts.details}
              </button>
            </div>

            <div className="mt-3">
              {primaryCleaningChecklist ? (
                <div className="grid gap-2 md:grid-cols-2">
                  <InfoChip
                    label={texts.name}
                    value={primaryCleaningChecklist.title}
                  />
                  <InfoChip
                    label={texts.items}
                    value={String(safeArray(primaryCleaningChecklist.items).length)}
                  />
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">
                  {texts.noCleaningChecklist}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
              {texts.suppliesFlowInfo}
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
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {texts.code}
              </label>
              <input
                value={propertyForm.code}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, code: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {texts.name}
              </label>
              <input
                value={propertyForm.name}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {texts.address}
              </label>
              <input
                value={propertyForm.address}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, address: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {texts.city}
              </label>
              <input
                value={propertyForm.city}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, city: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {texts.region}
              </label>
              <input
                value={propertyForm.region}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, region: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {texts.postalCode}
              </label>
              <input
                value={propertyForm.postalCode}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, postalCode: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {texts.country}
              </label>
              <input
                value={propertyForm.country}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, country: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {texts.type}
              </label>
              <select
                value={propertyForm.type}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, type: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                {PROPERTY_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {getPropertyTypeLabel(language, type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {texts.propertyStatus}
              </label>
              <select
                value={propertyForm.status}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, status: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="active">{texts.statusActive}</option>
                <option value="inactive">{texts.statusInactive}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {texts.bedrooms}
              </label>
              <input
                type="number"
                min="0"
                value={propertyForm.bedrooms}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, bedrooms: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {texts.bathrooms}
              </label>
              <input
                type="number"
                min="0"
                value={propertyForm.bathrooms}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, bathrooms: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {texts.maxGuests}
              </label>
              <input
                type="number"
                min="0"
                value={propertyForm.maxGuests}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, maxGuests: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {texts.notes}
              </label>
              <textarea
                value={propertyForm.notes}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, notes: e.target.value } : prev
                  )
                }
                rows={4}
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={propertySaving}
            >
              {texts.cancel}
            </button>

            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
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
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {texts.choosePartner}
            </label>
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
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
              className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={partnerSaving}
            >
              {texts.cancel}
            </button>

            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
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
                label={texts.items}
                value={String(safeArray(primaryCleaningChecklist.items).length)}
              />
              <InfoChip
                label={texts.updatedAt}
                value={formatDateTime(primaryCleaningChecklist.updatedAt, texts.locale)}
              />
            </div>

            {primaryCleaningChecklist.description ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                {primaryCleaningChecklist.description}
              </div>
            ) : null}

            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              {texts.suppliesFlowInfo}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/property-checklists/${property.id}`}
                className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {texts.openChecklistManagement}
              </Link>

              <Link
                href={`/property-checklists/${property.id}/templates/${primaryCleaningChecklist.id}`}
                className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {texts.editChecklist}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              {texts.noCleaningChecklist}
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              {texts.suppliesFlowInfo}
            </div>

            <Link
              href={`/property-checklists/${property.id}`}
              className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
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
              className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
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
                      {supply.displayName}
                    </div>
                  </div>

                  <span className={supplyStateBadgeClass(supply.derivedState)}>
                    {getSupplyLevelLabel(language, supply.derivedState)}
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
                className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
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
              className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
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

                      <span className={badgeClasses(issue.status)}>
                        {getIssueStatusLabel(language, issue.status)}
                      </span>

                      <span className={badgeClasses(issue.severity)}>
                        {getIssuePriorityLabel(language, issue.severity)}
                      </span>
                    </div>

                    {issue.description ? (
                      <div className="mt-2 text-sm text-slate-700">
                        {issue.description}
                      </div>
                    ) : null}
                  </div>

                  <Link
                    href={`/issues/${issue.id}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {texts.viewIssue}
                  </Link>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Link
                href="/issues"
                className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
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
