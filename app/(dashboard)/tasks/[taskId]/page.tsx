"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import {
  getActorTypeLabel,
  getAssignmentStatusLabel,
  getBookingStatusLabel,
  getChecklistStatusLabel,
  getPriorityLabel,
  getPropertyStatusLabel,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from "@/lib/i18n/labels"
import {
  normalizeActorType,
  normalizeAssignmentStatus,
  normalizeChecklistStatus,
  normalizePriority,
} from "@/lib/i18n/normalizers"
import { getTaskDetailsPageTexts } from "@/lib/i18n/translations"
import { resolveSupplyDisplayName } from "@/lib/supply-display"

type PropertySummary = {
  id: string
  code: string
  name: string
  address?: string | null
  city?: string | null
  region?: string | null
  country?: string | null
  status?: string | null
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

type TaskChecklistTemplateItem = {
  id: string
  label: string
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
  issueCreated?: boolean | null
  linkedSupplyItemId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  photoUrls?: string[] | null
  photos?: Array<{ url?: string | null } | string> | null
  attachments?: Array<{ url?: string | null } | string> | null
}

type TaskChecklistRun = {
  id: string
  title?: string | null
  status: string
  startedAt?: string | null
  completedAt?: string | null
  submittedAt?: string | null
  sentAt?: string | null
  isActive?: boolean | null
  isRequired?: boolean | null
  sendToPartner?: boolean | null
  checklistType?: string | null
  template?: {
    id: string
    title?: string | null
    name?: string | null
    isPrimary?: boolean | null
  } | null
  items?: TaskChecklistTemplateItem[]
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

type PropertyCondition = {
  id: string
  title?: string | null
  description?: string | null
  conditionType?: string | null
  status?: string | null
  severity?: string | null
  blockingStatus?: string | null
  managerDecision?: string | null
  sourceTaskId?: string | null
  taskId?: string | null
  createdFromTaskId?: string | null
  originTaskId?: string | null
  linkedChecklistRunId?: string | null
  linkedChecklistAnswerId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  resolvedAt?: string | null
}

type TaskIssue = {
  id: string
  title?: string | null
  description?: string | null
  issueType?: string | null
  type?: string | null
  status?: string | null
  severity?: string | null
  blockingStatus?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  resolvedAt?: string | null
  propertyConditionId?: string | null
}

type TaskWarning = {
  id?: string | null
  code?: string | null
  title?: string | null
  message?: string | null
  severity?: string | null
}

type ReadinessSnapshot = {
  status?: string | null
  blockingCount?: number | null
  warningCount?: number | null
  openConditionsCount?: number | null
  reasonSummary?: string[] | null
  summary?: string | null
  nextCheckInAt?: string | null
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
      items?: TaskChecklistTemplateItem[]
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
  priority: string
  status: string
  scheduledDate?: string | null
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  notes?: string | null
  resultNotes?: string | null
  requiresPhotos?: boolean
  requiresChecklist?: boolean
  requiresApproval?: boolean
  createdAt?: string | null
  updatedAt?: string | null
  completedAt?: string | null
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
  propertyConditions?: PropertyCondition[]
  issues?: TaskIssue[]
  warnings?: Array<TaskWarning | string>
  readiness?: ReadinessSnapshot | null
  sendCleaningChecklist?: boolean
  sendSuppliesChecklist?: boolean
  sendIssuesChecklist?: boolean
}

type ScheduleFormState = {
  scheduledDate: string
  scheduledStartTime: string
  scheduledEndTime: string
}

type AssignmentFormState = {
  partnerId: string
  notes: string
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
  linkedSupplyItemId?: string | null
  supplyUpdateMode?: string | null
  opensIssueOnFail: boolean
  issueTypeOnFail: string
  issueSeverityOnFail: string
  failureValuesText: string
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

function calculateDurationLabel(
  start?: string | null,
  end?: string | null,
  language: "el" | "en" = "el",
  empty = "—"
) {
  if (!start || !end) return empty

  const [startHour, startMinute] = start.split(":").map(Number)
  const [endHour, endMinute] = end.split(":").map(Number)

  if (
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    Number.isNaN(endHour) ||
    Number.isNaN(endMinute)
  ) {
    return empty
  }

  const startTotal = startHour * 60 + startMinute
  const endTotal = endHour * 60 + endMinute
  const diff = endTotal - startTotal

  if (diff <= 0) return `${start.slice(0, 5)} - ${end.slice(0, 5)}`

  const hours = Math.floor(diff / 60)
  const minutes = diff % 60
  const range = `${start.slice(0, 5)} - ${end.slice(0, 5)}`

  if (language === "en") {
    if (hours > 0 && minutes > 0) return `${range} (${hours}h ${minutes}m)`
    if (hours > 0) return `${range} (${hours}h)`
    return `${range} (${minutes}m)`
  }

  if (hours > 0 && minutes > 0) return `${range} (${hours}ω ${minutes}λ)`
  if (hours > 0) return `${range} (${hours}ω)`
  return `${range} (${minutes}λ)`
}

function buildExecutionWindow(
  date?: string | null,
  start?: string | null,
  end?: string | null,
  locale = "el-GR",
  empty = "—"
) {
  if (!date) return empty

  const dateLabel = formatDate(date, locale, empty)
  if (start && end) return `${dateLabel} · ${formatTime(start, empty)} - ${formatTime(end, empty)}`
  if (start) return `${dateLabel} · ${formatTime(start, empty)}`
  return dateLabel
}

function normalizeTaskStatusForUi(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase()

  if (text === "completed") return "completed"
  if (text === "cancelled" || text === "canceled") return "cancelled"
  if (text === "in_progress" || text === "in-progress") return "in_progress"
  if (text === "pending") return "pending"
  if (text === "assigned") return "assigned"

  return "unknown"
}

function normalizePartnerSpecialtyForUi(value: unknown, language: "el" | "en") {
  const text = String(value ?? "").trim()
  if (!text) return ""

  const normalized = text.toLowerCase()

  if (normalized === "cleaning" || normalized === "καθαρισμός" || normalized === "καθαρισμος") {
    return language === "en" ? "Cleaning" : "Καθαρισμός"
  }

  if (normalized === "inspection" || normalized === "επιθεώρηση" || normalized === "επιθεωρηση") {
    return language === "en" ? "Inspection" : "Επιθεώρηση"
  }

  if (
    normalized === "maintenance" ||
    normalized === "maintenance task" ||
    normalized === "τεχνική εργασία" ||
    normalized === "τεχνικη εργασια"
  ) {
    return language === "en" ? "Maintenance task" : "Τεχνική εργασία"
  }

  if (
    normalized === "other task" ||
    normalized === "custom" ||
    normalized === "άλλη εργασία" ||
    normalized === "αλλη εργασια"
  ) {
    return language === "en" ? "Other task" : "Άλλη εργασία"
  }

  return text
}

function normalizeActorDisplayName(
  actorName: unknown,
  actorType: unknown,
  language: "el" | "en"
) {
  const rawName = String(actorName ?? "").trim()
  const rawType = String(actorType ?? "").trim().toLowerCase()

  if (!rawName) {
    return getActorTypeLabel(language, normalizeActorType(actorType))
  }

  const normalizedName = rawName.toLowerCase()

  if (
    normalizedName === "διαχειριστής" ||
    normalizedName === "manager" ||
    normalizedName === "admin"
  ) {
    return language === "en" ? "Manager" : "Διαχειριστής"
  }

  if (normalizedName === "system" || normalizedName === "σύστημα" || normalizedName === "συστημα") {
    return language === "en" ? "System" : "Σύστημα"
  }

  if (rawType === "manager" || rawType === "admin") {
    return rawName === "Διαχειριστής" && language === "en" ? "Manager" : rawName
  }

  return rawName
}

function normalizeSystemGeneratedTaskTitle(rawTitle: unknown, language: "el" | "en") {
  const title = String(rawTitle ?? "").trim()
  if (!title) return ""

  let match = title.match(/^Καθαρισμός μετά από check-out\s*-\s*(.+)$/i)
  if (match?.[1]) {
    return language === "en"
      ? `Cleaning after check-out - ${match[1]}`
      : `Καθαρισμός μετά από check-out - ${match[1]}`
  }

  match = title.match(/^Cleaning after check-out\s*-\s*(.+)$/i)
  if (match?.[1]) {
    return language === "en"
      ? `Cleaning after check-out - ${match[1]}`
      : `Καθαρισμός μετά από check-out - ${match[1]}`
  }

  match = title.match(/^Επιθεώρηση πριν από check-in\s*-\s*(.+)$/i)
  if (match?.[1]) {
    return language === "en"
      ? `Inspection before check-in - ${match[1]}`
      : `Επιθεώρηση πριν από check-in - ${match[1]}`
  }

  match = title.match(/^Inspection before check-in\s*-\s*(.+)$/i)
  if (match?.[1]) {
    return language === "en"
      ? `Inspection before check-in - ${match[1]}`
      : `Επιθεώρηση πριν από check-in - ${match[1]}`
  }

  match = title.match(/^Αναπλήρωση αναλωσίμων\s*-\s*(.+)$/i)
  if (match?.[1]) {
    return language === "en"
      ? `Supplies refill - ${match[1]}`
      : `Αναπλήρωση αναλωσίμων - ${match[1]}`
  }

  match = title.match(/^Supplies refill\s*-\s*(.+)$/i)
  if (match?.[1]) {
    return language === "en"
      ? `Supplies refill - ${match[1]}`
      : `Αναπλήρωση αναλωσίμων - ${match[1]}`
  }

  match = title.match(/^Βλάβες και ζημιές\s*-\s*(.+)$/i)
  if (match?.[1]) {
    return language === "en"
      ? `Issues and damages - ${match[1]}`
      : `Βλάβες και ζημιές - ${match[1]}`
  }

  match = title.match(/^Issues and damages\s*-\s*(.+)$/i)
  if (match?.[1]) {
    return language === "en"
      ? `Issues and damages - ${match[1]}`
      : `Βλάβες και ζημιές - ${match[1]}`
  }

  return title
}

function normalizeChecklistTitleForUi(
  rawTitle: unknown,
  fallback: string,
  language: "el" | "en"
) {
  const title = String(rawTitle ?? "").trim()
  if (!title) return fallback

  const normalized = title
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()

  const looksLikeGeneratedCleaningTitle =
    /^(cleaning checklist|cleaning)(\s*[·\-].*)?$/.test(normalized) ||
    /^(λίστα καθαριότητας|καθαριότητα|καθαριοτητα)(\s*[·\-].*)?$/.test(normalized) ||
    (normalized.includes("cleaning") && normalized.includes("task")) ||
    (normalized.includes("καθαριοτ") && normalized.includes("εργασ")) ||
    normalized === "primary property cleaning checklist" ||
    normalized === "κύρια λίστα καθαριότητας ακινήτου"

  if (looksLikeGeneratedCleaningTitle) {
    return language === "en" ? "Cleaning list" : "Λίστα καθαριότητας"
  }

  const looksLikeGeneratedSuppliesTitle =
    /^(supplies checklist|supplies list|supplies)(\s*[·\-].*)?$/.test(normalized) ||
    /^(λίστα αναλωσίμων|αναλώσιμα|αναλωσιμα)(\s*[·\-].*)?$/.test(normalized) ||
    (normalized.includes("suppl") && normalized.includes("task")) ||
    (normalized.includes("αναλωσ") && normalized.includes("εργασ")) ||
    normalized === "property supplies list"

  if (looksLikeGeneratedSuppliesTitle) {
    return language === "en" ? "Supplies list" : "Λίστα αναλωσίμων"
  }

  const looksLikeGeneratedIssuesTitle =
    /^(issues checklist|issues list|damages list|damage checklist|issues and damages)(\s*[·\-].*)?$/.test(normalized) ||
    /^(λίστα βλαβών|λίστα ζημιών|λίστα βλαβών και ζημιών|βλάβες και ζημιές|βλαβες και ζημιες)(\s*[·\-].*)?$/.test(normalized) ||
    (normalized.includes("issue") && normalized.includes("task")) ||
    (normalized.includes("damage") && normalized.includes("task")) ||
    (normalized.includes("βλαβ") && normalized.includes("εργασ")) ||
    (normalized.includes("ζημι") && normalized.includes("εργασ"))

  if (looksLikeGeneratedIssuesTitle) {
    return language === "en" ? "Issues and damages list" : "Λίστα βλαβών και ζημιών"
  }

  return title
}

function normalizeSupplyCategoryForUi(value: unknown, language: "el" | "en") {
  const text = String(value ?? "").trim()
  if (!text) return ""

  const normalized = text.toLowerCase()

  if (normalized === "bathroom" || normalized === "μπάνιο" || normalized === "μπανιο") {
    return language === "en" ? "Bathroom" : "Μπάνιο"
  }

  if (normalized === "kitchen" || normalized === "κουζίνα" || normalized === "κουζινα") {
    return language === "en" ? "Kitchen" : "Κουζίνα"
  }

  if (
    normalized === "cleaning" ||
    normalized === "cleaning supplies" ||
    normalized === "καθαριότητα" ||
    normalized === "καθαριοτητα"
  ) {
    return language === "en" ? "Cleaning" : "Καθαριότητα"
  }

  if (
    normalized === "bedroom" ||
    normalized === "υπνοδωμάτιο" ||
    normalized === "υπνοδωματιο"
  ) {
    return language === "en" ? "Bedroom" : "Υπνοδωμάτιο"
  }

  if (
    normalized === "living room" ||
    normalized === "salon" ||
    normalized === "σαλόνι" ||
    normalized === "σαλονι"
  ) {
    return language === "en" ? "Living room" : "Σαλόνι"
  }

  if (
    normalized === "general" ||
    normalized === "common" ||
    normalized === "γενικά" ||
    normalized === "γενικα"
  ) {
    return language === "en" ? "General" : "Γενικά"
  }

  return text
}

function normalizeFreeTextByLanguage(value: unknown, language: "el" | "en") {
  const text = String(value ?? "").trim()
  if (!text) return ""

  const normalized = text.toLowerCase()

  if (language === "el") {
    if (normalized === "submitted") return "Υποβλήθηκε"
    if (normalized === "active") return "Ενεργή"
    if (normalized === "inactive") return "Ανενεργή"
    if (normalized === "completed") return "Ολοκληρώθηκε"
    if (normalized === "not submitted") return "Δεν υποβλήθηκε"
    if (normalized === "pending") return "Αναμονή"
    if (normalized === "warning") return "Προειδοποίηση"
    if (normalized === "open") return "Ανοιχτό"
    if (normalized === "resolved") return "Επιλύθηκε"
  }

  if (language === "en") {
    if (normalized === "υποβλήθηκε") return "Submitted"
    if (normalized === "ενεργή" || normalized === "ενεργό") return "Active"
    if (normalized === "ανενεργή" || normalized === "ανενεργό") return "Inactive"
    if (normalized === "ολοκληρώθηκε") return "Completed"
    if (normalized === "δεν υποβλήθηκε") return "Not submitted"
    if (normalized === "αναμονή" || normalized === "αναμονη") return "Pending"
    if (normalized === "προειδοποίηση" || normalized === "προειδοποιηση") return "Warning"
    if (normalized === "ανοιχτό" || normalized === "ανοιχτο") return "Open"
    if (normalized === "επιλύθηκε" || normalized === "επιλυθηκε") return "Resolved"
  }

  return text
}

function getLanguageUnknownLabel(language: "el" | "en") {
  return language === "en" ? "Unknown" : "Άγνωστο"
}
function getActiveAssignment(assignments?: TaskAssignment[]) {
  if (!assignments || assignments.length === 0) return null

  const order: Record<string, number> = {
    ACCEPTED: 1,
    ASSIGNED: 2,
    PENDING: 3,
    REJECTED: 4,
    CANCELLED: 5,
    COMPLETED: 6,
    UNKNOWN: 7,
  }

  const sorted = [...assignments].sort((a, b) => {
    const aStatus = normalizeAssignmentStatus(a.status)
    const bStatus = normalizeAssignmentStatus(b.status)
    const byStatus = (order[aStatus] ?? 99) - (order[bStatus] ?? 99)
    if (byStatus !== 0) return byStatus

    const aTime = new Date(a.assignedAt || 0).getTime()
    const bTime = new Date(b.assignedAt || 0).getTime()
    return bTime - aTime
  })

  return sorted[0] ?? null
}

function hasAssignmentAccepted(assignment?: TaskAssignment | null) {
  if (!assignment) return false
  const status = String(assignment.status ?? "").trim().toLowerCase()
  return status === "accepted" || Boolean(assignment.acceptedAt)
}

function buildEditableItemsFromRunOrPropertySource(params: {
  run?: TaskChecklistRun | null
  fallbackItems?: TaskChecklistTemplateItem[]
  prefix: string
}): EditableChecklistItem[] {
  const runItems = params.run?.items || []

  if (runItems.length > 0) {
    return runItems.map((item, index) => ({
      localId: `${params.prefix}-run-${item.id || index}-${index}`,
      sourceId: item.id,
      label: item.label || "",
      description: item.description || "",
      itemType: item.itemType || "boolean",
      isRequired: Boolean(item.isRequired),
      requiresPhoto: Boolean(item.requiresPhoto),
      optionsText: item.optionsText || "",
      category: item.category || "inspection",
      linkedSupplyItemId: item.linkedSupplyItemId ?? null,
      supplyUpdateMode: item.supplyUpdateMode ?? null,
      opensIssueOnFail: Boolean(item.opensIssueOnFail),
      issueTypeOnFail: item.issueTypeOnFail || "general",
      issueSeverityOnFail: item.issueSeverityOnFail || "medium",
      failureValuesText: item.failureValuesText || "",
    }))
  }

  return (params.fallbackItems || []).map((item, index) => ({
    localId: `${params.prefix}-property-${item.id || index}-${index}`,
    sourceId: item.id,
    label: item.label || "",
    description: item.description || "",
    itemType: item.itemType || "boolean",
    isRequired: Boolean(item.isRequired),
    requiresPhoto: Boolean(item.requiresPhoto),
    optionsText: item.optionsText || "",
    category: item.category || "inspection",
    linkedSupplyItemId: item.linkedSupplyItemId ?? null,
    supplyUpdateMode: item.supplyUpdateMode ?? null,
    opensIssueOnFail: Boolean(item.opensIssueOnFail),
    issueTypeOnFail: item.issueTypeOnFail || "general",
    issueSeverityOnFail: item.issueSeverityOnFail || "medium",
    failureValuesText: item.failureValuesText || "",
  }))
}

function buildEditableItemsFromCleaningSource(task: TaskDetails | null): EditableChecklistItem[] {
  return buildEditableItemsFromRunOrPropertySource({
    run: task?.cleaningChecklistRun || null,
    fallbackItems: task?.propertyLists?.cleaning?.primaryTemplate?.items || [],
    prefix: "cleaning",
  })
}

function buildEditableItemsFromIssuesSource(task: TaskDetails | null): EditableChecklistItem[] {
  return buildEditableItemsFromRunOrPropertySource({
    run: task?.issuesChecklistRun || null,
    fallbackItems: [],
    prefix: "issues",
  })
}

function isChecklistActuallySent(params: {
  run?: TaskChecklistRun | null
  isEnabled: boolean
  activeAssignment?: TaskAssignment | null
}) {
  const { run, isEnabled, activeAssignment } = params

  if (!isEnabled) return false
  if (run?.sentAt) return true
  if (hasAssignmentAccepted(activeAssignment)) return true

  return false
}

function getRunTitleText(run?: TaskChecklistRun | null) {
  return [run?.title, run?.template?.title, run?.template?.name, run?.checklistType]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase()
}

function runLooksLikeSuppliesByAnswers(run?: TaskChecklistRun | null) {
  if (!run?.answers?.length) return false

  return run.answers.some((answer) => {
    const selected = String(answer.valueSelect ?? "").trim().toLowerCase()
    const note = String(answer.note ?? "").trim().toLowerCase()
    const label = String(answer.itemLabel ?? "").trim().toLowerCase()

    return (
      Boolean(answer.linkedSupplyItemId) ||
      selected === "missing" ||
      selected === "medium" ||
      selected === "full" ||
      selected === "low" ||
      selected === "ok" ||
      selected === "good" ||
      selected === "έλλειψη" ||
      selected === "μέτρια" ||
      selected === "πλήρης" ||
      label.includes("αναλω") ||
      label.includes("suppl") ||
      note.includes("αναλω") ||
      note.includes("supply")
    )
  })
}

function runLooksLikeIssuesByAnswers(run?: TaskChecklistRun | null) {
  if (!run?.answers?.length) return false

  return run.answers.some((answer) => {
    const text = String(answer.valueText ?? "").trim().toLowerCase()
    const select = String(answer.valueSelect ?? "").trim().toLowerCase()
    const note = String(answer.note ?? "").trim().toLowerCase()
    const label = String(answer.itemLabel ?? "").trim().toLowerCase()

    return (
      Boolean(answer.issueCreated) ||
      label.includes("βλαβ") ||
      label.includes("ζημι") ||
      label.includes("issue") ||
      label.includes("damage") ||
      note.includes("βλαβ") ||
      note.includes("ζημι") ||
      note.includes("issue") ||
      note.includes("damage") ||
      text.includes("βλαβ") ||
      text.includes("ζημι") ||
      text.includes("issue") ||
      text.includes("damage") ||
      select === "damage" ||
      select === "issue"
    )
  })
}

function classifyRunKind(run?: TaskChecklistRun | null): "cleaning" | "supplies" | "issues" | "unknown" {
  if (!run) return "unknown"

  const typeText = String(run.checklistType || "").trim().toLowerCase()
  if (typeText.includes("suppl")) return "supplies"
  if (typeText.includes("clean")) return "cleaning"
  if (typeText.includes("issue") || typeText.includes("damage") || typeText.includes("repair")) {
    return "issues"
  }
  if (typeText.includes("αναλω")) return "supplies"
  if (typeText.includes("καθαρ")) return "cleaning"
  if (typeText.includes("βλαβ") || typeText.includes("ζημι")) return "issues"

  const titleText = getRunTitleText(run)

  if (titleText.includes("suppl") || titleText.includes("αναλω") || titleText.includes("stock")) {
    return "supplies"
  }

  if (titleText.includes("clean") || titleText.includes("καθαρ")) {
    return "cleaning"
  }

  if (
    titleText.includes("issue") ||
    titleText.includes("damage") ||
    titleText.includes("repair") ||
    titleText.includes("βλαβ") ||
    titleText.includes("ζημι")
  ) {
    return "issues"
  }

  const items = run.items || []
  const hasSupplySignals = items.some((item) => {
    const categoryText = String(item.category || "").toLowerCase()
    const updateMode = String(item.supplyUpdateMode || "").toLowerCase()
    const labelText = String(item.label || "").toLowerCase()
    const descriptionText = String(item.description || "").toLowerCase()

    return (
      Boolean(item.linkedSupplyItemId) ||
      updateMode === "status_map" ||
      updateMode === "set_stock" ||
      updateMode === "consume" ||
      updateMode === "flag_low" ||
      categoryText.includes("suppl") ||
      categoryText.includes("αναλω") ||
      labelText.includes("αναλω") ||
      labelText.includes("suppl") ||
      descriptionText.includes("αναλω") ||
      descriptionText.includes("suppl")
    )
  })

  if (hasSupplySignals) return "supplies"

  const hasIssueSignals = items.some((item) => {
    const categoryText = String(item.category || "").toLowerCase()
    const labelText = String(item.label || "").toLowerCase()
    const descriptionText = String(item.description || "").toLowerCase()
    const issueType = String(item.issueTypeOnFail || "").toLowerCase()

    return (
      Boolean(item.opensIssueOnFail) ||
      issueType === "damage" ||
      issueType === "repair" ||
      issueType === "general" ||
      categoryText.includes("issue") ||
      categoryText.includes("damage") ||
      categoryText.includes("repair") ||
      categoryText.includes("βλαβ") ||
      categoryText.includes("ζημι") ||
      labelText.includes("issue") ||
      labelText.includes("damage") ||
      labelText.includes("repair") ||
      labelText.includes("βλαβ") ||
      labelText.includes("ζημι") ||
      descriptionText.includes("issue") ||
      descriptionText.includes("damage") ||
      descriptionText.includes("repair") ||
      descriptionText.includes("βλαβ") ||
      descriptionText.includes("ζημι")
    )
  })

  if (hasIssueSignals) return "issues"
  if (runLooksLikeSuppliesByAnswers(run)) return "supplies"
  if (runLooksLikeIssuesByAnswers(run)) return "issues"
  if (items.length > 0) return "cleaning"

  return "unknown"
}

function getAllRuns(task: TaskDetails | null): TaskChecklistRun[] {
  if (!task) return []

  const source = [
    task.cleaningChecklistRun,
    task.suppliesChecklistRun,
    task.issuesChecklistRun,
    task.checklistRun,
  ].filter(Boolean) as TaskChecklistRun[]

  const seen = new Set<string>()
  const unique: TaskChecklistRun[] = []

  for (const run of source) {
    const key = run.id || JSON.stringify(run)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(run)
  }

  return unique
}

function resolveChecklistRuns(task: TaskDetails | null) {
  const allRuns = getAllRuns(task)

  let cleaning: TaskChecklistRun | null = task?.cleaningChecklistRun || null
  let supplies: TaskChecklistRun | null = task?.suppliesChecklistRun || null
  let issues: TaskChecklistRun | null = task?.issuesChecklistRun || null

  if (!cleaning || !supplies || !issues) {
    for (const run of allRuns) {
      const kind = classifyRunKind(run)

      if (kind === "cleaning" && !cleaning) {
        cleaning = run
        continue
      }

      if (kind === "supplies" && !supplies) {
        supplies = run
        continue
      }

      if (kind === "issues" && !issues) {
        issues = run
      }
    }
  }

  if (!cleaning && !supplies && !issues && allRuns.length === 1) {
    const onlyRun = allRuns[0]
    const kind = classifyRunKind(onlyRun)

    if (kind === "cleaning") {
      cleaning = onlyRun
    } else if (kind === "supplies") {
      supplies = onlyRun
    } else if (kind === "issues") {
      issues = onlyRun
    } else if (task?.sendCleaningChecklist && !task?.sendSuppliesChecklist && !task?.sendIssuesChecklist) {
      cleaning = onlyRun
    } else if (task?.sendSuppliesChecklist && !task?.sendCleaningChecklist && !task?.sendIssuesChecklist) {
      supplies = onlyRun
    } else if (task?.sendIssuesChecklist && !task?.sendCleaningChecklist && !task?.sendSuppliesChecklist) {
      issues = onlyRun
    }
  }

  if (!supplies && task?.sendSuppliesChecklist && task?.checklistRun) {
    const fallbackRun = task.checklistRun
    if (classifyRunKind(fallbackRun) === "supplies" || runLooksLikeSuppliesByAnswers(fallbackRun)) {
      supplies = fallbackRun
    }
  }

  if (!cleaning && task?.sendCleaningChecklist && task?.checklistRun) {
    const fallbackRun = task.checklistRun
    if (classifyRunKind(fallbackRun) === "cleaning") {
      cleaning = fallbackRun
    }
  }

  if (!issues && task?.sendIssuesChecklist && task?.checklistRun) {
    const fallbackRun = task.checklistRun
    if (classifyRunKind(fallbackRun) === "issues" || runLooksLikeIssuesByAnswers(fallbackRun)) {
      issues = fallbackRun
    }
  }

  return { cleaning, supplies, issues }
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
      if (typeof item === "string" && item.trim()) {
        result.push(item)
      } else if (
        item &&
        typeof item === "object" &&
        "url" in item &&
        typeof item.url === "string" &&
        item.url.trim()
      ) {
        result.push(item.url)
      }
    }
  }

  if (Array.isArray(answer.attachments)) {
    for (const item of answer.attachments) {
      if (typeof item === "string" && item.trim()) {
        result.push(item)
      } else if (
        item &&
        typeof item === "object" &&
        "url" in item &&
        typeof item.url === "string" &&
        item.url.trim()
      ) {
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

function getSubmissionTimeFromActivityLogs(
  activityLogs: ActivityLog[] | undefined,
  kind: "cleaning" | "supplies" | "issues"
) {
  if (!activityLogs?.length) return null

  const match = activityLogs.find((log) => {
    const action = String(log.action ?? "").trim().toUpperCase()
    const message = String(log.message ?? "").trim()

    if (kind === "cleaning") {
      if (action === "PARTNER_CHECKLIST_SUBMITTED") return true

      return (
        /submitted the cleaning list from the portal/i.test(message) ||
        /submitted the checklist from the portal/i.test(message) ||
        /υπέβαλε τη λίστα καθαριότητας από το portal/i.test(message) ||
        /υπέβαλε τη λίστα από το portal/i.test(message) ||
        /υπέβαλε τη checklist από το portal/i.test(message)
      )
    }

    if (kind === "supplies") {
      if (action === "PARTNER_SUPPLIES_SUBMITTED") return true

      return (
        /submitted the supplies from the portal/i.test(message) ||
        /υπέβαλε τα αναλώσιμα από το portal/i.test(message)
      )
    }

    if (action === "PARTNER_ISSUES_SUBMITTED") return true

    return (
      /submitted the issues list from the portal/i.test(message) ||
      /submitted the issues and damages list from the portal/i.test(message) ||
      /υπέβαλε τη λίστα βλαβών από το portal/i.test(message) ||
      /υπέβαλε τη λίστα βλαβών και ζημιών από το portal/i.test(message)
    )
  })

  return match?.createdAt || null
}

function runHasSubmission(run?: TaskChecklistRun | null) {
  if (!run) return false

  const rawStatus = String(run.status ?? "").trim().toLowerCase()

  if (
    rawStatus === "completed" ||
    rawStatus === "submitted" ||
    rawStatus === "done" ||
    rawStatus === "ολοκληρώθηκε" ||
    rawStatus === "υποβλήθηκε"
  ) {
    return true
  }

  if (run.completedAt || run.submittedAt) return true
  if ((run.answers || []).some((answer) => answerHasData(answer))) return true

  return false
}

function getRunSubmittedAt(run?: TaskChecklistRun | null) {
  if (!run) return null
  return run.completedAt || run.submittedAt || null
}

function getChecklistResponseCount(run?: TaskChecklistRun | null) {
  if (!run?.answers?.length) return 0
  return run.answers.filter((answer) => answerHasData(answer)).length
}

function getSupplyLevelLabel(
  value: unknown,
  texts: ReturnType<typeof getTaskDetailsPageTexts>
) {
  const normalized = String(value ?? "").trim().toLowerCase()

  if (
    normalized === "missing" ||
    normalized === "low" ||
    normalized === "έλλειψη" ||
    normalized === "λειπει" ||
    normalized === "λείπει"
  ) {
    return texts.supplyLevels.missing
  }

  if (
    normalized === "medium" ||
    normalized === "moderate" ||
    normalized === "μέτρια" ||
    normalized === "μεσαία" ||
    normalized === "μετρια"
  ) {
    return texts.supplyLevels.medium
  }

  if (
    normalized === "full" ||
    normalized === "ok" ||
    normalized === "good" ||
    normalized === "πλήρης" ||
    normalized === "πληρης" ||
    normalized === "γεμάτο" ||
    normalized === "γεματο"
  ) {
    return texts.supplyLevels.full
  }

  return texts.supplyLevels.unknown
}

function answerValueLabel(
  answer: TaskChecklistAnswer,
  texts: ReturnType<typeof getTaskDetailsPageTexts>,
  language: "el" | "en"
) {
  if (answer.valueBoolean !== null && answer.valueBoolean !== undefined) {
    return answer.valueBoolean ? texts.common.yes : texts.common.no
  }

  if (answer.valueSelect) {
    return getSupplyLevelLabel(answer.valueSelect, texts)
  }

  if (answer.valueNumber !== null && answer.valueNumber !== undefined) {
    return String(answer.valueNumber)
  }

  if (answer.valueText) {
    return normalizeFreeTextByLanguage(answer.valueText, language)
  }

  if (answer.issueCreated) {
    return language === "en" ? "Issue created" : "Δημιουργήθηκε θέμα"
  }

  return texts.common.noAnswer
}

function getChecklistSentLabel(params: {
  run?: TaskChecklistRun | null
  isEnabled: boolean
  activeAssignment?: TaskAssignment | null
  texts: ReturnType<typeof getTaskDetailsPageTexts>
}) {
  return isChecklistActuallySent(params)
    ? params.texts.common.active
    : params.texts.common.inactive
}
function buildActivityAssignmentMessage(
  language: "el" | "en",
  partnerName: string,
  taskTitle: string
) {
  const uiTaskTitle = normalizeSystemGeneratedTaskTitle(taskTitle, language)

  if (language === "en") {
    return `Task "${uiTaskTitle}" was assigned to partner ${partnerName}.`
  }

  return `Η εργασία "${uiTaskTitle}" ανατέθηκε στον συνεργάτη ${partnerName}.`
}

function buildActivityAcceptedMessage(
  language: "el" | "en",
  partnerName: string,
  taskTitle: string
) {
  const uiTaskTitle = normalizeSystemGeneratedTaskTitle(taskTitle, language)

  if (language === "en") {
    return `Partner ${partnerName} accepted task "${uiTaskTitle}" from the portal.`
  }

  return `Ο συνεργάτης ${partnerName} αποδέχτηκε την εργασία "${uiTaskTitle}" από το portal.`
}

function buildActivityRejectedMessage(
  language: "el" | "en",
  partnerName: string,
  taskTitle: string
) {
  const uiTaskTitle = normalizeSystemGeneratedTaskTitle(taskTitle, language)

  if (language === "en") {
    return `Partner ${partnerName} rejected task "${uiTaskTitle}" from the portal.`
  }

  return `Ο συνεργάτης ${partnerName} απέρριψε την εργασία "${uiTaskTitle}" από το portal.`
}

function buildActivityCleaningSubmittedMessage(
  language: "el" | "en",
  partnerName: string
) {
  if (language === "en") {
    return `Partner ${partnerName} submitted the cleaning list from the portal.`
  }

  return `Ο συνεργάτης ${partnerName} υπέβαλε τη λίστα καθαριότητας από το portal.`
}

function buildActivitySuppliesSubmittedMessage(
  language: "el" | "en",
  partnerName: string
) {
  if (language === "en") {
    return `Partner ${partnerName} submitted the supplies from the portal.`
  }

  return `Ο συνεργάτης ${partnerName} υπέβαλε τα αναλώσιμα από το portal.`
}

function buildActivityIssuesSubmittedMessage(
  language: "el" | "en",
  partnerName: string
) {
  if (language === "en") {
    return `Partner ${partnerName} submitted the issues and damages list from the portal.`
  }

  return `Ο συνεργάτης ${partnerName} υπέβαλε τη λίστα βλαβών και ζημιών από το portal.`
}

function buildActivityPhotoUploadedMessage(
  language: "el" | "en",
  partnerName: string,
  itemLabel: string
) {
  if (language === "en") {
    return `Partner ${partnerName} uploaded a photo for item "${itemLabel}".`
  }

  return `Ο συνεργάτης ${partnerName} ανέβασε φωτογραφία για το στοιχείο "${itemLabel}".`
}

function buildActivityTaskCreatedFromBookingMessage(
  language: "el" | "en",
  bookingCode: string
) {
  if (language === "en") {
    return `Task was created from booking ${bookingCode}.`
  }

  return `Δημιουργήθηκε εργασία από την κράτηση ${bookingCode}.`
}

function cleanupActivityMessageText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\s+,/g, ",")
    .trim()
}

function normalizeQuotedText(value: string) {
  return value.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim()
}

function tryTranslateGenericActivityMessage(rawMessage: string, language: "el" | "en") {
  let message = normalizeQuotedText(rawMessage)
  if (!message) return ""

  const translatedTaskTitle = (title: string) =>
    normalizeSystemGeneratedTaskTitle(normalizeQuotedText(title), language)

  let match =
    message.match(/^Partner\s+(.+?)\s+submitted the supplies from the portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+υπέβαλε τα αναλώσιμα από το portal\.?$/i)
  if (match?.[1]) {
    return buildActivitySuppliesSubmittedMessage(language, match[1].trim())
  }

  match =
    message.match(/^Partner\s+(.+?)\s+submitted the cleaning list from the portal\.?$/i) ||
    message.match(/^Partner\s+(.+?)\s+submitted the checklist from the portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+υπέβαλε τη λίστα καθαριότητας από το portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+υπέβαλε τη λίστα από το portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+υπέβαλε τη checklist από το portal\.?$/i)
  if (match?.[1]) {
    return buildActivityCleaningSubmittedMessage(language, match[1].trim())
  }

  match =
    message.match(/^Partner\s+(.+?)\s+submitted the issues list from the portal\.?$/i) ||
    message.match(/^Partner\s+(.+?)\s+submitted the issues and damages list from the portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+υπέβαλε τη λίστα βλαβών από το portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+υπέβαλε τη λίστα βλαβών και ζημιών από το portal\.?$/i)
  if (match?.[1]) {
    return buildActivityIssuesSubmittedMessage(language, match[1].trim())
  }

  match =
    message.match(/^Partner\s+(.+?)\s+uploaded a photo for item\s+"(.+)"\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+ανέβασε φωτογραφία για το στοιχείο\s+"(.+)"\.?$/i)
  if (match?.[1] && match?.[2]) {
    return buildActivityPhotoUploadedMessage(language, match[1].trim(), match[2].trim())
  }

  match =
    message.match(/^Partner\s+(.+?)\s+accepted task\s+"(.+)"\s+from the portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+αποδέχτηκε την εργασία\s+"(.+)"\s+από το portal\.?$/i) ||
    message.match(/^Partner\s+(.+?)\s+αποδέχτηκε την εργασία\s+"(.+)"\s+from the portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+accepted task\s+"(.+)"\s+από το portal\.?$/i)
  if (match?.[1] && match?.[2]) {
    return buildActivityAcceptedMessage(language, match[1].trim(), translatedTaskTitle(match[2]))
  }

  match =
    message.match(/^Partner\s+(.+?)\s+rejected task\s+"(.+)"\s+from the portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+απέρριψε την εργασία\s+"(.+)"\s+από το portal\.?$/i) ||
    message.match(/^Partner\s+(.+?)\s+απέρριψε την εργασία\s+"(.+)"\s+from the portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+rejected task\s+"(.+)"\s+από το portal\.?$/i)
  if (match?.[1] && match?.[2]) {
    return buildActivityRejectedMessage(language, match[1].trim(), translatedTaskTitle(match[2]))
  }

  match =
    message.match(/^Task\s+"(.+)"\s+was assigned to partner\s+(.+)\.?$/i) ||
    message.match(/^Η εργασία\s+"(.+)"\s+ανατέθηκε στον συνεργάτη\s+(.+)\.?$/i)
  if (match?.[1] && match?.[2]) {
    return buildActivityAssignmentMessage(language, match[2].trim(), translatedTaskTitle(match[1]))
  }

  match =
    message.match(/^Task was created from booking\s+(.+)\.?$/i) ||
    message.match(/^Δημιουργήθηκε εργασία από την κράτηση\s+(.+)\.?$/i)
  if (match?.[1]) {
    return buildActivityTaskCreatedFromBookingMessage(language, match[1].trim())
  }

  if (language === "el") {
    message = message
      .replace(/^Partner\s+/i, "Ο συνεργάτης ")
      .replace(/\s+submitted the supplies from the portal\.?$/i, " υπέβαλε τα αναλώσιμα από το portal.")
      .replace(/\s+submitted the cleaning list from the portal\.?$/i, " υπέβαλε τη λίστα καθαριότητας από το portal.")
      .replace(/\s+submitted the checklist from the portal\.?$/i, " υπέβαλε τη λίστα καθαριότητας από το portal.")
      .replace(/\s+submitted the issues list from the portal\.?$/i, " υπέβαλε τη λίστα βλαβών και ζημιών από το portal.")
      .replace(/\s+submitted the issues and damages list from the portal\.?$/i, " υπέβαλε τη λίστα βλαβών και ζημιών από το portal.")
      .replace(/\s+uploaded a photo for item\s+/i, ' ανέβασε φωτογραφία για το στοιχείο ')
      .replace(/\s+accepted task\s+/i, ' αποδέχτηκε την εργασία ')
      .replace(/\s+rejected task\s+/i, ' απέρριψε την εργασία ')
      .replace(/\s+from the portal\.?$/i, " από το portal.")
      .replace(/^Task\s+"/i, 'Η εργασία "')
      .replace(/"\s+was assigned to partner\s+/i, '" ανατέθηκε στον συνεργάτη ')
      .replace(/^Task was created from booking\s+/i, "Δημιουργήθηκε εργασία από την κράτηση ")

    return cleanupActivityMessageText(message)
  }

  message = message
    .replace(/^Ο συνεργάτης\s+/i, "Partner ")
    .replace(/\s+υπέβαλε τα αναλώσιμα από το portal\.?$/i, " submitted the supplies from the portal.")
    .replace(/\s+υπέβαλε τη λίστα καθαριότητας από το portal\.?$/i, " submitted the cleaning list from the portal.")
    .replace(/\s+υπέβαλε τη λίστα από το portal\.?$/i, " submitted the cleaning list from the portal.")
    .replace(/\s+υπέβαλε τη checklist από το portal\.?$/i, " submitted the cleaning list from the portal.")
    .replace(/\s+υπέβαλε τη λίστα βλαβών από το portal\.?$/i, " submitted the issues and damages list from the portal.")
    .replace(/\s+υπέβαλε τη λίστα βλαβών και ζημιών από το portal\.?$/i, " submitted the issues and damages list from the portal.")
    .replace(/\s+ανέβασε φωτογραφία για το στοιχείο\s+/i, ' uploaded a photo for item ')
    .replace(/\s+αποδέχτηκε την εργασία\s+/i, ' accepted task ')
    .replace(/\s+απέρριψε την εργασία\s+/i, ' rejected task ')
    .replace(/\s+από το portal\.?$/i, " from the portal.")
    .replace(/^Η εργασία\s+"/i, 'Task "')
    .replace(/"\s+ανατέθηκε στον συνεργάτη\s+/i, '" was assigned to partner ')
    .replace(/^Δημιουργήθηκε εργασία από την κράτηση\s+/i, "Task was created from booking ")

  return cleanupActivityMessageText(message)
}

function normalizeActivityMessage(log: ActivityLog, language: "el" | "en") {
  const rawMessage = String(log.message || "").trim()
  if (!rawMessage) return ""

  const normalized = tryTranslateGenericActivityMessage(rawMessage, language)
  return cleanupActivityMessageText(normalized)
}

function normalizeConditionTypeLabel(value: unknown, language: "el" | "en") {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "supply" || normalized === "supplies") return language === "en" ? "Supply" : "Αναλώσιμο"
  if (normalized === "issue") return language === "en" ? "Issue" : "Θέμα"
  if (normalized === "damage") return language === "en" ? "Damage" : "Ζημιά"
  return String(value ?? "").trim() || getLanguageUnknownLabel(language)
}

function normalizeConditionStatusLabel(value: unknown, language: "el" | "en") {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "open") return language === "en" ? "Open" : "Ανοιχτό"
  if (normalized === "monitoring") return language === "en" ? "Monitoring" : "Παρακολούθηση"
  if (normalized === "resolved") return language === "en" ? "Resolved" : "Επιλύθηκε"
  if (normalized === "dismissed") return language === "en" ? "Dismissed" : "Απορρίφθηκε"
  return String(value ?? "").trim() || getLanguageUnknownLabel(language)
}

function normalizeBlockingStatusLabel(value: unknown, language: "el" | "en") {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "blocking") return language === "en" ? "Blocking" : "Μπλοκάρει"
  if (normalized === "non_blocking") return language === "en" ? "Non blocking" : "Μη μπλοκάρον"
  if (normalized === "warning") return language === "en" ? "Warning" : "Προειδοποίηση"
  return String(value ?? "").trim() || getLanguageUnknownLabel(language)
}

function normalizeSeverityLabel(value: unknown, language: "el" | "en") {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "low") return language === "en" ? "Low" : "Χαμηλή"
  if (normalized === "medium") return language === "en" ? "Medium" : "Μεσαία"
  if (normalized === "high") return language === "en" ? "High" : "Υψηλή"
  if (normalized === "critical") return language === "en" ? "Critical" : "Κρίσιμη"
  return String(value ?? "").trim() || getLanguageUnknownLabel(language)
}

function normalizeManagerDecisionLabel(value: unknown, language: "el" | "en") {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "allow_with_issue") return language === "en" ? "Allow with issue" : "Επιτρέπεται με θέμα"
  if (normalized === "block_until_resolved") return language === "en" ? "Block until resolved" : "Μπλοκάρισμα μέχρι επίλυση"
  if (normalized === "monitor") return language === "en" ? "Monitor" : "Παρακολούθηση"
  if (normalized === "resolved") return language === "en" ? "Resolved" : "Επιλύθηκε"
  if (normalized === "dismissed") return language === "en" ? "Dismissed" : "Απορρίφθηκε"
  return String(value ?? "").trim() || getLanguageUnknownLabel(language)
}

function getReadinessLabel(value: unknown, language: "el" | "en") {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "ready") return language === "en" ? "Ready" : "Έτοιμο"
  if (normalized === "borderline") return language === "en" ? "Borderline" : "Οριακό"
  if (normalized === "not_ready") return language === "en" ? "Not ready" : "Μη έτοιμο"
  if (normalized === "unknown") return language === "en" ? "Unknown" : "Άγνωστο"
  return String(value ?? "").trim() || getLanguageUnknownLabel(language)
}

function getReadinessTone(value: unknown): "green" | "amber" | "red" | "slate" {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "ready") return "green"
  if (normalized === "borderline") return "amber"
  if (normalized === "not_ready") return "red"
  return "slate"
}

