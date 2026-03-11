"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type Property = {
  id: string
  code: string
  name: string
  city?: string
}

type Partner = {
  id: string
  code: string
  name: string
  email: string
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
  partner: {
    id: string
    name: string
    email: string
    specialty?: string | null
  }
}

type Task = {
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
  property?: Property | null
  assignments?: TaskAssignment[]
  checklistRun?: {
    id: string
    status: string
    startedAt?: string | null
    completedAt?: string | null
    template?: {
      id: string
      title: string
      templateType?: string | null
    } | null
    answers?: Array<{ id: string }>
  } | null
  issues?: Array<{
    id: string
    issueType: string
    title: string
    severity?: string | null
    status?: string | null
  }>
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

  if (value.includes("urgent") || value.includes("critical") || value.includes("υψη")) {
    return "bg-red-50 text-red-700 border-red-200"
  }

  if (value.includes("normal") || value.includes("medium") || value.includes("μεσα")) {
    return "bg-amber-50 text-amber-700 border-amber-200"
  }

  if (value.includes("low") || value.includes("χαμη")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }

  return "bg-slate-50 text-slate-700 border-slate-200"
}

function getLatestAssignment(task: Task) {
  if (!task.assignments || task.assignments.length === 0) return null

  return [...task.assignments].sort((a, b) => {
    const first = a.assignedAt ? new Date(a.assignedAt).getTime() : 0
    const second = b.assignedAt ? new Date(b.assignedAt).getTime() : 0
    return second - first
  })[0]
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

export default function TasksPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [tasks, setTasks] = useState<Task[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [partners, setPartners] = useState<Partner[]>([])

  const [propertyId, setPropertyId] = useState("")
  const [partnerId, setPartnerId] = useState("")
  const [taskType, setTaskType] = useState("")
  const [status, setStatus] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  async function loadFilters() {
    const [propertiesRes, partnersRes] = await Promise.all([
      fetch("/api/properties", { cache: "no-store" }),
      fetch("/api/partners", { cache: "no-store" }),
    ])

    const propertiesData = await propertiesRes.json().catch(() => [])
    const partnersData = await partnersRes.json().catch(() => [])

    setProperties(Array.isArray(propertiesData) ? propertiesData : [])
    setPartners(Array.isArray(partnersData) ? partnersData : [])
  }

  async function loadTasks() {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams()

      if (propertyId) params.set("propertyId", propertyId)
      if (partnerId) params.set("partnerId", partnerId)
      if (taskType) params.set("taskType", taskType)
      if (status) params.set("status", status)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)

      const url = `/api/tasks${params.toString() ? `?${params.toString()}` : ""}`

      const res = await fetch(url, { cache: "no-store" })
      const data = await res.json().catch(() => [])

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία φόρτωσης εργασιών.")
      }

      setTasks(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Σφάλμα φόρτωσης εργασιών:", err)
      setError(
        err instanceof Error ? err.message : "Παρουσιάστηκε σφάλμα κατά τη φόρτωση."
      )
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function init() {
      await loadFilters()
      await loadTasks()
    }

    init()
  }, [])

  useEffect(() => {
    loadTasks()
  }, [propertyId, partnerId, taskType, status, dateFrom, dateTo])

  const metrics = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((task) =>
        (task.status || "").toLowerCase().includes("pending")
      ).length,
      assigned: tasks.filter((task) => {
        const latest = getLatestAssignment(task)
        return !!latest && (latest.status || "").toLowerCase().includes("assigned")
      }).length,
      accepted: tasks.filter((task) => {
        const latest = getLatestAssignment(task)
        return !!latest && (latest.status || "").toLowerCase().includes("accepted")
      }).length,
      completed: tasks.filter((task) =>
        (task.status || "").toLowerCase().includes("completed")
      ).length,
    }
  }, [tasks])

  const groupedByType = useMemo(() => {
    const map = new Map<string, Task[]>()

    for (const task of tasks) {
      const key = task.taskType || "unknown"
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(task)
    }

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [tasks])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Ιστορικό και διαχείριση</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Εργασίες</h1>
            <p className="mt-2 text-sm text-slate-500">
              Πλήρης εικόνα εργασιών ανά κατηγορία, συνεργάτη, ακίνητο και κατάσταση.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/tasks/new"
              className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Νέα εργασία
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
          <p className="text-sm font-medium text-slate-500">Σύνολο</p>
          <p className="mt-3 text-4xl font-bold text-slate-950">{metrics.total}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Σε αναμονή</p>
          <p className="mt-3 text-4xl font-bold text-amber-600">{metrics.pending}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Ανατεθειμένες</p>
          <p className="mt-3 text-4xl font-bold text-blue-600">{metrics.assigned}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Αποδεκτές</p>
          <p className="mt-3 text-4xl font-bold text-emerald-600">{metrics.accepted}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Ολοκληρωμένες</p>
          <p className="mt-3 text-4xl font-bold text-emerald-700">{metrics.completed}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">Φίλτρα</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ακίνητο
            </label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            >
              <option value="">Όλα τα ακίνητα</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} • {property.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Συνεργάτης
            </label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            >
              <option value="">Όλοι οι συνεργάτες</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name} • {partner.specialty}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Κατηγορία
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            >
              <option value="">Όλες οι κατηγορίες</option>
              <option value="cleaning">Καθαρισμός</option>
              <option value="inspection">Επιθεώρηση</option>
              <option value="damage">Ζημιές</option>
              <option value="repair">Βλάβες</option>
              <option value="supplies">Αναλώσιμα</option>
              <option value="photos">Φωτογραφική τεκμηρίωση</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Κατάσταση
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            >
              <option value="">Όλες οι καταστάσεις</option>
              <option value="pending">pending</option>
              <option value="assigned">assigned</option>
              <option value="accepted">accepted</option>
              <option value="in_progress">in_progress</option>
              <option value="completed">completed</option>
              <option value="rejected">rejected</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Από ημερομηνία
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Έως ημερομηνία
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-sm text-slate-500">
            Φόρτωση εργασιών...
          </div>
        ) : groupedByType.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 shadow-sm text-sm text-slate-500">
            Δεν βρέθηκαν εργασίες με τα τρέχοντα φίλτρα.
          </div>
        ) : (
          groupedByType.map(([type, typeTasks]) => (
            <section
              key={type}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">
                    {mapTaskTypeToUi(type)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Σύνολο εργασιών κατηγορίας: {typeTasks.length}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Εργασία
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Ακίνητο
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Συνεργάτης
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Ημερομηνία
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Κατάσταση
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Ανάθεση
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Checklist
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Διάρκεια
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Συμβάντα
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {typeTasks.map((task) => {
                      const latestAssignment = getLatestAssignment(task)
                      const duration = calculateDuration(
                        latestAssignment?.startedAt || task.checklistRun?.startedAt,
                        latestAssignment?.completedAt || task.checklistRun?.completedAt
                      )

                      return (
                        <tr key={task.id} className="border-t border-slate-200">
                          <td className="px-4 py-4 align-top">
                            <div>
                              <Link
                                href={`/tasks/${task.id}`}
                                className="text-sm font-semibold text-slate-900 hover:text-blue-600"
                              >
                                {task.title}
                              </Link>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {task.requiresChecklist ? (
                                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                                    Checklist
                                  </span>
                                ) : null}

                                {task.requiresPhotos ? (
                                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700">
                                    Φωτογραφίες
                                  </span>
                                ) : null}

                                <span
                                  className={cls(
                                    "rounded-full border px-2 py-1 text-[11px] font-semibold",
                                    getPriorityBadgeClasses(task.priority)
                                  )}
                                >
                                  {task.priority || "normal"}
                                </span>
                              </div>

                              {task.resultNotes ? (
                                <p className="mt-2 text-xs text-slate-500">
                                  {task.resultNotes}
                                </p>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top text-sm text-slate-700">
                            <div>{task.property?.name || "—"}</div>
                            <div className="text-xs text-slate-500">
                              {task.property?.code || ""}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top text-sm text-slate-700">
                            {latestAssignment?.partner?.name || "Δεν έχει ανατεθεί"}
                          </td>

                          <td className="px-4 py-4 align-top text-sm text-slate-700">
                            <div>{formatDate(task.scheduledDate)}</div>
                            <div className="text-xs text-slate-500">
                              {task.scheduledStartTime || "—"}
                              {task.scheduledEndTime
                                ? ` - ${task.scheduledEndTime}`
                                : ""}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top text-sm">
                            <span
                              className={cls(
                                "rounded-full border px-3 py-1 text-xs font-semibold",
                                getStatusBadgeClasses(task.status)
                              )}
                            >
                              {task.status || "—"}
                            </span>
                          </td>

                          <td className="px-4 py-4 align-top text-sm">
                            {latestAssignment ? (
                              <div className="space-y-2">
                                <span
                                  className={cls(
                                    "rounded-full border px-3 py-1 text-xs font-semibold",
                                    getStatusBadgeClasses(latestAssignment.status)
                                  )}
                                >
                                  {latestAssignment.status}
                                </span>

                                <div className="text-xs text-slate-500">
                                  Ανάθεση: {formatDateTime(latestAssignment.assignedAt)}
                                </div>

                                {latestAssignment.acceptedAt ? (
                                  <div className="text-xs text-slate-500">
                                    Αποδοχή: {formatDateTime(latestAssignment.acceptedAt)}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-4 py-4 align-top text-sm text-slate-700">
                            {task.checklistRun ? (
                              <div className="space-y-2">
                                <div className="font-medium">
                                  {task.checklistRun.template?.title || "Checklist"}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Κατάσταση: {task.checklistRun.status}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Απαντήσεις: {task.checklistRun.answers?.length || 0}
                                </div>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-4 py-4 align-top text-sm text-slate-700">
                            {duration}
                          </td>

                          <td className="px-4 py-4 align-top text-sm text-slate-700">
                            {task.issues?.length || 0}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </section>
    </div>
  )
}