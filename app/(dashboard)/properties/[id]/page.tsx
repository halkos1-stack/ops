"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

type PropertyStatus = "Ενεργό" | "Ανενεργό"

type PropertyChecklistTemplateItem = {
  id: string
  label: string
  description?: string | null
  itemType: string
  isRequired: boolean
  sortOrder: number
  category?: string | null
  requiresPhoto?: boolean
  opensIssueOnFail?: boolean
  optionsText?: string | null
}

type PropertyChecklistTemplate = {
  id: string
  propertyId: string
  title: string
  description?: string | null
  templateType: string
  isPrimary: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  items?: PropertyChecklistTemplateItem[]
}

type Booking = {
  id: string
  propertyId: string
  sourcePlatform?: string | null
  externalBookingId?: string | null
  guestName?: string | null
  guestPhone?: string | null
  guestEmail?: string | null
  checkInDate: string
  checkOutDate: string
  checkInTime?: string | null
  checkOutTime?: string | null
  adults?: number | null
  children?: number | null
  infants?: number | null
  status?: string | null
  notes?: string | null
}

type TaskAssignment = {
  id: string
  status: string
  assignedAt?: string
  acceptedAt?: string | null
  rejectedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  rejectionReason?: string | null
  partner: {
    id: string
    name: string
    specialty?: string | null
  }
}

type TaskChecklistRun = {
  id: string
  status: string
  template?: {
    id: string
    title: string
  } | null
  answers?: Array<{ id: string }>
}

type Task = {
  id: string
  propertyId: string
  bookingId?: string | null
  title: string
  description?: string | null
  taskType: string
  source?: string | null
  priority?: string | null
  status?: string | null
  scheduledDate: string
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  dueDate?: string | null
  completedAt?: string | null
  requiresPhotos?: boolean
  requiresChecklist?: boolean
  requiresApproval?: boolean
  notes?: string | null
  resultNotes?: string | null
  assignments?: TaskAssignment[]
  checklistRun?: TaskChecklistRun | null
}

