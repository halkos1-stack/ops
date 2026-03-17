"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

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

function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("el-GR")
}

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const bookingId = String(params.id)

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [taskType, setTaskType] = useState("cleaning")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  async function loadBooking() {
    setLoading(true)
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, { cache: "no-store" })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Αποτυχία φόρτωσης κράτησης.")
      }

      setBooking(data)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Αποτυχία φόρτωσης κράτησης.")
      router.push("/bookings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (bookingId) {
      loadBooking()
    }
  }, [bookingId])

  async function createTask() {
    setSubmitting(true)

    try {
      const response = await fetch(`/api/bookings/${bookingId}/create-task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskType,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Αποτυχία δημιουργίας εργασίας.")
      }

      setTitle("")
      setDescription("")
      await loadBooking()
      alert("Η εργασία δημιουργήθηκε επιτυχώς.")
    } catch (error) {
      alert(error instanceof Error ? error.message : "Αποτυχία δημιουργίας εργασίας.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Φόρτωση...</div>
  }

  if (!booking) {
    return <div className="p-6 text-sm text-gray-500">Η κράτηση δεν βρέθηκε.</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 text-sm text-gray-500">
            <Link href="/bookings" className="underline">
              Κρατήσεις
            </Link>{" "}
            / {booking.externalBookingId}
          </div>
          <h1 className="text-2xl font-semibold">
            {booking.property?.name || booking.externalListingName || booking.externalListingId || "Κράτηση"}
          </h1>
          <div className="mt-2 text-sm text-gray-600">
            Πηγή: {booking.sourcePlatform} · Κατάσταση κράτησης: {booking.status} · Κατάσταση OPS: {booking.syncStatus}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border bg-white p-4">
            <h2 className="mb-4 font-medium">Στοιχεία κράτησης</h2>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div>Κωδικός κράτησης: {booking.externalBookingId}</div>
              <div>Listing ID: {booking.externalListingId || "-"}</div>
              <div>Επισκέπτης: {booking.guestName || "-"}</div>
              <div>Τηλέφωνο: {booking.guestPhone || "-"}</div>
              <div>Email: {booking.guestEmail || "-"}</div>
              <div>Check-in: {formatDate(booking.checkInDate)}</div>
              <div>Check-out: {formatDate(booking.checkOutDate)}</div>
              <div>Ώρα check-out: {booking.checkOutTime || "-"}</div>
              <div>Αντιστοίχιση: {booking.needsMapping ? "Εκκρεμεί" : "Ολοκληρωμένη"}</div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <h2 className="mb-4 font-medium">Ακίνητο</h2>
            {booking.property ? (
              <div className="space-y-2 text-sm">
                <div>{booking.property.code} · {booking.property.name}</div>
                <div>{booking.property.address || "-"}</div>
                <div>{booking.property.city || "-"} · {booking.property.region || "-"}</div>
                <Link href={`/properties/${booking.property.id}`} className="underline">
                  Προβολή ακινήτου
                </Link>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Η κράτηση δεν έχει ακόμα αντιστοιχιστεί με ακίνητο.
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <h2 className="mb-4 font-medium">Συνδεδεμένες εργασίες</h2>

            {booking.tasks.length === 0 ? (
              <div className="text-sm text-gray-500">Δεν υπάρχουν ακόμη εργασίες από αυτή την κράτηση.</div>
            ) : (
              <div className="space-y-4">
                {booking.tasks.map((task) => (
                  <div key={task.id} className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{task.title}</div>
                      <Link href={`/tasks/${task.id}`} className="underline text-sm">
                        Προβολή εργασίας
                      </Link>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      {task.taskType} · {task.status} · {formatDate(task.scheduledDate)}
                    </div>

                    {task.assignments.length > 0 && (
                      <div className="mt-3 space-y-2 text-sm">
                        {task.assignments.map((assignment) => (
                          <div key={assignment.id}>
                            Ανάθεση: {assignment.partner.name} · {assignment.status}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <h2 className="mb-4 font-medium">Ιστορικό συγχρονισμών</h2>

            {booking.syncEvents.length === 0 ? (
              <div className="text-sm text-gray-500">Δεν υπάρχει ιστορικό ακόμη.</div>
            ) : (
              <div className="space-y-3">
                {booking.syncEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border p-3 text-sm">
                    <div className="font-medium">{event.eventType}</div>
                    <div className="text-gray-600">{event.resultStatus || "-"}</div>
                    <div className="text-gray-600">{event.message || "-"}</div>
                    <div className="text-gray-500">{formatDate(event.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border bg-white p-4">
            <h2 className="mb-4 font-medium">Νέα εργασία από κράτηση</h2>

            {booking.needsMapping ? (
              <div className="text-sm text-gray-500">
                Πρώτα πρέπει να ολοκληρωθεί η αντιστοίχιση με ακίνητο.
              </div>
            ) : booking.status === "cancelled" ? (
              <div className="text-sm text-gray-500">
                Η κράτηση είναι ακυρωμένη και δεν μπορεί να δημιουργήσει εργασία.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm">Τύπος εργασίας</label>
                  <select
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                  >
                    <option value="cleaning">Καθαρισμός</option>
                    <option value="inspection">Επιθεώρηση</option>
                    <option value="maintenance">Τεχνική εργασία</option>
                    <option value="custom">Άλλη εργασία</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm">Τίτλος</label>
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Άφησέ το κενό για αυτόματο τίτλο"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm">Περιγραφή</label>
                  <textarea
                    className="min-h-[120px] w-full rounded-xl border px-3 py-2 text-sm"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Προαιρετική περιγραφή"
                  />
                </div>

                <button
                  className="w-full rounded-xl bg-black px-4 py-3 text-sm text-white disabled:opacity-50"
                  disabled={submitting}
                  onClick={createTask}
                >
                  {submitting ? "Δημιουργία..." : "Δημιουργία εργασίας"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}