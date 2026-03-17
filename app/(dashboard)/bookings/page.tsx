"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

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

function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("el-GR")
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("el-GR")
}

function toDateInputValue(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function toDateTimeLocalValue(dateString?: string | null, timeString?: string | null) {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ""
  const base = date.toISOString().slice(0, 10)

  if (!timeString) {
    return `${base}T09:00`
  }

  return `${base}T${timeString}`
}

function getTodayDateOnly() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getDateOnly(value: string) {
  const date = new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isActiveBooking(booking: BookingRow) {
  return booking.status !== "cancelled"
}

function getSyncLabel(syncStatus: string, needsMapping: boolean) {
  if (syncStatus === "CANCELLED") return "Ακυρωμένη"
  if (needsMapping) return "Χρειάζεται αντιστοίχιση"
  if (syncStatus === "READY_FOR_ACTION") return "Έτοιμη για ενέργεια"
  if (syncStatus === "ERROR") return "Σφάλμα"
  return syncStatus
}

function getTaskSummaryLabel(tasks: BookingTask[]) {
  if (tasks.length === 0) return "Χωρίς εργασία"
  if (tasks.length === 1) return "1 εργασία"
  return `${tasks.length} εργασίες`
}

export default function BookingsPage() {
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
        throw new Error(data?.error || "Αποτυχία φόρτωσης κρατήσεων.")
      }

      setBookings(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Αποτυχία φόρτωσης κρατήσεων.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  function openCreateTaskModal(booking: BookingRow) {
    setTaskType("cleaning")
    setTitle("")
    setDescription("")
    setScheduledDate(toDateInputValue(booking.checkOutDate))
    setScheduledStartTime(booking.checkOutTime || "")
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
        throw new Error(data?.error || "Αποτυχία δημιουργίας εργασίας.")
      }

      closeCreateTaskModal()
      await loadBookings()
      alert("Η εργασία δημιουργήθηκε επιτυχώς.")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Αποτυχία δημιουργίας εργασίας.")
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
      withoutTasks: bookings.filter((booking) => booking.tasks.length === 0 && isActiveBooking(booking)).length,
      withTasks: bookings.filter((booking) => booking.tasks.length > 0 && isActiveBooking(booking)).length,
      needsMapping: bookings.filter((booking) => booking.needsMapping).length,
      cancelled: bookings.filter((booking) => booking.status === "cancelled").length,
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
      result = result.filter((booking) => booking.tasks.length === 0 && isActiveBooking(booking))
    }

    if (activeFilter === "withTasks") {
      result = result.filter((booking) => booking.tasks.length > 0 && isActiveBooking(booking))
    }

    if (activeFilter === "needsMapping") {
      result = result.filter((booking) => booking.needsMapping)
    }

    if (activeFilter === "cancelled") {
      result = result.filter((booking) => booking.status === "cancelled")
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
    { key: "all", label: "Όλες", count: counters.all },
    { key: "active", label: "Ενεργές", count: counters.active },
    { key: "withoutTasks", label: "Χωρίς εργασία", count: counters.withoutTasks },
    { key: "withTasks", label: "Με εργασία", count: counters.withTasks },
    { key: "needsMapping", label: "Χρειάζονται αντιστοίχιση", count: counters.needsMapping },
    { key: "cancelled", label: "Ακυρωμένες", count: counters.cancelled },
    { key: "todayCheckout", label: "Σημερινά check-out", count: counters.todayCheckout },
    { key: "next3Days", label: "Επόμενα 3 ημέρες", count: counters.next3Days },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Κρατήσεις</h1>
          <p className="mt-1 text-sm text-gray-500">
            Εισερχόμενες κρατήσεις από πλατφόρμες, με πλήρη εικόνα και ελεγχόμενη δημιουργία εργασιών.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/bookings/history"
            className="rounded-xl border px-4 py-2 text-sm"
          >
            Ιστορικό κρατήσεων
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filterButtons.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveFilter(item.key)}
            className={`rounded-2xl border p-4 text-left transition ${
              activeFilter === item.key
                ? "border-black bg-black text-white"
                : "bg-white hover:border-gray-400"
            }`}
          >
            <div className="text-sm opacity-80">{item.label}</div>
            <div className="mt-2 text-2xl font-semibold">{item.count}</div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border bg-white">
        <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-medium">Λίστα κρατήσεων</h2>
            <p className="mt-1 text-sm text-gray-500">
              Από εδώ δημιουργείται εργασία συνδεδεμένη με την κράτηση και το ακίνητο.
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
              <div key={booking.id} className="space-y-4 p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-semibold">
                        {booking.property?.name || booking.externalListingName || booking.externalListingId || "Χωρίς αντιστοίχιση"}
                      </div>

                      <span className="rounded-full border px-2 py-1 text-xs">
                        {booking.sourcePlatform}
                      </span>

                      <span className="rounded-full border px-2 py-1 text-xs">
                        {getSyncLabel(booking.syncStatus, booking.needsMapping)}
                      </span>

                      <span className="rounded-full border px-2 py-1 text-xs">
                        {getTaskSummaryLabel(booking.tasks)}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600">
                      Κωδικός κράτησης: {booking.externalBookingId}
                    </div>

                    <div className="text-sm text-gray-600">
                      Ακίνητο: {booking.property ? `${booking.property.code} · ${booking.property.name}` : "Δεν έχει αντιστοιχιστεί"}
                    </div>

                    <div className="text-sm text-gray-600">
                      Επισκέπτης: {booking.guestName || "-"}
                    </div>

                    <div className="text-sm text-gray-600">
                      Check-in: {formatDate(booking.checkInDate)}
                      {booking.checkInTime ? ` · ${booking.checkInTime}` : ""}
                      {" | "}
                      Check-out: {formatDate(booking.checkOutDate)}
                      {booking.checkOutTime ? ` · ${booking.checkOutTime}` : ""}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="rounded-xl border px-4 py-2 text-sm"
                    >
                      Προβολή
                    </Link>

                    <button
                      type="button"
                      onClick={() => openCreateTaskModal(booking)}
                      disabled={booking.needsMapping || booking.status === "cancelled"}
                      className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      Δημιουργία εργασίας
                    </button>
                  </div>
                </div>

                {booking.tasks.length > 0 && (
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <div className="mb-3 text-sm font-medium">Συνδεδεμένες εργασίες</div>

                    <div className="space-y-2">
                      {booking.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex flex-col gap-2 rounded-xl border bg-white p-3 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="text-sm">
                            <div className="font-medium">{task.title}</div>
                            <div className="text-gray-600">
                              {task.taskType} · {task.status} · {formatDate(task.scheduledDate)}
                              {task.scheduledStartTime ? ` · ${task.scheduledStartTime}` : ""}
                              {task.alertEnabled && task.alertAt ? ` · Alert: ${formatDateTime(task.alertAt)}` : ""}
                            </div>
                          </div>

                          <Link
                            href={`/tasks/${task.id}`}
                            className="text-sm underline"
                          >
                            Προβολή εργασίας
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal.open && modal.booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h3 className="text-lg font-semibold">Νέα εργασία από κράτηση</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {modal.booking.property?.name || modal.booking.externalListingName || modal.booking.externalBookingId}
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateTaskModal}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                Κλείσιμο
              </button>
            </div>

            <div className="space-y-6 p-4">
              <div className="grid gap-4 md:grid-cols-2">
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
                  <label className="mb-1 block text-sm">Προτεραιότητα</label>
                  <select
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="low">Χαμηλή</option>
                    <option value="normal">Κανονική</option>
                    <option value="high">Υψηλή</option>
                    <option value="urgent">Επείγουσα</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm">Τίτλος</label>
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Αν μείνει κενό, θα μπει προτεινόμενος τίτλος"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm">Περιγραφή</label>
                  <textarea
                    className="min-h-[110px] w-full rounded-xl border px-3 py-2 text-sm"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Προαιρετική περιγραφή"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm">Ημερομηνία εργασίας</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm">Προθεσμία</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm">Ώρα έναρξης</label>
                  <input
                    type="time"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={scheduledStartTime}
                    onChange={(e) => setScheduledStartTime(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm">Ώρα λήξης</label>
                  <input
                    type="time"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={scheduledEndTime}
                    onChange={(e) => setScheduledEndTime(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2 rounded-2xl border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">Ειδοποίηση / alert</div>
                      <div className="text-sm text-gray-500">
                        Ο διαχειριστής μπορεί να ορίσει ακριβή ώρα ειδοποίησης για την εργασία.
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={alertEnabled}
                        onChange={(e) => setAlertEnabled(e.target.checked)}
                      />
                      Ενεργό
                    </label>
                  </div>

                  {alertEnabled && (
                    <div>
                      <label className="mb-1 block text-sm">Ώρα alert</label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                        value={alertAt}
                        onChange={(e) => setAlertAt(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 rounded-2xl border p-4">
                  <div className="mb-3 font-medium">Λίστες εργασίας</div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={sendCleaningChecklist}
                        onChange={(e) => setSendCleaningChecklist(e.target.checked)}
                      />
                      Αποστολή λίστας καθαριότητας
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={sendSuppliesChecklist}
                        onChange={(e) => setSendSuppliesChecklist(e.target.checked)}
                      />
                      Αποστολή λίστας αναλωσίμων
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm">Σημειώσεις</label>
                  <textarea
                    className="min-h-[100px] w-full rounded-xl border px-3 py-2 text-sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Εσωτερικές σημειώσεις για την εργασία"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t p-4">
              <button
                type="button"
                onClick={closeCreateTaskModal}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Ακύρωση
              </button>

              <button
                type="button"
                onClick={handleCreateTask}
                disabled={submittingTask}
                className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {submittingTask ? "Δημιουργία..." : "Δημιουργία εργασίας"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}