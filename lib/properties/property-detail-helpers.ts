/**
 * property-detail-helpers.ts
 *
 * Shared helpers για τη σελίδα detail ακινήτου (properties/[id]/page.tsx).
 * Περιέχει:
 *  - Τύποι data shapes (API response shapes, local derived shapes)
 *  - Translations object (display strings)
 *  - Date / calendar utilities
 *  - Operational selectors (day entry, work windows, hour rows)
 *  - Display class / tone helpers
 *  - Tooltip builders
 *  - Supply state calculator
 *
 * Κανόνας: χωρίς React imports, χωρίς state, χωρίς business logic πέρα
 * από το display layer. Μόνο pure functions και data.
 */

import { getSupplyDisplayName } from "@/lib/supply-presets"
import { buildCanonicalSupplySnapshot } from "@/lib/supplies/compute-supply-state"

// ─── Primitive types ──────────────────────────────────────────────────────────

export type Language = "el" | "en"
export type CalendarGranularity = "month" | "week" | "day"
export type CalendarFilter = "bookings" | "tasks" | "supplies" | "issues" | null
export type TaskTitleKey =
  | "cleaning"
  | "inspection"
  | "repair"
  | "damage"
  | "supplies"
  | "photos"
export type Tone = "slate" | "sky" | "amber" | "emerald" | "red"
export type SupplyState = "missing" | "medium" | "full"
export type OccupancyKind = "vacant" | "arrival" | "departure" | "turnover" | "stay"

// ─── API data shapes ──────────────────────────────────────────────────────────

export type PropertyBookingLite = {
  id: string
  guestName?: string | null
  checkInDate?: string | null
  checkOutDate?: string | null
  checkInTime?: string | null
  checkOutTime?: string | null
  status?: string | null
  sourcePlatform?: string | null
}

