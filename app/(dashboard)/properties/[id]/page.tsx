"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
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
  normalizeTaskStatus,
  normalizeTaskTitleText,
} from "@/lib/i18n/normalizers"
import { getSupplyDisplayName } from "@/lib/supply-presets"
import { getPropertyDetailTexts } from "@/lib/i18n/translations"

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
    suppliesChecklistRun?: ChecklistRunLite | null
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

type ModalKey = null | "property" | "partner" | "supplies" | "issues"

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
  | "completed"

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

function formatTime(value?: string | null) {
  if (!value) return "—"
  const text = String(value).trim()
  if (text === "") return "—"
  return text.slice(0, 5)
}

function buildExecutionWindowLabel(
  task: NonNullable<PropertyDetail["tasks"]>[number],
  locale: string,
  language: "el" | "en"
) {
  const dateText = formatDate(task.scheduledDate, locale)
  const fromText = formatTime(task.scheduledStartTime)
  const toText = formatTime(task.scheduledEndTime)

  if (fromText !== "—" && toText !== "—") {
    return language === "en"
      ? `${dateText} · ${fromText} to ${toText}`
      : `${dateText} · ${fromText} έως ${toText}`
  }

  if (fromText !== "—") {
    return language === "en"
      ? `${dateText} · from ${fromText}`
      : `${dateText} · από ${fromText}`
  }

  if (toText !== "—") {
    return language === "en"
      ? `${dateText} · until ${toText}`
      : `${dateText} · έως ${toText}`
  }

  return dateText
}

function propertyStatusLabel(language: "el" | "en", status?: string | null) {
  return getPropertyStatusLabel(language, status)
}

function taskStatusLabel(language: "el" | "en", status?: string | null) {
  return getTaskStatusLabel(language, status)
}

function priorityLabel(language: "el" | "en", priority?: string | null) {
  return getPriorityLabel(language, priority)
}

function issueStatusLabel(language: "el" | "en", status?: string | null) {
  return getIssueStatusLabel(language, status)
}

function severityLabel(language: "el" | "en", severity?: string | null) {
  return getIssuePriorityLabel(language, severity)
}

function badgeClasses(status?: string | null) {
  const propertyStatus = normalizePropertyStatus(status)
  const taskStatus = normalizeTaskStatus(status)
  const issueStatus = normalizeIssueStatus(status)
  const issuePriority = normalizeIssuePriority(status)
  const raw = String(status || "").toLowerCase()

  if (
    propertyStatus === "ACTIVE" ||
    taskStatus === "COMPLETED" ||
    issueStatus === "RESOLVED"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
  }

  if (
    taskStatus === "PENDING" ||
    taskStatus === "ASSIGNED" ||
    taskStatus === "WAITING_ACCEPTANCE" ||
    taskStatus === "ACCEPTED" ||
    taskStatus === "IN_PROGRESS" ||
    raw === "medium"
  ) {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  }

  if (
    propertyStatus === "INACTIVE" ||
    taskStatus === "CANCELLED" ||
    issueStatus === "CLOSED" ||
    raw === "low"
  ) {
    return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }

  if (
    issueStatus === "OPEN" ||
    issuePriority === "URGENT" ||
    issuePriority === "HIGH"
  ) {
    return "bg-red-50 text-red-700 ring-1 ring-red-200"
  }

  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
}

function priorityBadgeClasses(priority?: string | null) {
  const normalized = normalizePriority(priority)

  if (normalized === "URGENT") {
    return "bg-red-50 text-red-700 ring-1 ring-red-200"
  }

  if (normalized === "HIGH") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  }

  if (normalized === "NORMAL") {
    return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
  }

  if (normalized === "LOW") {
    return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }

  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
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
    typeof threshold === "number" && Number.isFinite(threshold)
      ? threshold
      : null

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

