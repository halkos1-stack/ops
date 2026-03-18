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
  responseTokenExpiresAt?: string | null
  checklistTokenExpiresAt?: string | null
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
  metadata?: unknown
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
  alertEnabled?: boolean
  alertAt?: string | null
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

type AssignmentCreateResponse = {
  success: boolean
  assignment: TaskAssignment
  portalLink?: string | null
  assignmentEmailSent?: boolean
  assignmentEmailSendReason?: string | null
  error?: string
  blockingStatus?: string
  blockingAssignmentId?: string
}

type PartnerPortalLinkResponse = {
  partner: {
    id: string
    name: string
    email: string
  }
  portalAccess?: {
    id: string
    token: string
    isActive: boolean
    expiresAt?: string | null
    createdAt?: string | null
    lastUsedAt?: string | null
    portalUrl: string
  } | null
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

function formatDateTimeCompact(value?: string | null) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function mapStatusToUi(status?: string | null) {
  switch ((status || "").trim().toLowerCase()) {
    case "assigned":
      return "Ανατέθηκε"
    case "accepted":
      return "Αποδεκτή"
    case "rejected":
      return "Απορρίφθηκε"
    case "cancelled":
      return "Ακυρώθηκε"
    case "pending":
      return "Σε αναμονή"
    case "in_progress":
      return "Σε εξέλιξη"
    case "started":
      return "Ξεκίνησε"
    case "completed":
      return "Ολοκληρώθηκε"
    case "active":
      return "Ενεργό"
    case "inactive":
      return "Ανενεργό"
    case "open":
      return "Ανοιχτό"
    case "resolved":
      return "Επιλύθηκε"
    case "overdue":
      return "Εκπρόθεσμο"
    case "draft":
      return "Πρόχειρο"
    case "submitted":
      return "Υποβλήθηκε"
    default:
      return status || "—"
  }
}

function mapPriorityToUi(priority?: string | null) {
  switch ((priority || "").trim().toLowerCase()) {
    case "urgent":
      return "Επείγον"
    case "critical":
      return "Κρίσιμο"
    case "high":
      return "Υψηλή"
    case "medium":
      return "Μεσαία"
    case "normal":
      return "Κανονική"
    case "low":
      return "Χαμηλή"
    default:
      return priority || "—"
  }
}

function mapChecklistItemTypeToUi(itemType?: string | null) {
  switch ((itemType || "").trim().toLowerCase()) {
    case "boolean":
      return "Ναι / Όχι"
    case "text":
      return "Κείμενο"
    case "number":
      return "Αριθμός"
    case "select":
      return "Επιλογή"
    case "photo":
      return "Φωτογραφία"
    default:
      return itemType || "—"
  }
}

function mapIssueTypeToUi(issueType?: string | null) {
  switch ((issueType || "").trim().toLowerCase()) {
    case "damage":
      return "Ζημιά"
    case "repair":
      return "Βλάβη"
    case "supplies":
      return "Αναλώσιμα"
    case "inspection":
      return "Επιθεώρηση"
    case "cleaning":
      return "Καθαρισμός"
    default:
      return issueType || "—"
  }
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

function getStatusBadgeClasses(status?: string | null) {
  const value = (status || "").toLowerCase()

  if (
    value.includes("completed") ||
    value.includes("resolved") ||
    value.includes("accepted") ||
    value.includes("active") ||
    value.includes("ολοκληρ") ||
    value.includes("αποδεκ") ||
    value.includes("ενεργ")
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
    value.includes("ακυρ") ||
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
    value.includes("high") ||
    value.includes("υψη") ||
    value.includes("επείγ")
  ) {
    return "bg-red-50 text-red-700 border-red-200"
  }

  if (
    value.includes("normal") ||
    value.includes("medium") ||
    value.includes("μεσα") ||
    value.includes("κανον")
  ) {
    return "bg-amber-50 text-amber-700 border-amber-200"
  }

  if (value.includes("low") || value.includes("χαμη")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }

  return "bg-slate-50 text-slate-700 border-slate-200"
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

function getTaskWorkflowHelp(status?: string | null) {
  const value = String(status || "").toLowerCase()

  switch (value) {
    case "pending":
      return "Νέα εργασία — χρειάζεται ανάθεση σε συνεργάτη."
    case "assigned":
      return "Ανατεθειμένη — αναμονή αποδοχής από τον συνεργάτη."
    case "accepted":
      return "Ο συνεργάτης αποδέχτηκε την εργασία."
    case "in_progress":
      return "Η εργασία βρίσκεται σε εξέλιξη."
    case "completed":
      return "Η εργασία ολοκληρώθηκε και η λίστα υποβλήθηκε."
    case "cancelled":
      return "Η εργασία έχει ακυρωθεί και παραμένει διαθέσιμη μόνο για ιστορικό και έλεγχο."
    default:
      return "Παρακολούθηση κατάστασης και ενεργειών της εργασίας."
  }
}

function getChecklistStatusHelp(run?: ChecklistRun | null, taskStatus?: string | null) {
  const normalizedTaskStatus = String(taskStatus || "").toLowerCase()

  if (normalizedTaskStatus === "cancelled") {
    if (!run) return "Η εργασία ακυρώθηκε χωρίς να χρησιμοποιηθεί checklist."
    return "Η εργασία ακυρώθηκε. Το checklist παραμένει μόνο για ιστορικό."
  }

  if (!run) return "Δεν υπάρχει συνδεδεμένη λίστα για αυτή την εργασία."

  const status = String(run.status || "").toLowerCase()

  if (run.completedAt || status === "completed" || status === "submitted") {
    return "Η λίστα έχει υποβληθεί."
  }

  if (run.startedAt || status === "in_progress" || status === "started") {
    return "Η λίστα έχει ξεκινήσει αλλά δεν έχει ολοκληρωθεί ακόμη."
  }

  if (status === "pending") {
    return "Η λίστα είναι έτοιμη αλλά δεν έχει ξεκινήσει."
  }

  return "Η λίστα συνδέεται με την εργασία και περιμένει εκτέλεση."
}

function getAssignmentButtonLabel(task: Task, latestAssignment: TaskAssignment | null) {
  const status = String(task.status || "").toLowerCase()

  if (status === "cancelled") return "Η εργασία είναι ακυρωμένη"

  if (!latestAssignment) return "Ανάθεση σε συνεργάτη"
  if (status === "pending") return "Νέα ανάθεση"
  if (status === "assigned") return "Αλλαγή / νέα ανάθεση"
  if (status === "accepted") return "Αλλαγή συνεργάτη"
  if (status === "in_progress") return "Επανεκχώρηση εργασίας"
  if (status === "completed") return "Νέα ανάθεση"
  return "Ανάθεση σε συνεργάτη"
}

function getChecklistButtonLabel(task: Task) {
  if (!task.checklistRun?.template?.id) return "Διαχείριση λίστας"
  return "Επεξεργασία λίστας"
}

function getChecklistSubmitted(task: Task) {
  const run = task.checklistRun
  if (!run) return false

  const status = String(run.status || "").toLowerCase()
  return Boolean(run.completedAt) || status === "completed" || status === "submitted"
}

function getPrimaryDateTimeForDeadline(task: Task) {
  if (task.dueDate) {
    const due = new Date(task.dueDate)
    if (!Number.isNaN(due.getTime())) return due
  }

  if (task.scheduledDate) {
    const datePart = String(task.scheduledDate).slice(0, 10)
    const timePart =
      task.scheduledEndTime && /^\d{2}:\d{2}/.test(task.scheduledEndTime)
        ? String(task.scheduledEndTime).slice(0, 5)
        : task.scheduledStartTime && /^\d{2}:\d{2}/.test(task.scheduledStartTime)
        ? String(task.scheduledStartTime).slice(0, 5)
        : "23:59"

    const composed = new Date(`${datePart}T${timePart}:00`)
    if (!Number.isNaN(composed.getTime())) return composed
  }

  return null
}

function isTaskOverdue(task: Task) {
  const status = String(task.status || "").toLowerCase()
  if (["completed", "cancelled"].includes(status)) return false

  const deadline = getPrimaryDateTimeForDeadline(task)
  if (!deadline) return false

  return Date.now() > deadline.getTime()
}

function getBorderlineAlertText(task: Task) {
  const deadline = getPrimaryDateTimeForDeadline(task)
  if (!deadline) return "Η εργασία έχει ξεπεράσει τον προγραμματισμένο χρόνο."

  return `Η εργασία δεν έχει εκτελεστεί στον χρόνο που έχει οριστεί (${formatDateTime(
    deadline.toISOString()
  )}).`
}

function getCurrentExecutionWindow(task: Task) {
  const date = formatDate(task.scheduledDate)
  const start = task.scheduledStartTime || "—"
  const end = task.scheduledEndTime ? ` - ${task.scheduledEndTime}` : ""
  return `${date} · ${start}${end}`
}

function isManualAlertTriggered(task: Task) {
  if (!task.alertEnabled || !task.alertAt) return false

  const alertDate = new Date(task.alertAt)
  if (Number.isNaN(alertDate.getTime())) return false

  const status = String(task.status || "").toLowerCase()
  if (["completed", "cancelled"].includes(status)) return false

  return Date.now() >= alertDate.getTime()
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-bold text-slate-950 break-words">{value}</p>
    </div>
  )
}

function FieldCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 break-words">{value}</p>
    </div>
  )
}

