"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type IssueListItem = {
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
  } | null
  task?: {
    id: string
    title: string
    status?: string | null
  } | null
}

type IssueFilter = "all" | "open" | "in_progress" | "resolved" | "closed"

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

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      locale: "en-GB",
      pageTitle: "Issues",
      pageSubtitle:
        "Monitor property issues, damages and pending technical matters.",
      metrics: {
        total: "Total issues",
        open: "Open",
        inProgress: "In progress",
        resolved: "Resolved",
        critical: "Critical / High",
      },
      filters: {
        all: "All",
        open: "Open",
        inProgress: "In progress",
        resolved: "Resolved",
        closed: "Closed",
        searchPlaceholder: "Search by title, property, task...",
        clear: "Clear filters",
      },
      list: {
        title: "Issue list",
        subtitle: "All recorded issues in the system.",
        loading: "Loading issues...",
        empty: "No issues found with the current filters.",
        createdAt: "Created",
        updatedAt: "Updated",
        property: "Property",
        task: "Task",
        reportedBy: "Reported by",
        resolution: "Resolution",
        viewIssue: "View issue",
        noProperty: "No property",
        noTask: "No task",
      },
      labels: {
        type: "Type",
        severity: "Severity",
        status: "Status",
      },
    }
  }

  return {
    locale: "el-GR",
    pageTitle: "Θέματα",
    pageSubtitle:
      "Παρακολούθηση θεμάτων ακινήτων, ζημιών, βλαβών και εκκρεμών τεχνικών ζητημάτων.",
    metrics: {
      total: "Σύνολο θεμάτων",
      open: "Ανοιχτά",
      inProgress: "Σε εξέλιξη",
      resolved: "Επιλυμένα",
      critical: "Κρίσιμα / Υψηλά",
    },
    filters: {
      all: "Όλα",
      open: "Ανοιχτά",
      inProgress: "Σε εξέλιξη",
      resolved: "Επιλυμένα",
      closed: "Κλειστά",
      searchPlaceholder: "Αναζήτηση σε τίτλο, ακίνητο, εργασία...",
      clear: "Καθαρισμός φίλτρων",
    },
    list: {
      title: "Λίστα θεμάτων",
      subtitle: "Όλα τα καταγεγραμμένα θέματα του συστήματος.",
      loading: "Φόρτωση θεμάτων...",
      empty: "Δεν βρέθηκαν θέματα με τα τρέχοντα φίλτρα.",
      createdAt: "Δημιουργία",
      updatedAt: "Ενημέρωση",
      property: "Ακίνητο",
      task: "Εργασία",
      reportedBy: "Αναφορά από",
      resolution: "Επίλυση",
      viewIssue: "Προβολή θέματος",
      noProperty: "Χωρίς ακίνητο",
      noTask: "Χωρίς εργασία",
    },
    labels: {
      type: "Τύπος",
      severity: "Σοβαρότητα",
      status: "Κατάσταση",
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
      return "Καθαρισμός"
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

export default function IssuesPage() {
  const { language } = useAppLanguage()
  const texts = getTexts(language)

  const [issues, setIssues] = useState<IssueListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [activeFilter, setActiveFilter] = useState<IssueFilter>("all")
  const [searchTerm, setSearchTerm] = useState("")

  async function loadIssues() {
    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/issues", {
        cache: "no-store",
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || "Αποτυχία φόρτωσης θεμάτων.")
      }

      const rows = Array.isArray(json)
        ? json
        : Array.isArray(json?.issues)
        ? json.issues
        : Array.isArray(json?.data)
        ? json.data
        : []

      setIssues(rows)
    } catch (err) {
      console.error("Issues load error:", err)
      setError(
        err instanceof Error ? err.message : "Αποτυχία φόρτωσης θεμάτων."
      )
      setIssues([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIssues()
  }, [])

  const summary = useMemo(() => {
    const open = issues.filter(
      (issue) => (issue.status || "").toLowerCase() === "open"
    ).length

    const inProgress = issues.filter(
      (issue) => (issue.status || "").toLowerCase() === "in_progress"
    ).length

    const resolved = issues.filter(
      (issue) => (issue.status || "").toLowerCase() === "resolved"
    ).length

    const critical = issues.filter((issue) =>
      ["high", "critical"].includes((issue.severity || "").toLowerCase())
    ).length

    return {
      total: issues.length,
      open,
      inProgress,
      resolved,
      critical,
    }
  }, [issues])

  const filteredIssues = useMemo(() => {
    let rows = [...issues]

    if (activeFilter !== "all") {
      rows = rows.filter(
        (issue) => (issue.status || "").toLowerCase() === activeFilter
      )
    }

    const term = searchTerm.trim().toLowerCase()

    if (term) {
      rows = rows.filter((issue) => {
        const text = [
          issue.title,
          issue.description,
          issue.issueType,
          issue.severity,
          issue.status,
          issue.reportedBy,
          issue.property?.code,
          issue.property?.name,
          issue.property?.address,
          issue.task?.title,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return text.includes(term)
      })
    }

    return rows
  }, [issues, activeFilter, searchTerm])

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {texts.pageTitle}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{texts.pageSubtitle}</p>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${
            activeFilter === "all"
              ? "border-slate-900 bg-slate-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.metrics.total}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {summary.total}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("open")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${
            activeFilter === "open"
              ? "border-red-300 bg-red-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.metrics.open}</div>
          <div className="mt-2 text-3xl font-bold text-red-700">
            {summary.open}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("in_progress")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${
            activeFilter === "in_progress"
              ? "border-amber-300 bg-amber-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.metrics.inProgress}</div>
          <div className="mt-2 text-3xl font-bold text-amber-700">
            {summary.inProgress}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("resolved")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${
            activeFilter === "resolved"
              ? "border-emerald-300 bg-emerald-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="text-sm text-slate-500">{texts.metrics.resolved}</div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">
            {summary.resolved}
          </div>
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">{texts.metrics.critical}</div>
          <div className="mt-2 text-3xl font-bold text-red-700">
            {summary.critical}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              { key: "all", label: texts.filters.all },
              { key: "open", label: texts.filters.open },
              { key: "in_progress", label: texts.filters.inProgress },
              { key: "resolved", label: texts.filters.resolved },
              { key: "closed", label: texts.filters.closed },
            ] as Array<{ key: IssueFilter; label: string }>).map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  activeFilter === filter.key
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={texts.filters.searchPlaceholder}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 sm:min-w-[320px]"
            />

            <button
              type="button"
              onClick={() => {
                setSearchTerm("")
                setActiveFilter("all")
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.filters.clear}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{texts.list.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{texts.list.subtitle}</p>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-slate-500">{texts.list.loading}</div>
        ) : filteredIssues.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">{texts.list.empty}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredIssues.map((issue) => (
              <div key={issue.id} className="p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-slate-900">
                        {issue.title}
                      </div>

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
                    </div>

                    {issue.description ? (
                      <div className="mt-2 text-sm text-slate-700">
                        {issue.description}
                      </div>
                    ) : null}

                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {texts.list.property}
                        </div>
                        <div className="mt-1 text-sm text-slate-900">
                          {issue.property
                            ? `${issue.property.code} · ${issue.property.name}`
                            : texts.list.noProperty}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {texts.list.task}
                        </div>
                        <div className="mt-1 text-sm text-slate-900">
                          {issue.task?.title || texts.list.noTask}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {texts.list.reportedBy}
                        </div>
                        <div className="mt-1 text-sm text-slate-900">
                          {issue.reportedBy || "—"}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {texts.list.createdAt}
                        </div>
                        <div className="mt-1 text-sm text-slate-900">
                          {formatDateTime(issue.createdAt, texts.locale)}
                        </div>
                      </div>
                    </div>

                    {issue.resolutionNotes ? (
                      <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                        <span className="font-medium">{texts.list.resolution}:</span>{" "}
                        {issue.resolutionNotes}
                      </div>
                    ) : null}

                    <div className="mt-2 text-xs text-slate-500">
                      {texts.list.updatedAt}: {formatDateTime(issue.updatedAt, texts.locale)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/issues/${issue.id}`}
                      className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      {texts.list.viewIssue}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}