"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type IssueDetail = {
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
  property?: {
    id: string
    code: string
    name: string
    address?: string | null
    city?: string | null
    region?: string | null
    postalCode?: string | null
    country?: string | null
    status?: string | null
  } | null
  task?: {
    id: string
    title: string
    status?: string | null
    taskType?: string | null
    scheduledDate?: string | null
  } | null
  booking?: {
    id: string
    guestName?: string | null
    checkInDate?: string | null
    checkOutDate?: string | null
    status?: string | null
    sourcePlatform?: string | null
  } | null
  taskPhotos?: Array<{
    id: string
    category: string
    fileUrl: string
    fileName?: string | null
    caption?: string | null
    uploadedAt?: string | null
  }>
  activityLogs?: Array<{
    id: string
    action: string
    message?: string | null
    actorType?: string | null
    actorName?: string | null
    createdAt?: string | null
  }>
}

function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDate(value: string | null | undefined, locale: string) {
  const date = normalizeDate(value)
  if (!date) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value: string | null | undefined, locale: string) {
  const date = normalizeDate(value)
  if (!date) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      locale: "en-GB",
      back: "Back to issues",
      title: "Issue details",
      subtitle:
        "Detailed view of a property issue, damage, repair, or supply-related matter.",
      issueType: "Issue type",
      severity: "Severity",
      status: "Status",
      reportedBy: "Reported by",
      createdAt: "Created",
      updatedAt: "Updated",
      resolvedAt: "Resolved at",
      description: "Description",
      resolution: "Resolution notes",
      property: "Property",
      task: "Task",
      booking: "Booking",
      photos: "Photo documentation",
      logs: "Activity log",
      openProperty: "Open property",
      openTask: "Open task",
      openBooking: "Open booking",
      openFile: "Open file",
      noPhotos: "No photo files linked to this issue.",
      noLogs: "No activity log available.",
      noDescription: "No description available.",
      noResolution: "No resolution notes available.",
      generatedFromChecklist: "Likely generated from checklist logic",
      fields: {
        title: "Title",
        address: "Address",
        propertyStatus: "Property status",
        taskStatus: "Task status",
        bookingStatus: "Booking status",
        source: "Source",
        uploadedAt: "Uploaded",
      },
    }
  }

  return {
    locale: "el-GR",
    back: "Επιστροφή στα θέματα",
    title: "Στοιχεία θέματος",
    subtitle:
      "Αναλυτική προβολή θέματος ακινήτου, ζημιάς, βλάβης ή ανάγκης αναλωσίμων.",
    issueType: "Τύπος θέματος",
    severity: "Σοβαρότητα",
    status: "Κατάσταση",
    reportedBy: "Αναφορά από",
    createdAt: "Δημιουργία",
    updatedAt: "Τελευταία ενημέρωση",
    resolvedAt: "Επίλυση",
    description: "Περιγραφή",
    resolution: "Σημειώσεις επίλυσης",
    property: "Ακίνητο",
    task: "Εργασία",
    booking: "Κράτηση",
    photos: "Φωτογραφική τεκμηρίωση",
    logs: "Ιστορικό ενεργειών",
    openProperty: "Προβολή ακινήτου",
    openTask: "Προβολή εργασίας",
    openBooking: "Προβολή κράτησης",
    openFile: "Άνοιγμα αρχείου",
    noPhotos: "Δεν υπάρχουν συνδεδεμένες φωτογραφίες για αυτό το θέμα.",
    noLogs: "Δεν υπάρχει διαθέσιμο ιστορικό ενεργειών.",
    noDescription: "Δεν υπάρχει περιγραφή.",
    noResolution: "Δεν υπάρχουν σημειώσεις επίλυσης.",
    generatedFromChecklist: "Πιθανή δημιουργία από λογική checklist",
    fields: {
      title: "Τίτλος",
      address: "Διεύθυνση",
      propertyStatus: "Κατάσταση ακινήτου",
      taskStatus: "Κατάσταση εργασίας",
      bookingStatus: "Κατάσταση κράτησης",
      source: "Πηγή",
      uploadedAt: "Ανέβηκε",
    },
  }
}

function issueTypeLabel(value?: string | null, language: "el" | "en" = "el") {
  const normalized = (value || "").trim().toLowerCase()

  if (language === "en") {
    switch (normalized) {
      case "damage":
        return "Damage"
      case "repair":
        return "Repair"
      case "supplies":
        return "Supplies"
      case "inspection":
        return "Inspection"
      case "cleaning":
        return "Cleaning"
      case "general":
        return "General"
      default:
        return value || "—"
    }
  }

  switch (normalized) {
    case "damage":
      return "Ζημιά"
    case "repair":
      return "Βλάβη"
    case "supplies":
      return "Αναλώσιμα"
    case "inspection":
      return "Επιθεώρηση"
    case "cleaning":
      return "Καθαριότητα"
    case "general":
      return "Γενικό"
    default:
      return value || "—"
  }
}

