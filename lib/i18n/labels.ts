import { AppLanguage } from "@/components/i18n/LanguageProvider"
import {
  NormalizedActorType,
  NormalizedAssignmentStatus,
  NormalizedBookingOpsStatus,
  NormalizedBookingStatus,
  NormalizedChecklistKind,
  NormalizedChecklistStatus,
  NormalizedIssuePriority,
  NormalizedIssueStatus,
  NormalizedIssueType,
  NormalizedPartnerStatus,
  NormalizedPriority,
  NormalizedPropertyStatus,
  NormalizedReadinessStatus,
  NormalizedSupplyLevel,
  NormalizedTaskStatus,
  NormalizedTaskType,
  NormalizedTrackingMode,
  detectChecklistKind,
  normalizeActorType,
  normalizeAssignmentStatus,
  normalizeBookingOpsStatus,
  normalizeBookingStatus,
  normalizeChecklistStatus,
  normalizeChecklistTitle,
  normalizeIssuePriority,
  normalizeIssueStatus,
  normalizeIssueType,
  normalizePartnerStatus,
  normalizePriority,
  normalizePropertyStatus,
  normalizeReadinessStatus,
  normalizeSupplyLevel,
  normalizeTaskStatus,
  normalizeTaskType,
  normalizeTrackingMode,
} from "@/lib/i18n/normalizers"

function unknownLabel(language: AppLanguage) {
  return language === "en" ? "Unknown value" : "Άγνωστη τιμή"
}

export function getTaskTypeLabel(language: AppLanguage, value: unknown) {
  const normalized = normalizeTaskType(value)

  const labels: Record<NormalizedTaskType, string> =
    language === "en"
      ? {
          CLEANING: "Cleaning",
          INSPECTION: "Inspection",
          MAINTENANCE: "Maintenance",
          SUPPLIES: "Supplies",
          CUSTOM: "Other task",
          UNKNOWN: "Unknown task type",
        }
      : {
          CLEANING: "Καθαρισμός",
          INSPECTION: "Επιθεώρηση",
          MAINTENANCE: "Τεχνική εργασία",
          SUPPLIES: "Αναλώσιμα",
          CUSTOM: "Άλλη εργασία",
          UNKNOWN: "Άγνωστος τύπος εργασίας",
        }

  return labels[normalized]
}

export function getTaskStatusLabel(language: AppLanguage, value: unknown) {
  const normalized = normalizeTaskStatus(value)

  const labels: Record<NormalizedTaskStatus, string> =
    language === "en"
      ? {
          NEW: "New",
          PENDING: "Pending",
          ASSIGNED: "Assigned",
          WAITING_ACCEPTANCE: "Waiting acceptance",
          ACCEPTED: "Accepted",
          IN_PROGRESS: "In progress",
          COMPLETED: "Completed",
          CANCELLED: "Cancelled",
          OVERDUE: "Overdue",
          UNKNOWN: "Unknown status",
        }
      : {
          NEW: "Νέα",
          PENDING: "Εκκρεμεί",
          ASSIGNED: "Ανατέθηκε",
          WAITING_ACCEPTANCE: "Αναμονή αποδοχής",
          ACCEPTED: "Αποδεκτή",
          IN_PROGRESS: "Σε εξέλιξη",
          COMPLETED: "Ολοκληρώθηκε",
          CANCELLED: "Ακυρώθηκε",
          OVERDUE: "Εκπρόθεσμη",
          UNKNOWN: "Άγνωστη κατάσταση",
        }

  return labels[normalized]
}

export function getAssignmentStatusLabel(
  language: AppLanguage,
  value: unknown
) {
  const normalized = normalizeAssignmentStatus(value)

  const labels: Record<NormalizedAssignmentStatus, string> =
    language === "en"
      ? {
          PENDING: "Pending",
          WAITING_ACCEPTANCE: "Waiting acceptance",
          ACCEPTED: "Accepted",
          REJECTED: "Rejected",
          CANCELLED: "Cancelled",
          COMPLETED: "Completed",
          UNKNOWN: "Unknown status",
        }
      : {
          PENDING: "Εκκρεμεί",
          WAITING_ACCEPTANCE: "Αναμονή αποδοχής",
          ACCEPTED: "Αποδεκτή",
          REJECTED: "Απορρίφθηκε",
          CANCELLED: "Ακυρώθηκε",
          COMPLETED: "Ολοκληρώθηκε",
          UNKNOWN: "Άγνωστη κατάσταση",
        }

  return labels[normalized]
}

