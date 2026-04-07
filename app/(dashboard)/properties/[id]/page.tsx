"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import {
  getChecklistStatusLabel,
  getIssuePriorityLabel,
  getIssueStatusLabel,
  getPropertyStatusLabel,
  getPropertyTypeLabel,
  getTaskStatusLabel,
} from "@/lib/i18n/labels"
import {
  normalizeIssuePriority,
  normalizeIssueStatus,
  normalizePropertyStatus,
  normalizeTaskStatus,
  normalizeTaskTitleText,
} from "@/lib/i18n/normalizers"
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

type PropertyConditionApiItem = {
  id: string
  title: string
  displayLabel?: string
  conditionType: string
  status: string
  blockingStatus: string
  severity: string
  managerDecision?: string | null
  isActive?: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

type ChecklistRunLite = {
  id: string
  status: string
  startedAt?: string | null
  completedAt?: string | null
  submittedAt?: string | null
  sentAt?: string | null
  answers?: Array<{
    id: string
    issueCreated?: boolean
    valueBoolean?: boolean | null
    valueText?: string | null
    valueNumber?: number | null
    valueSelect?: string | null
    note?: string | null
    notes?: string | null
    photoUrls?: string[] | null
  }>
}

type IssueRunLite = {
  id: string
  status: string
  startedAt?: string | null
  completedAt?: string | null
  submittedAt?: string | null
  sentAt?: string | null
  answers?: Array<{
    id: string
    reportType?: string | null
    title?: string | null
    description?: string | null
    severity?: string | null
    affectsHosting?: boolean
    requiresImmediateAction?: boolean
    locationText?: string | null
    createdIssueId?: string | null
    photoUrls?: string[] | null
  }>
}

type ReadinessCounters = {
  openTasks?: number
  pendingCleaningTasks?: number
  pendingSuppliesTasks?: number
  pendingIssuesTasks?: number
  pendingProofTasks?: number
  bookingsWithoutTask?: number
  openIssues?: number
  criticalIssues?: number
  missingCriticalSupplies?: number
  mediumSupplies?: number
}

type PropertyBookingLite = {
  id: string
  externalBookingId?: string | null
  guestName?: string | null
  checkInDate?: string | null
  checkOutDate?: string | null
  status?: string | null
  checkInTime?: string | null
  checkOutTime?: string | null
  sourcePlatform?: string | null
  hasTask?: boolean
  taskCount?: number
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
  readinessStatus?: string | null
  readinessUpdatedAt?: string | null
  readinessReasonsText?: string | null
  nextCheckInAt?: string | null
  openConditionCount?: number | null
  openBlockingConditionCount?: number | null
  openWarningConditionCount?: number | null
  readinessSummary?: {
    status?: string | null
    explain?: string | null
    reasons?: Array<{ message?: string } | string>
    nextActions?: Array<{ message?: string } | string>
    counters?: ReadinessCounters
    conditions?: {
      summary?: Record<string, number>
      reasons?: Array<{ conditionId: string; title: string; message: string; readinessImpact: "warning" | "blocking" }>
      active?: PropertyConditionApiItem[]
      blocking?: PropertyConditionApiItem[]
      warning?: PropertyConditionApiItem[]
      monitoring?: PropertyConditionApiItem[]
    } | null
  } | null
  storedReadinessSummary?: {
    readinessStatus?: string | null
    readinessUpdatedAt?: string | null
    readinessReasonsText?: string | null
    openConditionCount?: number | null
    openBlockingConditionCount?: number | null
    openWarningConditionCount?: number | null
    nextCheckInAt?: string | null
  } | null
  nextBooking?: {
    id?: string
    guestName?: string | null
    checkInDate?: string | null
    checkOutDate?: string | null
    status?: string | null
    checkInTime?: string | null
    checkOutTime?: string | null
    sourcePlatform?: string | null
  } | null
  bookings?: PropertyBookingLite[]
  bookingsWithoutTask?: PropertyBookingLite[]
  bookingsWithoutTaskCount?: number
  updatedAt: string
  defaultPartner?: {
    id: string
    code: string
    name: string
    email: string
    phone?: string | null
    specialty: string
    status: string
  } | null
  tasks?: Array<{
    id: string
    title: string
    taskType: string
    source: string
    priority: string
    status: string
    scheduledDate: string
    scheduledStartTime?: string | null
    scheduledEndTime?: string | null
    dueDate?: string | null
    completedAt?: string | null
    alertEnabled?: boolean
    alertAt?: string | null
    sendCleaningChecklist?: boolean
    sendSuppliesChecklist?: boolean
    sendIssuesChecklist?: boolean
    notes?: string | null
    resultNotes?: string | null
    activeConditionsCreatedByThisTask?: PropertyConditionApiItem[]
    assignments?: Array<{
      id: string
      status: string
      assignedAt: string
      acceptedAt?: string | null
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
    issuesChecklistRun?: IssueRunLite | null
    checklistRun?: ChecklistRunLite | null
  }>
  issues?: Array<{
    id: string
    issueType: string
    title: string
    description?: string | null
    severity: string
    status: string
    affectsHosting?: boolean
    requiresImmediateAction?: boolean
    locationText?: string | null
    createdAt: string
    updatedAt: string
    task?: {
      id: string
      title: string
      status: string
    } | null
  }>
  propertySupplies?: Array<{
    id: string
    currentStock: number
    stateMode?: string | null
    mediumThreshold?: number | null
    fullThreshold?: number | null
    targetStock?: number | null
    reorderThreshold?: number | null
    minimumThreshold?: number | null
    isCritical?: boolean
    updatedAt?: string | null
    lastUpdatedAt?: string | null
    derivedState?: string | null
    supplyItem?: {
      id: string
      code: string
      name: string
      nameEl?: string | null
      nameEn?: string | null
      category: string
      unit: string
      minimumStock?: number | null
      isActive: boolean
    } | null
  }>
}

type ModalKey = null | "property" | "partner" | "readiness"
type ViewMode = "overview" | "calendar"
type CalendarGranularity = "month" | "week" | "day"
type OpenTaskFilter = "all_open" | "pending" | "assigned" | "accepted" | "in_progress" | "alerts"
type SupplyFilter = "all" | "missing" | "medium" | "full"
type IssueFilter = "open" | "critical"

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

type CanonicalReadinessStatus = "READY" | "BORDERLINE" | "NOT_READY" | "UNKNOWN"
type CalendarTone = "ready" | "warning" | "blocking" | "neutral"
type PropertyOperationalCounts = {
  todayOpenTasks: number
  activeAlerts: number
  bookingsWithoutTask: number
  openIssues: number
  openDamages: number
  supplyShortages: number
}

type ChecklistUiStateKey = "inactive" | "not_sent" | "sent_pending" | "in_progress" | "submitted"

type ChecklistUiState = {
  key: ChecklistUiStateKey
  enabled: boolean
  sent: boolean
  submitted: boolean
  inProgress: boolean
  tone: string
}

type AnswerLike = (
  | NonNullable<ChecklistRunLite["answers"]>[number]
  | NonNullable<IssueRunLite["answers"]>[number]
) & {
  valueBoolean?: boolean | null
  valueText?: string | null
  valueSelect?: string | null
  valueNumber?: number | null
  note?: string | null
  notes?: string | null
  title?: string | null
  description?: string | null
  locationText?: string | null
  photoUrls?: string[] | null
  createdIssueId?: string | null
}

type SupplyRowView = NonNullable<PropertyDetail["propertySupplies"]>[number] & {
  derivedState: "missing" | "medium" | "full"
  lastSeenUpdate: string | null
  displayName: string
}

type CalendarDayItem = {
  key: string
  date: Date
  isToday: boolean
  isCurrentMonth: boolean
  hasCheckIn: boolean
  hasCheckOut: boolean
  hasStay: boolean
  openTasks: number
  completedTasks: number
  alerts: number
  criticalIssues: number
  blockingConditions: number
  warningConditions: number
  tone: CalendarTone
}

const OPEN_TASK_STATUSES = [
  "NEW",
  "PENDING",
  "ASSIGNED",
  "WAITING_ACCEPTANCE",
  "ACCEPTED",
  "IN_PROGRESS",
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

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function startOfWeek(date: Date) {
  const base = startOfDay(date)
  const day = base.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(base, diff)
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6)
}

function startOfMonthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  return startOfWeek(first)
}

function endOfMonthGrid(date: Date) {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return endOfWeek(last)
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDate(value: string | Date | null | undefined, locale: string) {
  const date = value instanceof Date ? value : normalizeDate(value)
  if (!date) return "—"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value: string | Date | null | undefined, locale: string) {
  const date = value instanceof Date ? value : normalizeDate(value)
  if (!date) return "—"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatTime(value?: string | null) {
  if (!value) return "—"
  const text = String(value).trim()
  if (!text) return "—"
  return text.slice(0, 5)
}

function parseDateAndTime(dateValue?: string | null, timeValue?: string | null) {
  if (!dateValue) return null
  const datePart = String(dateValue).slice(0, 10)
  const timePart = timeValue && /^\d{2}:\d{2}/.test(timeValue) ? String(timeValue).slice(0, 5) : "12:00"
  const composed = new Date(`${datePart}T${timePart}:00`)
  if (Number.isNaN(composed.getTime())) return null
  return composed
}

function normalizeDateOnlyValue(value?: string | null) {
  if (!value) return null
  const text = String(value).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  return text
}

function formatCountdownToNextCheckIn(nextCheckInAt?: string | null, language: "el" | "en" = "el") {
  const date = normalizeDate(nextCheckInAt)
  if (!date) return "—"
  const diffMs = date.getTime() - Date.now()
  if (diffMs <= 0) return language === "en" ? "Already started" : "Έχει ήδη ξεκινήσει"
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60))
  const totalDays = Math.floor(totalHours / 24)
  if (totalHours < 24) {
    return language === "en" ? `${totalHours} hours remaining` : `Απομένουν ${totalHours} ώρες`
  }
  return language === "en" ? `${totalDays} days remaining` : `Απομένουν ${totalDays} ημέρες`
}

function isDateInRange(targetDate?: string | null, fromDate?: string, toDate?: string) {
  const normalizedTarget = normalizeDateOnlyValue(targetDate)
  if (!normalizedTarget) return false
  if (fromDate && normalizedTarget < fromDate) return false
  if (toDate && normalizedTarget > toDate) return false
  return true
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function normalizeLooseText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
}

function isOpenTaskStatus(status?: string | null) {
  return OPEN_TASK_STATUSES.includes(normalizeTaskStatus(status) as (typeof OPEN_TASK_STATUSES)[number])
}

function isCompletedTaskStatus(status?: string | null) {
  return normalizeTaskStatus(status) === "COMPLETED"
}

function propertyStatusLabel(language: "el" | "en", status?: string | null) {
  return getPropertyStatusLabel(language, status)
}

function taskStatusLabel(language: "el" | "en", status?: string | null) {
  return getTaskStatusLabel(language, status)
}

function issueStatusLabel(language: "el" | "en", status?: string | null) {
  return getIssueStatusLabel(language, status)
}

function severityLabel(language: "el" | "en", severity?: string | null) {
  return getIssuePriorityLabel(language, severity)
}

function normalizeCanonicalReadinessStatus(value?: string | null): CanonicalReadinessStatus {
  const normalized = String(value || "").trim().toLowerCase()
  if (["ready", "completed", "ok"].includes(normalized)) return "READY"
  if (["borderline", "needs_attention", "needs-attention", "needs attention", "warning"].includes(normalized)) return "BORDERLINE"
  if (["not_ready", "not-ready", "not ready", "blocked", "critical"].includes(normalized)) return "NOT_READY"
  return "UNKNOWN"
}

function getCanonicalReadinessLabel(language: "el" | "en", status: CanonicalReadinessStatus, unknownLabel: string) {
  if (status === "READY") return language === "en" ? "Ready" : "Έτοιμο"
  if (status === "BORDERLINE") return language === "en" ? "Borderline" : "Οριακό"
  if (status === "NOT_READY") return language === "en" ? "Not ready" : "Μη έτοιμο"
  return unknownLabel
}

function getReadinessTone(status: CanonicalReadinessStatus) {
  if (status === "READY") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
  if (status === "BORDERLINE") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  if (status === "NOT_READY") return "bg-red-50 text-red-700 ring-1 ring-red-200"
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
}

function badgeClasses(status?: string | null) {
  const propertyStatus = normalizePropertyStatus(status)
  const taskStatus = normalizeTaskStatus(status)
  const issueStatus = normalizeIssueStatus(status)
  const issuePriority = normalizeIssuePriority(status)
  const readinessStatus = normalizeCanonicalReadinessStatus(status)
  const raw = String(status || "").trim().toLowerCase()

  if (propertyStatus === "ACTIVE" || taskStatus === "COMPLETED" || issueStatus === "RESOLVED" || readinessStatus === "READY") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
  }

  if (readinessStatus === "NOT_READY" || issueStatus === "OPEN" || issuePriority === "URGENT" || issuePriority === "HIGH" || raw === "blocking" || raw === "critical" || raw === "blocked") {
    return "bg-red-50 text-red-700 ring-1 ring-red-200"
  }

  if (readinessStatus === "BORDERLINE" || taskStatus === "PENDING" || taskStatus === "NEW" || taskStatus === "ASSIGNED" || taskStatus === "WAITING_ACCEPTANCE" || taskStatus === "ACCEPTED" || taskStatus === "IN_PROGRESS" || raw === "warning" || raw === "medium") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  }

  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
}

