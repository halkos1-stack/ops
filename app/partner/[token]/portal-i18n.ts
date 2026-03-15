export type PortalLanguage = "el" | "en"

export function normalizePortalLanguage(value: string | null | undefined): PortalLanguage {
  return value === "en" ? "en" : "el"
}

export const portalDictionary = {
  el: {
    languageLabel: "Γλώσσα",
    greek: "Ελληνικά",
    english: "English",

    partnerArea: "Περιοχή συνεργάτη",
    home: "Αρχική",
    schedule: "Πρόγραμμα",
    calendar: "Ημερολόγιο",
    openTask: "Άνοιγμα εργασίας",
    back: "Επιστροφή",

    loadingPortal: "Φόρτωση περιοχής συνεργάτη...",
    loadingSchedule: "Φόρτωση προγράμματος...",
    loadingCalendar: "Φόρτωση ημερολογίου...",

    portalLoadErrorTitle: "Δεν φορτώθηκε η περιοχή συνεργάτη",
    scheduleTitle: "Πρόγραμμα εργασιών",
    scheduleSubtitle: "Λίστα εργασιών ομαδοποιημένη ανά ημέρα.",
    calendarTitle: "Κανονικό ημερολόγιο",
    calendarSubtitle: "Μηνιαία απεικόνιση εργασιών συνεργάτη.",

    totalAssignments: "Σύνολο αναθέσεων",
    pendingAcceptance: "Προς αποδοχή",
    accepted: "Αποδεκτές",
    inProgress: "Σε εξέλιξη",
    completedToday: "Ολοκληρωμένες σήμερα",

    urgentAction: "Άμεση δράση",
    urgentActionSubtitle: "Οι εργασίες που θέλουν ενέργεια τώρα.",
    noUrgentItems: "Δεν υπάρχουν άμεσες εκκρεμότητες αυτή τη στιγμή.",

    noScheduleItems: "Δεν υπάρχουν εργασίες στο πρόγραμμα.",
    noCalendarItems: "Δεν υπάρχουν εργασίες αυτόν τον μήνα.",
    noDate: "Χωρίς ημερομηνία",
    noTime: "Χωρίς ώρα",

    today: "Σήμερα",
    previousMonth: "Προηγούμενος μήνας",
    nextMonth: "Επόμενος μήνας",
    tasksCount_one: "1 εργασία",
    tasksCount_many: "{count} εργασίες",

    status_assigned: "Προς αποδοχή",
    status_accepted: "Αποδεκτή",
    status_rejected: "Απορρίφθηκε",
    status_in_progress: "Σε εξέλιξη",
    status_completed: "Ολοκληρωμένη",
    status_cancelled: "Ακυρωμένη",
    status_pending: "Σε αναμονή",

    programHeading: "Πρόγραμμα",
    monthHeading: "Μήνας",
  },
  en: {
    languageLabel: "Language",
    greek: "Ελληνικά",
    english: "English",

    partnerArea: "Partner area",
    home: "Home",
    schedule: "Schedule",
    calendar: "Calendar",
    openTask: "Open task",
    back: "Back",

    loadingPortal: "Loading partner area...",
    loadingSchedule: "Loading schedule...",
    loadingCalendar: "Loading calendar...",

    portalLoadErrorTitle: "Partner area could not be loaded",
    scheduleTitle: "Work schedule",
    scheduleSubtitle: "Task list grouped by day.",
    calendarTitle: "Calendar",
    calendarSubtitle: "Monthly task calendar for the partner.",

    totalAssignments: "Total assignments",
    pendingAcceptance: "Pending acceptance",
    accepted: "Accepted",
    inProgress: "In progress",
    completedToday: "Completed today",

    urgentAction: "Immediate action",
    urgentActionSubtitle: "Tasks that need action now.",
    noUrgentItems: "There are no urgent items right now.",

    noScheduleItems: "There are no tasks in the schedule.",
    noCalendarItems: "There are no tasks this month.",
    noDate: "No date",
    noTime: "No time",

    today: "Today",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    tasksCount_one: "1 task",
    tasksCount_many: "{count} tasks",

    status_assigned: "Pending acceptance",
    status_accepted: "Accepted",
    status_rejected: "Rejected",
    status_in_progress: "In progress",
    status_completed: "Completed",
    status_cancelled: "Cancelled",
    status_pending: "Pending",

    programHeading: "Schedule",
    monthHeading: "Month",
  },
} as const

export function getPortalTexts(language: PortalLanguage) {
  return portalDictionary[language]
}

export function getPortalStatusLabel(language: PortalLanguage, status?: string | null) {
  const value = String(status || "").trim().toLowerCase()

  const t = portalDictionary[language]

  switch (value) {
    case "assigned":
      return t.status_assigned
    case "accepted":
      return t.status_accepted
    case "rejected":
      return t.status_rejected
    case "in_progress":
      return t.status_in_progress
    case "completed":
      return t.status_completed
    case "cancelled":
      return t.status_cancelled
    case "pending":
      return t.status_pending
    default:
      return status || "—"
  }
}

export function buildPartnerPortalUrl(
  token: string,
  path = "",
  language: PortalLanguage = "el"
) {
  const safePath = path.startsWith("/") ? path : `/${path}`
  return `/partner/${token}${safePath}?lang=${language}`
}