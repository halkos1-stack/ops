"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import {
  getChecklistStatusLabel,
  getPriorityLabel,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from "@/lib/i18n/labels"
import {
  normalizeChecklistStatus,
  normalizePriority,
  normalizeSystemChecklistTitle,
  normalizeTaskDescriptionText,
  normalizeTaskStatus,
  normalizeTaskTitleText,
} from "@/lib/i18n/normalizers"
import { getPropertyTasksHistoryTexts } from "@/lib/i18n/translations"

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
  updatedAt?: string
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
      templateType?: string | null
      isPrimary?: boolean
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

type HistoryFilter = "all" | "completed" | "cancelled"

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDate(value?: string | null, locale = "el-GR") {
  const date = normalizeDate(value)
  if (!date) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value?: string | null, locale = "el-GR") {
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

function priorityBadgeClasses(priority?: string | null) {
  const normalized = normalizePriority(priority)

  if (normalized === "URGENT") {
    return "bg-red-50 text-red-700 ring-1 ring-red-200"
  }

  if (normalized === "HIGH") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  }

  if (normalized === "NORMAL") {
    return "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
  }

  if (normalized === "LOW") {
    return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }

  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
}

function taskStatusBadgeClasses(status?: string | null) {
  const normalized = normalizeTaskStatus(status)

  if (normalized === "COMPLETED") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
  }

  if (normalized === "CANCELLED") {
    return "bg-red-50 text-red-700 ring-1 ring-red-200"
  }

  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
}

function getLatestAssignment(task: PropertyTask) {
  return safeArray(task.assignments)[0] || null
}

function getHistoryBaseDate(task: PropertyTask) {
  return (
    task.completedAt ||
    task.updatedAt ||
    task.scheduledDate ||
    task.createdAt ||
    null
  )
}

function getChecklistHistoryStatusLabel(
  run: PropertyTask["checklistRun"],
  isCancelled: boolean,
  language: "el" | "en",
  texts: ReturnType<typeof getPropertyTasksHistoryTexts>
) {
  if (!run) {
    return isCancelled ? texts.notSubmitted : texts.dash
  }

  const normalized = normalizeChecklistStatus(run.status, {
    enabled: true,
    submitted: Boolean(run.completedAt),
    completed: Boolean(run.completedAt),
  })

  if (normalized === "SUBMITTED" || normalized === "COMPLETED") {
    return texts.checklistSubmitted
  }

  return getChecklistStatusLabel(language, run.status, {
    enabled: true,
    submitted: Boolean(run.completedAt),
    completed: Boolean(run.completedAt),
  })
}

