"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type PropertyTask = {
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
  completedAt?: string | null
  createdAt?: string
  notes?: string | null
  resultNotes?: string | null
  booking?: {
    id: string
    sourcePlatform: string
    guestName?: string | null
    checkInDate: string
    checkOutDate: string
    status: string
  } | null
  assignments?: Array<{
    id: string
    status: string
    assignedAt?: string | null
    completedAt?: string | null
    partner?: {
      id: string
      name: string
    } | null
  }>
  checklistRun?: {
    id: string
    status: string
    completedAt?: string | null
    template?: {
      id: string
      title: string
    } | null
  } | null
}

type PropertyTasksResponse = {
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
  tasks: PropertyTask[]
}

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function formatDate(value?: string | null, locale = "el-GR") {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value?: string | null, locale = "el-GR") {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function priorityBadgeClasses(priority?: string | null) {
  switch ((priority || "").toLowerCase()) {
    case "urgent":
    case "critical":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    case "high":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "medium":
    case "normal":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
    case "low":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function taskStatusBadgeClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getLatestAssignment(task: PropertyTask) {
  return safeArray(task.assignments)[0] || null
}

export default function PropertyCompletedTasksHistoryPage() {
  const params = useParams<{ id: string }>()
  const propertyId = String(params?.id || "")
  const { language } = useAppLanguage()
  const locale = language === "en" ? "en-GB" : "el-GR"

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [data, setData] = useState<PropertyTasksResponse | null>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  async function loadData() {
    try {
      setLoading(true)
      setError("")

      const res = await fetch(`/api/properties/${propertyId}/tasks`, {
        cache: "no-store",
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || "Αποτυχία φόρτωσης ιστορικού εργασιών.")
      }

      setData(json)
    } catch (err) {
      console.error("Load completed tasks history error:", err)
      setError(
        err instanceof Error ? err.message : "Αποτυχία φόρτωσης ιστορικού εργασιών."
      )
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [propertyId])

  const completedTasks = useMemo(() => {
    const tasks = safeArray(data?.tasks).filter(
      (task) => String(task.status || "").toLowerCase() === "completed"
    )

    return tasks.filter((task) => {
      const baseDate = task.completedAt || task.scheduledDate || task.createdAt
      if (!baseDate) return true

      const taskDate = new Date(baseDate)
      if (Number.isNaN(taskDate.getTime())) return true

      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`)
        if (taskDate < from) return false
      }

      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59`)
        if (taskDate > to) return false
      }

      return true
    }).sort((a, b) => {
      const aDate = new Date(a.completedAt || a.scheduledDate || a.createdAt || 0).getTime()
      const bDate = new Date(b.completedAt || b.scheduledDate || b.createdAt || 0).getTime()
      return bDate - aDate
    })
  }, [data, dateFrom, dateTo])

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">Φόρτωση ιστορικού ολοκληρωμένων εργασιών...</div>
      </div>
    )
  }

  if (error || !data?.property) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Σφάλμα φόρτωσης ιστορικού</h1>
        <p className="mt-2 text-sm text-red-600">
          {error || "Δεν βρέθηκαν δεδομένα ιστορικού."}
        </p>
        <div className="mt-4">
          <Link
            href={`/properties/${propertyId}/tasks`}
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Επιστροφή στις εργασίες ακινήτου
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/properties"
              className="font-medium text-slate-500 hover:text-slate-900"
            >
              Ακίνητα
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href={`/properties/${data.property.id}`}
              className="font-medium text-slate-500 hover:text-slate-900"
            >
              {data.property.code}
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href={`/properties/${data.property.id}/tasks`}
              className="font-medium text-slate-500 hover:text-slate-900"
            >
              Εργασίες ακινήτου
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Ιστορικό ολοκληρωμένων</span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Ιστορικό ολοκληρωμένων εργασιών
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            {data.property.name} · {data.property.address}, {data.property.city}, {data.property.region}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/properties/${data.property.id}/tasks`}
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Επιστροφή στις εργασίες
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Από
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Έως
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setDateFrom("")
                setDateTo("")
              }}
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Καθαρισμός φίλτρων
            </button>
          </div>

          <div className="flex items-end">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
              Σύνολο: <span className="font-semibold">{completedTasks.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Ολοκληρωμένες εργασίες</h2>
          <p className="mt-1 text-sm text-slate-500">
            Προβολή ολοκληρωμένων εργασιών με φίλτρο ημερομηνίας.
          </p>
        </div>

        {completedTasks.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            Δεν υπάρχουν ολοκληρωμένες εργασίες για τα επιλεγμένα φίλτρα.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {completedTasks.map((task) => {
              const latestAssignment = getLatestAssignment(task)

              return (
                <div key={task.id} className="p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-slate-900">{task.title}</div>

                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${taskStatusBadgeClasses(
                              task.status
                            )}`}
                          >
                            Ολοκληρωμένη
                          </span>

                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadgeClasses(
                              task.priority
                            )}`}
                          >
                            {task.priority || "—"}
                          </span>

                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                            {task.taskType}
                          </span>
                        </div>

                        {task.description ? (
                          <div className="mt-2 text-sm text-slate-700">{task.description}</div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Προβολή εργασίας
                        </Link>

                        {task.checklistRun ? (
                          <Link
                            href={`/tasks/${task.id}`}
                            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Προβολή λίστας που υποβλήθηκε
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <HistoryInfoBox
                        label="Ημερομηνία εργασίας"
                        value={formatDate(task.scheduledDate, locale)}
                      />

                      <HistoryInfoBox
                        label="Ώρα"
                        value={`${task.scheduledStartTime || "—"}${
                          task.scheduledEndTime ? ` - ${task.scheduledEndTime}` : ""
                        }`}
                      />

                      <HistoryInfoBox
                        label="Ολοκληρώθηκε"
                        value={formatDateTime(task.completedAt, locale)}
                      />

                      <HistoryInfoBox
                        label="Συνεργάτης"
                        value={latestAssignment?.partner?.name || "—"}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <HistoryInfoBox
                        label="Ενεργή λίστα"
                        value={task.checklistRun?.template?.title || "Δεν υπάρχει λίστα"}
                      />

                      <HistoryInfoBox
                        label="Κατάσταση λίστας"
                        value={
                          task.checklistRun
                            ? task.checklistRun.status === "completed"
                              ? "Υποβλήθηκε"
                              : task.checklistRun.status
                            : "—"
                        }
                      />
                    </div>

                    {task.notes ? (
                      <div className="text-sm text-slate-600">
                        Σημειώσεις: {task.notes}
                      </div>
                    ) : null}

                    {task.resultNotes ? (
                      <div className="text-sm text-slate-600">
                        Αποτέλεσμα: {task.resultNotes}
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function HistoryInfoBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  )
}