function getSeverityTone(value: unknown): "green" | "amber" | "red" | "slate" {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "low") return "green"
  if (normalized === "medium") return "amber"
  if (normalized === "high" || normalized === "critical") return "red"
  return "slate"
}

function getBlockingTone(value: unknown): "red" | "amber" | "slate" {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "blocking") return "red"
  if (normalized === "warning") return "amber"
  return "slate"
}

function getConditionCreatedByTask(condition: PropertyCondition, taskId: string) {
  return (
    condition.sourceTaskId === taskId ||
    condition.taskId === taskId ||
    condition.createdFromTaskId === taskId ||
    condition.originTaskId === taskId
  )
}

function getWarningMessage(warning: TaskWarning | string, language: "el" | "en") {
  if (typeof warning === "string") return warning
  return (
    warning.message ||
    warning.title ||
    warning.code ||
    (language === "en" ? "Warning" : "Προειδοποίηση")
  )
}

type ParsedTaskResponse = {
  error?: string
  message?: string
  task?: TaskDetails
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

  if (payload.task) {
    return payload.task
  }

  if ("id" in payload && typeof payload.id === "string") {
    return payload as unknown as TaskDetails
  }

  return null
}

function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode
  tone?: "slate" | "blue" | "amber" | "green" | "red" | "violet"
}) {
  const tones: Record<string, string> = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tones[tone]
      )}
    >
      {children}
    </span>
  )
}

