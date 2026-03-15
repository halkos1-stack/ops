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
} from "./portal-i18n"

type DashboardResponse = {
  partner: {
    id: string
    code: string
    name: string
    email: string
    phone?: string | null
    specialty: string
    status: string
  }
  stats: {
    totalAssignments: number
    pendingAcceptance: number
    accepted: number
    inProgress: number
    completedToday: number
  }
  urgentItems: Array<{
    assignmentId: string
    assignmentStatus: string
    task: {
      id: string
      title: string
      taskType: string
      status: string
      scheduledDate: string
      scheduledStartTime?: string | null
      scheduledEndTime?: string | null
      property: {
        id: string
        code: string
        name: string
        address: string
        city: string
        region: string
      }
      checklistRun?: {
        id: string
        status: string
      } | null
    }
  }>
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

function getTexts(language: PortalLanguage) {
  const common = getPortalTexts(language)

  if (language === "en") {
    return {
      ...common,
      areaTitle: "Partner area",
      loading: "Loading partner portal...",
      loadErrorTitle: "Partner portal could not be loaded",
      totalAssignments: "Total assignments",
      pendingAcceptance: "Pending acceptance",
      accepted: "Accepted",
      inProgress: "In progress",
      completedToday: "Completed today",
      urgentTitle: "Immediate action",
      urgentSubtitle: "Tasks that need action now.",
      noUrgent: "There are no immediate pending tasks right now.",
      openTask: "Open task",
      schedule: "Schedule",
      calendar: "Calendar",
      history: "History",
    }
  }

  return {
    ...common,
    areaTitle: "Περιοχή συνεργάτη",
    loading: "Φόρτωση περιοχής συνεργάτη...",
    loadErrorTitle: "Δεν φορτώθηκε η περιοχή συνεργάτη",
    totalAssignments: "Σύνολο αναθέσεων",
    pendingAcceptance: "Προς αποδοχή",
    accepted: "Αποδεκτές",
    inProgress: "Σε εξέλιξη",
    completedToday: "Ολοκληρωμένες σήμερα",
    urgentTitle: "Άμεση δράση",
    urgentSubtitle: "Οι εργασίες που θέλουν ενέργεια τώρα.",
    noUrgent: "Δεν υπάρχουν άμεσες εκκρεμότητες αυτή τη στιγμή.",
    openTask: "Άνοιγμα εργασίας",
    schedule: "Πρόγραμμα",
    calendar: "Ημερολόγιο",
    history: "Ιστορικό",
  }
}

function LanguageSwitcher({
  token,
  language,
}: {
  token: string
  language: PortalLanguage
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
        onClick={() => router.replace(buildPartnerPortalUrl(token, "", "el"))}
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
        onClick={() => router.replace(buildPartnerPortalUrl(token, "", "en"))}
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

export default function PartnerPortalPage() {
  const params = useParams()
  const searchParams = useSearchParams()

  const token = Array.isArray(params?.token) ? params.token[0] : params?.token
  const language = normalizePortalLanguage(searchParams.get("lang"))

  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const t = getTexts(language)

  async function loadData() {
    if (!token) return

    try {
      setLoading(true)
      setError("")

      const res = await fetch(`/api/partner/${token}`, {
        cache: "no-store",
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || "Αποτυχία φόρτωσης portal συνεργάτη.")
      }

      setData(json)
    } catch (err) {
      console.error("Partner portal load error:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Παρουσιάστηκε σφάλμα κατά τη φόρτωση."
      )
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  const urgentItems = useMemo(() => data?.urgentItems || [], [data])

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
          <h1 className="text-2xl font-bold text-red-700">
            {t.loadErrorTitle}
          </h1>
          <p className="mt-2 text-sm text-red-600">
            {error || "Άγνωστο σφάλμα."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm text-slate-500">{t.areaTitle}</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                {data.partner.name}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {data.partner.code} • {data.partner.specialty} • {data.partner.email}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <LanguageSwitcher token={token as string} language={language} />

              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildPartnerPortalUrl(token as string, "", language)}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {t.home}
                </Link>
                <Link
                  href={buildPartnerPortalUrl(token as string, "/schedule", language)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t.schedule}
                </Link>
                <Link
                  href={buildPartnerPortalUrl(token as string, "/calendar", language)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t.calendar}
                </Link>
                <Link
                  href={buildPartnerPortalUrl(token as string, "/history", language)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t.history}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.totalAssignments}</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {data.stats.totalAssignments}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.pendingAcceptance}</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {data.stats.pendingAcceptance}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.accepted}</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {data.stats.accepted}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.inProgress}</p>
            <p className="mt-2 text-3xl font-bold text-violet-700">
              {data.stats.inProgress}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.completedToday}</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {data.stats.completedToday}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-slate-950">{t.urgentTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">{t.urgentSubtitle}</p>
          </div>

          {urgentItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              {t.noUrgent}
            </div>
          ) : (
            <div className="space-y-4">
              {urgentItems.map((item) => (
                <div
                  key={item.assignmentId}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-950">
                          {item.task.title}
                        </h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(
                            item.assignmentStatus
                          )}`}
                        >
                          {getPortalStatusLabel(language, item.assignmentStatus)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {item.task.property.name} • {item.task.property.code}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(item.task.scheduledDate, language)}
                        {item.task.scheduledStartTime
                          ? ` · ${item.task.scheduledStartTime}`
                          : ""}
                        {item.task.scheduledEndTime
                          ? ` - ${item.task.scheduledEndTime}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`${buildPartnerPortalUrl(
                          token as string,
                          `/tasks/${item.task.id}`,
                          language
                        )}&from=home`}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {t.openTask}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}