export default function TaskDetailsPage() {
  const params = useParams()
  const taskId = Array.isArray(params?.taskId) ? params.taskId[0] : params?.taskId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [task, setTask] = useState<Task | null>(null)

  const [partners, setPartners] = useState<Partner[]>([])
  const [partnersLoading, setPartnersLoading] = useState(false)
  const [partnersError, setPartnersError] = useState("")

  const [selectedPartnerId, setSelectedPartnerId] = useState("")
  const [assignmentNotes, setAssignmentNotes] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [assignmentError, setAssignmentError] = useState("")
  const [assignmentSuccess, setAssignmentSuccess] = useState("")
  const [latestPortalLink, setLatestPortalLink] = useState("")

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

  async function loadPartners() {
    try {
      setPartnersLoading(true)
      setPartnersError("")

      const res = await fetch(`/api/partners?status=active`, {
        cache: "no-store",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία φόρτωσης συνεργατών.")
      }

      setPartners(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Σφάλμα φόρτωσης συνεργατών:", err)
      setPartners([])
      setPartnersError(
        err instanceof Error ? err.message : "Αποτυχία φόρτωσης συνεργατών."
      )
    } finally {
      setPartnersLoading(false)
    }
  }

  useEffect(() => {
    loadTask()
    loadPartners()
  }, [taskId])

  const latestAssignment = useMemo(() => {
    return task ? getLatestAssignment(task) : null
  }, [task])

  const isCancelled = useMemo(() => {
    return String(task?.status || "").toLowerCase() === "cancelled"
  }, [task])

  const manualAlertTriggered = useMemo(() => {
    if (!task) return false
    return isManualAlertTriggered(task)
  }, [task])

  useEffect(() => {
    if (task?.property?.defaultPartner?.id) {
      setSelectedPartnerId(task.property.defaultPartner.id)
    }
  }, [task?.property?.defaultPartner?.id])

  useEffect(() => {
    async function loadPortalLink() {
      if (!latestAssignment?.partner?.id) {
        setLatestPortalLink("")
        return
      }

      try {
        const res = await fetch(
          `/api/partners/${latestAssignment.partner.id}/portal-link`,
          {
            cache: "no-store",
          }
        )

        const data = (await res.json().catch(() => null)) as PartnerPortalLinkResponse | null

        if (!res.ok) {
          setLatestPortalLink("")
          return
        }

        setLatestPortalLink(data?.portalAccess?.portalUrl || "")
      } catch {
        setLatestPortalLink("")
      }
    }

    loadPortalLink()
  }, [latestAssignment?.partner?.id])

  const duration = useMemo(() => {
    if (!task) return "—"

    return calculateDuration(
      latestAssignment?.startedAt || task.checklistRun?.startedAt,
      latestAssignment?.completedAt || task.checklistRun?.completedAt
    )
  }, [task, latestAssignment])

  const checklistSubmitted = useMemo(() => {
    if (!task) return false
    return getChecklistSubmitted(task)
  }, [task])

  const overdue = useMemo(() => {
    if (!task) return false
    return isTaskOverdue(task)
  }, [task])

  async function handleCreateAssignment() {
    if (!task || !selectedPartnerId) {
      setAssignmentError("Επέλεξε συνεργάτη πριν δημιουργήσεις ανάθεση.")
      return
    }

    if (isCancelled) {
      setAssignmentError("Η εργασία είναι ακυρωμένη και δεν μπορεί να ανατεθεί ξανά.")
      return
    }

    try {
      setAssigning(true)
      setAssignmentError("")
      setAssignmentSuccess("")

      const res = await fetch("/api/task-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: task.id,
          partnerId: selectedPartnerId,
          notes: assignmentNotes,
        }),
      })

      const data = (await res.json().catch(() => null)) as AssignmentCreateResponse | null

      if (!res.ok) {
        const message =
          data?.error ||
          (res.status === 409
            ? "Η εργασία δεν μπορεί να ανατεθεί ξανά αυτή τη στιγμή."
            : "Αποτυχία δημιουργίας ανάθεσης.")

        throw new Error(message)
      }

      setAssignmentSuccess(
        data?.assignmentEmailSent
          ? "Η ανάθεση δημιουργήθηκε και στάλθηκε email στον συνεργάτη."
          : "Η ανάθεση δημιουργήθηκε. Χρησιμοποίησε το link portal συνεργάτη παρακάτω."
      )

      setLatestPortalLink(data?.portalLink || "")
      setAssignmentNotes("")

      await loadTask()
    } catch (err) {
      console.error("Σφάλμα δημιουργίας ανάθεσης:", err)
      setAssignmentError(
        err instanceof Error ? err.message : "Αποτυχία δημιουργίας ανάθεσης."
      )
    } finally {
      setAssigning(false)
    }
  }

  async function copyToClipboard(value: string, successText: string) {
    try {
      await navigator.clipboard.writeText(value)
      setAssignmentSuccess(successText)
      setAssignmentError("")
    } catch {
      setAssignmentError("Αποτυχία αντιγραφής στο πρόχειρο.")
    }
  }

  const filteredPartners = useMemo(() => {
    if (!task?.property?.defaultPartner?.id) return partners

    const unique = new Map<string, Partner>()
    for (const partner of partners) {
      unique.set(partner.id, partner)
    }

    return Array.from(unique.values())
  }, [partners, task?.property?.defaultPartner?.id])

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
          <h1 className="text-xl font-bold text-red-700">Δεν βρέθηκε η εργασία</h1>
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
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500">Λεπτομέρειες εργασίας</p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {task.title}
            </h1>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={cls(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  getStatusBadgeClasses(task.status)
                )}
              >
                {mapStatusToUi(task.status)}
              </span>

              <span
                className={cls(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  getPriorityBadgeClasses(task.priority)
                )}
              >
                {mapPriorityToUi(task.priority || "normal")}
              </span>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {mapTaskTypeToUi(task.taskType)}
              </span>

              {task.checklistRun?.template?.title ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Λίστα: {task.checklistRun.template.title}
                </span>
              ) : null}

              {task.alertEnabled && task.alertAt ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Alert: {formatDateTime(task.alertAt)}
                </span>
              ) : null}

              {isCancelled ? (
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                  Ιστορικό ακύρωσης
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-sm text-slate-600">
              {task.property.name} • {task.property.code} • {task.property.address}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {getTaskWorkflowHelp(task.status)}
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

        {isCancelled ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Η εργασία έχει ακυρωθεί
                </p>
                <p className="mt-1 text-sm text-red-700">
                  Η εργασία δεν ανήκει πλέον στις ενεργές ροές και παραμένει διαθέσιμη μόνο για ιστορικό, έλεγχο και audit trail.
                </p>
              </div>

              <Link
                href={`/properties/${task.property.id}/tasks/history`}
                className="inline-flex shrink-0 items-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                Άνοιγμα ιστορικού ακινήτου
              </Link>
            </div>
          </div>
        ) : manualAlertTriggered ? (
          <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-700">
                  Ενεργοποιημένο χειροκίνητο alert
                </p>
                <p className="mt-1 text-sm text-orange-700">
                  Το προγραμματισμένο alert της εργασίας έχει φτάσει ({formatDateTime(task.alertAt)}).
                </p>
              </div>

              <Link
                href={`/properties/${task.property.id}/tasks`}
                className="inline-flex shrink-0 items-center rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100"
              >
                Άνοιγμα εργασιών ακινήτου
              </Link>
            </div>
          </div>
        ) : overdue ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Alert καθυστέρησης εργασίας
                </p>
                <p className="mt-1 text-sm text-red-700">
                  {getBorderlineAlertText(task)}
                </p>
              </div>

              <Link
                href={`/properties/${task.property.id}/tasks`}
                className="inline-flex shrink-0 items-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                Άνοιγμα εργασιών ακινήτου
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Ημερομηνία" value={formatDate(task.scheduledDate)} />
        <StatCard label="Παράθυρο εκτέλεσης" value={getCurrentExecutionWindow(task)} />
        <StatCard label="Διάρκεια" value={duration} />
        <StatCard
          label="Ενεργή λίστα"
          value={task.checklistRun?.template?.title || "Χωρίς λίστα"}
        />
        <StatCard
          label="Κατάσταση λίστας"
          value={
            isCancelled
              ? task.checklistRun
                ? "Διατηρείται στο ιστορικό"
                : "Δεν χρησιμοποιήθηκε"
              : checklistSubmitted
              ? "Υποβλήθηκε"
              : "Δεν υποβλήθηκε"
          }
        />
        <StatCard
          label="Χειροκίνητο alert"
          value={
            task.alertEnabled && task.alertAt
              ? formatDateTime(task.alertAt)
              : "Δεν υπάρχει"
          }
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-slate-950">Πεδίο εργασίας</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Καθαρή εικόνα της εργασίας, του προγραμματισμού, της λίστας και των
                  ενεργειών που χρειάζονται.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCreateAssignment}
                  disabled={assigning || !selectedPartnerId || isCancelled}
                  className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {assigning
                    ? "Δημιουργία ανάθεσης..."
                    : getAssignmentButtonLabel(task, latestAssignment)}
                </button>

                {task.checklistRun?.template?.id ? (
                  <Link
                    href={`/property-checklists/${task.property.id}/templates/${task.checklistRun.template.id}`}
                    className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {getChecklistButtonLabel(task)}
                  </Link>
                ) : (
                  <Link
                    href={`/property-checklists/${task.property.id}`}
                    className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Διαχείριση λίστας
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FieldCard label="Τίτλος" value={task.title} />
              <FieldCard label="Κατηγορία" value={mapTaskTypeToUi(task.taskType)} />
              <FieldCard label="Κατάσταση εργασίας" value={mapStatusToUi(task.status)} />
              <FieldCard label="Προτεραιότητα" value={mapPriorityToUi(task.priority || "normal")} />

              <FieldCard label="Ημερομηνία" value={formatDate(task.scheduledDate)} />
              <FieldCard
                label="Ώρα εκτέλεσης"
                value={`${task.scheduledStartTime || "—"}${
                  task.scheduledEndTime ? ` - ${task.scheduledEndTime}` : ""
                }`}
              />
              <FieldCard
                label="Ενεργή λίστα"
                value={task.checklistRun?.template?.title || "Χωρίς λίστα"}
              />
              <FieldCard
                label="Κατάσταση λίστας"
                value={
                  isCancelled
                    ? task.checklistRun
                      ? "Διατηρείται στο պատմικό"
                      : "Δεν χρησιμοποιήθηκε"
                    : checklistSubmitted
                    ? "Υποβλήθηκε"
                    : "Δεν υποβλήθηκε"
                }
              />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Οδηγία κατάστασης</p>
              <p className="mt-1 text-sm text-slate-700">{getTaskWorkflowHelp(task.status)}</p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Οδηγία λίστας</p>
              <p className="mt-1 text-sm text-slate-700">
                {getChecklistStatusHelp(task.checklistRun, task.status)}
              </p>
            </div>

            {task.alertEnabled && task.alertAt ? (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-700">Προγραμματισμένο alert</p>
                <p className="mt-1 text-sm text-blue-700">
                  Το alert έχει οριστεί για: {formatDateTime(task.alertAt)}
                </p>
              </div>
            ) : null}

            {task.description ? (
              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Περιγραφή εργασίας</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-800">
                  {task.description}
                </p>
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Σημειώσεις διαχειριστή</p>
                <p className="mt-1 text-sm text-slate-800">
                  {task.notes || "Δεν υπάρχουν σημειώσεις."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">
                  {isCancelled ? "Σημείωση ακύρωσης" : "Τελικό αποτέλεσμα"}
                </p>
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
              <h2 className="text-2xl font-bold text-slate-950">Διαχείριση ανάθεσης</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ανάθεσε την εργασία σε συνεργάτη και πάρε link portal.
              </p>
            </div>

            {isCancelled ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Η εργασία είναι ακυρωμένη. Δεν επιτρέπεται νέα ανάθεση από αυτή τη σελίδα.
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Επιλογή συνεργάτη
                </label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  disabled={isCancelled}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">Επέλεξε συνεργάτη</option>
                  {filteredPartners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name} · {partner.specialty} · {partner.email}
                    </option>
                  ))}
                </select>

                {partnersLoading ? (
                  <p className="mt-2 text-xs text-slate-500">Φόρτωση συνεργατών...</p>
                ) : null}

                {partnersError ? (
                  <p className="mt-2 text-xs text-red-600">{partnersError}</p>
                ) : null}

                {task.property.defaultPartner ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Προεπιλεγμένος συνεργάτης ακινήτου: {task.property.defaultPartner.name}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Σημειώσεις ανάθεσης
                </label>
                <textarea
                  rows={4}
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  disabled={isCancelled}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="Προαιρετικές οδηγίες προς συνεργάτη"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCreateAssignment}
                disabled={assigning || isCancelled}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assigning
                  ? "Δημιουργία ανάθεσης..."
                  : getAssignmentButtonLabel(task, latestAssignment)}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAssignmentNotes("")
                  setAssignmentError("")
                  setAssignmentSuccess("")
                }}
                disabled={isCancelled}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Καθαρισμός
              </button>
            </div>

            {assignmentError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {assignmentError}
              </div>
            ) : null}

            {assignmentSuccess ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {assignmentSuccess}
              </div>
            ) : null}

            {latestPortalLink && !isCancelled ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Link portal συνεργάτη</p>
                <p className="mt-2 break-all text-sm text-slate-600">{latestPortalLink}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        latestPortalLink,
                        "Το link portal συνεργάτη αντιγράφηκε."
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Αντιγραφή link
                  </button>

                  <a
                    href={latestPortalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Άνοιγμα portal
                  </a>
                </div>
              </div>
            ) : null}
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
                        {mapStatusToUi(assignment.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <FieldCard label="Ανάθεση" value={formatDateTime(assignment.assignedAt)} />
                      <FieldCard label="Αποδοχή" value={formatDateTime(assignment.acceptedAt)} />
                      <FieldCard label="Απόρριψη" value={formatDateTime(assignment.rejectedAt)} />
                      <FieldCard label="Έναρξη" value={formatDateTime(assignment.startedAt)} />
                      <FieldCard label="Ολοκλήρωση" value={formatDateTime(assignment.completedAt)} />
                      <FieldCard
                        label="Διάρκεια"
                        value={calculateDuration(assignment.startedAt, assignment.completedAt)}
                      />
                    </div>

                    {assignment.rejectionReason ? (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-semibold text-red-700">Αιτιολογία απόρριψης</p>
                        <p className="mt-1 text-sm text-red-700">{assignment.rejectionReason}</p>
                      </div>
                    ) : null}

                    {assignment.notes ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-700">Σημειώσεις ανάθεσης</p>
                        <p className="mt-1 text-sm text-slate-700">{assignment.notes}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">Checklist run</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Πρότυπο, κατάσταση, χρονισμοί και απαντήσεις checklist.
                </p>
              </div>

              {task.checklistRun?.template?.id ? (
                <Link
                  href={`/property-checklists/${task.property.id}/templates/${task.checklistRun.template.id}`}
                  className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {getChecklistButtonLabel(task)}
                </Link>
              ) : null}
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
                      {mapStatusToUi(task.checklistRun.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <FieldCard
                      label="Έναρξη checklist"
                      value={formatDateTime(task.checklistRun.startedAt)}
                    />
                    <FieldCard
                      label="Ολοκλήρωση checklist"
                      value={formatDateTime(task.checklistRun.completedAt)}
                    />
                    <FieldCard
                      label="Απαντήσεις"
                      value={String(task.checklistRun.answers?.length || 0)}
                    />
                  </div>
                </div>

                {!task.checklistRun.answers || task.checklistRun.answers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                    {isCancelled
                      ? "Δεν υπάρχουν απαντήσεις checklist. Η εργασία ακυρώθηκε πριν από υποβολή."
                      : "Δεν υπάρχουν ακόμη απαντήσεις checklist."}
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
                            {mapChecklistItemTypeToUi(answer.templateItem.itemType)}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <FieldCard label="Απάντηση" value={String(renderAnswerValue(answer))} />
                          <FieldCard label="Σημειώσεις" value={answer.notes || "—"} />
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
                        <p className="text-sm font-semibold text-slate-950">{issue.title}</p>
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
                          {mapStatusToUi(issue.status)}
                        </span>

                        <span
                          className={cls(
                            "rounded-full border px-3 py-1 text-xs font-semibold",
                            getPriorityBadgeClasses(issue.severity)
                          )}
                        >
                          {mapPriorityToUi(issue.severity)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      {mapIssueTypeToUi(issue.issueType)} • {formatDateTime(issue.createdAt)}
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
                          {log.actorName || log.actorType || "Σύστημα"} • {log.action}
                        </p>
                      </div>

                      <div className="text-xs text-slate-500">
                        {formatDateTimeCompact(log.createdAt)}
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
                <strong>Κατάσταση:</strong> {mapStatusToUi(task.property.status)}
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
                  <strong>Κατάσταση:</strong> {mapStatusToUi(latestAssignment.status)}
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
                <div>
                  <strong>Email ανάθεσης:</strong>{" "}
                  {latestAssignment.assignmentEmailSentAt
                    ? formatDateTime(latestAssignment.assignmentEmailSentAt)
                    : "Δεν έχει σταλεί"}
                </div>
                <div>
                  <strong>Email checklist:</strong>{" "}
                  {latestAssignment.checklistEmailSentAt
                    ? formatDateTime(latestAssignment.checklistEmailSentAt)
                    : "Δεν έχει σταλεί"}
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
                  <strong>Κατάσταση:</strong> {mapStatusToUi(task.booking.status)}
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