function HelpDot({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-slate-300 text-[11px] text-slate-500">
        ?
      </span>

      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700 opacity-0 shadow-lg transition duration-150 group-hover:opacity-100">
        {text}
      </span>
    </span>
  )
}

function FieldCard({
  label,
  value,
  help,
}: {
  label: string
  value: string
  help?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {help ? <HelpDot text={help} /> : null}
      </div>
      <p className="break-words text-sm font-semibold text-slate-950">{value || "—"}</p>
    </div>
  )
}

function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-4xl",
  showHeaderClose = true,
  closeLabel = "Κλείσιμο",
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  maxWidth?: string
  showHeaderClose?: boolean
  closeLabel?: string
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8">
      <div className={cn("w-full rounded-3xl bg-white shadow-2xl", maxWidth)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>

          {showHeaderClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {closeLabel}
            </button>
          ) : null}
        </div>

        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  )
}

function getSuppliesPreviewDescription(
  item: {
    description?: string | null
    category?: string | null
  },
  language: "el" | "en"
) {
  const description = String(item.description ?? "").trim()
  const category = String(item.category ?? "").trim()

  if (description) {
    return normalizeSupplyCategoryForUi(description, language)
  }

  if (category) {
    return normalizeSupplyCategoryForUi(category, language)
  }

  return ""
}