export function getChecklistStatusLabel(
  language: AppLanguage,
  value: unknown,
  options?: {
    enabled?: unknown
    submitted?: unknown
    completed?: unknown
  }
) {
  const normalized = normalizeChecklistStatus(value, options)

  const labels: Record<NormalizedChecklistStatus, string> =
    language === "en"
      ? {
          NOT_ENABLED: "Not enabled",
          NOT_SENT: "Not sent",
          PENDING: "Pending",
          NOT_SUBMITTED: "Not submitted",
          SUBMITTED: "Submitted",
          COMPLETED: "Completed",
          UNKNOWN: "Unknown status",
        }
      : {
          NOT_ENABLED: "Δεν ενεργοποιήθηκε",
          NOT_SENT: "Δεν στάλθηκε",
          PENDING: "Αναμονή",
          NOT_SUBMITTED: "Δεν υποβλήθηκε",
          SUBMITTED: "Υποβλήθηκε",
          COMPLETED: "Ολοκληρώθηκε",
          UNKNOWN: "Άγνωστη κατάσταση",
        }

  return labels[normalized]
}

export function getSupplyLevelLabel(language: AppLanguage, value: unknown) {
  const normalized = normalizeSupplyLevel(value)

  const labels: Record<NormalizedSupplyLevel, string> =
    language === "en"
      ? {
          MISSING: "Missing",
          MEDIUM: "Medium",
          FULL: "Full",
          UNKNOWN: "Unknown level",
        }
      : {
          MISSING: "Έλλειψη",
          MEDIUM: "Μέτρια",
          FULL: "Πλήρης",
          UNKNOWN: "Άγνωστο επίπεδο",
        }

  return labels[normalized]
}

export function getPriorityLabel(language: AppLanguage, value: unknown) {
  const normalized = normalizePriority(value)

  const labels: Record<NormalizedPriority, string> =
    language === "en"
      ? {
          LOW: "Low",
          NORMAL: "Normal",
          HIGH: "High",
          URGENT: "Urgent",
          UNKNOWN: "Unknown priority",
        }
      : {
          LOW: "Χαμηλή",
          NORMAL: "Κανονική",
          HIGH: "Υψηλή",
          URGENT: "Επείγουσα",
          UNKNOWN: "Άγνωστη προτεραιότητα",
        }

  return labels[normalized]
}

export function getBookingStatusLabel(language: AppLanguage, value: unknown) {
  const normalized = normalizeBookingStatus(value)

  const labels: Record<NormalizedBookingStatus, string> =
    language === "en"
      ? {
          CONFIRMED: "Confirmed",
          PENDING: "Pending",
          CANCELLED: "Cancelled",
          COMPLETED: "Completed",
          NO_SHOW: "No-show",
          UNKNOWN: "Unknown status",
        }
      : {
          CONFIRMED: "Επιβεβαιωμένη",
          PENDING: "Εκκρεμεί",
          CANCELLED: "Ακυρωμένη",
          COMPLETED: "Ολοκληρωμένη",
          NO_SHOW: "Μη εμφάνιση",
          UNKNOWN: "Άγνωστη κατάσταση",
        }

  return labels[normalized]
}