function calendarToneClasses(tone: CalendarTone) {
  if (tone === "ready") return "border-emerald-200 bg-emerald-50"
  if (tone === "warning") return "border-amber-200 bg-amber-50"
  if (tone === "blocking") return "border-red-200 bg-red-50"
  return "border-slate-200 bg-white"
}

function isTodayOpenTask(task: NonNullable<PropertyDetail["tasks"]>[number], now: Date) {
  if (!isOpenTaskStatus(task.status)) return false
  const scheduledDate = normalizeDate(task.scheduledDate)
  if (!scheduledDate) return false
  return sameDay(scheduledDate, now)
}

function isOpenOperationalIssue(issue: NonNullable<PropertyDetail["issues"]>[number]) {
  const normalized = normalizeIssueStatus(issue.status)
  return normalized === "OPEN" || normalized === "IN_PROGRESS"
}

function isDamageIssue(issue: NonNullable<PropertyDetail["issues"]>[number]) {
  const normalizedType = normalizeLooseText(issue.issueType)
  return normalizedType.includes("damage") || normalizedType.includes("ζημια")
}

function isSupplyShortage(supply: NonNullable<PropertyDetail["propertySupplies"]>[number]) {
  const canonical = buildCanonicalSupplySnapshot({
    isActive: true,
    stateMode: supply.stateMode,
    fillLevel: supply.derivedState,
    currentStock: supply.currentStock,
    mediumThreshold: supply.mediumThreshold,
    fullThreshold: supply.fullThreshold,
    minimumThreshold: supply.minimumThreshold,
    reorderThreshold: supply.reorderThreshold,
    targetStock: supply.targetStock,
    supplyMinimumStock: supply.supplyItem?.minimumStock,
  })

  return canonical.isShortage
}

function isActiveBookingStatus(status?: string | null) {
  return String(status || "").trim().toLowerCase() !== "cancelled"
}

function isBookingPendingTaskCreation(
  booking: PropertyBookingLite,
  now: Date
) {
  if (!isActiveBookingStatus(booking.status)) return false
  if (booking.hasTask === true || Number(booking.taskCount || 0) > 0) return false

  const checkOutDate = normalizeDate(booking.checkOutDate)
  if (!checkOutDate) return false

  const todayStart = startOfDay(now)
  return checkOutDate >= todayStart
}

function getOperationalCountsForToday(
  property: PropertyDetail,
  now: Date
): PropertyOperationalCounts {
  const tasks = safeArray(property.tasks)
  const issues = safeArray(property.issues)
  const supplies = safeArray(property.propertySupplies)
  const fallbackBookingsWithoutTask = safeArray(property.bookings).filter((booking) =>
    isBookingPendingTaskCreation(booking, now)
  ).length
  const bookingsWithoutTaskCount =
    safeArray(property.bookingsWithoutTask).length ||
    property.bookingsWithoutTaskCount ||
    property.readinessSummary?.counters?.bookingsWithoutTask ||
    fallbackBookingsWithoutTask

  return {
    todayOpenTasks: tasks.filter((task) => isTodayOpenTask(task, now)).length,
    activeAlerts: tasks.filter((task) => isTaskAlertActive(task)).length,
    bookingsWithoutTask: bookingsWithoutTaskCount,
    openIssues: issues.filter((issue) => isOpenOperationalIssue(issue) && !isDamageIssue(issue)).length,
    openDamages: issues.filter((issue) => isOpenOperationalIssue(issue) && isDamageIssue(issue)).length,
    supplyShortages: supplies.filter((supply) => isSupplyShortage(supply)).length,
  }
}

/* legacy task-centric readiness helpers removed in favor of canonical property readiness
function getTodayReadinessStatus(property: PropertyDetail | null, now: Date): TodayReadinessStatus {
  if (!property) return "UNKNOWN"

  const hasKnownSources =
    Array.isArray(property.tasks) ||
    Array.isArray(property.issues) ||
    Array.isArray(property.propertySupplies)

  if (!hasKnownSources) return "UNKNOWN"

  const counts = getOperationalCountsForToday(property, now)
  const isReady =
    counts.todayOpenTasks === 0 &&
    counts.openIssues === 0 &&
    counts.openDamages === 0 &&
    counts.supplyShortages === 0

  return isReady ? "READY" : "NOT_READY"
}

function getTodayReadinessLabel(language: "el" | "en", status: TodayReadinessStatus) {
  if (status === "READY") return language === "en" ? "Ready" : "Ετοιμο"
  if (status === "NOT_READY") return language === "en" ? "Not ready" : "Μη ετοιμο"
  return language === "en" ? "Unknown" : "Αγνωστο"
}

function getTodayReadinessExplanation(
  property: PropertyDetail | null,
  language: "el" | "en",
  now: Date
) {
  if (!property) {
    return language === "en"
      ? "No property data are available."
      : "Δεν υπαρχουν διαθεσιμα δεδομενα ακινητου."
  }

  const counts = getOperationalCountsForToday(property, now)
  const status = getTodayReadinessStatus(property, now)

  if (status === "READY") {
    return language === "en"
      ? "No open work today, no open issues or damages, and no active supply shortages."
      : "Δεν υπαρχουν σημερα ανοιχτες εργασιες, βλαβες, ζημιες ή ελλειψεις αναλωσιμων."
  }

  if (status === "UNKNOWN") {
    return language === "en"
      ? "Not enough operational data to calculate today's readiness."
      : "Δεν υπαρχουν αρκετα επιχειρησιακα δεδομενα για σημερινο readiness."
  }

  const pieces: string[] = []

  if (counts.todayOpenTasks > 0) {
    pieces.push(
      language === "en"
        ? `${counts.todayOpenTasks} open tasks today`
        : `${counts.todayOpenTasks} ανοιχτες εργασιες σημερα`
    )
  }

  if (counts.activeAlerts > 0) {
    pieces.push(
      language === "en"
        ? `${counts.activeAlerts} active alerts`
        : `${counts.activeAlerts} ενεργα alert`
    )
  }

  if (counts.openIssues > 0) {
    pieces.push(
      language === "en"
        ? `${counts.openIssues} open issues`
        : `${counts.openIssues} ανοιχτες βλαβες`
    )
  }

  if (counts.openDamages > 0) {
    pieces.push(
      language === "en"
        ? `${counts.openDamages} open damages`
        : `${counts.openDamages} ανοιχτες ζημιες`
    )
  }

  if (counts.supplyShortages > 0) {
    pieces.push(
      language === "en"
        ? `${counts.supplyShortages} supply shortages`
        : `${counts.supplyShortages} ελλειψεις αναλωσιμων`
    )
  }

  return pieces.join(" • ")
}
*/

function supplyStateBadgeClass(state: "missing" | "medium" | "full") {
  if (state === "missing") return "bg-red-50 text-red-700 ring-1 ring-red-200"
  if (state === "medium") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
}

function getLatestAssignment(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  return safeArray(task.assignments)[0] || null
}

