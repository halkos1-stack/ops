"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

type PropertyDetail = {
  id: string
  code: string
  name: string
  address: string
  city: string
  region: string
  postalCode: string
  country: string
  type: string
  status: string
  bedrooms: number
  bathrooms: number
  maxGuests: number
  notes: string | null
  defaultPartnerId: string | null
  createdAt: string
  updatedAt: string

  defaultPartner?: {
    id: string
    code: string
    name: string
    email: string
    phone?: string | null
    specialty: string
    status: string
    notes?: string | null
  } | null

  bookings?: Array<{
    id: string
    sourcePlatform: string
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
    status: string
    notes?: string | null
    createdAt?: string
    updatedAt?: string
  }>

  tasks?: Array<{
    id: string
    title: string
    description?: string | null
    taskType: string
    source: string
    priority: string
    status: string
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
    createdAt?: string
    updatedAt?: string
    assignments?: Array<{
      id: string
      status: string
      assignedAt: string
      acceptedAt?: string | null
      rejectedAt?: string | null
      startedAt?: string | null
      completedAt?: string | null
      rejectionReason?: string | null
      notes?: string | null
      partner?: {
        id: string
        code: string
        name: string
        email: string
        phone?: string | null
        specialty: string
        status: string
      } | null
    }>
    booking?: {
      id: string
      guestName?: string | null
      checkInDate: string
      checkOutDate: string
      status: string
    } | null
    checklistRun?: {
      id: string
      status: string
      startedAt?: string | null
      completedAt?: string | null
      template?: {
        id: string
        title: string
        templateType: string
        isPrimary: boolean
      } | null
      answers?: Array<{
        id: string
        issueCreated?: boolean
      }>
    } | null
  }>

  issues?: Array<{
    id: string
    issueType: string
    title: string
    description?: string | null
    severity: string
    status: string
    reportedBy?: string | null
    resolutionNotes?: string | null
    resolvedAt?: string | null
    createdAt: string
    updatedAt: string
    task?: {
      id: string
      title: string
      status: string
    } | null
    booking?: {
      id: string
      guestName?: string | null
      checkInDate: string
      checkOutDate: string
      status: string
    } | null
  }>

  checklistTemplates?: Array<{
    id: string
    title: string
    description?: string | null
    templateType: string
    isPrimary: boolean
    isActive: boolean
    createdAt: string
    updatedAt: string
    items?: Array<{
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
    }>
  }>

  propertySupplies?: Array<{
    id: string
    currentStock: number
    targetStock?: number | null
    reorderThreshold?: number | null
    notes?: string | null
    supplyItem?: {
      id: string
      code: string
      name: string
      category: string
      unit: string
      minimumStock?: number | null
      isActive: boolean
    } | null
  }>

  taskPhotos?: Array<{
    id: string
    category: string
    fileUrl: string
    fileName?: string | null
    caption?: string | null
    takenAt?: string | null
    uploadedAt: string
  }>

  events?: Array<{
    id: string
    title: string
    description?: string | null
    eventType: string
    status: string
    startAt?: string | null
    endAt?: string | null
    createdAt: string
  }>

  activityLogs?: Array<{
    id: string
    entityType: string
    entityId: string
    action: string
    message?: string | null
    actorType?: string | null
    actorName?: string | null
    createdAt: string
  }>
}

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
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

function propertyStatusLabel(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "Ενεργό"
    case "inactive":
      return "Ανενεργό"
    case "maintenance":
      return "Σε συντήρηση"
    case "archived":
      return "Αρχειοθετημένο"
    default:
      return status || "—"
  }
}

function bookingStatusLabel(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "confirmed":
      return "Επιβεβαιωμένη"
    case "pending":
      return "Σε αναμονή"
    case "cancelled":
      return "Ακυρωμένη"
    case "completed":
      return "Ολοκληρωμένη"
    default:
      return status || "—"
  }
}

