import { AppLanguage } from "@/components/i18n/LanguageProvider"

export type NormalizedTaskType =
  | "CLEANING"
  | "INSPECTION"
  | "MAINTENANCE"
  | "SUPPLIES"
  | "CUSTOM"
  | "UNKNOWN"

export type NormalizedTaskStatus =
  | "NEW"
  | "PENDING"
  | "ASSIGNED"
  | "WAITING_ACCEPTANCE"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "OVERDUE"
  | "UNKNOWN"

export type NormalizedAssignmentStatus =
  | "PENDING"
  | "WAITING_ACCEPTANCE"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED"
  | "UNKNOWN"

export type NormalizedChecklistStatus =
  | "NOT_ENABLED"
  | "NOT_SENT"
  | "PENDING"
  | "NOT_SUBMITTED"
  | "SUBMITTED"
  | "COMPLETED"
  | "UNKNOWN"

export type NormalizedSupplyLevel =
  | "MISSING"
  | "MEDIUM"
  | "FULL"
  | "UNKNOWN"

export type NormalizedPriority =
  | "LOW"
  | "NORMAL"
  | "HIGH"
  | "URGENT"
  | "UNKNOWN"

export type NormalizedBookingStatus =
  | "CONFIRMED"
  | "PENDING"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW"
  | "UNKNOWN"

export type NormalizedBookingOpsStatus =
  | "NEEDS_MAPPING"
  | "PENDING_MATCH"
  | "READY_FOR_ACTION"
  | "MAPPED"
  | "COMPLETED"
  | "ERROR"
  | "NO_TASK"
  | "UNKNOWN"

export type NormalizedIssueStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "CANCELLED"
  | "UNKNOWN"

export type NormalizedIssuePriority =
  | "LOW"
  | "NORMAL"
  | "HIGH"
  | "URGENT"
  | "UNKNOWN"

export type NormalizedIssueType =
  | "DAMAGE"
  | "REPAIR"
  | "SUPPLIES"
  | "INSPECTION"
  | "CLEANING"
  | "GENERAL"
  | "UNKNOWN"

export type NormalizedPropertyStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "UNKNOWN"

export type NormalizedPartnerStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "UNKNOWN"

export type NormalizedChecklistKind =
  | "BASE_CLEANING"
  | "SUPPLIES"
  | "CUSTOM"

export type NormalizedActorType =
  | "SYSTEM"
  | "USER"
  | "MANAGER"
  | "PARTNER"
  | "ADMIN"
  | "UNKNOWN"

export type NormalizedTrackingMode =
  | "FILL_LEVEL"
  | "QUANTITY"
  | "UNKNOWN"

export type NormalizedReadinessStatus =
  | "READY"
  | "NEEDS_ATTENTION"
  | "NOT_READY"
  | "UNKNOWN"

function normalizeRaw(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[-/]/g, "_")
    .toUpperCase()
}

