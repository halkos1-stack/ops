"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { getBookingsModuleTexts } from "@/lib/i18n/translations"
import {
  getPriorityLabel,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from "@/lib/i18n/labels"
import {
  normalizePriority,
} from "@/lib/i18n/normalizers"

type BookingDetail = {
  id: string
  sourcePlatform: string
  externalBookingId: string
  externalListingId?: string | null
  externalListingName?: string | null
  guestName?: string | null
  guestPhone?: string | null
  guestEmail?: string | null
  checkInDate: string
  checkOutDate: string
  checkInTime?: string | null
  checkOutTime?: string | null
  status: string
  syncStatus: string
  needsMapping: boolean
  notes?: string | null
  taskStatus?: "no_task" | "created" | "assigned" | "completed" | string
  workWindow?: {
    nextCheckInDate?: string | null
    nextCheckInTime?: string | null
    windowStart?: string | null
    windowEnd?: string | null
    windowDurationMinutes?: number | null
  } | null
  property?: {
    id: string
    code: string
    name: string
    address?: string | null
    city?: string | null
    region?: string | null
    postalCode?: string | null
    country?: string | null
    type?: string | null
    status?: string | null
  } | null
  tasks: Array<{
    id: string
    title: string
    description?: string | null
    taskType: string
    status: string
    priority: string
    scheduledDate: string
    scheduledStartTime?: string | null
    scheduledEndTime?: string | null
    dueDate?: string | null
    alertEnabled?: boolean
    alertAt?: string | null
    assignments: Array<{
      id: string
      status: string
      assignedAt: string
      acceptedAt?: string | null
      completedAt?: string | null
      partner: {
        id: string
        code: string
        name: string
        email: string
        specialty: string
        status: string
      }
    }>
  }>
  syncEvents: Array<{
    id: string
    eventType: string
    resultStatus?: string | null
    message?: string | null
    createdAt: string
  }>
}

function isValidDate(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value || !isValidDate(value)) return "-"
  return new Date(value).toLocaleDateString(locale)
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value || !isValidDate(value)) return "-"
  return new Date(value).toLocaleString(locale)
}

function isValidTimeString(value?: string | null) {
  if (!value) return false
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim())
}

function formatTime(value?: string | null) {
  if (!value || !isValidTimeString(value)) return ""
  return value.trim().slice(0, 5)
}

function normalizeSourcePlatform(
  sourcePlatform: string,
  texts: ReturnType<typeof getBookingsModuleTexts>
) {
  const normalized = sourcePlatform.trim().toUpperCase()

  if (normalized === "AIRBNB") return texts.platforms.airbnb
  if (normalized === "BOOKING_COM") return texts.platforms.booking
  if (normalized === "VRBO") return texts.platforms.vrbo

  return sourcePlatform
}

function getBookingStatusDisplay(
  status: string,
  language: "el" | "en"
) {
  const normalized = status.trim().toLowerCase()

  if (language === "en") {
    if (normalized === "cancelled") return "Cancelled"
    if (normalized === "confirmed") return "Confirmed"
    if (normalized === "active") return "Active"
    if (normalized === "completed") return "Completed"
    if (normalized === "pending") return "Pending"
    return status
  }

  if (normalized === "cancelled") return "Ακυρωμένη"
  if (normalized === "confirmed") return "Επιβεβαιωμένη"
  if (normalized === "active") return "Ενεργή"
  if (normalized === "completed") return "Ολοκληρωμένη"
  if (normalized === "pending") return "Σε αναμονή"
  return status
}

function getSyncStatusDisplay(
  syncStatus: string,
  needsMapping: boolean,
  language: "el" | "en"
) {
  if (syncStatus === "CANCELLED") {
    return language === "en" ? "Cancelled" : "Ακυρωμένη"
  }

  if (needsMapping) {
    return language === "en" ? "Needs mapping" : "Χρειάζεται αντιστοίχιση"
  }

  if (syncStatus === "READY_FOR_ACTION") {
    return language === "en" ? "Ready for action" : "Έτοιμη για ενέργεια"
  }

  if (syncStatus === "ERROR") {
    return language === "en" ? "Error" : "Σφάλμα"
  }

  if (syncStatus === "PENDING_MATCH") {
    return language === "en" ? "Pending match" : "Αναμονή αντιστοίχισης"
  }

  return syncStatus
}

