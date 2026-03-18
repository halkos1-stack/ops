"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { getBookingsModuleTexts } from "../../../translations"

type BookingTask = {
  id: string
  title: string
  taskType: string
  status: string
}

type BookingRow = {
  id: string
  sourcePlatform: string
  externalBookingId: string
  externalListingId?: string | null
  externalListingName?: string | null
  guestName?: string | null
  checkInDate: string
  checkOutDate: string
  status: string
  syncStatus: string
  needsMapping: boolean
  property?: {
    id: string
    code: string
    name: string
  } | null
  tasks: BookingTask[]
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString(locale)
}

function getMonthLabel(date: Date, locale: string) {
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  })
}

function buildMonthDays(cursor: Date) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const start = new Date(firstDay)
  const dayOfWeek = (firstDay.getDay() + 6) % 7
  start.setDate(firstDay.getDate() - dayOfWeek)

  const end = new Date(lastDay)
  const endDayOfWeek = (lastDay.getDay() + 6) % 7
  end.setDate(lastDay.getDate() + (6 - endDayOfWeek))

  const days: Date[] = []
  const current = new Date(start)

  while (current <= end) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return days
}

function sameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function parseDateOnly(value: string) {
  const date = new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getWeekdayLabels(language: "el" | "en") {
  return language === "en"
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"]
}

function getSourcePlatformLabel(sourcePlatform: string) {
  const normalized = sourcePlatform.trim().toUpperCase()

  if (normalized === "AIRBNB") return "Airbnb"
  if (normalized === "BOOKING_COM") return "Booking.com"
  if (normalized === "VRBO") return "VRBO"

  return sourcePlatform
}

export default function BookingsHistoryPage() {
  const { language } = useAppLanguage()
  const texts = getBookingsModuleTexts(language)
  const locale = language === "en" ? "en-GB" : "el-GR"

  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [monthCursor, setMonthCursor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cancelled">("all")

  async function loadBookings() {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/bookings", { cache: "no-store" })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || texts.history.loadError)
      }

      setBookings(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.history.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  const calendarDays = useMemo(() => buildMonthDays(monthCursor), [monthCursor])

  const filteredBookings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return bookings.filter((booking) => {
      if (statusFilter === "active" && booking.status === "cancelled") {
        return false
      }

      if (statusFilter === "cancelled" && booking.status !== "cancelled") {
        return false
      }

      if (selectedDay) {
        const bookingCheckIn = parseDateOnly(booking.checkInDate)
        const bookingCheckOut = parseDateOnly(booking.checkOutDate)

        if (
          !sameDate(bookingCheckIn, selectedDay) &&
          !sameDate(bookingCheckOut, selectedDay)
        ) {
          return false
        }
      }

      if (normalizedSearch) {
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

        if (!haystack.includes(normalizedSearch)) {
          return false
        }
      }

      return true
    })
  }, [bookings, search, selectedDay, statusFilter])

  const monthBookingsMap = useMemo(() => {
    const map = new Map<string, BookingRow[]>()

    for (const booking of bookings) {
      const checkIn = parseDateOnly(booking.checkInDate)
      const checkOut = parseDateOnly(booking.checkOutDate)

      const inKey = checkIn.toISOString().slice(0, 10)
      const outKey = checkOut.toISOString().slice(0, 10)

      if (!map.has(inKey)) map.set(inKey, [])
      if (!map.has(outKey)) map.set(outKey, [])

      map.get(inKey)!.push(booking)
      if (outKey !== inKey) {
        map.get(outKey)!.push(booking)
      }
    }

    return map
  }, [bookings])

  const weekdayLabels = getWeekdayLabels(language)

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {texts.history.title}
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            {texts.history.description}
          </p>
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

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() =>
                setMonthCursor(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                )
              }
            >
              ←
            </button>

            <div className="min-w-[190px] text-center text-base font-semibold text-slate-950">
              {getMonthLabel(monthCursor, locale)}
            </div>

            <button
              type="button"
              className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() =>
                setMonthCursor(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                )
              }
            >
              →
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={
                statusFilter === "all"
                  ? "rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                  : "rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              }
            >
              {texts.history.all}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={
                statusFilter === "active"
                  ? "rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                  : "rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              }
            >
              {texts.history.active}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("cancelled")}
              className={
                statusFilter === "cancelled"
                  ? "rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                  : "rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              }
            >
              {texts.history.cancelled}
            </button>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {texts.history.clearDay}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
          {weekdayLabels.map((label) => (
            <div key={label} className="border-r border-slate-200 px-2 py-3 last:border-r-0">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const key = day.toISOString().slice(0, 10)
            const dayBookings = monthBookingsMap.get(key) || []
            const isCurrentMonth = day.getMonth() === monthCursor.getMonth()
            const isSelected = selectedDay ? sameDate(day, selectedDay) : false

            const checkIns = dayBookings.filter((booking) =>
              sameDate(parseDateOnly(booking.checkInDate), day)
            ).length

            const checkOuts = dayBookings.filter((booking) =>
              sameDate(parseDateOnly(booking.checkOutDate), day)
            ).length

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={
                  isSelected
                    ? "min-h-[126px] border-r border-b border-slate-200 bg-slate-950 p-3 text-left text-white last:border-r-0"
                    : "min-h-[126px] border-r border-b border-slate-200 bg-white p-3 text-left text-slate-900 transition hover:bg-slate-50 last:border-r-0"
                }
              >
                <div className={`text-sm font-semibold ${!isCurrentMonth ? "opacity-40" : ""}`}>
                  {day.getDate()}
                </div>

                <div className="mt-3 space-y-1 text-xs">
                  {checkIns > 0 && <div>{texts.history.arrivals}: {checkIns}</div>}
                  {checkOuts > 0 && <div>{texts.history.departures}: {checkOuts}</div>}
                  {dayBookings.length > 0 && (
                    <div>{texts.history.bookings}: {dayBookings.length}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {texts.history.detailsTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {selectedDay
                ? `${texts.history.filteredDayPrefix}: ${selectedDay.toLocaleDateString(locale)}`
                : texts.history.allBookings}
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
          <div className="p-6 text-sm text-slate-500">{texts.history.noHistory}</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredBookings.map((booking) => (
              <article
                key={booking.id}
                className="flex flex-col gap-4 p-5 xl:flex-row xl:items-start xl:justify-between"
              >
                <div className="space-y-2">
                  <div className="text-lg font-semibold text-slate-950">
                    {booking.property?.name ||
                      booking.externalListingName ||
                      booking.externalListingId ||
                      texts.list.propertyNotMapped}
                  </div>

                  <div className="text-sm text-slate-600">
                    {texts.labels.bookingCode}: {booking.externalBookingId}
                  </div>

                  <div className="text-sm text-slate-600">
                    {texts.labels.guest}: {booking.guestName || texts.common.noValue}
                  </div>

                  <div className="text-sm text-slate-600">
                    {texts.labels.checkIn}: {formatDate(booking.checkInDate, locale)}
                    {" | "}
                    {texts.labels.checkOut}: {formatDate(booking.checkOutDate, locale)}
                  </div>

                  <div className="text-sm text-slate-600">
                    {texts.labels.source}: {getSourcePlatformLabel(booking.sourcePlatform)}
                    {" | "}
                    {texts.labels.opsStatus}: {booking.syncStatus}
                    {" | "}
                    {texts.list.withTasks}: {booking.tasks.length}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    {texts.common.view}
                  </Link>

                  {booking.tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                    >
                      {texts.history.taskPrefix}: {task.taskType}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}