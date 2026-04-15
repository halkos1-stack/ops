"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { isTaskAlertActive } from "@/components/tasks/task-ui"
import {
  getPropertyStatusLabel,
  getPropertyTypeLabel,
} from "@/lib/i18n/labels"
import {
  normalizeBookingStatus,
  normalizeIssueStatus,
  normalizeTaskStatus,
} from "@/lib/i18n/normalizers"
import { getPropertiesPageTexts } from "@/lib/i18n/translations"
import {
  normalizeReadinessForUI,
} from "@/lib/readiness/readiness-ui"
import {
  buildPropertyCalendarDaySnapshot,
  type PropertyCalendarDaySnapshot,
} from "@/lib/properties/property-calendar"

// ─── Τοπικοί τύποι ────────────────────────────────────────────────────────────

type PartnerOption = {
  id: string
  code: string
  name: string
  email: string
  specialty: string
  status: string
}

type PropertySupplyListItem = {
  id: string
  isActive?: boolean
  /** Canonical derived state — παρέχεται ήδη από shapePropertyForOperationalViews στο API. */
  derivedState?: string | null
  fillLevel?: string | null
  stateMode?: string | null
  currentStock?: number | null
  mediumThreshold?: number | null
  fullThreshold?: number | null
  minimumThreshold?: number | null
  reorderThreshold?: number | null
  warningThreshold?: number | null
  targetLevel?: number | null
  targetStock?: number | null
  trackingMode?: string | null
  /** Παράγεται από το API (shapePropertyForOperationalViews). Χρησιμοποιείται απευθείας. */
  isShortage?: boolean | null
  isCritical?: boolean
  updatedAt?: string | null
  lastUpdatedAt?: string | null
  supplyItem?: {
    id: string
    code: string
    name: string
    nameEl?: string | null
    nameEn?: string | null
    category?: string | null
    unit?: string | null
    minimumStock?: number | null
    isActive?: boolean
  } | null
}

type PropertyIssueListItem = {
  id: string
  title?: string | null
  status: string
  severity?: string | null
  issueType?: string | null
  requiresImmediateAction?: boolean
  affectsHosting?: boolean | null
  createdAt?: string | null
  updatedAt?: string | null
  resolvedAt?: string | null
}

type PropertyConditionListItem = {
  id: string
  title?: string | null
  status?: string | null
  blockingStatus?: string | null
  severity?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  resolvedAt?: string | null
  dismissedAt?: string | null
}

type PropertyTaskListItem = {
  id: string
  title: string
  status: string
  priority?: string | null
  taskType?: string | null
  scheduledDate?: string | null
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  dueDate?: string | null
  completedAt?: string | null
  alertEnabled?: boolean
  alertAt?: string | null
}

type PropertyBookingListItem = {
  id: string
  status: string
  guestName?: string | null
  checkInDate: string
  checkOutDate: string
  checkInTime?: string | null
  checkOutTime?: string | null
}

type PropertyListItem = {
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
  notes?: string | null
  defaultPartnerId?: string | null
  /** DB readiness field. Σημ: η λίστα API δεν παράγει ακόμα live readiness — διαβάζεται ως-είναι. */
  readinessStatus?: string | null
  readinessUpdatedAt?: string | null
  readinessReasonsText?: string | null
  nextCheckInAt?: string | null
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
  } | null
  bookings?: PropertyBookingListItem[]
  tasks?: PropertyTaskListItem[]
  /** Legacy Issue model — χρησιμοποιείται μόνο για operational counters, όχι ως readiness truth. */
  issues?: PropertyIssueListItem[]
  conditions?: PropertyConditionListItem[]
  propertySupplies?: PropertySupplyListItem[]
}

type CreatePropertyFormState = {
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
  defaultPartnerId: string
  notes: string
}

type MetricFilter =
  | "all"
  | "bookings"
  | "tasks"
  | "alerts"
  | "shortages"
  | "issues"

type PropertyTodaySection = {
  property: PropertyListItem
  snapshot: PropertyCalendarDaySnapshot | null
  location: string
  nextBooking: (PropertyBookingListItem & { checkInAt: Date | null }) | null
  counts: {
    bookings: number
    tasks: number
    alerts: number
    shortages: number
    issues: number
  }
}

type MetricCard = {
  key: Exclude<MetricFilter, "all">
  label: string
  helper: string
  value: number
  valueClassName: string
}

type PropertyOperationalCounts = {
  todayOpenTasks: number
  activeAlerts: number
  /** Operational counter από legacy Issue model. Δεν είναι readiness truth. */
  openIssues: number
  /** Operational counter από legacy Issue model. Δεν είναι readiness truth. */
  openDamages: number
  supplyShortages: number
}

