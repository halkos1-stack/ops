"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import {
  getIssuePriorityLabel,
  getIssueStatusLabel,
  getTaskStatusLabel,
} from "@/lib/i18n/labels"
import {
  normalizeIssuePriority,
  normalizeIssueStatus,
  normalizeTaskStatus,
  normalizeTaskTitleText,
} from "@/lib/i18n/normalizers"
import { getSupplyDisplayName } from "@/lib/supply-presets"
import { buildCanonicalSupplySnapshot } from "@/lib/supplies/compute-supply-state"

type Language = "el" | "en"
type ViewMode = "calendar" | "management"
type CalendarGranularity = "month" | "week" | "day"
type SupplyState = "missing" | "medium" | "full"
type Tone = "slate" | "sky" | "amber" | "emerald" | "red"
type TaskTitleKey = "cleaning" | "inspection" | "repair" | "damage" | "supplies" | "photos"

type PropertyBookingLite = {
  id: string
  guestName?: string | null
  checkInDate?: string | null
  checkOutDate?: string | null
  checkInTime?: string | null
  checkOutTime?: string | null
  status?: string | null
  sourcePlatform?: string | null
}

type PropertyTaskAssignmentLite = {
  id: string
  status?: string | null
  assignedAt?: string | null
  acceptedAt?: string | null
  rejectedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  partner?: {
    id: string
    code?: string | null
    name?: string | null
    email?: string | null
    phone?: string | null
    specialty?: string | null
    status?: string | null
  } | null
}

type PropertyTaskLite = {
  id: string
  title: string
  taskType?: string | null
  status: string
  scheduledDate?: string | null
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  alertEnabled?: boolean
  alertAt?: string | null
  notes?: string | null
  booking?: {
    id: string
    guestName?: string | null
    checkInDate?: string | null
    checkOutDate?: string | null
    checkInTime?: string | null
    checkOutTime?: string | null
    status?: string | null
  } | null
  assignments?: PropertyTaskAssignmentLite[]
}

type PropertyIssueLite = {
  id: string
  title: string
  description?: string | null
  severity: string
  status: string
  createdAt?: string | null
  updatedAt?: string | null
}

type PropertySupplyLite = {
  id: string
  currentStock: number
  stateMode?: string | null
  mediumThreshold?: number | null
  fullThreshold?: number | null
  targetStock?: number | null
  reorderThreshold?: number | null
  minimumThreshold?: number | null
  isCritical?: boolean
  derivedState?: string | null
  updatedAt?: string | null
  lastUpdatedAt?: string | null
  supplyItem?: {
    id: string
    code?: string | null
    name?: string | null
    nameEl?: string | null
    nameEn?: string | null
    minimumStock?: number | null
  } | null
}

type PartnerOption = {
  id: string
  code: string
  name: string
  email?: string | null
  phone?: string | null
  specialty?: string | null
  status?: string | null
}

type PropertyDetail = {
  id: string
  code?: string | null
  name: string
  address: string
  city?: string | null
  region?: string | null
  postalCode?: string | null
  country?: string | null
  type?: string | null
  status?: string | null
  notes?: string | null
  defaultPartnerId?: string | null
  bookings?: PropertyBookingLite[]
  tasks?: PropertyTaskLite[]
  issues?: PropertyIssueLite[]
  propertySupplies?: PropertySupplyLite[]
}

type PropertyFormState = {
  code: string
  name: string
  address: string
  city: string
  region: string
  postalCode: string
  country: string
  type: string
  status: string
  notes: string
}

type TaskModalState = {
  mode: "create" | "edit"
  taskId?: string
  workWindowKey: string
  titleKey: TaskTitleKey
  scheduledDate: string
  scheduledStartTime: string
  scheduledEndTime: string
  alertEnabled: boolean
  alertAt: string
  notes: string
}

type SupplyCounts = Record<SupplyState, number>

type BarData = {
  tone: Tone
  label: string
  detail: string
  hoverText: string
}

type WorkWindow = {
  key: string
  booking: PropertyBookingLite
  nextBooking: PropertyBookingLite | null
  startAt: Date
  endAt: Date | null
  task: PropertyTaskLite | null
}

type DaySnapshot = {
  date: Date
  key: string
  isToday: boolean
  isCurrentMonth: boolean
  occupancy: BarData
  tasks: BarData
  supplies: {
    detail: string
    hoverText: string
    counts: SupplyCounts
  }
  issues: BarData
  workWindow: WorkWindow | null
  bookings: PropertyBookingLite[]
  dayTasks: PropertyTaskLite[]
  openIssues: PropertyIssueLite[]
}