function getBadgeClassName(kind: "neutral" | "success" | "warning" | "danger") {
  if (kind === "success") {
    return "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
  }

  if (kind === "warning") {
    return "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
  }

  if (kind === "danger") {
    return "rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700"
  }

  return "rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
}

function normalizeTaskTitle(
  title: string | null | undefined,
  language: "el" | "en"
) {
  if (!title || !title.trim()) return "-"

  let text = title.trim()

  if (language === "en") {
    text = text
      .replace(/^Καθαρισμός μετά από check-out\s*-\s*/i, "Cleaning after check-out - ")
      .replace(/^Καθαρισμος μετά από check-out\s*-\s*/i, "Cleaning after check-out - ")
      .replace(/^Επιθεώρηση μετά από check-out\s*-\s*/i, "Inspection after check-out - ")
      .replace(/^Επιθεωρηση μετά από check-out\s*-\s*/i, "Inspection after check-out - ")
      .replace(/^Συντήρηση μετά από check-out\s*-\s*/i, "Maintenance after check-out - ")
      .replace(/^Συντηρηση μετά από check-out\s*-\s*/i, "Maintenance after check-out - ")
      .replace(/^Καθαρισμός\s*-\s*/i, "Cleaning - ")
      .replace(/^Καθαρισμος\s*-\s*/i, "Cleaning - ")
      .replace(/^Επιθεώρηση\s*-\s*/i, "Inspection - ")
      .replace(/^Επιθεωρηση\s*-\s*/i, "Inspection - ")
      .replace(/^Συντήρηση\s*-\s*/i, "Maintenance - ")
      .replace(/^Συντηρηση\s*-\s*/i, "Maintenance - ")
    return text
  }

  text = text
    .replace(/^Cleaning after check-out\s*-\s*/i, "Καθαρισμός μετά από check-out - ")
    .replace(/^Inspection after check-out\s*-\s*/i, "Επιθεώρηση μετά από check-out - ")
    .replace(/^Maintenance after check-out\s*-\s*/i, "Συντήρηση μετά από check-out - ")
    .replace(/^Cleaning\s*-\s*/i, "Καθαρισμός - ")
    .replace(/^Inspection\s*-\s*/i, "Επιθεώρηση - ")
    .replace(/^Maintenance\s*-\s*/i, "Συντήρηση - ")

  return text
}

function getTaskTypeDisplay(
  taskType: string | null | undefined,
  language: "el" | "en",
  texts: ReturnType<typeof getBookingsModuleTexts>
) {
  const normalized = String(taskType || "").trim().toLowerCase()

  if (normalized === "maintenance") {
    return texts.modal.taskTypes.maintenance
  }

  if (normalized === "custom") {
    return texts.modal.taskTypes.custom
  }

  return getTaskTypeLabel(language, taskType)
}

function getTaskStatusDisplay(
  status: string | null | undefined,
  language: "el" | "en"
) {
  return getTaskStatusLabel(language, status)
}

function getPriorityDisplay(
  priority: string | null | undefined,
  language: "el" | "en"
) {
  const normalized = normalizePriority(priority)

  if (normalized === "NORMAL") {
    return language === "en" ? "Normal" : "Κανονική"
  }

  return getPriorityLabel(language, priority)
}

function getAssignmentStatusDisplay(
  status: string | null | undefined,
  language: "el" | "en"
) {
  const value = String(status || "").trim().toLowerCase()

  if (language === "en") {
    if (value === "assigned") return "Assigned"
    if (value === "waiting_acceptance") return "Waiting acceptance"
    if (value === "accepted") return "Accepted"
    if (value === "rejected") return "Rejected"
    if (value === "completed") return "Completed"
    return status || "-"
  }

  if (value === "assigned") return "Ανατέθηκε"
  if (value === "waiting_acceptance") return "Αναμονή αποδοχής"
  if (value === "accepted") return "Αποδεκτή"
  if (value === "rejected") return "Απορρίφθηκε"
  if (value === "completed") return "Ολοκληρώθηκε"
  return status || "-"
}