export default function PropertyCompletedTasksHistoryPage() {
  const params = useParams<{ id: string }>()
  const propertyId = String(params?.id || "")
  const { language } = useAppLanguage()
  const texts = getPropertyTasksHistoryTexts(language)
  const locale = texts.locale

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [data, setData] = useState<PropertyTasksResponse | null>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all")

  async function loadData() {
    try {
      setLoading(true)
      setError("")

      const res = await fetch(`/api/properties/${propertyId}/tasks`, {
        cache: "no-store",
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || texts.failedLoad)
      }

      const normalizedData = json?.property
        ? json
        : json?.data
          ? json.data
          : json

      setData(normalizedData)
    } catch (err) {
      console.error("Load completed tasks history error:", err)
      setError(err instanceof Error ? err.message : texts.failedLoad)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [propertyId])

  const historyTasks = useMemo(() => {
    const tasks = safeArray(data?.tasks).filter((task) => {
      const status = normalizeTaskStatus(task.status)
      return status === "COMPLETED" || status === "CANCELLED"
    })

    return tasks
      .filter((task) => {
        const status = normalizeTaskStatus(task.status)

        if (activeFilter === "completed" && status !== "COMPLETED") return false
        if (activeFilter === "cancelled" && status !== "CANCELLED") return false

        const baseDate = getHistoryBaseDate(task)
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
      })
      .sort((a, b) => {
        const aDate = new Date(getHistoryBaseDate(a) || 0).getTime()
        const bDate = new Date(getHistoryBaseDate(b) || 0).getTime()
        return bDate - aDate
      })
  }, [data, dateFrom, dateTo, activeFilter])

  const metrics = useMemo(() => {
    const allHistoryTasks = safeArray(data?.tasks).filter((task) => {
      const status = normalizeTaskStatus(task.status)
      return status === "COMPLETED" || status === "CANCELLED"
    })

    return {
      all: allHistoryTasks.length,
      completed: allHistoryTasks.filter(
        (task) => normalizeTaskStatus(task.status) === "COMPLETED"
      ).length,
      cancelled: allHistoryTasks.filter(
        (task) => normalizeTaskStatus(task.status) === "CANCELLED"
      ).length,
    }
  }, [data])

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">{texts.loading}</div>
      </div>
    )
  }

  if (error || !data?.property) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          {texts.loadErrorTitle}
        </h1>
        <p className="mt-2 text-sm text-red-600">
          {error || texts.loadErrorText}
        </p>
        <div className="mt-4">
          <Link
            href={`/properties/${propertyId}/tasks`}
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {texts.backToPropertyTasks}
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
              {texts.properties}
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
              {texts.propertyTasks}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">{texts.history}</span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {texts.pageTitle}
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            {data.property.name} · {data.property.address}, {data.property.city},{" "}
            {data.property.region}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/properties/${data.property.id}/tasks`}
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {texts.backToPropertyTasks}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${
            activeFilter === "all"
              ? "border-slate-900 bg-slate-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.allHistory}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {metrics.all}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("completed")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${
            activeFilter === "completed"
              ? "border-emerald-300 bg-emerald-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.completed}</div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">
            {metrics.completed}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("cancelled")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${
            activeFilter === "cancelled"
              ? "border-red-300 bg-red-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.cancelled}</div>
          <div className="mt-2 text-3xl font-bold text-red-700">
            {metrics.cancelled}
          </div>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.from}
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
              {texts.to}
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
                setActiveFilter("all")
              }}
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.clearFilters}
            </button>
          </div>

          <div className="flex items-end">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
              {texts.total}:{" "}
              <span className="font-semibold">{historyTasks.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {texts.historySectionTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {texts.historySectionSubtitle}
          </p>
        </div>

        {historyTasks.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            {texts.noHistoryTasks}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {historyTasks.map((task) => {
              const latestAssignment = getLatestAssignment(task)
              const normalizedStatus = normalizeTaskStatus(task.status)
              const isCancelled = normalizedStatus === "CANCELLED"
              const normalizedTitle = normalizeTaskTitleText(task.title, language)
              const normalizedDescription = normalizeTaskDescriptionText(
                task.description,
                language
              )

              return (
                <div key={task.id} className="p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-slate-900">
                            {normalizedTitle || texts.dash}
                          </div>

                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${taskStatusBadgeClasses(
                              task.status
                            )}`}
                          >
                            {getTaskStatusLabel(language, task.status)}
                          </span>

                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadgeClasses(
                              task.priority
                            )}`}
                          >
                            {getPriorityLabel(language, task.priority)}
                          </span>

                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                            {getTaskTypeLabel(language, task.taskType)}
                          </span>
                        </div>

                        {normalizedDescription ? (
                          <div className="mt-2 whitespace-pre-line text-sm text-slate-700">
                            {normalizedDescription}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          {texts.viewTask}
                        </Link>

                        {task.checklistRun ? (
                          <Link
                            href={`/tasks/${task.id}`}
                            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {texts.viewSubmittedChecklist}
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <HistoryInfoBox
                        label={texts.taskDate}
                        value={formatDate(task.scheduledDate, locale)}
                      />

                      <HistoryInfoBox
                        label={texts.time}
                        value={`${task.scheduledStartTime || texts.dash}${
                          task.scheduledEndTime ? ` - ${task.scheduledEndTime}` : ""
                        }`}
                      />

                      <HistoryInfoBox
                        label={isCancelled ? texts.cancelledAt : texts.completedAt}
                        value={formatDateTime(
                          task.completedAt || task.updatedAt || task.createdAt,
                          locale
                        )}
                      />

                      <HistoryInfoBox
                        label={texts.partner}
                        value={latestAssignment?.partner?.name || texts.dash}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <HistoryInfoBox
                        label={texts.activeChecklist}
                        value={
                          isCancelled
                            ? task.checklistRun?.template?.title
                              ? normalizeSystemChecklistTitle(
                                  task.checklistRun.template.title,
                                  language,
                                  {
                                    templateType:
                                      task.checklistRun.template.templateType,
                                    isPrimary:
                                      task.checklistRun.template.isPrimary,
                                    fallback: texts.noChecklistUsed,
                                  }
                                )
                              : texts.noChecklistUsed
                            : task.checklistRun?.template?.title
                              ? normalizeSystemChecklistTitle(
                                  task.checklistRun.template.title,
                                  language,
                                  {
                                    templateType:
                                      task.checklistRun.template.templateType,
                                    isPrimary:
                                      task.checklistRun.template.isPrimary,
                                    fallback: texts.noChecklist,
                                  }
                                )
                              : texts.noChecklist
                        }
                      />

                      <HistoryInfoBox
                        label={texts.checklistStatus}
                        value={getChecklistHistoryStatusLabel(
                          task.checklistRun,
                          isCancelled,
                          language,
                          texts
                        )}
                      />
                    </div>

                    {isCancelled ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {texts.cancelledBanner}
                      </div>
                    ) : null}

                    {task.notes ? (
                      <div className="text-sm text-slate-600">
                        {texts.notes}: {task.notes}
                      </div>
                    ) : null}

                    {task.resultNotes ? (
                      <div className="text-sm text-slate-600">
                        {isCancelled ? texts.cancellationNote : texts.result}:{" "}
                        {task.resultNotes}
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