export type PropertyTaskAssignmentLite = {
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

export type PropertyTaskLite = {
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

export type PropertyIssueLite = {
  id: string
  title: string
  description?: string | null
  severity: string
  status: string
  createdAt?: string | null
  updatedAt?: string | null
}

export type PropertySupplyLite = {
  id: string
  currentStock?: number | null
  stateMode?: string | null
  mediumThreshold?: number | null
  fullThreshold?: number | null
  targetLevel?: number | null
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

export type PropertyDetail = {
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

export type PropertyFormState = {
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

export type TaskModalState = {
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

// ─── Derived shapes ───────────────────────────────────────────────────────────

export type WorkWindow = {
  key: string
  booking: PropertyBookingLite
  nextBooking: PropertyBookingLite | null
  startAt: Date
  endAt: Date | null
  linkedTask: PropertyTaskLite | null
}

export type SupplyRow = PropertySupplyLite & {
  displayName: string
  state: SupplyState
  updateKey: string | null
}

export type DayEntry = {
  key: string
  date: Date
  isToday: boolean
  isCurrentMonth: boolean
  occupancyKind: OccupancyKind
  arrivals: PropertyBookingLite[]
  departures: PropertyBookingLite[]
  stays: PropertyBookingLite[]
  activeBookings: PropertyBookingLite[]
  scheduledTasks: PropertyTaskLite[]
  workWindow: WorkWindow | null
  taskForCalendar: PropertyTaskLite | null
  issueRecords: PropertyIssueLite[]
  supplyRecords: SupplyRow[]
}

export type HourRow = {
  hour: number
  label: string
  arrivals: PropertyBookingLite[]
  departures: PropertyBookingLite[]
  activeStays: PropertyBookingLite[]
  tasks: PropertyTaskLite[]
}

// ─── Translations ─────────────────────────────────────────────────────────────

export const translations = {
  el: {
    loading: "Φόρτωση ακινήτου...",
    loadError: "Δεν ήταν δυνατή η φόρτωση του ακινήτου.",
    noData: "Δεν υπάρχουν διαθέσιμα δεδομένα ακινήτου.",
    calendarView: "Ημερολόγιο ακινήτου",
    managementView: "Διαχείριση ακινήτου",
    calendarViewHint:
      "Ημερολογιακή εικόνα readiness με καθαρές αφίξεις, αναχωρήσεις, εργασία, ζημιές και αναλώσιμα.",
    managementViewHint:
      "Κεντρικές ενέργειες για στοιχεία ακινήτου, συνεργάτη και λίστες.",
    month: "Μήνας",
    week: "Εβδομάδα",
    day: "Ημέρα",
    previous: "Προηγούμενο",
    today: "Σήμερα",
    next: "Επόμενο",
    createTask: "Δημιουργία εργασίας",
    openTask: "Προβολή εργασίας",
    editTask: "Επεξεργασία εργασίας",
    deleteTask: "Διαγραφή εργασίας",
    occupancy: "Φιλοξενία",
    tasks: "Εργασία",
    supplies: "Αναλώσιμα",
    issues: "Ζημιές / βλάβες",
    selectedDay: "Εικόνα ημέρας",
    arrivalsTitle: "Αφίξεις",
    departuresTitle: "Αναχωρήσεις",
    staysTitle: "Διαμονές",
    dayTimelineTitle: "Προβολή ημέρας ανά ώρα",
    taskPanelTitle: "Εργασία ημέρας",
    suppliesPanelTitle: "Αναλώσιμα που υποβλήθηκαν αυτή την ημέρα",
    issuesPanelTitle: "Ζημιές / βλάβες που καταγράφηκαν αυτή την ημέρα",
    noArrivals: "Δεν υπάρχουν αφίξεις.",
    noDepartures: "Δεν υπάρχουν αναχωρήσεις.",
    noStays: "Δεν υπάρχουν ενεργές διαμονές.",
    noTimelineItems: "Δεν υπάρχουν καταχωρήσεις για αυτή την ώρα.",
    noWorkWindow: "Δεν υπάρχει ενεργό παράθυρο εργασίας για αυτή την ημέρα.",
    workWindowLabel: "Παράθυρο",
    noTaskForDay: "Δεν έχει δημιουργηθεί εργασία για αυτό το παράθυρο.",
    noSuppliesForDay: "Δεν υποβλήθηκαν αναλώσιμα αυτή την ημέρα.",
    noIssuesForDay: "Δεν υποβλήθηκαν ζημιές ή βλάβες αυτή την ημέρα.",
    noPartner: "Χωρίς συνεργάτη",
    unnamedGuest: "Χωρίς όνομα",
    propertySaved: "Τα στοιχεία ακινήτου αποθηκεύτηκαν.",
    partnerSaved: "Ο προεπιλεγμένος συνεργάτης αποθηκεύτηκε.",
    taskSaved: "Η εργασία αποθηκεύτηκε.",
    taskDeleted: "Η εργασία διαγράφηκε.",
    saveError: "Δεν ήταν δυνατή η αποθήκευση.",
    deleteError: "Δεν ήταν δυνατή η διαγραφή της εργασίας.",
    deleteConfirm: "Θέλεις σίγουρα να διαγράψεις αυτή την εργασία;",
    propertyDetailsTitle: "Στοιχεία ακινήτου",
    partnerTitle: "Προεπιλεγμένος συνεργάτης",
    taskModalTitle: "Εργασία",
    choosePartner: "Επιλογή συνεργάτη",
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
    alertEnabled: "Ενεργοποίηση alert",
    alertAt: "Χρόνος alert",
    taskTitleLabel: "Τύπος / τίτλος εργασίας",
    save: "Αποθήκευση",
    cancel: "Κλείσιμο",
    lists: "Λίστες ακινήτου",
    editProperty: "Στοιχεία ακινήτου",
    editPartner: "Συνεργάτης",
    editListsHint:
      "Μετάβαση στις λίστες ακινήτου που χρησιμοποιούνται στη ροή readiness.",
    editPropertyHint:
      "Ενημέρωση βασικών στοιχείων ακινήτου χωρίς έξοδο από τη σελίδα.",
    editPartnerHint:
      "Ορισμός ή αλλαγή προεπιλεγμένου συνεργάτη για το ακίνητο.",
    managementTitle: "Κεντρική διαχείριση ακινήτου",
    managementSubtitle:
      "Οι βασικές ενέργειες παραμένουν συγκεντρωμένες εδώ, ενώ η επιχειρησιακή εικόνα δίνεται στο ημερολόγιο.",
    hour: "Ώρα",
    issueDetailTitle: "Απαντήσεις ζημιών / βλαβών",
    supplyDetailTitle: "Απαντήσεις αναλωσίμων",
    taskStatus: {
      new: "Νέα",
      pending: "Σε αναμονή",
      assigned: "Ανατεθειμένη",
      waiting_acceptance: "Προς αποδοχή",
      accepted: "Αποδεκτή",
      in_progress: "Σε εξέλιξη",
      completed: "Ολοκληρωμένη",
      cancelled: "Ακυρωμένη",
    },
    issueStatus: {
      open: "Ανοιχτό",
      in_progress: "Σε εξέλιξη",
      resolved: "Επιλυμένο",
      closed: "Κλειστό",
    },
    supplyState: {
      missing: "Έλλειψη",
      medium: "Μέτρια",
      full: "Πλήρης",
    },
    occupancyHint: {
      arrival: "Άφιξη την ημέρα αυτή",
      departure: "Αναχώρηση την ημέρα αυτή",
      turnover: "Άφιξη και αναχώρηση την ίδια ημέρα",
      stay: "Ενεργή διαμονή",
    },
    bookingArrival: "Άφιξη",
    bookingStay: "Διαμονή",
    bookingDeparture: "Αναχώρηση",
    timelineArrival: "Άφιξη",
    timelineStay: "Διαμονή",
    timelineDeparture: "Αναχώρηση",
    timelineTask: "Εργασία",
    viewDay: "Προβολή ημέρας",
    filterAll: "Όλα",
    filterBookings: "Κρατήσεις",
    filterTasks: "Εργασίες",
    filterSupplies: "Αναλώσιμα",
    filterIssues: "Βλάβες / Ζημιές",
    weekdays: ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"],
  },
  en: {
    loading: "Loading property...",
    loadError: "The property could not be loaded.",
    noData: "No property data are available.",
    calendarView: "Property calendar",
    managementView: "Property management",
    calendarViewHint:
      "Calendar-first readiness view with clear arrivals, departures, task, issues and supplies.",
    managementViewHint:
      "Core actions for property details, partner and lists.",
    month: "Month",
    week: "Week",
    day: "Day",
    previous: "Previous",
    today: "Today",
    next: "Next",
    createTask: "Create task",
    openTask: "Open task",
    editTask: "Edit task",
    deleteTask: "Delete task",
    occupancy: "Hosting",
    tasks: "Task",
    supplies: "Supplies",
    issues: "Issues / damages",
    selectedDay: "Day view",
    arrivalsTitle: "Arrivals",
    departuresTitle: "Departures",
    staysTitle: "Stays",
    dayTimelineTitle: "Day timeline by hour",
    taskPanelTitle: "Task for this day",
    suppliesPanelTitle: "Supplies submitted on this day",
    issuesPanelTitle: "Issues / damages submitted on this day",
    noArrivals: "No arrivals.",
    noDepartures: "No departures.",
    noStays: "No active stays.",
    noTimelineItems: "No entries for this hour.",
    noWorkWindow: "There is no active work window for this day.",
    workWindowLabel: "Window",
    noTaskForDay: "No task has been created for this window.",
    noSuppliesForDay: "No supplies were submitted on this day.",
    noIssuesForDay: "No issues or damages were submitted on this day.",
    noPartner: "No partner",
    unnamedGuest: "Unnamed guest",
    propertySaved: "Property details were saved.",
    partnerSaved: "Default partner was saved.",
    taskSaved: "Task was saved.",
    taskDeleted: "Task was deleted.",
    saveError: "The changes could not be saved.",
    deleteError: "The task could not be deleted.",
    deleteConfirm: "Are you sure you want to delete this task?",
    propertyDetailsTitle: "Property details",
    partnerTitle: "Default partner",
    taskModalTitle: "Task",
    choosePartner: "Choose partner",
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
    alertEnabled: "Enable alert",
    alertAt: "Alert time",
    taskTitleLabel: "Task type / title",
    save: "Save",
    cancel: "Close",
    lists: "Property lists",
    editProperty: "Property details",
    editPartner: "Partner",
    editListsHint: "Open the property lists used in the readiness flow.",
    editPropertyHint: "Update core property fields without leaving this page.",
    editPartnerHint: "Set or change the default partner for this property.",
    managementTitle: "Property management center",
    managementSubtitle:
      "Core actions stay here, while the operational picture is shown in the calendar.",
    hour: "Hour",
    issueDetailTitle: "Issue / damage answers",
    supplyDetailTitle: "Supply answers",
    taskStatus: {
      new: "New",
      pending: "Pending",
      assigned: "Assigned",
      waiting_acceptance: "Waiting acceptance",
      accepted: "Accepted",
      in_progress: "In progress",
      completed: "Completed",
      cancelled: "Cancelled",
    },
    issueStatus: {
      open: "Open",
      in_progress: "In progress",
      resolved: "Resolved",
      closed: "Closed",
    },
    supplyState: {
      missing: "Missing",
      medium: "Medium",
      full: "Full",
    },
    occupancyHint: {
      arrival: "Arrival on this day",
      departure: "Departure on this day",
      turnover: "Arrival and departure on the same day",
      stay: "Active stay",
    },
    bookingArrival: "Arrival",
    bookingStay: "Stay",
    bookingDeparture: "Departure",
    timelineArrival: "Arrival",
    timelineStay: "Stay",
    timelineDeparture: "Departure",
    timelineTask: "Task",
    viewDay: "Day view",
    filterAll: "All",
    filterBookings: "Bookings",
    filterTasks: "Tasks",
    filterSupplies: "Supplies",
    filterIssues: "Issues / Damages",
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
} satisfies Record<Language, Record<string, any>>

// ─── Constants ────────────────────────────────────────────────────────────────

export const TASK_TITLE_OPTIONS: TaskTitleKey[] = [
  "cleaning",
  "inspection",
  "repair",
  "damage",
  "supplies",
  "photos",
]

// ─── Utility functions ────────────────────────────────────────────────────────

export function safeArray<T>(value?: T[] | null): T[] {
  return Array.isArray(value) ? value : []
}

export function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function formatLocalDateKey(date: Date) {
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function normalizeDateOnly(value?: string | Date | null) {
  if (!value) return null

  if (value instanceof Date) {
    return formatLocalDateKey(value)
  }

  const text = String(value).trim()
  if (!text) return null

  const dateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`
  }

  const date = new Date(text)
  return formatLocalDateKey(date)
}

export function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function addMonths(date: Date, amount: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + amount)
  return next
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function startOfWeek(date: Date) {
  const base = startOfDay(date)
  const jsDay = base.getDay()
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay
  return addDays(base, mondayOffset)
}

export function getMonthGridStart(date: Date) {
  return startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1))
}

export function buildVisibleDates(anchorDate: Date, granularity: CalendarGranularity) {
  if (granularity === "day") {
    return [startOfDay(anchorDate)]
  }

  if (granularity === "week") {
    const weekStart = startOfWeek(anchorDate)
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  }

  const gridStart = getMonthGridStart(anchorDate)
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatMonthTitle(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date)
}

export function formatFullDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

export function formatShortDate(value?: string | null, locale = "el-GR") {
  const date = normalizeDate(value)
  if (!date) return "—"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export function formatTime(value?: string | null) {
  const text = String(value || "").trim()
  if (!text) return "—"
  return text.slice(0, 5)
}

export function formatDateTime(date: Date | null, locale: string) {
  if (!date) return "—"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function combineDateAndTime(
  dateValue?: string | null,
  timeValue?: string | null
) {
  const dateText = normalizeDateOnly(dateValue)
  if (!dateText) return null
  const timeText = String(timeValue || "00:00").slice(0, 5)
  const combined = new Date(`${dateText}T${timeText}:00`)
  return Number.isNaN(combined.getTime()) ? null : combined
}

export function toDateTimeLocalValue(date: Date | null) {
  if (!date) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

export function buildPropertyFormState(property: PropertyDetail): PropertyFormState {
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

export function getTaskTitleOptions(language: Language) {
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

// ─── Normalizers (local — lowercase, not the i18n normalizers) ────────────────

export function normalizeTaskStatus(status?: string | null) {
  return String(status || "").trim().toLowerCase()
}

export function normalizeIssueStatus(status?: string | null) {
  return String(status || "").trim().toLowerCase()
}

export function normalizeIssueSeverity(value?: string | null) {
  return String(value || "").trim().toLowerCase()
}

// ─── Label helpers ────────────────────────────────────────────────────────────

export function getTaskStatusLabel(language: Language, status?: string | null) {
  const key = normalizeTaskStatus(status) as keyof (typeof translations)[Language]["taskStatus"]
  return translations[language].taskStatus[key] || status || "—"
}

export function getIssueStatusLabel(language: Language, status?: string | null) {
  const key = normalizeIssueStatus(status) as keyof (typeof translations)[Language]["issueStatus"]
  return translations[language].issueStatus[key] || status || "—"
}

export function getSupplyStateLabel(language: Language, state: SupplyState) {
  return translations[language].supplyState[state]
}

// ─── Task helpers ─────────────────────────────────────────────────────────────

export function getLatestAssignment(task: PropertyTaskLite) {
  return safeArray(task.assignments)[0] || null
}

export function getTaskTone(task: PropertyTaskLite): Tone {
  const normalized = normalizeTaskStatus(task.status)

  if (task.alertEnabled && task.alertAt) {
    const alertAt = normalizeDate(task.alertAt)
    if (alertAt && alertAt.getTime() <= Date.now()) return "red"
  }

  if (normalized === "completed") return "emerald"
  if (normalized === "in_progress") return "sky"
  if (normalized === "accepted") return "sky"
  if (normalized === "assigned" || normalized === "waiting_acceptance") return "amber"
  if (normalized === "cancelled") return "slate"
  return "amber"
}

export function getTaskActionInstruction(task: PropertyTaskLite, language: Language) {
  const normalized = normalizeTaskStatus(task.status)

  if (task.alertEnabled && task.alertAt) {
    const alertAt = normalizeDate(task.alertAt)
    if (alertAt && alertAt.getTime() <= Date.now()) {
      return language === "en"
        ? "Immediate action needed. Open the day and correct the execution plan now."
        : "Απαιτείται άμεση ενέργεια. Άνοιξε την ημέρα και διόρθωσε τώρα το πλάνο εκτέλεσης."
    }
  }

  if (normalized === "in_progress") {
    return language === "en"
      ? "Execution is running. Review progress and close only when the work is actually done."
      : "Η εκτέλεση τρέχει. Έλεγξε την πρόοδο και κλείσε μόνο όταν η εργασία έχει όντως τελειώσει."
  }

  if (normalized === "accepted") {
    return language === "en"
      ? "The partner has accepted the task. Next step is execution tracking."
      : "Ο συνεργάτης έχει αποδεχθεί την εργασία. Επόμενο βήμα είναι η παρακολούθηση της εκτέλεσης."
  }

  if (normalized === "assigned" || normalized === "waiting_acceptance") {
    return language === "en"
      ? "Waiting for partner response. Check whether acceptance or reassignment is needed."
      : "Αναμένει απάντηση συνεργάτη. Έλεγξε αν χρειάζεται αποδοχή ή νέα ανάθεση."
  }

  if (normalized === "completed") {
    return language === "en"
      ? "The task is completed. Open the task and review the final proof."
      : "Η εργασία είναι ολοκληρωμένη. Άνοιξε την εργασία και έλεγξε το τελικό αποδεικτικό υλικό."
  }

  return language === "en"
    ? "Task exists but still needs scheduling attention. Open the day and continue management."
    : "Η εργασία υπάρχει αλλά θέλει ακόμη διαχείριση προγραμματισμού. Άνοιξε την ημέρα και συνέχισε τη διαχείριση."
}

// ─── Booking helpers ──────────────────────────────────────────────────────────

export function isBookingCancelled(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase()
  return normalized === "cancelled" || normalized === "canceled"
}

// ─── Issue helpers ────────────────────────────────────────────────────────────

export function isOpenIssue(issue: PropertyIssueLite) {
  const normalized = normalizeIssueStatus(issue.status)
  return normalized === "open" || normalized === "in_progress"
}

// ─── Supply helpers ───────────────────────────────────────────────────────────

export function getSupplyState(supply: PropertySupplyLite): SupplyState {
  const canonical = buildCanonicalSupplySnapshot({
    isActive: true,
    stateMode: supply.stateMode,
    fillLevel: supply.derivedState,
    currentStock: supply.currentStock,
    mediumThreshold: supply.mediumThreshold,
    fullThreshold: supply.fullThreshold,
    minimumThreshold: supply.minimumThreshold,
    reorderThreshold: supply.reorderThreshold,
    targetLevel: supply.targetLevel,
    targetStock: supply.targetStock,
    supplyMinimumStock: supply.supplyItem?.minimumStock,
  })

  if (canonical.derivedState === "missing") return "missing"
  if (canonical.derivedState === "medium") return "medium"
  return "full"
}

export function buildSupplyRows(
  language: Language,
  property: PropertyDetail | null
): SupplyRow[] {
  return safeArray(property?.propertySupplies).map((supply) => ({
    ...supply,
    state: getSupplyState(supply),
    updateKey: normalizeDateOnly(supply.lastUpdatedAt || supply.updatedAt),
    displayName: getSupplyDisplayName(language, {
      code: supply.supplyItem?.code,
      fallbackName:
        supply.supplyItem?.nameEn ||
        supply.supplyItem?.nameEl ||
        supply.supplyItem?.name ||
        supply.id,
    }),
  }))
}

// ─── Work window helpers ──────────────────────────────────────────────────────

export function buildWorkWindows(
  bookings: PropertyBookingLite[],
  tasks: PropertyTaskLite[]
): WorkWindow[] {
  const activeBookings = safeArray(bookings)
    .filter((booking) => !isBookingCancelled(booking.status))
    .filter((booking) => Boolean(booking.id && booking.checkOutDate))
    .sort((a, b) => {
      const aDate = combineDateAndTime(a.checkOutDate, a.checkOutTime)
      const bDate = combineDateAndTime(b.checkOutDate, b.checkOutTime)
      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1
      return aDate.getTime() - bDate.getTime()
    })

  return activeBookings
    .map((booking, index) => {
      const startAt = combineDateAndTime(booking.checkOutDate, booking.checkOutTime)
      if (!startAt) return null

      const nextBooking = activeBookings[index + 1] || null
      const endAt = nextBooking
        ? combineDateAndTime(nextBooking.checkInDate, nextBooking.checkInTime)
        : null

      const linkedTask =
        tasks.find((task) => task.booking?.id === booking.id) ||
        tasks.find((task) => {
          const scheduledAt = combineDateAndTime(
            task.scheduledDate,
            task.scheduledStartTime
          )
          if (!scheduledAt) return false
          if (scheduledAt.getTime() < startAt.getTime()) return false
          if (endAt && scheduledAt.getTime() > endAt.getTime()) return false
          return true
        }) ||
        null

      return {
        key: `${booking.id}-${nextBooking?.id || "open"}`,
        booking,
        nextBooking,
        startAt,
        endAt,
        linkedTask,
      } satisfies WorkWindow
    })
    .filter(Boolean) as WorkWindow[]
}

export function workWindowTouchesDay(window: WorkWindow, day: Date) {
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)

  if (window.endAt) {
    return (
      window.startAt.getTime() <= dayEnd.getTime() &&
      window.endAt.getTime() >= dayStart.getTime()
    )
  }

  return window.startAt.getTime() <= dayEnd.getTime()
}

export function getWorkWindowForDay(windows: WorkWindow[], day: Date) {
  return windows.find((window) => workWindowTouchesDay(window, day)) || null
}

// ─── Booking-for-day helpers ──────────────────────────────────────────────────

export function getBookingsForDay(
  bookings: PropertyBookingLite[],
  dayKey: string
) {
  return safeArray(bookings).filter((booking) => {
    if (isBookingCancelled(booking.status)) return false
    const checkIn = normalizeDateOnly(booking.checkInDate)
    const checkOut = normalizeDateOnly(booking.checkOutDate)
    if (!checkIn || !checkOut) return false
    return checkIn <= dayKey && checkOut >= dayKey
  })
}

export function getOccupancyKind(
  bookings: PropertyBookingLite[],
  dayKey: string
): OccupancyKind {
  if (bookings.length === 0) return "vacant"

  const hasArrival = bookings.some(
    (booking) => normalizeDateOnly(booking.checkInDate) === dayKey
  )
  const hasDeparture = bookings.some(
    (booking) => normalizeDateOnly(booking.checkOutDate) === dayKey
  )

  if (hasArrival && hasDeparture) return "turnover"
  if (hasArrival) return "arrival"
  if (hasDeparture) return "departure"
  return "stay"
}

export function getBookingDayKind(
  booking: PropertyBookingLite,
  dayKey: string
): OccupancyKind {
  const isArrival = normalizeDateOnly(booking.checkInDate) === dayKey
  const isDeparture = normalizeDateOnly(booking.checkOutDate) === dayKey
  if (isArrival && isDeparture) return "turnover"
  if (isArrival) return "arrival"
  if (isDeparture) return "departure"
  return "stay"
}

export function getBookingDayLabel(
  t: (typeof translations)[Language],
  kind: OccupancyKind
): string {
  if (kind === "arrival") return t.bookingArrival
  if (kind === "departure") return t.bookingDeparture
  if (kind === "turnover") return `${t.bookingArrival} / ${t.bookingDeparture}`
  return t.bookingStay
}

// ─── Tone helpers ─────────────────────────────────────────────────────────────

export function getToneClasses(tone: Tone) {
  if (tone === "sky") {
    return { soft: "border-sky-200 bg-sky-50 text-sky-700", fill: "bg-sky-500" }
  }
  if (tone === "amber") {
    return { soft: "border-amber-200 bg-amber-50 text-amber-700", fill: "bg-amber-500" }
  }
  if (tone === "emerald") {
    return { soft: "border-emerald-200 bg-emerald-50 text-emerald-700", fill: "bg-emerald-500" }
  }
  if (tone === "red") {
    return { soft: "border-red-200 bg-red-50 text-red-700", fill: "bg-red-500" }
  }
  return { soft: "border-slate-200 bg-slate-50 text-slate-700", fill: "bg-slate-500" }
}

export function getOccupancyTone(kind: OccupancyKind): Tone {
  if (kind === "arrival") return "sky"
  if (kind === "departure") return "amber"
  if (kind === "turnover") return "amber"
  if (kind === "stay") return "emerald"
  return "slate"
}

export function getIssuesTone(issues: PropertyIssueLite[]): Tone {
  const hasCritical = issues.some((issue) => {
    const severity = normalizeIssueSeverity(issue.severity)
    return severity === "critical" || severity === "high" || severity === "urgent"
  })
  return hasCritical ? "red" : "amber"
}

export function getSuppliesTone(rows: SupplyRow[]): Tone {
  if (rows.some((row) => row.state === "missing")) return "red"
  if (rows.some((row) => row.state === "medium")) return "amber"
  return "emerald"
}

// ─── Tooltip builders ─────────────────────────────────────────────────────────

export function buildOccupancyTooltip(
  language: Language,
  locale: string,
  kind: OccupancyKind,
  bookings: PropertyBookingLite[]
) {
  if (kind === "vacant") return ""

  const t = translations[language]
  const header = t.occupancyHint[kind as Exclude<OccupancyKind, "vacant">]

  const lines = bookings.map((booking) => {
    const guest = booking.guestName || t.unnamedGuest
    return `${guest}\n${formatShortDate(booking.checkInDate, locale)} ${formatTime(
      booking.checkInTime
    )} → ${formatShortDate(booking.checkOutDate, locale)} ${formatTime(
      booking.checkOutTime
    )}`
  })

  return [header, ...lines].join("\n\n")
}

export function buildTaskTooltip(
  language: Language,
  locale: string,
  task: PropertyTaskLite
) {
  const latestAssignment = getLatestAssignment(task)
  const partnerName =
    latestAssignment?.partner?.name || translations[language].noPartner
  const title = task.title || translations[language].taskTitleLabel

  return [
    title,
    `${translations[language].status}: ${getTaskStatusLabel(language, task.status)}`,
    `${translations[language].date}: ${formatShortDate(task.scheduledDate, locale)}`,
    `${translations[language].startTime}: ${formatTime(task.scheduledStartTime)}`,
    `${translations[language].endTime}: ${formatTime(task.scheduledEndTime)}`,
    `${translations[language].editPartner}: ${partnerName}`,
    getTaskActionInstruction(task, language),
  ].join("\n")
}

export function buildIssueTooltip(
  language: Language,
  issues: PropertyIssueLite[]
) {
  return issues
    .map((issue) => {
      const severity = normalizeIssueSeverity(issue.severity)
      const severityText = severity ? severity.toUpperCase() : "—"
      return [
        issue.title || translations[language].issues,
        `${getIssueStatusLabel(language, issue.status)} • ${severityText}`,
        issue.description?.trim() || "—",
      ].join("\n")
    })
    .join("\n\n")
}

export function buildSupplyTooltip(language: Language, rows: SupplyRow[]) {
  return rows
    .map((row) => {
      return [
        row.displayName,
        `${translations[language].supplyState[row.state]} • ${row.currentStock ?? 0}`,
      ].join("\n")
    })
    .join("\n\n")
}

// ─── Day entry builder ────────────────────────────────────────────────────────

export function buildDayEntry(params: {
  date: Date
  anchorDate: Date
  property: PropertyDetail
  supplyRows: SupplyRow[]
  windows: WorkWindow[]
}): DayEntry {
  const dayKey = normalizeDateOnly(params.date) || ""
  const activeBookings = getBookingsForDay(params.property.bookings || [], dayKey)
  const arrivals = activeBookings.filter(
    (booking) => normalizeDateOnly(booking.checkInDate) === dayKey
  )
  const departures = activeBookings.filter(
    (booking) => normalizeDateOnly(booking.checkOutDate) === dayKey
  )
  const stays = activeBookings.filter(
    (booking) =>
      normalizeDateOnly(booking.checkInDate) !== dayKey &&
      normalizeDateOnly(booking.checkOutDate) !== dayKey
  )

  const scheduledTasks = safeArray(params.property.tasks).filter(
    (task) => normalizeDateOnly(task.scheduledDate) === dayKey
  )

  const workWindow = getWorkWindowForDay(params.windows, params.date)
  // Εργασία εμφανίζεται ΜΟΝΟ την ημέρα που έχει προγραμματιστεί (scheduledDate)
  const taskForCalendar = scheduledTasks[0] || null

  const issueRecords = safeArray(params.property.issues).filter((issue) => {
    if (!isOpenIssue(issue)) return false
    const issueKey = normalizeDateOnly(issue.createdAt || issue.updatedAt)
    return issueKey === dayKey
  })

  const supplyRecords = params.supplyRows.filter((row) => row.updateKey === dayKey)

  return {
    key: dayKey,
    date: params.date,
    isToday: sameDay(params.date, new Date()),
    isCurrentMonth: params.date.getMonth() === params.anchorDate.getMonth(),
    occupancyKind: getOccupancyKind(activeBookings, dayKey),
    arrivals,
    departures,
    stays,
    activeBookings,
    scheduledTasks,
    workWindow,
    taskForCalendar,
    issueRecords,
    supplyRecords,
  }
}

// ─── Hour row builder ─────────────────────────────────────────────────────────

export function buildHourRows(entry: DayEntry): HourRow[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const label = `${String(hour).padStart(2, "0")}:00`

    const arrivals = entry.arrivals.filter((booking) => {
      const time = formatTime(booking.checkInTime)
      return time !== "—" && Number(time.slice(0, 2)) === hour
    })

    const departures = entry.departures.filter((booking) => {
      const time = formatTime(booking.checkOutTime)
      return time !== "—" && Number(time.slice(0, 2)) === hour
    })

    const activeStays = entry.activeBookings.filter((booking) => {
      const start = combineDateAndTime(entry.key, booking.checkInTime || "00:00")
      const end = combineDateAndTime(entry.key, booking.checkOutTime || "23:59")
      if (!start || !end) return false
      return start.getHours() <= hour && end.getHours() >= hour
    })

    const tasks = entry.scheduledTasks.filter((task) => {
      const time = formatTime(task.scheduledStartTime)
      return time !== "—" && Number(time.slice(0, 2)) === hour
    })

    return {
      hour,
      label,
      arrivals,
      departures,
      activeStays,
      tasks,
    }
  })
}
