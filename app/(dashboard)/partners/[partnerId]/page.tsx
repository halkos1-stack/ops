"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

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

export default function PartnerDetailsPage() {
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
        throw new Error("Αποτυχία φόρτωσης συνεργατών.")
      }

      if (!tasksRes.ok) {
        throw new Error("Αποτυχία φόρτωσης εργασιών συνεργάτη.")
      }

      const currentPartner = Array.isArray(partnersData)
        ? partnersData.find((x: Partner) => x.id === partnerId) || null
        : null

      setPartner(currentPartner)
      setTasks(Array.isArray(tasksData) ? tasksData : [])
    } catch (err) {
      console.error("Σφάλμα φόρτωσης συνεργάτη:", err)
      setError(
        err instanceof Error ? err.message : "Παρουσιάστηκε σφάλμα κατά τη φόρτωση."
      )
      setPartner(null)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [partnerId])

  const groupedByDate = useMemo(() => {
    const map = new Map<string, Task[]>()

    for (const task of tasks) {
      const dateKey = task.scheduledDate?.slice(0, 10) || "Χωρίς ημερομηνία"

      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }

      map.get(dateKey)!.push(task)
    }

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [tasks])

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        Φόρτωση συνεργάτη...
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm text-red-700">
        Δεν βρέθηκε ο συνεργάτης.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Εικόνα συνεργάτη</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{partner.name}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {partner.email} • {partner.specialty}
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">Λίστα εργασιών</h2>

        {tasks.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Δεν υπάρχουν ακόμη εργασίες για αυτόν τον συνεργάτη.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
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
                    Κατηγορία
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Ημερομηνία
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Ώρα
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Κατάσταση
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <Link href={`/tasks/${task.id}`} className="font-semibold hover:text-blue-600">
                        {task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {task.property?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {task.taskType}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(task.scheduledDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {task.scheduledStartTime || "—"}
                      {task.scheduledEndTime ? ` - ${task.scheduledEndTime}` : ""}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {task.status || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">Ημερολογιακή προβολή</h2>

        {groupedByDate.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Δεν υπάρχουν προγραμματισμένες εργασίες.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {groupedByDate.map(([dateKey, dateTasks]) => (
              <div key={dateKey} className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-lg font-bold text-slate-900">
                  {formatDate(dateKey)}
                </h3>

                <div className="mt-3 space-y-3">
                  {dateTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{task.title}</p>
                          <p className="text-sm text-slate-500">
                            {task.property?.name || "—"} • {task.taskType}
                          </p>
                        </div>

                        <div className="text-sm text-slate-600">
                          {task.scheduledStartTime || "—"}
                          {task.scheduledEndTime ? ` - ${task.scheduledEndTime}` : ""}
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