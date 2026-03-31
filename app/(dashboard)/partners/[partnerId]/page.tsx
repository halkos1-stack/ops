"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type Task = {
  id: string
  title: string
  taskType: string
  status?: string | null
  scheduledDate: string
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  property?: {
    id: string
    name: string
    code: string
  } | null
  assignments?: Array<{
    id: string
    status: string
    partner: {
      id: string
      name: string
    }
  }>
}

type Partner = {
  id: string
  name: string
  email: string
  specialty: string
}

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      noValue: "—",
      loadPartnerError: "Failed to load partners.",
      loadTasksError: "Failed to load partner tasks.",
      genericLoadError: "An error occurred while loading.",
      noDateGroup: "No date",
      loading: "Loading partner...",
      notFound: "Partner not found.",
      pageEyebrow: "Partner details",
      pageTitle: "Partner schedule and tasks",
      pageDescription:
        "Overview of assigned work grouped by date, with quick access to the related task and property.",
      backToPartners: "Back to partners",
      email: "Email",
      specialty: "Specialty",
      assignedTasks: "Assigned tasks",
      groupedByDate: "Grouped by date",
      noTasks: "No tasks were found for this partner.",
      taskDate: "Task date",
      property: "Property",
      taskType: "Task type",
      status: "Status",
      task: "Task",
      openTask: "Open task",
      openProperty: "Open property",
    }
  }

  return {
    noValue: "—",
    loadPartnerError: "Αποτυχία φόρτωσης συνεργατών.",
    loadTasksError: "Αποτυχία φόρτωσης εργασιών συνεργάτη.",
    genericLoadError: "Παρουσιάστηκε σφάλμα κατά τη φόρτωση.",
    noDateGroup: "Χωρίς ημερομηνία",
    loading: "Φόρτωση συνεργάτη...",
    notFound: "Δεν βρέθηκε ο συνεργάτης.",
    pageEyebrow: "Στοιχεία συνεργάτη",
    pageTitle: "Πρόγραμμα και εργασίες συνεργάτη",
    pageDescription:
      "Συνοπτική εικόνα των ανατεθειμένων εργασιών ανά ημερομηνία, με γρήγορη πρόσβαση στην εργασία και στο ακίνητο.",
    backToPartners: "Επιστροφή στους συνεργάτες",
    email: "Email",
    specialty: "Ειδικότητα",
    assignedTasks: "Ανατεθειμένες εργασίες",
    groupedByDate: "Ομαδοποίηση ανά ημερομηνία",
    noTasks: "Δεν βρέθηκαν εργασίες για αυτόν τον συνεργάτη.",
    taskDate: "Ημερομηνία εργασίας",
    property: "Ακίνητο",
    taskType: "Τύπος εργασίας",
    status: "Κατάσταση",
    task: "Εργασία",
    openTask: "Άνοιγμα εργασίας",
    openProperty: "Άνοιγμα ακινήτου",
  }
}

function formatDate(value: string | null | undefined, locale: string, empty: string) {
  if (!value) return empty
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return empty

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export default function PartnerDetailsPage() {
  const { language } = useAppLanguage()
  const texts = getTexts(language)
  const locale = language === "en" ? "en-GB" : "el-GR"

  const params = useParams()
  const partnerId = Array.isArray(params?.partnerId)
    ? params.partnerId[0]
    : params?.partnerId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [partner, setPartner] = useState<Partner | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])

  async function loadData() {
    if (!partnerId) return

    try {
      setLoading(true)
      setError("")

      const [partnersRes, tasksRes] = await Promise.all([
        fetch("/api/partners", { cache: "no-store" }),
        fetch(`/api/tasks?partnerId=${partnerId}`, { cache: "no-store" }),
      ])

      const partnersData = await partnersRes.json().catch(() => [])
      const tasksData = await tasksRes.json().catch(() => [])

      if (!partnersRes.ok) {
        throw new Error(texts.loadPartnerError)
      }

      if (!tasksRes.ok) {
        throw new Error(texts.loadTasksError)
      }

      const currentPartner = Array.isArray(partnersData)
        ? partnersData.find((x: Partner) => x.id === partnerId) || null
        : null

      setPartner(currentPartner)
      setTasks(Array.isArray(tasksData) ? tasksData : [])
    } catch (err) {
      console.error("Partner load error:", err)
      setError(err instanceof Error ? err.message : texts.genericLoadError)
      setPartner(null)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [partnerId, language])

  const groupedByDate = useMemo(() => {
    const map = new Map<string, Task[]>()

    for (const task of tasks) {
      const dateKey = task.scheduledDate?.slice(0, 10) || texts.noDateGroup

      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }

      map.get(dateKey)!.push(task)
    }

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [tasks, texts.noDateGroup])

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {texts.loading}
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700 shadow-sm">
        {error || texts.notFound}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              {texts.pageEyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{partner.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{texts.pageDescription}</p>
          </div>

          <Link
            href="/partners"
            className="inline-flex rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {texts.backToPartners}
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{texts.email}</div>
            <div className="mt-2 text-sm font-medium text-slate-900">{partner.email || texts.noValue}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{texts.specialty}</div>
            <div className="mt-2 text-sm font-medium text-slate-900">{partner.specialty || texts.noValue}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{texts.assignedTasks}</div>
            <div className="mt-2 text-sm font-medium text-slate-900">{tasks.length}</div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{texts.groupedByDate}</h2>
            <p className="mt-2 text-sm text-slate-500">{texts.assignedTasks}</p>
          </div>
        </div>

        {groupedByDate.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            {texts.noTasks}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {groupedByDate.map(([dateKey, items]) => (
              <div key={dateKey} className="space-y-3">
                <div className="text-sm font-semibold text-slate-500">
                  {dateKey === texts.noDateGroup
                    ? texts.noDateGroup
                    : formatDate(dateKey, locale, texts.noValue)}
                </div>

                <div className="grid gap-4">
                  {items.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{texts.task}</div>
                            <div className="mt-1 text-lg font-semibold text-slate-900">{task.title}</div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{texts.taskDate}</div>
                              <div className="mt-1 text-sm text-slate-700">
                                {formatDate(task.scheduledDate, locale, texts.noValue)}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{texts.property}</div>
                              <div className="mt-1 text-sm text-slate-700">
                                {task.property?.name || texts.noValue}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{texts.taskType}</div>
                              <div className="mt-1 text-sm text-slate-700">{task.taskType || texts.noValue}</div>
                            </div>

                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{texts.status}</div>
                              <div className="mt-1 text-sm text-slate-700">{task.status || texts.noValue}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                          >
                            {texts.openTask}
                          </Link>

                          {task.property?.id ? (
                            <Link
                              href={`/properties/${task.property.id}`}
                              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                            >
                              {texts.openProperty}
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}