function supplyStateBadgeClass(state: "missing" | "medium" | "full") {
  if (state === "missing") return "bg-red-50 text-red-700 ring-1 ring-red-200"
  if (state === "medium") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
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

function normalizeDateOnlyValue(value?: string | null) {
  if (!value) return null
  const text = String(value).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  return text
}

function isDateInRange(
  targetDate?: string | null,
  fromDate?: string,
  toDate?: string
) {
  const normalizedTarget = normalizeDateOnlyValue(targetDate)
  if (!normalizedTarget) return false

  if (fromDate && normalizedTarget < fromDate) return false
  if (toDate && normalizedTarget > toDate) return false

  return true
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
  if (task.sendCleaningChecklist && task.checklistRun) return task.checklistRun
  return null
}

function getSuppliesRun(task: NonNullable<PropertyDetail["tasks"]>[number]) {
  if (task.suppliesChecklistRun) return task.suppliesChecklistRun
  return null
}

function isRunSubmitted(run?: ChecklistRunLite | null) {
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

function getFriendlyTaskCondition(
  task: NonNullable<PropertyDetail["tasks"]>[number],
  language: "el" | "en"
) {
  const normalizedTaskState = normalizeTaskStatus(task.status)
  const activeAlert = isTaskAlertActive(task)
  const borderline = isTaskBorderline(task)

  if (activeAlert) {
    return language === "en" ? "Alert active" : "Εκκρεμεί άμεσα"
  }

  if (borderline) {
    return language === "en" ? "Borderline timing" : "Οριακό χρονικά"
  }

  if (["ACCEPTED", "IN_PROGRESS"].includes(normalizedTaskState)) {
    return language === "en" ? "Normal progress" : "Κανονική"
  }

  if (
    ["PENDING", "ASSIGNED", "WAITING_ACCEPTANCE"].includes(normalizedTaskState)
  ) {
    return language === "en" ? "Pending handling" : "Εκκρεμεί"
  }

  if (normalizedTaskState === "COMPLETED") {
    return language === "en" ? "Completed" : "Ολοκληρωμένη"
  }

  return language === "en" ? "Current state" : "Τρέχουσα κατάσταση"
}

function getFriendlyTaskConditionTone(
  task: NonNullable<PropertyDetail["tasks"]>[number]
) {
  const normalizedTaskState = normalizeTaskStatus(task.status)
  const activeAlert = isTaskAlertActive(task)
  const borderline = isTaskBorderline(task)

  if (activeAlert) {
    return "bg-red-50 text-red-700 ring-1 ring-red-200"
  }

  if (borderline) {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  }

  if (["ACCEPTED", "IN_PROGRESS"].includes(normalizedTaskState)) {
    return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
  }

  if (normalizedTaskState === "COMPLETED") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
  }

  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
}

function getReadinessState(
  property: PropertyDetail | null,
  language: "el" | "en",
  texts: ReturnType<typeof getPropertyDetailTexts>
) {
  if (!property) {
    return {
      label: texts.unknown,
      tone: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
      details: texts.noDataAvailable,
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
    const current = Number(supply.currentStock || 0)
    const target = supply.targetStock ?? null
    const threshold =
      supply.reorderThreshold ?? supply.supplyItem?.minimumStock ?? null
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
    activeAlerts.length > 0 ||
    openIssues.length > 0 ||
    openTasks.length > 0 ||
    !hasPrimaryCleaningChecklist ||
    notFullSupplies.length > 0
  ) {
    return {
      label: texts.actionNeeded,
      tone: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      details:
        language === "en"
          ? `Alerts: ${activeAlerts.length} · Open tasks: ${openTasks.length} · Open issues: ${openIssues.length} · Supplies needing attention: ${notFullSupplies.length}`
          : `Alert: ${activeAlerts.length} · Ανοιχτές εργασίες: ${openTasks.length} · Ανοιχτά θέματα: ${openIssues.length} · Αναλώσιμα που θέλουν ενέργεια: ${notFullSupplies.length}`,
    }
  }

  return {
    label: texts.ready,
    tone: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    details: texts.noOpenBlockers,
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

function InfoChip({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-sm ${valueClassName || "text-slate-900"}`}>
        {value}
      </div>
    </div>
  )
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
      className={`rounded-2xl border px-3 py-2.5 text-left shadow-sm transition ${tones[tone]}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-1.5 text-xl font-bold leading-none">{value}</div>
      {helper ? (
        <div className="mt-1 text-[11px] opacity-80">{helper}</div>
      ) : null}
    </button>
  )
}

function HoverInfoPill({
  title,
  description,
  tone = "slate",
}: {
  title: string
  description: string
  tone?: "slate" | "amber" | "blue"
}) {
  const tones = {
    slate:
      "border-slate-200 bg-white text-slate-800 hover:border-slate-300",
    amber:
      "border-amber-200 bg-amber-50/60 text-amber-800 hover:border-amber-300",
    blue:
      "border-sky-200 bg-sky-50/60 text-sky-800 hover:border-sky-300",
  }

  return (
    <div className="group relative">
      <div
        className={`inline-flex cursor-default items-center rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition ${tones[tone]}`}
      >
        {title}
      </div>

      <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600 opacity-0 shadow-xl transition duration-150 group-hover:opacity-100">
        {description}
      </div>
    </div>
  )
}

function HoverLinkButton({
  href,
  label,
  description,
  primary = false,
}: {
  href: string
  label: string
  description: string
  primary?: boolean
}) {
  return (
    <div className="group relative">
      <Link
        href={href}
        className={
          primary
            ? "inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            : "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        }
      >
        {label}
      </Link>

      <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600 opacity-0 shadow-xl transition duration-150 group-hover:opacity-100">
        {description}
      </div>
    </div>
  )
}

export default function PropertyDetailPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { language } = useAppLanguage()
  const texts = getPropertyDetailTexts(language)

  const ui = useMemo(() => {
    if (language === "en") {
      return {
        backToProperties: "Back to properties",
        tasksFriendlyTitle: "Task execution and progress",
        tasksFriendlySubtitle:
          "View the scheduled work of this property, its progress and what needs attention.",
        dateFrom: "From date",
        dateTo: "To date",
        clearDates: "Clear dates",
        dateFilterHint:
          "Filter the visible tasks by scheduled date.",
        executionWindow: "Execution time",
        taskCondition: "Monitoring state",
        bookingWindow: "Booking window",
        checklistsSummary: "Task lists",
        noPartnerShort: "Not assigned",
        noDateFilterResults:
          "No tasks match the selected dates and the current filter.",
        pendingGuideTitle: "Pending",
        pendingGuideText:
          "The task exists, but it still needs assignment, acceptance or start.",
        borderlineGuideTitle: "Borderline timing",
        borderlineGuideText:
          "The execution time is close or the alert time has been reached. It needs attention soon.",
        normalGuideTitle: "Normal",
        normalGuideText:
          "The task is progressing normally and there is currently no direct timing risk.",
        manageListsButton: "Manage cleaning list and supplies list",
        manageListsInfo:
          "Open the property list management page to configure the main cleaning list and review the supplies list used in the operational workflow.",
        allOpenHelper: "Visible open tasks",
        pendingHelper: "Need handling",
        assignedHelper: "Awaiting response",
        acceptedHelper: "Accepted",
        progressHelper: "In execution",
        alertsHelper: "Need immediate action",
        completedHelper: "Completed tasks",
        suppliesMissingHelper: "Low or empty",
        suppliesMediumHelper: "Need refill soon",
        suppliesFullHelper: "Adequate level",
        suppliesAllHelper: "All supplies",
        noCompletedTasks: "There are no completed tasks.",
        completedTasksSubtitle:
          "Completed tasks of this property.",
        openTaskList: "Open tasks",
        taskExecutionRangeExplanation:
          "Execution time shows the from–to range defined for the task.",
      }
    }

    return {
      backToProperties: "Επιστροφή στα ακίνητα",
      tasksFriendlyTitle: "Εκτέλεση εργασιών και πρόοδος",
      tasksFriendlySubtitle:
        "Δες τις προγραμματισμένες εργασίες του ακινήτου, την πρόοδό τους και τι χρειάζεται ενέργεια.",
      dateFrom: "Από ημερομηνία",
      dateTo: "Έως ημερομηνία",
      clearDates: "Καθαρισμός ημερομηνιών",
      dateFilterHint:
        "Φιλτράρει τις ορατές εργασίες με βάση την προγραμματισμένη ημερομηνία.",
      executionWindow: "Χρόνος εκτέλεσης",
      taskCondition: "Κατάσταση παρακολούθησης",
      bookingWindow: "Παράθυρο κράτησης",
      checklistsSummary: "Λίστες εργασίας",
      noPartnerShort: "Δεν έχει οριστεί",
      noDateFilterResults:
        "Δεν υπάρχουν εργασίες για τις επιλεγμένες ημερομηνίες και το τρέχον φίλτρο.",
      pendingGuideTitle: "Εκκρεμεί",
      pendingGuideText:
        "Η εργασία υπάρχει, αλλά χρειάζεται ακόμα ανάθεση, αποδοχή ή έναρξη.",
      borderlineGuideTitle: "Οριακό χρονικά",
      borderlineGuideText:
        "Ο χρόνος εκτέλεσης πλησιάζει ή έχει φτάσει το χρονικό σημείο ειδοποίησης. Θέλει προσοχή άμεσα.",
      normalGuideTitle: "Κανονική",
      normalGuideText:
        "Η εργασία προχωρά φυσιολογικά και αυτή τη στιγμή δεν υπάρχει άμεσος χρονικός κίνδυνος.",
      manageListsButton:
        "Διαχείριση λίστας καθαριότητας και λίστας αναλωσίμων",
      manageListsInfo:
        "Ανοίγει τη σελίδα διαχείρισης λιστών του ακινήτου για να ρυθμίσεις τη βασική λίστα καθαριότητας και να δεις τη λίστα αναλωσίμων που χρησιμοποιείται στη λειτουργία.",
      allOpenHelper: "Ορατές ανοιχτές εργασίες",
      pendingHelper: "Θέλουν διαχείριση",
      assignedHelper: "Αναμένουν απάντηση",
      acceptedHelper: "Έχουν αποδεχθεί",
      progressHelper: "Σε εκτέλεση",
      alertsHelper: "Θέλουν άμεση ενέργεια",
      completedHelper: "Ολοκληρωμένες εργασίες",
      suppliesMissingHelper: "Χαμηλά ή άδεια",
      suppliesMediumHelper: "Θέλουν σύντομα γέμισμα",
      suppliesFullHelper: "Επαρκή επίπεδα",
      suppliesAllHelper: "Όλα τα αναλώσιμα",
      noCompletedTasks: "Δεν υπάρχουν ολοκληρωμένες εργασίες.",
      completedTasksSubtitle:
        "Ολοκληρωμένες εργασίες αυτού του ακινήτου.",
      openTaskList: "Ανοιχτές εργασίες",
      taskExecutionRangeExplanation:
        "Ο χρόνος εκτέλεσης δείχνει το διάστημα που έχει οριστεί από–έως για την εργασία.",
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

  const [openTaskFilter, setOpenTaskFilter] =
    useState<OpenTaskFilter>("all_open")
  const [supplyFilter, setSupplyFilter] = useState<SupplyFilter>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

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
      console.error("Load property detail error:", err)
      setError(err instanceof Error ? err.message : texts.loadError)
      setProperty(null)
    } finally {
      setLoading(false)
    }
  }, [id, texts.loadError])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  const tasks = useMemo(() => safeArray(property?.tasks), [property])

  const openTasksBase = useMemo(() => {
    return tasks.filter((task) => {
      const normalized = normalizeTaskStatus(task.status)
      return ["PENDING", "ASSIGNED", "WAITING_ACCEPTANCE", "ACCEPTED", "IN_PROGRESS"].includes(
        normalized
      )
    })
  }, [tasks])

  const completedTasks = useMemo(() => {
    return tasks.filter((task) => normalizeTaskStatus(task.status) === "COMPLETED")
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
      completed: completedTasks.length,
    }
  }, [openTasksBase, completedTasks])

  const visibleTasks = useMemo(() => {
    let rows =
      openTaskFilter === "completed" ? [...completedTasks] : [...openTasksBase]

    rows = rows.filter((task) =>
      isDateInRange(task.scheduledDate, dateFrom || undefined, dateTo || undefined)
    )

    if (openTaskFilter === "alerts") {
      rows = rows.filter((task) => isTaskAlertActive(task))
    } else if (openTaskFilter !== "all_open" && openTaskFilter !== "completed") {
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
  }, [openTasksBase, completedTasks, openTaskFilter, dateFrom, dateTo])

  const openIssues = useMemo(() => {
    return safeArray(property?.issues).filter((issue) => {
      const normalized = normalizeIssueStatus(issue.status)
      return normalized === "OPEN" || normalized === "IN_PROGRESS"
    })
  }, [property])

  const supplyRows = useMemo(() => {
    const rows = safeArray(property?.propertySupplies).map((supply) => {
      const current = Number(supply.currentStock || 0)
      const target = supply.targetStock ?? null
      const threshold =
        supply.reorderThreshold ?? supply.supplyItem?.minimumStock ?? null
      const derivedState = getSupplyStateThree(current, target, threshold)

      const displayName = getSupplyDisplayName(language, {
        code: supply.supplyItem?.code,
        fallbackName: supply.supplyItem?.name,
      })

      return {
        ...supply,
        derivedState,
        lastSeenUpdate: supply.lastUpdatedAt || supply.updatedAt || null,
        displayName,
      }
    })

    return rows.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, texts.locale)
    )
  }, [property, language, texts.locale])

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

  const visibleSuppliesPreview = useMemo(() => {
    return visibleSupplies.slice(0, 3)
  }, [visibleSupplies])

  const readiness = useMemo(
    () => getReadinessState(property, language, texts),
    [property, language, texts]
  )

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
      setSelectedPartnerId(
        String((updatedProperty as PropertyDetail)?.defaultPartnerId || "")
      )
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
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">{texts.loading}</div>
      </div>
    )
  }

  if (error || !property || !propertyForm) {
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
            {ui.backToProperties}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <span>←</span>
              <span>{ui.backToProperties}</span>
            </Link>
          </div>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link
                  href="/properties"
                  className="font-medium text-slate-500 hover:text-slate-900"
                >
                  {ui.backToProperties}
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
                  {getPropertyTypeLabel(language, property.type)}
                </span>

                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${readiness.tone}`}
                >
                  {texts.readiness}: {readiness.label}
                </span>

                {alertCount > 0 ? (
                  <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                    {texts.activeAlert}: {alertCount}
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {property.address}, {property.city}, {property.region},{" "}
                {property.postalCode}, {property.country}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {readiness.details}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end xl:max-w-[560px]">
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

              <HoverLinkButton
                href={`/property-checklists/${property.id}`}
                label={ui.manageListsButton}
                description={ui.manageListsInfo}
              />

              <Link
                href={`/tasks?propertyId=${property.id}&scope=open`}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {texts.openPropertyTasksPage}
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-slate-900">
              {texts.overviewTitle}
            </h2>
            <p className="text-sm text-slate-500">{texts.overviewSubtitle}</p>
          </div>

          <div className="mt-5 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-800">
                {texts.openTaskStatesTitle}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <CounterButton
                  label={texts.taskAllOpen}
                  value={openTaskCounts.all_open}
                  helper={ui.allOpenHelper}
                  active={openTaskFilter === "all_open"}
                  onClick={() => setOpenTaskFilter("all_open")}
                  tone="slate"
                />
                <CounterButton
                  label={texts.taskPending}
                  value={openTaskCounts.pending}
                  helper={ui.pendingHelper}
                  active={openTaskFilter === "pending"}
                  onClick={() => setOpenTaskFilter("pending")}
                  tone="amber"
                />
                <CounterButton
                  label={texts.taskAssigned}
                  value={openTaskCounts.assigned}
                  helper={ui.assignedHelper}
                  active={openTaskFilter === "assigned"}
                  onClick={() => setOpenTaskFilter("assigned")}
                  tone="amber"
                />
                <CounterButton
                  label={texts.taskAccepted}
                  value={openTaskCounts.accepted}
                  helper={ui.acceptedHelper}
                  active={openTaskFilter === "accepted"}
                  onClick={() => setOpenTaskFilter("accepted")}
                  tone="blue"
                />
                <CounterButton
                  label={texts.taskInProgress}
                  value={openTaskCounts.in_progress}
                  helper={ui.progressHelper}
                  active={openTaskFilter === "in_progress"}
                  onClick={() => setOpenTaskFilter("in_progress")}
                  tone="blue"
                />
                <CounterButton
                  label={texts.taskAlerts}
                  value={openTaskCounts.alerts}
                  helper={ui.alertsHelper}
                  active={openTaskFilter === "alerts"}
                  onClick={() => setOpenTaskFilter("alerts")}
                  tone="red"
                />
                <CounterButton
                  label={texts.completedHistory}
                  value={openTaskCounts.completed}
                  helper={ui.completedHelper}
                  active={openTaskFilter === "completed"}
                  onClick={() => setOpenTaskFilter("completed")}
                  tone="emerald"
                />
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-slate-800">
                {texts.suppliesStatusTitle}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <CounterButton
                  label={texts.supplyMissing}
                  value={supplyCounts.missing}
                  helper={ui.suppliesMissingHelper}
                  active={supplyFilter === "missing"}
                  onClick={() => setSupplyFilter("missing")}
                  tone="red"
                />
                <CounterButton
                  label={texts.supplyMedium}
                  value={supplyCounts.medium}
                  helper={ui.suppliesMediumHelper}
                  active={supplyFilter === "medium"}
                  onClick={() => setSupplyFilter("medium")}
                  tone="amber"
                />
                <CounterButton
                  label={texts.supplyFull}
                  value={supplyCounts.full}
                  helper={ui.suppliesFullHelper}
                  active={supplyFilter === "full"}
                  onClick={() => setSupplyFilter("full")}
                  tone="emerald"
                />
                <CounterButton
                  label={texts.supplyAll}
                  value={supplyCounts.all}
                  helper={ui.suppliesAllHelper}
                  active={supplyFilter === "all"}
                  onClick={() => setSupplyFilter("all")}
                  tone="slate"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {openTaskFilter === "completed"
                  ? texts.completedHistory
                  : ui.tasksFriendlyTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {openTaskFilter === "completed"
                  ? ui.completedTasksSubtitle
                  : ui.tasksFriendlySubtitle}
              </p>
            </div>

            <Link
              href={`/tasks?propertyId=${property.id}&scope=open`}
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.openPropertyTasksPage}
            </Link>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {ui.openTaskList}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {ui.dateFilterHint} {ui.taskExecutionRangeExplanation}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {ui.dateFrom}
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {ui.dateTo}
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDateFrom("")
                      setDateTo("")
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {ui.clearDates}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <HoverInfoPill
              title={ui.pendingGuideTitle}
              description={ui.pendingGuideText}
              tone="slate"
            />
            <HoverInfoPill
              title={ui.borderlineGuideTitle}
              description={ui.borderlineGuideText}
              tone="amber"
            />
            <HoverInfoPill
              title={ui.normalGuideTitle}
              description={ui.normalGuideText}
              tone="blue"
            />
          </div>

          <div className="mt-5">
            {visibleTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                {openTaskFilter === "completed"
                  ? ui.noCompletedTasks
                  : ui.noDateFilterResults}
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {visibleTasks.map((task) => {
                  const latestAssignment = getLatestAssignment(task)
                  const borderline = isTaskBorderline(task)
                  const activeAlert = isTaskAlertActive(task)
                  const cleaningEnabled = Boolean(task.sendCleaningChecklist)
                  const suppliesEnabled = Boolean(task.sendSuppliesChecklist)
                  const cleaningRun = getCleaningRun(task)
                  const suppliesRun = getSuppliesRun(task)
                  const cleaningSubmitted = isRunSubmitted(cleaningRun)
                  const suppliesSubmitted = isRunSubmitted(suppliesRun)

                  const normalizedTaskTitle = normalizeTaskTitleText(
                    task.title,
                    language
                  )

                  const partnerValue =
                    latestAssignment?.partner?.name || ui.noPartnerShort

                  return (
                    <div
                      key={task.id}
                      className={`rounded-2xl border p-4 ${
                        activeAlert
                          ? "border-red-200 bg-red-50/30"
                          : borderline
                            ? "border-amber-200 bg-amber-50/30"
                            : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold text-slate-900">
                              {normalizedTaskTitle}
                            </div>

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                                task.status
                              )}`}
                            >
                              {taskStatusLabel(language, task.status)}
                            </span>

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getFriendlyTaskConditionTone(
                                task
                              )}`}
                            >
                              {getFriendlyTaskCondition(task, language)}
                            </span>

                            {task.priority ? (
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadgeClasses(
                                  task.priority
                                )}`}
                              >
                                {priorityLabel(language, task.priority)}
                              </span>
                            ) : null}
                          </div>

                          {task.description ? (
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {task.description}
                            </p>
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
                          label={ui.executionWindow}
                          value={buildExecutionWindowLabel(
                            task,
                            texts.locale,
                            language
                          )}
                        />
                        <InfoChip label={texts.partner} value={partnerValue} />
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <InfoChip
                          label={ui.taskCondition}
                          value={getFriendlyTaskCondition(task, language)}
                          valueClassName="text-slate-900 font-medium"
                        />

                        <InfoChip
                          label={ui.checklistsSummary}
                          value={
                            language === "en"
                              ? `Cleaning: ${
                                  cleaningEnabled
                                    ? getChecklistSectionStateLabel(
                                        language,
                                        true,
                                        cleaningSubmitted
                                      )
                                    : "Not enabled"
                                } · Supplies: ${
                                  suppliesEnabled
                                    ? getChecklistSectionStateLabel(
                                        language,
                                        true,
                                        suppliesSubmitted
                                      )
                                    : "Not enabled"
                                }`
                              : `Καθαριότητα: ${
                                  cleaningEnabled
                                    ? getChecklistSectionStateLabel(
                                        language,
                                        true,
                                        cleaningSubmitted
                                      )
                                    : "Δεν στάλθηκε"
                                } · Αναλώσιμα: ${
                                  suppliesEnabled
                                    ? getChecklistSectionStateLabel(
                                        language,
                                        true,
                                        suppliesSubmitted
                                      )
                                    : "Δεν στάλθηκε"
                                }`
                          }
                        />

                        <InfoChip
                          label={texts.alert}
                          value={
                            activeAlert
                              ? formatDateTime(task.alertAt || null, texts.locale)
                              : texts.noValue
                          }
                        />

                        <InfoChip
                          label={ui.bookingWindow}
                          value={
                            task.booking
                              ? language === "en"
                                ? `${formatDate(task.booking.checkInDate, texts.locale)} → ${formatDate(task.booking.checkOutDate, texts.locale)}`
                                : `${formatDate(task.booking.checkInDate, texts.locale)} έως ${formatDate(task.booking.checkOutDate, texts.locale)}`
                              : texts.noValue
                          }
                        />
                      </div>

                      {(task.notes || task.resultNotes) ? (
                        <div className="mt-4 rounded-xl bg-slate-50 p-3">
                          {task.notes ? (
                            <div className="text-sm text-slate-700">
                              <span className="font-semibold text-slate-900">
                                {texts.notes}:
                              </span>{" "}
                              {task.notes}
                            </div>
                          ) : null}

                          {task.resultNotes ? (
                            <div className="mt-2 text-sm text-slate-700">
                              <span className="font-semibold text-slate-900">
                                {language === "en" ? "Result" : "Αποτέλεσμα"}:
                              </span>{" "}
                              {task.resultNotes}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
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
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.details}
            </button>
          </div>

          <div className="mt-3">
            {visibleSuppliesPreview.length > 0 ? (
              <div className="space-y-2">
                {visibleSuppliesPreview.map((supply) => (
                  <div key={supply.id} className="rounded-xl bg-slate-50 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-900">
                        {supply.displayName}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${supplyStateBadgeClass(
                          supply.derivedState
                        )}`}
                      >
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
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                {language === "en"
                  ? "No supplies match the selected filter."
                  : "Δεν υπάρχουν αναλώσιμα για το επιλεγμένο φίλτρο."}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
                      <span className="min-w-0 truncate text-sm text-slate-900">
                        {issue.title}
                      </span>
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
                  className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
                      value={property.defaultPartner.email || texts.noValue}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                    {texts.noDefaultPartner}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900">
                    {ui.manageListsButton}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {ui.manageListsInfo}
                  </p>
                </div>

                <div>
                  <HoverLinkButton
                    href={`/property-checklists/${property.id}`}
                    label={ui.manageListsButton}
                    description={ui.manageListsInfo}
                    primary
                  />
                </div>
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {texts.type}
              </label>
              <input
                value={propertyForm.type}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, type: e.target.value } : prev
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
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
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {texts.choosePartner}
            </label>
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
        open={activeModal === "supplies"}
        title={texts.suppliesTitle}
        description={texts.suppliesSubtitle}
        onClose={() => setActiveModal(null)}
        closeLabel={texts.close}
      >
        {visibleSupplies.length === 0 ? (
          <div className="space-y-4">
            <div className="text-sm text-slate-500">
              {language === "en"
                ? "No supplies match the selected filter."
                : "Δεν υπάρχουν αναλώσιμα για το επιλεγμένο φίλτρο."}
            </div>
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
                      {supply.displayName}
                    </div>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${supplyStateBadgeClass(
                      supply.derivedState
                    )}`}
                  >
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
                      <div className="mt-2 text-sm text-slate-700">
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