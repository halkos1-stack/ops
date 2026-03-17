"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

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

function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("el-GR")
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("el-GR", {
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

export default function BookingsHistoryPage() {
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
        throw new Error(data?.error || "Αποτυχία φόρτωσης ιστορικού κρατήσεων.")
      }

      setBookings(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Αποτυχία φόρτωσης ιστορικού κρατήσεων.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

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

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ιστορικό κρατήσεων</h1>
          <p className="mt-1 text-sm text-gray-500">
            Πλήρης εικόνα κατάστασης κρατήσεων, σύνδεσης με ακίνητα και συνδεδεμένων εργασιών.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/bookings"
            className="rounded-xl border px-4 py-2 text-sm"
          >
            Επιστροφή στις κρατήσεις
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white">
        <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm"
              onClick={() =>
                setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
            >
              ←
            </button>

            <div className="min-w-[180px] text-center font-medium">
              {getMonthLabel(monthCursor)}
            </div>

            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm"
              onClick={() =>
                setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
            >
              →
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-xl border px-4 py-2 text-sm ${statusFilter === "all" ? "bg-black text-white" : ""}`}
            >
              Όλες
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`rounded-xl border px-4 py-2 text-sm ${statusFilter === "active" ? "bg-black text-white" : ""}`}
            >
              Ενεργές
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("cancelled")}
              className={`rounded-xl border px-4 py-2 text-sm ${statusFilter === "cancelled" ? "bg-black text-white" : ""}`}
            >
              Ακυρωμένες
            </button>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="rounded-xl border px-4 py-2 text-sm"
            >
              Καθαρισμός ημέρας
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-gray-500">
          {["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"].map((label) => (
            <div key={label} className="border-r px-2 py-3 last:border-r-0">
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
                className={`min-h-[120px] border-r border-b p-2 text-left last:border-r-0 ${
                  isSelected ? "bg-black text-white" : "bg-white"
                }`}
              >
                <div className={`text-sm font-medium ${!isCurrentMonth ? "opacity-40" : ""}`}>
                  {day.getDate()}
                </div>

                <div className="mt-2 space-y-1 text-xs">
                  {checkIns > 0 && <div>Αφίξεις: {checkIns}</div>}
                  {checkOuts > 0 && <div>Αναχωρήσεις: {checkOuts}</div>}
                  {dayBookings.length > 0 && <div>Κρατήσεις: {dayBookings.length}</div>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border bg-white">
        <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-medium">Αναλυτική λίστα</h2>
            <p className="mt-1 text-sm text-gray-500">
              {selectedDay
                ? `Φιλτραρισμένη ημέρα: ${selectedDay.toLocaleDateString("el-GR")}`
                : "Όλες οι κρατήσεις"}
            </p>
          </div>

          <div className="w-full lg:w-[320px]">
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Αναζήτηση κρατήσεων..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Φόρτωση...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">Δεν βρέθηκαν κρατήσεις.</div>
        ) : (
          <div className="divide-y">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="flex flex-col gap-4 p-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                  <div className="text-lg font-semibold">
                    {booking.property?.name || booking.externalListingName || booking.externalListingId || "Χωρίς αντιστοίχιση"}
                  </div>

                  <div className="text-sm text-gray-600">
                    Κωδικός: {booking.externalBookingId}
                  </div>

                  <div className="text-sm text-gray-600">
                    Επισκέπτης: {booking.guestName || "-"}
                  </div>

                  <div className="text-sm text-gray-600">
                    Check-in: {formatDate(booking.checkInDate)} | Check-out: {formatDate(booking.checkOutDate)}
                  </div>

                  <div className="text-sm text-gray-600">
                    Κατάσταση: {booking.status} | OPS: {booking.syncStatus} | Εργασίες: {booking.tasks.length}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="rounded-xl border px-4 py-2 text-sm"
                  >
                    Προβολή
                  </Link>

                  {booking.tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="rounded-xl border px-4 py-2 text-sm"
                    >
                      Εργασία: {task.taskType}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}