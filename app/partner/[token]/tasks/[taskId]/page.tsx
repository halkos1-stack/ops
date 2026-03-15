"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  PortalLanguage,
  buildPartnerPortalUrl,
  getPortalStatusLabel,
  getPortalTexts,
  normalizePortalLanguage,
} from "../../portal-i18n"

type ChecklistAnswer = {
  id: string
  notes?: string | null
  valueBoolean?: boolean | null
  valueText?: string | null
  valueNumber?: number | null
  valueSelect?: string | null
  photoUrls?: unknown
  templateItem?: {
    id: string
    label: string
  } | null
}

type ChecklistItem = {
  id: string
  label: string
  description?: string | null
  itemType: string
  isRequired: boolean
  sortOrder: number
  optionsText?: string | null
  category?: string | null
  requiresPhoto?: boolean
  opensIssueOnFail?: boolean
}

type PagePayload = {
  assignment: {
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
    partner: {
      id: string
      code: string
      name: string
      email: string
      phone?: string | null
      specialty: string
      status: string
    }
  }
  task: {
    id: string
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
    property: {
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
    }
    booking?: {
      id: string
      sourcePlatform?: string | null
      guestName?: string | null
      checkInDate: string
      checkOutDate: string
      status?: string | null
    } | null
    checklistRun?: {
      id: string
      status: string
      startedAt?: string | null
      completedAt?: string | null
      template?: {
        id: string
        title: string
        description?: string | null
        templateType: string
        items?: ChecklistItem[]
      } | null
      answers?: ChecklistAnswer[]
    } | null
    issues?: Array<{
      id: string
      title: string
      description?: string | null
      status?: string | null
      severity?: string | null
      createdAt?: string | null
    }>
    events?: Array<{
      id: string
      title: string
      description?: string | null
      status?: string | null
      eventType?: string | null
      createdAt?: string | null
    }>
  }
}

type ChecklistFormValue = {
  valueBoolean: boolean | null
  valueText: string
  valueNumber: string
  valueSelect: string
  notes: string
  photoUrls: string[]
}

function normalizePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
}

function getEmptyChecklistFormValue(): ChecklistFormValue {
  return {
    valueBoolean: null,
    valueText: "",
    valueNumber: "",
    valueSelect: "",
    notes: "",
    photoUrls: [],
  }
}