function getIssuesPreviewDescription(
  item: {
    description?: string | null
    category?: string | null
    issueTypeOnFail?: string | null
    issueSeverityOnFail?: string | null
  },
  language: "el" | "en"
) {
  const parts: string[] = []

  if (item.description?.trim()) {
    parts.push(item.description.trim())
  }

  if (item.category?.trim()) {
    parts.push(item.category.trim())
  }

  if (item.issueTypeOnFail?.trim()) {
    parts.push(normalizeConditionTypeLabel(item.issueTypeOnFail, language))
  }

  if (item.issueSeverityOnFail?.trim()) {
    parts.push(normalizeSeverityLabel(item.issueSeverityOnFail, language))
  }

  return parts.filter(Boolean).join(" · ")
}
function SubmittedAnswersView({
  run,
  submitted,
  submittedAtOverride,
  locale,
  emptyText,
  onClose,
  texts,
  language,
  checklistKind,
}: {
  run?: TaskChecklistRun | null
  submitted: boolean
  submittedAtOverride?: string | null
  locale: string
  emptyText: string
  onClose: () => void
  texts: ReturnType<typeof getTaskDetailsPageTexts>
  language: "el" | "en"
  checklistKind: "cleaning" | "supplies" | "issues"
}) {
  if (!submitted) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
          {emptyText}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {texts.common.close}
          </button>
        </div>
      </div>
    )
  }

  const answers = (run?.answers || []).filter((answer) => answerHasData(answer))
  const effectiveSubmittedAt = submittedAtOverride || getRunSubmittedAt(run)
  const submittedAt = formatDateTime(effectiveSubmittedAt, locale, texts.common.dash)

  const getKindBadge = () => {
    if (checklistKind === "cleaning") {
      return language === "en" ? "Cleaning" : "Καθαριότητα"
    }
    if (checklistKind === "supplies") {
      return language === "en" ? "Supplies" : "Αναλώσιμα"
    }
    return language === "en" ? "Issues / Damages" : "Βλάβες / Ζημιές"
  }

  const getIssueCreatedLabel = () => {
    return language === "en" ? "Issue created from this answer" : "Δημιουργήθηκε θέμα από αυτή την απάντηση"
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="green">{texts.answers.submittedBanner}</Badge>
          <Badge tone="blue">{getKindBadge()}</Badge>
          <p className="text-sm text-slate-700">
            {texts.answers.submittedAtLabel}: {submittedAt}
          </p>
        </div>
      </div>

      {answers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
          {texts.answers.noAnswersReturned}
        </div>
      ) : (
        <div className="space-y-4">
          {answers.map((answer) => {
            const photos = getAnswerPhotos(answer)
            const cleanedNote = answer.note?.trim() || ""
            const shouldHideSystemSupplyNote =
              cleanedNote === texts.lists.hiddenSystemSupplyNote ||
              cleanedNote === "Ενεργοποιήθηκε από τη διαχείριση λίστας αναλωσίμων." ||
              cleanedNote === "Activated from supplies list management."

            return (
              <div key={answer.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {answer.itemLabel || texts.answers.listItemFallback}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {answerValueLabel(answer, texts, language)}
                    </p>
                  </div>

                  {answer.createdAt || answer.updatedAt ? (
                    <p className="text-xs text-slate-500">
                      {formatDateTime(
                        answer.updatedAt || answer.createdAt,
                        locale,
                        texts.common.dash
                      )}
                    </p>
                  ) : null}
                </div>

                {answer.issueCreated ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone="amber">{getIssueCreatedLabel()}</Badge>
                    {answer.linkedSupplyItemId ? (
                      <Badge tone="violet">
                        {language === "en" ? "Linked supply item" : "Συνδεδεμένο αναλώσιμο"}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}

                {cleanedNote && !shouldHideSystemSupplyNote ? (
                  <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {texts.answers.note}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {normalizeFreeTextByLanguage(cleanedNote, language)}
                    </p>
                  </div>
                ) : null}

                {photos.length > 0 ? (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {texts.answers.photos}
                      </p>
                      <HelpDot text={texts.answers.openPhotoTitle} />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {photos.map((photo, index) => (
                        <a
                          key={`${answer.id}-photo-${index}`}
                          href={photo}
                          target="_blank"
                          rel="noreferrer"
                          className="group overflow-hidden rounded-2xl border border-slate-200 bg-white"
                          title={texts.answers.openPhotoTitle}
                        >
                          <img
                            src={photo}
                            alt={`${texts.answers.photoLabel} ${index + 1}`}
                            className="h-44 w-full object-cover transition group-hover:scale-[1.02]"
                          />
                          <div className="border-t border-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                            {texts.answers.photoLabel} {index + 1}
                          </div>
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
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {texts.common.close}
        </button>
      </div>
    </div>
  )
}

function getChecklistModalTexts(
  kind: "cleaning" | "supplies" | "issues",
  texts: ReturnType<typeof getTaskDetailsPageTexts>,
  language: "el" | "en"
) {
  if (kind === "cleaning") {
    return {
      title: texts.answers.modalCleaningAnswersTitle,
      description: texts.answers.modalCleaningAnswersDescription,
      emptyText: texts.answers.noCleaningSubmission,
      submittedTitle: texts.answers.cleaningSubmittedTitle,
      submittedHelp: texts.answers.cleaningSubmissionHelp,
    }
  }

  if (kind === "supplies") {
    return {
      title: texts.answers.modalSuppliesAnswersTitle,
      description: texts.answers.modalSuppliesAnswersDescription,
      emptyText: texts.answers.noSuppliesSubmission,
      submittedTitle: texts.answers.suppliesSubmittedTitle,
      submittedHelp: texts.answers.suppliesSubmissionHelp,
    }
  }

  return {
    title:
      language === "en"
        ? "Submitted issues and damages"
        : "Υποβληθείσες βλάβες και ζημιές",
    description:
      language === "en"
        ? "View the answers and photos submitted by the partner for the issues and damages list."
        : "Δες τις απαντήσεις και τις φωτογραφίες που υπέβαλε ο συνεργάτης για τη λίστα βλαβών και ζημιών.",
    emptyText:
      language === "en"
        ? "No submission has been returned yet for the issues and damages list."
        : "Δεν έχει επιστραφεί ακόμη υποβολή για τη λίστα βλαβών και ζημιών.",
    submittedTitle:
      language === "en"
        ? "Issues and damages submission"
        : "Υποβολή βλαβών και ζημιών",
    submittedHelp:
      language === "en"
        ? "View what the partner submitted for the issues and damages list."
        : "Δες τι υπέβαλε ο συνεργάτης για τη λίστα βλαβών και ζημιών.",
  }
}

function getChecklistPreviewTexts(
  kind: "cleaning" | "supplies" | "issues",
  texts: ReturnType<typeof getTaskDetailsPageTexts>,
  language: "el" | "en"
) {
  if (kind === "cleaning") {
    return {
      title: texts.lists.modalCleaningPreviewTitle,
      description: texts.lists.modalCleaningPreviewDescription,
      sectionTitle: texts.lists.cleaningListTitle,
      defaultTitle: texts.lists.cleaningDefaultTitle,
    }
  }

  if (kind === "supplies") {
    return {
      title: texts.lists.modalSuppliesPreviewTitle,
      description: texts.lists.modalSuppliesPreviewDescription,
      sectionTitle: texts.lists.suppliesListTitle,
      defaultTitle: texts.lists.suppliesDefaultTitle,
    }
  }

  return {
    title:
      language === "en"
        ? "Issues and damages list preview"
        : "Προεπισκόπηση λίστας βλαβών και ζημιών",
    description:
      language === "en"
        ? "Preview the issues and damages list that is sent for this task."
        : "Προεπισκόπηση της λίστας βλαβών και ζημιών που αποστέλλεται για αυτή την εργασία.",
    sectionTitle:
      language === "en" ? "Issues and damages list" : "Λίστα βλαβών και ζημιών",
    defaultTitle:
      language === "en" ? "Issues and damages list" : "Λίστα βλαβών και ζημιών",
  }
}

function getChecklistCardTexts(
  kind: "cleaning" | "supplies" | "issues",
  texts: ReturnType<typeof getTaskDetailsPageTexts>,
  language: "el" | "en"
) {
  if (kind === "cleaning") {
    return {
      title: texts.lists.cleaningListTitle,
      help: texts.lists.cleaningCardHelp,
    }
  }

  if (kind === "supplies") {
    return {
      title: texts.lists.suppliesListTitle,
      help: texts.lists.suppliesCardHelp,
    }
  }

  return {
    title:
      language === "en" ? "Issues and damages list" : "Λίστα βλαβών και ζημιών",
    help:
      language === "en"
        ? "Shows the task-level list for issues, damages and repair findings that can be sent to the partner."
        : "Δείχνει τη task-level λίστα για βλάβες, ζημιές και τεχνικά ευρήματα που μπορεί να σταλεί στον συνεργάτη.",
  }
}

function getChecklistSubmittedStatusText(
  submitted: boolean,
  texts: ReturnType<typeof getTaskDetailsPageTexts>
) {
  return submitted ? texts.common.submitted : texts.common.notSubmitted
}

function getChecklistCompletionBadgeText(
  submitted: boolean,
  run: TaskChecklistRun | null | undefined,
  language: "el" | "en"
) {
  if (submitted) {
    return language === "en" ? "Completed" : "Ολοκληρώθηκε"
  }

  if (!run) {
    return language === "en" ? "Not started" : "Δεν ξεκίνησε"
  }

  return normalizeFreeTextByLanguage(
    getChecklistStatusLabel(language, normalizeChecklistStatus(run.status)),
    language
  )
}

function getChecklistEnabledFlag(params: {
  kind: "cleaning" | "supplies" | "issues"
  task: TaskDetails | null
  run?: TaskChecklistRun | null
}) {
  const { kind, task, run } = params

  if (kind === "cleaning") {
    return Boolean(task?.sendCleaningChecklist ?? run?.isActive)
  }

  if (kind === "supplies") {
    return Boolean(
      task?.sendSuppliesChecklist ??
        run?.isActive ??
        task?.propertyLists?.supplies?.availableOnProperty
    )
  }

  return Boolean(
    task?.sendIssuesChecklist ??
      run?.isActive ??
      task?.propertyLists?.issues?.availableOnProperty ??
      (task?.propertyLists?.issues?.activeIssuesCount || 0) > 0
  )
}

function getChecklistPreviewItems(params: {
  kind: "cleaning" | "supplies" | "issues"
  task: TaskDetails | null
  run?: TaskChecklistRun | null
  language: "el" | "en"
}) {
  const { kind, task, run, language } = params

  if (kind === "cleaning") {
    return (run?.items || task?.propertyLists?.cleaning?.primaryTemplate?.items || []).map(
      (item, index) => ({
        id: item.id || `cleaning-${index}`,
        label: item.label || "",
        description: item.description || "",
        category: item.category || "",
        itemType: item.itemType || "boolean",
        requiresPhoto: Boolean(item.requiresPhoto),
        isRequired: Boolean(item.isRequired),
        issueTypeOnFail: item.issueTypeOnFail || null,
        issueSeverityOnFail: item.issueSeverityOnFail || null,
      })
    )
  }

  if (kind === "supplies") {
    if (run?.items?.length) {
      return run.items.map((item, index) => ({
        id: item.id || `run-supply-${index}`,
        label: item.label || "",
        description: item.description || "",
        category: item.category || "",
        itemType: item.itemType || "select",
        requiresPhoto: Boolean(item.requiresPhoto),
        isRequired: Boolean(item.isRequired),
        issueTypeOnFail: item.issueTypeOnFail || null,
        issueSeverityOnFail: item.issueSeverityOnFail || null,
      }))
    }

    return (
      task?.propertyLists?.supplies?.items?.map((item, index) => ({
        id: item.id || `supply-${index}`,
        label: resolveSupplyDisplayName(language, item.supplyItem),
        description: item.supplyItem.category || "",
        category: item.supplyItem.category || "",
        itemType: "select",
        requiresPhoto: false,
        isRequired: false,
        issueTypeOnFail: null,
        issueSeverityOnFail: null,
      })) || []
    )
  }

  if (run?.items?.length) {
    return run.items.map((item, index) => ({
      id: item.id || `run-issue-${index}`,
      label: item.label || "",
      description: item.description || "",
      category: item.category || "",
      itemType: item.itemType || "text",
      requiresPhoto: Boolean(item.requiresPhoto),
      isRequired: Boolean(item.isRequired),
      issueTypeOnFail: item.issueTypeOnFail || null,
      issueSeverityOnFail: item.issueSeverityOnFail || null,
    }))
  }

  return (
    task?.propertyLists?.issues?.items?.map((item, index) => ({
      id: item.id || `issue-${index}`,
      label: item.title || `${language === "en" ? "Issue" : "Θέμα"} ${index + 1}`,
      description: item.description || "",
      category: item.issueType || "",
      itemType: "text",
      requiresPhoto: false,
      isRequired: false,
      issueTypeOnFail: item.issueType || null,
      issueSeverityOnFail: item.severity || null,
    })) || []
  )
}
export default function TaskDetailsPage() {
  const params = useParams<{ taskId: string }>()
  const taskId = String(params?.taskId || "")
  const { language } = useAppLanguage()
  const texts = getTaskDetailsPageTexts(language)
  const locale = texts.locale

  const [task, setTask] = useState<TaskDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<string | null>(null)

  const [openScheduleModal, setOpenScheduleModal] = useState(false)
  const [openAssignmentModal, setOpenAssignmentModal] = useState(false)
  const [openCleaningPreviewModal, setOpenCleaningPreviewModal] = useState(false)
  const [openSuppliesPreviewModal, setOpenSuppliesPreviewModal] = useState(false)
  const [openIssuesPreviewModal, setOpenIssuesPreviewModal] = useState(false)
  const [openChecklistEditorModal, setOpenChecklistEditorModal] = useState(false)
  const [openCleaningAnswersModal, setOpenCleaningAnswersModal] = useState(false)
  const [openSuppliesAnswersModal, setOpenSuppliesAnswersModal] = useState(false)
  const [openIssuesAnswersModal, setOpenIssuesAnswersModal] = useState(false)

  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>({
    scheduledDate: "",
    scheduledStartTime: "",
    scheduledEndTime: "",
  })

  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>({
    partnerId: "",
    notes: "",
  })

  const [checklistEditor, setChecklistEditor] = useState<ChecklistEditorState>({
    checklistKey: null,
    title: "",
    active: false,
    items: [],
  })

  const [savingSchedule, setSavingSchedule] = useState(false)
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [savingChecklistEditor, setSavingChecklistEditor] = useState(false)

  async function loadTask() {
    try {
      setLoading(true)
      setError(null)
      setPageMessage(null)

      const res = await fetch(`/api/tasks/${taskId}`, {
        cache: "no-store",
      })

      const raw = await res.text()
      const json = parseJsonSafely(raw)

      if (!res.ok) {
        throw new Error(json?.error || raw || texts.common.loadingErrorFallback)
      }

      const nextTask = extractTaskDetails(json)

      if (!nextTask) {
        throw new Error(texts.common.loadingErrorFallback)
      }
      setTask(nextTask)

      setScheduleForm({
        scheduledDate: toDateInputValue(nextTask?.scheduledDate),
        scheduledStartTime: nextTask?.scheduledStartTime?.slice(0, 5) || "",
        scheduledEndTime: nextTask?.scheduledEndTime?.slice(0, 5) || "",
      })

      setAssignmentForm({
        partnerId:
          getActiveAssignment(nextTask?.assignments)?.partner?.id ||
          nextTask?.property?.defaultPartner?.id ||
          "",
        notes: getActiveAssignment(nextTask?.assignments)?.notes || "",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.common.loadingErrorFallback)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!taskId) return
    void loadTask()
  }, [taskId, language])

  const activeAssignment = useMemo(
    () => getActiveAssignment(task?.assignments),
    [task?.assignments]
  )

  const resolvedRuns = useMemo(() => resolveChecklistRuns(task), [task])
  const cleaningRun = resolvedRuns.cleaning
  const suppliesRun = resolvedRuns.supplies
  const issuesRun = resolvedRuns.issues

  const uiTaskTitle = useMemo(() => {
    return normalizeSystemGeneratedTaskTitle(task?.title, language)
  }, [task?.title, language])

  const propertyAddress = useMemo(() => {
    return [
      task?.property?.address,
      task?.property?.city,
      task?.property?.region,
      task?.property?.country,
    ]
      .filter(Boolean)
      .join(", ")
  }, [task?.property])

  const taskStatusTone = useMemo(() => {
    const status = normalizeTaskStatusForUi(task?.status)
    if (status === "completed") return "green"
    if (status === "cancelled") return "red"
    if (status === "in_progress") return "blue"
    if (status === "pending" || status === "assigned") return "amber"
    return "slate"
  }, [task?.status])

  const cleaningSubmittedAt = useMemo(() => {
    return (
      getRunSubmittedAt(cleaningRun) ||
      getSubmissionTimeFromActivityLogs(task?.activityLogs, "cleaning")
    )
  }, [cleaningRun, task?.activityLogs])

  const suppliesSubmittedAt = useMemo(() => {
    return (
      getRunSubmittedAt(suppliesRun) ||
      getSubmissionTimeFromActivityLogs(task?.activityLogs, "supplies")
    )
  }, [suppliesRun, task?.activityLogs])

  const issuesSubmittedAt = useMemo(() => {
    return (
      getRunSubmittedAt(issuesRun) ||
      getSubmissionTimeFromActivityLogs(task?.activityLogs, "issues")
    )
  }, [issuesRun, task?.activityLogs])

  const cleaningSubmitted = useMemo(() => {
    return Boolean(cleaningSubmittedAt) || runHasSubmission(cleaningRun)
  }, [cleaningSubmittedAt, cleaningRun])

  const suppliesSubmitted = useMemo(() => {
    return Boolean(suppliesSubmittedAt) || runHasSubmission(suppliesRun)
  }, [suppliesSubmittedAt, suppliesRun])

  const issuesSubmitted = useMemo(() => {
    return Boolean(issuesSubmittedAt) || runHasSubmission(issuesRun)
  }, [issuesSubmittedAt, issuesRun])

  const cleaningEnabled = useMemo(
    () =>
      getChecklistEnabledFlag({
        kind: "cleaning",
        task,
        run: cleaningRun,
      }),
    [task, cleaningRun]
  )

  const suppliesEnabled = useMemo(
    () =>
      getChecklistEnabledFlag({
        kind: "supplies",
        task,
        run: suppliesRun,
      }),
    [task, suppliesRun]
  )

  const issuesEnabled = useMemo(
    () =>
      getChecklistEnabledFlag({
        kind: "issues",
        task,
        run: issuesRun,
      }),
    [task, issuesRun]
  )

  const cleaningSentLabel = getChecklistSentLabel({
    run: cleaningRun,
    isEnabled: cleaningEnabled,
    activeAssignment,
    texts,
  })

  const suppliesSentLabel = getChecklistSentLabel({
    run: suppliesRun,
    isEnabled: suppliesEnabled,
    activeAssignment,
    texts,
  })

  const issuesSentLabel = getChecklistSentLabel({
    run: issuesRun,
    isEnabled: issuesEnabled,
    activeAssignment,
    texts,
  })

  const cleaningPreviewItems = useMemo(() => {
    return getChecklistPreviewItems({
      kind: "cleaning",
      task,
      run: cleaningRun,
      language,
    })
  }, [task, cleaningRun, language])

  const suppliesPreviewItems = useMemo(() => {
    return getChecklistPreviewItems({
      kind: "supplies",
      task,
      run: suppliesRun,
      language,
    })
  }, [task, suppliesRun, language])

  const issuesPreviewItems = useMemo(() => {
    return getChecklistPreviewItems({
      kind: "issues",
      task,
      run: issuesRun,
      language,
    })
  }, [task, issuesRun, language])

  const cleaningListTitle = useMemo(() => {
    return normalizeChecklistTitleForUi(
      cleaningRun?.template?.title ||
        cleaningRun?.title ||
        task?.propertyLists?.cleaning?.primaryTemplate?.title,
      texts.lists.cleaningDefaultTitle,
      language
    )
  }, [
    cleaningRun?.template?.title,
    cleaningRun?.title,
    task?.propertyLists?.cleaning?.primaryTemplate?.title,
    texts.lists.cleaningDefaultTitle,
    language,
  ])

  const suppliesListTitle = useMemo(() => {
    return normalizeChecklistTitleForUi(
      suppliesRun?.title || suppliesRun?.template?.title || suppliesRun?.template?.name,
      texts.lists.suppliesDefaultTitle,
      language
    )
  }, [suppliesRun?.title, suppliesRun?.template?.title, suppliesRun?.template?.name, texts.lists.suppliesDefaultTitle, language])

  const issuesListTitle = useMemo(() => {
    return normalizeChecklistTitleForUi(
      issuesRun?.title || issuesRun?.template?.title || issuesRun?.template?.name,
      language === "en" ? "Issues and damages list" : "Λίστα βλαβών και ζημιών",
      language
    )
  }, [issuesRun?.title, issuesRun?.template?.title, issuesRun?.template?.name, language])

  const propertyConditions = useMemo(() => task?.propertyConditions || [], [task?.propertyConditions])
  const issues = useMemo(() => task?.issues || [], [task?.issues])
  const warnings = useMemo(() => task?.warnings || [], [task?.warnings])
  const readiness = useMemo(() => task?.readiness || null, [task?.readiness])

  const conditionsCreatedByTask = useMemo(() => {
    if (!task?.id) return []
    return propertyConditions.filter((condition) => getConditionCreatedByTask(condition, task.id))
  }, [propertyConditions, task?.id])

  function openCleaningEditor() {
    setChecklistEditor({
      checklistKey: "cleaning",
      title: texts.lists.cleaningListTitle,
      active: cleaningEnabled,
      items: buildEditableItemsFromCleaningSource(task),
    })
    setOpenChecklistEditorModal(true)
  }

  function openIssuesEditor() {
    setChecklistEditor({
      checklistKey: "issues",
      title: language === "en" ? "Issues and damages list" : "Λίστα βλαβών και ζημιών",
      active: issuesEnabled,
      items: buildEditableItemsFromIssuesSource(task),
    })
    setOpenChecklistEditorModal(true)
  }

  function addChecklistItem() {
    setChecklistEditor((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          localId: `new-${prev.checklistKey || "checklist"}-${Date.now()}-${prev.items.length}`,
          sourceId: null,
          label: "",
          description: "",
          itemType: prev.checklistKey === "issues" ? "text" : "boolean",
          isRequired: false,
          requiresPhoto: false,
          optionsText: "",
          category: prev.checklistKey === "issues" ? "issue" : "inspection",
          linkedSupplyItemId: null,
          supplyUpdateMode: null,
          opensIssueOnFail: prev.checklistKey === "issues",
          issueTypeOnFail: prev.checklistKey === "issues" ? "damage" : "general",
          issueSeverityOnFail: "medium",
          failureValuesText: "",
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

      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= prev.items.length) return prev

      const nextItems = [...prev.items]
      const [moved] = nextItems.splice(index, 1)
      if (!moved) return prev
      nextItems.splice(targetIndex, 0, moved)

      return {
        ...prev,
        items: nextItems,
      }
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

        const current = item.optionsText
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean)

        return {
          ...item,
          optionsText: [...current, ""].join("\n"),
        }
      }),
    }))
  }

  function removeChecklistChoice(localId: string, choiceIndex: number) {
    setChecklistEditor((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.localId !== localId) return item

        const current = item.optionsText
          .split(/\r?\n/)
          .map((value) => value.trim())

        const nextValues = current.filter((_, index) => index !== choiceIndex)
        return {
          ...item,
          optionsText: nextValues.join("\n"),
        }
      }),
    }))
  }

  function updateChecklistChoice(localId: string, choiceIndex: number, value: string) {
    setChecklistEditor((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.localId !== localId) return item

        const current = item.optionsText
          .split(/\r?\n/)
          .map((entry) => entry.trim())

        while (current.length <= choiceIndex) {
          current.push("")
        }

        current[choiceIndex] = value

        return {
          ...item,
          optionsText: current.join("\n"),
        }
      }),
    }))
  }

  async function handleSaveSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!task) return

    try {
      setSavingSchedule(true)
      setPageMessage(null)

      const payload = {
        scheduledDate: scheduleForm.scheduledDate || null,
        scheduledStartTime: scheduleForm.scheduledStartTime || null,
        scheduledEndTime: scheduleForm.scheduledEndTime || null,
      }

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const raw = await res.text()
      const json = parseJsonSafely(raw)

      if (!res.ok) {
        throw new Error(json?.error || raw || texts.schedule.modalDescription)
      }

      setPageMessage(texts.schedule.updatedMessage)
      setOpenScheduleModal(false)
      await loadTask()
    } catch (err) {
      setPageMessage(err instanceof Error ? err.message : texts.schedule.modalDescription)
    } finally {
      setSavingSchedule(false)
    }
  }

  async function handleAssignTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!task) return

    try {
      setSavingAssignment(true)
      setPageMessage(null)

      const payload = {
        taskId: task.id,
        partnerId: assignmentForm.partnerId || null,
        notes: assignmentForm.notes.trim() || null,
      }

      const res = await fetch("/api/task-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const raw = await res.text()
      const json = parseJsonSafely(raw)

      if (!res.ok) {
        throw new Error(json?.error || raw || texts.assignment.modalDescription)
      }

      setPageMessage(texts.assignment.updatedMessage)
      setOpenAssignmentModal(false)
      await loadTask()
    } catch (err) {
      setPageMessage(err instanceof Error ? err.message : texts.assignment.modalDescription)
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

      const payload = {
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
          linkedSupplyItemId: item.linkedSupplyItemId || null,
          supplyUpdateMode: item.supplyUpdateMode || null,
          opensIssueOnFail: Boolean(item.opensIssueOnFail),
          issueTypeOnFail: item.issueTypeOnFail || "general",
          issueSeverityOnFail: item.issueSeverityOnFail || "medium",
          failureValuesText: item.failureValuesText.trim() || null,
        })),
      }

      const res = await fetch(`/api/tasks/${task.id}/checklists/customize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const raw = await res.text()
      const json = parseJsonSafely(raw)

      if (!res.ok) {
        throw new Error(json?.error || raw || texts.editor.modalDescription)
      }

      setPageMessage(json?.message || texts.editor.updatedMessage)
      setOpenChecklistEditorModal(false)
      await loadTask()
    } catch (err) {
      setPageMessage(err instanceof Error ? err.message : texts.editor.modalDescription)
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
          <h1 className="text-lg font-semibold text-red-700">{texts.common.loadingErrorTitle}</h1>
          <p className="mt-2 text-sm text-red-700">{error || texts.common.loadingErrorFallback}</p>
          <button
            type="button"
            onClick={() => {
              void loadTask()
            }}
            className="mt-4 rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            {texts.common.retry}
          </button>
        </div>
      </div>
    )
  }

  const cleaningModalTexts = getChecklistModalTexts("cleaning", texts, language)
  const suppliesModalTexts = getChecklistModalTexts("supplies", texts, language)
  const issuesModalTexts = getChecklistModalTexts("issues", texts, language)

  const cleaningPreviewTexts = getChecklistPreviewTexts("cleaning", texts, language)
  const suppliesPreviewTexts = getChecklistPreviewTexts("supplies", texts, language)
  const issuesPreviewTexts = getChecklistPreviewTexts("issues", texts, language)

  const cleaningCardTexts = getChecklistCardTexts("cleaning", texts, language)
  const suppliesCardTexts = getChecklistCardTexts("supplies", texts, language)
  const issuesCardTexts = getChecklistCardTexts("issues", texts, language)
  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-500">{texts.header.detailsLabel}</p>
              <HelpDot text={texts.header.detailsHelp} />
            </div>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {uiTaskTitle}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span title={texts.header.detailsHelp}>
                <Badge tone={taskStatusTone}>{getTaskStatusLabel(language, task.status)}</Badge>
              </span>

              <span title={texts.schedule.durationHelp}>
                <Badge tone="slate">
                  {getPriorityLabel(language, normalizePriority(task.priority))}
                </Badge>
              </span>

              <span title={texts.header.detailsLabel}>
                <Badge tone="blue">{getTaskTypeLabel(language, task.taskType)}</Badge>
              </span>

              {task.property?.status ? (
                <span title={texts.property.sectionHelp}>
                  <Badge tone="violet">
                    {getPropertyStatusLabel(language, task.property.status)}
                  </Badge>
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {texts.header.propertyLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {task.property?.name || texts.common.dash}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {texts.header.dateLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {formatDate(task.scheduledDate, locale, texts.common.dash)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {texts.header.durationLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {calculateDurationLabel(
                    task.scheduledStartTime,
                    task.scheduledEndTime,
                    language,
                    texts.common.dash
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-1 text-sm text-slate-600">
              <p>
                {task.property?.code ? `${task.property.code} · ` : ""}
                {propertyAddress || texts.common.dash}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {task.property?.id ? (
              <Link
                href={`/tasks?propertyId=${task.property.id}&scope=open`}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {texts.header.backToPropertyTasks}
              </Link>
            ) : null}

            {task.property?.id ? (
              <Link
                href={`/properties/${task.property.id}`}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {texts.header.backToProperty}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {pageMessage ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {pageMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-12">
        <section className="space-y-6 xl:col-span-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-950">{texts.schedule.sectionTitle}</h2>
                  <HelpDot text={texts.schedule.sectionHelp} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{texts.schedule.sectionDescription}</p>
              </div>

              <button
                type="button"
                onClick={() => setOpenScheduleModal(true)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {texts.schedule.editButton}
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FieldCard
                label={texts.schedule.executionDate}
                value={formatDate(task.scheduledDate, locale, texts.common.dash)}
                help={texts.schedule.executionDateHelp}
              />

              <FieldCard
                label={texts.schedule.executionWindow}
                value={buildExecutionWindow(
                  task.scheduledDate,
                  task.scheduledStartTime,
                  task.scheduledEndTime,
                  locale,
                  texts.common.dash
                )}
                help={texts.schedule.executionWindowHelp}
              />

              <FieldCard
                label={texts.schedule.duration}
                value={calculateDurationLabel(
                  task.scheduledStartTime,
                  task.scheduledEndTime,
                  language,
                  texts.common.dash
                )}
                help={texts.schedule.durationHelp}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">{texts.assignment.sectionTitle}</h2>
              <HelpDot text={texts.assignment.sectionHelp} />
            </div>

            {activeAssignment ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-950">
                      {activeAssignment.partner?.name || texts.common.dash}
                    </p>
                    <HelpDot text={texts.assignment.currentPartnerHelp} />
                    <Badge tone="blue">
                      {getAssignmentStatusLabel(language, activeAssignment.status)}
                    </Badge>
                    <HelpDot text={texts.assignment.currentAssignmentStatusHelp} />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <FieldCard
                      label={texts.assignment.assignedAt}
                      value={formatDateTime(activeAssignment.assignedAt, locale, texts.common.dash)}
                      help={texts.assignment.assignedAtHelp}
                    />

                    <FieldCard
                      label={texts.assignment.acceptedAt}
                      value={formatDateTime(activeAssignment.acceptedAt, locale, texts.common.dash)}
                      help={texts.assignment.acceptedAtHelp}
                    />
                  </div>

                  {activeAssignment.portalUrl ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {texts.assignment.partnerPortalLink}
                      </p>
                      <a
                        href={activeAssignment.portalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex break-all text-sm font-medium text-slate-900 underline"
                      >
                        {activeAssignment.portalUrl}
                      </a>
                    </div>
                  ) : null}

                  {activeAssignment.notes ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {texts.assignment.assignmentNotes}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">{activeAssignment.notes}</p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenAssignmentModal(true)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {texts.assignment.editAssignment}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5">
                <p className="text-sm font-medium text-slate-700">{texts.assignment.noAssignmentYet}</p>
                <p className="mt-1 text-sm text-slate-500">{texts.assignment.noAssignmentHint}</p>
                <button
                  type="button"
                  onClick={() => setOpenAssignmentModal(true)}
                  className="mt-4 rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {texts.assignment.assignPartner}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">
                {language === "en" ? "Property readiness snapshot" : "Snapshot readiness ακινήτου"}
              </h2>
              <HelpDot
                text={
                  language === "en"
                    ? "The property is the readiness hub. The task displays a snapshot and not the canonical truth."
                    : "Το ακίνητο είναι το readiness hub. Το task προβάλλει snapshot και όχι canonical truth."
                }
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FieldCard
                label={language === "en" ? "Readiness status" : "Κατάσταση readiness"}
                value={getReadinessLabel(readiness?.status, language)}
                help={
                  language === "en"
                    ? "Canonical statuses: ready / borderline / not_ready / unknown."
                    : "Canonical statuses: ready / borderline / not_ready / unknown."
                }
              />
              <FieldCard
                label={language === "en" ? "Open conditions" : "Ανοιχτές conditions"}
                value={String(readiness?.openConditionsCount ?? propertyConditions.length)}
                help={
                  language === "en"
                    ? "Total property conditions in the current snapshot."
                    : "Σύνολο property conditions στο snapshot."
                }
              />
              <FieldCard
                label="Blocking"
                value={String(
                  readiness?.blockingCount ??
                    propertyConditions.filter(
                      (condition) =>
                        String(condition.blockingStatus ?? "").trim().toLowerCase() === "blocking"
                    ).length
                )}
                help={
                  language === "en"
                    ? "Conditions that currently block readiness."
                    : "Conditions που μπλοκάρουν readiness."
                }
              />
              <FieldCard
                label="Warnings"
                value={String(readiness?.warningCount ?? warnings.length)}
                help={
                  language === "en"
                    ? "Warnings returned by the route."
                    : "Warnings που επιστρέφει το route."
                }
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone={getReadinessTone(readiness?.status)}>
                {getReadinessLabel(readiness?.status, language)}
              </Badge>

              {readiness?.nextCheckInAt ? (
                <Badge tone="violet">
                  {language === "en" ? "Next check-in" : "Επόμενο check-in"}: {formatDateTime(readiness.nextCheckInAt, locale, texts.common.dash)}
                </Badge>
              ) : null}
            </div>

            {Array.isArray(readiness?.reasonSummary) && readiness.reasonSummary.length > 0 ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {language === "en" ? "Snapshot reasoning" : "Αιτιολόγηση snapshot"}
                </p>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {readiness.reasonSummary.map((reason, index) => (
                    <li key={`reason-${index}`}>• {reason}</li>
                  ))}
                </ul>
              </div>
            ) : readiness?.summary ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                {readiness.summary}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">{texts.lists.sectionTitle}</h2>
              <HelpDot text={texts.lists.sectionHelp} />
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{cleaningCardTexts.title}</h3>
                      <HelpDot text={cleaningCardTexts.help} />
                      <Badge tone={cleaningEnabled ? "green" : "slate"}>
                        {cleaningEnabled ? texts.common.active : texts.common.inactive}
                      </Badge>
                      <Badge tone={cleaningSubmitted ? "green" : "blue"}>
                        {getChecklistCompletionBadgeText(cleaningSubmitted, cleaningRun, language)}
                      </Badge>
                      <HelpDot text={texts.lists.statusBadgeHelp} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{cleaningListTitle}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenCleaningPreviewModal(true)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {texts.common.view}
                    </button>
                    <button
                      type="button"
                      onClick={openCleaningEditor}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {texts.lists.previewEditThisTask}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <FieldCard
                    label={texts.lists.sentAfterAcceptance}
                    value={cleaningSentLabel}
                    help={texts.lists.sentAfterAcceptanceHelp}
                  />
                  <FieldCard
                    label={texts.lists.submission}
                    value={getChecklistSubmittedStatusText(cleaningSubmitted, texts)}
                    help={texts.lists.submissionHelp}
                  />
                  <FieldCard
                    label={texts.lists.submissionTime}
                    value={formatDateTime(cleaningSubmittedAt, locale, texts.common.dash)}
                    help={texts.lists.submissionTimeHelp}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{suppliesCardTexts.title}</h3>
                      <HelpDot text={suppliesCardTexts.help} />
                      <Badge tone={suppliesEnabled ? "green" : "slate"}>
                        {suppliesEnabled ? texts.common.active : texts.common.inactive}
                      </Badge>
                      <Badge tone={suppliesSubmitted ? "green" : "blue"}>
                        {getChecklistCompletionBadgeText(suppliesSubmitted, suppliesRun, language)}
                      </Badge>
                      <HelpDot text={texts.lists.statusBadgeHelp} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{suppliesListTitle}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenSuppliesPreviewModal(true)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {texts.common.view}
                  </button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <FieldCard
                    label={texts.lists.sentAfterAcceptance}
                    value={suppliesSentLabel}
                    help={texts.lists.sentAfterAcceptanceHelp}
                  />
                  <FieldCard
                    label={texts.lists.submission}
                    value={getChecklistSubmittedStatusText(suppliesSubmitted, texts)}
                    help={texts.lists.submissionHelp}
                  />
                  <FieldCard
                    label={texts.lists.submissionTime}
                    value={formatDateTime(suppliesSubmittedAt, locale, texts.common.dash)}
                    help={texts.lists.submissionTimeHelp}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{issuesCardTexts.title}</h3>
                      <HelpDot text={issuesCardTexts.help} />
                      <Badge tone={issuesEnabled ? "green" : "slate"}>
                        {issuesEnabled ? texts.common.active : texts.common.inactive}
                      </Badge>
                      <Badge tone={issuesSubmitted ? "green" : "blue"}>
                        {getChecklistCompletionBadgeText(issuesSubmitted, issuesRun, language)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{issuesListTitle}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenIssuesPreviewModal(true)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {texts.common.view}
                    </button>
                    <button
                      type="button"
                      onClick={openIssuesEditor}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {texts.lists.previewEditThisTask}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <FieldCard
                    label={texts.lists.sentAfterAcceptance}
                    value={issuesSentLabel}
                    help={texts.lists.sentAfterAcceptanceHelp}
                  />
                  <FieldCard
                    label={texts.lists.submission}
                    value={getChecklistSubmittedStatusText(issuesSubmitted, texts)}
                    help={texts.lists.submissionHelp}
                  />
                  <FieldCard
                    label={texts.lists.submissionTime}
                    value={formatDateTime(issuesSubmittedAt, locale, texts.common.dash)}
                    help={texts.lists.submissionTimeHelp}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">{texts.answers.sectionTitle}</h2>
              <HelpDot text={texts.answers.sectionHelp} />
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{cleaningModalTexts.submittedTitle}</h3>
                      <HelpDot text={cleaningModalTexts.submittedHelp} />
                      <Badge tone={cleaningSubmitted ? "green" : "slate"}>
                        {getChecklistSubmittedStatusText(cleaningSubmitted, texts)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {cleaningSubmitted
                        ? `${texts.answers.submittedAtLabel}: ${formatDateTime(
                            cleaningSubmittedAt,
                            locale,
                            texts.common.dash
                          )} · ${texts.answers.responsesCount}: ${getChecklistResponseCount(cleaningRun)}`
                        : cleaningModalTexts.emptyText}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenCleaningAnswersModal(true)}
                    disabled={!cleaningSubmitted}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-medium",
                      cleaningSubmitted
                        ? "border border-slate-200 text-slate-700 hover:bg-slate-50"
                        : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                    )}
                  >
                    {texts.answers.viewSubmission}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{suppliesModalTexts.submittedTitle}</h3>
                      <HelpDot text={suppliesModalTexts.submittedHelp} />
                      <Badge tone={suppliesSubmitted ? "green" : "slate"}>
                        {getChecklistSubmittedStatusText(suppliesSubmitted, texts)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {suppliesSubmitted
                        ? `${texts.answers.submittedAtLabel}: ${formatDateTime(
                            suppliesSubmittedAt,
                            locale,
                            texts.common.dash
                          )} · ${texts.answers.responsesCount}: ${getChecklistResponseCount(suppliesRun)}`
                        : suppliesModalTexts.emptyText}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenSuppliesAnswersModal(true)}
                    disabled={!suppliesSubmitted}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-medium",
                      suppliesSubmitted
                        ? "border border-slate-200 text-slate-700 hover:bg-slate-50"
                        : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                    )}
                  >
                    {texts.answers.viewSubmission}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{issuesModalTexts.submittedTitle}</h3>
                      <HelpDot text={issuesModalTexts.submittedHelp} />
                      <Badge tone={issuesSubmitted ? "green" : "slate"}>
                        {getChecklistSubmittedStatusText(issuesSubmitted, texts)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {issuesSubmitted
                        ? `${texts.answers.submittedAtLabel}: ${formatDateTime(
                            issuesSubmittedAt,
                            locale,
                            texts.common.dash
                          )} · ${texts.answers.responsesCount}: ${getChecklistResponseCount(issuesRun)}`
                        : issuesModalTexts.emptyText}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenIssuesAnswersModal(true)}
                    disabled={!issuesSubmitted}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-medium",
                      issuesSubmitted
                        ? "border border-slate-200 text-slate-700 hover:bg-slate-50"
                        : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                    )}
                  >
                    {texts.answers.viewSubmission}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">
                {language === "en"
                  ? "Conditions created from this task"
                  : "Conditions που δημιουργήθηκαν από αυτό το task"}
              </h2>
              <HelpDot
                text={
                  language === "en"
                    ? "The task is the execution layer. Conditions are the canonical operational truth of the property."
                    : "Το task είναι execution layer. Οι conditions είναι canonical operational truth του ακινήτου."
                }
              />
            </div>

            {conditionsCreatedByTask.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                {language === "en"
                  ? "No property conditions were found with this task as source."
                  : "Δεν βρέθηκαν property conditions που να έχουν source το συγκεκριμένο task."}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {conditionsCreatedByTask.map((condition) => (
                  <div key={condition.id} className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-950">
                        {condition.title || (language === "en" ? "Condition" : "Condition")}
                      </p>
                      <Badge tone="green">{language === "en" ? "From this task" : "Από αυτό το task"}</Badge>
                      <Badge tone="blue">
                        {normalizeConditionTypeLabel(condition.conditionType, language)}
                      </Badge>
                      <Badge tone={getSeverityTone(condition.severity)}>
                        {normalizeSeverityLabel(condition.severity, language)}
                      </Badge>
                      <Badge tone={getBlockingTone(condition.blockingStatus)}>
                        {normalizeBlockingStatusLabel(condition.blockingStatus, language)}
                      </Badge>
                    </div>

                    {condition.description ? (
                      <p className="mt-2 text-sm text-slate-700">{condition.description}</p>
                    ) : null}

                    <div className="mt-3 text-xs text-slate-600">
                      <span>{normalizeConditionStatusLabel(condition.status, language)}</span>
                      {condition.managerDecision ? (
                        <>
                          {" · "}
                          <span>{normalizeManagerDecisionLabel(condition.managerDecision, language)}</span>
                        </>
                      ) : null}
                      {condition.createdAt ? (
                        <>
                          {" · "}
                          <span>{formatDateTime(condition.createdAt, locale, texts.common.dash)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">
                {language === "en" ? "Linked issues / warnings" : "Linked issues / warnings"}
              </h2>
              <HelpDot
                text={
                  language === "en"
                    ? "View the issues and warnings returned by the task route."
                    : "Προβολή των issues και warnings που επιστρέφει το route του task."
                }
              />
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-950">Issues</h3>
                  <Badge tone="amber">{issues.length}</Badge>
                </div>

                {issues.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    {language === "en" ? "No issues were returned." : "Δεν επιστράφηκαν issues."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {issues.map((issue) => (
                      <div key={issue.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">
                            {issue.title || "Issue"}
                          </p>
                          <Badge tone={getSeverityTone(issue.severity)}>
                            {normalizeSeverityLabel(issue.severity, language)}
                          </Badge>
                          {issue.blockingStatus ? (
                            <Badge tone={getBlockingTone(issue.blockingStatus)}>
                              {normalizeBlockingStatusLabel(issue.blockingStatus, language)}
                            </Badge>
                          ) : null}
                        </div>

                        {issue.description ? (
                          <p className="mt-2 text-sm text-slate-600">{issue.description}</p>
                        ) : null}

                        <div className="mt-3 text-xs text-slate-500">
                          <span>{issue.issueType || issue.type || texts.common.dash}</span>
                          {issue.status ? (
                            <>
                              {" · "}
                              <span>{normalizeConditionStatusLabel(issue.status, language)}</span>
                            </>
                          ) : null}
                          {issue.createdAt ? (
                            <>
                              {" · "}
                              <span>{formatDateTime(issue.createdAt, locale, texts.common.dash)}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-950">Warnings</h3>
                  <Badge tone="amber">{warnings.length}</Badge>
                </div>

                {warnings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    {language === "en" ? "No warnings were returned." : "Δεν επιστράφηκαν warnings."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {warnings.map((warning, index) => (
                      <div
                        key={typeof warning === "string" ? `warning-${index}` : warning.id || `warning-${index}`}
                        className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">
                            {getWarningMessage(warning, language)}
                          </p>
                          {typeof warning !== "string" && warning.severity ? (
                            <Badge tone={getSeverityTone(warning.severity)}>
                              {normalizeSeverityLabel(warning.severity, language)}
                            </Badge>
                          ) : (
                            <Badge tone="amber">Warning</Badge>
                          )}
                        </div>

                        {typeof warning !== "string" && warning.code ? (
                          <p className="mt-2 text-xs text-slate-500">{warning.code}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">{texts.history.sectionTitle}</h2>
              <HelpDot text={texts.history.sectionHelp} />
            </div>

            {!task.activityLogs || task.activityLogs.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                {texts.history.noHistory}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {task.activityLogs.map((log) => (
                  <div key={log.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-950">
                          {normalizeActivityMessage(log, language)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {normalizeActorDisplayName(log.actorName, log.actorType, language)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(log.createdAt, locale, texts.common.dash)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6 xl:col-span-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">{texts.property.sectionTitle}</h2>
              <HelpDot text={texts.property.sectionHelp} />
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">{task.property?.name || texts.common.dash}</p>
                <p className="mt-1 text-slate-600">{task.property?.code || texts.common.dash}</p>
                <p className="mt-2 text-slate-600">{propertyAddress || texts.common.dash}</p>
              </div>

              {task.property?.defaultPartner ? (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {texts.property.defaultPartner}
                  </p>
                  <p className="mt-2 font-medium text-slate-950">{task.property.defaultPartner.name}</p>
                  {task.property.defaultPartner.specialty ? (
                    <p className="mt-1 text-slate-600">
                      {normalizePartnerSpecialtyForUi(
                        task.property.defaultPartner.specialty,
                        language
                      )}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">{texts.booking.sectionTitle}</h2>
              <HelpDot text={texts.booking.sectionHelp} />
            </div>

            {!task.booking ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                {texts.booking.noBooking}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">
                    {task.booking.externalListingName || texts.booking.sectionTitle}
                  </p>
                  {task.booking.status ? (
                    <Badge tone="violet">{getBookingStatusLabel(language, task.booking.status)}</Badge>
                  ) : null}
                </div>

                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>
                    {texts.booking.guest}: {task.booking.guestName || texts.common.dash}
                  </p>
                  <p>
                    {texts.booking.arrival}{" "}
                    {task.booking.checkInDate
                      ? `${formatDate(task.booking.checkInDate, locale, texts.common.dash)}${
                          task.booking.checkInTime
                            ? ` · ${formatTime(task.booking.checkInTime, texts.common.dash)}`
                            : ""
                        }`
                      : texts.common.dash}
                  </p>
                  <p>
                    {texts.booking.departure}{" "}
                    {task.booking.checkOutDate
                      ? `${formatDate(task.booking.checkOutDate, locale, texts.common.dash)}${
                          task.booking.checkOutTime
                            ? ` · ${formatTime(task.booking.checkOutTime, texts.common.dash)}`
                            : ""
                        }`
                      : texts.common.dash}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">
                {language === "en" ? "Property condition snapshot" : "Property condition snapshot"}
              </h2>
              <HelpDot
                text={
                  language === "en"
                    ? "Canonical operational state of the property in the readiness-first model."
                    : "Canonical operational κατάσταση του ακινήτου στο readiness-first μοντέλο."
                }
              />
            </div>

            {propertyConditions.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                {language === "en"
                  ? "No property conditions were returned."
                  : "Δεν επιστράφηκαν property conditions."}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {propertyConditions.map((condition) => (
                  <div key={condition.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-950">
                        {condition.title || (language === "en" ? "Condition" : "Condition")}
                      </p>
                      <Badge tone="blue">
                        {normalizeConditionTypeLabel(condition.conditionType, language)}
                      </Badge>
                      <Badge tone={getSeverityTone(condition.severity)}>
                        {normalizeSeverityLabel(condition.severity, language)}
                      </Badge>
                      <Badge tone={getBlockingTone(condition.blockingStatus)}>
                        {normalizeBlockingStatusLabel(condition.blockingStatus, language)}
                      </Badge>
                      <Badge tone="slate">
                        {normalizeConditionStatusLabel(condition.status, language)}
                      </Badge>
                    </div>

                    {condition.description ? (
                      <p className="mt-2 text-sm text-slate-600">{condition.description}</p>
                    ) : null}

                    <div className="mt-3 text-xs text-slate-500">
                      {condition.managerDecision ? (
                        <span>
                          {language === "en" ? "Decision" : "Απόφαση"}: {normalizeManagerDecisionLabel(condition.managerDecision, language)}
                        </span>
                      ) : null}
                      {condition.createdAt ? (
                        <>
                          {" · "}
                          <span>{formatDateTime(condition.createdAt, locale, texts.common.dash)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={openScheduleModal}
        onClose={() => setOpenScheduleModal(false)}
        title={texts.schedule.modalTitle}
        description={texts.schedule.modalDescription}
        maxWidth="max-w-3xl"
        showHeaderClose={false}
        closeLabel={texts.common.close}
      >
        <form onSubmit={handleSaveSchedule} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                {texts.schedule.executionDateField}
              </span>
              <input
                type="date"
                value={scheduleForm.scheduledDate}
                onChange={(e) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    scheduledDate: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
            </label>

            <div className="hidden md:block" />

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">{texts.schedule.startTime}</span>
              <input
                type="time"
                value={scheduleForm.scheduledStartTime}
                onChange={(e) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    scheduledStartTime: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">{texts.schedule.endTime}</span>
              <input
                type="time"
                value={scheduleForm.scheduledEndTime}
                onChange={(e) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    scheduledEndTime: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpenScheduleModal(false)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.common.cancel}
            </button>

            <button
              type="submit"
              disabled={savingSchedule}
              className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSchedule ? texts.common.saving : texts.common.save}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={openAssignmentModal}
        onClose={() => setOpenAssignmentModal(false)}
        title={texts.assignment.modalTitle}
        description={texts.assignment.modalDescription}
        maxWidth="max-w-2xl"
        closeLabel={texts.common.close}
      >
        <form onSubmit={handleAssignTask} className="space-y-5">
          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              {texts.assignment.partnerSelect}
              <HelpDot text={texts.assignment.partnerSelectHelp} />
            </span>
            <select
              value={assignmentForm.partnerId}
              onChange={(e) =>
                setAssignmentForm((prev) => ({
                  ...prev,
                  partnerId: e.target.value,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="">{texts.assignment.noPartnerOption}</option>
              {(task.partners || []).map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                  {partner.specialty
                    ? ` · ${normalizePartnerSpecialtyForUi(partner.specialty, language)}`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              {texts.assignment.taskNotes}
              <HelpDot text={texts.assignment.taskNotesHelp} />
            </span>
            <textarea
              rows={5}
              value={assignmentForm.notes}
              onChange={(e) =>
                setAssignmentForm((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              placeholder={texts.assignment.taskNotesPlaceholder}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
            />
          </label>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpenAssignmentModal(false)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.common.cancel}
            </button>
            <button
              type="submit"
              disabled={savingAssignment}
              className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingAssignment ? texts.common.saving : texts.assignment.saveAssignment}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={openCleaningPreviewModal}
        onClose={() => setOpenCleaningPreviewModal(false)}
        title={cleaningPreviewTexts.title}
        description={cleaningPreviewTexts.description}
        maxWidth="max-w-5xl"
        showHeaderClose={false}
        closeLabel={texts.common.close}
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-slate-950">{cleaningPreviewTexts.sectionTitle}</p>
              <Badge tone={cleaningEnabled ? "green" : "slate"}>
                {cleaningEnabled ? texts.common.active : texts.common.inactive}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">{cleaningListTitle}</p>
          </div>

          <div className="space-y-3">
            {cleaningPreviewItems.map((item, index) => (
              <div key={item.id || `${index}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-950">
                    {index + 1}. {item.label}
                  </p>
                  {item.isRequired ? <Badge tone="amber">{texts.lists.listItemRequired}</Badge> : null}
                  {item.requiresPhoto ? <Badge tone="blue">{texts.lists.listItemRequiresPhoto}</Badge> : null}
                </div>
                {item.description ? <p className="mt-2 text-sm text-slate-600">{item.description}</p> : null}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setOpenCleaningPreviewModal(false)
                openCleaningEditor()
              }}
              className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {texts.lists.previewEditThisTask}
            </button>

            <p className="text-sm text-slate-500">{texts.lists.previewEditHint}</p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setOpenCleaningPreviewModal(false)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.common.close}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openSuppliesPreviewModal}
        onClose={() => setOpenSuppliesPreviewModal(false)}
        title={suppliesPreviewTexts.title}
        description={suppliesPreviewTexts.description}
        maxWidth="max-w-5xl"
        showHeaderClose={false}
        closeLabel={texts.common.close}
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-slate-950">{suppliesPreviewTexts.sectionTitle}</p>
              <Badge tone={suppliesEnabled ? "green" : "slate"}>
                {suppliesEnabled ? texts.common.active : texts.common.inactive}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">{suppliesListTitle}</p>
          </div>

          <div className="space-y-3">
            {suppliesPreviewItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                {suppliesModalTexts.emptyText}
              </div>
            ) : (
              suppliesPreviewItems.map((item, index) => (
                <div key={item.id || `${index}`} className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    {index + 1}. {item.label}
                  </p>

                  {getSuppliesPreviewDescription(item, language) ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {getSuppliesPreviewDescription(item, language)}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {task.property?.id ? (
              <Link
                href={`/properties/${task.property.id}/supplies?fromTaskId=${task.id}`}
                className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {texts.lists.suppliesManageLink}
              </Link>
            ) : null}

            <p className="text-sm text-slate-500">{texts.lists.suppliesManageHint}</p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setOpenSuppliesPreviewModal(false)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.common.close}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openIssuesPreviewModal}
        onClose={() => setOpenIssuesPreviewModal(false)}
        title={issuesPreviewTexts.title}
        description={issuesPreviewTexts.description}
        maxWidth="max-w-5xl"
        showHeaderClose={false}
        closeLabel={texts.common.close}
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-slate-950">{issuesPreviewTexts.sectionTitle}</p>
              <Badge tone={issuesEnabled ? "green" : "slate"}>
                {issuesEnabled ? texts.common.active : texts.common.inactive}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">{issuesListTitle}</p>
          </div>

          <div className="space-y-3">
            {issuesPreviewItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                {issuesModalTexts.emptyText}
              </div>
            ) : (
              issuesPreviewItems.map((item, index) => (
                <div key={item.id || `${index}`} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">
                      {index + 1}. {item.label}
                    </p>
                    {item.isRequired ? <Badge tone="amber">{texts.lists.listItemRequired}</Badge> : null}
                    {item.requiresPhoto ? <Badge tone="blue">{texts.lists.listItemRequiresPhoto}</Badge> : null}
                  </div>
                  {getIssuesPreviewDescription(item, language) ? (
                    <p className="mt-2 text-sm text-slate-600">{getIssuesPreviewDescription(item, language)}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setOpenIssuesPreviewModal(false)
                openIssuesEditor()
              }}
              className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {texts.lists.previewEditThisTask}
            </button>

            <p className="text-sm text-slate-500">{texts.lists.previewEditHint}</p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setOpenIssuesPreviewModal(false)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.common.close}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openChecklistEditorModal}
        onClose={() => setOpenChecklistEditorModal(false)}
        title={texts.editor.modalTitle}
        description={texts.editor.modalDescription}
        maxWidth="max-w-6xl"
        showHeaderClose={false}
        closeLabel={texts.common.close}
      >
        <form onSubmit={handleSaveChecklistEditor} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 p-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={checklistEditor.active}
                onChange={(e) =>
                  setChecklistEditor((prev) => ({
                    ...prev,
                    active: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">
                {texts.editor.taskOnlyActive}
              </span>
            </label>
          </div>

          <div className="space-y-4">
            {checklistEditor.items.map((item, index) => {
              const choiceValues =
                item.itemType === "choice" || item.itemType === "select"
                  ? item.optionsText.split(/\r?\n/).map((value) => value.trim())
                  : []

              return (
                <div key={item.localId} className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {texts.answers.listItemFallback} {index + 1}
                      </p>
                      <p className="text-sm text-slate-500">{texts.editor.thisTaskOnly}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => moveChecklistItem(item.localId, "up")}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {texts.editor.moveUp}
                      </button>
                      <button
                        type="button"
                        onClick={() => moveChecklistItem(item.localId, "down")}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {texts.editor.moveDown}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(item.localId)}
                        className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                      >
                        {texts.editor.remove}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">
                        {texts.editor.itemTitle}
                      </span>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateChecklistItem(item.localId, { label: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">
                        {texts.editor.itemInstructions}
                      </span>
                      <textarea
                        rows={3}
                        value={item.description}
                        onChange={(e) =>
                          updateChecklistItem(item.localId, { description: e.target.value })
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        {texts.editor.answerType}
                      </span>
                      <select
                        value={item.itemType}
                        onChange={(e) =>
                          updateChecklistItem(item.localId, { itemType: e.target.value })
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      >
                        <option value="boolean">{texts.editor.booleanOption}</option>
                        <option value="text">{texts.editor.textOption}</option>
                        <option value="number">{texts.editor.numberOption}</option>
                        <option value="choice">{texts.editor.choiceOption}</option>
                        <option value="select">{texts.editor.selectOption}</option>
                        <option value="photo">{texts.editor.photoOption}</option>
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        {texts.editor.category}
                      </span>
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) =>
                          updateChecklistItem(item.localId, { category: e.target.value })
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      />
                    </label>

                    {(item.itemType === "choice" || item.itemType === "select") && (
                      <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-slate-950">
                            {texts.editor.options}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {texts.editor.optionsHelp}
                          </p>
                        </div>

                        <div className="space-y-3">
                          {choiceValues.map((choice, choiceIndex) => (
                            <div
                              key={`${item.localId}-choice-${choiceIndex}`}
                              className="flex flex-col gap-2 sm:flex-row sm:items-center"
                            >
                              <input
                                type="text"
                                value={choice}
                                onChange={(e) =>
                                  updateChecklistChoice(item.localId, choiceIndex, e.target.value)
                                }
                                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                              />
                              <button
                                type="button"
                                onClick={() => removeChecklistChoice(item.localId, choiceIndex)}
                                className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                              >
                                {texts.editor.removeChoice}
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => addChecklistChoice(item.localId)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {texts.editor.addChoice}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="md:col-span-2 grid gap-4 lg:grid-cols-3">
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <input
                          type="checkbox"
                          checked={item.isRequired}
                          onChange={(e) =>
                            updateChecklistItem(item.localId, { isRequired: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-700">
                          {texts.editor.requiredItem}
                        </span>
                      </label>

                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <input
                          type="checkbox"
                          checked={item.requiresPhoto}
                          onChange={(e) =>
                            updateChecklistItem(item.localId, { requiresPhoto: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-700">
                          {texts.editor.requiresPhoto}
                        </span>
                      </label>

                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <input
                          type="checkbox"
                          checked={item.opensIssueOnFail}
                          onChange={(e) =>
                            updateChecklistItem(item.localId, {
                              opensIssueOnFail: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-700">
                          {texts.editor.opensIssueOnFail}
                        </span>
                      </label>
                    </div>

                    <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-slate-950">
                          {texts.editor.issueRules}
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-slate-700">
                            {texts.editor.issueTypeOnFail}
                          </span>
                          <select
                            value={item.issueTypeOnFail}
                            onChange={(e) =>
                              updateChecklistItem(item.localId, {
                                issueTypeOnFail: e.target.value,
                              })
                            }
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                          >
                            <option value="damage">{texts.editor.damage}</option>
                            <option value="repair">{texts.editor.repair}</option>
                            <option value="inspection">{texts.editor.inspection}</option>
                            <option value="cleaning">{texts.editor.cleaning}</option>
                            <option value="general">{texts.editor.general}</option>
                          </select>
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-medium text-slate-700">
                            {texts.editor.issueSeverityOnFail}
                          </span>
                          <select
                            value={item.issueSeverityOnFail}
                            onChange={(e) =>
                              updateChecklistItem(item.localId, {
                                issueSeverityOnFail: e.target.value,
                              })
                            }
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                          >
                            <option value="low">{texts.editor.low}</option>
                            <option value="medium">{texts.editor.medium}</option>
                            <option value="high">{texts.editor.high}</option>
                            <option value="critical">{texts.editor.critical}</option>
                          </select>
                        </label>

                        <label className="space-y-2 md:col-span-2 xl:col-span-1">
                          <span className="text-sm font-medium text-slate-700">
                            {texts.editor.failureValuesText}
                          </span>
                          <input
                            type="text"
                            value={item.failureValuesText}
                            onChange={(e) =>
                              updateChecklistItem(item.localId, {
                                failureValuesText: e.target.value,
                              })
                            }
                            placeholder={texts.editor.failureValuesPlaceholder}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {checklistEditor.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                {texts.editor.noItems}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={addChecklistItem}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.editor.addItem}
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpenChecklistEditorModal(false)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {texts.common.cancel}
              </button>
              <button
                type="submit"
                disabled={savingChecklistEditor}
                className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingChecklistEditor ? texts.common.saving : texts.editor.saveListChanges}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={openCleaningAnswersModal}
        onClose={() => setOpenCleaningAnswersModal(false)}
        title={cleaningModalTexts.title}
        description={cleaningModalTexts.description}
        maxWidth="max-w-5xl"
        showHeaderClose={false}
        closeLabel={texts.common.close}
      >
        <SubmittedAnswersView
          run={cleaningRun}
          submitted={cleaningSubmitted}
          submittedAtOverride={cleaningSubmittedAt}
          locale={locale}
          emptyText={cleaningModalTexts.emptyText}
          onClose={() => setOpenCleaningAnswersModal(false)}
          texts={texts}
          language={language}
          checklistKind="cleaning"
        />
      </Modal>

      <Modal
        open={openSuppliesAnswersModal}
        onClose={() => setOpenSuppliesAnswersModal(false)}
        title={suppliesModalTexts.title}
        description={suppliesModalTexts.description}
        maxWidth="max-w-5xl"
        showHeaderClose={false}
        closeLabel={texts.common.close}
      >
        <SubmittedAnswersView
          run={suppliesRun}
          submitted={suppliesSubmitted}
          submittedAtOverride={suppliesSubmittedAt}
          locale={locale}
          emptyText={suppliesModalTexts.emptyText}
          onClose={() => setOpenSuppliesAnswersModal(false)}
          texts={texts}
          language={language}
          checklistKind="supplies"
        />
      </Modal>

      <Modal
        open={openIssuesAnswersModal}
        onClose={() => setOpenIssuesAnswersModal(false)}
        title={issuesModalTexts.title}
        description={issuesModalTexts.description}
        maxWidth="max-w-5xl"
        showHeaderClose={false}
        closeLabel={texts.common.close}
      >
        <SubmittedAnswersView
          run={issuesRun}
          submitted={issuesSubmitted}
          submittedAtOverride={issuesSubmittedAt}
          locale={locale}
          emptyText={issuesModalTexts.emptyText}
          onClose={() => setOpenIssuesAnswersModal(false)}
          texts={texts}
          language={language}
          checklistKind="issues"
        />
      </Modal>
    </div>
  )
}