function severityLabel(value?: string | null, language: "el" | "en" = "el") {
  const normalized = (value || "").trim().toLowerCase()

  if (language === "en") {
    switch (normalized) {
      case "low":
        return "Low"
      case "medium":
        return "Medium"
      case "high":
        return "High"
      case "critical":
        return "Critical"
      default:
        return value || "—"
    }
  }

  switch (normalized) {
    case "low":
      return "Χαμηλή"
    case "medium":
      return "Μεσαία"
    case "high":
      return "Υψηλή"
    case "critical":
      return "Κρίσιμη"
    default:
      return value || "—"
  }
}

function statusLabel(value?: string | null, language: "el" | "en" = "el") {
  const normalized = (value || "").trim().toLowerCase()

  if (language === "en") {
    switch (normalized) {
      case "open":
        return "Open"
      case "in_progress":
        return "In progress"
      case "resolved":
        return "Resolved"
      case "closed":
        return "Closed"
      default:
        return value || "—"
    }
  }

  switch (normalized) {
    case "open":
      return "Ανοιχτό"
    case "in_progress":
      return "Σε εξέλιξη"
    case "resolved":
      return "Επιλυμένο"
    case "closed":
      return "Κλειστό"
    default:
      return value || "—"
  }
}

function propertyStatusLabel(value?: string | null, language: "el" | "en" = "el") {
  const normalized = (value || "").trim().toLowerCase()

  if (language === "en") {
    switch (normalized) {
      case "active":
        return "Active"
      case "inactive":
        return "Inactive"
      case "maintenance":
        return "Maintenance"
      case "archived":
        return "Archived"
      default:
        return value || "—"
    }
  }

  switch (normalized) {
    case "active":
      return "Ενεργό"
    case "inactive":
      return "Ανενεργό"
    case "maintenance":
      return "Σε συντήρηση"
    case "archived":
      return "Αρχειοθετημένο"
    default:
      return value || "—"
  }
}

function taskStatusLabel(value?: string | null, language: "el" | "en" = "el") {
  const normalized = (value || "").trim().toLowerCase()

  if (language === "en") {
    switch (normalized) {
      case "pending":
        return "Pending"
      case "assigned":
        return "Assigned"
      case "accepted":
        return "Accepted"
      case "in_progress":
        return "In progress"
      case "completed":
        return "Completed"
      case "cancelled":
        return "Cancelled"
      default:
        return value || "—"
    }
  }

  switch (normalized) {
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
      return value || "—"
  }
}

function bookingStatusLabel(value?: string | null, language: "el" | "en" = "el") {
  const normalized = (value || "").trim().toLowerCase()

  if (language === "en") {
    switch (normalized) {
      case "confirmed":
        return "Confirmed"
      case "pending":
        return "Pending"
      case "cancelled":
        return "Cancelled"
      case "completed":
        return "Completed"
      default:
        return value || "—"
    }
  }

  switch (normalized) {
    case "confirmed":
      return "Επιβεβαιωμένη"
    case "pending":
      return "Σε αναμονή"
    case "cancelled":
      return "Ακυρωμένη"
    case "completed":
      return "Ολοκληρωμένη"
    default:
      return value || "—"
  }
}