type CounterConfig = {
  key: keyof PropertyOperationalCounts
  label: string
  description: string
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

// ─── Utility helpers ──────────────────────────────────────────────────────────

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
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

function combineCheckInDateTime(
  checkInDate?: string | null,
  checkInTime?: string | null
) {
  const date = normalizeDate(checkInDate)
  if (!date) return null

  if (checkInTime && /^\d{2}:\d{2}$/.test(checkInTime)) {
    const [hours, minutes] = checkInTime.split(":").map(Number)
    const merged = new Date(date)
    merged.setHours(hours, minutes, 0, 0)
    return merged
  }

  const merged = new Date(date)
  merged.setHours(15, 0, 0, 0)
  return merged
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function normalizeLooseText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
}

function getMetricCardClasses(active: boolean) {
  if (active) {
    return "border-slate-900 bg-slate-900 text-white"
  }

  return "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
}

// ─── Operational counter helpers ──────────────────────────────────────────────
// Αυτοί οι helpers παράγουν operational πληροφορία για την ημέρα.
// ΔΕΝ είναι source of truth για readiness — αυτή έρχεται από property.readinessStatus.

function isTodayOpenTask(task: PropertyTaskListItem, now: Date) {
  const scheduledDate = normalizeDate(task.scheduledDate)
  if (!scheduledDate) return false

  const taskStatus = normalizeTaskStatus(task.status)
  const isOpenStatus = [
    "PENDING",
    "ASSIGNED",
    "WAITING_ACCEPTANCE",
    "ACCEPTED",
    "IN_PROGRESS",
    "NEW",
  ].includes(taskStatus)

  if (!isOpenStatus) {
    return false
  }

  return isSameCalendarDay(scheduledDate, now)
}

function isOpenIssue(issue: PropertyIssueListItem) {
  const issueStatus = normalizeIssueStatus(issue.status)
  return issueStatus === "OPEN" || issueStatus === "IN_PROGRESS"
}

function isDamageIssue(issue: PropertyIssueListItem) {
  const normalizedType = normalizeLooseText(issue.issueType)
  return normalizedType.includes("damage") || normalizedType.includes("ζημια")
}

/**
 * Επιστρέφει αν το supply έχει shortage.
 * Διαβάζει πρώτα το `isShortage` field που ήδη παράγει το list API
 * (shapePropertyForOperationalViews → buildCanonicalSupplySnapshot).
 * Fallback σε derivedState/fillLevel αν το isShortage δεν υπάρχει ακόμα.
 */
function isSupplyShortage(supply: PropertySupplyListItem) {
  if (!supply.isActive) return false
  if (typeof supply.isShortage === "boolean") return supply.isShortage
  const state = String(supply.derivedState ?? supply.fillLevel ?? "").toLowerCase()
  return state === "missing" || state === "empty" || state === "low"
}

function getOperationalCountsForToday(
  property: PropertyListItem,
  now: Date
): PropertyOperationalCounts {
  return {
    todayOpenTasks: safeArray(property.tasks).filter((task) =>
      isTodayOpenTask(task, now)
    ).length,
    activeAlerts: safeArray(property.tasks).filter((task) =>
      isTaskAlertActive(task)
    ).length,
    openIssues: safeArray(property.issues).filter(
      (issue) => isOpenIssue(issue) && !isDamageIssue(issue)
    ).length,
    openDamages: safeArray(property.issues).filter(
      (issue) => isOpenIssue(issue) && isDamageIssue(issue)
    ).length,
    supplyShortages: safeArray(property.propertySupplies).filter((supply) =>
      isSupplyShortage(supply)
    ).length,
  }
}

// ─── Readiness helpers ────────────────────────────────────────────────────────
// Η σελίδα καταναλώνει readinessStatus ως canonical field από το property object.
// Δεν ξαναϋπολογίζει readiness — απλώς κανονικοποιεί και εμφανίζει.

/**
 * Επιστρέφει την εξήγηση readiness.
 * Προτεραιότητα: readinessReasonsText από backend → fallback labels.
 */
function getReadinessExplanation(
  property: PropertyListItem,
  language: "el" | "en"
) {
  const storedReason = String(property.readinessReasonsText || "").trim()
  if (storedReason) return storedReason

  const status = normalizeReadinessForUI(property.readinessStatus)

  if (status === "ready") {
    return language === "en"
      ? "No active conditions affecting readiness."
      : "Δεν υπάρχουν ενεργές συνθήκες που να επηρεάζουν την ετοιμότητα."
  }

  if (status === "not_ready") {
    return language === "en"
      ? "Active conditions are blocking readiness."
      : "Ενεργές συνθήκες μπλοκάρουν την ετοιμότητα."
  }

  if (status === "borderline") {
    return language === "en"
      ? "Active conditions keep the property in a borderline state."
      : "Ενεργές συνθήκες κρατούν το ακίνητο σε οριακή κατάσταση."
  }

  return language === "en"
    ? "Readiness status is not yet available."
    : "Η κατάσταση ετοιμότητας δεν είναι ακόμα διαθέσιμη."
}

function getNextUpcomingBooking(property: PropertyListItem) {
  const now = Date.now()

  return safeArray(property.bookings)
    .map((booking) => {
      const checkInAt = combineCheckInDateTime(
        booking.checkInDate,
        booking.checkInTime || null
      )

      return {
        ...booking,
        checkInAt,
      }
    })
    .filter((booking) => {
      const status = normalizeBookingStatus(booking.status)
      return (
        booking.checkInAt &&
        booking.checkInAt.getTime() >= now &&
        (status === "CONFIRMED" || status === "PENDING")
      )
    })
    .sort((a, b) => {
      return (
        (a.checkInAt?.getTime() || Number.MAX_SAFE_INTEGER) -
        (b.checkInAt?.getTime() || Number.MAX_SAFE_INTEGER)
      )
    })[0]
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

function getCounterToneClasses(count: number) {
  return count > 0
    ? "bg-red-50 text-red-700 ring-red-200"
    : "bg-slate-100 text-slate-700 ring-slate-200"
}

/**
 * Inline CSS hover tooltip. Χρησιμοποιείται σε κάθε status chip / counter badge.
 */
function ListTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {label}
        <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-slate-200" />
      </span>
    </span>
  )
}

function getCounterConfigs(language: "el" | "en"): CounterConfig[] {
  return [
    {
      key: "todayOpenTasks",
      label: language === "en" ? "Tasks" : "Εργ.",
      description:
        language === "en"
          ? "Open tasks scheduled for today."
          : "Ανοιχτές εργασίες με σημερινή ημερομηνία.",
    },
    {
      key: "activeAlerts",
      label: language === "en" ? "Alerts" : "Alert",
      description:
        language === "en"
          ? "Active alerts on open tasks."
          : "Ενεργά alert σε ανοιχτές εργασίες.",
    },
    {
      key: "openIssues",
      label: language === "en" ? "Issues" : "Βλαβ.",
      description:
        language === "en"
          ? "Open non-damage issues (operational info only)."
          : "Ανοιχτές βλάβες (επιχειρησιακή πληροφορία).",
    },
    {
      key: "openDamages",
      label: language === "en" ? "Damages" : "Ζημ.",
      description:
        language === "en"
          ? "Open damage records (operational info only)."
          : "Ανοιχτές ζημίες (επιχειρησιακή πληροφορία).",
    },
    {
      key: "supplyShortages",
      label: language === "en" ? "Supply" : "Ελλ.",
      description:
        language === "en"
          ? "Supply shortages."
          : "Ελλείψεις αναλωσίμων.",
    },
  ]
}

