"use client"

import { useEffect, useMemo, useState } from "react"

type Property = {
  id: string
  code: string
  name: string
}

type Booking = {
  id: string
  sourcePlatform: string
  externalBookingId: string | null
  guestName: string | null
  guestPhone: string | null
  guestEmail: string | null
  checkInDate: string
  checkOutDate: string
  checkInTime: string | null
  checkOutTime: string | null
  adults: number | null
  children: number | null
  infants: number | null
  status: string
  notes: string | null
  property: Property
  createdAt: string
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [properties, setProperties] = useState<Property[]>([])

  const [propertyId, setPropertyId] = useState("")
  const [sourcePlatform, setSourcePlatform] = useState("manual")
  const [externalBookingId, setExternalBookingId] = useState("")
  const [guestName, setGuestName] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [checkInDate, setCheckInDate] = useState("")
  const [checkOutDate, setCheckOutDate] = useState("")
  const [checkInTime, setCheckInTime] = useState("")
  const [checkOutTime, setCheckOutTime] = useState("")
  const [adults, setAdults] = useState("1")
  const [children, setChildren] = useState("0")
  const [infants, setInfants] = useState("0")
  const [status, setStatus] = useState("confirmed")
  const [notes, setNotes] = useState("")
  const [search, setSearch] = useState("")

  const [loadingBookings, setLoadingBookings] = useState(true)
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function loadBookings() {
    try {
      setLoadingBookings(true)

      const res = await fetch("/api/bookings", {
        cache: "no-store",
      })

      if (!res.ok) {
        throw new Error("Αποτυχία φόρτωσης κρατήσεων")
      }

      const data = await res.json()
      setBookings(data)
    } catch (err) {
      console.error("Load bookings error:", err)
      setError("Δεν ήταν δυνατή η φόρτωση των κρατήσεων.")
    } finally {
      setLoadingBookings(false)
    }
  }

  async function loadProperties() {
    try {
      setLoadingProperties(true)

      const res = await fetch("/api/properties", {
        cache: "no-store",
      })

      if (!res.ok) {
        throw new Error("Αποτυχία φόρτωσης ακινήτων")
      }

      const data = await res.json()
      setProperties(data)
    } catch (err) {
      console.error("Load properties error:", err)
      setError("Δεν ήταν δυνατή η φόρτωση των ακινήτων.")
    } finally {
      setLoadingProperties(false)
    }
  }

  async function handleCreateBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setError("")
    setSuccess("")

    if (!propertyId || !sourcePlatform || !checkInDate || !checkOutDate) {
      setError("Συμπλήρωσε τα υποχρεωτικά πεδία κράτησης.")
      return
    }

    try {
      setSubmitting(true)

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId,
          sourcePlatform,
          externalBookingId: externalBookingId.trim(),
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestEmail: guestEmail.trim(),
          checkInDate,
          checkOutDate,
          checkInTime,
          checkOutTime,
          adults,
          children,
          infants,
          status,
          notes: notes.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία δημιουργίας κράτησης")
      }

      setPropertyId("")
      setSourcePlatform("manual")
      setExternalBookingId("")
      setGuestName("")
      setGuestPhone("")
      setGuestEmail("")
      setCheckInDate("")
      setCheckOutDate("")
      setCheckInTime("")
      setCheckOutTime("")
      setAdults("1")
      setChildren("0")
      setInfants("0")
      setStatus("confirmed")
      setNotes("")
      setSuccess("Η κράτηση δημιουργήθηκε επιτυχώς.")

      await loadBookings()
    } catch (err) {
      console.error("Create booking error:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Δεν ήταν δυνατή η δημιουργία της κράτησης."
      )
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadBookings()
    loadProperties()
  }, [])

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return bookings

    return bookings.filter((booking) => {
      return (
        booking.property.name.toLowerCase().includes(query) ||
        booking.property.code.toLowerCase().includes(query) ||
        (booking.externalBookingId || "").toLowerCase().includes(query) ||
        (booking.guestName || "").toLowerCase().includes(query) ||
        booking.sourcePlatform.toLowerCase().includes(query)
      )
    })
  }, [bookings, search])

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Κρατήσεις
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Διαχείριση κρατήσεων από πλατφόρμες και χειροκίνητες καταχωρήσεις.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Δημιουργία κράτησης
          </h2>
        </div>

        <form
          onSubmit={handleCreateBooking}
          className="grid grid-cols-1 gap-4 lg:grid-cols-12"
        >
          <div className="lg:col-span-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ακίνητο
            </label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              disabled={loadingProperties}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Επίλεξε ακίνητο</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.code} - {property.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Πλατφόρμα
            </label>
            <select
              value={sourcePlatform}
              onChange={(e) => setSourcePlatform(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="manual">Χειροκίνητη</option>
              <option value="airbnb">Airbnb</option>
              <option value="booking">Booking.com</option>
              <option value="vrbo">VRBO</option>
              <option value="direct">Άμεση κράτηση</option>
            </select>
          </div>

          <div className="lg:col-span-5">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Εξωτερικός κωδικός κράτησης
            </label>
            <input
              type="text"
              value={externalBookingId}
              onChange={(e) => setExternalBookingId(e.target.value)}
              placeholder="π.χ. AIR-548722"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Όνομα επισκέπτη
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="π.χ. John Smith"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Τηλέφωνο
            </label>
            <input
              type="text"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="π.χ. +30..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="π.χ. guest@email.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Check-in
            </label>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Check-out
            </label>
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ώρα άφιξης
            </label>
            <input
              type="time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ώρα αναχώρησης
            </label>
            <input
              type="time"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ενήλικες
            </label>
            <input
              type="number"
              value={adults}
              onChange={(e) => setAdults(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Παιδιά
            </label>
            <input
              type="number"
              value={children}
              onChange={(e) => setChildren(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Βρέφη
            </label>
            <input
              type="number"
              value={infants}
              onChange={(e) => setInfants(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Κατάσταση
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="confirmed">Επιβεβαιωμένη</option>
              <option value="pending">Σε αναμονή</option>
              <option value="cancelled">Ακυρωμένη</option>
              <option value="completed">Ολοκληρωμένη</option>
            </select>
          </div>

          <div className="lg:col-span-12">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Σημειώσεις
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Εσωτερικές σημειώσεις για την κράτηση"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="lg:col-span-12">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Αποθήκευση..." : "Δημιουργία κράτησης"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Λίστα κρατήσεων
            </h2>
          </div>

          <div className="w-full md:w-80">
            <input
              type="text"
              placeholder="Αναζήτηση κρατήσεων..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Ακίνητο
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Πλατφόρμα
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Κωδικός
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Επισκέπτης
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Check-in
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Check-out
                </th>
              </tr>
            </thead>

            <tbody>
              {loadingBookings ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-sm text-slate-500">
                    Φόρτωση κρατήσεων...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    Δεν υπάρχουν ακόμη κρατήσεις.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {booking.property.code} - {booking.property.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {booking.sourcePlatform}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {booking.externalBookingId || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {booking.guestName || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {new Date(booking.checkInDate).toLocaleDateString("el-GR")}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {new Date(booking.checkOutDate).toLocaleDateString("el-GR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}