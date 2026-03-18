"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { getBookingsModuleTexts } from "@/lib/i18n/translations"

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

function getSourcePlatformLabel(sourcePlatform: string) {
  const normalized = sourcePlatform.trim().toUpperCase()

  if (normalized === "AIRBNB") return "Airbnb"
  if (normalized === "BOOKING_COM") return "Booking.com"
  if (normalized === "VRBO") return "VRBO"

  return sourcePlatform
}

function getBookingStatusLabel(status: string, language: "el" | "en") {
  const normalized = status.trim().toLowerCase()

  if (language === "en") {
    if (normalized === "cancelled") return "Cancelled"
    if (normalized === "confirmed") return "Confirmed"
    if (normalized === "active") return "Active"
    if (normalized === "completed") return "Completed"
    return status
  }

  if (normalized === "cancelled") return "Ακυρωμένη"
  if (normalized === "confirmed") return "Επιβεβαιωμένη"
  if (normalized === "active") return "Ενεργή"
  if (normalized === "completed") return "Ολοκληρωμένη"
  return status
}

function getSyncStatusLabel(
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

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { language } = useAppLanguage()
  const texts = getBookingsModuleTexts(language)
  const locale = language === "en" ? "en-GB" : "el-GR"

  const bookingId = String(params.id)

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [taskType, setTaskType] = useState("cleaning")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [alertEnabled, setAlertEnabled] = useState(false)
  const [alertAt, setAlertAt] = useState("")

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, language])

  async function createTask() {
    setSubmitting(true)

    try {
      if (alertEnabled && !alertAt) {
        throw new Error(
          language === "en"
            ? "Please set the alert time."
            : "Πρέπει να ορίσεις ώρα alert."
        )
      }

      const response = await fetch(`/api/bookings/${bookingId}/create-task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskType,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          alertEnabled,
          alertAt: alertEnabled ? alertAt : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || texts.detail.taskCreateError)
      }

      setTitle("")
      setDescription("")
      setAlertEnabled(false)
      setAlertAt("")
      await loadBooking()
      alert(texts.detail.taskCreateSuccess)
    } catch (error) {
      alert(error instanceof Error ? error.message : texts.detail.taskCreateError)
    } finally {
      setSubmitting(false)
    }
  }

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
              {getSourcePlatformLabel(booking.sourcePlatform)}
            </span>
            <span className={getBadgeClassName("neutral")}>
              {getBookingStatusLabel(booking.status, language)}
            </span>
            <span className={syncBadgeClass}>
              {getSyncStatusLabel(booking.syncStatus, booking.needsMapping, language)}
            </span>
          </div>

          <div className="mt-3 text-sm text-slate-600">
            {texts.detail.bookingInfoLine}: {getSourcePlatformLabel(booking.sourcePlatform)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/bookings"
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
          >
            {texts.common.backToBookings}
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">
              {texts.detail.detailsCard}
            </h2>

            <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
              <div>
                {texts.labels.bookingCode}: {booking.externalBookingId}
              </div>
              <div>
                {texts.labels.listingId}: {booking.externalListingId || texts.common.noValue}
              </div>
              <div>
                {texts.labels.guest}: {booking.guestName || texts.common.noValue}
              </div>
              <div>
                {texts.labels.phone}: {booking.guestPhone || texts.common.noValue}
              </div>
              <div>
                {texts.labels.email}: {booking.guestEmail || texts.common.noValue}
              </div>
              <div>
                {texts.labels.checkIn}: {formatDate(booking.checkInDate, locale)}
                {formatTime(booking.checkInTime)
                  ? ` · ${formatTime(booking.checkInTime)}`
                  : ""}
              </div>
              <div>
                {texts.labels.checkOut}: {formatDate(booking.checkOutDate, locale)}
                {formatTime(booking.checkOutTime)
                  ? ` · ${formatTime(booking.checkOutTime)}`
                  : ""}
              </div>
              <div>
                {texts.labels.mapping}:{" "}
                {booking.needsMapping
                  ? texts.detail.pendingMapping
                  : texts.detail.completedMapping}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">
              {texts.detail.propertyCard}
            </h2>

            {booking.property ? (
              <div className="space-y-2 text-sm text-slate-700">
                <div className="font-medium text-slate-950">
                  {booking.property.code} · {booking.property.name}
                </div>
                <div>{booking.property.address || texts.common.noValue}</div>
                <div>
                  {booking.property.city || texts.common.noValue}
                  {" · "}
                  {booking.property.region || texts.common.noValue}
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
                      <div className="font-semibold text-slate-950">{task.title}</div>
                      <Link
                        href={`/tasks/${task.id}`}
                        className="text-sm font-medium text-slate-700 underline underline-offset-4"
                      >
                        {texts.common.viewTask}
                      </Link>
                    </div>

                    <div className="mt-2 text-sm text-slate-600">
                      {task.taskType} · {task.status} · {formatDate(task.scheduledDate, locale)}
                      {formatTime(task.scheduledStartTime)
                        ? ` · ${formatTime(task.scheduledStartTime)}`
                        : ""}
                    </div>

                    {task.alertEnabled && task.alertAt ? (
                      <div className="mt-2 text-sm text-blue-700">
                        {texts.labels.alerts}: {formatDateTime(task.alertAt, locale)}
                      </div>
                    ) : null}

                    {task.assignments.length > 0 && (
                      <div className="mt-4 space-y-2 text-sm text-slate-700">
                        {task.assignments.map((assignment) => (
                          <div key={assignment.id}>
                            {texts.detail.assignmentPrefix}: {assignment.partner.name} ·{" "}
                            {assignment.status}
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
                    <div className="font-semibold text-slate-950">{event.eventType}</div>
                    <div className="mt-1 text-slate-600">
                      {event.resultStatus || texts.common.noValue}
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
              {texts.detail.createTaskCard}
            </h2>

            {booking.needsMapping ? (
              <div className="text-sm text-slate-500">{texts.detail.mappingPending}</div>
            ) : booking.status.toLowerCase() === "cancelled" ? (
              <div className="text-sm text-slate-500">{texts.detail.cancelledNoTask}</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.taskType}
                  </label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                  >
                    <option value="cleaning">{texts.modal.taskTypes.cleaning}</option>
                    <option value="inspection">{texts.modal.taskTypes.inspection}</option>
                    <option value="maintenance">{texts.modal.taskTypes.maintenance}</option>
                    <option value="custom">{texts.modal.taskTypes.custom}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.titleLabel}
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={texts.modal.titlePlaceholder}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.descriptionLabel}
                  </label>
                  <textarea
                    className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={texts.modal.descriptionPlaceholder}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div>
                    <div className="text-sm font-medium text-slate-700">
                      {texts.modal.alertTitle}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {texts.modal.alertDescription}
                    </div>
                  </div>

                  <label className="flex items-center gap-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={alertEnabled}
                      onChange={(e) => {
                        setAlertEnabled(e.target.checked)
                        if (!e.target.checked) setAlertAt("")
                      }}
                    />
                    {texts.modal.alertEnabled}
                  </label>

                  {alertEnabled ? (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        {texts.modal.alertAt}
                      </label>
                      <input
                        type="datetime-local"
                        value={alertAt}
                        onChange={(e) => setAlertAt(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      />
                    </div>
                  ) : null}
                </div>

                <button
                  className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={submitting}
                  onClick={createTask}
                >
                  {submitting ? texts.common.creating : texts.common.createTask}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}