function formatLocation(property: PropertyListItem) {
  return [property.address, property.city, property.region].filter(Boolean).join(", ")
}

/**
 * Φίλτρα metric cards.
 * ΚΑΝΟΝΑΣ: "not_ready" αντιστοιχεί αυστηρά σε not_ready — χωρίς borderline.
 * Το borderline έχει ξεχωριστό φίλτρο.
 */
function matchesMetricFilter(
  _property: PropertyListItem,
  metricFilter: MetricFilter
) {
  switch (metricFilter) {
    case "all":
    default:
      return true
  }
}

function normalizeCountryForCreate(value: string, language: "el" | "en") {
  const normalized = value.trim().toLowerCase()

  if (language === "en") {
    if (normalized === "ελλάδα" || normalized === "ελλαδα") return "Greece"
    return value
  }

  if (normalized === "greece") return "Ελλάδα"
  return value
}

function getDefaultCountry(language: "el" | "en") {
  return language === "en" ? "Greece" : "Ελλάδα"
}

// ─── Αρχικές τιμές form ───────────────────────────────────────────────────────

const initialCreateForm: CreatePropertyFormState = {
  name: "",
  address: "",
  city: "",
  region: "",
  postalCode: "",
  country: "Ελλάδα",
  type: "apartment",
  status: "active",
  bedrooms: "0",
  bathrooms: "0",
  maxGuests: "0",
  defaultPartnerId: "",
  notes: "",
}

function localizeText(language: "el" | "en", el: string, en: string) {
  return language === "en" ? en : el
}

function formatDisplayDateTime(
  value: string | Date | null | undefined,
  locale: string,
  options?: Intl.DateTimeFormatOptions
) {
  const date =
    value instanceof Date
      ? value
      : normalizeDate(value)
  if (!date) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(date)
}