function getSyncEventTypeDisplay(
  eventType: string | null | undefined,
  language: "el" | "en"
) {
  const value = String(eventType || "").trim().toUpperCase()

  if (language === "en") {
    if (value === "IMPORT") return "Import"
    if (value === "UPDATE") return "Update"
    if (value === "CANCEL") return "Cancellation"
    if (value === "MATCH") return "Match"
    if (value === "SYNC") return "Sync"
    if (value === "TASK_CREATED_FROM_BOOKING") return "Task created"
    return eventType || "-"
  }

  if (value === "IMPORT") return "Εισαγωγή"
  if (value === "UPDATE") return "Ενημέρωση"
  if (value === "CANCEL") return "Ακύρωση"
  if (value === "MATCH") return "Αντιστοίχιση"
  if (value === "SYNC") return "Συγχρονισμός"
  if (value === "TASK_CREATED_FROM_BOOKING") return "Δημιουργία εργασίας"
  return eventType || "-"
}

function getSyncEventResultDisplay(
  resultStatus: string | null | undefined,
  language: "el" | "en"
) {
  const value = String(resultStatus || "").trim().toUpperCase()

  if (!value) return "-"

  if (language === "en") {
    if (value === "SUCCESS") return "Success"
    if (value === "ERROR") return "Error"
    if (value === "WARNING") return "Warning"
    if (value === "CANCELLED") return "Cancelled"
    if (value === "READY_FOR_ACTION") return "Ready for action"
    if (value === "PENDING_MATCH") return "Pending match"
    return resultStatus || "-"
  }

  if (value === "SUCCESS") return "Επιτυχία"
  if (value === "ERROR") return "Σφάλμα"
  if (value === "WARNING") return "Προειδοποίηση"
  if (value === "CANCELLED") return "Ακυρώθηκε"
  if (value === "READY_FOR_ACTION") return "Έτοιμη για ενέργεια"
  if (value === "PENDING_MATCH") return "Αναμονή αντιστοίχισης"
  return resultStatus || "-"
}

function getWorkWindowHoursLabel(
  durationMinutes: number | null | undefined,
  language: "el" | "en"
) {
  if (!durationMinutes || durationMinutes <= 0) {
    return language === "en" ? "Open window" : "Ανοιχτό παράθυρο"
  }

  const hours = durationMinutes / 60

  if (hours >= 24) {
    const days = hours / 24
    const rounded = Number.isInteger(days) ? String(days) : days.toFixed(1)

    return language === "en"
      ? `${rounded} day window`
      : `Παράθυρο ${rounded} ημερών`
  }

  const roundedHours = Number.isInteger(hours) ? String(hours) : hours.toFixed(1)

  return language === "en"
    ? `${roundedHours} hour window`
    : `Παράθυρο ${roundedHours} ωρών`
}

function getTaskCoverageLabel(
  value: string | undefined,
  language: "el" | "en",
  texts: ReturnType<typeof getBookingsModuleTexts>
) {
  const normalized = String(value || "").trim().toLowerCase()

  if (normalized === "completed") {
    return language === "en" ? "Completed" : "Ολοκληρώθηκε"
  }

  if (normalized === "assigned") {
    return language === "en" ? "Assigned" : "Ανατέθηκε"
  }

  if (normalized === "created") {
    return language === "en" ? "Created" : "Δημιουργήθηκε"
  }

  return texts.statuses.noTask
}