function formatDate(value?: string | null, language: PortalLanguage = "el") {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat(language === "el" ? "el-GR" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value?: string | null, language: PortalLanguage = "el") {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat(language === "el" ? "el-GR" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function badgeClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "in_progress":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
    case "accepted":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
    case "assigned":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "rejected":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    case "cancelled":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getTaskPageTexts(language: PortalLanguage) {
  const common = getPortalTexts(language)

  if (language === "en") {
    return {
      ...common,
      taskPageTitle: "Partner task",
      loadingTask: "Loading task...",
      taskLoadErrorTitle: "Task could not be loaded",
      taskDetails: "Task details",
      taskDate: "Date",
      taskTime: "Time",
      taskDescription: "Description",
      managerNotes: "Manager notes",
      noTaskDescription: "There is no task description.",
      noManagerNotes: "There are no notes.",
      requiresChecklist: "Checklist required",
      requiresPhotos: "Photos required",
      requiresApproval: "Approval required",
      actions: "Actions",
      noFurtherResponse: "This task is not waiting for a new response.",
      acceptTask: "Accept task",
      rejectTask: "Reject task",
      accepting: "Accepting...",
      rejecting: "Rejecting...",
      rejectionReason: "Rejection reason",
      rejectionPlaceholder: "Fill this only if you want to reject the task",
      rejectionReasonRequired: "Rejection reason is required.",
      acceptSuccess:
        "The task was accepted. The checklist is now available below.",
      rejectSuccess: "The task was rejected.",
      propertySection: "Property",
      propertyName: "Name",
      propertyCode: "Code",
      propertyAddress: "Address",
      propertyCity: "City",
      propertyRegion: "Region",
      assignmentSection: "Assignment",
      assignmentStatus: "Status",
      assignedAt: "Assigned",
      acceptedAt: "Accepted",
      rejectedAt: "Rejected",
      rejectionReasonLabel: "Rejection reason",
      bookingSection: "Booking",
      bookingGuest: "Guest",
      bookingPlatform: "Platform",
      bookingCheckIn: "Check-in",
      bookingCheckOut: "Check-out",
      checklistSection: "Task checklist",
      checklistFallbackTitle: "Checklist",
      checklistNoDescription: "There is no checklist description.",
      checklistNoItems: "There are no checklist items for this task yet.",
      checklistStatus: "Status",
      noItemDescription: "No description",
      yes: "Yes",
      no: "No",
      none: "—",
      backToHome: "Back to home",
      backToSchedule: "Back to schedule",
      backToCalendar: "Back to calendar",
      required: "Required",
      photoRequired: "Photo required",
      issueOnFail: "Creates issue on fail",
      saveProgress: "Save progress",
      submitChecklist: "Submit checklist",
      savingProgress: "Saving...",
      submittingChecklist: "Submitting...",
      booleanAnswer: "Answer",
      textAnswer: "Text answer",
      numberAnswer: "Number answer",
      selectAnswer: "Select answer",
      answerNotes: "Notes",
      saveSuccess: "Checklist progress was saved.",
      submitSuccess: "Checklist was submitted successfully.",
      answerRequiredError: "Please complete all required checklist items.",
      chooseOption: "Choose option",
      yesOption: "Yes",
      noOption: "No",
      checklistReadonly: "Checklist is read-only in the current status.",
      openChecklist: "Open checklist",
      closeChecklist: "Close checklist",
      photoSection: "Photo documentation",
      takePhoto: "Take photo",
      chooseFile: "Choose from files",
      uploadingPhoto: "Uploading photo...",
      removePhoto: "Remove photo",
      photoUploadSuccess: "Photo uploaded successfully.",
      photoUploadError: "Photo upload failed.",
      photoRequiredError: "A required photo is missing.",
    }
  }

  return {
    ...common,
    taskPageTitle: "Εργασία συνεργάτη",
    loadingTask: "Φόρτωση εργασίας...",
    taskLoadErrorTitle: "Δεν φορτώθηκε η εργασία",
    taskDetails: "Στοιχεία εργασίας",
    taskDate: "Ημερομηνία",
    taskTime: "Ώρα",
    taskDescription: "Περιγραφή",
    managerNotes: "Σημειώσεις διαχειριστή",
    noTaskDescription: "Δεν υπάρχει περιγραφή εργασίας.",
    noManagerNotes: "Δεν υπάρχουν σημειώσεις.",
    requiresChecklist: "Απαιτεί checklist",
    requiresPhotos: "Απαιτεί φωτογραφίες",
    requiresApproval: "Απαιτεί έγκριση",
    actions: "Ενέργειες",
    noFurtherResponse: "Η εργασία δεν περιμένει νέα απάντηση.",
    acceptTask: "Αποδοχή εργασίας",
    rejectTask: "Απόρριψη εργασίας",
    accepting: "Αποδοχή...",
    rejecting: "Απόρριψη...",
    rejectionReason: "Αιτία απόρριψης",
    rejectionPlaceholder: "Συμπλήρωσε μόνο αν θες να απορρίψεις την εργασία",
    rejectionReasonRequired: "Η αιτία απόρριψης είναι υποχρεωτική.",
    acceptSuccess:
      "Η εργασία έγινε αποδεκτή. Η λίστα είναι πλέον διαθέσιμη πιο κάτω.",
    rejectSuccess: "Η εργασία απορρίφθηκε.",
    propertySection: "Ακίνητο",
    propertyName: "Όνομα",
    propertyCode: "Κωδικός",
    propertyAddress: "Διεύθυνση",
    propertyCity: "Πόλη",
    propertyRegion: "Περιοχή",
    assignmentSection: "Ανάθεση",
    assignmentStatus: "Κατάσταση",
    assignedAt: "Ανάθεση",
    acceptedAt: "Αποδοχή",
    rejectedAt: "Απόρριψη",
    rejectionReasonLabel: "Αιτία απόρριψης",
    bookingSection: "Κράτηση",
    bookingGuest: "Επισκέπτης",
    bookingPlatform: "Πλατφόρμα",
    bookingCheckIn: "Check-in",
    bookingCheckOut: "Check-out",
    checklistSection: "Λίστα εργασίας",
    checklistFallbackTitle: "Checklist",
    checklistNoDescription: "Δεν υπάρχει περιγραφή checklist.",
    checklistNoItems: "Δεν υπάρχουν ακόμα στοιχεία λίστας για αυτή την εργασία.",
    checklistStatus: "Κατάσταση",
    noItemDescription: "Χωρίς περιγραφή",
    yes: "Ναι",
    no: "Όχι",
    none: "—",
    backToHome: "Επιστροφή στην αρχική",
    backToSchedule: "Επιστροφή στο πρόγραμμα",
    backToCalendar: "Επιστροφή στο ημερολόγιο",
    required: "Υποχρεωτικό",
    photoRequired: "Απαιτεί φωτογραφία",
    issueOnFail: "Δημιουργεί συμβάν σε αποτυχία",
    saveProgress: "Αποθήκευση προόδου",
    submitChecklist: "Υποβολή λίστας",
    savingProgress: "Αποθήκευση...",
    submittingChecklist: "Υποβολή...",
    booleanAnswer: "Απάντηση",
    textAnswer: "Κειμενική απάντηση",
    numberAnswer: "Αριθμητική απάντηση",
    selectAnswer: "Επιλογή",
    answerNotes: "Σημειώσεις",
    saveSuccess: "Η πρόοδος της λίστας αποθηκεύτηκε.",
    submitSuccess: "Η λίστα υποβλήθηκε επιτυχώς.",
    answerRequiredError: "Συμπλήρωσε όλα τα υποχρεωτικά στοιχεία της λίστας.",
    chooseOption: "Επίλεξε",
    yesOption: "Ναι",
    noOption: "Όχι",
    checklistReadonly: "Η λίστα είναι μόνο για προβολή στην τρέχουσα κατάσταση.",
    openChecklist: "Άνοιγμα λίστας",
    closeChecklist: "Κλείσιμο λίστας",
    photoSection: "Φωτογραφική τεκμηρίωση",
    takePhoto: "Λήψη φωτογραφίας",
    chooseFile: "Επιλογή από αρχεία",
    uploadingPhoto: "Ανέβασμα φωτογραφίας...",
    removePhoto: "Αφαίρεση φωτογραφίας",
    photoUploadSuccess: "Η φωτογραφία ανέβηκε επιτυχώς.",
    photoUploadError: "Αποτυχία ανεβάσματος φωτογραφίας.",
    photoRequiredError: "Λείπει υποχρεωτική φωτογραφία.",
  }
}

function parseOptions(optionsText?: string | null) {
  if (!optionsText) return []

  return optionsText
    .split(/\r?\n|,/)
    .map((value) => String(value).trim())
    .filter(Boolean)
}

function getItemInputMode(itemType?: string | null) {
  const value = String(itemType || "").trim().toLowerCase()

  if (
    value === "boolean" ||
    value === "yes_no" ||
    value === "pass_fail" ||
    value === "checkbox"
  ) {
    return "boolean"
  }

  if (value === "number" || value === "numeric") {
    return "number"
  }

  if (
    value === "select" ||
    value === "dropdown" ||
    value === "choice" ||
    value === "option" ||
    value === "options"
  ) {
    return "select"
  }

  if (value === "photo" || value === "image") {
    return "text"
  }

  return "text"
}

function LanguageSwitcher({
  token,
  taskId,
  language,
  from,
}: {
  token: string
  taskId: string
  language: PortalLanguage
  from: string
}) {
  const router = useRouter()
  const common = getPortalTexts(language)

  function buildUrl(nextLanguage: PortalLanguage) {
    const url = buildPartnerPortalUrl(token, `/tasks/${taskId}`, nextLanguage)
    return from ? `${url}&from=${encodeURIComponent(from)}` : url
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
      <span className="px-2 text-xs font-semibold text-slate-500">
        {common.languageLabel}
      </span>

      <button
        type="button"
        onClick={() => router.replace(buildUrl("el"))}
        className={`rounded-xl px-3 py-2 text-xs font-semibold ${
          language === "el"
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-700 ring-1 ring-slate-200"
        }`}
      >
        {common.greek}
      </button>

      <button
        type="button"
        onClick={() => router.replace(buildUrl("en"))}
        className={`rounded-xl px-3 py-2 text-xs font-semibold ${
          language === "en"
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-700 ring-1 ring-slate-200"
        }`}
      >
        {common.english}
      </button>
    </div>
  )
}

export default function PartnerPortalTaskPage() {
  const params = useParams()
  const searchParams = useSearchParams()

  const token = Array.isArray(params?.token) ? params.token[0] : params?.token
  const taskId = Array.isArray(params?.taskId) ? params.taskId[0] : params?.taskId

  const language = normalizePortalLanguage(searchParams.get("lang"))
  const from = String(searchParams.get("from") || "").trim().toLowerCase()

  const [data, setData] = useState<PagePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [submitting, setSubmitting] = useState<"accept" | "reject" | null>(null)
  const [checklistSubmitting, setChecklistSubmitting] = useState<
    "save" | "submit" | null
  >(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [checklistValues, setChecklistValues] = useState<
    Record<string, ChecklistFormValue>
  >({})
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)

  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const t = getTaskPageTexts(language)

  async function loadData() {
    if (!token || !taskId) return

    try {
      setLoading(true)
      setError("")
      setSuccess("")

      const res = await fetch(`/api/partner/${token}/tasks/${taskId}`, {
        cache: "no-store",
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || "Αποτυχία φόρτωσης εργασίας.")
      }

      setData(json as PagePayload)
    } catch (err) {
      console.error("Partner portal task load error:", err)
      setError(err instanceof Error ? err.message : "Παρουσιάστηκε σφάλμα.")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [token, taskId])

  useEffect(() => {
    if (!data?.task?.checklistRun?.template?.items?.length) {
      setChecklistValues({})
      return
    }

    const nextValues: Record<string, ChecklistFormValue> = {}
    const answers = data.task.checklistRun.answers || []

    for (const item of data.task.checklistRun.template.items) {
      const existing = answers.find(
        (answer) => answer.templateItem?.id === item.id
      )

      nextValues[item.id] = {
        valueBoolean:
          typeof existing?.valueBoolean === "boolean"
            ? existing.valueBoolean
            : null,
        valueText: existing?.valueText || "",
        valueNumber:
          typeof existing?.valueNumber === "number"
            ? String(existing.valueNumber)
            : "",
        valueSelect: existing?.valueSelect || "",
        notes: existing?.notes || "",
        photoUrls: normalizePhotoUrls(existing?.photoUrls),
      }
    }

    setChecklistValues(nextValues)
  }, [data])

  const canRespond = useMemo(() => {
    return data?.assignment?.status === "assigned"
  }, [data])

  const canShowChecklist = useMemo(() => {
    return (
      data?.assignment?.status === "accepted" ||
      data?.assignment?.status === "in_progress" ||
      data?.assignment?.status === "completed"
    )
  }, [data])

  const canEditChecklist = useMemo(() => {
    return (
      data?.assignment?.status === "accepted" ||
      data?.assignment?.status === "in_progress"
    )
  }, [data])

  function getBackUrl() {
    if (!token) return "#"

    if (from === "calendar") {
      return buildPartnerPortalUrl(token, "/calendar", language)
    }

    if (from === "schedule") {
      return buildPartnerPortalUrl(token, "/schedule", language)
    }

    return buildPartnerPortalUrl(token, "", language)
  }

  function getBackLabel() {
    if (from === "calendar") return t.backToCalendar
    if (from === "schedule") return t.backToSchedule
    return t.backToHome
  }

  function updateChecklistValue(
    itemId: string,
    patch: Partial<ChecklistFormValue>
  ) {
    setChecklistValues((prev) => {
      const current = prev[itemId] ?? getEmptyChecklistFormValue()

      return {
        ...prev,
        [itemId]: {
          ...current,
          ...patch,
        },
      }
    })
  }

  function removePhoto(itemId: string, photoUrl: string) {
    const current = checklistValues[itemId] || getEmptyChecklistFormValue()

    updateChecklistValue(itemId, {
      photoUrls: current.photoUrls.filter((url) => url !== photoUrl),
    })
  }

  async function uploadPhoto(itemId: string, file: File) {
    if (!token || !taskId) return

    try {
      setUploadingItemId(itemId)
      setError("")
      setSuccess("")

      const formData = new FormData()
      formData.append("templateItemId", itemId)
      formData.append("file", file)

      const res = await fetch(
        `/api/partner/${token}/tasks/${taskId}/checklist-upload`,
        {
          method: "POST",
          body: formData,
        }
      )

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || t.photoUploadError)
      }

      const fileUrl = String(json?.fileUrl || "").trim()

      if (!fileUrl) {
        throw new Error(t.photoUploadError)
      }

      const current = checklistValues[itemId] || getEmptyChecklistFormValue()

      updateChecklistValue(itemId, {
        photoUrls: [...current.photoUrls, fileUrl],
      })

      setSuccess(t.photoUploadSuccess)
    } catch (err) {
      console.error("Photo upload error:", err)
      setError(err instanceof Error ? err.message : t.photoUploadError)
    } finally {
      setUploadingItemId(null)
    }
  }

  async function onPhotoInputChange(
    itemId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]
    if (!file) return

    await uploadPhoto(itemId, file)
    event.target.value = ""
  }

  async function respond(action: "accept" | "reject") {
    if (!token || !data?.assignment?.id) return

    if (action === "reject" && !rejectionReason.trim()) {
      setError(t.rejectionReasonRequired)
      return
    }

    try {
      setSubmitting(action)
      setError("")
      setSuccess("")

      const res = await fetch(
        `/api/partner/${token}/assignments/${data.assignment.id}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            rejectionReason,
          }),
        }
      )

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || "Αποτυχία απάντησης ανάθεσης.")
      }

      setSuccess(action === "accept" ? t.acceptSuccess : t.rejectSuccess)
      setRejectionReason("")
      await loadData()
    } catch (err) {
      console.error("Partner portal task respond error:", err)
      setError(err instanceof Error ? err.message : "Παρουσιάστηκε σφάλμα.")
    } finally {
      setSubmitting(null)
    }
  }

  async function submitChecklist(mode: "save" | "submit") {
    if (!token || !taskId || !data?.task?.checklistRun?.template?.items?.length) {
      return
    }

    try {
      setChecklistSubmitting(mode)
      setError("")
      setSuccess("")

      const checklistItems = data.task.checklistRun.template.items

      const answers = checklistItems.map((item) => {
        const value = checklistValues[item.id] || getEmptyChecklistFormValue()

        return {
          templateItemId: item.id,
          valueBoolean:
            typeof value.valueBoolean === "boolean" ? value.valueBoolean : null,
          valueText: value.valueText || null,
          valueNumber:
            value.valueNumber !== "" && !Number.isNaN(Number(value.valueNumber))
              ? Number(value.valueNumber)
              : null,
          valueSelect: value.valueSelect || null,
          notes: value.notes || null,
          photoUrls: value.photoUrls,
        }
      })

      const res = await fetch(
        `/api/partner/${token}/tasks/${taskId}/checklist`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode,
            answers,
          }),
        }
      )

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(
          json?.error ||
            (mode === "submit"
              ? t.answerRequiredError
              : "Αποτυχία αποθήκευσης checklist.")
        )
      }

      setSuccess(mode === "submit" ? t.submitSuccess : t.saveSuccess)
      await loadData()
    } catch (err) {
      console.error("Checklist submit error:", err)
      setError(err instanceof Error ? err.message : "Παρουσιάστηκε σφάλμα.")
    } finally {
      setChecklistSubmitting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          {t.loadingTask}
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-red-700">
            {t.taskLoadErrorTitle}
          </h1>
          <p className="mt-2 text-sm text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!data || !token || !taskId) return null

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm text-slate-500">{t.taskPageTitle}</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                {data.task.title}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(
                    data.assignment.status
                  )}`}
                >
                  {getPortalStatusLabel(language, data.assignment.status)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <LanguageSwitcher
                token={token}
                taskId={taskId}
                language={language}
                from={from}
              />

              <div className="flex flex-wrap gap-2">
                <Link
                  href={getBackUrl()}
                  className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {getBackLabel()}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-950">{t.taskDetails}</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">{t.taskDate}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDate(data.task.scheduledDate, language)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">{t.taskTime}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {data.task.scheduledStartTime || "—"}
                    {data.task.scheduledEndTime
                      ? ` - ${data.task.scheduledEndTime}`
                      : ""}
                  </p>
                </div>

                <div className="md:col-span-2 rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">{t.taskDescription}</p>
                  <p className="mt-1 text-sm text-slate-800">
                    {data.task.description || t.noTaskDescription}
                  </p>
                </div>

                <div className="md:col-span-2 rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">{t.managerNotes}</p>
                  <p className="mt-1 text-sm text-slate-800">
                    {data.task.notes || t.noManagerNotes}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {data.task.requiresChecklist ? (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {t.requiresChecklist}
                  </span>
                ) : null}

                {data.task.requiresPhotos ? (
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    {t.requiresPhotos}
                  </span>
                ) : null}

                {data.task.requiresApproval ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {t.requiresApproval}
                  </span>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-950">{t.actions}</h2>

              {!canRespond ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                  {t.noFurtherResponse}
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => respond("accept")}
                      disabled={submitting !== null}
                      className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {submitting === "accept" ? t.accepting : t.acceptTask}
                    </button>

                    <button
                      type="button"
                      onClick={() => respond("reject")}
                      disabled={submitting !== null}
                      className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {submitting === "reject" ? t.rejecting : t.rejectTask}
                    </button>
                  </div>

                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <label className="mb-2 block text-sm font-medium text-red-800">
                      {t.rejectionReason}
                    </label>
                    <textarea
                      rows={4}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 outline-none focus:border-red-400"
                      placeholder={t.rejectionPlaceholder}
                    />
                  </div>
                </div>
              )}
            </section>

            {canShowChecklist && data.task.checklistRun ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950">
                      {t.checklistSection}
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setChecklistOpen((prev) => !prev)}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {checklistOpen ? t.closeChecklist : t.openChecklist}
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                  <p className="text-lg font-semibold text-slate-950">
                    {data.task.checklistRun.template?.title || t.checklistFallbackTitle}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {data.task.checklistRun.template?.description || t.checklistNoDescription}
                  </p>
                  <p className="mt-3 text-sm text-slate-700">
                    {t.checklistStatus}:{" "}
                    {getPortalStatusLabel(language, data.task.checklistRun.status)}
                  </p>
                </div>

                {checklistOpen ? (
                  data.task.checklistRun.template?.items?.length ? (
                    <div className="mt-4 space-y-4">
                      {data.task.checklistRun.template.items.map((item, index) => {
                        const value = checklistValues[item.id] || getEmptyChecklistFormValue()
                        const inputMode = getItemInputMode(item.itemType)
                        const options = parseOptions(item.optionsText)

                        return (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-slate-200 p-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-950">
                                  {index + 1}. {item.label}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.description || t.noItemDescription}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {item.isRequired ? (
                                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                    {t.required}
                                  </span>
                                ) : null}

                                {item.requiresPhoto ? (
                                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                                    {t.photoRequired}
                                  </span>
                                ) : null}

                                {item.opensIssueOnFail ? (
                                  <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                    {t.issueOnFail}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-4 space-y-4">
                              {inputMode === "boolean" ? (
                                <div>
                                  <label className="mb-2 block text-sm font-medium text-slate-700">
                                    {t.booleanAnswer}
                                  </label>
                                  <div className="flex flex-wrap gap-3">
                                    <button
                                      type="button"
                                      disabled={!canEditChecklist}
                                      onClick={() =>
                                        updateChecklistValue(item.id, {
                                          valueBoolean: true,
                                        })
                                      }
                                      className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                                        value.valueBoolean === true
                                          ? "bg-emerald-600 text-white"
                                          : "border border-slate-300 bg-white text-slate-700"
                                      } disabled:opacity-60`}
                                    >
                                      {t.yesOption}
                                    </button>

                                    <button
                                      type="button"
                                      disabled={!canEditChecklist}
                                      onClick={() =>
                                        updateChecklistValue(item.id, {
                                          valueBoolean: false,
                                        })
                                      }
                                      className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                                        value.valueBoolean === false
                                          ? "bg-red-600 text-white"
                                          : "border border-slate-300 bg-white text-slate-700"
                                      } disabled:opacity-60`}
                                    >
                                      {t.noOption}
                                    </button>
                                  </div>
                                </div>
                              ) : null}

                              {inputMode === "text" ? (
                                <div>
                                  <label className="mb-2 block text-sm font-medium text-slate-700">
                                    {t.textAnswer}
                                  </label>
                                  <textarea
                                    rows={3}
                                    disabled={!canEditChecklist}
                                    value={value.valueText}
                                    onChange={(e) =>
                                      updateChecklistValue(item.id, {
                                        valueText: e.target.value,
                                      })
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 disabled:bg-slate-50"
                                  />
                                </div>
                              ) : null}

                              {inputMode === "number" ? (
                                <div>
                                  <label className="mb-2 block text-sm font-medium text-slate-700">
                                    {t.numberAnswer}
                                  </label>
                                  <input
                                    type="number"
                                    disabled={!canEditChecklist}
                                    value={value.valueNumber}
                                    onChange={(e) =>
                                      updateChecklistValue(item.id, {
                                        valueNumber: e.target.value,
                                      })
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 disabled:bg-slate-50"
                                  />
                                </div>
                              ) : null}

                              {inputMode === "select" ? (
                                <div>
                                  <label className="mb-2 block text-sm font-medium text-slate-700">
                                    {t.selectAnswer}
                                  </label>
                                  <select
                                    disabled={!canEditChecklist}
                                    value={value.valueSelect}
                                    onChange={(e) =>
                                      updateChecklistValue(item.id, {
                                        valueSelect: e.target.value,
                                      })
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 disabled:bg-slate-50"
                                  >
                                    <option value="">{t.chooseOption}</option>
                                    {options.map((option, optionIndex) => (
                                      <option
                                        key={`${item.id}-option-${optionIndex}-${option}`}
                                        value={option}
                                      >
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : null}

                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                  {t.answerNotes}
                                </label>
                                <textarea
                                  rows={2}
                                  disabled={!canEditChecklist}
                                  value={value.notes}
                                  onChange={(e) =>
                                    updateChecklistValue(item.id, {
                                      notes: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 disabled:bg-slate-50"
                                />
                              </div>

                              {item.requiresPhoto ? (
                                <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
                                  <p className="text-sm font-semibold text-violet-900">
                                    {t.photoSection}
                                  </p>

                                  <div className="mt-3 flex flex-wrap gap-3">
                                    <button
                                      type="button"
                                      disabled={!canEditChecklist || uploadingItemId === item.id}
                                      onClick={() =>
                                        cameraInputRefs.current[item.id]?.click()
                                      }
                                      className="rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                                    >
                                      {uploadingItemId === item.id
                                        ? t.uploadingPhoto
                                        : t.takePhoto}
                                    </button>

                                    <button
                                      type="button"
                                      disabled={!canEditChecklist || uploadingItemId === item.id}
                                      onClick={() =>
                                        fileInputRefs.current[item.id]?.click()
                                      }
                                      className="rounded-2xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60"
                                    >
                                      {uploadingItemId === item.id
                                        ? t.uploadingPhoto
                                        : t.chooseFile}
                                    </button>
                                  </div>

                                  <input
                                    ref={(el) => {
                                      cameraInputRefs.current[item.id] = el
                                    }}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => onPhotoInputChange(item.id, e)}
                                  />

                                  <input
                                    ref={(el) => {
                                      fileInputRefs.current[item.id] = el
                                    }}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => onPhotoInputChange(item.id, e)}
                                  />

                                  {value.photoUrls.length > 0 ? (
                                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                                      {value.photoUrls.map((photoUrl) => (
                                        <div
                                          key={photoUrl}
                                          className="rounded-2xl border border-violet-200 bg-white p-3"
                                        >
                                          <img
                                            src={photoUrl}
                                            alt={item.label}
                                            className="h-32 w-full rounded-xl object-cover"
                                          />
                                          {canEditChecklist ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                removePhoto(item.id, photoUrl)
                                              }
                                              className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                                            >
                                              {t.removePhoto}
                                            </button>
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}

                      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
                        {canEditChecklist ? (
                          <>
                            <button
                              type="button"
                              onClick={() => submitChecklist("save")}
                              disabled={checklistSubmitting !== null}
                              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              {checklistSubmitting === "save"
                                ? t.savingProgress
                                : t.saveProgress}
                            </button>

                            <button
                              type="button"
                              onClick={() => submitChecklist("submit")}
                              disabled={checklistSubmitting !== null}
                              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                              {checklistSubmitting === "submit"
                                ? t.submittingChecklist
                                : t.submitChecklist}
                            </button>
                          </>
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                            {t.checklistReadonly}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                      {t.checklistNoItems}
                    </div>
                  )
                ) : null}
              </section>
            ) : null}
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-950">{t.propertySection}</h2>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div><strong>{t.propertyName}:</strong> {data.task.property.name}</div>
                <div><strong>{t.propertyCode}:</strong> {data.task.property.code}</div>
                <div><strong>{t.propertyAddress}:</strong> {data.task.property.address}</div>
                <div><strong>{t.propertyCity}:</strong> {data.task.property.city}</div>
                <div><strong>{t.propertyRegion}:</strong> {data.task.property.region}</div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-950">{t.assignmentSection}</h2>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <strong>{t.assignmentStatus}:</strong>{" "}
                  {getPortalStatusLabel(language, data.assignment.status)}
                </div>
                <div>
                  <strong>{t.assignedAt}:</strong>{" "}
                  {formatDateTime(data.assignment.assignedAt, language)}
                </div>
                <div>
                  <strong>{t.acceptedAt}:</strong>{" "}
                  {formatDateTime(data.assignment.acceptedAt, language)}
                </div>
                <div>
                  <strong>{t.rejectedAt}:</strong>{" "}
                  {formatDateTime(data.assignment.rejectedAt, language)}
                </div>
                {data.assignment.rejectionReason ? (
                  <div>
                    <strong>{t.rejectionReasonLabel}:</strong>{" "}
                    {data.assignment.rejectionReason}
                  </div>
                ) : null}
              </div>
            </section>

            {data.task.booking ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-950">{t.bookingSection}</h2>

                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <div><strong>{t.bookingGuest}:</strong> {data.task.booking.guestName || t.none}</div>
                  <div><strong>{t.bookingPlatform}:</strong> {data.task.booking.sourcePlatform || t.none}</div>
                  <div><strong>{t.bookingCheckIn}:</strong> {formatDate(data.task.booking.checkInDate, language)}</div>
                  <div><strong>{t.bookingCheckOut}:</strong> {formatDate(data.task.booking.checkOutDate, language)}</div>
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}