function formatDisplayDate(value: string | Date | null | undefined, locale: string) {
  const date =
    value instanceof Date
      ? value
      : normalizeDate(value)
  if (!date) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatTimeDisplay(value?: string | null) {
  const text = String(value || "").trim()
  if (!text) return null
  const match = text.match(/^(\d{2}:\d{2})/)
  return match ? match[1] : null
}

function formatTaskTimeRange(
  language: "el" | "en",
  start?: string | null,
  end?: string | null
) {
  const from = formatTimeDisplay(start)
  const to = formatTimeDisplay(end)
  if (from && to) return `${from} - ${to}`
  if (from) return localizeText(language, `Από ${from}`, `From ${from}`)
  if (to) return localizeText(language, `Έως ${to}`, `Until ${to}`)
  return localizeText(language, "Δεν έχει οριστεί ώρα", "No time set")
}

function formatCountText(
  count: number,
  language: "el" | "en",
  singularEl: string,
  pluralEl: string,
  singularEn: string,
  pluralEn: string
) {
  const label =
    language === "en"
      ? count === 1
        ? singularEn
        : pluralEn
      : count === 1
        ? singularEl
        : pluralEl

  return `${count} ${label}`
}

function getTodayMissingSuppliesCount(snapshot: PropertyCalendarDaySnapshot | null) {
  if (!snapshot) return 0
  return snapshot.supplies.segments.find((segment) => segment.state === "missing")?.count ?? 0
}

function buildPropertyTodaySection(property: PropertyListItem, today: Date): PropertyTodaySection {
  const snapshot = buildPropertyCalendarDaySnapshot({
    date: today,
    bookings: safeArray(property.bookings).map((booking) => ({
      id: booking.id,
      status: booking.status,
      guestName: booking.guestName ?? null,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      checkInTime: booking.checkInTime ?? null,
      checkOutTime: booking.checkOutTime ?? null,
    })),
    tasks: safeArray(property.tasks).map((task) => ({
      id: task.id,
      title: task.title || "",
      status: task.status,
      scheduledDate: task.scheduledDate ?? null,
      scheduledStartTime: task.scheduledStartTime ?? null,
      scheduledEndTime: task.scheduledEndTime ?? null,
      dueDate: task.dueDate ?? null,
      completedAt: task.completedAt ?? null,
      alertEnabled: Boolean(task.alertEnabled),
      alertAt: task.alertAt ?? null,
    })),
    issues: safeArray(property.issues).map((issue) => ({
      id: issue.id,
      title: issue.title || "",
      status: issue.status,
      severity: issue.severity ?? null,
      createdAt: issue.createdAt ?? null,
      updatedAt: issue.updatedAt ?? null,
      resolvedAt: issue.resolvedAt ?? null,
      requiresImmediateAction: Boolean(issue.requiresImmediateAction),
      affectsHosting: issue.affectsHosting ?? null,
    })),
    conditions: safeArray(property.conditions).map((condition) => ({
      id: condition.id,
      title: condition.title || "",
      status: condition.status ?? null,
      blockingStatus: condition.blockingStatus ?? null,
      severity: condition.severity ?? null,
      createdAt: condition.createdAt ?? null,
      updatedAt: condition.updatedAt ?? null,
      resolvedAt: condition.resolvedAt ?? null,
      dismissedAt: condition.dismissedAt ?? null,
    })),
    propertySupplies: safeArray(property.propertySupplies).map((supply) => ({
      id: supply.id,
      currentStock: supply.currentStock ?? null,
      stateMode: supply.stateMode ?? null,
      fillLevel: supply.fillLevel ?? null,
      derivedState: supply.derivedState ?? null,
      mediumThreshold: supply.mediumThreshold ?? null,
      fullThreshold: supply.fullThreshold ?? null,
      minimumThreshold: supply.minimumThreshold ?? null,
      reorderThreshold: supply.reorderThreshold ?? null,
      warningThreshold: supply.warningThreshold ?? null,
      targetLevel: supply.targetLevel ?? null,
      targetStock: supply.targetStock ?? null,
      trackingMode: supply.trackingMode ?? null,
      isCritical: supply.isCritical ?? null,
      updatedAt: supply.updatedAt ?? null,
      lastSeenUpdate: supply.lastUpdatedAt ?? null,
      supplyItem: {
        minimumStock: supply.supplyItem?.minimumStock ?? null,
      },
    })),
  })

  return {
    property,
    snapshot,
    location: formatLocation(property),
    nextBooking: getNextUpcomingBooking(property) ?? null,
    counts: {
      bookings: snapshot?.occupancy.bookingCount ?? 0,
      tasks: snapshot?.tasks.count ?? 0,
      alerts: snapshot?.tasks.activeAlertCount ?? 0,
      shortages: getTodayMissingSuppliesCount(snapshot),
      issues: snapshot?.issues.count ?? 0,
    },
  }
}

function matchesTodayMetricFilter(section: PropertyTodaySection, metricFilter: MetricFilter) {
  switch (metricFilter) {
    case "bookings":
      return section.counts.bookings > 0
    case "tasks":
      return section.counts.tasks > 0
    case "alerts":
      return section.counts.alerts > 0
    case "shortages":
      return section.counts.shortages > 0
    case "issues":
      return section.counts.issues > 0
    case "all":
    default:
      return true
  }
}

function getTodayOccupancyBadgeClasses(state: PropertyCalendarDaySnapshot["occupancy"]["state"]) {
  switch (state) {
    case "turnover":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
    case "check_in":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "check_out":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "occupied":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
    case "vacant":
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getTodayOccupancyLabel(
  language: "el" | "en",
  state: PropertyCalendarDaySnapshot["occupancy"]["state"]
) {
  switch (state) {
    case "turnover":
      return localizeText(language, "Αναχώρηση + άφιξη", "Turnover")
    case "check_in":
      return localizeText(language, "Άφιξη σήμερα", "Check-in today")
    case "check_out":
      return localizeText(language, "Αναχώρηση σήμερα", "Check-out today")
    case "occupied":
      return localizeText(language, "Με διαμονή", "Occupied")
    case "vacant":
    default:
      return localizeText(language, "Κενό σήμερα", "Vacant today")
  }
}

function getTodayTaskBadgeClasses(state: PropertyCalendarDaySnapshot["tasks"]["state"]) {
  switch (state) {
    case "problem":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    case "in_progress":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
    case "accepted":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "assigned":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "scheduled":
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "none":
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getTodayTaskLabel(
  language: "el" | "en",
  state: PropertyCalendarDaySnapshot["tasks"]["state"]
) {
  switch (state) {
    case "problem":
      return localizeText(language, "Χρειάζεται ενέργεια", "Needs action")
    case "in_progress":
      return localizeText(language, "Σε εξέλιξη", "In progress")
    case "accepted":
      return localizeText(language, "Αποδεκτή", "Accepted")
    case "assigned":
      return localizeText(language, "Ανατεθειμένη", "Assigned")
    case "scheduled":
      return localizeText(language, "Προγραμματισμένη", "Scheduled")
    case "completed":
      return localizeText(language, "Ολοκληρωμένη", "Completed")
    case "none":
    default:
      return localizeText(language, "Χωρίς εργασία", "No task")
  }
}

function getTodayIssuesBadgeClasses(state: PropertyCalendarDaySnapshot["issues"]["state"]) {
  switch (state) {
    case "critical":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    case "warning":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "clear":
    default:
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
  }
}

function getTodayIssuesLabel(
  language: "el" | "en",
  state: PropertyCalendarDaySnapshot["issues"]["state"]
) {
  switch (state) {
    case "critical":
      return localizeText(language, "Κρίσιμα θέματα", "Critical issues")
    case "warning":
      return localizeText(language, "Ανοιχτά θέματα", "Open issues")
    case "clear":
    default:
      return localizeText(language, "Καθαρό", "Clear")
  }
}

function getTodaySupplyBadgeClasses(shortages: number) {
  if (shortages > 0) return "bg-red-50 text-red-700 ring-1 ring-red-200"
  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
}

function getTodaySupplyLabel(language: "el" | "en", shortages: number) {
  return shortages > 0
    ? localizeText(language, "Με ελλείψεις", "Shortages detected")
    : localizeText(language, "Πλήρες", "Covered")
}

function getTodayReadinessReason(
  language: "el" | "en",
  snapshot: PropertyCalendarDaySnapshot | null
) {
  if (!snapshot) {
    return localizeText(language, "Δεν υπάρχουν αρκετά δεδομένα για σήμερα.", "Not enough data for today.")
  }

  switch (snapshot.readiness.blockingReason) {
    case "occupied":
      return localizeText(language, "Το ακίνητο έχει ενεργή διαμονή σήμερα.", "The property has an active stay today.")
    case "turnover_without_task":
      return localizeText(language, "Υπάρχει κίνηση κράτησης αλλά δεν υπάρχει εργασία κάλυψης.", "There is booking movement today without task coverage.")
    case "turnover_task_pending":
      return localizeText(language, "Η σημερινή εργασία είναι ακόμη ανοιχτή ή σε εξέλιξη.", "Today's task is still open or in progress.")
    case "issues":
      return localizeText(language, "Υπάρχουν ενεργά ζητήματα ή βλάβες που μπλοκάρουν τη μέρα.", "Active issues or damages are blocking the day.")
    case "conditions":
      return localizeText(language, "Υπάρχουν ενεργές προειδοποιήσεις που θέλουν παρακολούθηση.", "Active warnings need attention.")
    case "clear":
      return localizeText(language, "Η σημερινή εικόνα είναι καθαρή.", "Today's picture is clear.")
    case "unknown":
    default:
      return localizeText(language, "Η σημερινή κατάσταση δεν είναι ακόμη διαθέσιμη.", "Today's status is not yet available.")
  }
}

function TodaySnapshotPanel({
  title,
  badge,
  children,
}: {
  title: string
  badge: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {badge}
      </div>
      <div className="mt-3 space-y-1.5 text-sm text-slate-700">{children}</div>
    </div>
  )
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function BedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7v13M21 7v13" />
      <path d="M3 13h18" />
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2" />
      <rect x="7" y="7" width="4" height="3" rx="0.5" />
    </svg>
  )
}

function BroomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

function SupplyBarsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="20" x2="4" y2="14" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="20" y1="20" x2="20" y2="4" />
    </svg>
  )
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
    </svg>
  )
}

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ")
}