function getTaskCoverageBadgeClass(value: string | undefined) {
  const normalized = String(value || "").trim().toLowerCase()

  if (normalized === "completed") return getBadgeClassName("neutral")
  if (normalized === "assigned") return getBadgeClassName("success")
  if (normalized === "created") return getBadgeClassName("neutral")
  return getBadgeClassName("warning")
}

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { language } = useAppLanguage()
  const texts = getBookingsModuleTexts(language)
  const locale = language === "en" ? "en-GB" : "el-GR"

  const bookingId = String(params.id)

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadBooking() {
    setLoading(true)

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        cache: "no-store",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || texts.detail.loadError)
      }

      setBooking(data)
    } catch (error) {
      alert(error instanceof Error ? error.message : texts.detail.loadError)
      router.push("/bookings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (bookingId) {
      loadBooking()
    }
  }, [bookingId, language])

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">{texts.common.loading}</div>
  }

  if (!booking) {
    return <div className="p-6 text-sm text-slate-500">{texts.detail.notFound}</div>
  }

  const syncBadgeClass = booking.needsMapping
    ? getBadgeClassName("warning")
    : booking.status.toLowerCase() === "cancelled"
      ? getBadgeClassName("danger")
      : getBadgeClassName("success")

  const firstTask = booking.tasks[0] || null

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-3 text-sm text-slate-500">
            <Link
              href="/bookings"
              className="font-medium text-slate-700 underline underline-offset-4"
            >
              {texts.detail.breadcrumb}
            </Link>
            {" / "}
            {booking.externalBookingId}
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {booking.property?.name ||
              booking.externalListingName ||
              booking.externalListingId ||
              texts.detail.titleFallback}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={getBadgeClassName("neutral")}>
              {normalizeSourcePlatform(booking.sourcePlatform, texts)}
            </span>
            <span className={getBadgeClassName("neutral")}>
              {getBookingStatusDisplay(booking.status, language)}
            </span>
            <span className={syncBadgeClass}>
              {getSyncStatusDisplay(booking.syncStatus, booking.needsMapping, language)}
            </span>
            <span className={getTaskCoverageBadgeClass(booking.taskStatus)}>
              {getTaskCoverageLabel(booking.taskStatus, language, texts)}
            </span>
          </div>

          <div className="mt-3 text-sm text-slate-600">
            {texts.labels.source}: {normalizeSourcePlatform(booking.sourcePlatform, texts)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/bookings"
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
          >
            {texts.common.backToBookings}
          </Link>

          {firstTask ? (
            <Link
              href={`/tasks/${firstTask.id}`}
              className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              {texts.common.viewTask}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">
              {language === "en" ? "Work window" : "Παράθυρο εργασίας"}
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {texts.labels.property}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {booking.property
                    ? `${booking.property.code} · ${booking.property.name}`
                    : texts.detail.noProperty}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {texts.labels.checkOut}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {formatDate(booking.checkOutDate, locale)}
                  {formatTime(booking.checkOutTime)
                    ? ` · ${formatTime(booking.checkOutTime)}`
                    : ""}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {texts.labels.nextCheckIn || "Επόμενο check-in"}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {booking.workWindow?.nextCheckInDate
                    ? `${formatDate(
                        booking.workWindow.nextCheckInDate,
                        locale
                      )}${formatTime(booking.workWindow.nextCheckInTime) ? ` · ${formatTime(booking.workWindow.nextCheckInTime)}` : ""}`
                    : texts.list.noNextBooking}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {texts.list.windowLabel}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {getWorkWindowHoursLabel(
                    booking.workWindow?.windowDurationMinutes,
                    language
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">
              {texts.detail.propertyCard}
            </h2>

            {booking.property ? (
              <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {texts.labels.property}
                  </div>
                  <div className="mt-1 font-medium text-slate-950">
                    {booking.property.code} · {booking.property.name}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {language === "en" ? "Address" : "Διεύθυνση"}
                  </div>
                  <div className="mt-1">
                    {booking.property.address || texts.common.noValue}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {language === "en" ? "Location" : "Τοποθεσία"}
                  </div>
                  <div className="mt-1">
                    {booking.property.city || texts.common.noValue}
                    {" · "}
                    {booking.property.region || texts.common.noValue}
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/properties/${booking.property.id}`}
                    className="font-medium text-slate-700 underline underline-offset-4"
                  >
                    {texts.common.viewProperty}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">{texts.detail.noProperty}</div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">
              {texts.detail.linkedTasksCard}
            </h2>

            {booking.tasks.length === 0 ? (
              <div className="text-sm text-slate-500">{texts.detail.noTasks}</div>
            ) : (
              <div className="space-y-4">
                {booking.tasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-semibold text-slate-950">
                        {normalizeTaskTitle(task.title, language)}
                      </div>
                      <Link
                        href={`/tasks/${task.id}`}
                        className="text-sm font-medium text-slate-700 underline underline-offset-4"
                      >
                        {texts.common.viewTask}
                      </Link>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {language === "en" ? "Type" : "Τύπος"}
                        </div>
                        <div className="mt-1 text-sm text-slate-900">
                          {getTaskTypeDisplay(task.taskType, language, texts)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {language === "en" ? "Status" : "Κατάσταση"}
                        </div>
                        <div className="mt-1 text-sm text-slate-900">
                          {getTaskStatusDisplay(task.status, language)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {language === "en" ? "Priority" : "Προτεραιότητα"}
                        </div>
                        <div className="mt-1 text-sm text-slate-900">
                          {getPriorityDisplay(task.priority, language)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {language === "en" ? "Schedule" : "Προγραμματισμός"}
                        </div>
                        <div className="mt-1 text-sm text-slate-900">
                          {formatDate(task.scheduledDate, locale)}
                          {formatTime(task.scheduledStartTime)
                            ? ` · ${formatTime(task.scheduledStartTime)}`
                            : ""}
                        </div>
                      </div>
                    </div>

                    {task.alertEnabled && task.alertAt ? (
                      <div className="mt-3 text-sm text-blue-700">
                        {texts.labels.alerts}: {formatDateTime(task.alertAt, locale)}
                      </div>
                    ) : null}

                    {task.assignments.length > 0 && (
                      <div className="mt-4 space-y-2 text-sm text-slate-700">
                        {task.assignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="rounded-2xl bg-white p-3"
                          >
                            <span className="font-medium text-slate-900">
                              {assignment.partner.name}
                            </span>
                            {" · "}
                            {getAssignmentStatusDisplay(assignment.status, language)}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">
              {texts.detail.syncHistoryCard}
            </h2>

            {booking.syncEvents.length === 0 ? (
              <div className="text-sm text-slate-500">{texts.detail.noHistory}</div>
            ) : (
              <div className="space-y-3">
                {booking.syncEvents.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"
                  >
                    <div className="font-semibold text-slate-950">
                      {getSyncEventTypeDisplay(event.eventType, language)}
                    </div>
                    <div className="mt-1 text-slate-600">
                      {getSyncEventResultDisplay(event.resultStatus, language)}
                    </div>
                    <div className="mt-1 text-slate-600">
                      {event.message || texts.common.noValue}
                    </div>
                    <div className="mt-2 text-slate-500">
                      {formatDateTime(event.createdAt, locale)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">
              {language === "en" ? "Booking summary" : "Σύνοψη κράτησης"}
            </h2>

            <div className="space-y-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {texts.labels.bookingCode}
                </div>
                <div className="mt-1 font-medium text-slate-950">
                  {booking.externalBookingId}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {texts.labels.listingId}
                </div>
                <div className="mt-1">
                  {booking.externalListingId || texts.common.noValue}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {texts.labels.source}
                </div>
                <div className="mt-1">
                  {normalizeSourcePlatform(booking.sourcePlatform, texts)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {language === "en" ? "Guest" : "Επισκέπτης"}
                </div>
                <div className="mt-1">
                  {booking.guestName || texts.common.noValue}
                </div>
              </div>
            </div>
          </section>

          {firstTask ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-950">
                {language === "en" ? "Current linked task" : "Τρέχουσα συνδεδεμένη εργασία"}
              </h2>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="font-semibold text-slate-950">
                  {normalizeTaskTitle(firstTask.title, language)}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {getTaskTypeDisplay(firstTask.taskType, language, texts)} ·{" "}
                  {getTaskStatusDisplay(firstTask.status, language)} ·{" "}
                  {getPriorityDisplay(firstTask.priority, language)}
                </div>

                <div className="mt-4">
                  <Link
                    href={`/tasks/${firstTask.id}`}
                    className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    {texts.common.viewTask}
                  </Link>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}