export function getBookingOpsStatusLabel(
  language: AppLanguage,
  value: unknown
) {
  const normalized = normalizeBookingOpsStatus(value)

  const labels: Record<NormalizedBookingOpsStatus, string> =
    language === "en"
      ? {
          NEEDS_MAPPING: "Needs mapping",
          PENDING_MATCH: "Pending match",
          READY_FOR_ACTION: "Ready for action",
          MAPPED: "Mapped",
          COMPLETED: "Completed",
          ERROR: "Error",
          NO_TASK: "No task",
          UNKNOWN: "Unknown status",
        }
      : {
          NEEDS_MAPPING: "Χρειάζεται αντιστοίχιση",
          PENDING_MATCH: "Αναμονή αντιστοίχισης",
          READY_FOR_ACTION: "Έτοιμη για ενέργεια",
          MAPPED: "Αντιστοιχίστηκε",
          COMPLETED: "Ολοκληρώθηκε",
          ERROR: "Σφάλμα",
          NO_TASK: "Χωρίς εργασία",
          UNKNOWN: "Άγνωστη κατάσταση",
        }

  return labels[normalized]
}

export function getIssueStatusLabel(language: AppLanguage, value: unknown) {
  const normalized = normalizeIssueStatus(value)

  const labels: Record<NormalizedIssueStatus, string> =
    language === "en"
      ? {
          OPEN: "Open",
          IN_PROGRESS: "In progress",
          RESOLVED: "Resolved",
          CLOSED: "Closed",
          CANCELLED: "Cancelled",
          UNKNOWN: "Unknown status",
        }
      : {
          OPEN: "Ανοιχτό",
          IN_PROGRESS: "Σε εξέλιξη",
          RESOLVED: "Επιλύθηκε",
          CLOSED: "Κλειστό",
          CANCELLED: "Ακυρώθηκε",
          UNKNOWN: "Άγνωστη κατάσταση",
        }

  return labels[normalized]
}

export function getIssuePriorityLabel(language: AppLanguage, value: unknown) {
  const normalized = normalizeIssuePriority(value)

  const labels: Record<NormalizedIssuePriority, string> =
    language === "en"
      ? {
          LOW: "Low",
          NORMAL: "Normal",
          HIGH: "High",
          URGENT: "Urgent",
          UNKNOWN: "Unknown priority",
        }
      : {
          LOW: "Χαμηλή",
          NORMAL: "Κανονική",
          HIGH: "Υψηλή",
          URGENT: "Επείγουσα",
          UNKNOWN: "Άγνωστη προτεραιότητα",
        }

  return labels[normalized]
}

export function getIssueTypeLabel(language: AppLanguage, value: unknown) {
  const normalized = normalizeIssueType(value)

  const labels: Record<NormalizedIssueType, string> =
    language === "en"
      ? {
          DAMAGE: "Damage",
          REPAIR: "Repair",
          SUPPLIES: "Supplies",
          INSPECTION: "Inspection",
          CLEANING: "Cleaning",
          GENERAL: "General",
          UNKNOWN: "Unknown issue type",
        }
      : {
          DAMAGE: "Ζημιά",
          REPAIR: "Βλάβη",
          SUPPLIES: "Αναλώσιμα",
          INSPECTION: "Επιθεώρηση",
          CLEANING: "Καθαριότητα",
          GENERAL: "Γενικό",
          UNKNOWN: "Άγνωστος τύπος",
        }

  return labels[normalized]
}

export function getPropertyStatusLabel(language: AppLanguage, value: unknown) {
  const normalized = normalizePropertyStatus(value)

  const labels: Record<NormalizedPropertyStatus, string> =
    language === "en"
      ? {
          ACTIVE: "Active",
          INACTIVE: "Inactive",
          UNKNOWN: "Unknown status",
        }
      : {
          ACTIVE: "Ενεργό",
          INACTIVE: "Ανενεργό",
          UNKNOWN: "Άγνωστη κατάσταση",
        }

  return labels[normalized]
}