function taskStatusLabel(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "Εκκρεμεί"
    case "assigned":
      return "Ανατέθηκε"
    case "accepted":
      return "Αποδεκτή"
    case "in_progress":
      return "Σε εξέλιξη"
    case "completed":
      return "Ολοκληρωμένη"
    case "cancelled":
      return "Ακυρωμένη"
    default:
      return status || "—"
  }
}

function issueStatusLabel(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "open":
      return "Ανοιχτό"
    case "in_progress":
      return "Σε εξέλιξη"
    case "resolved":
      return "Επιλυμένο"
    case "closed":
      return "Κλειστό"
    default:
      return status || "—"
  }
}

function severityLabel(severity?: string | null) {
  switch ((severity || "").toLowerCase()) {
    case "low":
      return "Χαμηλή"
    case "medium":
      return "Μεσαία"
    case "high":
      return "Υψηλή"
    case "critical":
      return "Κρίσιμη"
    default:
      return severity || "—"
  }
}

function typeLabel(value?: string | null) {
  if (!value) return "—"

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function badgeClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "active":
    case "completed":
    case "confirmed":
    case "resolved":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "pending":
    case "assigned":
    case "accepted":
    case "in_progress":
    case "maintenance":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "inactive":
    case "cancelled":
    case "archived":
    case "closed":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
    case "open":
    case "critical":
    case "high":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function assignmentStatusLabel(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "assigned":
      return "Ανατέθηκε"
    case "accepted":
      return "Αποδέχθηκε"
    case "rejected":
      return "Απέρριψε"
    case "started":
      return "Ξεκίνησε"
    case "completed":
      return "Ολοκλήρωσε"
    default:
      return status || "—"
  }
}

function checklistStatusLabel(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "Εκκρεμεί"
    case "in_progress":
      return "Σε εξέλιξη"
    case "completed":
      return "Ολοκληρώθηκε"
    default:
      return status || "—"
  }
}

function getReadinessState(property: PropertyDetail | null) {
  if (!property) {
    return {
      label: "Άγνωστη",
      tone: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
      details: "Δεν υπάρχουν διαθέσιμα δεδομένα.",
    }
  }

  const openIssues = safeArray(property.issues).filter(
    (issue) => issue.status === "open"
  )
  const criticalIssues = openIssues.filter((issue) =>
    ["high", "critical"].includes((issue.severity || "").toLowerCase())
  )

  const openTasks = safeArray(property.tasks).filter((task) =>
    ["pending", "assigned", "accepted", "in_progress"].includes(task.status)
  )

  const hasPrimaryChecklist = safeArray(property.checklistTemplates).some(
    (template) => template.isPrimary && template.isActive
  )

  if (criticalIssues.length > 0) {
    return {
      label: "Μη έτοιμο",
      tone: "bg-red-50 text-red-700 ring-1 ring-red-200",
      details: `Υπάρχουν ${criticalIssues.length} κρίσιμα ανοιχτά θέματα.`,
    }
  }

  if (openIssues.length > 0 || openTasks.length > 0 || !hasPrimaryChecklist) {
    return {
      label: "Θέλει ενέργειες",
      tone: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      details: `Ανοιχτές εργασίες: ${openTasks.length} · Ανοιχτά θέματα: ${openIssues.length} · Κύρια checklist: ${
        hasPrimaryChecklist ? "Ναι" : "Όχι"
      }`,
    }
  }

  return {
    label: "Έτοιμο",
    tone: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    details: "Δεν υπάρχουν ανοιχτές εκκρεμότητες αυτή τη στιγμή.",
  }
}

