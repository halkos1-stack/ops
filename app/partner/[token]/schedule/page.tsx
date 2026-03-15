"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  PortalLanguage,
  buildPartnerPortalUrl,
  getPortalStatusLabel,
  getPortalTexts,
  normalizePortalLanguage,
} from "../portal-i18n"

type ScheduleResponse = {
  partner: {
    id: string
    code: string
    name: string
    email: string
    specialty: string
    status: string
  }
  items: Array<{
    assignmentId: string
    assignmentStatus: string
    assignedAt?: string | null
    acceptedAt?: string | null
    startedAt?: string | null
    completedAt?: string | null
    task: {
      id: string
      title: string
      description?: string | null
      taskType: string
      priority?: string | null
      status?: string | null
      scheduledDate: string
      scheduledStartTime?: string | null
      scheduledEndTime?: string | null
      requiresChecklist?: boolean
      checklistRun?: {
        id: string
        status: string
        completedAt?: string | null
      } | null
      property: {
        id: string
        code: string
        name: string
        address: string
        city: string
        region: string
      }
    }
  }>
}

function formatDate(value?: string | null, language: PortalLanguage = "el") {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat(language === "el" ? "el-GR" : "en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function statusClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "assigned":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "accepted":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
    case "in_progress":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function priorityClasses(priority?: string | null) {
  switch ((priority || "").toLowerCase()) {
    case "high":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    case "medium":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getTexts(language: PortalLanguage) {
  const common = getPortalTexts(language)

  if (language === "en") {
    return {
      ...common,
      pageTitle: "Work schedule",
      pageSubtitle: "Open tasks only",
      loading: "Loading schedule...",
      loadErrorTitle: "Schedule could not be loaded",
      backHome: "Back to home",
      empty: "There are no open tasks in the schedule.",
      openTask: "Open task",
      checklist: "Checklist",
      checklistDone: "Checklist completed",
      checklistPending: "Checklist pending",
      priorityLabel: "Priority",
      history: "History",
      calendar: "Calendar",
    }
  }

  return {
    ...common,
    pageTitle: "Πρόγραμμα εργασιών",
    pageSubtitle: "Μόνο ανοιχτές εργασίες",
    loading: "Φόρτωση προγράμματος...",
    loadErrorTitle: "Δεν φορτώθηκε το πρόγραμμα",
    backHome: "Επιστροφή στην αρχική",
    empty: "Δεν υπάρχουν ανοιχτές εργασίες στο πρόγραμμα.",
    openTask: "Άνοιγμα εργασίας",
    checklist: "Checklist",
    checklistDone: "Ολοκληρωμένη checklist",
    checklistPending: "Checklist σε αναμονή",
    priorityLabel: "Προτεραιότητα",
    history: "Ιστορικό",
    calendar: "Ημερολόγιο",
  }
}

function LanguageSwitcher({
  token,
  language,
  currentPath,
}: {
  token: string
  language: PortalLanguage
  currentPath: string
}) {
  const router = useRouter()
  const common = getPortalTexts(language)

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
      <span className="px-2 text-xs font-semibold text-slate-500">
        {common.languageLabel}
      </span>

      <button
        type="button"
        onClick={() =>
          router.replace(buildPartnerPortalUrl(token, currentPath, "el"))
        }
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
        onClick={() =>
          router.replace(buildPartnerPortalUrl(token, currentPath, "en"))
        }
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

export default function PartnerSchedulePage() {
  const params = useParams()
  const searchParams = useSearchParams()

  const token = Array.isArray(params?.token) ? params.token[0] : params?.token
  const language = normalizePortalLanguage(searchParams.get("lang"))

  const [data, setData] = useState<ScheduleResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const t = getTexts(language)

  async function loadData() {
    if (!token) return

    try {
      setLoading(true)
      setError("")

      const res = await fetch(`/api/partner/${token}/schedule`, {
        cache: "no-store",
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || "Αποτυχία φόρτωσης προγράμματος.")
      }

      setData(json)
    } catch (err) {
      console.error("Partner schedule load error:", err)
      setError(err instanceof Error ? err.message : "Παρουσιάστηκε σφάλμα.")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleResponse["items"]>()

    for (const item of data?.items || []) {
      const key = new Date(item.task.scheduledDate).toISOString().slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }

    return Array.from(map.entries())
  }, [data])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          {t.loading}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-red-700">{t.loadErrorTitle}</h1>
          <p className="mt-2 text-sm text-red-600">{error || "Άγνωστο σφάλμα."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm text-slate-500">{t.pageSubtitle}</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                {t.pageTitle}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {data.partner.name} • {data.partner.code}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <LanguageSwitcher
                token={token as string}
                language={language}
                currentPath="/schedule"
              />

              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildPartnerPortalUrl(token as string, "", language)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t.backHome}
                </Link>
                <Link
                  href={buildPartnerPortalUrl(token as string, "/calendar", language)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t.calendar}
                </Link>
                <Link
                  href={buildPartnerPortalUrl(token as string, "/history", language)}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {t.history}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {grouped.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              {t.empty}
            </div>
          </section>
        ) : (
          grouped.map(([dateKey, items]) => (
            <section
              key={dateKey}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-950">
                  {formatDate(dateKey, language)}
                </h2>
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.assignmentId}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-950">
                            {item.task.title}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                              item.assignmentStatus
                            )}`}
                          >
                            {getPortalStatusLabel(language, item.assignmentStatus)}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityClasses(
                              item.task.priority
                            )}`}
                          >
                            {t.priorityLabel}: {item.task.priority || "normal"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {item.task.property.name} • {item.task.property.code}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {item.task.scheduledStartTime || "—"}
                          {item.task.scheduledEndTime
                            ? ` - ${item.task.scheduledEndTime}`
                            : ""}
                        </p>

                        {item.task.description ? (
                          <p className="mt-3 text-sm text-slate-700">
                            {item.task.description}
                          </p>
                        ) : null}

                        {item.task.requiresChecklist ? (
                          <div className="mt-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {item.task.checklistRun?.status === "completed"
                              ? t.checklistDone
                              : t.checklistPending}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Link
                          href={`${buildPartnerPortalUrl(
                            token as string,
                            `/tasks/${item.task.id}`,
                            language
                          )}&from=schedule`}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {t.openTask}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}