type Issue = {
  id: string
  propertyId?: string
  taskId?: string | null
  bookingId?: string | null
  issueType: string
  title: string
  description?: string | null
  severity?: string | null
  status?: string | null
  reportedBy?: string | null
  resolutionNotes?: string | null
  resolvedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

type Property = {
  id: string
  code: string
  name: string
  address: string
  city: string
  region: string
  postalCode: string
  country: string
  type: string
  status: PropertyStatus
  bedrooms: number
  bathrooms: number
  maxGuests: number
  notes: string | null
  createdAt?: string
  updatedAt?: string
  bookings?: Booking[]
  tasks?: Task[]
  issues?: Issue[]
  checklistTemplates?: PropertyChecklistTemplate[]
  primaryChecklist?: PropertyChecklistTemplate | null
}

type ReadinessItem = {
  label: string
  status: "ΟΚ" | "Εκκρεμεί" | "Αποτυχία ελέγχου" | "Χρειάζεται ενέργεια"
  detail: string
}

function cls(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatDateLong(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("el-GR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function isFutureDate(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return date >= today
}

function isTodayDate(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  const today = new Date()

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function getStatusBadgeClasses(status?: string | null) {
  const value = (status || "").toLowerCase()

  if (
    value.includes("ενεργ") ||
    value.includes("completed") ||
    value.includes("resolved") ||
    value.includes("accepted") ||
    value.includes("active") ||
    value.includes("ολοκληρ") ||
    value.includes("αποδεκ")
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }

  if (
    value.includes("pending") ||
    value.includes("assigned") ||
    value.includes("waiting") ||
    value.includes("σε αναμον") ||
    value.includes("ανατέθ")
  ) {
    return "bg-amber-50 text-amber-700 border-amber-200"
  }

  if (
    value.includes("rejected") ||
    value.includes("cancel") ||
    value.includes("open") ||
    value.includes("overdue") ||
    value.includes("απόρρ") ||
    value.includes("ανοιχ")
  ) {
    return "bg-red-50 text-red-700 border-red-200"
  }

  if (
    value.includes("progress") ||
    value.includes("started") ||
    value.includes("running") ||
    value.includes("εξέλιξη")
  ) {
    return "bg-blue-50 text-blue-700 border-blue-200"
  }

  return "bg-slate-50 text-slate-700 border-slate-200"
}

function getPriorityBadgeClasses(priority?: string | null) {
  const value = (priority || "").toLowerCase()

  if (
    value.includes("urgent") ||
    value.includes("critical") ||
    value.includes("υψη")
  ) {
    return "bg-red-50 text-red-700 border-red-200"
  }

  if (
    value.includes("normal") ||
    value.includes("medium") ||
    value.includes("μεσα")
  ) {
    return "bg-amber-50 text-amber-700 border-amber-200"
  }

  if (value.includes("low") || value.includes("χαμη")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }

  return "bg-slate-50 text-slate-700 border-slate-200"
}

function getReadinessBadgeClasses(status: ReadinessItem["status"]) {
  switch (status) {
    case "ΟΚ":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "Εκκρεμεί":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "Αποτυχία ελέγχου":
      return "bg-red-50 text-red-700 border-red-200"
    case "Χρειάζεται ενέργεια":
      return "bg-orange-50 text-orange-700 border-orange-200"
    default:
      return "bg-slate-50 text-slate-700 border-slate-200"
  }
}

function getLatestAssignment(task: Task) {
  if (!task.assignments || task.assignments.length === 0) return null

  return [...task.assignments].sort((a, b) => {
    const first = a.assignedAt ? new Date(a.assignedAt).getTime() : 0
    const second = b.assignedAt ? new Date(b.assignedAt).getTime() : 0
    return second - first
  })[0]
}

function mapTypeToUi(type: string | null | undefined) {
  switch (type) {
    case "apartment":
      return "Διαμέρισμα"
    case "villa":
      return "Βίλα"
    case "house":
      return "Κατοικία"
    case "studio":
      return "Στούντιο"
    case "maisonette":
      return "Μεζονέτα"
    default:
      return type || "-"
  }
}

export default function PropertyDetailsPage() {
  const params = useParams()
  const propertyId = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [property, setProperty] = useState<Property | null>(null)

  async function loadPageData() {
    if (!propertyId) return

    setLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        cache: "no-store",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Δεν βρέθηκε το ακίνητο.")
      }

      setProperty(data)
    } catch (err) {
      console.error("Σφάλμα φόρτωσης ακινήτου:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Παρουσιάστηκε σφάλμα κατά τη φόρτωση της σελίδας ακινήτου."
      )
      setProperty(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPageData()
  }, [propertyId])

  const bookings = property?.bookings || []
  const tasks = property?.tasks || []
  const issues = property?.issues || []
  const checklistTemplates = property?.checklistTemplates || []
  const primaryChecklist =
    property?.primaryChecklist ||
    checklistTemplates.find((x) => x.isPrimary) ||
    checklistTemplates[0] ||
    null

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter((booking) => isFutureDate(booking.checkInDate))
      .sort(
        (a, b) =>
          new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime()
      )
  }, [bookings])

  const todayArrivals = useMemo(() => {
    return bookings.filter((booking) => isTodayDate(booking.checkInDate))
  }, [bookings])

  const todayDepartures = useMemo(() => {
    return bookings.filter((booking) => isTodayDate(booking.checkOutDate))
  }, [bookings])

  const pendingTasks = useMemo(() => {
    return tasks.filter((task) => {
      const status = (task.status || "").toLowerCase()
      return status.includes("pending") || status.includes("σε αναμον")
    })
  }, [tasks])

  const assignedTasks = useMemo(() => {
    return tasks.filter((task) => {
      const latestAssignment = getLatestAssignment(task)
      if (!latestAssignment) return false

      const status = (latestAssignment.status || "").toLowerCase()

      return (
        status.includes("assigned") ||
        status.includes("waiting") ||
        status.includes("pending")
      )
    })
  }, [tasks])

  const acceptedTasks = useMemo(() => {
    return tasks.filter((task) => {
      const latestAssignment = getLatestAssignment(task)
      if (!latestAssignment) return false
      return (latestAssignment.status || "").toLowerCase().includes("accepted")
    })
  }, [tasks])

  const inProgressTasks = useMemo(() => {
    return tasks.filter((task) => {
      const status = (task.status || "").toLowerCase()
      return status.includes("progress") || status.includes("started")
    })
  }, [tasks])

  const completedTasks = useMemo(() => {
    return tasks.filter((task) => {
      const status = (task.status || "").toLowerCase()
      return status.includes("completed") || status.includes("ολοκληρ")
    })
  }, [tasks])

  const openIssues = useMemo(() => {
    return issues.filter((issue) => {
      const status = (issue.status || "").toLowerCase()

      return (
        status.includes("open") ||
        status.includes("investigation") ||
        status.includes("pending") ||
        status.includes("ανοιχ") ||
        status.includes("διερεύνηση")
      )
    })
  }, [issues])

  const criticalPendingCount = useMemo(() => {
    const emptyChecklist =
      primaryChecklist &&
      primaryChecklist.isActive &&
      (!primaryChecklist.items || primaryChecklist.items.length === 0)

    return openIssues.length + pendingTasks.length + (emptyChecklist ? 1 : 0)
  }, [primaryChecklist, openIssues.length, pendingTasks.length])

  const readinessItems = useMemo<ReadinessItem[]>(() => {
    const cleaningProblem = tasks.some((task) => {
      const title = (task.title || "").toLowerCase()
      const type = (task.taskType || "").toLowerCase()
      const status = (task.status || "").toLowerCase()

      const isCleaning =
        title.includes("καθαρισ") ||
        type.includes("καθαρισ") ||
        type.includes("clean")

      const notCompleted =
        !status.includes("ολοκληρ") && !status.includes("completed")

      return isCleaning && notCompleted
    })

    const consumablesProblem = openIssues.some((issue) => {
      const issueType = (issue.issueType || "").toLowerCase()
      const title = (issue.title || "").toLowerCase()

      return (
        issueType.includes("consumable") ||
        issueType.includes("supply") ||
        issueType.includes("αναλω") ||
        title.includes("αναλω")
      )
    })

    const damageProblem = openIssues.some((issue) => {
      const issueType = (issue.issueType || "").toLowerCase()
      const title = (issue.title || "").toLowerCase()

      return (
        issueType.includes("damage") ||
        issueType.includes("ζημι") ||
        title.includes("ζημι")
      )
    })

    const repairProblem = openIssues.some((issue) => {
      const issueType = (issue.issueType || "").toLowerCase()
      const title = (issue.title || "").toLowerCase()

      return (
        issueType.includes("repair") ||
        issueType.includes("maintenance") ||
        issueType.includes("βλαβ") ||
        title.includes("βλαβ")
      )
    })

    return [
      {
        label: "Καθαριότητα",
        status: cleaningProblem ? "Χρειάζεται ενέργεια" : "ΟΚ",
        detail: cleaningProblem
          ? "Υπάρχουν ανοικτές ή μη ολοκληρωμένες εργασίες καθαρισμού."
          : "Δεν υπάρχουν ανοικτές εκκρεμότητες καθαριότητας.",
      },
      {
        label: "Αναλώσιμα",
        status: consumablesProblem ? "Χρειάζεται ενέργεια" : "ΟΚ",
        detail: consumablesProblem
          ? "Έχουν καταγραφεί ελλείψεις αναλωσίμων."
          : "Δεν υπάρχουν ανοικτές ελλείψεις αναλωσίμων.",
      },
      {
        label: "Ζημιές",
        status: damageProblem ? "Χρειάζεται ενέργεια" : "ΟΚ",
        detail: damageProblem
          ? "Υπάρχουν ανοικτές ζημιές που απαιτούν ενέργεια."
          : "Δεν υπάρχουν ανοικτές ζημιές.",
      },
      {
        label: "Βλάβες",
        status: repairProblem ? "Χρειάζεται ενέργεια" : "ΟΚ",
        detail: repairProblem
          ? "Υπάρχουν ανοικτές βλάβες ή τεχνικά θέματα."
          : "Δεν υπάρχουν ανοικτές βλάβες.",
      },
    ]
  }, [openIssues, tasks])

  async function handleSaveProperty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!property || !propertyId) return

    setSaving(true)
    setError("")
    setSuccessMessage("")

    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: property.name,
          address: property.address,
          city: property.city,
          region: property.region,
          postalCode: property.postalCode,
          country: property.country,
          type: property.type,
          status: property.status,
          bedrooms: Number(property.bedrooms || 0),
          bathrooms: Number(property.bathrooms || 0),
          maxGuests: Number(property.maxGuests || 0),
          notes: property.notes || "",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία αποθήκευσης αλλαγών.")
      }

      setProperty(data)
      setSuccessMessage("Οι αλλαγές αποθηκεύτηκαν επιτυχώς.")
    } catch (err) {
      console.error("Σφάλμα αποθήκευσης ακινήτου:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Παρουσιάστηκε σφάλμα κατά την αποθήκευση."
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">Φόρτωση σελίδας ακινήτου...</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-red-700">
            Δεν βρέθηκε το ακίνητο
          </h1>
          <p className="mt-2 text-sm text-red-600">
            Το ακίνητο που ζητήθηκε δεν υπάρχει ή δεν μπορεί να φορτωθεί.
          </p>

          <div className="mt-6">
            <Link
              href="/properties"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Επιστροφή στα ακίνητα
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Επιχειρησιακή διαχείριση OPS</p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {property.name}
              </h1>

              <span
                className={cls(
                  "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold",
                  property.status === "Ενεργό"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-700"
                )}
              >
                {property.status}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              {property.code} • {property.city} • {property.address}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/properties"
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Επιστροφή στα ακίνητα
            </Link>

            <Link
              href={`/property-checklists/${property.id}`}
              className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Διαχείριση checklist
            </Link>

            <Link
              href={`/tasks/new?propertyId=${property.id}`}
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Νέα εργασία
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Σύνολο εργασιών</p>
          <p className="mt-3 text-4xl font-bold text-slate-950">{tasks.length}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Σε αναμονή</p>
          <p className="mt-3 text-4xl font-bold text-amber-600">
            {pendingTasks.length}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Ανατεθειμένες</p>
          <p className="mt-3 text-4xl font-bold text-blue-600">
            {assignedTasks.length}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Αποδεκτές</p>
          <p className="mt-3 text-4xl font-bold text-emerald-600">
            {acceptedTasks.length}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Σε εξέλιξη</p>
          <p className="mt-3 text-4xl font-bold text-indigo-600">
            {inProgressTasks.length}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Ολοκληρωμένες</p>
          <p className="mt-3 text-4xl font-bold text-emerald-600">
            {completedTasks.length}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Επερχόμενες κρατήσεις</p>
          <p className="mt-3 text-4xl font-bold text-slate-950">
            {upcomingBookings.length}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Ανοιχτά συμβάντα</p>
          <p className="mt-3 text-4xl font-bold text-red-600">
            {openIssues.length}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <p className="text-sm font-medium text-slate-500">Κρίσιμες εκκρεμότητες</p>
          <p className="mt-3 text-4xl font-bold text-orange-600">
            {criticalPendingCount}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
          <p className="text-sm font-medium text-slate-500">
            Επόμενη άφιξη / αναχώρηση
          </p>

          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Σημερινές αφίξεις
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                {todayArrivals.length}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Σημερινές αναχωρήσεις
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                {todayDepartures.length}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Επόμενο check-in
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {upcomingBookings[0]
                  ? `${upcomingBookings[0].guestName || "Επισκέπτης"} • ${formatDateLong(upcomingBookings[0].checkInDate)}`
                  : "Δεν υπάρχει"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <form
            onSubmit={handleSaveProperty}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-950">Στοιχεία ακινήτου</h2>
              <p className="mt-1 text-sm text-slate-500">
                Πλήρης έλεγχος και ενημέρωση των βασικών στοιχείων του ακινήτου.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Όνομα
                </label>
                <input
                  value={property.name}
                  onChange={(e) => setProperty({ ...property, name: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Κωδικός
                </label>
                <input
                  value={property.code}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 outline-none"
                />
              </div>

              <div className="md:col-span-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Διεύθυνση
                </label>
                <input
                  value={property.address}
                  onChange={(e) =>
                    setProperty({ ...property, address: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Πόλη
                </label>
                <input
                  value={property.city}
                  onChange={(e) => setProperty({ ...property, city: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Περιοχή
                </label>
                <input
                  value={property.region}
                  onChange={(e) =>
                    setProperty({ ...property, region: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Τ.Κ.
                </label>
                <input
                  value={property.postalCode}
                  onChange={(e) =>
                    setProperty({ ...property, postalCode: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Χώρα
                </label>
                <input
                  value={property.country}
                  onChange={(e) =>
                    setProperty({ ...property, country: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Τύπος ακινήτου
                </label>
                <select
                  value={property.type}
                  onChange={(e) => setProperty({ ...property, type: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                >
                  <option value="apartment">Διαμέρισμα</option>
                  <option value="villa">Βίλα</option>
                  <option value="house">Κατοικία</option>
                  <option value="studio">Στούντιο</option>
                  <option value="maisonette">Μεζονέτα</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Κατάσταση
                </label>
                <select
                  value={property.status}
                  onChange={(e) =>
                    setProperty({
                      ...property,
                      status: e.target.value as PropertyStatus,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                >
                  <option value="Ενεργό">Ενεργό</option>
                  <option value="Ανενεργό">Ανενεργό</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Υπνοδωμάτια
                </label>
                <input
                  type="number"
                  min={0}
                  value={property.bedrooms}
                  onChange={(e) =>
                    setProperty({
                      ...property,
                      bedrooms: Number(e.target.value || 0),
                    })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Μπάνια
                </label>
                <input
                  type="number"
                  min={0}
                  value={property.bathrooms}
                  onChange={(e) =>
                    setProperty({
                      ...property,
                      bathrooms: Number(e.target.value || 0),
                    })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Μέγιστοι επισκέπτες
                </label>
                <input
                  type="number"
                  min={0}
                  value={property.maxGuests}
                  onChange={(e) =>
                    setProperty({
                      ...property,
                      maxGuests: Number(e.target.value || 0),
                    })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-12">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Σημειώσεις
                </label>
                <textarea
                  value={property.notes || ""}
                  onChange={(e) =>
                    setProperty({ ...property, notes: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                  placeholder="Εσωτερικές σημειώσεις για το ακίνητο"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Αποθήκευση..." : "Αποθήκευση αλλαγών"}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-950">
                Κατάσταση ετοιμότητας
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Συνολική επιχειρησιακή εικόνα καθαριότητας, αναλωσίμων, ζημιών και
                βλαβών.
              </p>
            </div>

            <div className="space-y-3">
              {readinessItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                    </div>

                    <span
                      className={cls(
                        "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold",
                        getReadinessBadgeClasses(item.status)
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-950">
                Πρότυπα checklist
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Το κύριο πρότυπο χρησιμοποιείται στις βασικές ροές εργασιών.
              </p>
            </div>

            {primaryChecklist ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {primaryChecklist.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {primaryChecklist.description ||
                          "Δεν υπάρχει περιγραφή προτύπου."}
                      </p>
                    </div>

                    <span
                      className={cls(
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        primaryChecklist.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-700"
                      )}
                    >
                      {primaryChecklist.isActive ? "Ενεργό" : "Ανενεργό"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Σύνολο βημάτων</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950">
                      {primaryChecklist.items?.length || 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Υποχρεωτικά βήματα</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950">
                      {primaryChecklist.items?.filter((item) => item.isRequired).length ||
                        0}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Τελευταία ενημέρωση</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {formatDateLong(primaryChecklist.updatedAt)}
                  </p>
                </div>

                <div className="max-h-64 space-y-2 overflow-auto rounded-2xl border border-slate-200 p-4">
                  {(primaryChecklist.items || []).length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Δεν υπάρχουν ακόμη βήματα checklist.
                    </p>
                  ) : (
                    primaryChecklist.items
                      ?.slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {item.label}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.description || "Χωρίς περιγραφή"}
                              </p>
                            </div>

                            <span
                              className={cls(
                                "rounded-full border px-2 py-1 text-[11px] font-semibold",
                                item.isRequired
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-slate-200 bg-white text-slate-600"
                              )}
                            >
                              {item.isRequired ? "Υποχρεωτικό" : "Προαιρετικό"}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/property-checklists/${property.id}`}
                    className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Διαχείριση checklist
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5">
                <p className="text-sm text-slate-500">
                  Δεν υπάρχει ακόμη checklist για αυτό το ακίνητο.
                </p>

                <div className="mt-4">
                  <Link
                    href={`/property-checklists/${property.id}`}
                    className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Διαχείριση checklist
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-950">Ανοιχτά συμβάντα</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ζημιές, βλάβες, ελλείψεις αναλωσίμων και παρατηρήσεις ελέγχου.
              </p>
            </div>

            {openIssues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5">
                <p className="text-sm text-slate-500">
                  Δεν υπάρχουν καταγεγραμμένα ανοικτά συμβάντα.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {openIssues.slice(0, 5).map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {issue.title || issue.issueType}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {issue.description || "Χωρίς περιγραφή συμβάντος."}
                        </p>
                      </div>

                      <span
                        className={cls(
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          getStatusBadgeClasses(issue.status)
                        )}
                      >
                        {issue.status || "open"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={cls(
                          "rounded-full border px-2 py-1 text-[11px] font-semibold",
                          getPriorityBadgeClasses(issue.severity)
                        )}
                      >
                        {issue.severity || "medium"}
                      </span>

                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {issue.issueType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">Κρατήσεις ακινήτου</h2>
              <p className="mt-1 text-sm text-slate-500">
                Άφιξη, αναχώρηση και σύνδεση με τις λειτουργίες του ακινήτου.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Επισκέπτης
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Check-in
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Check-out
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Πλατφόρμα
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Κατάσταση
                  </th>
                </tr>
              </thead>

              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-sm text-slate-500"
                    >
                      Δεν υπάρχουν ακόμη κρατήσεις για αυτό το ακίνητο.
                    </td>
                  </tr>
                ) : (
                  bookings
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(b.checkInDate).getTime() -
                        new Date(a.checkInDate).getTime()
                    )
                    .slice(0, 8)
                    .map((booking) => (
                      <tr key={booking.id} className="border-t border-slate-200">
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {booking.guestName || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(booking.checkInDate)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(booking.checkOutDate)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {booking.sourcePlatform || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={cls(
                              "rounded-full border px-3 py-1 text-xs font-semibold",
                              getStatusBadgeClasses(booking.status)
                            )}
                          >
                            {booking.status || "—"}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">Εργασίες ακινήτου</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ροή δημιουργίας, ανάθεσης, αποδοχής και εκτέλεσης.
              </p>
            </div>

            <Link
              href={`/tasks/new?propertyId=${property.id}`}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Νέα εργασία
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Τίτλος
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Τύπος
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Ημερομηνία
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Συνεργάτης
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Κατάσταση εργασίας
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Ανάθεση
                  </th>
                </tr>
              </thead>

              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-sm text-slate-500"
                    >
                      Δεν υπάρχουν ακόμη εργασίες για αυτό το ακίνητο.
                    </td>
                  </tr>
                ) : (
                  tasks
                    .slice()
                    .sort((a, b) => {
                      const first = a.scheduledDate
                        ? new Date(a.scheduledDate).getTime()
                        : 0
                      const second = b.scheduledDate
                        ? new Date(b.scheduledDate).getTime()
                        : 0
                      return second - first
                    })
                    .slice(0, 8)
                    .map((task) => {
                      const latestAssignment = getLatestAssignment(task)

                      return (
                        <tr key={task.id} className="border-t border-slate-200">
                          <td className="px-6 py-4">
                            <div>
                              <Link
                                href={`/tasks/${task.id}`}
                                className="text-sm font-semibold text-slate-900 hover:text-blue-600"
                              >
                                {task.title}
                              </Link>

                              <div className="mt-1 flex flex-wrap gap-2">
                                {task.requiresChecklist ? (
                                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                                    Απαιτεί checklist
                                  </span>
                                ) : null}

                                {task.requiresPhotos ? (
                                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700">
                                    Απαιτεί φωτογραφίες
                                  </span>
                                ) : null}

                                {task.checklistRun?.template?.title ? (
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700">
                                    {task.checklistRun.template.title}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            <div className="space-y-2">
                              <span className="block">{task.taskType || "—"}</span>
                              <span
                                className={cls(
                                  "inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold",
                                  getPriorityBadgeClasses(task.priority)
                                )}
                              >
                                {task.priority || "normal"}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            <div>
                              <p>{formatDate(task.scheduledDate)}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {task.scheduledStartTime || "—"}
                                {task.scheduledEndTime
                                  ? ` - ${task.scheduledEndTime}`
                                  : ""}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            {latestAssignment?.partner?.name || "Δεν έχει ανατεθεί"}
                          </td>

                          <td className="px-6 py-4 text-sm">
                            <span
                              className={cls(
                                "rounded-full border px-3 py-1 text-xs font-semibold",
                                getStatusBadgeClasses(task.status)
                              )}
                            >
                              {task.status || "—"}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-sm">
                            <span
                              className={cls(
                                "rounded-full border px-3 py-1 text-xs font-semibold",
                                getStatusBadgeClasses(latestAssignment?.status)
                              )}
                            >
                              {latestAssignment?.status || "Χωρίς ανάθεση"}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Συμβάντα ακινήτου</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ζημιές, βλάβες, αναλώσιμα και παρατηρήσεις που επηρεάζουν την
              ετοιμότητα του ακινήτου.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Τύπος
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Τίτλος / Περιγραφή
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Σοβαρότητα
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Κατάσταση
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Ημερομηνία
                </th>
              </tr>
            </thead>

            <tbody>
              {issues.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    Δεν υπάρχουν ακόμη συμβάντα για αυτό το ακίνητο.
                  </td>
                </tr>
              ) : (
                issues
                  .slice()
                  .sort((a, b) => {
                    const first = a.createdAt ? new Date(a.createdAt).getTime() : 0
                    const second = b.createdAt ? new Date(b.createdAt).getTime() : 0
                    return second - first
                  })
                  .slice(0, 10)
                  .map((issue) => (
                    <tr key={issue.id} className="border-t border-slate-200">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {issue.issueType}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div>
                          <p className="font-medium text-slate-900">
                            {issue.title}
                          </p>
                          <p className="mt-1 text-slate-500">
                            {issue.description || "—"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <span
                          className={cls(
                            "rounded-full border px-3 py-1 text-xs font-semibold",
                            getPriorityBadgeClasses(issue.severity)
                          )}
                        >
                          {issue.severity || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={cls(
                            "rounded-full border px-3 py-1 text-xs font-semibold",
                            getStatusBadgeClasses(issue.status)
                          )}
                        >
                          {issue.status || "open"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDateTime(issue.createdAt)}
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