function normalizeLoose(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function normalizePlain(value: unknown) {
  return String(value ?? "").trim()
}

export function normalizeLanguage(value: unknown): AppLanguage {
  return value === "en" ? "en" : "el"
}

export function isTruthyValue(value: unknown) {
  if (typeof value === "boolean") return value
  const raw = normalizeLoose(value)
  return raw === "true" || raw === "1" || raw === "yes" || raw === "y"
}

export function normalizeTaskType(value: unknown): NormalizedTaskType {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (
    raw === "CLEANING" ||
    loose === "cleaning" ||
    loose === "καθαρισμός" ||
    loose === "καθαρισμος"
  ) {
    return "CLEANING"
  }

  if (
    raw === "INSPECTION" ||
    loose === "inspection" ||
    loose === "επιθεώρηση" ||
    loose === "επιθεωρηση"
  ) {
    return "INSPECTION"
  }

  if (
    raw === "MAINTENANCE" ||
    loose === "maintenance" ||
    loose === "maintenance task" ||
    loose === "τεχνική εργασία" ||
    loose === "τεχνικη εργασια" ||
    loose === "συντήρηση" ||
    loose === "συντηρηση" ||
    loose === "ζημιές" ||
    loose === "ζημιες" ||
    loose === "βλάβες" ||
    loose === "βλαβες"
  ) {
    return "MAINTENANCE"
  }

  if (
    raw === "SUPPLIES" ||
    loose === "supplies" ||
    loose === "αναλώσιμα" ||
    loose === "αναλωσιμα"
  ) {
    return "SUPPLIES"
  }

  if (
    raw === "CUSTOM" ||
    loose === "custom" ||
    loose === "other task" ||
    loose === "άλλη εργασία" ||
    loose === "αλλη εργασια"
  ) {
    return "CUSTOM"
  }

  return "UNKNOWN"
}

export function normalizeTaskStatus(value: unknown): NormalizedTaskStatus {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (["NEW", "OPEN"].includes(raw) || loose === "νέα" || loose === "νεα") {
    return "NEW"
  }

  if (
    ["PENDING", "TODO"].includes(raw) ||
    loose === "εκκρεμεί" ||
    loose === "εκκρεμει"
  ) {
    return "PENDING"
  }

  if (
    raw === "ASSIGNED" ||
    loose === "assigned" ||
    loose === "ανατέθηκε" ||
    loose === "ανατεθηκε"
  ) {
    return "ASSIGNED"
  }

  if (
    raw === "WAITING_ACCEPTANCE" ||
    loose === "waiting acceptance" ||
    loose === "αναμονή αποδοχής" ||
    loose === "αναμονη αποδοχης"
  ) {
    return "WAITING_ACCEPTANCE"
  }

  if (
    raw === "ACCEPTED" ||
    loose === "accepted" ||
    loose === "αποδεκτή" ||
    loose === "αποδεκτη"
  ) {
    return "ACCEPTED"
  }

  if (
    ["IN_PROGRESS", "STARTED"].includes(raw) ||
    loose === "in progress" ||
    loose === "σε εξέλιξη" ||
    loose === "σε εξελιξη"
  ) {
    return "IN_PROGRESS"
  }

  if (
    ["COMPLETED", "DONE"].includes(raw) ||
    loose === "completed" ||
    loose === "ολοκληρώθηκε" ||
    loose === "ολοκληρωθηκε" ||
    loose === "ολοκληρωμένη" ||
    loose === "ολοκληρωμενη"
  ) {
    return "COMPLETED"
  }

  if (
    raw === "CANCELLED" ||
    raw === "CANCELED" ||
    loose === "cancelled" ||
    loose === "canceled" ||
    loose === "ακυρώθηκε" ||
    loose === "ακυρωθηκε" ||
    loose === "ακυρωμένη" ||
    loose === "ακυρωμενη"
  ) {
    return "CANCELLED"
  }

  if (
    raw === "OVERDUE" ||
    loose === "overdue" ||
    loose === "εκπρόθεσμη" ||
    loose === "εκπροθεσμη"
  ) {
    return "OVERDUE"
  }

  return "UNKNOWN"
}

export function normalizeAssignmentStatus(
  value: unknown
): NormalizedAssignmentStatus {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (
    raw === "PENDING" ||
    loose === "pending" ||
    loose === "εκκρεμεί" ||
    loose === "εκκρεμει"
  ) {
    return "PENDING"
  }

  if (
    raw === "WAITING_ACCEPTANCE" ||
    loose === "waiting acceptance" ||
    loose === "αναμονή αποδοχής" ||
    loose === "αναμονη αποδοχης"
  ) {
    return "WAITING_ACCEPTANCE"
  }

  if (
    raw === "ACCEPTED" ||
    loose === "accepted" ||
    loose === "αποδεκτή" ||
    loose === "αποδεκτη"
  ) {
    return "ACCEPTED"
  }

  if (
    raw === "REJECTED" ||
    loose === "rejected" ||
    loose === "απορρίφθηκε" ||
    loose === "απορριφθηκε"
  ) {
    return "REJECTED"
  }

  if (
    raw === "CANCELLED" ||
    raw === "CANCELED" ||
    loose === "cancelled" ||
    loose === "canceled" ||
    loose === "ακυρώθηκε" ||
    loose === "ακυρωθηκε"
  ) {
    return "CANCELLED"
  }

  if (
    raw === "COMPLETED" ||
    loose === "completed" ||
    loose === "ολοκληρώθηκε" ||
    loose === "ολοκληρωθηκε"
  ) {
    return "COMPLETED"
  }

  return "UNKNOWN"
}

export function normalizeChecklistStatus(
  value: unknown,
  options?: {
    enabled?: unknown
    submitted?: unknown
    completed?: unknown
  }
): NormalizedChecklistStatus {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (options && options.enabled !== undefined && !isTruthyValue(options.enabled)) {
    return "NOT_ENABLED"
  }

  if (isTruthyValue(options?.completed)) {
    return "COMPLETED"
  }

  if (isTruthyValue(options?.submitted)) {
    return "SUBMITTED"
  }

  if (
    raw === "NOT_ENABLED" ||
    loose === "not enabled" ||
    loose === "δεν ενεργοποιήθηκε" ||
    loose === "δεν ενεργοποιηθηκε"
  ) {
    return "NOT_ENABLED"
  }

  if (
    raw === "NOT_SENT" ||
    loose === "not sent" ||
    loose === "δεν στάλθηκε" ||
    loose === "δεν σταλθηκε"
  ) {
    return "NOT_SENT"
  }

  if (
    raw === "PENDING" ||
    loose === "pending" ||
    loose === "αναμονή" ||
    loose === "αναμονη"
  ) {
    return "PENDING"
  }

  if (
    raw === "NOT_SUBMITTED" ||
    loose === "not submitted" ||
    loose === "δεν υποβλήθηκε" ||
    loose === "δεν υποβληθηκε"
  ) {
    return "NOT_SUBMITTED"
  }

  if (
    raw === "SUBMITTED" ||
    loose === "submitted" ||
    loose === "υποβλήθηκε" ||
    loose === "υποβληθηκε"
  ) {
    return "SUBMITTED"
  }

  if (
    raw === "COMPLETED" ||
    loose === "completed" ||
    loose === "ολοκληρώθηκε" ||
    loose === "ολοκληρωθηκε"
  ) {
    return "COMPLETED"
  }

  return "UNKNOWN"
}

export function normalizeSupplyLevel(value: unknown): NormalizedSupplyLevel {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (
    ["EMPTY", "OUT", "MISSING"].includes(raw) ||
    loose === "empty" ||
    loose === "missing" ||
    loose === "έλλειψη" ||
    loose === "ελλειψη"
  ) {
    return "MISSING"
  }

  if (
    ["LOW", "MEDIUM", "MODERATE"].includes(raw) ||
    loose === "low" ||
    loose === "medium" ||
    loose === "μέτρια" ||
    loose === "μετρια" ||
    loose === "χαμηλή" ||
    loose === "χαμηλη"
  ) {
    return "MEDIUM"
  }

  if (
    ["FULL", "HIGH", "OK", "GOOD"].includes(raw) ||
    loose === "full" ||
    loose === "πλήρης" ||
    loose === "πληρης"
  ) {
    return "FULL"
  }

  return "UNKNOWN"
}

export function normalizePriority(value: unknown): NormalizedPriority {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (
    raw === "LOW" ||
    loose === "low" ||
    loose === "χαμηλή" ||
    loose === "χαμηλη"
  ) {
    return "LOW"
  }

  if (
    ["NORMAL", "MEDIUM", "DEFAULT"].includes(raw) ||
    loose === "normal" ||
    loose === "κανονική" ||
    loose === "κανονικη"
  ) {
    return "NORMAL"
  }

  if (
    raw === "HIGH" ||
    loose === "high" ||
    loose === "υψηλή" ||
    loose === "υψηλη"
  ) {
    return "HIGH"
  }

  if (
    raw === "URGENT" ||
    raw === "CRITICAL" ||
    loose === "urgent" ||
    loose === "critical" ||
    loose === "επείγουσα" ||
    loose === "επειγουσα" ||
    loose === "επείγον" ||
    loose === "επειγον"
  ) {
    return "URGENT"
  }

  return "UNKNOWN"
}

export function normalizeBookingStatus(
  value: unknown
): NormalizedBookingStatus {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (
    raw === "CONFIRMED" ||
    loose === "confirmed" ||
    loose === "επιβεβαιωμένη" ||
    loose === "επιβεβαιωμενη"
  ) {
    return "CONFIRMED"
  }

  if (
    raw === "PENDING" ||
    loose === "pending" ||
    loose === "εκκρεμεί" ||
    loose === "εκκρεμει"
  ) {
    return "PENDING"
  }

  if (
    raw === "CANCELLED" ||
    raw === "CANCELED" ||
    loose === "cancelled" ||
    loose === "canceled" ||
    loose === "ακυρωμένη" ||
    loose === "ακυρωμενη"
  ) {
    return "CANCELLED"
  }

  if (
    raw === "COMPLETED" ||
    loose === "completed" ||
    loose === "ολοκληρωμένη" ||
    loose === "ολοκληρωμενη"
  ) {
    return "COMPLETED"
  }

  if (
    raw === "NO_SHOW" ||
    loose === "no show" ||
    loose === "μη εμφάνιση" ||
    loose === "μη εμφανιση"
  ) {
    return "NO_SHOW"
  }

  return "UNKNOWN"
}

export function normalizeBookingOpsStatus(
  value: unknown
): NormalizedBookingOpsStatus {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (
    raw === "NEEDS_MAPPING" ||
    loose === "needs mapping" ||
    loose === "χρειάζεται αντιστοίχιση" ||
    loose === "χρειαζεται αντιστοιχιση"
  ) {
    return "NEEDS_MAPPING"
  }

  if (
    raw === "PENDING_MATCH" ||
    loose === "pending match" ||
    loose === "αναμονή αντιστοίχισης" ||
    loose === "αναμονη αντιστοιχισης"
  ) {
    return "PENDING_MATCH"
  }

  if (
    raw === "READY_FOR_ACTION" ||
    loose === "ready for action" ||
    loose === "έτοιμη για ενέργεια" ||
    loose === "ετοιμη για ενεργεια"
  ) {
    return "READY_FOR_ACTION"
  }

  if (
    raw === "MAPPED" ||
    loose === "mapped" ||
    loose === "αντιστοιχίστηκε" ||
    loose === "αντιστοιχιστηκε"
  ) {
    return "MAPPED"
  }

  if (
    raw === "COMPLETED" ||
    loose === "completed" ||
    loose === "ολοκληρωμένη" ||
    loose === "ολοκληρωμενη"
  ) {
    return "COMPLETED"
  }

  if (
    raw === "ERROR" ||
    loose === "error" ||
    loose === "σφάλμα" ||
    loose === "σφαλμα"
  ) {
    return "ERROR"
  }

  if (
    raw === "NO_TASK" ||
    loose === "no task" ||
    loose === "χωρίς εργασία" ||
    loose === "χωρις εργασια"
  ) {
    return "NO_TASK"
  }

  return "UNKNOWN"
}

export function normalizeIssueStatus(value: unknown): NormalizedIssueStatus {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (
    raw === "OPEN" ||
    loose === "open" ||
    loose === "ανοιχτό" ||
    loose === "ανοιχτο" ||
    loose === "ανοιχτό θέμα" ||
    loose === "ανοιχτο θεμα"
  ) {
    return "OPEN"
  }

  if (
    raw === "IN_PROGRESS" ||
    loose === "in progress" ||
    loose === "σε εξέλιξη" ||
    loose === "σε εξελιξη"
  ) {
    return "IN_PROGRESS"
  }

  if (
    raw === "RESOLVED" ||
    loose === "resolved" ||
    loose === "επιλύθηκε" ||
    loose === "επιλυθηκε"
  ) {
    return "RESOLVED"
  }

  if (
    raw === "CLOSED" ||
    loose === "closed" ||
    loose === "κλειστό" ||
    loose === "κλειστο"
  ) {
    return "CLOSED"
  }

  if (
    raw === "CANCELLED" ||
    loose === "cancelled" ||
    loose === "ακυρωμένο" ||
    loose === "ακυρωμενο"
  ) {
    return "CANCELLED"
  }

  return "UNKNOWN"
}

export function normalizeIssuePriority(
  value: unknown
): NormalizedIssuePriority {
  return normalizePriority(value)
}

export function normalizeIssueType(value: unknown): NormalizedIssueType {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (raw === "DAMAGE" || loose === "damage" || loose === "ζημιά" || loose === "ζημια") {
    return "DAMAGE"
  }

  if (raw === "REPAIR" || loose === "repair" || loose === "βλάβη" || loose === "βλαβη") {
    return "REPAIR"
  }

  if (raw === "SUPPLIES" || loose === "supplies" || loose === "αναλώσιμα" || loose === "αναλωσιμα") {
    return "SUPPLIES"
  }

  if (raw === "INSPECTION" || loose === "inspection" || loose === "επιθεώρηση" || loose === "επιθεωρηση") {
    return "INSPECTION"
  }

  if (raw === "CLEANING" || loose === "cleaning" || loose === "καθαριότητα" || loose === "καθαριοτητα") {
    return "CLEANING"
  }

  if (raw === "GENERAL" || loose === "general" || loose === "γενικό" || loose === "γενικο") {
    return "GENERAL"
  }

  return "UNKNOWN"
}

export function normalizePropertyStatus(
  value: unknown
): NormalizedPropertyStatus {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (
    raw === "ACTIVE" ||
    loose === "active" ||
    loose === "ενεργό" ||
    loose === "ενεργο"
  ) {
    return "ACTIVE"
  }

  if (
    raw === "INACTIVE" ||
    loose === "inactive" ||
    loose === "ανενεργό" ||
    loose === "ανενεργο"
  ) {
    return "INACTIVE"
  }

  return "UNKNOWN"
}

export function normalizePartnerStatus(
  value: unknown
): NormalizedPartnerStatus {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (
    raw === "ACTIVE" ||
    loose === "active" ||
    loose === "ενεργός" ||
    loose === "ενεργος"
  ) {
    return "ACTIVE"
  }

  if (
    raw === "INACTIVE" ||
    loose === "inactive" ||
    loose === "ανενεργός" ||
    loose === "ανενεργος"
  ) {
    return "INACTIVE"
  }

  if (
    raw === "SUSPENDED" ||
    loose === "suspended" ||
    loose === "σε αναστολή" ||
    loose === "σε αναστολη"
  ) {
    return "SUSPENDED"
  }

  return "UNKNOWN"
}

export function normalizeActorType(value: unknown): NormalizedActorType {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (raw === "SYSTEM" || loose === "system") return "SYSTEM"
  if (raw === "USER" || loose === "user") return "USER"
  if (raw === "MANAGER" || loose === "manager") return "MANAGER"
  if (raw === "PARTNER" || loose === "partner") return "PARTNER"
  if (raw === "ADMIN" || loose === "admin") return "ADMIN"

  return "UNKNOWN"
}

export function detectChecklistKind(value: unknown): NormalizedChecklistKind {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (
    raw === "BASE_CLEANING" ||
    loose === "base cleaning checklist" ||
    loose === "base property cleaning checklist" ||
    loose === "primary property cleaning checklist" ||
    loose === "cleaning checklist" ||
    loose === "cleaning list" ||
    loose === "βασική λίστα καθαριότητας" ||
    loose === "βασικη λιστα καθαριοτητας" ||
    loose === "κύρια λίστα καθαριότητας ακινήτου" ||
    loose === "κυρια λιστα καθαριοτητας ακινητου" ||
    loose === "λίστα καθαριότητας" ||
    loose === "λιστα καθαριοτητας" ||
    loose === "καθαριότητα" ||
    loose === "cleaning"
  ) {
    return "BASE_CLEANING"
  }

  if (
    raw === "SUPPLIES" ||
    loose === "supplies checklist" ||
    loose === "supplies list" ||
    loose === "property supplies list" ||
    loose === "supplies" ||
    loose === "λίστα αναλωσίμων" ||
    loose === "λιστα αναλωσιμων" ||
    loose === "λίστα αναλωσίμων ακινήτου" ||
    loose === "λιστα αναλωσιμων ακινητου" ||
    loose === "αναλώσιμα" ||
    loose === "αναλωσιμα"
  ) {
    return "SUPPLIES"
  }

  return "CUSTOM"
}

export function isSystemChecklistTitle(value: unknown) {
  return detectChecklistKind(value) !== "CUSTOM"
}

export function normalizeChecklistTitle(value: unknown) {
  const text = String(value ?? "").trim()
  const kind = detectChecklistKind(text)

  return {
    raw: text,
    kind,
    isSystem: kind !== "CUSTOM",
  }
}

export function normalizeSystemChecklistTitle(
  title: string | null | undefined,
  language: AppLanguage,
  options?: {
    templateType?: string | null
    isPrimary?: boolean
    fallback?: string
  }
) {
  const text = normalizePlain(title)
  const templateType = normalizeLoose(options?.templateType || "")
  const isPrimary = Boolean(options?.isPrimary)

  const primaryEl = "Λίστα καθαριότητας"
  const primaryEn = "Cleaning list"

  if (isPrimary && templateType !== "supplies") {
    return language === "en" ? primaryEn : primaryEl
  }

  if (!text) {
    return options?.fallback || "—"
  }

  const kind = detectChecklistKind(text)

  if (kind === "BASE_CLEANING") {
    return language === "en" ? primaryEn : primaryEl
  }

  if (kind === "SUPPLIES") {
    return language === "en" ? "Supplies list" : "Λίστα αναλωσίμων"
  }

  return text
}

export function normalizeTaskTitleText(
  title: string | null | undefined,
  language: AppLanguage
) {
  const text = normalizePlain(title)
  if (!text) return "—"

  if (language === "en") {
    return text
      .replace(
        /^Καθαρισμός μετά από check-out\s*-\s*/i,
        "Cleaning after check-out - "
      )
      .replace(
        /^Καθαρισμος μετά από check-out\s*-\s*/i,
        "Cleaning after check-out - "
      )
      .replace(
        /^Επιθεώρηση μετά από check-out\s*-\s*/i,
        "Inspection after check-out - "
      )
      .replace(
        /^Επιθεωρηση μετά από check-out\s*-\s*/i,
        "Inspection after check-out - "
      )
      .replace(
        /^Συντήρηση μετά από check-out\s*-\s*/i,
        "Maintenance after check-out - "
      )
      .replace(
        /^Συντηρηση μετά από check-out\s*-\s*/i,
        "Maintenance after check-out - "
      )
  }

  return text
    .replace(
      /^Cleaning after check-out\s*-\s*/i,
      "Καθαρισμός μετά από check-out - "
    )
    .replace(
      /^Inspection after check-out\s*-\s*/i,
      "Επιθεώρηση μετά από check-out - "
    )
    .replace(
      /^Maintenance after check-out\s*-\s*/i,
      "Συντήρηση μετά από check-out - "
    )
}

export function normalizeTaskDescriptionText(
  description: string | null | undefined,
  language: AppLanguage
) {
  const text = normalizePlain(description)
  if (!text) return null

  if (language === "en") {
    return text
      .replace(
        /Εργασία που δημιουργήθηκε χειροκίνητα από κράτηση\./gi,
        "Task created manually from booking."
      )
      .replace(/Πηγή:/gi, "Source:")
      .replace(/Κωδικός κράτησης:/gi, "Booking code:")
      .replace(/Επισκέπτης:/gi, "Guest:")
      .replace(/Άφιξη:/gi, "Check-in:")
      .replace(/Αναχώρηση:/gi, "Check-out:")
  }

  return text
    .replace(
      /Task created manually from booking\./gi,
      "Εργασία που δημιουργήθηκε χειροκίνητα από κράτηση."
    )
    .replace(/\bSource:/gi, "Πηγή:")
    .replace(/\bBooking code:/gi, "Κωδικός κράτησης:")
    .replace(/\bGuest:/gi, "Επισκέπτης:")
    .replace(/\bCheck-in:/gi, "Άφιξη:")
    .replace(/\bCheck-out:/gi, "Αναχώρηση:")
}

export function normalizeTrackingMode(value: unknown): NormalizedTrackingMode {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (raw === "FILL_LEVEL" || loose === "fill_level" || loose === "fill level") {
    return "FILL_LEVEL"
  }

  if (raw === "QUANTITY" || loose === "quantity" || loose === "ποσότητα" || loose === "ποσοτητα") {
    return "QUANTITY"
  }

  return "UNKNOWN"
}

export function normalizeReadinessStatus(
  value: unknown
): NormalizedReadinessStatus {
  const raw = normalizeRaw(value)
  const loose = normalizeLoose(value)

  if (raw === "READY" || loose === "ready" || loose === "έτοιμο" || loose === "ετοιμο") {
    return "READY"
  }

  if (
    raw === "NEEDS_ATTENTION" ||
    loose === "needs_attention" ||
    loose === "needs attention" ||
    loose === "απαιτεί προσοχή" ||
    loose === "απαιτει προσοχη"
  ) {
    return "NEEDS_ATTENTION"
  }

  if (
    raw === "NOT_READY" ||
    loose === "not_ready" ||
    loose === "not ready" ||
    loose === "μη έτοιμο" ||
    loose === "μη ετοιμο"
  ) {
    return "NOT_READY"
  }

  return "UNKNOWN"
}