function hasAcceptedAssignment(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  return safeArray(task.assignments).some((assignment) => {
    const normalized = String(assignment.status || "").trim().toLowerCase()
    return normalized === "accepted" || Boolean(assignment.acceptedAt)
  })
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

function isTaskAlertActive(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  if (!isOpenTaskStatus(task.status)) return false
  if (!task.alertEnabled || !task.alertAt) return false
  const alertDate = normalizeDate(task.alertAt)
  if (!alertDate) return false
  return alertDate.getTime() <= Date.now()
}

function isTaskBorderline(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  if (isTaskAlertActive(task)) return true
  if (!isOpenTaskStatus(task.status)) return false
  const now = new Date()
  const scheduled = parseDateAndTime(task.scheduledDate, task.scheduledStartTime || null)
  const due = task.dueDate ? new Date(task.dueDate) : null
  const candidates = [scheduled, due].filter((row): row is Date => Boolean(row && !Number.isNaN(row.getTime())))
  if (candidates.length === 0) return false
  const nearest = candidates.sort((a, b) => a.getTime() - b.getTime())[0]
  return nearest.getTime() - now.getTime() <= 3 * 60 * 60 * 1000
}

function getCleaningRun(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  if (task.cleaningChecklistRun) return task.cleaningChecklistRun
  if (task.sendCleaningChecklist && task.checklistRun) return task.checklistRun
  return null
}

function getSuppliesRun(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  return task.suppliesChecklistRun || null
}

function getIssuesRun(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  return task.issuesChecklistRun || null
}

function answerHasUsefulData(answer: AnswerLike | null | undefined) {
  if (!answer) return false
  if (answer.valueBoolean !== null && answer.valueBoolean !== undefined) return true
  if (String(answer.valueText ?? "").trim()) return true
  if (String(answer.valueSelect ?? "").trim()) return true
  if (answer.valueNumber !== null && answer.valueNumber !== undefined) return true
  if (String(answer.note ?? answer.notes ?? "").trim()) return true
  if (String(answer.title ?? "").trim()) return true
  if (String(answer.description ?? "").trim()) return true
  if (String(answer.locationText ?? "").trim()) return true
  if (safeArray(answer.photoUrls).length > 0) return true
  if (answer.createdIssueId) return true
  return false
}

function isChecklistRunSubmitted(run?: ChecklistRunLite | IssueRunLite | null) {
  if (!run) return false
  const normalized = String(run.status || "").trim().toLowerCase()
  if (["submitted", "completed", "done", "υποβλήθηκε", "ολοκληρώθηκε"].includes(normalized)) return true
  if (run.completedAt || run.submittedAt) return true
  if (safeArray(run.answers).some((answer) => answerHasUsefulData(answer))) return true
  return false
}

function isChecklistRunInProgress(run?: ChecklistRunLite | IssueRunLite | null) {
  if (!run) return false
  if (isChecklistRunSubmitted(run)) return false
  const normalized = String(run.status || "").trim().toLowerCase()
  if (["in_progress", "in-progress", "started", "active"].includes(normalized)) return true
  if (run.startedAt) return true
  if (safeArray(run.answers).some((answer) => answerHasUsefulData(answer))) return true
  return false
}

function isChecklistActuallySent(params: { task: NonNullable<PropertyDetail["tasks"]>[number]; run?: ChecklistRunLite | IssueRunLite | null; enabled: boolean }) {
  const { task, run, enabled } = params
  if (!enabled) return false
  if (run?.sentAt) return true
  if (hasAcceptedAssignment(task)) return true
  return false
}

function resolveChecklistUiState(params: { task: NonNullable<PropertyDetail["tasks"]>[number]; run?: ChecklistRunLite | IssueRunLite | null; enabled: boolean }): ChecklistUiState {
  const { task, run, enabled } = params
  if (!enabled) {
    return { key: "inactive", enabled: false, sent: false, submitted: false, inProgress: false, tone: "bg-slate-100 text-slate-700 ring-1 ring-slate-200" }
  }

  const sent = isChecklistActuallySent({ task, run, enabled })
  const submitted = isChecklistRunSubmitted(run)
  const inProgress = isChecklistRunInProgress(run)

  if (!sent) return { key: "not_sent", enabled: true, sent: false, submitted, inProgress, tone: "bg-slate-100 text-slate-700 ring-1 ring-slate-200" }
  if (submitted) return { key: "submitted", enabled: true, sent: true, submitted: true, inProgress: false, tone: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" }
  if (inProgress) return { key: "in_progress", enabled: true, sent: true, submitted: false, inProgress: true, tone: "bg-sky-50 text-sky-700 ring-1 ring-sky-200" }
  return { key: "sent_pending", enabled: true, sent: true, submitted: false, inProgress: false, tone: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" }
}

function getChecklistStateLabel(language: "el" | "en", state: ChecklistUiState, notSentLabel: string) {
  if (state.key === "inactive" || state.key === "not_sent") return notSentLabel
  if (state.key === "submitted") {
    return getChecklistStatusLabel(language, "submitted", { enabled: true, submitted: true, completed: true })
  }
  if (state.key === "in_progress") return language === "en" ? "In progress" : "Σε εξέλιξη"
  return getChecklistStatusLabel(language, "pending", { enabled: true, submitted: false, completed: false })
}

function getLatestRunMoment(run?: ChecklistRunLite | IssueRunLite | null) {
  if (!run) return null

  const values = [run.submittedAt, run.completedAt, run.sentAt, run.startedAt]
    .map((value) => normalizeDate(value))
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())

  return values[0] || null
}

function getFriendlyTaskCondition(task: NonNullable<PropertyDetail["tasks"]>[number], language: "el" | "en") {
  const normalizedTaskState = normalizeTaskStatus(task.status)
  if (isTaskAlertActive(task)) return language === "en" ? "Needs immediate action" : "Θέλει άμεση ενέργεια"
  if (isTaskBorderline(task)) return language === "en" ? "Borderline timing" : "Οριακό χρονικά"
  if (["ACCEPTED", "IN_PROGRESS"].includes(normalizedTaskState)) return language === "en" ? "Normal progress" : "Κανονική ροή"
  if (["NEW", "PENDING", "ASSIGNED", "WAITING_ACCEPTANCE"].includes(normalizedTaskState)) return language === "en" ? "Pending handling" : "Εκκρεμεί διαχείριση"
  if (normalizedTaskState === "COMPLETED") return language === "en" ? "Completed" : "Ολοκληρωμένη"
  return language === "en" ? "Current state" : "Τρέχουσα κατάσταση"
}

function getFriendlyTaskConditionTone(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  const normalizedTaskState = normalizeTaskStatus(task.status)
  if (isTaskAlertActive(task)) return "bg-red-50 text-red-700 ring-1 ring-red-200"
  if (isTaskBorderline(task)) return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  if (["ACCEPTED", "IN_PROGRESS"].includes(normalizedTaskState)) return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
  if (normalizedTaskState === "COMPLETED") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
}

function getTaskCardTone(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  const normalizedTaskState = normalizeTaskStatus(task.status)

  if (isTaskAlertActive(task)) {
    return {
      card: "border-red-100 bg-gradient-to-r from-red-50/75 via-white to-white",
      accentBorder: "border-red-100",
      action: "border-red-200 hover:bg-red-50",
    }
  }

  if (isTaskBorderline(task)) {
    return {
      card: "border-amber-100 bg-gradient-to-r from-amber-50/75 via-white to-white",
      accentBorder: "border-amber-100",
      action: "border-amber-200 hover:bg-amber-50",
    }
  }

  if (["ACCEPTED", "IN_PROGRESS"].includes(normalizedTaskState)) {
    return {
      card: "border-sky-100 bg-gradient-to-r from-sky-50/75 via-white to-white",
      accentBorder: "border-sky-100",
      action: "border-sky-200 hover:bg-sky-50",
    }
  }

  if (["NEW", "PENDING", "ASSIGNED", "WAITING_ACCEPTANCE"].includes(normalizedTaskState)) {
    return {
      card: "border-violet-100 bg-gradient-to-r from-violet-50/75 via-white to-white",
      accentBorder: "border-violet-100",
      action: "border-violet-200 hover:bg-violet-50",
    }
  }

  if (normalizedTaskState === "COMPLETED") {
    return {
      card: "border-emerald-100 bg-gradient-to-r from-emerald-50/75 via-white to-white",
      accentBorder: "border-emerald-100",
      action: "border-emerald-200 hover:bg-emerald-50",
    }
  }

  return {
    card: "border-slate-200 bg-gradient-to-r from-slate-50 via-white to-white",
    accentBorder: "border-slate-200",
    action: "border-slate-300 hover:bg-slate-50",
  }
}

function buildExecutionWindowLabel(task: NonNullable<PropertyDetail["tasks"]>[number], locale: string, language: "el" | "en") {
  const dateText = formatDate(task.scheduledDate, locale)
  const fromText = formatTime(task.scheduledStartTime)
  const toText = formatTime(task.scheduledEndTime)
  if (fromText !== "—" && toText !== "—") return language === "en" ? `${dateText} · ${fromText} to ${toText}` : `${dateText} · ${fromText} έως ${toText}`
  if (fromText !== "—") return language === "en" ? `${dateText} · from ${fromText}` : `${dateText} · από ${fromText}`
  if (toText !== "—") return language === "en" ? `${dateText} · until ${toText}` : `${dateText} · έως ${toText}`
  return dateText
}

function buildBookingWindowLabel(task: NonNullable<PropertyDetail["tasks"]>[number], locale: string, language: "el" | "en", emptyValue: string) {
  if (!task.booking) return emptyValue
  const checkIn = formatDate(task.booking.checkInDate, locale)
  const checkOut = formatDate(task.booking.checkOutDate, locale)
  return language === "en" ? `${checkIn} to ${checkOut}` : `${checkIn} έως ${checkOut}`
}
function buildReadinessReasons(property: PropertyDetail, language: "el" | "en") {
  const directReasons = String(property.readinessReasonsText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  if (directReasons.length > 0) return directReasons

  const readinessReasonRows = safeArray(property.readinessSummary?.reasons)
    .map((row) => (typeof row === "string" ? row.trim() : String(row?.message || "").trim()))
    .filter(Boolean)
  if (readinessReasonRows.length > 0) return readinessReasonRows

  const conditionReasonRows = safeArray(property.readinessSummary?.conditions?.reasons)
    .map((row) => String(row?.message || "").trim())
    .filter(Boolean)
  if (conditionReasonRows.length > 0) return conditionReasonRows

  const reasons: string[] = []

  if ((property.openBlockingConditionCount || 0) > 0) {
    reasons.push(
      language === "en"
        ? `There are ${property.openBlockingConditionCount} blocking property conditions still active.`
        : `Υπάρχουν ${property.openBlockingConditionCount} μπλοκαριστικές συνθήκες ακινήτου που παραμένουν ενεργές.`
    )
  }

  if ((property.openWarningConditionCount || 0) > 0) {
    reasons.push(
      language === "en"
        ? `There are ${property.openWarningConditionCount} warning conditions that still require monitoring.`
        : `Υπάρχουν ${property.openWarningConditionCount} προειδοποιητικές συνθήκες που εξακολουθούν να χρειάζονται παρακολούθηση.`
    )
  }

  if ((property.openConditionCount || 0) > 0) {
    reasons.push(
      language === "en"
        ? `${property.openConditionCount} active property conditions still shape today's readiness.`
        : `${property.openConditionCount} ενεργές συνθήκες ακινήτου εξακολουθούν να καθορίζουν τη σημερινή ετοιμότητα.`
    )
  }

  if (reasons.length === 0 && property.nextCheckInAt) {
    reasons.push(language === "en" ? "No blocking items were detected for the next check-in." : "Δεν εντοπίστηκαν στοιχεία που μπλοκάρουν το επόμενο check-in.")
  }

  if (reasons.length === 0) {
    reasons.push(language === "en" ? "No readiness details are currently available." : "Δεν υπάρχουν ακόμη διαθέσιμες λεπτομέρειες ετοιμότητας.")
  }

  return reasons
}

function getReadinessState(property: PropertyDetail | null, language: "el" | "en", unknownLabel: string, noDataLabel: string) {
  if (!property) {
    return {
      status: "UNKNOWN" as CanonicalReadinessStatus,
      label: unknownLabel,
      tone: getReadinessTone("UNKNOWN"),
      details: noDataLabel,
      reasons: [noDataLabel],
    }
  }

  const status = normalizeCanonicalReadinessStatus(
    property.readinessSummary?.status ?? property.storedReadinessSummary?.readinessStatus ?? property.readinessStatus
  )

  const reasons = buildReadinessReasons(property, language)

  return {
    status,
    label: getCanonicalReadinessLabel(language, status, unknownLabel),
    tone: getReadinessTone(status),
    details: reasons[0] || noDataLabel,
    reasons: reasons.length > 0 ? reasons : [noDataLabel],
  }
}

function buildCalendarDays(params: {
  property: PropertyDetail
  anchorDate: Date
  granularity: CalendarGranularity
}) {
  const { property, anchorDate, granularity } = params
  const openIssues = safeArray(property.issues).filter((issue) => {
    const status = normalizeIssueStatus(issue.status)
    return status === "OPEN" || status === "IN_PROGRESS"
  })
  const activeConditions = safeArray(property.readinessSummary?.conditions?.active)

  let from = startOfDay(anchorDate)
  let to = startOfDay(anchorDate)

  if (granularity === "week") {
    from = startOfWeek(anchorDate)
    to = endOfWeek(anchorDate)
  }

  if (granularity === "month") {
    from = startOfMonthGrid(anchorDate)
    to = endOfMonthGrid(anchorDate)
  }

  const days: CalendarDayItem[] = []
  let cursor = from

  while (cursor <= to) {
    const key = dayKey(cursor)
    const openTasks = safeArray(property.tasks).filter((task) => {
      return isOpenTaskStatus(task.status) && normalizeDateOnlyValue(task.scheduledDate) === key
    })
    const completedTasks = safeArray(property.tasks).filter((task) => {
      return isCompletedTaskStatus(task.status) && normalizeDateOnlyValue(task.scheduledDate) === key
    })
    const alerts = openTasks.filter((task) => isTaskAlertActive(task)).length
    const criticalIssues = openIssues.filter((issue) => {
      const severity = normalizeIssuePriority(issue.severity)
      return severity === "HIGH" || severity === "URGENT"
    }).length
    const blockingConditions = activeConditions.filter((item) => String(item.blockingStatus || "").toLowerCase() === "blocking").length
    const warningConditions = activeConditions.filter((item) => String(item.blockingStatus || "").toLowerCase() !== "blocking").length

    const hasCheckIn = false
    const hasCheckOut = false
    const hasStay = false

    let tone: CalendarTone = "neutral"

    if (alerts > 0) {
      tone = "blocking"
    } else if (openTasks.length > 0) {
      tone = "warning"
    } else if (completedTasks.length > 0) {
      tone = "ready"
    }

    days.push({
      key,
      date: new Date(cursor),
      isToday: sameDay(cursor, new Date()),
      isCurrentMonth: cursor.getMonth() === anchorDate.getMonth(),
      hasCheckIn,
      hasCheckOut,
      hasStay,
      openTasks: openTasks.length,
      completedTasks: completedTasks.length,
      alerts,
      criticalIssues,
      blockingConditions,
      warningConditions,
      tone,
    })

    cursor = addDays(cursor, 1)
  }

  return days
}

function buildMonthTitle(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date)
}

function buildWeekdayLabels(locale: string) {
  const base = startOfWeek(new Date())
  return Array.from({ length: 7 }, (_, index) => {
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(addDays(base, index))
  })
}

function TooltipHint({ label }: { label: string }) {
  return (
    <span
      title={label}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200"
    >
      i
    </span>
  )
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
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
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

function InfoChip({
  label,
  value,
  valueClassName,
  hint,
  href,
}: {
  label: string
  value: string
  valueClassName?: string
  hint?: string
  href?: string
}) {
  const className = `rounded-2xl border border-slate-200 bg-slate-50 p-4 ${
    href ? "block transition hover:border-slate-300 hover:bg-white" : ""
  }`

  const content = (
    <>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        {hint ? <TooltipHint label={hint} /> : null}
      </div>
      <div className={`mt-2 text-sm font-medium ${valueClassName || "text-slate-900"}`}>{value}</div>
    </>
  )

  if (href) {
    return (
      <Link href={href} title={hint} className={className}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}

function CounterButton({
  label,
  value,
  active,
  onClick,
  tone = "slate",
  helper,
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
  tone?: "slate" | "amber" | "blue" | "emerald" | "red"
  helper?: string
}) {
  const tones = {
    slate: active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
    amber: active ? "border-amber-500 bg-amber-500 text-white" : "border-amber-200 bg-white text-amber-800 hover:bg-amber-50",
    blue: active ? "border-sky-500 bg-sky-500 text-white" : "border-sky-200 bg-white text-sky-800 hover:bg-sky-50",
    emerald: active ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
    red: active ? "border-red-600 bg-red-600 text-white" : "border-red-200 bg-white text-red-800 hover:bg-red-50",
  }

  return (
    <button type="button" onClick={onClick} title={helper} className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition ${tones[tone]}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1.5 text-2xl font-bold leading-none">{value}</div>
      {helper ? <div className="mt-1 text-[11px] opacity-80">{helper}</div> : null}
    </button>
  )
}

function ActionPanelCard({
  title,
  description,
  onClick,
  href,
}: {
  title: string
  description: string
  onClick?: () => void
  href?: string
}) {
  const className =
    "rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"

  const content = (
    <>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-500">{description}</div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}
function SegmentSwitch<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string; hint?: string }>
}) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            title={option.hint || option.label}
            onClick={() => onChange(option.value)}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function SectionShell({ id, title, subtitle, actions, children }: { id?: string; title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function CalendarDayCard({
  item,
  locale,
  labels,
  onClick,
}: {
  item: CalendarDayItem
  locale: string
  labels: {
    openTasks: string
    alerts: string
    blocking: string
    warnings: string
    checkIn: string
    checkOut: string
    stay: string
  }
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={formatDate(item.date, locale)}
      className={`min-h-[148px] rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${calendarToneClasses(item.tone)} ${item.isToday ? "ring-2 ring-slate-900/10" : ""} ${item.isCurrentMonth ? "opacity-100" : "opacity-55"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-900">{item.date.getDate()}</div>
        {item.isToday ? <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">Σήμερα</span> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.alerts > 0 ? <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-700 ring-1 ring-red-200">{labels.alerts}: {item.alerts}</span> : null}
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-slate-700">
        <div>{labels.openTasks}: {item.openTasks}</div>
        <div className={item.alerts > 0 ? "font-semibold text-red-700" : ""}>{labels.alerts}: {item.alerts}</div>
      </div>
    </button>
  )
}

export default function PropertyDetailPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { language } = useAppLanguage()
  const locale = language === "en" ? "en-GB" : "el-GR"

  const t = useMemo(() => {
    if (language === "en") {
      return {
        back: "Back to properties",
        loading: "Loading property...",
        loadError: "Property could not be loaded.",
        noPropertyData: "No property data were returned.",
        saveError: "Could not save property changes.",
        partnerSaveError: "Could not save default partner.",
        propertySaveSuccess: "Property details were saved successfully.",
        partnerSaveSuccess: "Default partner was saved successfully.",
        propertyDetails: "Property details",
        editProperty: "Edit the basic property details.",
        defaultPartnerTitle: "Default partner",
        defaultPartnerSubtitle: "Select the default partner for this property.",
        openPropertyTasksPage: "Open tasks page",
        openTaskButton: "Open task",
        readiness: "Readiness",
        lastUpdate: "Last update",
        close: "Close",
        cancel: "Cancel",
        saving: "Saving...",
        saveChanges: "Save changes",
        choosePartner: "Choose partner",
        noPartner: "No partner",
        savePartner: "Save partner",
        editDefaultPartner: "Edit default partner",
        code: "Code",
        name: "Name",
        address: "Address",
        city: "City",
        region: "Region",
        postalCode: "Postal code",
        country: "Country",
        type: "Type",
        status: "Status",
        bedrooms: "Bedrooms",
        bathrooms: "Bathrooms",
        maxGuests: "Max guests",
        notes: "Notes",
        partner: "Partner",
        email: "Email",
        phone: "Phone",
        target: "Target",
        category: "Category",
        location: "Location",
        linkedTask: "Linked task",
        sent: "Sent",
        submitted: "Submitted",
        all: "All open",
        pending: "Pending",
        assigned: "Assigned",
        accepted: "Accepted",
        inProgress: "In progress",
        alerts: "Alerts",
        bookingsWithoutTask: "Bookings without task",
        readinessTitle: "Property readiness",
        readinessSubtitle: "Simple operational picture for the next check-in.",
        nextCheckIn: "Next check-in",
        timeLeft: "Time left",
        readinessReasons: "Why it is in this state",
        tasksTitle: "Open tasks",
        tasksSubtitle: "Only the open tasks that matter for today’s operations.",
        dateFrom: "From",
        dateTo: "To",
        clearDates: "Clear dates",
        dateFilterHint: "Filters tasks by scheduled date.",
        executionWindow: "Execution time",
        bookingWindow: "Booking dates",
        noPartnerShort: "Not assigned",
        noDateFilterResults: "No tasks match the selected dates and filter.",
        taskExecutionRangeExplanation: "Execution time shows the planned from–to window of each task.",
        manageListsButton: "Property lists",
        allOpenHelper: "All currently open tasks",
        pendingHelper: "Need handling",
        assignedHelper: "Waiting for partner response",
        acceptedHelper: "Accepted by partner",
        progressHelper: "Currently in execution",
        alertsHelper: "Need immediate attention",
        bookingsWithoutTaskHelper:
          "Mapped bookings for this property that still do not have a created task. Opens the filtered bookings view.",
        suppliesMissingHelper: "Low or empty",
        suppliesMediumHelper: "Need refill soon",
        suppliesFullHelper: "Healthy stock",
        suppliesAllHelper: "All supplies",
        proofTitle: "Proof of readiness",
        proofSubtitle: "Checklist progress for the open tasks.",
        issuesListTitle: "Issues and damages",
        issuesListSubtitle: "Only the active operational issues.",
        propertyControlTitle: "Property control",
        propertyControlSubtitle: "Basic details, default partner and access to property lists.",
        cleaningList: "Cleaning",
        suppliesList: "Supplies",
        issuesList: "Issues / damages",
        notSent: "Not sent",
        openReadinessDetails: "Readiness details",
        listSectionTitle: "Readiness lists for this task",
        listDisabledHelper: "This list is disabled for this task.",
        listNotSentHelper: "This list has not been sent yet.",
        listPendingHelper: "This list has been sent but not submitted yet.",
        listInProgressHelper: "This list has started but is not submitted yet.",
        listSubmittedHelper: "This list has been submitted.",
        supplyQuantity: "Current quantity",
        supplyLastUpdate: "Last update",
        supplyCritical: "Critical supply",
        supplyNonCritical: "Non-critical supply",
        issueCreatedAt: "Created",
        issueUpdatedAt: "Last update",
        noSuppliesForFilter: "There are no supplies for the selected filter.",
        noIssuesForFilter: "There are no issues for the selected filter.",
        readinessExplain: "Readiness explanation",
        nextActions: "Next actions",
        currentPartner: "Current partner",
        taskNotes: "Task notes",
        taskResultNotes: "Task result",
        allIssues: "All active",
        criticalOnly: "Critical only",
        allSupplies: "All supplies",
        missingSupplies: "Missing",
        mediumSupplies: "Medium",
        fullSupplies: "Full",
        noConditionsSummary: "No condition details are currently available.",
        activeConditions: "Active conditions",
        warnings: "Warnings",
        blockingConditions: "Blocking conditions",
        openSupplies: "Open supplies",
        closeSupplies: "Hide supplies",
        overviewView: "Overview",
        overviewHint: "Simple operational summary of the property.",
        calendarView: "Calendar",
        calendarHint: "See the property picture across time.",
        monthView: "Month",
        weekView: "Week",
        dayView: "Day",
        previous: "Previous",
        today: "Today",
        next: "Next",
        calendarTitle: "Property calendar",
        calendarSubtitle: "One glance at what is calm and what needs attention.",
        openTasksShort: "Open tasks",
        alertsShort: "Alerts",
        blockingShort: "Blocking",
        warningsShort: "Warnings",
        checkIn: "Check-in",
        checkOut: "Check-out",
        stay: "Stay",
      }
    }

    return {
      back: "Επιστροφή στα ακίνητα",
      loading: "Φόρτωση ακινήτου...",
      loadError: "Δεν ήταν δυνατή η φόρτωση του ακινήτου.",
      noPropertyData: "Δεν επιστράφηκαν δεδομένα ακινήτου.",
      saveError: "Δεν ήταν δυνατή η αποθήκευση των στοιχείων ακινήτου.",
      partnerSaveError: "Δεν ήταν δυνατή η αποθήκευση του προεπιλεγμένου συνεργάτη.",
      propertySaveSuccess: "Τα στοιχεία ακινήτου αποθηκεύτηκαν επιτυχώς.",
      partnerSaveSuccess: "Ο προεπιλεγμένος συνεργάτης αποθηκεύτηκε επιτυχώς.",
      propertyDetails: "Στοιχεία ακινήτου",
      editProperty: "Επεξεργασία βασικών στοιχείων ακινήτου.",
      defaultPartnerTitle: "Προεπιλεγμένος συνεργάτης",
      defaultPartnerSubtitle: "Επιλογή προεπιλεγμένου συνεργάτη για το ακίνητο.",
      openPropertyTasksPage: "Άνοιγμα εργασιών",
      openTaskButton: "Άνοιγμα εργασίας",
      readiness: "Ετοιμότητα",
      lastUpdate: "Τελευταία ενημέρωση",
      close: "Κλείσιμο",
      cancel: "Ακύρωση",
      saving: "Αποθήκευση...",
      saveChanges: "Αποθήκευση αλλαγών",
      choosePartner: "Επιλογή συνεργάτη",
      noPartner: "Χωρίς συνεργάτη",
      savePartner: "Αποθήκευση συνεργάτη",
      editDefaultPartner: "Αλλαγή προεπιλεγμένου συνεργάτη",
      code: "Κωδικός",
      name: "Όνομα",
      address: "Διεύθυνση",
      city: "Πόλη",
      region: "Περιοχή",
      postalCode: "Ταχ. κώδικας",
      country: "Χώρα",
      type: "Τύπος",
      status: "Κατάσταση",
      bedrooms: "Υπνοδωμάτια",
      bathrooms: "Μπάνια",
      maxGuests: "Μέγιστοι επισκέπτες",
      notes: "Σημειώσεις",
      partner: "Συνεργάτης",
      email: "Email",
      phone: "Τηλέφωνο",
      target: "Στόχος",
      category: "Κατηγορία",
      location: "Τοποθεσία",
      linkedTask: "Συνδεδεμένη εργασία",
      sent: "Στάλθηκαν",
      submitted: "Υποβλήθηκαν",
      all: "Όλες οι ανοιχτές",
      pending: "Εκκρεμούν",
      assigned: "Ανατέθηκαν",
      accepted: "Αποδεκτές",
      inProgress: "Σε εξέλιξη",
      alerts: "Άμεση προσοχή",
      bookingsWithoutTask: "Κρατήσεις χωρίς εργασία",
      readinessTitle: "Ετοιμότητα ακινήτου",
      readinessSubtitle: "Απλή επιχειρησιακή εικόνα για το επόμενο check-in.",
      nextCheckIn: "Επόμενο check-in",
      timeLeft: "Χρόνος που απομένει",
      readinessReasons: "Γιατί βρίσκεται σε αυτή την κατάσταση",
      tasksTitle: "Ανοιχτές εργασίες",
      tasksSubtitle: "Μόνο οι ανοιχτές εργασίες που επηρεάζουν την τρέχουσα εικόνα.",
      dateFrom: "Από",
      dateTo: "Έως",
      clearDates: "Καθαρισμός",
      dateFilterHint: "Φιλτράρει τις εργασίες με βάση την προγραμματισμένη ημερομηνία.",
      executionWindow: "Χρόνος εκτέλεσης",
      bookingWindow: "Ημερομηνίες κράτησης",
      noPartnerShort: "Δεν έχει οριστεί",
      noDateFilterResults: "Δεν υπάρχουν εργασίες για τις επιλεγμένες ημερομηνίες και το τρέχον φίλτρο.",
      taskExecutionRangeExplanation: "Ο χρόνος εκτέλεσης δείχνει το προγραμματισμένο διάστημα κάθε εργασίας.",
      manageListsButton: "Λίστες ακινήτου",
      allOpenHelper: "Όλες οι ανοιχτές εργασίες",
      pendingHelper: "Θέλουν διαχείριση",
      assignedHelper: "Περιμένουν απάντηση συνεργάτη",
      acceptedHelper: "Έχουν αποδεχθεί",
      progressHelper: "Εκτελούνται τώρα",
      alertsHelper: "Θέλουν άμεση προσοχή",
      bookingsWithoutTaskHelper:
        "Κρατήσεις αυτού του ακινήτου που έχουν αντιστοιχιστεί αλλά δεν έχει δημιουργηθεί ακόμη εργασία. Ανοίγει τη φιλτραρισμένη προβολή κρατήσεων.",
      suppliesMissingHelper: "Χαμηλά ή άδεια",
      suppliesMediumHelper: "Θέλουν σύντομα γέμισμα",
      suppliesFullHelper: "Υγιές απόθεμα",
      suppliesAllHelper: "Όλα τα αναλώσιμα",
      proofTitle: "Απόδειξη ετοιμότητας",
      proofSubtitle: "Πρόοδος λιστών στις ανοιχτές εργασίες.",
      issuesListTitle: "Ζημιές και βλάβες",
      issuesListSubtitle: "Μόνο τα ενεργά επιχειρησιακά θέματα.",
      propertyControlTitle: "Έλεγχος ακινήτου",
      propertyControlSubtitle: "Βασικά στοιχεία, προεπιλεγμένος συνεργάτης και πρόσβαση στις λίστες.",
      cleaningList: "Καθαριότητα",
      suppliesList: "Αναλώσιμα",
      issuesList: "Βλάβες / ζημιές",
      notSent: "Δεν στάλθηκε",
      openReadinessDetails: "Λεπτομέρειες ετοιμότητας",
      listSectionTitle: "Λίστες αυτής της εργασίας",
      listDisabledHelper: "Η λίστα είναι ανενεργή για αυτή την εργασία.",
      listNotSentHelper: "Η λίστα δεν έχει σταλεί ακόμη.",
      listPendingHelper: "Η λίστα στάλθηκε αλλά δεν έχει υποβληθεί.",
      listInProgressHelper: "Η λίστα έχει ξεκινήσει αλλά δεν έχει υποβληθεί.",
      listSubmittedHelper: "Η λίστα έχει υποβληθεί.",
      supplyQuantity: "Τρέχουσα ποσότητα",
      supplyLastUpdate: "Τελευταία ενημέρωση",
      supplyCritical: "Κρίσιμο αναλώσιμο",
      supplyNonCritical: "Μη κρίσιμο αναλώσιμο",
      issueCreatedAt: "Καταγράφηκε",
      issueUpdatedAt: "Τελευταία ενημέρωση",
      noSuppliesForFilter: "Δεν υπάρχουν αναλώσιμα για το επιλεγμένο φίλτρο.",
      noIssuesForFilter: "Δεν υπάρχουν θέματα για το επιλεγμένο φίλτρο.",
      readinessExplain: "Επεξήγηση ετοιμότητας",
      nextActions: "Επόμενες ενέργειες",
      currentPartner: "Τρέχων συνεργάτης",
      taskNotes: "Σημειώσεις εργασίας",
      taskResultNotes: "Αποτέλεσμα εργασίας",
      allIssues: "Όλα τα ενεργά",
      criticalOnly: "Μόνο κρίσιμα",
      allSupplies: "Όλα τα αναλώσιμα",
      missingSupplies: "Έλλειψη",
      mediumSupplies: "Μέτρια",
      fullSupplies: "Πλήρης",
      noConditionsSummary: "Δεν υπάρχουν ακόμη λεπτομέρειες συνθηκών.",
      activeConditions: "Ενεργές συνθήκες",
      warnings: "Προειδοποιήσεις",
      blockingConditions: "Συνθήκες που μπλοκάρουν",
      openSupplies: "Άνοιγμα αναλωσίμων",
      closeSupplies: "Απόκρυψη αναλωσίμων",
      overviewView: "Επισκόπηση",
      overviewHint: "Απλή συνολική εικόνα του ακινήτου.",
      calendarView: "Ημερολόγιο",
      calendarHint: "Δες την εικόνα του ακινήτου μέσα στον χρόνο.",
      monthView: "Μήνας",
      weekView: "Εβδομάδα",
      dayView: "Ημέρα",
      previous: "Προηγούμενο",
      today: "Σήμερα",
      next: "Επόμενο",
      calendarTitle: "Ημερολόγιο ακινήτου",
      calendarSubtitle: "Με μία ματιά τι είναι ήρεμο και τι θέλει παρέμβαση.",
      openTasksShort: "Ανοιχτές εργασίες",
      alertsShort: "Άμεση προσοχή",
      blockingShort: "Μπλοκάρει",
      warningsShort: "Προειδοποιήσεις",
      checkIn: "Check-in",
      checkOut: "Check-out",
      stay: "Διαμονή",
    }
  }, [language])
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

  const [viewMode, setViewMode] = useState<ViewMode>("overview")
  const [calendarGranularity, setCalendarGranularity] = useState<CalendarGranularity>("month")
  const [calendarDate, setCalendarDate] = useState<Date>(startOfDay(new Date()))

  const [openTaskFilter, setOpenTaskFilter] = useState<OpenTaskFilter>("all_open")
  const [supplyFilter, setSupplyFilter] = useState<SupplyFilter>("all")
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("open")
  const [suppliesOpen, setSuppliesOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const todayReference = useMemo(() => startOfDay(new Date()), [])

  const loadPage = useCallback(async () => {
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
        throw new Error(propertyJson?.error || t.loadError)
      }

      const normalizedProperty = (propertyJson?.property ?? propertyJson?.data ?? propertyJson) as PropertyDetail
      const normalizedPartners = Array.isArray(partnersJson)
        ? partnersJson
        : Array.isArray(partnersJson?.partners)
          ? partnersJson.partners
          : Array.isArray(partnersJson?.data)
            ? partnersJson.data
            : []

      setProperty(normalizedProperty)
      setPartners(normalizedPartners as PartnerOption[])
      setPropertyForm(buildPropertyEditForm(normalizedProperty))
      setSelectedPartnerId(String(normalizedProperty.defaultPartnerId || ""))
    } catch (err) {
      console.error("Load property detail error:", err)
      setError(err instanceof Error ? err.message : t.loadError)
      setProperty(null)
    } finally {
      setLoading(false)
    }
  }, [id, t.loadError])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  const tasks = useMemo(() => safeArray(property?.tasks), [property])
  const bookingsWithoutTask = useMemo(() => {
    if (!property) return []

    const routeRows = safeArray(property.bookingsWithoutTask)
    if (routeRows.length > 0) return routeRows

    return safeArray(property.bookings).filter((booking) =>
      isBookingPendingTaskCreation(booking, todayReference)
    )
  }, [property, todayReference])
  const bookingsWithoutTaskCount = bookingsWithoutTask.length
  const bookingsWithoutTaskHref = useMemo(() => {
    if (!property?.id) return "/bookings?filter=withoutTasks"
    return `/bookings?propertyId=${property.id}&filter=withoutTasks`
  }, [property?.id])
  const openTasksBase = useMemo(() => tasks.filter((task) => isOpenTaskStatus(task.status)), [tasks])

  const openTaskCounts = useMemo(() => {
    return {
      all_open: openTasksBase.length,
      pending: openTasksBase.filter((task) => ["PENDING", "NEW"].includes(normalizeTaskStatus(task.status))).length,
      assigned: openTasksBase.filter((task) => ["ASSIGNED", "WAITING_ACCEPTANCE"].includes(normalizeTaskStatus(task.status))).length,
      accepted: openTasksBase.filter((task) => normalizeTaskStatus(task.status) === "ACCEPTED").length,
      in_progress: openTasksBase.filter((task) => normalizeTaskStatus(task.status) === "IN_PROGRESS").length,
      alerts: openTasksBase.filter((task) => isTaskAlertActive(task)).length,
    }
  }, [openTasksBase])

  const visibleTasks = useMemo(() => {
    let rows = [...openTasksBase]
    rows = rows.filter((task) => isDateInRange(task.scheduledDate, dateFrom || undefined, dateTo || undefined))

    if (openTaskFilter === "alerts") {
      rows = rows.filter((task) => isTaskAlertActive(task))
    } else if (openTaskFilter !== "all_open") {
      rows = rows.filter((task) => {
        const normalized = normalizeTaskStatus(task.status)
        if (openTaskFilter === "pending") return normalized === "PENDING" || normalized === "NEW"
        if (openTaskFilter === "assigned") return normalized === "ASSIGNED" || normalized === "WAITING_ACCEPTANCE"
        if (openTaskFilter === "accepted") return normalized === "ACCEPTED"
        if (openTaskFilter === "in_progress") return normalized === "IN_PROGRESS"
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
  }, [openTasksBase, openTaskFilter, dateFrom, dateTo])

  const openIssues = useMemo(() => {
    return safeArray(property?.issues).filter((issue) => {
      const normalized = normalizeIssueStatus(issue.status)
      return normalized === "OPEN" || normalized === "IN_PROGRESS"
    })
  }, [property])

  const criticalIssues = useMemo(() => {
    return openIssues.filter((issue) => {
      const normalized = normalizeIssuePriority(issue.severity)
      return normalized === "HIGH" || normalized === "URGENT"
    })
  }, [openIssues])

  const visibleIssues = useMemo(() => {
    return issueFilter === "critical" ? criticalIssues : openIssues
  }, [issueFilter, criticalIssues, openIssues])

  const supplyRows = useMemo<SupplyRowView[]>(() => {
    const rows = safeArray(property?.propertySupplies).map((supply) => {
      const canonical = buildCanonicalSupplySnapshot({
        isActive: true,
        stateMode: supply.stateMode,
        fillLevel: supply.derivedState,
        currentStock: supply.currentStock,
        mediumThreshold: supply.mediumThreshold,
        fullThreshold: supply.fullThreshold,
        minimumThreshold: supply.minimumThreshold,
        reorderThreshold: supply.reorderThreshold,
        targetStock: supply.targetStock,
        supplyMinimumStock: supply.supplyItem?.minimumStock,
      })
      const derivedState = canonical.derivedState

      return {
        ...supply,
        derivedState,
        lastSeenUpdate: supply.lastUpdatedAt || supply.updatedAt || null,
        displayName: getSupplyDisplayName(language, {
          code: supply.supplyItem?.code,
          fallbackName: supply.supplyItem?.nameEn || supply.supplyItem?.nameEl || supply.supplyItem?.name,
        }),
      }
    })

    return rows.sort((a, b) => a.displayName.localeCompare(b.displayName, locale))
  }, [property, language, locale])

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

  const readiness = useMemo(() => {
    return getReadinessState(property, language, language === "en" ? "Unknown" : "Άγνωστο", language === "en" ? "No data available." : "Δεν υπάρχουν διαθέσιμα δεδομένα.")
  }, [property, language])

  const todayOperationalCounts = useMemo(() => {
    if (!property) {
      return { todayOpenTasks: 0, activeAlerts: 0, bookingsWithoutTask: 0, openIssues: 0, openDamages: 0, supplyShortages: 0 }
    }

    return getOperationalCountsForToday(property, todayReference)
  }, [property, todayReference])
  /* legacy local readiness reasons removed in favor of canonical backend readiness
    if (todayReadinessStatus === "READY") {
      return [
        language === "en"
          ? "Today there are no open tasks, no open issues, no open damages, and no supply shortages."
          : "Σημερα δεν υπαρχουν ανοιχτες εργασιες, βλαβες, ζημιες ή ελλειψεις αναλωσιμων.",
      ]
    }

    if (todayReadinessStatus === "UNKNOWN") {
      return [
        language === "en"
          ? "Today's readiness cannot be calculated because operational data are incomplete."
          : "Το σημερινο readiness δεν μπορει να υπολογιστει γιατι λειπουν επιχειρησιακα δεδομενα.",
      ]
    }

    const rows: string[] = []

    if (todayOperationalCounts.todayOpenTasks > 0) {
      rows.push(
        language === "en"
          ? `${todayOperationalCounts.todayOpenTasks} open tasks still affect today's property picture.`
          : `${todayOperationalCounts.todayOpenTasks} ανοιχτες εργασιες επηρεαζουν ακομα τη σημερινη εικονα του ακινητου.`
      )
    }

    if (todayOperationalCounts.openIssues > 0) {
      rows.push(
        language === "en"
          ? `${todayOperationalCounts.openIssues} open issues remain unresolved.`
          : `${todayOperationalCounts.openIssues} ανοιχτες βλαβες παραμενουν αλυτες.`
      )
    }

    if (todayOperationalCounts.openDamages > 0) {
      rows.push(
        language === "en"
          ? `${todayOperationalCounts.openDamages} open damages remain active.`
          : `${todayOperationalCounts.openDamages} ανοιχτες ζημιες παραμενουν ενεργες.`
      )
    }

    if (todayOperationalCounts.supplyShortages > 0) {
      rows.push(
        language === "en"
          ? `${todayOperationalCounts.supplyShortages} supply shortages are still active.`
          : `${todayOperationalCounts.supplyShortages} ελλειψεις αναλωσιμων παραμενουν ενεργες.`
      )
    }

    return rows
  */
  const todayReadinessLabel = readiness.label
  const todayReadinessExplanation = readiness.details
  const todayReadinessReasons = readiness.reasons
  const todayReadinessTone = readiness.tone

  const proofSummary = useMemo(() => {
    const buildSummary = (
      enabledSelector: (task: NonNullable<PropertyDetail["tasks"]>[number]) => boolean,
      runSelector: (task: NonNullable<PropertyDetail["tasks"]>[number]) => ChecklistRunLite | IssueRunLite | null,
    ) => {
      const enabledTasks = openTasksBase.filter(enabledSelector)
      const states = enabledTasks.map((task) => {
        const run = runSelector(task)
        return {
          state: resolveChecklistUiState({ task, run, enabled: true }),
          latestMoment: getLatestRunMoment(run),
          sentAt: normalizeDate(run?.sentAt),
          submittedAt: normalizeDate(run?.submittedAt || run?.completedAt),
        }
      })

      const latestSent = states
        .map((row) => row.sentAt)
        .filter((value): value is Date => Boolean(value))
        .sort((a, b) => b.getTime() - a.getTime())[0] || null

      const latestSubmitted = states
        .map((row) => row.submittedAt)
        .filter((value): value is Date => Boolean(value))
        .sort((a, b) => b.getTime() - a.getTime())[0] || null

      const latestActivity = states
        .map((row) => row.latestMoment)
        .filter((value): value is Date => Boolean(value))
        .sort((a, b) => b.getTime() - a.getTime())[0] || null

      return {
        enabledCount: enabledTasks.length,
        sentCount: states.filter((row) => row.state.sent).length,
        submittedCount: states.filter((row) => row.state.submitted).length,
        latestSent,
        latestSubmitted,
        latestActivity,
      }
    }

    return {
      cleaning: buildSummary((task) => Boolean(task.sendCleaningChecklist), getCleaningRun),
      supplies: buildSummary((task) => Boolean(task.sendSuppliesChecklist), getSuppliesRun),
      issues: buildSummary((task) => Boolean(task.sendIssuesChecklist), getIssuesRun),
    }
  }, [openTasksBase])

  const calendarDays = useMemo(() => {
    if (!property) return []
    return buildCalendarDays({ property, anchorDate: calendarDate, granularity: calendarGranularity })
  }, [property, calendarDate, calendarGranularity])

  const selectedCalendarDayTasks = useMemo(() => {
    const selectedKey = dayKey(calendarDate)

    return tasks
      .filter((task) => normalizeDateOnlyValue(task.scheduledDate) === selectedKey)
      .sort((a, b) => {
        const aDate = parseDateAndTime(a.scheduledDate, a.scheduledStartTime || null)
        const bDate = parseDateAndTime(b.scheduledDate, b.scheduledStartTime || null)
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        return aDate.getTime() - bDate.getTime()
      })
  }, [calendarDate, tasks])
  const weekdayLabels = useMemo(() => buildWeekdayLabels(locale), [locale])

  const readinessNextActions = useMemo(() => {
    return safeArray(property?.readinessSummary?.nextActions)
      .map((row) => (typeof row === "string" ? row : String(row?.message || "").trim()))
      .filter(Boolean)
  }, [property])

  const readinessConditionReasons = safeArray(property?.readinessSummary?.conditions?.reasons)

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
      if (!res.ok) throw new Error(json?.error || t.saveError)

      const updatedProperty = (json?.property ?? json?.data ?? property) as PropertyDetail
      setProperty(updatedProperty)
      setPropertyForm(buildPropertyEditForm(updatedProperty))
      setPropertyFormMessage(t.propertySaveSuccess)
    } catch (err) {
      console.error("Save property changes error:", err)
      setPropertyFormMessage(err instanceof Error ? err.message : t.saveError)
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
      const res = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultPartnerId: selectedPartnerId || null }),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || t.partnerSaveError)

      const updatedProperty = (json?.property ?? json?.data ?? property) as PropertyDetail
      setProperty(updatedProperty)
      setSelectedPartnerId(String(updatedProperty.defaultPartnerId || ""))
      setPartnerFormMessage(t.partnerSaveSuccess)
    } catch (err) {
      console.error("Save default partner error:", err)
      setPartnerFormMessage(err instanceof Error ? err.message : t.partnerSaveError)
    } finally {
      setPartnerSaving(false)
    }
  }

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="text-sm text-slate-500">{t.loading}</div></div>
  }

  if (error || !property || !propertyForm) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{t.loadError}</h1>
        <p className="mt-2 text-sm text-red-600">{error || t.noPropertyData}</p>
        <div className="mt-4">
          <Link href="/properties" className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t.back}</Link>
        </div>
      </div>
    )
  }
  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <Link href="/properties" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <span>←</span>
              <span>{t.back}</span>
            </Link>
          </div>

          <div className="min-w-0">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link href="/properties" className="font-medium text-slate-500 hover:text-slate-900">{t.back}</Link>
                <span className="text-slate-300">/</span>
                <span className="text-slate-600">{property.code}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{property.name}</h1>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(property.status)}`}>{propertyStatusLabel(language, property.status)}</span>
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{getPropertyTypeLabel(language, property.type)}</span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${todayReadinessTone}`}>{t.readiness}: {todayReadinessLabel}</span>
              </div>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{property.address}, {property.city}, {property.region}, {property.postalCode}, {property.country}</p>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">{todayReadinessExplanation}</p>
            </div>

            <div className="hidden">
              <ActionPanelCard
                title={language === "en" ? "Manage default partner" : "Διαχειριση προεπιλεγμενου συνεργατη"}
                description={language === "en" ? "Set or review the default partner that supports this property." : "Ορισε ή ελεγξε τον προεπιλεγμενο συνεργατη που υποστηριζει το ακινητο."}
                onClick={() => { setPartnerFormMessage(null); setSelectedPartnerId(String(property.defaultPartnerId || "")); setActiveModal("partner") }}
              />
              <ActionPanelCard
                title={language === "en" ? "Manage property lists" : "Διαχειριση λιστων ακινητου"}
                description={language === "en" ? "Open the property lists that feed execution and proof collection." : "Ανοιξε τις λιστες ακινητου που τροφοδοτουν την εκτελεση και τη συλλογη αποδειξεων."}
                href={`/property-checklists/${property.id}`}
              />
              <ActionPanelCard
                title={language === "en" ? "Readiness details" : "Λεπτομερειες ετοιμοτητας"}
                description={language === "en" ? "Inspect the explainable readiness picture and the conditions that shape it." : "Δες την explainable εικονα ετοιμοτητας και τις συνθηκες που τη διαμορφωνουν."}
                onClick={() => setActiveModal("readiness")}
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <SegmentSwitch
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: "overview", label: t.overviewView, hint: t.overviewHint },
                { value: "calendar", label: t.calendarView, hint: t.calendarHint },
              ]}
            />

            {viewMode === "calendar" ? (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <SegmentSwitch
                  value={calendarGranularity}
                  onChange={setCalendarGranularity}
                  options={[
                    { value: "month", label: t.monthView },
                    { value: "week", label: t.weekView },
                    { value: "day", label: t.dayView },
                  ]}
                />

                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setCalendarDate((prev) => addDays(prev, calendarGranularity === "month" ? -30 : calendarGranularity === "week" ? -7 : -1))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t.previous}</button>
                  <button type="button" onClick={() => setCalendarDate(startOfDay(new Date()))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t.today}</button>
                  <button type="button" onClick={() => setCalendarDate((prev) => addDays(prev, calendarGranularity === "month" ? 30 : calendarGranularity === "week" ? 7 : 1))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t.next}</button>
                </div>
              </div>
            ) : null}
          </div>

          {viewMode === "overview" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="#property-overview" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                {language === "en" ? "Overview" : "Επισκοπηση"}
              </a>
              <a href="#property-open-tasks" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                {t.tasksTitle}
              </a>
              <a href="#property-supplies" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                {t.suppliesList}
              </a>
              <a href="#property-issues" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                {t.issuesListTitle}
              </a>
              <a href="#property-proof" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                {language === "en" ? "Property management" : "Διαχειριση ακινητου"}
              </a>
            </div>
          ) : null}
        </section>

        {viewMode === "overview" ? (
          <>
            <SectionShell id="property-overview" title={t.readinessTitle} subtitle={todayReadinessExplanation}>
              <div className="grid gap-2 md:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.readiness}</div>
                  <div className="mt-1.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${todayReadinessTone}`}>{todayReadinessLabel}</span></div>
                </div>
                <InfoChip label={t.nextCheckIn} value={formatDateTime(property.nextCheckInAt, locale)} hint="Η επόμενη γνωστή άφιξη από τα διαθέσιμα δεδομένα." />
                <InfoChip label={t.timeLeft} value={formatCountdownToNextCheckIn(property.nextCheckInAt, language)} hint="Υπολογίζεται από τη σημερινή στιγμή μέχρι το επόμενο check-in." />
                <InfoChip label={t.lastUpdate} value={formatDateTime(property.readinessUpdatedAt || property.updatedAt, locale)} hint="Τελευταία διαθέσιμη ενημέρωση της εικόνας ακινήτου." />
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                <InfoChip label={language === "en" ? "Tasks today" : "Εργασιες σημερα"} value={String(todayOperationalCounts.todayOpenTasks)} hint={language === "en" ? "Open tasks scheduled for today. Execution detail only; canonical readiness stays tied to active property conditions." : "Ανοιχτες εργασιες με σημερινη ημερομηνια. Δειχνουν execution detail και οχι την canonical αποφαση readiness."} valueClassName={todayOperationalCounts.todayOpenTasks > 0 ? "text-red-700" : "text-slate-900"} />
                <InfoChip label={language === "en" ? "Active alerts" : "Ενεργα alert"} value={String(todayOperationalCounts.activeAlerts)} hint={language === "en" ? "Active alerts on open tasks. This comes directly from the alert defined when the task was created." : "Ενεργα alert σε ανοιχτες εργασιες. Προερχεται απο το alert που οριστηκε στη δημιουργια της εργασιας."} valueClassName={todayOperationalCounts.activeAlerts > 0 ? "text-red-700" : "text-slate-900"} />
                <InfoChip label={t.bookingsWithoutTask} value={String(bookingsWithoutTaskCount)} hint={t.bookingsWithoutTaskHelper} valueClassName={bookingsWithoutTaskCount > 0 ? "text-amber-700" : "text-slate-900"} href={bookingsWithoutTaskHref} />
                <InfoChip label={language === "en" ? "Open issues" : "Ανοιχτες βλαβες"} value={String(todayOperationalCounts.openIssues)} hint={language === "en" ? "Open non-damage issues in the operational picture. Canonical readiness comes from the active linked property conditions." : "Ανοιχτες βλαβες στην επιχειρησιακη εικονα. Το canonical readiness προκυπτει απο τα ενεργα συνδεδεμενα property conditions."} valueClassName={todayOperationalCounts.openIssues > 0 ? "text-red-700" : "text-slate-900"} />
                <InfoChip label={language === "en" ? "Open damages" : "Ανοιχτες ζημιες"} value={String(todayOperationalCounts.openDamages)} hint={language === "en" ? "Open damages in the operational picture. Canonical readiness stays tied to active property conditions." : "Ανοιχτες ζημιες στην επιχειρησιακη εικονα. Το canonical readiness μενει δεμενο με τα ενεργα property conditions."} valueClassName={todayOperationalCounts.openDamages > 0 ? "text-red-700" : "text-slate-900"} />
                <InfoChip label={language === "en" ? "Supply shortages" : "Ελλειψεις αναλωσιμων"} value={String(todayOperationalCounts.supplyShortages)} hint={language === "en" ? "Visible supply shortages in operations. Canonical readiness remains tied to active supply conditions." : "Ορατες ελλειψεις αναλωσιμων στην επιχειρησιακη εικονα. Το canonical readiness μενει δεμενο με τα ενεργα supply conditions."} valueClassName={todayOperationalCounts.supplyShortages > 0 ? "text-red-700" : "text-slate-900"} />
              </div>

              <div className="mt-3">
                <div className="mb-2 text-sm font-semibold text-slate-800">{t.readinessReasons}</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {todayReadinessReasons.map((reason, index) => (
                    <div key={`readiness-reason-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">• {reason}</div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span>{t.proofTitle}</span>
                  <TooltipHint label={language === "en" ? "Readiness proof stays inside the property picture: it shows what was sent for execution and what has returned as proof." : "Η αποδειξη ετοιμοτητας μενει μεσα στην εικονα του ακινητου: δειχνει τι εχει σταλει για εκτελεση και τι εχει επιστρεψει ως αποδειξη."} />
                </div>
                <div className="grid gap-3 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span>{t.cleaningList}</span>
                      <TooltipHint label={language === "en" ? "Cleaning proof flow for the currently open tasks." : "Η ροη αποδειξης καθαριοτητας για τις τρεχουσες ανοιχτες εργασιες."} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${proofSummary.cleaning.sentCount > 0 ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200" : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"}`}>{t.sent}: {proofSummary.cleaning.sentCount}/{proofSummary.cleaning.enabledCount}</span>
                      <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${proofSummary.cleaning.submittedCount > 0 ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"}`}>{t.submitted}: {proofSummary.cleaning.submittedCount}/{proofSummary.cleaning.enabledCount}</span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <InfoChip label={language === "en" ? "Last sent" : "Τελευταια αποστολη"} value={formatDateTime(proofSummary.cleaning.latestSent, locale)} hint={language === "en" ? "Most recent time a cleaning checklist was sent." : "Η πιο προσφατη στιγμη που σταλθηκε λιστα καθαριοτητας."} />
                      <InfoChip label={language === "en" ? "Last submitted" : "Τελευταια υποβολη"} value={formatDateTime(proofSummary.cleaning.latestSubmitted, locale)} hint={language === "en" ? "Most recent cleaning proof return." : "Η πιο προσφατη επιστροφη αποδειξης καθαριοτητας."} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span>{t.suppliesList}</span>
                      <TooltipHint label={language === "en" ? "Supplies proof flow for the currently open tasks." : "Η ροη αποδειξης αναλωσιμων για τις τρεχουσες ανοιχτες εργασιες."} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${proofSummary.supplies.sentCount > 0 ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200" : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"}`}>{t.sent}: {proofSummary.supplies.sentCount}/{proofSummary.supplies.enabledCount}</span>
                      <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${proofSummary.supplies.submittedCount > 0 ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"}`}>{t.submitted}: {proofSummary.supplies.submittedCount}/{proofSummary.supplies.enabledCount}</span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <InfoChip label={language === "en" ? "Last sent" : "Τελευταια αποστολη"} value={formatDateTime(proofSummary.supplies.latestSent, locale)} hint={language === "en" ? "Most recent time a supplies checklist was sent." : "Η πιο προσφατη στιγμη που σταλθηκε λιστα αναλωσιμων."} />
                      <InfoChip label={language === "en" ? "Last submitted" : "Τελευταια υποβολη"} value={formatDateTime(proofSummary.supplies.latestSubmitted, locale)} hint={language === "en" ? "Most recent supplies proof return." : "Η πιο προσφατη επιστροφη αποδειξης αναλωσιμων."} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span>{t.issuesList}</span>
                      <TooltipHint label={language === "en" ? "Issues and damages proof flow for the currently open tasks." : "Η ροη αποδειξης βλαβων και ζημιων για τις τρεχουσες ανοιχτες εργασιες."} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${proofSummary.issues.sentCount > 0 ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200" : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"}`}>{t.sent}: {proofSummary.issues.sentCount}/{proofSummary.issues.enabledCount}</span>
                      <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${proofSummary.issues.submittedCount > 0 ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"}`}>{t.submitted}: {proofSummary.issues.submittedCount}/{proofSummary.issues.enabledCount}</span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <InfoChip label={language === "en" ? "Last sent" : "Τελευταια αποστολη"} value={formatDateTime(proofSummary.issues.latestSent, locale)} hint={language === "en" ? "Most recent time an issues checklist was sent." : "Η πιο προσφατη στιγμη που σταλθηκε λιστα βλαβων και ζημιων."} />
                      <InfoChip label={language === "en" ? "Last submitted" : "Τελευταια υποβολη"} value={formatDateTime(proofSummary.issues.latestSubmitted, locale)} hint={language === "en" ? "Most recent issues proof return." : "Η πιο προσφατη επιστροφη αποδειξης για βλαβες ή ζημιες."} />
                    </div>
                  </div>
                </div>
              </div>
            </SectionShell>

            <SectionShell
              id="property-open-tasks"
              title={t.tasksTitle}
              subtitle={language === "en" ? "Open tasks are shown separately as the execution layer of the property." : "Οι ανοιχτες εργασιες προβαλλονται ξεχωριστα ως execution layer του ακινητου."}
              actions={<Link href={`/tasks?propertyId=${property.id}&scope=open`} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">{t.openPropertyTasksPage}</Link>}
            >
              <p className="mb-4 text-xs text-slate-400">{t.taskExecutionRangeExplanation}</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <CounterButton label={t.all} value={openTaskCounts.all_open} active={openTaskFilter === "all_open"} onClick={() => setOpenTaskFilter("all_open")} tone="slate" helper={t.allOpenHelper} />
                <CounterButton label={t.pending} value={openTaskCounts.pending} active={openTaskFilter === "pending"} onClick={() => setOpenTaskFilter("pending")} tone="amber" helper={t.pendingHelper} />
                <CounterButton label={t.assigned} value={openTaskCounts.assigned} active={openTaskFilter === "assigned"} onClick={() => setOpenTaskFilter("assigned")} tone="blue" helper={t.assignedHelper} />
                <CounterButton label={t.accepted} value={openTaskCounts.accepted} active={openTaskFilter === "accepted"} onClick={() => setOpenTaskFilter("accepted")} tone="blue" helper={t.acceptedHelper} />
                <CounterButton label={t.inProgress} value={openTaskCounts.in_progress} active={openTaskFilter === "in_progress"} onClick={() => setOpenTaskFilter("in_progress")} tone="blue" helper={t.progressHelper} />
                <CounterButton label={t.alerts} value={openTaskCounts.alerts} active={openTaskFilter === "alerts"} onClick={() => setOpenTaskFilter("alerts")} tone="red" helper={t.alertsHelper} />
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="min-w-[160px] flex-1 flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.dateFrom}</span>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" />
                </label>
                <label className="min-w-[160px] flex-1 flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.dateTo}</span>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" />
                </label>
                <button type="button" onClick={() => { setDateFrom(""); setDateTo("") }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{t.clearDates}</button>
              </div>

              <div className="mt-5 space-y-4">
                {visibleTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">{t.noDateFilterResults}</div>
                ) : (
                  visibleTasks.map((task) => {
                    const latestAssignment = getLatestAssignment(task)
                    const cleaningState = resolveChecklistUiState({ task, run: getCleaningRun(task), enabled: Boolean(task.sendCleaningChecklist) })
                    const suppliesState = resolveChecklistUiState({ task, run: getSuppliesRun(task), enabled: Boolean(task.sendSuppliesChecklist) })
                    const issuesState = resolveChecklistUiState({ task, run: getIssuesRun(task), enabled: Boolean(task.sendIssuesChecklist) })
                    const normalizedTitle = normalizeTaskTitleText(task.title, language)
                    const taskTone = getTaskCardTone(task)

                    return (
                      <div key={task.id} className={`rounded-2xl border p-4 shadow-sm ${taskTone.card}`}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link href={`/tasks/${task.id}`} className="text-base font-semibold text-slate-900 underline-offset-4 hover:underline">{normalizedTitle}</Link>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(task.status)}`}>{taskStatusLabel(language, task.status)}</span>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getFriendlyTaskConditionTone(task)}`}>{getFriendlyTaskCondition(task, language)}</span>
                          {isTaskAlertActive(task) ? (
                            <span
                              className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200"
                              title={task.alertAt ? `Alert: ${formatDateTime(task.alertAt, locale)}` : undefined}
                            >
                              {t.alerts}
                            </span>
                          ) : null}
                            </div>

                        <div className="mt-3 grid gap-2 lg:grid-cols-3">
                          <div className="rounded-xl border border-sky-100 bg-white/90 px-3 py-2.5">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.executionWindow}</div>
                            <div className="mt-1 text-sm font-medium text-slate-900">{buildExecutionWindowLabel(task, locale, language)}</div>
                          </div>
                          <InfoChip label={t.bookingWindow} value={buildBookingWindowLabel(task, locale, language, "—")} />
                          <InfoChip label={t.currentPartner} value={latestAssignment?.partner?.name || t.noPartnerShort} />
                        </div>

                            <div className={`mt-3 flex flex-wrap gap-2 border-t pt-3 ${taskTone.accentBorder}`}>
                              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ${cleaningState.tone}`}>
                                <span className="font-semibold text-slate-700">{t.cleaningList}</span>
                                <span>{getChecklistStateLabel(language, cleaningState, t.notSent)}</span>
                              </span>
                              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ${suppliesState.tone}`}>
                                <span className="font-semibold text-slate-700">{t.suppliesList}</span>
                                <span>{getChecklistStateLabel(language, suppliesState, t.notSent)}</span>
                              </span>
                              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ${issuesState.tone}`}>
                                <span className="font-semibold text-slate-700">{t.issuesList}</span>
                                <span>{getChecklistStateLabel(language, issuesState, t.notSent)}</span>
                              </span>
                            </div>

                          </div>

                          <div className="flex justify-end lg:pt-0">
                            <Link href={`/tasks/${task.id}`} className={`inline-flex items-center justify-center rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ${taskTone.action}`}>{t.openTaskButton}</Link>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </SectionShell>

            <SectionShell id="property-supplies" title={t.suppliesList} subtitle={t.suppliesAllHelper} actions={<button type="button" onClick={() => setSuppliesOpen((prev) => !prev)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{suppliesOpen ? t.closeSupplies : t.openSupplies}</button>}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <CounterButton label={t.allSupplies} value={supplyCounts.all} active={suppliesOpen && supplyFilter === "all"} onClick={() => { setSuppliesOpen(true); setSupplyFilter("all") }} tone="slate" helper={t.suppliesAllHelper} />
                <CounterButton label={t.missingSupplies} value={supplyCounts.missing} active={suppliesOpen && supplyFilter === "missing"} onClick={() => { setSuppliesOpen(true); setSupplyFilter("missing") }} tone="red" helper={t.suppliesMissingHelper} />
                <CounterButton label={t.mediumSupplies} value={supplyCounts.medium} active={suppliesOpen && supplyFilter === "medium"} onClick={() => { setSuppliesOpen(true); setSupplyFilter("medium") }} tone="amber" helper={t.suppliesMediumHelper} />
                <CounterButton label={t.fullSupplies} value={supplyCounts.full} active={suppliesOpen && supplyFilter === "full"} onClick={() => { setSuppliesOpen(true); setSupplyFilter("full") }} tone="emerald" helper={t.suppliesFullHelper} />
              </div>

              {suppliesOpen ? (
                <div className="mt-5">
                  {visibleSupplies.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">{t.noSuppliesForFilter}</div>
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-3">
                      {visibleSupplies.map((supply) => (
                        <div key={supply.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-lg font-semibold text-slate-900">{supply.displayName}</div>
                              <div className="mt-1 text-sm text-slate-500">{supply.supplyItem?.code || "—"}</div>
                            </div>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${supplyStateBadgeClass(supply.derivedState as "missing" | "medium" | "full")}`}>{supply.derivedState === "missing" ? t.missingSupplies : supply.derivedState === "medium" ? t.mediumSupplies : t.fullSupplies}</span>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <InfoChip label={t.supplyQuantity} value={String(supply.currentStock)} />
                            <InfoChip label={t.supplyLastUpdate} value={formatDateTime(supply.lastSeenUpdate, locale)} />
                            <InfoChip label={t.target} value={String(supply.targetStock ?? "—")} />
                            <InfoChip label={t.category} value={supply.supplyItem?.category || "—"} />
                          </div>

                          <div className="mt-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${supply.isCritical ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"}`}>{supply.isCritical ? t.supplyCritical : t.supplyNonCritical}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </SectionShell>

            <SectionShell id="property-issues" title={t.issuesListTitle} subtitle={t.issuesListSubtitle} actions={<div className="grid gap-3 sm:grid-cols-2 lg:flex"><CounterButton label={t.allIssues} value={openIssues.length} active={issueFilter === "open"} onClick={() => setIssueFilter("open")} tone="slate" /><CounterButton label={t.criticalOnly} value={criticalIssues.length} active={issueFilter === "critical"} onClick={() => setIssueFilter("critical")} tone="red" /></div>}>
              <div className="space-y-4">
                {visibleIssues.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">{t.noIssuesForFilter}</div>
                ) : (
                  visibleIssues.map((issue) => (
                    <div key={issue.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold text-slate-900">{issue.title}</div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(issue.status)}`}>{issueStatusLabel(language, issue.status)}</span>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(issue.severity)}`}>{severityLabel(language, issue.severity)}</span>
                      </div>
                      {issue.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{issue.description}</p> : null}
                      <div className="mt-4 grid gap-3 lg:grid-cols-4">
                        <InfoChip label={t.issueCreatedAt} value={formatDateTime(issue.createdAt, locale)} />
                        <InfoChip label={t.issueUpdatedAt} value={formatDateTime(issue.updatedAt, locale)} />
                        <InfoChip label={t.location} value={issue.locationText || "—"} />
                        <InfoChip label={t.linkedTask} value={issue.task?.title || "—"} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionShell>

            <SectionShell id="property-proof" title={language === "en" ? "Property management" : "Διαχειριση ακινητου"} subtitle={language === "en" ? "Partner, list and property controls stay available without crowding the operational top area." : "Οι βασικοι χειρισμοι μενουν διαθεσιμοι χωρις να βαζουν θορυβο στην επιχειρησιακη κορυφη."}>
              <div className="grid gap-3 sm:grid-cols-3">
                <ActionPanelCard
                  title={language === "en" ? "Manage partner" : "Διαχειριση συνεργατη"}
                  description={language === "en" ? "Set or review the default partner supporting this property." : "Ορισε ή ελεγξε τον προεπιλεγμενο συνεργατη που υποστηριζει το ακινητο."}
                  onClick={() => { setPartnerFormMessage(null); setSelectedPartnerId(String(property.defaultPartnerId || "")); setActiveModal("partner") }}
                />
                <ActionPanelCard
                  title={language === "en" ? "Manage lists" : "Διαχειριση λιστων"}
                  description={language === "en" ? "Open the property lists that feed execution and proof collection." : "Ανοιξε τις λιστες ακινητου που τροφοδοτουν την εκτελεση και τη συλλογη αποδειξεων."}
                  href={`/property-checklists/${property.id}`}
                />
                <ActionPanelCard
                  title={language === "en" ? "Property details" : "Λεπτομερειες ακινητου"}
                  description={language === "en" ? "Review and edit the canonical property details." : "Δες και ενημερωσε τα βασικα στοιχεια του ακινητου."}
                  onClick={() => setActiveModal("property")}
                />
              </div>
            </SectionShell>
          </>
        ) : (
          <SectionShell title={t.calendarTitle} subtitle={t.calendarSubtitle} actions={<div className="text-sm font-medium text-slate-600">{buildMonthTitle(calendarDate, locale)}</div>}>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <InfoChip label={t.openTasksShort} value={String(calendarDays.reduce((sum, day) => sum + day.openTasks, 0))} />
              <InfoChip label={t.alertsShort} value={String(calendarDays.reduce((sum, day) => sum + day.alerts, 0))} />
              <InfoChip label={language === "en" ? "Completed" : "Ολοκληρωμενες"} value={String(calendarDays.reduce((sum, day) => sum + day.completedTasks, 0))} />
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {language === "en" ? "Ready tone" : "Τονος ετοιμου"}
              </span>
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {language === "en" ? "Attention tone" : "Τονος προσοχης"}
              </span>
              <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                {language === "en" ? "Blocking tone" : "Τονος μπλοκαρισματος"}
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {language === "en" ? "Neutral tone" : "Ουδετερος τονος"}
              </span>
            </div>

            {calendarGranularity !== "day" ? (
              <div className="mb-3 grid grid-cols-7 gap-2">
                {weekdayLabels.map((label) => (
                  <div key={label} className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </div>
                ))}
              </div>
            ) : null}

            {calendarGranularity === "month" ? (
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((item) => (
                  <CalendarDayCard key={item.key} item={item} locale={locale} labels={{ openTasks: t.openTasksShort, alerts: t.alertsShort, blocking: t.blockingShort, warnings: t.warningsShort, checkIn: t.checkIn, checkOut: t.checkOut, stay: t.stay }} onClick={() => { setCalendarDate(item.date); setCalendarGranularity("day") }} />
                ))}
              </div>
            ) : null}

            {calendarGranularity === "week" ? (
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((item) => (
                  <CalendarDayCard key={item.key} item={item} locale={locale} labels={{ openTasks: t.openTasksShort, alerts: t.alertsShort, blocking: t.blockingShort, warnings: t.warningsShort, checkIn: t.checkIn, checkOut: t.checkOut, stay: t.stay }} onClick={() => { setCalendarDate(item.date); setCalendarGranularity("day") }} />
                ))}
              </div>
            ) : null}

            {calendarGranularity === "day" ? (
              <div className="space-y-4">
                {calendarDays.map((item) => (
                  <div key={item.key} className={`rounded-3xl border p-5 ${calendarToneClasses(item.tone)}`}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-lg font-semibold text-slate-900">{formatDate(item.date, locale)}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.alerts > 0 ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">{t.alertsShort}: {item.alerts}</span> : null}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                        <InfoChip label={t.openTasksShort} value={String(item.openTasks)} />
                        <InfoChip label={t.alertsShort} value={String(item.alerts)} valueClassName={item.alerts > 0 ? "text-red-700" : undefined} />
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="mb-3 text-sm font-semibold text-slate-900">
                        {language === "en" ? "Tasks on this day" : "Εργασιες αυτης της ημερας"}
                      </div>

                      {selectedCalendarDayTasks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                          {language === "en" ? "No tasks are scheduled for this day." : "Δεν υπαρχουν εργασιες για αυτη την ημερα."}
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {selectedCalendarDayTasks.map((task) => (
                            <div key={task.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link href={`/tasks/${task.id}`} className="text-sm font-semibold text-slate-900 underline-offset-4 hover:underline">
                                  {normalizeTaskTitleText(task.title, language)}
                                </Link>
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(task.status)}`}>
                                  {taskStatusLabel(language, task.status)}
                                </span>
                                {isTaskAlertActive(task) ? (
                                  <span
                                    className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200"
                                    title={task.alertAt ? `Alert: ${formatDateTime(task.alertAt, locale)}` : undefined}
                                  >
                                    {t.alerts}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-3 grid gap-3 md:grid-cols-3">
                                <InfoChip label={t.executionWindow} value={buildExecutionWindowLabel(task, locale, language)} />
                                <InfoChip label={t.currentPartner} value={getLatestAssignment(task)?.partner?.name || t.noPartnerShort} />
                                <InfoChip label={t.linkedTask} value={task.id} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </SectionShell>
        )}
      </div>

      <Modal open={activeModal === "property"} title={t.propertyDetails} description={t.editProperty} onClose={() => setActiveModal(null)} closeLabel={t.close}>
        <form onSubmit={savePropertyChanges} className="space-y-5">
          {propertyFormMessage ? <div className={`rounded-2xl border px-4 py-3 text-sm ${propertyFormMessage === t.propertySaveSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{propertyFormMessage}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="mb-1 block text-sm font-medium text-slate-700">{t.code}</label><input value={propertyForm.code} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, code: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" required /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">{t.name}</label><input value={propertyForm.name} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, name: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" required /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="mb-1 block text-sm font-medium text-slate-700">{t.address}</label><input value={propertyForm.address} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, address: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">{t.city}</label><input value={propertyForm.city} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, city: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div><label className="mb-1 block text-sm font-medium text-slate-700">{t.region}</label><input value={propertyForm.region} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, region: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">{t.postalCode}</label><input value={propertyForm.postalCode} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, postalCode: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">{t.country}</label><input value={propertyForm.country} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, country: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            <div><label className="mb-1 block text-sm font-medium text-slate-700">{t.type}</label><input value={propertyForm.type} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, type: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">{t.status}</label><input value={propertyForm.status} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, status: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">{t.bedrooms}</label><input type="number" value={propertyForm.bedrooms} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, bedrooms: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">{t.bathrooms}</label><input type="number" value={propertyForm.bathrooms} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, bathrooms: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">{t.maxGuests}</label><input type="number" value={propertyForm.maxGuests} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, maxGuests: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></div>
          </div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">{t.notes}</label><textarea value={propertyForm.notes} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, notes: e.target.value } : prev)} rows={5} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setActiveModal(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" disabled={propertySaving}>{t.cancel}</button>
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60" disabled={propertySaving}>{propertySaving ? t.saving : t.saveChanges}</button>
          </div>
        </form>
      </Modal>

      <Modal open={activeModal === "partner"} title={t.defaultPartnerTitle} description={t.defaultPartnerSubtitle} onClose={() => setActiveModal(null)} closeLabel={t.close}>
        <form onSubmit={savePartnerChanges} className="space-y-5">
          {partnerFormMessage ? <div className={`rounded-2xl border px-4 py-3 text-sm ${partnerFormMessage === t.partnerSaveSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{partnerFormMessage}</div> : null}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t.choosePartner}</label>
            <select value={selectedPartnerId} onChange={(e) => setSelectedPartnerId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900">
              <option value="">{t.noPartner}</option>
              {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name} ({partner.code})</option>)}
            </select>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setActiveModal(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" disabled={partnerSaving}>{t.cancel}</button>
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60" disabled={partnerSaving}>{partnerSaving ? t.saving : t.savePartner}</button>
          </div>
        </form>
      </Modal>

      <Modal open={activeModal === "readiness"} title={t.readinessTitle} description={t.readinessSubtitle} onClose={() => setActiveModal(null)} closeLabel={t.close}>
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-4">
            <InfoChip label={t.readiness} value={todayReadinessLabel} hint={language === "en" ? "Canonical property readiness from active property conditions. Execution counters explain the picture but do not decide readiness." : "Κανονικη ετοιμοτητα ακινητου απο τις ενεργες συνθηκες ακινητου. Οι επιχειρησιακοι μετρητες εξηγουν την εικονα αλλα δεν αποφασιζουν το readiness."} />
            <InfoChip label={t.nextCheckIn} value={formatDateTime(property.nextCheckInAt, locale)} />
            <InfoChip label={t.timeLeft} value={formatCountdownToNextCheckIn(property.nextCheckInAt, language)} />
            <InfoChip label={t.lastUpdate} value={formatDateTime(property.readinessUpdatedAt || property.updatedAt, locale)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <InfoChip label={language === "en" ? "Tasks today" : "Εργασιες σημερα"} value={String(todayOperationalCounts.todayOpenTasks)} />
            <InfoChip label={language === "en" ? "Open issues" : "Ανοιχτες βλαβες"} value={String(todayOperationalCounts.openIssues)} />
            <InfoChip label={language === "en" ? "Open damages" : "Ανοιχτες ζημιες"} value={String(todayOperationalCounts.openDamages)} />
            <InfoChip label={language === "en" ? "Supply shortages" : "Ελλειψεις αναλωσιμων"} value={String(todayOperationalCounts.supplyShortages)} />
          </div>

          <div><div className="mb-3 text-sm font-semibold text-slate-900">{t.readinessExplain}</div><div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">{todayReadinessExplanation}</div></div>

          <div>
            <div className="mb-3 text-sm font-semibold text-slate-900">{t.readinessReasons}</div>
            <div className="space-y-3">{readiness.reasons.map((reason, index) => <div key={`modal-reason-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">• {reason}</div>)}</div>
          </div>

          {readinessConditionReasons.length > 0 ? (
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-900">{t.blockingConditions}</div>
              <div className="space-y-3">{readinessConditionReasons.map((reason) => <div key={reason.conditionId} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">• {reason.message}</div>)}</div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{t.noConditionsSummary}</div>
          )}

          {readinessNextActions.length > 0 ? (
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-900">{t.nextActions}</div>
              <div className="space-y-3">{readinessNextActions.map((action, index) => <div key={`next-action-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">• {action}</div>)}</div>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  )
}