function badgeClasses(value?: string | null) {
  switch ((value || "").toLowerCase()) {
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
    case "medium":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "inactive":
    case "cancelled":
    case "archived":
    case "closed":
    case "low":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
    case "open":
    case "critical":
    case "high":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

export default function IssueDetailPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { language } = useAppLanguage()
  const texts = getTexts(language)

  const [issue, setIssue] = useState<IssueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      if (!id) return

      try {
        setLoading(true)
        setError("")

        const res = await fetch(`/api/issues/${id}`, {
          cache: "no-store",
        })

        const json = await res.json().catch(() => null)

        if (!res.ok) {
          throw new Error(json?.error || "Αποτυχία φόρτωσης θέματος.")
        }

        setIssue(json?.issue ?? json?.data ?? json ?? null)
      } catch (err) {
        console.error("Issue detail load error:", err)
        setError(
          err instanceof Error ? err.message : "Αποτυχία φόρτωσης θέματος."
        )
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  const photos = safeArray(issue?.taskPhotos)
  const logs = safeArray(issue?.activityLogs)

  const isChecklistGenerated = useMemo(() => {
    const title = String(issue?.title || "").toLowerCase()
    return (
      title.startsWith("ζημιά:") ||
      title.startsWith("βλάβη:") ||
      title.startsWith("αναλώσιμα:") ||
      title.startsWith("damage:") ||
      title.startsWith("repair:") ||
      title.startsWith("supplies:")
    )
  }, [issue])

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">
          {language === "en" ? "Loading issue..." : "Φόρτωση θέματος..."}
        </div>
      </div>
    )
  }

  if (error || !issue) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          {language === "en" ? "Issue loading error" : "Σφάλμα φόρτωσης θέματος"}
        </h1>
        <p className="mt-2 text-sm text-red-600">
          {error || (language === "en" ? "No issue data found." : "Δεν βρέθηκαν δεδομένα θέματος.")}
        </p>
        <div className="mt-4">
          <Link
            href="/issues"
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {texts.back}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link
            href="/issues"
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            {texts.back}
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {issue.title}
            </h1>

            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                issue.status
              )}`}
            >
              {statusLabel(issue.status, language)}
            </span>

            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                issue.severity
              )}`}
            >
              {severityLabel(issue.severity, language)}
            </span>

            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              {issueTypeLabel(issue.issueType, language)}
            </span>

            {isChecklistGenerated ? (
              <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                {texts.generatedFromChecklist}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-sm text-slate-500">{texts.subtitle}</p>
        </div>
      </div>

      <SectionCard title={texts.title}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoField label={texts.fields.title} value={issue.title} />
          <InfoField
            label={texts.issueType}
            value={issueTypeLabel(issue.issueType, language)}
          />
          <InfoField
            label={texts.severity}
            value={severityLabel(issue.severity, language)}
          />
          <InfoField
            label={texts.status}
            value={statusLabel(issue.status, language)}
          />
          <InfoField label={texts.reportedBy} value={issue.reportedBy || "—"} />
          <InfoField
            label={texts.createdAt}
            value={formatDateTime(issue.createdAt, texts.locale)}
          />
          <InfoField
            label={texts.updatedAt}
            value={formatDateTime(issue.updatedAt, texts.locale)}
          />
          <InfoField
            label={texts.resolvedAt}
            value={formatDateTime(issue.resolvedAt, texts.locale)}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.description}
            </div>
            <div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-line">
              {issue.description || texts.noDescription}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.resolution}
            </div>
            <div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-line">
              {issue.resolutionNotes || texts.noResolution}
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title={texts.property}>
          <div className="space-y-4">
            <InfoField
              label={texts.fields.title}
              value={
                issue.property
                  ? `${issue.property.code} · ${issue.property.name}`
                  : "—"
              }
            />
            <InfoField
              label={texts.fields.address}
              value={
                issue.property
                  ? [
                      issue.property.address,
                      issue.property.city,
                      issue.property.region,
                      issue.property.postalCode,
                      issue.property.country,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : "—"
              }
            />
            <InfoField
              label={texts.fields.propertyStatus}
              value={propertyStatusLabel(issue.property?.status, language)}
            />

            {issue.property ? (
              <div className="pt-2">
                <Link
                  href={`/properties/${issue.property.id}`}
                  className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {texts.openProperty}
                </Link>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title={texts.task}>
          <div className="space-y-4">
            <InfoField label={texts.fields.title} value={issue.task?.title || "—"} />
            <InfoField
              label={texts.fields.taskStatus}
              value={taskStatusLabel(issue.task?.status, language)}
            />
            <InfoField
              label={texts.issueType}
              value={issue.task?.taskType || "—"}
            />
            <InfoField
              label={texts.createdAt}
              value={formatDate(issue.task?.scheduledDate, texts.locale)}
            />

            {issue.task ? (
              <div className="pt-2">
                <Link
                  href={`/tasks/${issue.task.id}`}
                  className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {texts.openTask}
                </Link>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title={texts.booking}>
          <div className="space-y-4">
            <InfoField label={texts.fields.title} value={issue.booking?.guestName || "—"} />
            <InfoField
              label={texts.fields.bookingStatus}
              value={bookingStatusLabel(issue.booking?.status, language)}
            />
            <InfoField
              label={texts.fields.source}
              value={issue.booking?.sourcePlatform || "—"}
            />
            <InfoField
              label={texts.fields.address}
              value={
                issue.booking
                  ? `${formatDate(issue.booking.checkInDate, texts.locale)} → ${formatDate(
                      issue.booking.checkOutDate,
                      texts.locale
                    )}`
                  : "—"
              }
            />

            {issue.booking ? (
              <div className="pt-2">
                <Link
                  href={`/bookings/${issue.booking.id}`}
                  className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {texts.openBooking}
                </Link>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard title={texts.photos}>
        {photos.length === 0 ? (
          <div className="text-sm text-slate-500">{texts.noPhotos}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="font-medium text-slate-900">
                  {photo.fileName || "Φωτογραφία"}
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  {photo.category}
                </div>

                {photo.caption ? (
                  <div className="mt-2 text-sm text-slate-700">{photo.caption}</div>
                ) : null}

                <div className="mt-3 text-xs text-slate-500">
                  {texts.fields.uploadedAt}: {formatDateTime(photo.uploadedAt, texts.locale)}
                </div>

                <div className="mt-4">
                  <a
                    href={photo.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {texts.openFile}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title={texts.logs}>
        {logs.length === 0 ? (
          <div className="text-sm text-slate-500">{texts.noLogs}</div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="font-medium text-slate-900">{log.action}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {log.actorName || log.actorType || "Σύστημα"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatDateTime(log.createdAt, texts.locale)}
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
      </SectionCard>
    </div>
  )
}

function InfoField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-900">{value}</div>
    </div>
  )
}