export default function PropertyDetailPage({ params }: PageProps) {
  const { id } = use(params)

  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProperty() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/properties/${id}`, {
          cache: "no-store",
        })

        const json = await res.json().catch(() => null)

        if (!res.ok) {
          throw new Error(json?.error || "Αποτυχία φόρτωσης ακινήτου.")
        }

        const normalized = json?.property ?? json?.data ?? json

        if (!normalized || typeof normalized !== "object") {
          throw new Error("Μη έγκυρη απόκριση από το API ακινήτου.")
        }

        setProperty(normalized)
      } catch (err) {
        console.error("Load property detail error:", err)
        setError(
          err instanceof Error
            ? err.message
            : "Αποτυχία φόρτωσης σελίδας ακινήτου."
        )
      } finally {
        setLoading(false)
      }
    }

    loadProperty()
  }, [id])

  const metrics = useMemo(() => {
    const bookings = safeArray(property?.bookings)
    const tasks = safeArray(property?.tasks)
    const issues = safeArray(property?.issues)
    const templates = safeArray(property?.checklistTemplates)
    const supplies = safeArray(property?.propertySupplies)

    const pendingTasks = tasks.filter((task) =>
      ["pending", "assigned", "accepted", "in_progress"].includes(task.status)
    ).length

    const completedTasks = tasks.filter(
      (task) => task.status === "completed"
    ).length

    const openIssues = issues.filter((issue) => issue.status === "open").length

    const criticalIssues = issues.filter((issue) =>
      ["high", "critical"].includes((issue.severity || "").toLowerCase())
    ).length

    const activeTemplates = templates.filter(
      (template) => template.isActive
    ).length

    const primaryTemplate =
      templates.find((template) => template.isPrimary) || null

    const lowStockCount = supplies.filter((supply) => {
      const current = Number(supply.currentStock || 0)
      const threshold =
        supply.reorderThreshold ?? supply.supplyItem?.minimumStock ?? null

      if (threshold === null || threshold === undefined) return false
      return current <= Number(threshold)
    }).length

    return {
      bookings: bookings.length,
      pendingTasks,
      completedTasks,
      openIssues,
      criticalIssues,
      activeTemplates,
      primaryTemplate,
      lowStockCount,
    }
  }, [property])

  const readiness = useMemo(() => getReadinessState(property), [property])

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">Φόρτωση ακινήτου...</div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          Σφάλμα φόρτωσης ακινήτου
        </h1>
        <p className="mt-2 text-sm text-red-600">
          {error || "Δεν βρέθηκαν δεδομένα ακινήτου."}
        </p>
        <div className="mt-4">
          <Link
            href="/properties"
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Επιστροφή στα ακίνητα
          </Link>
        </div>
      </div>
    )
  }

  const bookings = safeArray(property.bookings)
  const tasks = safeArray(property.tasks)
  const issues = safeArray(property.issues)
  const templates = safeArray(property.checklistTemplates)
  const supplies = safeArray(property.propertySupplies)
  const taskPhotos = safeArray(property.taskPhotos)
  const events = safeArray(property.events)
  const activityLogs = safeArray(property.activityLogs)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/properties"
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              Ακίνητα
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-600">{property.code}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {property.name}
            </h1>

            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                property.status
              )}`}
            >
              {propertyStatusLabel(property.status)}
            </span>

            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              {typeLabel(property.type)}
            </span>

            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${readiness.tone}`}
            >
              Readiness: {readiness.label}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            {property.address}, {property.city}, {property.region},{" "}
            {property.postalCode}, {property.country}
          </p>

          <p className="mt-2 text-sm text-slate-500">{readiness.details}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/property-checklists/${property.id}`}
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Διαχείριση checklists
          </Link>

          <Link
            href="/tasks"
            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Εργασίες
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Κρατήσεις</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {metrics.bookings}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Εκκρεμείς εργασίες</div>
          <div className="mt-2 text-3xl font-bold text-amber-700">
            {metrics.pendingTasks}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Ολοκληρωμένες εργασίες</div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">
            {metrics.completedTasks}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Ανοιχτά θέματα</div>
          <div className="mt-2 text-3xl font-bold text-red-700">
            {metrics.openIssues}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Κρίσιμα θέματα</div>
          <div className="mt-2 text-3xl font-bold text-red-700">
            {metrics.criticalIssues}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Ενεργά checklist</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {metrics.activeTemplates}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Χαμηλό απόθεμα</div>
          <div className="mt-2 text-3xl font-bold text-orange-700">
            {metrics.lowStockCount}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Στοιχεία ακινήτου
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Κωδικός
              </div>
              <div className="mt-1 text-sm text-slate-900">{property.code}</div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Όνομα
              </div>
              <div className="mt-1 text-sm text-slate-900">{property.name}</div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Τύπος
              </div>
              <div className="mt-1 text-sm text-slate-900">
                {typeLabel(property.type)}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Κατάσταση
              </div>
              <div className="mt-1 text-sm text-slate-900">
                {propertyStatusLabel(property.status)}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Υπνοδωμάτια
              </div>
              <div className="mt-1 text-sm text-slate-900">
                {property.bedrooms}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Μπάνια
              </div>
              <div className="mt-1 text-sm text-slate-900">
                {property.bathrooms}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Μέγιστοι επισκέπτες
              </div>
              <div className="mt-1 text-sm text-slate-900">
                {property.maxGuests}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Δημιουργία
              </div>
              <div className="mt-1 text-sm text-slate-900">
                {formatDateTime(property.createdAt)}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Τελευταία ενημέρωση
              </div>
              <div className="mt-1 text-sm text-slate-900">
                {formatDateTime(property.updatedAt)}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Διεύθυνση
              </div>
              <div className="mt-1 text-sm text-slate-900">{property.address}</div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Πόλη / Περιοχή / ΤΚ
              </div>
              <div className="mt-1 text-sm text-slate-900">
                {property.city} / {property.region} / {property.postalCode}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Σημειώσεις ακινήτου
            </div>
            <div className="mt-1 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              {property.notes?.trim() ? property.notes : "Δεν υπάρχουν σημειώσεις."}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Προεπιλεγμένος συνεργάτης
          </h2>

          {property.defaultPartner ? (
            <div className="mt-5 space-y-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Όνομα
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {property.defaultPartner.name}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Κωδικός
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {property.defaultPartner.code}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {property.defaultPartner.email}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Τηλέφωνο
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {property.defaultPartner.phone || "—"}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ειδικότητα
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {property.defaultPartner.specialty}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Κατάσταση
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {property.defaultPartner.status}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              Δεν έχει οριστεί προεπιλεγμένος συνεργάτης.
            </div>
          )}

          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">
              Κύριο πρότυπο checklist
            </h3>

            {metrics.primaryTemplate ? (
              <div className="mt-3 rounded-xl bg-slate-50 p-4">
                <div className="font-medium text-slate-900">
                  {metrics.primaryTemplate.title}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Τύπος: {metrics.primaryTemplate.templateType}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                Δεν έχει οριστεί κύριο πρότυπο checklist.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Κρατήσεις</h2>
          </div>

          {bookings.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              Δεν υπάρχουν κρατήσεις για αυτό το ακίνητο.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {bookings.map((booking) => (
                <div key={booking.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {booking.guestName || "Χωρίς όνομα επισκέπτη"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {booking.sourcePlatform}
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                        booking.status
                      )}`}
                    >
                      {bookingStatusLabel(booking.status)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="text-sm text-slate-700">
                      Check-in: {formatDate(booking.checkInDate)}{" "}
                      {booking.checkInTime ? `· ${booking.checkInTime}` : ""}
                    </div>
                    <div className="text-sm text-slate-700">
                      Check-out: {formatDate(booking.checkOutDate)}{" "}
                      {booking.checkOutTime ? `· ${booking.checkOutTime}` : ""}
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    Επισκέπτες: {booking.adults ?? 0} ενήλικες,{" "}
                    {booking.children ?? 0} παιδιά, {booking.infants ?? 0} βρέφη
                  </div>

                  {booking.notes ? (
                    <div className="mt-2 text-sm text-slate-600">
                      Σημειώσεις: {booking.notes}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Θέματα / Βλάβες
            </h2>
          </div>

          {issues.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              Δεν υπάρχουν θέματα για αυτό το ακίνητο.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {issues.map((issue) => (
                <div key={issue.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {issue.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {issue.issueType}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                          issue.severity
                        )}`}
                      >
                        {severityLabel(issue.severity)}
                      </span>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                          issue.status
                        )}`}
                      >
                        {issueStatusLabel(issue.status)}
                      </span>
                    </div>
                  </div>

                  {issue.description ? (
                    <div className="mt-3 text-sm text-slate-700">
                      {issue.description}
                    </div>
                  ) : null}

                  <div className="mt-3 text-xs text-slate-500">
                    Δημιουργία: {formatDateTime(issue.createdAt)}
                  </div>

                  {issue.task ? (
                    <div className="mt-2 text-xs text-slate-500">
                      Συνδεδεμένη εργασία: {issue.task.title}
                    </div>
                  ) : null}

                  {issue.resolutionNotes ? (
                    <div className="mt-2 text-sm text-slate-600">
                      Επίλυση: {issue.resolutionNotes}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Εργασίες</h2>
        </div>

        {tasks.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            Δεν υπάρχουν εργασίες για αυτό το ακίνητο.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const assignments = safeArray(task.assignments)
              const latestAssignment = assignments[0] || null

              return (
                <div key={task.id} className="p-5">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-slate-900">
                          {task.title}
                        </div>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                            task.status
                          )}`}
                        >
                          {taskStatusLabel(task.status)}
                        </span>

                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {task.taskType}
                        </span>

                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          Προτεραιότητα: {task.priority}
                        </span>
                      </div>

                      {task.description ? (
                        <div className="mt-2 text-sm text-slate-700">
                          {task.description}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-sm text-slate-500">
                      Προγραμματισμός: {formatDate(task.scheduledDate)}
                      {task.scheduledStartTime ? ` · ${task.scheduledStartTime}` : ""}
                      {task.scheduledEndTime ? ` - ${task.scheduledEndTime}` : ""}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ανάθεση
                      </div>
                      <div className="mt-1 text-sm text-slate-900">
                        {latestAssignment?.partner?.name || "Δεν έχει ανατεθεί"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {latestAssignment
                          ? assignmentStatusLabel(latestAssignment.status)
                          : "—"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Checklist
                      </div>
                      <div className="mt-1 text-sm text-slate-900">
                        {task.checklistRun?.template?.title || "Δεν υπάρχει"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {task.checklistRun
                          ? checklistStatusLabel(task.checklistRun.status)
                          : "—"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Απαιτήσεις
                      </div>
                      <div className="mt-1 text-sm text-slate-900">
                        {task.requiresChecklist ? "Checklist " : ""}
                        {task.requiresPhotos ? "Φωτογραφίες " : ""}
                        {task.requiresApproval ? "Έγκριση " : ""}
                        {!task.requiresChecklist &&
                        !task.requiresPhotos &&
                        !task.requiresApproval
                          ? "Καμία ειδική απαίτηση"
                          : ""}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ολοκλήρωση
                      </div>
                      <div className="mt-1 text-sm text-slate-900">
                        {formatDateTime(task.completedAt)}
                      </div>
                    </div>
                  </div>

                  {task.notes ? (
                    <div className="mt-3 text-sm text-slate-600">
                      Σημειώσεις: {task.notes}
                    </div>
                  ) : null}

                  {task.resultNotes ? (
                    <div className="mt-2 text-sm text-slate-600">
                      Αποτέλεσμα: {task.resultNotes}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Πρότυπα checklist
            </h2>
          </div>

          {templates.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              Δεν υπάρχουν πρότυπα checklist για αυτό το ακίνητο.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {templates.map((template) => (
                <div key={template.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {template.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Τύπος: {template.templateType}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {template.isPrimary ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          Κύριο
                        </span>
                      ) : null}

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                          template.isActive ? "active" : "inactive"
                        )}`}
                      >
                        {template.isActive ? "Ενεργό" : "Ανενεργό"}
                      </span>
                    </div>
                  </div>

                  {template.description ? (
                    <div className="mt-3 text-sm text-slate-700">
                      {template.description}
                    </div>
                  ) : null}

                  <div className="mt-3 text-sm text-slate-600">
                    Στοιχεία checklist: {safeArray(template.items).length}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Αναλώσιμα</h2>
          </div>

          {supplies.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              Δεν υπάρχουν αναλώσιμα για αυτό το ακίνητο.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {supplies.map((supply) => {
                const threshold =
                  supply.reorderThreshold ??
                  supply.supplyItem?.minimumStock ??
                  null

                const lowStock =
                  threshold !== null &&
                  threshold !== undefined &&
                  Number(supply.currentStock || 0) <= Number(threshold)

                return (
                  <div key={supply.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">
                          {supply.supplyItem?.name || "Άγνωστο είδος"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {supply.supplyItem?.category || "—"} ·{" "}
                          {supply.supplyItem?.unit || "—"}
                        </div>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          lowStock
                            ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                            : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        }`}
                      >
                        {lowStock ? "Χαμηλό απόθεμα" : "Επαρκές"}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="text-sm text-slate-700">
                        Τρέχον: {supply.currentStock}
                      </div>
                      <div className="text-sm text-slate-700">
                        Στόχος: {supply.targetStock ?? "—"}
                      </div>
                      <div className="text-sm text-slate-700">
                        Όριο παραγγελίας: {threshold ?? "—"}
                      </div>
                    </div>

                    {supply.notes ? (
                      <div className="mt-2 text-sm text-slate-600">
                        {supply.notes}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Φωτογραφική τεκμηρίωση
            </h2>
          </div>

          {taskPhotos.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              Δεν υπάρχουν φωτογραφίες για αυτό το ακίνητο.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {taskPhotos.slice(0, 12).map((photo) => (
                <div key={photo.id} className="p-5">
                  <div className="font-medium text-slate-900">
                    {photo.fileName || "Αρχείο φωτογραφίας"}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Κατηγορία: {photo.category}
                  </div>
                  <div className="mt-1 text-sm text-slate-500 break-all">
                    {photo.fileUrl}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Ανέβηκε: {formatDateTime(photo.uploadedAt)}
                  </div>
                  {photo.caption ? (
                    <div className="mt-2 text-sm text-slate-700">
                      {photo.caption}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Συμβάντα & ιστορικό
            </h2>
          </div>

          <div className="max-h-[520px] overflow-auto">
            {events.length === 0 && activityLogs.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">
                Δεν υπάρχει ιστορικό για αυτό το ακίνητο.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {events.map((event) => (
                  <div key={`event-${event.id}`} className="p-5">
                    <div className="font-medium text-slate-900">{event.title}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {event.eventType} · {event.status}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDateTime(event.startAt)}{" "}
                      {event.endAt ? `— ${formatDateTime(event.endAt)}` : ""}
                    </div>
                    {event.description ? (
                      <div className="mt-2 text-sm text-slate-700">
                        {event.description}
                      </div>
                    ) : null}
                  </div>
                ))}

                {activityLogs.map((log) => (
                  <div key={`log-${log.id}`} className="p-5">
                    <div className="font-medium text-slate-900">
                      {log.action}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {log.entityType} · {log.actorName || log.actorType || "Σύστημα"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDateTime(log.createdAt)}
                    </div>
                    {log.message ? (
                      <div className="mt-2 text-sm text-slate-700">
                        {log.message}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}