"use client"

export type TaskAlertShape = {
  status?: string | null
  alertEnabled?: boolean | null
  alertAt?: string | null
}

export type CanonicalTaskCardLanguage = "el" | "en"

export type CanonicalTaskInfoItem = {
  id: string
  label: string
  value: string
  tooltip: string
}

type DateLike = string | Date | null | undefined

function normalizeTaskStatus(status: string | null | undefined) {
  return String(status || "").trim().toLowerCase()
}

function normalizeAssignmentStatus(status: string | null | undefined) {
  return String(status || "").trim().toLowerCase()
}

function normalizeTimeValue(value?: string | null) {
  const text = String(value || "").trim()
  if (!text) return null

  const normalized = text.slice(0, 5)
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized) ? normalized : null
}

function buildDateFromDateOnly(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)

  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeDateValue(value?: DateLike) {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const text = String(value).trim()
  if (!text) return null

  const dateOnly = buildDateFromDateOnly(text)
  if (dateOnly) return dateOnly

  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function extractDateAndTimeParts(value?: DateLike) {
  const date = normalizeDateValue(value)
  if (!date) {
    return {
      date: null as Date | null,
      time: null as string | null,
    }
  }

  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return {
    date,
    time: `${hours}:${minutes}`,
  }
}

function formatDateValue(
  value: DateLike,
  locale: string,
  emptyText = "—"
) {
  const date = normalizeDateValue(value)
  if (!date) return emptyText

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatTimeRange(
  start?: string | null,
  end?: string | null,
  emptyText = "—"
) {
  const cleanStart = normalizeTimeValue(start)
  const cleanEnd = normalizeTimeValue(end)

  if (cleanStart && cleanEnd) return `${cleanStart} - ${cleanEnd}`
  if (cleanStart) return cleanStart
  if (cleanEnd) return cleanEnd
  return emptyText
}

function formatDateTimeValue(input: {
  date?: DateLike
  time?: string | null
  locale: string
  emptyText?: string
}) {
  const emptyText = input.emptyText ?? "—"
  const dateText = formatDateValue(input.date, input.locale, "")
  const timeText = normalizeTimeValue(input.time)

  if (!dateText && !timeText) return emptyText
  if (dateText && timeText) return `${dateText} · ${timeText}`
  return dateText || timeText || emptyText
}

function getCanonicalTaskTexts(language: CanonicalTaskCardLanguage) {
  if (language === "en") {
    return {
      bookingWindowLabel: "Work window",
      bookingWindowTooltip:
        "The time span between the booking check-out and the next check-in. This is the available operational window for the task.",
      executionLabel: "Execution date & time",
      executionTooltip:
        "The scheduled execution date and time exactly as defined during task creation.",
      partnerLabel: "Partner",
      partnerTooltip:
        "The partner currently responsible for the latest execution assignment of this task.",
      unassigned: "Unassigned",
      noWindow: "No booking window available",
      openEndedWindow: "Open window",
    }
  }

  return {
    bookingWindowLabel: "Παράθυρο εργασίας",
    bookingWindowTooltip:
      "Το διάστημα μεταξύ check-out της κράτησης και του επόμενου check-in. Αυτό είναι το διαθέσιμο λειτουργικό παράθυρο της εργασίας.",
    executionLabel: "Ημ/νία και ώρα εκτέλεσης",
    executionTooltip:
      "Η προγραμματισμένη ημερομηνία και ώρα εκτέλεσης της εργασίας όπως ορίστηκε στη δημιουργία της.",
    partnerLabel: "Συνεργάτης",
    partnerTooltip:
      "Ο συνεργάτης που έχει σήμερα την τελευταία ενεργή ανάθεση εκτέλεσης αυτής της εργασίας.",
    unassigned: "Χωρίς ανάθεση",
    noWindow: "Δεν υπάρχει διαθέσιμο παράθυρο",
    openEndedWindow: "Ανοιχτό παράθυρο",
  }
}

export function isOpenTaskStatus(status: string | null | undefined) {
  return [
    "new",
    "pending",
    "assigned",
    "waiting_acceptance",
    "accepted",
    "in_progress",
  ].includes(normalizeTaskStatus(status))
}

export function isTaskAlertActive(task: TaskAlertShape) {
  if (!task.alertEnabled || !task.alertAt) return false
  if (!isOpenTaskStatus(task.status)) return false

  const alertDate = new Date(task.alertAt)
  if (Number.isNaN(alertDate.getTime())) return false

  return alertDate.getTime() <= Date.now()
}

export function getTaskSurfaceTone(task: TaskAlertShape) {
  if (isTaskAlertActive(task)) {
    return {
      card: "border-red-200 bg-red-50/80",
      subtleCard: "border-red-200 bg-red-50/70",
      accentBorder: "border-red-200/80",
      primaryAction:
        "bg-red-600 text-white hover:bg-red-700 border-red-600",
      secondaryAction:
        "border-red-200 bg-white text-red-700 hover:bg-red-50",
      alertBadge:
        "border border-red-200 bg-red-100 text-red-700",
    }
  }

  return {
    card: "border-slate-200 bg-white",
    subtleCard: "border-slate-200 bg-slate-50",
    accentBorder: "border-slate-200",
    primaryAction:
      "bg-slate-900 text-white hover:bg-slate-800 border-slate-900",
    secondaryAction:
      "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    alertBadge:
      "border border-slate-200 bg-slate-100 text-slate-700",
    }
}

export function getTaskStatusBadgeClasses(status: string | null | undefined) {
  const normalized = normalizeTaskStatus(status)

  if (normalized === "completed") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (normalized === "in_progress") {
    return "border border-blue-200 bg-blue-50 text-blue-700"
  }

  if (normalized === "accepted") {
    return "border border-sky-200 bg-sky-50 text-sky-700"
  }

  if (
    normalized === "assigned" ||
    normalized === "waiting_acceptance" ||
    normalized === "pending" ||
    normalized === "new"
  ) {
    return "border border-amber-200 bg-amber-50 text-amber-700"
  }

  if (normalized === "cancelled" || normalized === "rejected") {
    return "border border-rose-200 bg-rose-50 text-rose-700"
  }

  return "border border-slate-200 bg-slate-100 text-slate-700"
}

export function getAssignmentStatusBadgeClasses(
  status: string | null | undefined
) {
  const normalized = normalizeAssignmentStatus(status)

  if (normalized === "accepted" || normalized === "completed") {
    return "border border-sky-200 bg-sky-50 text-sky-700"
  }

  if (
    normalized === "assigned" ||
    normalized === "waiting_acceptance" ||
    normalized === "pending"
  ) {
    return "border border-amber-200 bg-amber-50 text-amber-700"
  }

  if (normalized === "rejected" || normalized === "cancelled") {
    return "border border-rose-200 bg-rose-50 text-rose-700"
  }

  return "border border-slate-200 bg-slate-100 text-slate-700"
}

export function buildCanonicalTaskInfoItems(input: {
  language: CanonicalTaskCardLanguage
  locale: string
  scheduledDate?: DateLike
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  checkOutDate?: DateLike
  checkOutTime?: string | null
  nextCheckInDate?: DateLike
  nextCheckInTime?: string | null
  nextCheckInAt?: DateLike
  partnerName?: string | null
}): CanonicalTaskInfoItem[] {
  const texts = getCanonicalTaskTexts(input.language)

  const nextCheckInParts = extractDateAndTimeParts(input.nextCheckInAt)

  const bookingStartText = formatDateTimeValue({
    date: input.checkOutDate,
    time: input.checkOutTime,
    locale: input.locale,
    emptyText: "",
  })

  const bookingEndText = formatDateTimeValue({
    date: input.nextCheckInDate ?? nextCheckInParts.date,
    time: input.nextCheckInTime ?? nextCheckInParts.time,
    locale: input.locale,
    emptyText: "",
  })

  let bookingWindowValue = texts.noWindow

  if (bookingStartText && bookingEndText) {
    bookingWindowValue = `${bookingStartText} → ${bookingEndText}`
  } else if (bookingStartText) {
    bookingWindowValue = `${bookingStartText} → ${texts.openEndedWindow}`
  } else if (bookingEndText) {
    bookingWindowValue = bookingEndText
  }

  const executionDateText = formatDateValue(
    input.scheduledDate,
    input.locale,
    "—"
  )
  const executionTimeText = formatTimeRange(
    input.scheduledStartTime,
    input.scheduledEndTime,
    "—"
  )

  return [
    {
      id: "booking-window",
      label: texts.bookingWindowLabel,
      value: bookingWindowValue,
      tooltip: texts.bookingWindowTooltip,
    },
    {
      id: "execution-datetime",
      label: texts.executionLabel,
      value: `${executionDateText} · ${executionTimeText}`,
      tooltip: texts.executionTooltip,
    },
    {
      id: "partner",
      label: texts.partnerLabel,
      value: String(input.partnerName || "").trim() || texts.unassigned,
      tooltip: texts.partnerTooltip,
    },
  ]
}