export function getPropertyTypeLabel(
  language: AppLanguage,
  value: unknown
) {
  const raw = String(value ?? "").trim()

  if (!raw) {
    return language === "en" ? "Unknown type" : "Άγνωστος τύπος"
  }

  const normalized = raw.toLowerCase()

  if (language === "en") {
    switch (normalized) {
      case "διαμέρισμα":
      case "διαμερισμα":
      case "apartment":
        return "Apartment"
      case "βίλα":
      case "βιλα":
      case "villa":
        return "Villa"
      case "στούντιο":
      case "στουντιο":
      case "studio":
        return "Studio"
      case "μονοκατοικία":
      case "μονοκατοικια":
      case "house":
        return "House"
      case "μεζονέτα":
      case "μεζονετα":
      case "maisonette":
        return "Maisonette"
      case "loft":
        return "Loft"
      case "άλλο":
      case "αλλο":
      case "other":
        return "Other"
      default:
        return raw
    }
  }

  switch (normalized) {
    case "apartment":
    case "διαμέρισμα":
    case "διαμερισμα":
      return "Διαμέρισμα"
    case "villa":
    case "βίλα":
    case "βιλα":
      return "Βίλα"
    case "studio":
    case "στούντιο":
    case "στουντιο":
      return "Στούντιο"
    case "house":
    case "μονοκατοικία":
    case "μονοκατοικια":
      return "Μονοκατοικία"
    case "maisonette":
    case "μεζονέτα":
    case "μεζονετα":
      return "Μεζονέτα"
    case "loft":
      return "Loft"
    case "other":
    case "άλλο":
    case "αλλο":
      return "Άλλο"
    default:
      return raw
  }
}

export function getPartnerStatusLabel(language: AppLanguage, value: unknown) {
  const normalized = normalizePartnerStatus(value)

  const labels: Record<NormalizedPartnerStatus, string> =
    language === "en"
      ? {
          ACTIVE: "Active",
          INACTIVE: "Inactive",
          SUSPENDED: "Suspended",
          UNKNOWN: "Unknown status",
        }
      : {
          ACTIVE: "Ενεργός",
          INACTIVE: "Ανενεργός",
          SUSPENDED: "Σε αναστολή",
          UNKNOWN: "Άγνωστη κατάσταση",
        }

  return labels[normalized]
}

export function getActorTypeLabel(language: AppLanguage, value: unknown) {
  const normalized = normalizeActorType(value)

  const labels: Record<NormalizedActorType, string> =
    language === "en"
      ? {
          SYSTEM: "System",
          USER: "User",
          MANAGER: "Manager",
          PARTNER: "Partner",
          ADMIN: "Admin",
          UNKNOWN: "Unknown actor",
        }
      : {
          SYSTEM: "Σύστημα",
          USER: "Χρήστης",
          MANAGER: "Διαχειριστής",
          PARTNER: "Συνεργάτης",
          ADMIN: "Διαχειριστής",
          UNKNOWN: "Άγνωστος χρήστης",
        }

  return labels[normalized]
}

export function getChecklistKindLabel(
  language: AppLanguage,
  kind: NormalizedChecklistKind
) {
  const labels: Record<NormalizedChecklistKind, string> =
    language === "en"
      ? {
          BASE_CLEANING: "Cleaning list",
          SUPPLIES: "Supplies list",
          CUSTOM: "List",
        }
      : {
          BASE_CLEANING: "Λίστα καθαριότητας",
          SUPPLIES: "Λίστα αναλωσίμων",
          CUSTOM: "Λίστα",
        }

  return labels[kind]
}

export function getChecklistTitleLabel(language: AppLanguage, value: unknown) {
  const normalized = normalizeChecklistTitle(value)

  if (!normalized.raw) {
    return language === "en" ? "List" : "Λίστα"
  }

  if (!normalized.isSystem) {
    return normalized.raw
  }

  return getChecklistKindLabel(language, normalized.kind)
}

export function getChecklistSectionLabel(
  language: AppLanguage,
  value: unknown
) {
  const kind = detectChecklistKind(value)

  if (kind === "BASE_CLEANING") {
    return language === "en" ? "Cleaning list items" : "Στοιχεία λίστας καθαριότητας"
  }

  if (kind === "SUPPLIES") {
    return language === "en" ? "Supplies list items" : "Στοιχεία λίστας αναλωσίμων"
  }

  return language === "en" ? "List items" : "Στοιχεία λίστας"
}

export function getYesNoLabel(language: AppLanguage, value: boolean) {
  return value
    ? language === "en"
      ? "Yes"
      : "Ναι"
    : language === "en"
      ? "No"
      : "Όχι"
}

