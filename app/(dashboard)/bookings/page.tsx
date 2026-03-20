"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { getBookingsModuleTexts } from "@/lib/i18n/translations"

type BookingTask = {
  id: string
  title: string
  taskType: string
  status: string
  source: string
  priority: string
  scheduledDate: string
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  dueDate?: string | null
  alertEnabled: boolean
  alertAt?: string | null
  createdAt: string
}

type BookingRow = {
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
    status?: string | null
  } | null
  tasks: BookingTask[]
}

type FilterKey =
  | "all"
  | "active"
  | "withoutTasks"
  | "withTasks"
  | "needsMapping"
  | "cancelled"
  | "todayCheckout"
  | "next3Days"

type TaskCreateModalState = {
  open: boolean
  booking: BookingRow | null
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

function toDateInputValue(value?: string | null) {
  if (!value || !isValidDate(value)) return ""
  return new Date(value).toISOString().slice(0, 10)
}

function toDateTimeLocalValue(
  dateString?: string | null,
  timeString?: string | null
) {
  if (!dateString || !isValidDate(dateString)) return ""
  const base = new Date(dateString).toISOString().slice(0, 10)
  const time = formatTime(timeString)
  return `${base}T${time || "09:00"}`
}

function getTodayDateOnly() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getDateOnly(value: string) {
  const date = new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isCancelledBooking(status: string) {
  return status.toLowerCase() === "cancelled"
}

function isActiveBooking(booking: BookingRow) {
  return !isCancelledBooking(booking.status)
}

function getSourcePlatformLabel(sourcePlatform: string) {
  const normalized = sourcePlatform.trim().toUpperCase()

  if (normalized === "AIRBNB") return "Airbnb"
  if (normalized === "BOOKING_COM") return "Booking.com"
  if (normalized === "VRBO") return "VRBO"

  return sourcePlatform
}

function getSyncLabel(
  syncStatus: string,
  needsMapping: boolean,
  texts: ReturnType<typeof getBookingsModuleTexts>
) {
  if (syncStatus === "CANCELLED") return texts.statuses.cancelled
  if (needsMapping) return texts.statuses.needsMapping
  if (syncStatus === "READY_FOR_ACTION") return texts.statuses.readyForAction
  if (syncStatus === "ERROR") return texts.statuses.error
  if (syncStatus === "PENDING_MATCH") return texts.statuses.pendingMatch
  return syncStatus
}

function getTaskSummaryLabel(
  tasks: BookingTask[],
  language: "el" | "en",
  texts: ReturnType<typeof getBookingsModuleTexts>
) {
  if (tasks.length === 0) return texts.statuses.noTask

  if (language === "en") {
    return tasks.length === 1 ? "1 task" : `${tasks.length} tasks`
  }

  return tasks.length === 1 ? "1 εργασία" : `${tasks.length} εργασίες`
}

function buildStayLine(
  booking: BookingRow,
  locale: string,
  texts: ReturnType<typeof getBookingsModuleTexts>
) {
  const checkInDate = formatDate(booking.checkInDate, locale)
  const checkOutDate = formatDate(booking.checkOutDate, locale)
  const checkInTime = formatTime(booking.checkInTime)
  const checkOutTime = formatTime(booking.checkOutTime)

  return [
    `${texts.labels.checkIn}: ${checkInDate}${checkInTime ? ` · ${checkInTime}` : ""}`,
    `${texts.labels.checkOut}: ${checkOutDate}${checkOutTime ? ` · ${checkOutTime}` : ""}`,
  ].join(texts.list.stayLineSeparator)
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

export default function BookingsPage() {
  const { language } = useAppLanguage()
  const texts = getBookingsModuleTexts(language)
  const locale = language === "en" ? "en-GB" : "el-GR"

  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<FilterKey>("active")
  const [modal, setModal] = useState<TaskCreateModalState>({
    open: false,
    booking: null,
  })
  const [submittingTask, setSubmittingTask] = useState(false)

  const [taskType, setTaskType] = useState("cleaning")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledStartTime, setScheduledStartTime] = useState("")
  const [scheduledEndTime, setScheduledEndTime] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [priority, setPriority] = useState("normal")
  const [notes, setNotes] = useState("")
  const [alertEnabled, setAlertEnabled] = useState(false)
  const [alertAt, setAlertAt] = useState("")
  const [sendCleaningChecklist, setSendCleaningChecklist] = useState(true)
  const [sendSuppliesChecklist, setSendSuppliesChecklist] = useState(true)

  async function loadBookings() {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/bookings", {
        cache: "no-store",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || texts.list.loadError)
      }

      setBookings(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.list.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  function openCreateTaskModal(booking: BookingRow) {
    setTaskType("cleaning")
    setTitle("")
    setDescription("")
    setScheduledDate(toDateInputValue(booking.checkOutDate))
    setScheduledStartTime(formatTime(booking.checkOutTime))
    setScheduledEndTime("")
    setDueDate(toDateInputValue(booking.checkOutDate))
    setPriority("normal")
    setNotes(booking.notes || "")
    setAlertEnabled(false)
    setAlertAt(toDateTimeLocalValue(booking.checkOutDate, booking.checkOutTime))
    setSendCleaningChecklist(true)
    setSendSuppliesChecklist(true)

    setModal({
      open: true,
      booking,
    })
  }

  function closeCreateTaskModal() {
    setModal({
      open: false,
      booking: null,
    })
  }

  async function handleCreateTask() {
    if (!modal.booking) return

    setSubmittingTask(true)

    try {
      const response = await fetch(`/api/bookings/${modal.booking.id}/create-task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          taskType,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          scheduledDate,
          scheduledStartTime: scheduledStartTime || null,
          scheduledEndTime: scheduledEndTime || null,
          dueDate,
          priority,
          notes: notes.trim() || null,
          alertEnabled,
          alertAt: alertEnabled ? alertAt : null,
          sendCleaningChecklist,
          sendSuppliesChecklist,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || texts.list.createTaskError)
      }

      closeCreateTaskModal()
      await loadBookings()
      alert(texts.list.taskCreatedSuccess)
    } catch (err) {
      alert(err instanceof Error ? err.message : texts.list.createTaskError)
    } finally {
      setSubmittingTask(false)
    }
  }

  const counters = useMemo(() => {
    const today = getTodayDateOnly()
    const next3 = new Date(today)
    next3.setDate(next3.getDate() + 3)

    return {
      all: bookings.length,
      active: bookings.filter((booking) => isActiveBooking(booking)).length,
      withoutTasks: bookings.filter(
        (booking) => booking.tasks.length === 0 && isActiveBooking(booking)
      ).length,
      withTasks: bookings.filter(
        (booking) => booking.tasks.length > 0 && isActiveBooking(booking)
      ).length,
      needsMapping: bookings.filter((booking) => booking.needsMapping).length,
      cancelled: bookings.filter((booking) => isCancelledBooking(booking.status)).length,
      todayCheckout: bookings.filter((booking) => {
        const checkout = getDateOnly(booking.checkOutDate)
        return checkout.getTime() === today.getTime()
      }).length,
      next3Days: bookings.filter((booking) => {
        const checkout = getDateOnly(booking.checkOutDate)
        return checkout >= today && checkout <= next3
      }).length,
    }
  }, [bookings])

  const filteredBookings = useMemo(() => {
    const today = getTodayDateOnly()
    const next3 = new Date(today)
    next3.setDate(next3.getDate() + 3)

    const normalizedSearch = search.trim().toLowerCase()

    let result = [...bookings]

    if (activeFilter === "active") {
      result = result.filter((booking) => isActiveBooking(booking))
    }

    if (activeFilter === "withoutTasks") {
      result = result.filter(
        (booking) => booking.tasks.length === 0 && isActiveBooking(booking)
      )
    }

    if (activeFilter === "withTasks") {
      result = result.filter(
        (booking) => booking.tasks.length > 0 && isActiveBooking(booking)
      )
    }

    if (activeFilter === "needsMapping") {
      result = result.filter((booking) => booking.needsMapping)
    }

    if (activeFilter === "cancelled") {
      result = result.filter((booking) => isCancelledBooking(booking.status))
    }

    if (activeFilter === "todayCheckout") {
      result = result.filter((booking) => {
        const checkout = getDateOnly(booking.checkOutDate)
        return checkout.getTime() === today.getTime()
      })
    }

    if (activeFilter === "next3Days") {
      result = result.filter((booking) => {
        const checkout = getDateOnly(booking.checkOutDate)
        return checkout >= today && checkout <= next3
      })
    }

    if (normalizedSearch) {
      result = result.filter((booking) => {
        const haystack = [
          booking.externalBookingId,
          booking.externalListingId,
          booking.externalListingName,
          booking.guestName,
          booking.property?.name,
          booking.property?.code,
          booking.sourcePlatform,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return haystack.includes(normalizedSearch)
      })
    }

    return result
  }, [bookings, activeFilter, search])

  const filterButtons: Array<{
    key: FilterKey
    label: string
    count: number
  }> = [
    { key: "all", label: texts.list.all, count: counters.all },
    { key: "active", label: texts.list.active, count: counters.active },
    {
      key: "withoutTasks",
      label: texts.list.withoutTasks,
      count: counters.withoutTasks,
    },
    { key: "withTasks", label: texts.list.withTasks, count: counters.withTasks },
    {
      key: "needsMapping",
      label: texts.list.needsMapping,
      count: counters.needsMapping,
    },
    { key: "cancelled", label: texts.list.cancelled, count: counters.cancelled },
    {
      key: "todayCheckout",
      label: texts.list.todayCheckout,
      count: counters.todayCheckout,
    },
    {
      key: "next3Days",
      label: texts.list.next3Days,
      count: counters.next3Days,
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {texts.list.title}
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            {texts.list.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/bookings/history"
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
          >
            {texts.list.historyButton}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filterButtons.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveFilter(item.key)}
            className={
              activeFilter === item.key
                ? "rounded-3xl border border-slate-950 bg-slate-950 p-5 text-left text-white shadow-sm transition"
                : "rounded-3xl border border-slate-200 bg-white p-5 text-left text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            }
          >
            <div className="text-sm font-medium opacity-80">{item.label}</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">
              {item.count}
            </div>
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {texts.list.listTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {texts.list.listDescription}
            </p>
          </div>

          <div className="w-full lg:w-[340px]">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              placeholder={texts.common.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">{texts.common.loading}</div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-600">{error}</div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{texts.list.noBookings}</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredBookings.map((booking) => {
              const syncBadgeClass = booking.needsMapping
                ? getBadgeClassName("warning")
                : isCancelledBooking(booking.status)
                  ? getBadgeClassName("danger")
                  : getBadgeClassName("success")

              const taskBadgeClass =
                booking.tasks.length > 0
                  ? getBadgeClassName("success")
                  : getBadgeClassName("neutral")

              return (
                <article key={booking.id} className="space-y-4 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold text-slate-950">
                          {booking.property?.name ||
                            booking.externalListingName ||
                            booking.externalListingId ||
                            texts.list.propertyNotMapped}
                        </div>

                        <span className={getBadgeClassName("neutral")}>
                          {getSourcePlatformLabel(booking.sourcePlatform)}
                        </span>

                        <span className={syncBadgeClass}>
                          {getSyncLabel(booking.syncStatus, booking.needsMapping, texts)}
                        </span>

                        <span className={taskBadgeClass}>
                          {getTaskSummaryLabel(booking.tasks, language, texts)}
                        </span>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-1">
                        <div>
                          {texts.labels.bookingCode}: {booking.externalBookingId}
                        </div>

                        <div>
                          {texts.labels.property}:{" "}
                          {booking.property
                            ? `${booking.property.code} · ${booking.property.name}`
                            : texts.list.propertyNotMapped}
                        </div>

                        <div>
                          {texts.labels.guest}: {booking.guestName || texts.common.noValue}
                        </div>

                        <div>{buildStayLine(booking, locale, texts)}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                      >
                        {texts.common.view}
                      </Link>

                      <button
                        type="button"
                        onClick={() => openCreateTaskModal(booking)}
                        disabled={booking.needsMapping || isCancelledBooking(booking.status)}
                        className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {texts.common.createTask}
                      </button>
                    </div>
                  </div>

                  {booking.tasks.length > 0 && (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 text-sm font-semibold text-slate-950">
                        {texts.list.linkedTasks}
                      </div>

                      <div className="space-y-2.5">
                        {booking.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between"
                          >
                            <div className="min-w-0 text-sm">
                              <div className="font-semibold text-slate-950">
                                {task.title}
                              </div>
                              <div className="mt-1 text-slate-600">
                                {task.taskType} · {task.status} ·{" "}
                                {formatDate(task.scheduledDate, locale)}
                                {formatTime(task.scheduledStartTime)
                                  ? ` · ${formatTime(task.scheduledStartTime)}`
                                  : ""}
                                {task.alertEnabled && task.alertAt
                                  ? ` · ${texts.labels.alerts}: ${formatDateTime(
                                      task.alertAt,
                                      locale
                                    )}`
                                  : ""}
                              </div>
                            </div>

                            <Link
                              href={`/tasks/${task.id}`}
                              className="text-sm font-medium text-slate-700 underline underline-offset-4"
                            >
                              {texts.common.viewTask}
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {modal.open && modal.booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  {texts.modal.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {modal.booking.property?.name ||
                    modal.booking.externalListingName ||
                    modal.booking.externalBookingId}
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateTaskModal}
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {texts.common.close}
              </button>
            </div>

            <div className="space-y-6 p-5">
              <div className="grid gap-4 md:grid-cols-2">
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
                    {texts.modal.priority}
                  </label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="low">{texts.modal.priorities.low}</option>
                    <option value="normal">{texts.modal.priorities.normal}</option>
                    <option value="high">{texts.modal.priorities.high}</option>
                    <option value="urgent">{texts.modal.priorities.urgent}</option>
                  </select>
                </div>

                <div className="md:col-span-2">
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

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.descriptionLabel}
                  </label>
                  <textarea
                    className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={texts.modal.descriptionPlaceholder}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.scheduledDate}
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.dueDate}
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.scheduledStartTime}
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    value={scheduledStartTime}
                    onChange={(e) => setScheduledStartTime(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.modal.scheduledEndTime}
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    value={scheduledEndTime}
                    onChange={(e) => setScheduledEndTime(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-950">
                        {texts.modal.alertTitle}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {texts.modal.alertDescription}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={alertEnabled}
                        onChange={(e) => setAlertEnabled(e.target.checked)}
                      />
                      {texts.modal.alertEnabled}
                    </label>
                  </div>

                  {alertEnabled && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        {texts.modal.alertAt}
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                        value={alertAt}
                        onChange={(e) => setAlertAt(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 font-semibold text-slate-950">
                    {texts.modal.checklistsTitle}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={sendCleaningChecklist}
                        onChange={(e) => setSendCleaningChecklist(e.target.checked)}
                      />
                      {texts.modal.sendCleaningChecklist}
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={sendSuppliesChecklist}
                        onChange={(e) => setSendSuppliesChecklist(e.target.checked)}
                      />
                      {texts.modal.sendSuppliesChecklist}
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {texts.common.internalNotes}
                  </label>
                  <textarea
                    className="min-h-[100px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={texts.modal.notesPlaceholder}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={closeCreateTaskModal}
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {texts.common.cancel}
              </button>

              <button
                type="button"
                onClick={handleCreateTask}
                disabled={submittingTask}
                className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submittingTask ? texts.common.creating : texts.common.createTask}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}