const translations = {
  el: {
    loading: "Φόρτωση ημερολογίου ακινήτου...",
    loadError: "Δεν ήταν δυνατή η φόρτωση του ημερολογίου ακινήτου.",
    noData: "Δεν υπάρχουν διαθέσιμα δεδομένα ακινήτου.",
    calendarView: "Ημερολόγιο ακινήτου",
    managementView: "Διαχείριση ακινήτου",
    calendarViewHint:
      "Βασική προβολή ελέγχου ακινήτου με κύρια έμφαση στο εβδομαδιαίο ημερολόγιο και στη ροή εργασίας ανάμεσα σε check-out και επόμενο check-in.",
    managementViewHint:
      "Από εδώ γίνονται οι βασικές ενέργειες για στοιχεία ακινήτου, προεπιλεγμένο συνεργάτη και λίστες.",
    month: "Μήνας",
    week: "Εβδομάδα",
    day: "Ημέρα",
    previous: "Προηγούμενο",
    today: "Σήμερα",
    next: "Επόμενο",
    createTask: "Δημιουργία εργασίας",
    occupancy: "Φιλοξενία",
    tasks: "Εργασίες",
    supplies: "Αναλώσιμα",
    issues: "Ζημιές / βλάβες",
    noGuest: "Χωρίς φιλοξενούμενους",
    occupied: "Με φιλοξενούμενους",
    arrival: "Άφιξη",
    departure: "Αναχώρηση",
    turnover: "Άφιξη / Αναχώρηση",
    stay: "Διαμονή",
    openWindow: "Ανοικτό παράθυρο εργασίας",
    noTask: "Χωρίς εργασία",
    createCleaningTaskPrompt:
      "Δημιουργήστε εργασία καθαρισμού για το επόμενο check-in",
    openTasks: "Ανοιχτές εργασίες",
    inProgressTask: "Σε εξέλιξη",
    completedTasks: "Ολοκληρωμένη εργασία",
    alerts: "Ενεργό alert",
    cleanPicture: "Καθαρή εικόνα",
    openIssues: "Ανοιχτά θέματα",
    selectedDay: "Εικόνα ημέρας",
    bookingsTitle: "Κρατήσεις ημέρας",
    tasksTitle: "Εργασίες ημέρας",
    suppliesTitle: "Τρέχουσα εικόνα αναλωσίμων",
    issuesTitle: "Ανοιχτές ζημιές / βλάβες",
    from: "Από",
    to: "Έως",
    guest: "Φιλοξενούμενος",
    unnamedGuest: "Χωρίς όνομα",
    untitledTask: "Χωρίς τίτλο",
    untitledIssue: "Χωρίς τίτλο",
    noBookingsForDay: "Δεν υπάρχουν κρατήσεις για αυτή την ημέρα.",
    noTasksForDay: "Δεν υπάρχει ενεργό παράθυρο εργασίας για αυτή την ημέρα.",
    noIssuesForDay: "Δεν υπάρχουν ανοιχτές ζημιές ή βλάβες.",
    noSupplies: "Δεν υπάρχουν καταχωρημένα αναλώσιμα.",
    missing: "Έλλειψη",
    medium: "Μέτρια",
    full: "Πλήρης",
    bookingsSuffix: "κρατήσεις",
    tasksSuffix: "εργασίες",
    issuesSuffix: "θέματα",
    viewTask: "Προβολή εργασίας",
    editTask: "Επεξεργασία εργασίας",
    deleteTask: "Διαγραφή εργασίας",
    editProperty: "Στοιχεία ακινήτου",
    editPartner: "Συνεργάτης",
    editLists: "Λίστες ακινήτου",
    editPropertyHint:
      "Ενημέρωση βασικών πεδίων ακινήτου χωρίς να φύγεις από αυτή τη σελίδα.",
    editPartnerHint:
      "Ορισμός ή αλλαγή προεπιλεγμένου συνεργάτη για το ακίνητο.",
    editListsHint:
      "Μετάβαση στις λίστες ακινήτου που χρησιμοποιούνται στη ροή εκτέλεσης.",
    currentSuppliesState:
      "Η τρέχουσα κατάσταση αναλωσίμων προβάλλεται σε όλες τις ημέρες του ημερολογίου.",
    currentIssuesState:
      "Η τρέχουσα ανοιχτή εικόνα ζημιών και βλαβών προβάλλεται σε όλες τις ημέρες του ημερολογίου.",
    save: "Αποθήκευση",
    cancel: "Κλείσιμο",
    close: "Κλείσιμο",
    choosePartner: "Επιλογή συνεργάτη",
    noPartner: "Χωρίς συνεργάτη",
    propertySaved: "Τα στοιχεία ακινήτου αποθηκεύτηκαν επιτυχώς.",
    partnerSaved: "Ο προεπιλεγμένος συνεργάτης αποθηκεύτηκε επιτυχώς.",
    taskSaved: "Η εργασία αποθηκεύτηκε επιτυχώς.",
    taskDeleted: "Η εργασία διαγράφηκε επιτυχώς.",
    saveError: "Δεν ήταν δυνατή η αποθήκευση.",
    deleteError: "Δεν ήταν δυνατή η διαγραφή της εργασίας.",
    deleteConfirm: "Θέλεις σίγουρα να διαγράψεις αυτή την εργασία;",
    editTaskTitle: "Εργασία",
    propertyDetailsTitle: "Στοιχεία ακινήτου",
    partnerTitle: "Προεπιλεγμένος συνεργάτης",
    code: "Κωδικός",
    name: "Όνομα",
    address: "Διεύθυνση",
    city: "Πόλη",
    region: "Περιοχή",
    postalCode: "Ταχ. κώδικας",
    country: "Χώρα",
    type: "Τύπος",
    status: "Κατάσταση",
    notes: "Σημειώσεις",
    date: "Ημερομηνία εκτέλεσης",
    startTime: "Ώρα έναρξης",
    endTime: "Ώρα λήξης",
    alertTitle: "Alert",
    alertEnabled: "Ενεργοποίηση alert",
    alertAt: "Ώρα alert",
    taskTitleLabel: "Τίτλος εργασίας",
    propertyLabel: "Ακίνητο",
    taskWindowLabel: "Παράθυρο εργασίας",
    managementPanelTitle: "Κεντρική διαχείριση ακινήτου",
    managementPanelSubtitle:
      "Όλες οι βασικές ενέργειες για λίστες, συνεργάτη, στοιχεία ακινήτου και νέα εργασία γίνονται από εδώ.",
    workWindowInstruction:
      "Άνοιξε την ημερομηνία για να διαχειριστείς την εργασία αυτής της περιόδου.",
    viewDayInstruction:
      "Άνοιξε την ημέρα για να διαχειριστείς την εργασία.",
    nextCheckInMissing: "Δεν υπάρχει επόμενο check-in.",
    monday: "Δευ",
    tuesday: "Τρι",
    wednesday: "Τετ",
    thursday: "Πεμ",
    friday: "Παρ",
    saturday: "Σαβ",
    sunday: "Κυρ",
  },
  en: {
    loading: "Loading property calendar...",
    loadError: "The property calendar could not be loaded.",
    noData: "No property data are available.",
    calendarView: "Property calendar",
    managementView: "Property management",
    calendarViewHint:
      "Main control view with focus on the weekly calendar and the work flow between check-out and next check-in.",
    managementViewHint:
      "Core actions for property details, default partner and property lists happen from here.",
    month: "Month",
    week: "Week",
    day: "Day",
    previous: "Previous",
    today: "Today",
    next: "Next",
    createTask: "Create task",
    occupancy: "Occupancy",
    tasks: "Tasks",
    supplies: "Supplies",
    issues: "Issues / damages",
    noGuest: "No guests",
    occupied: "Occupied",
    arrival: "Arrival",
    departure: "Departure",
    turnover: "Arrival / Departure",
    stay: "Stay",
    openWindow: "Open work window",
    noTask: "No task",
    createCleaningTaskPrompt:
      "Create a cleaning task for the next check-in",
    openTasks: "Open tasks",
    inProgressTask: "In progress",
    completedTasks: "Completed task",
    alerts: "Active alert",
    cleanPicture: "Clean picture",
    openIssues: "Open issues",
    selectedDay: "Day view",
    bookingsTitle: "Bookings for this day",
    tasksTitle: "Tasks for this day",
    suppliesTitle: "Current supplies picture",
    issuesTitle: "Open issues / damages",
    from: "From",
    to: "To",
    guest: "Guest",
    unnamedGuest: "Unnamed guest",
    untitledTask: "Untitled",
    untitledIssue: "Untitled",
    noBookingsForDay: "There are no bookings for this day.",
    noTasksForDay: "There is no active work window for this day.",
    noIssuesForDay: "There are no open issues or damages.",
    noSupplies: "There are no registered supplies.",
    missing: "Missing",
    medium: "Medium",
    full: "Full",
    bookingsSuffix: "bookings",
    tasksSuffix: "tasks",
    issuesSuffix: "issues",
    viewTask: "View task",
    editTask: "Edit task",
    deleteTask: "Delete task",
    editProperty: "Property details",
    editPartner: "Partner",
    editLists: "Property lists",
    editPropertyHint:
      "Update core property fields without leaving this page.",
    editPartnerHint:
      "Set or change the default partner for this property.",
    editListsHint:
      "Open the property lists used in the execution flow.",
    currentSuppliesState:
      "The current supplies state is shown across all days of the calendar.",
    currentIssuesState:
      "The current open issues and damages picture is shown across all days of the calendar.",
    save: "Save",
    cancel: "Close",
    close: "Close",
    choosePartner: "Choose partner",
    noPartner: "No partner",
    propertySaved: "Property details were saved successfully.",
    partnerSaved: "The default partner was saved successfully.",
    taskSaved: "The task was saved successfully.",
    taskDeleted: "The task was deleted successfully.",
    saveError: "The changes could not be saved.",
    deleteError: "The task could not be deleted.",
    deleteConfirm: "Are you sure you want to delete this task?",
    editTaskTitle: "Task",
    propertyDetailsTitle: "Property details",
    partnerTitle: "Default partner",
    code: "Code",
    name: "Name",
    address: "Address",
    city: "City",
    region: "Region",
    postalCode: "Postal code",
    country: "Country",
    type: "Type",
    status: "Status",
    notes: "Notes",
    date: "Execution date",
    startTime: "Start time",
    endTime: "End time",
    alertTitle: "Alert",
    alertEnabled: "Enable alert",
    alertAt: "Alert time",
    taskTitleLabel: "Task title",
    propertyLabel: "Property",
    taskWindowLabel: "Work window",
    managementPanelTitle: "Property management center",
    managementPanelSubtitle:
      "All key actions for lists, partner, property details and new task creation happen here.",
    workWindowInstruction:
      "Open the date to manage the task for this period.",
    viewDayInstruction:
      "Open the date to manage the task.",
    nextCheckInMissing: "There is no next check-in.",
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  },
} satisfies Record<Language, Record<string, string>>