/**
 * Επιστρέφει border + background classes για το card ακινήτου
 * βάσει της υπάρχουσας κατάστασης snapshot — χωρίς νέα λογική.
 */
function getPropertyCardClasses(
  snapshot: PropertyCalendarDaySnapshot | null,
  shortageCount: number,
  issueCount: number
) {
  if (!snapshot) return "border-slate-200 bg-white"

  if (snapshot.issues.state === "critical" || snapshot.tasks.state === "problem") {
    return "border-red-200 bg-red-50/60"
  }
  if (snapshot.issues.state === "warning" || shortageCount > 0 || issueCount > 0) {
    return "border-amber-200 bg-amber-50/50"
  }
  if (snapshot.tasks.state !== "none" && snapshot.tasks.state !== "completed") {
    return "border-sky-200 bg-sky-50/40"
  }
  return "border-slate-200 bg-white"
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const { language } = useAppLanguage()
  const texts = getPropertiesPageTexts(language)

  const [properties, setProperties] = useState<PropertyListItem[]>([])
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [propertyIdFilter, setPropertyIdFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [cityFilter, setCityFilter] = useState("all")
  const [sortBy, setSortBy] = useState("updatedAt_desc")
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("all")

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] =
    useState<CreatePropertyFormState>(initialCreateForm)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const todayReference = useMemo(() => new Date(), [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [propertiesRes, partnersRes] = await Promise.all([
        fetch("/api/properties", { cache: "no-store" }),
        fetch("/api/partners", { cache: "no-store" }),
      ])

      if (!propertiesRes.ok) {
        const errJson = await propertiesRes.json().catch(() => null)
        throw new Error(errJson?.error || `HTTP ${propertiesRes.status}`)
      }

      const propertiesJson = await propertiesRes.json().catch(() => [])
      const partnersJson = await partnersRes.json().catch(() => [])

      const propertyData = Array.isArray(propertiesJson)
        ? propertiesJson
        : Array.isArray(propertiesJson?.data)
          ? propertiesJson.data
          : Array.isArray(propertiesJson?.properties)
            ? propertiesJson.properties
            : []

      const partnerData = Array.isArray(partnersJson)
        ? partnersJson
        : Array.isArray(partnersJson?.data)
          ? partnersJson.data
          : Array.isArray(partnersJson?.partners)
            ? partnersJson.partners
            : []

      setProperties(propertyData)
      setPartners(partnerData)
    } catch (err) {
      console.error("Load properties page error:", err)
      setError(texts.loadError)
    } finally {
      setLoading(false)
    }
  }, [texts.loadError])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const typeOptions = useMemo(() => {
    const values = Array.from(
      new Set(properties.map((item) => item.type).filter(Boolean))
    )
    return values.sort((a, b) => a.localeCompare(b, texts.locale))
  }, [properties, texts.locale])

  const cityOptions = useMemo(() => {
    const values = Array.from(
      new Set(properties.map((item) => item.city).filter(Boolean))
    )
    return values.sort((a, b) => a.localeCompare(b, texts.locale))
  }, [properties, texts.locale])

  const todaySections = useMemo(() => {
    const term = search.trim().toLowerCase()

    const rows = [...properties].filter((property) => {
      const matchesSearch =
        term === "" ||
        property.name?.toLowerCase().includes(term) ||
        property.code?.toLowerCase().includes(term) ||
        property.address?.toLowerCase().includes(term) ||
        property.city?.toLowerCase().includes(term) ||
        property.region?.toLowerCase().includes(term) ||
        property.country?.toLowerCase().includes(term)

      const matchesType =
        typeFilter === "all" ||
        String(property.type || "").toLowerCase() === typeFilter.toLowerCase()

      const matchesCity =
        cityFilter === "all" ||
        String(property.city || "").toLowerCase() === cityFilter.toLowerCase()

      return matchesSearch && matchesType && matchesCity
    })

    rows.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return String(a.name || "").localeCompare(String(b.name || ""), texts.locale)
        case "name_desc":
          return String(b.name || "").localeCompare(String(a.name || ""), texts.locale)
        case "city_asc":
          return String(a.city || "").localeCompare(String(b.city || ""), texts.locale)
        case "city_desc":
          return String(b.city || "").localeCompare(String(a.city || ""), texts.locale)
        case "updatedAt_asc":
          return +new Date(a.updatedAt) - +new Date(b.updatedAt)
        case "updatedAt_desc":
        default:
          return +new Date(b.updatedAt) - +new Date(a.updatedAt)
      }
    })

    return rows.map((property) => buildPropertyTodaySection(property, todayReference))
  }, [
    cityFilter,
    properties,
    search,
    sortBy,
    texts.locale,
    todayReference,
    typeFilter,
  ])

  const todaySummary = useMemo(() => {
    return todaySections.reduce(
      (acc, section) => {
        acc.bookings += section.counts.bookings
        acc.tasks += section.counts.tasks
        acc.alerts += section.counts.alerts
        if (section.counts.shortages > 0) acc.shortages += 1
        if (section.counts.issues > 0) acc.issues += 1
        return acc
      },
      {
        bookings: 0,
        tasks: 0,
        alerts: 0,
        shortages: 0,
        issues: 0,
      }
    )
  }, [todaySections])

  const metricCards = useMemo<MetricCard[]>(() => {
    return [
      {
        key: "bookings",
        label: localizeText(language, "Κρατήσεις", "Bookings"),
        helper: localizeText(
          language,
          "Κρατήσεις που αγγίζουν το σήμερα",
          "Bookings touching today"
        ),
        value: todaySummary.bookings,
        valueClassName: "text-blue-700",
      },
      {
        key: "tasks",
        label: localizeText(language, "Εργασίες", "Tasks"),
        helper: localizeText(
          language,
          "Προγραμματισμένες εργασίες σήμερα",
          "Tasks scheduled today"
        ),
        value: todaySummary.tasks,
        valueClassName: "text-slate-900",
      },
      {
        key: "alerts",
        label: localizeText(language, "Ενεργά alert", "Active alerts"),
        helper: localizeText(
          language,
          "Εργασίες με ενεργό alert σήμερα",
          "Tasks with active alerts today"
        ),
        value: todaySummary.alerts,
        valueClassName: "text-amber-700",
      },
      {
        key: "shortages",
        label: localizeText(language, "Ακίνητα με ελλείψεις", "Properties with shortages"),
        helper: localizeText(
          language,
          "Ακίνητα με ελλείψεις αναλωσίμων",
          "Properties with supply shortages"
        ),
        value: todaySummary.shortages,
        valueClassName: "text-red-700",
      },
      {
        key: "issues",
        label: localizeText(language, "Ακίνητα με βλάβες", "Properties with issues"),
        helper: localizeText(
          language,
          "Ακίνητα με ενεργά θέματα ή ζημιές",
          "Properties with open issues or damages"
        ),
        value: todaySummary.issues,
        valueClassName: "text-red-700",
      },
    ]
  }, [language, todaySummary])

  const filteredSections = useMemo(() => {
    return metricFilter === "all"
      ? todaySections
      : todaySections.filter((section) =>
          matchesTodayMetricFilter(section, metricFilter)
        )
  }, [metricFilter, todaySections])

  const filteredProperties = useMemo(
    () =>
      filteredSections
        .map((section) => section.property)
        .filter((property) => matchesMetricFilter(property, "all")),
    [filteredSections]
  )

  const counterConfigs = useMemo(() => getCounterConfigs(language), [language])

  // ─── Μετρητές summary (readiness-based) ────────────────────────────────────
  // Το readiness διαβάζεται από property.readinessStatus (canonical field).
  // Τα BORDERLINE και NOT_READY είναι ξεχωριστές κατηγορίες.
  function openCreateDrawer() {
    setCreateError(null)
    setCreateForm({
      ...initialCreateForm,
      country: getDefaultCountry(language),
      type: "apartment",
      status: "active",
    })
    setIsCreateOpen(true)
  }

  function closeCreateDrawer() {
    if (createSubmitting) return
    setIsCreateOpen(false)
    setCreateError(null)
  }

  function updateCreateField(
    field: keyof CreatePropertyFormState,
    value: string
  ) {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleCreateProperty(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreateSubmitting(true)
    setCreateError(null)

    try {
      const payload = {
        name: createForm.name.trim(),
        address: createForm.address.trim(),
        city: createForm.city.trim(),
        region: createForm.region.trim(),
        postalCode: createForm.postalCode.trim(),
        country: normalizeCountryForCreate(createForm.country.trim(), language),
        type: createForm.type.trim(),
        status: createForm.status,
        bedrooms: Number(createForm.bedrooms || 0),
        bathrooms: Number(createForm.bathrooms || 0),
        maxGuests: Number(createForm.maxGuests || 0),
        defaultPartnerId: createForm.defaultPartnerId || null,
        notes: createForm.notes.trim() || null,
      }

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || texts.createError)
      }

      await loadData()
      setIsCreateOpen(false)
      setCreateForm({
        ...initialCreateForm,
        country: getDefaultCountry(language),
      })
    } catch (err) {
      console.error("Create property error:", err)
      setCreateError(err instanceof Error ? err.message : texts.createError)
    } finally {
      setCreateSubmitting(false)
    }
  }

  function resetFilters() {
    setSearch("")
    setPropertyIdFilter("")
    setTypeFilter("all")
    setCityFilter("all")
    setSortBy("updatedAt_desc")
    setMetricFilter("all")
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {texts.title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              {texts.subtitle}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={openCreateDrawer}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              {texts.newProperty}
            </button>
          </div>
        </div>

        {/* ─── Metric pills ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {/* Όλα */}
          <button
            type="button"
            onClick={() => setMetricFilter("all")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition hover:scale-[1.02]",
              metricFilter === "all"
                ? "border-slate-300 bg-slate-50 text-slate-700 ring-2 ring-slate-300/40 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            <span className="text-[11px] font-bold leading-none">✓</span>
            <span>{localizeText(language, "Όλα", "All")}</span>
            <span className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
              metricFilter === "all" ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-500"
            )}>{todaySections.length}</span>
          </button>

          {/* Κρατήσεις */}
          <button
            type="button"
            onClick={() => setMetricFilter(metricFilter === "bookings" ? "all" : "bookings")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition hover:scale-[1.02]",
              metricFilter === "bookings"
                ? "border-sky-200 bg-sky-50 text-sky-700 ring-2 ring-sky-200/50 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            <BedIcon className={cn("h-3.5 w-3.5", metricFilter !== "bookings" && "opacity-50")} />
            <span>{localizeText(language, "Κρατήσεις", "Bookings")}</span>
            <span className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
              metricFilter === "bookings" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500"
            )}>{todaySummary.bookings}</span>
          </button>

          {/* Εργασίες */}
          <button
            type="button"
            onClick={() => setMetricFilter(metricFilter === "tasks" ? "all" : "tasks")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition hover:scale-[1.02]",
              metricFilter === "tasks"
                ? "border-amber-200 bg-amber-50 text-amber-700 ring-2 ring-amber-200/50 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            <BroomIcon className={cn("h-3.5 w-3.5", metricFilter !== "tasks" && "opacity-50")} />
            <span>{localizeText(language, "Εργασίες", "Tasks")}</span>
            <span className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
              metricFilter === "tasks" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
            )}>{todaySummary.tasks}</span>
          </button>

          {/* Alerts */}
          <button
            type="button"
            onClick={() => setMetricFilter(metricFilter === "alerts" ? "all" : "alerts")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition hover:scale-[1.02]",
              metricFilter === "alerts"
                ? "border-red-200 bg-red-50 text-red-700 ring-2 ring-red-200/50 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            <span className={cn("text-sm leading-none", metricFilter !== "alerts" && "opacity-50")}>⚠</span>
            <span>{localizeText(language, "Ενεργά alert", "Active alerts")}</span>
            <span className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
              metricFilter === "alerts" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
            )}>{todaySummary.alerts}</span>
          </button>

          {/* Ελλείψεις */}
          <button
            type="button"
            onClick={() => setMetricFilter(metricFilter === "shortages" ? "all" : "shortages")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition hover:scale-[1.02]",
              metricFilter === "shortages"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200/50 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            <SupplyBarsIcon className={cn("h-3.5 w-3.5", metricFilter !== "shortages" && "opacity-50")} />
            <span>{localizeText(language, "Με ελλείψεις", "Shortages")}</span>
            <span className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
              metricFilter === "shortages" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            )}>{todaySummary.shortages}</span>
          </button>

          {/* Βλάβες */}
          <button
            type="button"
            onClick={() => setMetricFilter(metricFilter === "issues" ? "all" : "issues")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition hover:scale-[1.02]",
              metricFilter === "issues"
                ? "border-red-200 bg-red-50 text-red-700 ring-2 ring-red-200/50 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            <WrenchIcon className={cn("h-3.5 w-3.5", metricFilter !== "issues" && "opacity-50")} />
            <span>{localizeText(language, "Βλάβες / Ζημιές", "Issues / Damages")}</span>
            <span className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
              metricFilter === "issues" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
            )}>{todaySummary.issues}</span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {texts.search}
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={texts.searchPlaceholder}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {localizeText(language, "Ακίνητο", "Property")}
              </label>
              <select
                value={propertyIdFilter}
                onChange={(e) => setPropertyIdFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="">{localizeText(language, "Όλα τα ακίνητα", "All properties")}</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {texts.type}
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="all">{texts.allTypes}</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {getPropertyTypeLabel(language, type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {texts.city}
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="all">{texts.allCities}</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {texts.sort}
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="updatedAt_desc">{texts.sortUpdatedDesc}</option>
                <option value="updatedAt_asc">{texts.sortUpdatedAsc}</option>
                <option value="name_asc">{texts.sortNameAsc}</option>
                <option value="name_desc">{texts.sortNameDesc}</option>
                <option value="city_asc">{texts.sortCityAsc}</option>
                <option value="city_desc">{texts.sortCityDesc}</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">{texts.pageHint}</div>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.clearFilters}
            </button>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {filteredSections.filter(s => !propertyIdFilter || s.property.id === propertyIdFilter).length}
              {" / "}
              {todaySections.length}{" "}
              {localizeText(language, "ακίνητα", "properties")}
              {metricFilter !== "all" ? (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {metricCards.find((card) => card.key === metricFilter)?.label}
                </span>
              ) : null}
            </p>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">{texts.loading}</div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600">{error}</div>
          ) : filteredSections.filter(s => !propertyIdFilter || s.property.id === propertyIdFilter).length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">{texts.noResults}</div>
          ) : (
            <div className="space-y-3">
              {filteredSections
                .filter(s => !propertyIdFilter || s.property.id === propertyIdFilter)
                .map((section) => {
                  const { property, snapshot, nextBooking, location } = section
                  const shortageCount = section.counts.shortages
                  const issueCount = section.counts.issues

                  return (
                    <section
                      key={property.id}
                      className={cn("rounded-2xl border p-4 shadow-sm transition hover:shadow-md", getPropertyCardClasses(snapshot, shortageCount, issueCount))}
                    >
                      {/* ── Header: όνομα + διεύθυνση + link ────────────────── */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/properties/${property.id}`}
                              className="text-base font-semibold text-slate-900 hover:underline"
                            >
                              {property.name}
                            </Link>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                              {property.code}
                            </span>
                            <span className="text-xs text-slate-400">
                              {getPropertyTypeLabel(language, property.type)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-slate-500">{location || "—"}</p>
                        </div>
                        <div className="flex shrink-0 items-center">
                          <Link
                            href={`/properties/${property.id}`}
                            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white"
                          >
                            {texts.view}
                          </Link>
                        </div>
                      </div>

                      {/* ── 4 στήλες κατάστασης ──────────────────────────────── */}
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {/* Κρατήσεις */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                              <BedIcon className="h-4 w-4" />
                              {localizeText(language, "Κρατήσεις", "Bookings")}
                            </div>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getTodayOccupancyBadgeClasses(snapshot?.occupancy.state ?? "vacant")}`}>
                              {getTodayOccupancyLabel(language, snapshot?.occupancy.state ?? "vacant")}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-medium text-slate-900">
                            {section.counts.bookings > 0
                              ? formatCountText(section.counts.bookings, language, "κράτηση", "κρατήσεις", "booking", "bookings")
                              : localizeText(language, "Καμία σήμερα", "None today")}
                          </div>
                          {snapshot?.occupancy.primaryGuestName ? (
                            <div className="mt-0.5 truncate text-xs text-slate-500">{snapshot.occupancy.primaryGuestName}</div>
                          ) : null}
                        </div>

                        {/* Εργασίες */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                              <BroomIcon className="h-4 w-4" />
                              {localizeText(language, "Εργασίες", "Tasks")}
                            </div>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getTodayTaskBadgeClasses(snapshot?.tasks.state ?? "none")}`}>
                              {getTodayTaskLabel(language, snapshot?.tasks.state ?? "none")}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-medium text-slate-900">
                            {section.counts.tasks > 0
                              ? formatCountText(section.counts.tasks, language, "εργασία", "εργασίες", "task", "tasks")
                              : localizeText(language, "Καμία σήμερα", "None today")}
                          </div>
                          {(snapshot?.tasks.activeAlertCount ?? 0) > 0 ? (
                            <div className="mt-0.5 text-xs text-red-600">
                              ⚠ {snapshot?.tasks.activeAlertCount} {localizeText(language, "alert", "alerts")}
                            </div>
                          ) : null}
                        </div>

                        {/* Αναλώσιμα */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                              <SupplyBarsIcon className="h-4 w-4" />
                              {localizeText(language, "Αναλώσιμα", "Supplies")}
                            </div>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getTodaySupplyBadgeClasses(shortageCount)}`}>
                              {getTodaySupplyLabel(language, shortageCount)}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-medium text-slate-900">
                            {shortageCount > 0
                              ? localizeText(language, `${shortageCount} ελλείψεις`, `${shortageCount} shortages`)
                              : localizeText(language, "Πλήρη", "Covered")}
                          </div>
                          {(snapshot?.supplies.criticalShortageCount ?? 0) > 0 ? (
                            <div className="mt-0.5 text-xs text-red-600">
                              {snapshot?.supplies.criticalShortageCount} {localizeText(language, "κρίσιμες", "critical")}
                            </div>
                          ) : null}
                        </div>

                        {/* Βλάβες / Ζημιές */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                              <WrenchIcon className="h-4 w-4" />
                              {localizeText(language, "Βλάβες / Ζημιές", "Issues")}
                            </div>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getTodayIssuesBadgeClasses(snapshot?.issues.state ?? "clear")}`}>
                              {getTodayIssuesLabel(language, snapshot?.issues.state ?? "clear")}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-medium text-slate-900">
                            {issueCount > 0
                              ? formatCountText(issueCount, language, "θέμα", "θέματα", "item", "items")
                              : localizeText(language, "Καθαρό", "Clear")}
                          </div>
                          {(snapshot?.issues.blockingCount ?? 0) > 0 ? (
                            <div className="mt-0.5 text-xs text-red-600">
                              {snapshot?.issues.blockingCount} {localizeText(language, "blocking", "blocking")}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* ── Footer: επόμενο check-in ─────────────────────────── */}
                      {nextBooking ? (
                        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">
                            {localizeText(language, "Επόμενο check-in:", "Next check-in:")}
                          </span>
                          <span>{formatDisplayDateTime(nextBooking.checkInAt, texts.locale)}</span>
                          {nextBooking.guestName ? <span>· {nextBooking.guestName}</span> : null}
                        </div>
                      ) : null}
                    </section>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Create drawer ──────────────────────────────────────────────────── */}
      {isCreateOpen ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-950/35"
            onClick={closeCreateDrawer}
          />

          <div className="absolute inset-y-0 right-0 flex w-full max-w-2xl">
            <div className="ml-auto h-full w-full border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex h-full flex-col">
                <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {texts.createTitle}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {texts.createSubtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeCreateDrawer}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {texts.close}
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={handleCreateProperty}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6">
                    {createError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {createError}
                      </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formName}
                        </label>
                        <input
                          value={createForm.name}
                          onChange={(e) => updateCreateField("name", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderName}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formType}
                        </label>
                        <select
                          value={createForm.type}
                          onChange={(e) => updateCreateField("type", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        >
                          {PROPERTY_TYPE_OPTIONS.map((type) => (
                            <option key={type} value={type}>
                              {getPropertyTypeLabel(language, type)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formAddress}
                        </label>
                        <input
                          value={createForm.address}
                          onChange={(e) =>
                            updateCreateField("address", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderAddress}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formCity}
                        </label>
                        <input
                          value={createForm.city}
                          onChange={(e) => updateCreateField("city", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderCity}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formRegion}
                        </label>
                        <input
                          value={createForm.region}
                          onChange={(e) => updateCreateField("region", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderRegion}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formPostalCode}
                        </label>
                        <input
                          value={createForm.postalCode}
                          onChange={(e) =>
                            updateCreateField("postalCode", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderPostalCode}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formCountry}
                        </label>
                        <input
                          value={createForm.country}
                          onChange={(e) => updateCreateField("country", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formStatus}
                        </label>
                        <select
                          value={createForm.status}
                          onChange={(e) => updateCreateField("status", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        >
                          <option value="active">{texts.statusActive}</option>
                          <option value="inactive">{texts.statusInactive}</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formDefaultPartner}
                        </label>
                        <select
                          value={createForm.defaultPartnerId}
                          onChange={(e) =>
                            updateCreateField("defaultPartnerId", e.target.value)
                          }
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

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formBedrooms}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={createForm.bedrooms}
                          onChange={(e) =>
                            updateCreateField("bedrooms", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formBathrooms}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={createForm.bathrooms}
                          onChange={(e) =>
                            updateCreateField("bathrooms", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formMaxGuests}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={createForm.maxGuests}
                          onChange={(e) =>
                            updateCreateField("maxGuests", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formNotes}
                        </label>
                        <textarea
                          value={createForm.notes}
                          onChange={(e) => updateCreateField("notes", e.target.value)}
                          rows={5}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderNotes}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 px-4 py-4 sm:px-6">
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeCreateDrawer}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        disabled={createSubmitting}
                      >
                        {texts.cancel}
                      </button>

                      <button
                        type="submit"
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={createSubmitting}
                      >
                        {createSubmitting ? texts.saving : texts.saveProperty}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
