"use client"

import Link from "next/link"
import type {
  PropertyPageDayStatusBlocker,
  PropertyPageDayStatusBooking,
  PropertyPageDayStatusResult,
  PropertyPageDayStatusTask,
} from "@/lib/properties/property-day-status"

type PropertyDayViewProps = {
  propertyId: string
  propertyName: string
  language?: "el" | "en"
  dayStatus: PropertyPageDayStatusResult
  bookingsHref?: string
  tasksHref?: string
  createManualTaskHref?: string
  createBookingTaskHref?: string
}

function formatDateTime(value: string | Date | null | undefined, language: "el" | "en") {
  if (!value) return language === "en" ? "—" : "—"

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return language === "en" ? "—" : "—"

  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "el-GR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatBookingWindow(
  booking: PropertyPageDayStatusBooking | null,
  language: "el" | "en"
) {
  if (!booking) return language === "en" ? "—" : "—"

  const checkIn = formatDateTime(booking.checkInDate, language)
  const checkOut = formatDateTime(booking.checkOutDate, language)

  return language === "en"
    ? `${checkIn} → ${checkOut}`
    : `${checkIn} → ${checkOut}`
}

function getStatusTone(status: PropertyPageDayStatusResult["status"]) {
  switch (status) {
    case "HAS_GUESTS":
      return "bg-blue-50 text-blue-700 ring-blue-200"
    case "PENDING_BOOKING_TASK_CREATION":
      return "bg-red-50 text-red-700 ring-red-200"
    case "WAITING_ACCEPTANCE":
      return "bg-amber-50 text-amber-700 ring-amber-200"
    case "ACCEPTED":
      return "bg-violet-50 text-violet-700 ring-violet-200"
    case "REJECTED":
      return "bg-red-50 text-red-700 ring-red-200"
    case "IN_PROGRESS":
      return "bg-sky-50 text-sky-700 ring-sky-200"
    case "EXECUTED":
      return "bg-slate-100 text-slate-700 ring-slate-200"
    case "READY":
    default:
      return "bg-emerald-50 text-emerald-700 ring-emerald-200"
  }
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function BookingRow({
  label,
  booking,
  language,
}: {
  label: string
  booking: PropertyPageDayStatusBooking | null
  language: "el" | "en"
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">
        {booking?.guestName || (language === "en" ? "No guest name" : "Χωρίς όνομα φιλοξενούμενου")}
      </p>
      <p className="mt-1 text-sm text-slate-600">{formatBookingWindow(booking, language)}</p>
    </div>
  )
}

function TaskSummary({
  task,
  language,
}: {
  task: PropertyPageDayStatusTask | null
  language: "el" | "en"
}) {
  if (!task) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
        {language === "en"
          ? "There is no related task for the current operational state."
          : "Δεν υπάρχει σχετική εργασία για την τρέχουσα επιχειρησιακή κατάσταση."}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-base font-semibold text-slate-950">{task.title}</p>
        {task.source ? (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            {task.source === "booking"
              ? language === "en"
                ? "From booking"
                : "Από κράτηση"
              : language === "en"
                ? "Manual"
                : "Χειροκίνητη"}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {language === "en" ? "Task status" : "Κατάσταση εργασίας"}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">{task.status || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {language === "en" ? "Assignment" : "Ανάθεση"}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">{task.latestAssignmentStatus || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {language === "en" ? "Scheduled" : "Προγραμματισμός"}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {formatDateTime(task.scheduledDate, language)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {language === "en" ? "Completed" : "Ολοκλήρωση"}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {formatDateTime(task.completedAt, language)}
          </p>
        </div>
      </div>
    </div>
  )
}

function BlockersList({
  blockers,
  language,
}: {
  blockers: PropertyPageDayStatusBlocker[]
  language: "el" | "en"
}) {
  if (!blockers.length) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-medium text-emerald-700">
        {language === "en"
          ? "There are no active blockers for this property."
          : "Δεν υπάρχουν ενεργά εμπόδια για αυτό το ακίνητο."}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {blockers.map((blocker, index) => (
        <div
          key={`${blocker.type}-${index}`}
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {blocker.message}
        </div>
      ))}
    </div>
  )
}

export default function PropertyDayView({
  propertyId,
  propertyName,
  language = "el",
  dayStatus,
  bookingsHref,
  tasksHref,
  createManualTaskHref,
  createBookingTaskHref,
}: PropertyDayViewProps) {
  const topTone = getStatusTone(dayStatus.status)

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{propertyName}</h1>
              <span className={`inline-flex rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ${topTone}`}>
                {dayStatus.label[language]}
              </span>
            </div>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{dayStatus.reason[language]}</p>

            {dayStatus.alertActive && dayStatus.alertTask ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <strong>{language === "en" ? "Alert:" : "Προειδοποίηση:"}</strong>{" "}
                {dayStatus.alertTask.title} · {formatDateTime(dayStatus.alertTask.alertAt, language)}
              </div>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[280px]">
            {bookingsHref ? (
              <Link
                href={bookingsHref}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {language === "en" ? "View property bookings" : "Προβολή κρατήσεων ακινήτου"}
              </Link>
            ) : null}

            {tasksHref ? (
              <Link
                href={tasksHref}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {language === "en" ? "View property tasks" : "Προβολή εργασιών ακινήτου"}
              </Link>
            ) : null}

            {dayStatus.status === "HAS_GUESTS" && createManualTaskHref ? (
              <Link
                href={createManualTaskHref}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {language === "en" ? "New manual task" : "Νέα χειροκίνητη εργασία"}
              </Link>
            ) : null}

            {dayStatus.status === "PENDING_BOOKING_TASK_CREATION" && createBookingTaskHref ? (
              <Link
                href={createBookingTaskHref}
                className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
              >
                {language === "en"
                  ? "Create task from booking"
                  : "Δημιουργία εργασίας από την κράτηση"}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title={language === "en" ? "Stay and operational window" : "Κύκλος διαμονής και επιχειρησιακό παράθυρο"}>
          <div className="grid gap-4 md:grid-cols-2">
            <BookingRow
              label={language === "en" ? "Active stay" : "Ενεργή διαμονή"}
              booking={dayStatus.activeStayBooking}
              language={language}
            />
            <BookingRow
              label={language === "en" ? "Next check-in" : "Επόμενο check-in"}
              booking={dayStatus.nextCheckInBooking}
              language={language}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">
              {language === "en" ? "Turnover source booking" : "Κράτηση που άνοιξε το παράθυρο"}
            </p>
            <p className="mt-1">
              {dayStatus.turnoverSourceBooking
                ? `${dayStatus.turnoverSourceBooking.guestName || "—"} · ${formatBookingWindow(dayStatus.turnoverSourceBooking, language)}`
                : language === "en"
                  ? "There is no active turnover window right now."
                  : "Δεν υπάρχει ενεργό turnover παράθυρο αυτή τη στιγμή."}
            </p>
          </div>
        </SectionCard>

        <SectionCard title={language === "en" ? "Primary task now" : "Κύρια εργασία της στιγμής"}>
          <TaskSummary task={dayStatus.primaryTask || dayStatus.manualOpenTask} language={language} />
        </SectionCard>
      </div>

      <SectionCard title={language === "en" ? "Readiness blockers" : "Εμπόδια ετοιμότητας"}>
        <BlockersList blockers={dayStatus.blockers} language={language} />
      </SectionCard>

      <div className="hidden text-xs text-slate-400">{propertyId}</div>
    </div>
  )
}