export function getEnabledDisabledLabel(
  language: AppLanguage,
  value: boolean
) {
  return value
    ? language === "en"
      ? "Enabled"
      : "Ενεργό"
    : language === "en"
      ? "Disabled"
      : "Ανενεργό"
}

export function getSafeLabel(
  language: AppLanguage,
  value: unknown,
  fallback?: string
) {
  const text = String(value ?? "").trim()
  if (text) return text
  return fallback?.trim() || unknownLabel(language)
}

export function getTrackingModeLabel(language: AppLanguage, value: unknown) {
  const normalized = normalizeTrackingMode(value)

  const labels: Record<NormalizedTrackingMode, string> =
    language === "en"
      ? {
          FILL_LEVEL: "Fill level",
          QUANTITY: "Quantity",
          UNKNOWN: "Unknown mode",
        }
      : {
          FILL_LEVEL: "Επίπεδο πλήρωσης",
          QUANTITY: "Ποσότητα",
          UNKNOWN: "Άγνωστη λειτουργία",
        }

  return labels[normalized]
}

export function getReadinessStatusLabel(language: AppLanguage, value: unknown) {
  const normalized = normalizeReadinessStatus(value)

  const labels: Record<NormalizedReadinessStatus, string> =
    language === "en"
      ? {
          READY: "Ready",
          NEEDS_ATTENTION: "Needs attention",
          NOT_READY: "Not ready",
          UNKNOWN: "Unknown status",
        }
      : {
          READY: "Έτοιμο",
          NEEDS_ATTENTION: "Απαιτεί προσοχή",
          NOT_READY: "Μη έτοιμο",
          UNKNOWN: "Άγνωστη κατάσταση",
        }

  return labels[normalized]
}

export type NormalizedOperationalStatus =
  | "OCCUPIED"
  | "NO_TASK_COVERAGE"
  | "TASK_UNACCEPTED"
  | "TASK_IN_PROGRESS"
  | "AWAITING_PROOF"
  | "READY"
  | "BORDERLINE"
  | "NOT_READY"
  | "UNKNOWN"

export function normalizeOperationalStatusForLabel(value: unknown): NormalizedOperationalStatus {
  const s = String(value ?? "").trim().toLowerCase()
  if (s === "occupied") return "OCCUPIED"
  if (s === "no_task_coverage") return "NO_TASK_COVERAGE"
  if (s === "task_unaccepted") return "TASK_UNACCEPTED"
  if (s === "waiting_cleaning") return "TASK_UNACCEPTED" // backward compat
  if (s === "task_in_progress") return "TASK_IN_PROGRESS"
  if (s === "awaiting_proof") return "AWAITING_PROOF"
  if (s === "ready") return "READY"
  if (s === "borderline" || s === "needs_attention") return "BORDERLINE"
  if (s === "not_ready") return "NOT_READY"
  return "UNKNOWN"
}

export function getOperationalStatusLabel(language: AppLanguage, value: unknown): string {
  const normalized = normalizeOperationalStatusForLabel(value)

  const labels: Record<NormalizedOperationalStatus, string> =
    language === "en"
      ? {
          OCCUPIED: "Occupied",
          NO_TASK_COVERAGE: "No task coverage",
          TASK_UNACCEPTED: "Awaiting partner acceptance",
          TASK_IN_PROGRESS: "Task in progress",
          AWAITING_PROOF: "Awaiting proof submission",
          READY: "Ready",
          BORDERLINE: "Borderline",
          NOT_READY: "Not ready",
          UNKNOWN: "Unknown status",
        }
      : {
          OCCUPIED: "Έχει φιλοξενούμενους",
          NO_TASK_COVERAGE: "Εκκρεμεί δημιουργία εργασίας",
          TASK_UNACCEPTED: "Εκκρεμεί αποδοχή συνεργάτη",
          TASK_IN_PROGRESS: "Εργασία σε εξέλιξη",
          AWAITING_PROOF: "Αναμονή υποβολής λιστών",
          READY: "Έτοιμο",
          BORDERLINE: "Οριακό",
          NOT_READY: "Μη έτοιμο",
          UNKNOWN: "Άγνωστη κατάσταση",
        }

  return labels[normalized]
}