const TASK_TITLE_OPTIONS: TaskTitleKey[] = [
  "cleaning",
  "inspection",
  "repair",
  "damage",
  "supplies",
  "photos",
]

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function safeArray<T>(value?: T[] | null): T[] {
  return Array.isArray(value) ? value : []
}

function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function normalizeDateOnlyValue(value?: string | null) {
  if (!value) return null
  const text = String(value).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  return text
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + amount)
  return next
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function startOfWeek(date: Date) {
  const base = startOfDay(date)
  const day = base.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(base, diff)
}

function getMonthGridStart(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  return startOfWeek(first)
}

function buildVisibleDates(anchorDate: Date, granularity: CalendarGranularity) {
  if (granularity === "day") {
    return [startOfDay(anchorDate)]
  }

  if (granularity === "week") {
    const weekStart = startOfWeek(anchorDate)
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  }

  const start = getMonthGridStart(anchorDate)
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

function formatMonthTitle(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatFullDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}
function formatShortDate(value?: string | null, locale?: string) {
  const date = normalizeDate(value)
  if (!date || !locale) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatTime(value?: string | null) {
  if (!value) return "—"
  return String(value).slice(0, 5)
}

function formatDateTime(date: Date | null, locale: string) {
  if (!date) return "—"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function combineDateAndTime(dateValue?: string | null, timeValue?: string | null) {
  const dateText = normalizeDateOnlyValue(dateValue)
  if (!dateText) return null
  const timeText = String(timeValue || "00:00").slice(0, 5)
  const combined = new Date(`${dateText}T${timeText}:00`)
  if (Number.isNaN(combined.getTime())) return null
  return combined
}

function toDateTimeLocalValue(date: Date | null) {
  if (!date) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function buildPropertyFormState(property: PropertyDetail): PropertyFormState {
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
    notes: property.notes || "",
  }
}

function getTaskTitleOptions(language: Language) {
  if (language === "en") {
    return {
      cleaning: "Cleaning",
      inspection: "Inspection",
      repair: "Repair",
      damage: "Damage",
      supplies: "Supplies",
      photos: "Photo documentation",
    } satisfies Record<TaskTitleKey, string>
  }

  return {
    cleaning: "Καθαρισμός",
    inspection: "Επιθεώρηση",
    repair: "Βλάβη",
    damage: "Ζημιά",
    supplies: "Αναλώσιμα",
    photos: "Φωτογραφική τεκμηρίωση",
  } satisfies Record<TaskTitleKey, string>
}

function getWeekdayLabels(language: Language) {
  const t = translations[language]
  return [
    t.monday,
    t.tuesday,
    t.wednesday,
    t.thursday,
    t.friday,
    t.saturday,
    t.sunday,
  ]
}

function getToneClasses(tone: Tone) {
  if (tone === "sky") {
    return {
      bar: "bg-sky-500",
      soft: "border-sky-200 bg-sky-50 text-sky-800",
    }
  }

  if (tone === "amber") {
    return {
      bar: "bg-amber-500",
      soft: "border-amber-200 bg-amber-50 text-amber-800",
    }
  }

  if (tone === "emerald") {
    return {
      bar: "bg-emerald-500",
      soft: "border-emerald-200 bg-emerald-50 text-emerald-800",
    }
  }

  if (tone === "red") {
    return {
      bar: "bg-red-500",
      soft: "border-red-200 bg-red-50 text-red-800",
    }
  }

  return {
    bar: "bg-slate-300",
    soft: "border-slate-200 bg-slate-50 text-slate-700",
  }
}

function isTaskAlertActive(task: PropertyTaskLite) {
  if (!task.alertEnabled || !task.alertAt) return false
  const alertDate = normalizeDate(task.alertAt)
  if (!alertDate) return false
  return alertDate.getTime() <= Date.now()
}

function isOpenTaskStatus(status?: string | null) {
  const normalized = normalizeTaskStatus(status)
  return [
    "NEW",
    "PENDING",
    "ASSIGNED",
    "WAITING_ACCEPTANCE",
    "ACCEPTED",
    "IN_PROGRESS",
  ].includes(normalized)
}

function isCompletedTaskStatus(status?: string | null) {
  return normalizeTaskStatus(status) === "COMPLETED"
}

function isBookingActive(status?: string | null) {
  return String(status || "").trim().toLowerCase() !== "cancelled"
}

function getLatestAssignment(task: PropertyTaskLite) {
  return safeArray(task.assignments)[0] || null
}

function getAssignmentPhaseText(task: PropertyTaskLite, language: Language) {
  const latestAssignment = getLatestAssignment(task)
  if (!latestAssignment?.status) {
    return language === "en" ? "No assignment yet" : "Δεν έχει ανατεθεί ακόμη"
  }

  const normalized = String(latestAssignment.status).trim().toLowerCase()

  if (normalized === "accepted") {
    return language === "en" ? "Accepted by partner" : "Έχει αποδεχθεί ο συνεργάτης"
  }

  if (normalized === "in_progress" || latestAssignment.startedAt) {
    return language === "en" ? "Execution started" : "Έχει ξεκινήσει η εκτέλεση"
  }

  if (normalized === "completed" || latestAssignment.completedAt) {
    return language === "en" ? "Completed by partner" : "Ολοκληρώθηκε από συνεργάτη"
  }

  if (normalized === "rejected" || latestAssignment.rejectedAt) {
    return language === "en" ? "Rejected by partner" : "Απορρίφθηκε από συνεργάτη"
  }

  return language === "en" ? "Assigned" : "Ανατεθειμένη"
}

function getSupplyState(supply: PropertySupplyLite): SupplyState {
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

  if (canonical.derivedState === "missing") return "missing"
  if (canonical.derivedState === "medium") return "medium"
  return "full"
}

function buildSupplyCounts(supplies: PropertySupplyLite[]): SupplyCounts {
  const counts: SupplyCounts = {
    missing: 0,
    medium: 0,
    full: 0,
  }

  supplies.forEach((supply) => {
    counts[getSupplyState(supply)] += 1
  })

  return counts
}

function formatSuppliesDetail(counts: SupplyCounts, language: Language) {
  const t = translations[language]
  return `${counts.missing} ${t.missing} • ${counts.medium} ${t.medium} • ${counts.full} ${t.full}`
}

function getOccupancyBookingsForDay(bookings: PropertyBookingLite[], dateKey: string) {
  return bookings.filter((booking) => {
    if (!isBookingActive(booking.status)) return false

    const checkIn = normalizeDateOnlyValue(booking.checkInDate)
    const checkOut = normalizeDateOnlyValue(booking.checkOutDate)

    if (!checkIn || !checkOut) return false

    return checkIn <= dateKey && checkOut >= dateKey
  })
}

function buildWorkWindows(bookings: PropertyBookingLite[], tasks: PropertyTaskLite[]) {
  const activeBookings = bookings
    .filter((booking) => isBookingActive(booking.status))
    .filter((booking) => booking.id && booking.checkOutDate)
    .sort((a, b) => String(a.checkInDate || "").localeCompare(String(b.checkInDate || "")))

  return activeBookings
    .map((booking, index) => {
      const nextBooking = activeBookings[index + 1] || null
      const startAt = combineDateAndTime(booking.checkOutDate, booking.checkOutTime)
      if (!startAt) return null

      const endAt = nextBooking
        ? combineDateAndTime(nextBooking.checkInDate, nextBooking.checkInTime)
        : null

      const linkedTask =
        tasks.find((task) => task.booking?.id === booking.id) ||
        tasks.find((task) => String(task.id || "").includes(String(booking.id || ""))) ||
        null

      return {
        key: `${booking.id}-${nextBooking?.id || "open"}`,
        booking,
        nextBooking,
        startAt,
        endAt,
        task: linkedTask,
      } satisfies WorkWindow
    })
    .filter((item): item is WorkWindow => Boolean(item))
}

function workWindowIncludesDay(window: WorkWindow, date: Date) {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  if (window.endAt) {
    return window.startAt <= dayEnd && window.endAt >= dayStart
  }

  return window.startAt <= dayEnd
}

function getWorkWindowForDay(windows: WorkWindow[], date: Date) {
  return windows.find((window) => workWindowIncludesDay(window, date)) || null
}

function getTaskActionText(task: PropertyTaskLite, language: Language) {
  const normalizedStatus = normalizeTaskStatus(task.status)

  if (isTaskAlertActive(task)) {
    return language === "en"
      ? "Immediate action required. Open the date, review the task and adjust the execution timing if needed."
      : "Απαιτείται άμεση ενέργεια. Άνοιξε την ημερομηνία, έλεγξε την εργασία και διόρθωσε χρόνο εκτέλεσης αν χρειάζεται."
  }

  if (normalizedStatus === "IN_PROGRESS") {
    return language === "en"
      ? "Execution is in progress. Review progress and complete the task when the work is finished."
      : "Η εργασία είναι σε εξέλιξη. Έλεγξε την πρόοδο και ολοκλήρωσέ την όταν τελειώσει η εκτέλεση."
  }

  if (["NEW", "PENDING"].includes(normalizedStatus)) {
    return language === "en"
      ? "The task needs handling. Open the date and continue with execution planning."
      : "Η εργασία θέλει διαχείριση. Άνοιξε την ημερομηνία και συνέχισε με τον προγραμματισμό εκτέλεσης."
  }

  if (["ASSIGNED", "WAITING_ACCEPTANCE"].includes(normalizedStatus)) {
    return language === "en"
      ? "The task is assigned and waits for response. Open the date to continue management."
      : "Η εργασία είναι ανατεθειμένη και περιμένει απάντηση. Άνοιξε την ημερομηνία για συνέχεια διαχείρισης."
  }

  if (normalizedStatus === "ACCEPTED") {
    return language === "en"
      ? "The partner has accepted the task. Open the date to continue execution tracking."
      : "Ο συνεργάτης έχει αποδεχθεί την εργασία. Άνοιξε την ημερομηνία για να συνεχίσεις την παρακολούθηση."
  }

  if (normalizedStatus === "COMPLETED") {
    return language === "en"
      ? "The task is completed. Open the date to review the final task state."
      : "Η εργασία έχει ολοκληρωθεί. Άνοιξε την ημερομηνία για να δεις την τελική κατάστασή της."
  }

  return language === "en"
    ? "Open the date to manage the task."
    : "Άνοιξε την ημερομηνία για να διαχειριστείς την εργασία."
}
function getOccupancyBarData(
  bookings: PropertyBookingLite[],
  locale: string,
  language: Language,
  dateKey: string
): BarData {
  const t = translations[language]

  if (bookings.length === 0) {
    return {
      tone: "slate",
      label: t.noGuest,
      detail: "—",
      hoverText: language === "en" ? "No active stay on this day." : "Δεν υπάρχει ενεργή φιλοξενία αυτή την ημέρα.",
    }
  }

  const hasArrival = bookings.some(
    (booking) => normalizeDateOnlyValue(booking.checkInDate) === dateKey
  )
  const hasDeparture = bookings.some(
    (booking) => normalizeDateOnlyValue(booking.checkOutDate) === dateKey
  )

  let tone: Tone = "emerald"
  let label = t.occupied

  if (hasArrival && hasDeparture) {
    tone = "amber"
    label = t.turnover
  } else if (hasArrival) {
    tone = "sky"
    label = t.arrival
  } else if (hasDeparture) {
    tone = "amber"
    label = t.departure
  }

  const detail = bookings
    .map((booking) => {
      return `${formatShortDate(booking.checkInDate, locale)} ${formatTime(booking.checkInTime)} → ${formatShortDate(booking.checkOutDate, locale)} ${formatTime(booking.checkOutTime)}`
    })
    .join(" • ")

  const hoverText = bookings
    .map((booking) => {
      const guestName = booking.guestName || t.unnamedGuest
      return `${guestName}\n${t.from}: ${formatShortDate(booking.checkInDate, locale)} ${formatTime(booking.checkInTime)}\n${t.to}: ${formatShortDate(booking.checkOutDate, locale)} ${formatTime(booking.checkOutTime)}`
    })
    .join("\n\n")

  return {
    tone,
    label,
    detail,
    hoverText,
  }
}

function getTaskBarData(
  workWindow: WorkWindow | null,
  language: Language,
  locale: string
): BarData {
  const t = translations[language]

  if (!workWindow) {
    return {
      tone: "slate",
      label: t.noTask,
      detail: t.noTasksForDay,
      hoverText: t.viewDayInstruction,
    }
  }

  const windowDetail = workWindow.endAt
    ? `${formatDateTime(workWindow.startAt, locale)} → ${formatDateTime(workWindow.endAt, locale)}`
    : `${formatDateTime(workWindow.startAt, locale)} → ${t.nextCheckInMissing}`

  if (!workWindow.task) {
    return {
      tone: "red",
      label: t.createCleaningTaskPrompt,
      detail: windowDetail,
      hoverText: `${t.createCleaningTaskPrompt}\n${windowDetail}\n${t.workWindowInstruction}`,
    }
  }

  const task = workWindow.task
  const latestAssignment = getLatestAssignment(task)
  const taskStatus = getTaskStatusLabel(language, task.status)
  const partnerName = latestAssignment?.partner?.name || t.noPartner
  const phaseText = getAssignmentPhaseText(task, language)
  const timeRange = `${formatTime(task.scheduledStartTime)} - ${formatTime(task.scheduledEndTime)}`

  let tone: Tone = "amber"

  if (isTaskAlertActive(task)) {
    tone = "red"
  } else if (normalizeTaskStatus(task.status) === "IN_PROGRESS") {
    tone = "sky"
  } else if (normalizeTaskStatus(task.status) === "COMPLETED") {
    tone = "emerald"
  } else if (["ASSIGNED", "WAITING_ACCEPTANCE", "ACCEPTED"].includes(normalizeTaskStatus(task.status))) {
    tone = "sky"
  }

  const hoverText = [
    `${normalizeTaskTitleText(task.title, language) || t.untitledTask}`,
    `${t.date}: ${formatShortDate(task.scheduledDate, locale)}`,
    `${t.from}: ${formatTime(task.scheduledStartTime)}`,
    `${t.to}: ${formatTime(task.scheduledEndTime)}`,
    `${t.editPartner}: ${partnerName}`,
    `${t.status}: ${taskStatus}`,
    `${t.tasks}: ${phaseText}`,
    getTaskActionText(task, language),
  ].join("\n")

  return {
    tone,
    label: isTaskAlertActive(task) ? `${t.alerts} • ${taskStatus}` : taskStatus,
    detail: `${timeRange} • ${partnerName}`,
    hoverText,
  }
}

function getIssuesBarData(issues: PropertyIssueLite[], language: Language): BarData {
  const t = translations[language]
  const openIssues = issues.filter((issue) => {
    const normalized = normalizeIssueStatus(issue.status)
    return normalized === "OPEN" || normalized === "IN_PROGRESS"
  })

  if (openIssues.length === 0) {
    return {
      tone: "emerald",
      label: t.cleanPicture,
      detail: "0",
      hoverText: language === "en" ? "There are no open issues or damages." : "Δεν υπάρχουν ανοιχτές ζημιές ή βλάβες.",
    }
  }

  const highestSeverity = openIssues.reduce<string | null>((current, issue) => {
    const severity = normalizeIssuePriority(issue.severity)
    if (severity === "URGENT") return "URGENT"
    if (severity === "HIGH" && current !== "URGENT") return "HIGH"
    if (severity === "MEDIUM" && !current) return "MEDIUM"
    return current
  }, null)

  const tone: Tone = highestSeverity === "URGENT" || highestSeverity === "HIGH"
    ? "red"
    : "amber"

  const label = highestSeverity
    ? getIssuePriorityLabel(language, highestSeverity)
    : t.openIssues

  const hoverText = openIssues
    .map((issue) => {
      const title = issue.title || t.untitledIssue
      const status = getIssueStatusLabel(language, issue.status)
      const severity = getIssuePriorityLabel(language, issue.severity)
      const description = issue.description?.trim() || "—"
      return `${title} | ${status} | ${severity}\n${description}`
    })
    .join("\n\n")

  return {
    tone,
    label,
    detail: `${openIssues.length} ${t.issuesSuffix}`,
    hoverText,
  }
}

function getSuppliesBarData(supplies: PropertySupplyLite[], language: Language) {
  const counts = buildSupplyCounts(supplies)
  const detail = formatSuppliesDetail(counts, language)
  const hoverText = language === "en"
    ? `Current supplies picture\n${detail}`
    : `Τρέχουσα εικόνα αναλωσίμων\n${detail}`

  return {
    counts,
    detail,
    hoverText,
  }
}

function buildDaySnapshot(params: {
  date: Date
  anchorDate: Date
  property: PropertyDetail
  workWindows: WorkWindow[]
  language: Language
  locale: string
}): DaySnapshot {
  const { date, anchorDate, property, workWindows, language, locale } = params
  const dateKey = normalizeDateOnlyValue(date.toISOString()) || ""
  const bookings = getOccupancyBookingsForDay(safeArray(property.bookings), dateKey)
  const dayTasks = safeArray(property.tasks).filter(
    (task) => normalizeDateOnlyValue(task.scheduledDate) === dateKey
  )
  const openIssues = safeArray(property.issues).filter((issue) => {
    const normalized = normalizeIssueStatus(issue.status)
    return normalized === "OPEN" || normalized === "IN_PROGRESS"
  })
  const workWindow = getWorkWindowForDay(workWindows, date)

  return {
    date,
    key: dateKey,
    isToday: sameDay(date, new Date()),
    isCurrentMonth: date.getMonth() === anchorDate.getMonth(),
    occupancy: getOccupancyBarData(bookings, locale, language, dateKey),
    tasks: getTaskBarData(workWindow, language, locale),
    supplies: getSuppliesBarData(safeArray(property.propertySupplies), language),
    issues: getIssuesBarData(openIssues, language),
    workWindow,
    bookings,
    dayTasks,
    openIssues,
  }
}

function ModalShell({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function ViewSwitchButton({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={hint}
      onClick={onClick}
      className={cn(
        "rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      )}
    >
      {label}
    </button>
  )
}

function CalendarModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      )}
    >
      {label}
    </button>
  )
}
function FlatBar({
  title,
  bar,
}: {
  title: string
  bar: BarData
}) {
  const toneClasses = getToneClasses(bar.tone)

  return (
    <div className="space-y-1.5" title={bar.hoverText}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </span>
        <span className="truncate text-[10px] text-slate-400">{bar.detail}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-200">
        <div className={cn("h-3 rounded-full", toneClasses.bar)} style={{ width: "100%" }} />
      </div>
      <div className="text-[11px] font-medium text-slate-700">{bar.label}</div>
    </div>
  )
}

function SupplyBar({
  title,
  detail,
  counts,
  hoverText,
}: {
  title: string
  detail: string
  counts: SupplyCounts
  hoverText: string
}) {
  const total = counts.missing + counts.medium + counts.full

  return (
    <div className="space-y-1.5" title={hoverText}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </span>
        <span className="truncate text-[10px] text-slate-400">{detail}</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="bg-red-500"
          style={{ width: total === 0 ? "0%" : `${(counts.missing / total) * 100}%` }}
        />
        <div
          className="bg-amber-500"
          style={{ width: total === 0 ? "0%" : `${(counts.medium / total) * 100}%` }}
        />
        <div
          className="bg-emerald-500"
          style={{ width: total === 0 ? "0%" : `${(counts.full / total) * 100}%` }}
        />
      </div>
      <div className="text-[11px] font-medium text-slate-700">{detail}</div>
    </div>
  )
}

function CalendarCell({
  snapshot,
  granularity,
  t,
  onOpenDay,
}: {
  snapshot: DaySnapshot
  granularity: CalendarGranularity
  t: Record<string, string>
  onOpenDay: () => void
}) {
  const minHeight = granularity === "week" ? "min-h-[340px]" : "min-h-[220px]"

  return (
    <button
      type="button"
      onClick={onOpenDay}
      title={t.viewDayInstruction}
      className={cn(
        "rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
        minHeight,
        snapshot.isCurrentMonth || granularity !== "month"
          ? "border-slate-200 bg-white"
          : "border-slate-100 bg-slate-50/70",
        snapshot.isToday && "ring-2 ring-slate-900/10"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-sm font-semibold",
            snapshot.isCurrentMonth || granularity !== "month"
              ? "text-slate-900"
              : "text-slate-400"
          )}
        >
          {snapshot.date.getDate()}
        </span>

        {snapshot.isToday ? (
          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
            {t.today}
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        <FlatBar title={t.occupancy} bar={snapshot.occupancy} />
        <FlatBar title={t.tasks} bar={snapshot.tasks} />
        <SupplyBar
          title={t.supplies}
          detail={snapshot.supplies.detail}
          counts={snapshot.supplies.counts}
          hoverText={snapshot.supplies.hoverText}
        />
        <FlatBar title={t.issues} bar={snapshot.issues} />
      </div>
    </button>
  )
}

function ManagementCard({
  title,
  hint,
  action,
}: {
  title: string
  hint: string
  action: ReactNode
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" title={hint}>
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-500">{hint}</div>
      <div className="mt-4">{action}</div>
    </div>
  )
}

export default function PropertyDetailPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { language } = useAppLanguage()
  const locale = language === "en" ? "en-GB" : "el-GR"
  const t = translations[language]
  const taskTitleOptions = getTaskTitleOptions(language)

  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<ViewMode>("calendar")
  const [granularity, setGranularity] = useState<CalendarGranularity>("week")
  const [anchorDate, setAnchorDate] = useState<Date>(startOfDay(new Date()))

  const [propertyModalOpen, setPropertyModalOpen] = useState(false)
  const [partnerModalOpen, setPartnerModalOpen] = useState(false)
  const [taskModal, setTaskModal] = useState<TaskModalState | null>(null)

  const [propertyForm, setPropertyForm] = useState<PropertyFormState | null>(null)
  const [selectedPartnerId, setSelectedPartnerId] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const [propertyRes, partnersRes] = await Promise.allSettled([
        fetch(`/api/properties/${id}`, { cache: "no-store" }),
        fetch("/api/partners", { cache: "no-store" }),
      ])

      if (propertyRes.status !== "fulfilled") {
        throw new Error(t.loadError)
      }

      const propertyJson = await propertyRes.value.json().catch(() => null)
      if (!propertyRes.value.ok) {
        throw new Error(propertyJson?.error || t.loadError)
      }

      const nextProperty = (propertyJson?.property ?? propertyJson?.data ?? propertyJson) as PropertyDetail
      setProperty(nextProperty)
      setPropertyForm(buildPropertyFormState(nextProperty))
      setSelectedPartnerId(String(nextProperty.defaultPartnerId || ""))

      if (partnersRes.status === "fulfilled") {
        const partnersJson = await partnersRes.value.json().catch(() => null)
        const nextPartners = Array.isArray(partnersJson)
          ? partnersJson
          : Array.isArray(partnersJson?.partners)
            ? partnersJson.partners
            : Array.isArray(partnersJson?.data)
              ? partnersJson.data
              : []
        setPartners(nextPartners as PartnerOption[])
      } else {
        setPartners([])
      }
    } catch (err) {
      console.error("Property calendar load error:", err)
      setError(err instanceof Error ? err.message : t.loadError)
      setProperty(null)
      setPartners([])
    } finally {
      setLoading(false)
    }
  }, [id, t.loadError])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const workWindows = useMemo(() => {
    if (!property) return []
    return buildWorkWindows(safeArray(property.bookings), safeArray(property.tasks))
  }, [property])

  const weekdayLabels = useMemo(() => getWeekdayLabels(language), [language])
  const visibleDates = useMemo(
    () => buildVisibleDates(anchorDate, granularity),
    [anchorDate, granularity]
  )

  const daySnapshots = useMemo(() => {
    if (!property) return []

    return visibleDates.map((date) =>
      buildDaySnapshot({
        date,
        anchorDate,
        property,
        workWindows,
        language,
        locale,
      })
    )
  }, [property, visibleDates, anchorDate, workWindows, language, locale])

  const selectedDaySnapshot = useMemo(() => {
    if (!property) return null

    const selectedKey = normalizeDateOnlyValue(anchorDate.toISOString())
    return (
      daySnapshots.find((snapshot) => snapshot.key === selectedKey) ||
      buildDaySnapshot({
        date: anchorDate,
        anchorDate,
        property,
        workWindows,
        language,
        locale,
      })
    )
  }, [property, daySnapshots, anchorDate, workWindows, language, locale])

  const supplyRows = useMemo(() => {
    return safeArray(property?.propertySupplies).map((supply) => {
      const state = getSupplyState(supply)
      return {
        ...supply,
        state,
        displayName: getSupplyDisplayName(language, {
          code: supply.supplyItem?.code,
          fallbackName:
            supply.supplyItem?.nameEn ||
            supply.supplyItem?.nameEl ||
            supply.supplyItem?.name ||
            supply.id,
        }),
      }
    })
  }, [property?.propertySupplies, language])

  function moveRange(direction: "prev" | "next") {
    if (granularity === "month") {
      setAnchorDate((prev) => addMonths(prev, direction === "prev" ? -1 : 1))
      return
    }

    if (granularity === "week") {
      setAnchorDate((prev) => addDays(prev, direction === "prev" ? -7 : 7))
      return
    }

    setAnchorDate((prev) => addDays(prev, direction === "prev" ? -1 : 1))
  }

  function openCreateTaskModal(window: WorkWindow) {
    const selectedDate = normalizeDateOnlyValue(anchorDate.toISOString()) || normalizeDateOnlyValue(window.startAt.toISOString()) || ""
    const defaultStartTime = normalizeDateOnlyValue(window.startAt.toISOString()) === selectedDate
      ? formatTime(`${String(window.startAt.getHours()).padStart(2, "0")}:${String(window.startAt.getMinutes()).padStart(2, "0")}`)
      : ""

    setTaskModal({
      mode: "create",
      workWindowKey: window.key,
      titleKey: "cleaning",
      scheduledDate: selectedDate,
      scheduledStartTime: defaultStartTime === "—" ? "" : defaultStartTime,
      scheduledEndTime: "",
      alertEnabled: false,
      alertAt: "",
      notes: "",
    })
  }

  function openEditTaskModal(window: WorkWindow, task: PropertyTaskLite) {
    setTaskModal({
      mode: "edit",
      taskId: task.id,
      workWindowKey: window.key,
      titleKey: TASK_TITLE_OPTIONS.includes(String(task.taskType || "") as TaskTitleKey)
        ? (String(task.taskType || "") as TaskTitleKey)
        : "cleaning",
      scheduledDate: normalizeDateOnlyValue(task.scheduledDate) || normalizeDateOnlyValue(anchorDate.toISOString()) || "",
      scheduledStartTime: task.scheduledStartTime || "",
      scheduledEndTime: task.scheduledEndTime || "",
      alertEnabled: Boolean(task.alertEnabled),
      alertAt: task.alertAt ? toDateTimeLocalValue(new Date(task.alertAt)) : "",
      notes: task.notes || "",
    })
  }
  async function savePropertyChanges(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!property || !propertyForm) return

    try {
      setSaving(true)
      setMessage(null)

      const response = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: propertyForm.code.trim(),
          name: propertyForm.name.trim(),
          address: propertyForm.address.trim(),
          city: propertyForm.city.trim(),
          region: propertyForm.region.trim(),
          postalCode: propertyForm.postalCode.trim(),
          country: propertyForm.country.trim(),
          type: propertyForm.type.trim(),
          status: propertyForm.status.trim(),
          notes: propertyForm.notes.trim() || null,
        }),
      })

      const json = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(json?.error || t.saveError)
      }

      setMessage(t.propertySaved)
      await loadData()
      setPropertyModalOpen(false)
    } catch (err) {
      console.error("Save property error:", err)
      setMessage(err instanceof Error ? err.message : t.saveError)
    } finally {
      setSaving(false)
    }
  }

  async function savePartnerChanges(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!property) return

    try {
      setSaving(true)
      setMessage(null)

      const response = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultPartnerId: selectedPartnerId || null,
        }),
      })

      const json = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(json?.error || t.saveError)
      }

      setMessage(t.partnerSaved)
      await loadData()
      setPartnerModalOpen(false)
    } catch (err) {
      console.error("Save partner error:", err)
      setMessage(err instanceof Error ? err.message : t.saveError)
    } finally {
      setSaving(false)
    }
  }

  async function saveTaskChanges(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!property || !taskModal) return

    try {
      setSaving(true)
      setMessage(null)

      const targetWindow = workWindows.find((window) => window.key === taskModal.workWindowKey) || null
      const title = taskTitleOptions[taskModal.titleKey]

      const payload = {
        propertyId: property.id,
        bookingId: targetWindow?.booking.id || null,
        source: targetWindow?.booking.id ? "booking" : "manual",
        title,
        taskType: taskModal.titleKey,
        priority: "normal",
        scheduledDate: taskModal.scheduledDate,
        scheduledStartTime: taskModal.scheduledStartTime || null,
        scheduledEndTime: taskModal.scheduledEndTime || null,
        alertEnabled: taskModal.alertEnabled,
        alertAt: taskModal.alertEnabled ? taskModal.alertAt || null : null,
        notes: taskModal.notes.trim() || null,
        description: null,
        requiresPhotos: false,
        requiresChecklist: false,
        requiresApproval: false,
        sendCleaningChecklist: false,
        sendSuppliesChecklist: false,
        sendIssuesChecklist: false,
      }

      const response = await fetch(
        taskModal.mode === "create" ? "/api/tasks" : `/api/tasks/${taskModal.taskId}`,
        {
          method: taskModal.mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      const json = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(json?.error || t.saveError)
      }

      setMessage(t.taskSaved)
      await loadData()
      setTaskModal(null)
    } catch (err) {
      console.error("Save task error:", err)
      setMessage(err instanceof Error ? err.message : t.saveError)
    } finally {
      setSaving(false)
    }
  }

  async function deleteTask(taskId: string) {
    if (!window.confirm(t.deleteConfirm)) return

    try {
      setDeletingTaskId(taskId)
      setMessage(null)

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })

      const json = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(json?.error || t.deleteError)
      }

      setMessage(t.taskDeleted)
      await loadData()
      setTaskModal(null)
    } catch (err) {
      console.error("Delete task error:", err)
      setMessage(err instanceof Error ? err.message : t.deleteError)
    } finally {
      setDeletingTaskId(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">{t.loading}</div>
      </div>
    )
  }

  if (error || !property || !propertyForm || !selectedDaySnapshot) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-red-700">{error || t.noData}</div>
      </div>
    )
  }

  const selectedWindow = selectedDaySnapshot.workWindow
  const selectedWindowTask = selectedWindow?.task || null

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {property.name}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {[property.address, property.city, property.region, property.postalCode, property.country]
              .filter(Boolean)
              .join(", ")}
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
              <ViewSwitchButton
                active={viewMode === "calendar"}
                label={t.calendarView}
                hint={t.calendarViewHint}
                onClick={() => setViewMode("calendar")}
              />
              <ViewSwitchButton
                active={viewMode === "management"}
                label={t.managementView}
                hint={t.managementViewHint}
                onClick={() => setViewMode("management")}
              />
            </div>

            {viewMode === "calendar" ? (
              <button
                type="button"
                onClick={() => selectedWindow && openCreateTaskModal(selectedWindow)}
                disabled={!selectedWindow || Boolean(selectedWindowTask)}
                title={selectedWindow ? t.createTask : t.noTasksForDay}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {t.createTask}
              </button>
            ) : null}
          </div>

          {message ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          ) : null}
        </section>

        {viewMode === "management" ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t.managementPanelTitle}</h2>
              <p className="mt-2 text-sm text-slate-500">{t.managementPanelSubtitle}</p>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <ManagementCard
                title={t.editLists}
                hint={t.editListsHint}
                action={
                  <Link
                    href={`/property-checklists/${property.id}`}
                    className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t.editLists}
                  </Link>
                }
              />
              <ManagementCard
                title={t.editPartner}
                hint={t.editPartnerHint}
                action={
                  <button
                    type="button"
                    onClick={() => setPartnerModalOpen(true)}
                    className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t.editPartner}
                  </button>
                }
              />
              <ManagementCard
                title={t.editProperty}
                hint={t.editPropertyHint}
                action={
                  <button
                    type="button"
                    onClick={() => setPropertyModalOpen(true)}
                    className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t.editProperty}
                  </button>
                }
              />
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
                <CalendarModeButton active={granularity === "month"} label={t.month} onClick={() => setGranularity("month")} />
                <CalendarModeButton active={granularity === "week"} label={t.week} onClick={() => setGranularity("week")} />
                <CalendarModeButton active={granularity === "day"} label={t.day} onClick={() => setGranularity("day")} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => moveRange("prev")} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t.previous}</button>
                <button type="button" onClick={() => setAnchorDate(startOfDay(new Date()))} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t.today}</button>
                <button type="button" onClick={() => moveRange("next")} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t.next}</button>
              </div>
            </div>

            <div className="mt-5 text-2xl font-bold capitalize text-slate-900">
              {granularity === "day" ? formatFullDate(anchorDate, locale) : formatMonthTitle(anchorDate, locale)}
            </div>

            {granularity !== "day" ? (
              <div className="mt-5 grid grid-cols-7 gap-3">
                {weekdayLabels.map((label) => (
                  <div key={label} className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                ))}
              </div>
            ) : null}

            {granularity === "month" ? (
              <div className="mt-3 grid grid-cols-7 gap-3">
                {daySnapshots.map((snapshot) => (
                  <CalendarCell key={snapshot.key} snapshot={snapshot} granularity={granularity} t={t} onOpenDay={() => { setAnchorDate(snapshot.date); setGranularity("day") }} />
                ))}
              </div>
            ) : null}

            {granularity === "week" ? (
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
                {daySnapshots.map((snapshot) => (
                  <CalendarCell key={snapshot.key} snapshot={snapshot} granularity={granularity} t={t} onOpenDay={() => { setAnchorDate(snapshot.date); setGranularity("day") }} />
                ))}
              </div>
            ) : null}

            {granularity === "day" ? (
              <div className="mt-5 space-y-5">
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 text-sm font-semibold text-slate-900">{t.selectedDay}</div>
                    <div className="space-y-4">
                      <FlatBar title={t.occupancy} bar={selectedDaySnapshot.occupancy} />
                      <FlatBar title={t.tasks} bar={selectedDaySnapshot.tasks} />
                      <SupplyBar title={t.supplies} detail={selectedDaySnapshot.supplies.detail} counts={selectedDaySnapshot.supplies.counts} hoverText={selectedDaySnapshot.supplies.hoverText} />
                      <FlatBar title={t.issues} bar={selectedDaySnapshot.issues} />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 text-sm font-semibold text-slate-900">{t.suppliesTitle}</div>
                    {supplyRows.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{t.noSupplies}</div>
                    ) : (
                      <div className="space-y-3">
                        {supplyRows.map((supply) => {
                          const tone: Tone = supply.state === "missing" ? "red" : supply.state === "medium" ? "amber" : "emerald"
                          const toneClasses = getToneClasses(tone)
                          return (
                            <div key={supply.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-slate-900">{supply.displayName}</div>
                                  <div className="mt-1 text-xs text-slate-500">{supply.currentStock}</div>
                                </div>
                                <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", toneClasses.soft)}>{supply.state === "missing" ? t.missing : supply.state === "medium" ? t.medium : t.full}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">{t.currentSuppliesState}</div>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-3">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 text-sm font-semibold text-slate-900">{t.bookingsTitle}</div>
                    {selectedDaySnapshot.bookings.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{t.noBookingsForDay}</div>
                    ) : (
                      <div className="space-y-3">
                        {selectedDaySnapshot.bookings.map((booking) => (
                          <div key={booking.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-sm font-semibold text-slate-900">{booking.guestName || t.unnamedGuest}</div>
                            <div className="mt-2 text-xs text-slate-500">{t.from}: {formatShortDate(booking.checkInDate, locale)} {formatTime(booking.checkInTime)}</div>
                            <div className="mt-1 text-xs text-slate-500">{t.to}: {formatShortDate(booking.checkOutDate, locale)} {formatTime(booking.checkOutTime)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">{t.tasksTitle}</div>
                      {!selectedWindowTask && selectedWindow ? (
                        <button type="button" onClick={() => openCreateTaskModal(selectedWindow)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">{t.createTask}</button>
                      ) : null}
                    </div>

                    {!selectedWindow ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{t.noTasksForDay}</div>
                    ) : !selectedWindowTask ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" title={selectedDaySnapshot.tasks.hoverText}>
                        <div className="font-semibold">{t.createCleaningTaskPrompt}</div>
                        <div className="mt-2 text-xs">{selectedDaySnapshot.tasks.detail}</div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" title={selectedDaySnapshot.tasks.hoverText}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{normalizeTaskTitleText(selectedWindowTask.title, language) || t.untitledTask}</span>
                          <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{getTaskStatusLabel(language, selectedWindowTask.status)}</span>
                          {isTaskAlertActive(selectedWindowTask) ? <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">{t.alerts}</span> : null}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">{t.from}: {formatTime(selectedWindowTask.scheduledStartTime)} • {t.to}: {formatTime(selectedWindowTask.scheduledEndTime)}</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" onClick={() => openEditTaskModal(selectedWindow, selectedWindowTask)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{t.editTask}</button>
                          <Link href={`/tasks/${selectedWindowTask.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{t.viewTask}</Link>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 text-sm font-semibold text-slate-900">{t.issuesTitle}</div>
                    {selectedDaySnapshot.openIssues.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{t.noIssuesForDay}</div>
                    ) : (
                      <div className="space-y-3">
                        {selectedDaySnapshot.openIssues.map((issue) => (
                          <div key={issue.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">{issue.title || t.untitledIssue}</span>
                              <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{getIssueStatusLabel(language, issue.status)}</span>
                              <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{getIssuePriorityLabel(language, issue.severity)}</span>
                            </div>
                            {issue.description ? <div className="mt-2 text-xs leading-5 text-slate-500">{issue.description}</div> : null}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">{t.currentIssuesState}</div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        )}
      </div>

      <ModalShell open={propertyModalOpen} title={t.propertyDetailsTitle} onClose={() => setPropertyModalOpen(false)}>
        <form onSubmit={savePropertyChanges} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1"><span className="text-sm font-medium text-slate-700">{t.code}</span><input value={propertyForm.code} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, code: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></label>
            <label className="space-y-1"><span className="text-sm font-medium text-slate-700">{t.name}</span><input value={propertyForm.name} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, name: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></label>
          </div>
          <label className="space-y-1 block"><span className="text-sm font-medium text-slate-700">{t.address}</span><input value={propertyForm.address} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, address: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1"><span className="text-sm font-medium text-slate-700">{t.city}</span><input value={propertyForm.city} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, city: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></label>
            <label className="space-y-1"><span className="text-sm font-medium text-slate-700">{t.region}</span><input value={propertyForm.region} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, region: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></label>
            <label className="space-y-1"><span className="text-sm font-medium text-slate-700">{t.postalCode}</span><input value={propertyForm.postalCode} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, postalCode: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1"><span className="text-sm font-medium text-slate-700">{t.country}</span><input value={propertyForm.country} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, country: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></label>
            <label className="space-y-1"><span className="text-sm font-medium text-slate-700">{t.type}</span><input value={propertyForm.type} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, type: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></label>
            <label className="space-y-1"><span className="text-sm font-medium text-slate-700">{t.status}</span><input value={propertyForm.status} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, status: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></label>
          </div>
          <label className="space-y-1 block"><span className="text-sm font-medium text-slate-700">{t.notes}</span><textarea value={propertyForm.notes} onChange={(e) => setPropertyForm((prev) => prev ? { ...prev, notes: e.target.value } : prev)} rows={5} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setPropertyModalOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{t.cancel}</button><button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{t.save}</button></div>
        </form>
      </ModalShell>

      <ModalShell open={partnerModalOpen} title={t.partnerTitle} onClose={() => setPartnerModalOpen(false)}>
        <form onSubmit={savePartnerChanges} className="space-y-4">
          <label className="space-y-1 block"><span className="text-sm font-medium text-slate-700">{t.choosePartner}</span><select value={selectedPartnerId} onChange={(e) => setSelectedPartnerId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"><option value="">{t.noPartner}</option>{partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name} ({partner.code})</option>)}</select></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setPartnerModalOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{t.cancel}</button><button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{t.save}</button></div>
        </form>
      </ModalShell>

      <ModalShell open={Boolean(taskModal)} title={t.editTaskTitle} onClose={() => setTaskModal(null)}>
        {taskModal ? (
          <form onSubmit={saveTaskChanges} className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div><strong>{t.propertyLabel}:</strong> {property.name}</div>
              <div className="mt-1">{property.address}</div>
              <div className="mt-2"><strong>{t.taskWindowLabel}:</strong> {selectedWindow ? selectedDaySnapshot.tasks.detail : "—"}</div>
            </div>
            <label className="space-y-1 block"><span className="text-sm font-medium text-slate-700">{t.taskTitleLabel}</span><select value={taskModal.titleKey} onChange={(e) => setTaskModal((prev) => prev ? { ...prev, titleKey: e.target.value as TaskTitleKey } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900">{TASK_TITLE_OPTIONS.map((key) => <option key={key} value={key}>{taskTitleOptions[key]}</option>)}</select></label>
            <label className="space-y-1 block"><span className="text-sm font-medium text-slate-700">{t.date}</span><input type="date" value={taskModal.scheduledDate} onChange={(e) => setTaskModal((prev) => prev ? { ...prev, scheduledDate: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" required /></label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1"><span className="text-sm font-medium text-slate-700">{t.startTime}</span><input type="time" value={taskModal.scheduledStartTime} onChange={(e) => setTaskModal((prev) => prev ? { ...prev, scheduledStartTime: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></label>
              <label className="space-y-1"><span className="text-sm font-medium text-slate-700">{t.endTime}</span><input type="time" value={taskModal.scheduledEndTime} onChange={(e) => setTaskModal((prev) => prev ? { ...prev, scheduledEndTime: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></label>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={taskModal.alertEnabled} onChange={(e) => setTaskModal((prev) => prev ? { ...prev, alertEnabled: e.target.checked, alertAt: e.target.checked ? prev.alertAt : "" } : prev)} />{t.alertEnabled}</label>
              {taskModal.alertEnabled ? <label className="mt-3 block space-y-1"><span className="text-sm font-medium text-slate-700">{t.alertAt}</span><input type="datetime-local" value={taskModal.alertAt} onChange={(e) => setTaskModal((prev) => prev ? { ...prev, alertAt: e.target.value } : prev)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></label> : null}
            </div>
            <label className="space-y-1 block"><span className="text-sm font-medium text-slate-700">{t.notes}</span><textarea value={taskModal.notes} onChange={(e) => setTaskModal((prev) => prev ? { ...prev, notes: e.target.value } : prev)} rows={4} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900" /></label>
            <div className="flex flex-wrap justify-end gap-3">{taskModal.mode === "edit" && taskModal.taskId ? <button type="button" onClick={() => deleteTask(taskModal.taskId!)} disabled={deletingTaskId === taskModal.taskId} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60">{t.deleteTask}</button> : null}<button type="button" onClick={() => setTaskModal(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{t.close}</button><button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{taskModal.mode === "create" ? t.createTask : t.save}</button></div>
          </form>
        ) : null}
      </ModalShell>
    </>
  )
}
