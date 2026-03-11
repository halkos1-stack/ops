"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

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
  status: string
  defaultPartner?: {
    id: string
    name: string
    email: string
    specialty?: string | null
  } | null
}

type Booking = {
  id: string
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

type Partner = {
  id: string
  code: string
  name: string
  email: string
  phone?: string | null
  specialty: string
  status: string
}

type TaskAssignment = {
  id: string
  status: string
  assignedAt?: string | null
  acceptedAt?: string | null
  rejectedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  rejectionReason?: string | null
  notes?: string | null
  responseToken?: string | null
  checklistToken?: string | null
  assignmentEmailSentAt?: string | null
  checklistEmailSentAt?: string | null
  partner: Partner
}

type ChecklistItem = {
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

type ChecklistAnswer = {
  id: string
  checklistRunId: string
  templateItemId: string
  valueBoolean?: boolean | null
  valueText?: string | null
  valueNumber?: number | null
  valueSelect?: string | null
  notes?: string | null
  photoUrls?: string[] | null
  issueCreated?: boolean
  createdAt?: string
  updatedAt?: string
  templateItem: ChecklistItem
}

type ChecklistRun = {
  id: string
  taskId: string
  templateId: string
  status: string
  startedAt?: string | null
  completedAt?: string | null
  createdAt?: string
  updatedAt?: string
  template?: {
    id: string
    title: string
    description?: string | null
    templateType: string
    isPrimary: boolean
    isActive: boolean
    items?: ChecklistItem[]
  } | null
  answers?: ChecklistAnswer[]
}

type Issue = {
  id: string
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

type TaskPhoto = {
  id: string
  category: string
  fileUrl: string
  fileName?: string | null
  caption?: string | null
  takenAt?: string | null
  uploadedAt?: string | null
}

type ActivityLog = {
  id: string
  entityType: string
  entityId: string
  action: string
  message?: string | null
  actorType?: string | null
  actorName?: string | null
  metadata?: any
  createdAt?: string | null
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
  createdAt?: string
  updatedAt?: string
  property: Property
  booking?: Booking | null
  assignments?: TaskAssignment[]
  checklistRun?: ChecklistRun | null
  issues?: Issue[]
  taskPhotos?: TaskPhoto[]
  activityLogs?: ActivityLog[]
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

function getStatusBadgeClasses(status?: string | null) {
  const value = (status || "").toLowerCase()

  if (
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

function mapTaskTypeToUi(taskType?: string | null) {
  switch ((taskType || "").toLowerCase()) {
    case "cleaning":
      return "Καθαρισμός"
    case "inspection":
      return "Επιθεώρηση"
    case "damage":
      return "Ζημιές"
    case "repair":
      return "Βλάβες"
    case "supplies":
      return "Αναλώσιμα"
    case "photos":
      return "Φωτογραφική τεκμηρίωση"
    default:
      return taskType || "-"
  }
}

function mapPropertyTypeToUi(type?: string | null) {
  switch ((type || "").toLowerCase()) {
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

function calculateDuration(start?: string | null, end?: string | null) {
  if (!start || !end) return "—"

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate.getTime() < startDate.getTime()
  ) {
    return "—"
  }

  const diffMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60

  if (hours === 0) return `${minutes}λ`
  if (minutes === 0) return `${hours}ω`
  return `${hours}ω ${minutes}λ`
}

function getLatestAssignment(task: Task) {
  if (!task.assignments || task.assignments.length === 0) return null

  return [...task.assignments].sort((a, b) => {
    const first = a.assignedAt ? new Date(a.assignedAt).getTime() : 0
    const second = b.assignedAt ? new Date(b.assignedAt).getTime() : 0
    return second - first
  })[0]
}

function renderAnswerValue(answer: ChecklistAnswer) {
  if (answer.templateItem.itemType === "boolean") {
    if (answer.valueBoolean === true) return "Ναι"
    if (answer.valueBoolean === false) return "Όχι"
    return "—"
  }

  if (answer.templateItem.itemType === "text") {
    return answer.valueText || "—"
  }

  if (answer.templateItem.itemType === "number") {
    return answer.valueNumber ?? "—"
  }

  if (answer.templateItem.itemType === "select") {
    return answer.valueSelect || "—"
  }

  return "—"
}

export default function TaskDetailsPage() {
  const params = useParams()
  const taskId = Array.isArray(params?.taskId) ? params.taskId[0] : params?.taskId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [task, setTask] = useState<Task | null>(null)

  async function loadTask() {
    if (!taskId) return

    try {
      setLoading(true)
      setError("")

      const res = await fetch(`/api/tasks/${taskId}`, {
        cache: "no-store",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία φόρτωσης εργασίας.")
      }

      setTask(data)
    } catch (err) {
      console.error("Σφάλμα φόρτωσης εργασίας:", err)
      setError(
        err instanceof Error ? err.message : "Παρουσιάστηκε σφάλμα κατά τη φόρτωση."
      )
      setTask(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTask()
  }, [taskId])

  const latestAssignment = useMemo(() => {
    return task ? getLatestAssignment(task) : null
  }, [task])

  const duration = useMemo(() => {
    if (!task) return "—"

    return calculateDuration(
      latestAssignment?.startedAt || task.checklistRun?.startedAt,
      latestAssignment?.completedAt || task.checklistRun?.completedAt
    )
  }, [task, latestAssignment])

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Φόρτωση εργασίας...</p>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-red-700">
            Δεν βρέθηκε η εργασία
          </h1>
          <p className="mt-2 text-sm text-red-600">
            Η εργασία που ζητήθηκε δεν υπάρχει ή δεν μπορεί να φορτωθεί.
          </p>

          <div className="mt-6">
            <Link
              href="/tasks"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Επιστροφή στις εργασίες
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
            <p className="text-sm text-slate-500">Λεπτομέρειες εργασίας</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              {task.title}
            </h1>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={cls(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  getStatusBadgeClasses(task.status)
                )}
              >
                {task.status || "—"}
              </span>

              <span
                className={cls(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  getPriorityBadgeClasses(task.priority)
                )}
              >
                {task.priority || "normal"}
              </span>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {mapTaskTypeToUi(task.taskType)}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              {task.property.name} • {task.property.code} • {task.property.address}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/tasks"
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Επιστροφή στις εργασίες
            </Link>

            <Link
              href={`/properties/${task.property.id}`}
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Μετάβαση στο ακίνητο
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Ημερομηνία</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {formatDate(task.scheduledDate)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Προγραμματισμένη ώρα</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {task.scheduledStartTime || "—"}
            {task.scheduledEndTime ? ` - ${task.scheduledEndTime}` : ""}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Διάρκεια</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{duration}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Checklist απαντήσεις</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {task.checklistRun?.answers?.length || 0}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Συμβάντα</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {task.issues?.length || 0}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-950">Στοιχεία εργασίας</h2>
              <p className="mt-1 text-sm text-slate-500">
                Βασικά δεδομένα, περιγραφή και κανόνες εκτέλεσης.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Τίτλος</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {task.title}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Κατηγορία</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {mapTaskTypeToUi(task.taskType)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Πηγή</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {task.source || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Ολοκλήρωση</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDateTime(task.completedAt)}
                </p>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Περιγραφή</p>
                <p className="mt-1 text-sm text-slate-800">
                  {task.description || "Δεν υπάρχει περιγραφή εργασίας."}
                </p>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Σημειώσεις διαχειριστή</p>
                <p className="mt-1 text-sm text-slate-800">
                  {task.notes || "Δεν υπάρχουν σημειώσεις."}
                </p>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Τελικό αποτέλεσμα</p>
                <p className="mt-1 text-sm text-slate-800">
                  {task.resultNotes || "Δεν υπάρχουν τελικές σημειώσεις."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {task.requiresChecklist ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Απαιτεί checklist
                </span>
              ) : null}

              {task.requiresPhotos ? (
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  Απαιτεί φωτογραφίες
                </span>
              ) : null}

              {task.requiresApproval ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Απαιτεί έγκριση
                </span>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-950">Αναθέσεις</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ιστορικό ανάθεσης, αποδοχής, έναρξης και ολοκλήρωσης.
              </p>
            </div>

            {!task.assignments || task.assignments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Δεν υπάρχει ιστορικό ανάθεσης.
              </div>
            ) : (
              <div className="space-y-4">
                {task.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-base font-semibold text-slate-950">
                          {assignment.partner.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {assignment.partner.email} • {assignment.partner.specialty}
                        </p>
                      </div>

                      <span
                        className={cls(
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          getStatusBadgeClasses(assignment.status)
                        )}
                      >
                        {assignment.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-xs text-slate-500">Ανάθεση</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {formatDateTime(assignment.assignedAt)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-xs text-slate-500">Αποδοχή</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {formatDateTime(assignment.acceptedAt)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-xs text-slate-500">Απόρριψη</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {formatDateTime(assignment.rejectedAt)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-xs text-slate-500">Έναρξη</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {formatDateTime(assignment.startedAt)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-xs text-slate-500">Ολοκλήρωση</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {formatDateTime(assignment.completedAt)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-xs text-slate-500">Διάρκεια</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {calculateDuration(
                            assignment.startedAt,
                            assignment.completedAt
                          )}
                        </p>
                      </div>
                    </div>

                    {assignment.rejectionReason ? (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-semibold text-red-700">
                          Αιτιολογία απόρριψης
                        </p>
                        <p className="mt-1 text-sm text-red-700">
                          {assignment.rejectionReason}
                        </p>
                      </div>
                    ) : null}

                    {assignment.notes ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-700">
                          Σημειώσεις ανάθεσης
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {assignment.notes}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-950">Checklist run</h2>
              <p className="mt-1 text-sm text-slate-500">
                Πρότυπο, κατάσταση, χρονισμοί και απαντήσεις checklist.
              </p>
            </div>

            {!task.checklistRun ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Δεν υπάρχει συνδεδεμένο checklist run για αυτή την εργασία.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {task.checklistRun.template?.title || "Checklist"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {task.checklistRun.template?.description ||
                          "Δεν υπάρχει περιγραφή προτύπου checklist."}
                      </p>
                    </div>

                    <span
                      className={cls(
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        getStatusBadgeClasses(task.checklistRun.status)
                      )}
                    >
                      {task.checklistRun.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Έναρξη checklist</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {formatDateTime(task.checklistRun.startedAt)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Ολοκλήρωση checklist</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {formatDateTime(task.checklistRun.completedAt)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Απαντήσεις</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {task.checklistRun.answers?.length || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {!task.checklistRun.answers || task.checklistRun.answers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                    Δεν υπάρχουν ακόμη απαντήσεις checklist.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {task.checklistRun.answers.map((answer) => (
                      <div
                        key={answer.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              {answer.templateItem.label}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {answer.templateItem.description || "Χωρίς περιγραφή"}
                            </p>
                          </div>

                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                            {answer.templateItem.itemType}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-slate-200 p-3">
                            <p className="text-xs text-slate-500">Απάντηση</p>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {renderAnswerValue(answer)}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-200 p-3">
                            <p className="text-xs text-slate-500">Σημειώσεις</p>
                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {answer.notes || "—"}
                            </p>
                          </div>
                        </div>

                        {answer.photoUrls &&
                        Array.isArray(answer.photoUrls) &&
                        answer.photoUrls.length > 0 ? (
                          <div className="mt-4 rounded-xl border border-slate-200 p-3">
                            <p className="text-xs text-slate-500">Σύνδεσμοι φωτογραφιών</p>
                            <div className="mt-2 space-y-2">
                              {answer.photoUrls.map((url, index) => (
                                <div key={`${answer.id}-${index}`} className="text-sm">
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 underline"
                                  >
                                    Φωτογραφία {index + 1}
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-950">Συμβάντα εργασίας</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ζημιές, βλάβες και λοιπά συμβάντα που συνδέονται με την εργασία.
              </p>
            </div>

            {!task.issues || task.issues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Δεν υπάρχουν συνδεδεμένα συμβάντα.
              </div>
            ) : (
              <div className="space-y-3">
                {task.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {issue.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {issue.description || "Δεν υπάρχει περιγραφή."}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={cls(
                            "rounded-full border px-3 py-1 text-xs font-semibold",
                            getStatusBadgeClasses(issue.status)
                          )}
                        >
                          {issue.status || "—"}
                        </span>

                        <span
                          className={cls(
                            "rounded-full border px-3 py-1 text-xs font-semibold",
                            getPriorityBadgeClasses(issue.severity)
                          )}
                        >
                          {issue.severity || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      {issue.issueType} • {formatDateTime(issue.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-950">Ιστορικό ενεργειών</h2>
              <p className="mt-1 text-sm text-slate-500">
                Καταγραφή ενεργειών της εργασίας για πλήρες audit trail.
              </p>
            </div>

            {!task.activityLogs || task.activityLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Δεν υπάρχει ιστορικό ενεργειών.
              </div>
            ) : (
              <div className="space-y-3">
                {task.activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {log.message || log.action}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {log.actorType || "system"} • {log.actorName || "—"} •{" "}
                          {log.action}
                        </p>
                      </div>

                      <div className="text-xs text-slate-500">
                        {formatDateTime(log.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-950">Ακίνητο</h2>
              <p className="mt-1 text-sm text-slate-500">
                Βασική εικόνα του ακινήτου που συνδέεται με την εργασία.
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <div>
                <strong>Όνομα:</strong> {task.property.name}
              </div>
              <div>
                <strong>Κωδικός:</strong> {task.property.code}
              </div>
              <div>
                <strong>Διεύθυνση:</strong> {task.property.address}
              </div>
              <div>
                <strong>Πόλη:</strong> {task.property.city}
              </div>
              <div>
                <strong>Περιοχή:</strong> {task.property.region}
              </div>
              <div>
                <strong>Τύπος:</strong> {mapPropertyTypeToUi(task.property.type)}
              </div>
              <div>
                <strong>Κατάσταση:</strong> {task.property.status}
              </div>
            </div>

            {task.property.defaultPartner ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Προεπιλεγμένος συνεργάτης
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {task.property.defaultPartner.name}
                </p>
                <p className="text-xs text-slate-500">
                  {task.property.defaultPartner.email} •{" "}
                  {task.property.defaultPartner.specialty}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-950">Τρέχουσα ανάθεση</h2>
              <p className="mt-1 text-sm text-slate-500">
                Η πιο πρόσφατη κατάσταση συνεργάτη για αυτή την εργασία.
              </p>
            </div>

            {!latestAssignment ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Δεν υπάρχει τρέχουσα ανάθεση.
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-700">
                <div>
                  <strong>Συνεργάτης:</strong> {latestAssignment.partner.name}
                </div>
                <div>
                  <strong>Email:</strong> {latestAssignment.partner.email}
                </div>
                <div>
                  <strong>Ειδικότητα:</strong> {latestAssignment.partner.specialty}
                </div>
                <div>
                  <strong>Κατάσταση:</strong> {latestAssignment.status}
                </div>
                <div>
                  <strong>Ανάθεση:</strong> {formatDateTime(latestAssignment.assignedAt)}
                </div>
                <div>
                  <strong>Αποδοχή:</strong> {formatDateTime(latestAssignment.acceptedAt)}
                </div>
                <div>
                  <strong>Έναρξη:</strong> {formatDateTime(latestAssignment.startedAt)}
                </div>
                <div>
                  <strong>Ολοκλήρωση:</strong> {formatDateTime(latestAssignment.completedAt)}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-950">Κράτηση</h2>
              <p className="mt-1 text-sm text-slate-500">
                Αν η εργασία σχετίζεται με check-in / check-out ή κράτηση.
              </p>
            </div>

            {!task.booking ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Δεν υπάρχει συνδεδεμένη κράτηση.
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-700">
                <div>
                  <strong>Επισκέπτης:</strong> {task.booking.guestName || "—"}
                </div>
                <div>
                  <strong>Πλατφόρμα:</strong> {task.booking.sourcePlatform || "—"}
                </div>
                <div>
                  <strong>Check-in:</strong> {formatDate(task.booking.checkInDate)}
                </div>
                <div>
                  <strong>Check-out:</strong> {formatDate(task.booking.checkOutDate)}
                </div>
                <div>
                  <strong>Κατάσταση:</strong> {task.booking.status || "—"}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-950">Φωτογραφίες</h2>
              <p className="mt-1 text-sm text-slate-500">
                Συνδεδεμένες φωτογραφίες εργασίας.
              </p>
            </div>

            {!task.taskPhotos || task.taskPhotos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Δεν υπάρχουν συνδεδεμένες φωτογραφίες.
              </div>
            ) : (
              <div className="space-y-3">
                {task.taskPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="text-sm text-slate-700">
                      <div>
                        <strong>Κατηγορία:</strong> {photo.category}
                      </div>
                      <div>
                        <strong>Αρχείο:</strong> {photo.fileName || "Χωρίς όνομα"}
                      </div>
                      <div>
                        <strong>Λεζάντα:</strong> {photo.caption || "—"}
                      </div>
                      <div>
                        <strong>Μεταφόρτωση:</strong> {formatDateTime(photo.uploadedAt)}
                      </div>
                      <div className="mt-2">
                        <a
                          href={photo.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          Άνοιγμα φωτογραφίας
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  )
}