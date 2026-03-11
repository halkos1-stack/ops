"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type Property = {
  id: string
  name: string
  address: string
  createdAt: string
}

type Partner = {
  id: string
  name: string
  email: string
  phone: string | null
  specialty: string
  status: string
  createdAt: string
}

type Task = {
  id: string
  title: string
  status: string
  date: string
  createdAt: string
  propertyId: string
  property?: Property
}

function getTaskStatusClasses(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
      return "border border-green-200 bg-green-100 text-green-700"
    case "in_progress":
      return "border border-blue-200 bg-blue-100 text-blue-700"
    case "pending":
      return "border border-amber-200 bg-amber-100 text-amber-700"
    case "cancelled":
      return "border border-red-200 bg-red-100 text-red-700"
    default:
      return "border border-slate-200 bg-slate-100 text-slate-700"
  }
}

function getTaskStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
      return "Ολοκληρωμένη"
    case "in_progress":
      return "Σε εξέλιξη"
    case "pending":
      return "Σε αναμονή"
    case "cancelled":
      return "Ακυρωμένη"
    default:
      return status
  }
}

function getPartnerStatusClasses(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "border border-green-200 bg-green-100 text-green-700"
    case "inactive":
      return "border border-slate-200 bg-slate-100 text-slate-700"
    default:
      return "border border-amber-200 bg-amber-100 text-amber-700"
  }
}

function getPartnerStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "Ενεργός"
    case "inactive":
      return "Ανενεργός"
    default:
      return status
  }
}

export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [partners, setPartners] = useState<Partner[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadDashboardData() {
    try {
      setLoading(true)
      setError("")

      const [propertiesRes, tasksRes, partnersRes] = await Promise.all([
        fetch("/api/properties", { cache: "no-store" }),
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/partners", { cache: "no-store" }),
      ])

      if (!propertiesRes.ok) {
        throw new Error("Αποτυχία φόρτωσης ακινήτων")
      }

      if (!tasksRes.ok) {
        throw new Error("Αποτυχία φόρτωσης εργασιών")
      }

      if (!partnersRes.ok) {
        throw new Error("Αποτυχία φόρτωσης συνεργατών")
      }

      const [propertiesData, tasksData, partnersData] = await Promise.all([
        propertiesRes.json(),
        tasksRes.json(),
        partnersRes.json(),
      ])

      setProperties(propertiesData)
      setTasks(tasksData)
      setPartners(partnersData)
    } catch (err) {
      console.error("Dashboard load error:", err)
      setError("Δεν ήταν δυνατή η φόρτωση του dashboard.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const totalProperties = properties.length
  const totalTasks = tasks.length
  const totalPartners = partners.length

  const pendingTasks = useMemo(() => {
    return tasks.filter((task) => task.status.toLowerCase() === "pending").length
  }, [tasks])

  const completedTasks = useMemo(() => {
    return tasks.filter((task) => task.status.toLowerCase() === "completed").length
  }, [tasks])

  const activePartners = useMemo(() => {
    return partners.filter(
      (partner) => partner.status.toLowerCase() === "active"
    ).length
  }, [partners])

  const tasksToday = useMemo(() => {
    const today = new Date()
    const todayString = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).toDateString()

    return tasks.filter((task) => {
      const taskDate = new Date(task.date)
      const normalizedTaskDate = new Date(
        taskDate.getFullYear(),
        taskDate.getMonth(),
        taskDate.getDate()
      ).toDateString()

      return normalizedTaskDate === todayString
    }).length
  }, [tasks])

  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0
    return Math.round((completedTasks / tasks.length) * 100)
  }, [tasks, completedTasks])

  const recentTasks = useMemo(() => {
    return tasks.slice(0, 5)
  }, [tasks])

  const recentProperties = useMemo(() => {
    return properties.slice(0, 5)
  }, [properties])

  const recentPartners = useMemo(() => {
    return partners.slice(0, 5)
  }, [partners])

  if (loading) {
    return (
      <div className="space-y-8">
        <section>
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded bg-slate-200" />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 h-8 w-20 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-3 w-36 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
              <div className="mt-5 space-y-4">
                {[1, 2, 3].map((row) => (
                  <div key={row} className="space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Συνολική εικόνα λειτουργίας για ακίνητα, εργασίες και συνεργάτες.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/properties"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Νέο ακίνητο
          </Link>

          <Link
            href="/tasks"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Νέα εργασία
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Σύνολο ακινήτων</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {totalProperties}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Καταχωρημένα ακίνητα στο σύστημα
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Σύνολο εργασιών</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {totalTasks}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Όλες οι εργασίες που έχουν δημιουργηθεί
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Εργασίες σήμερα
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {tasksToday}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Προγραμματισμένες για τη σημερινή ημέρα
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Ενεργοί συνεργάτες
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {activePartners}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Συνεργάτες διαθέσιμοι για ανάθεση
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Σε αναμονή</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">
            {pendingTasks}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Εργασίες που δεν έχουν ολοκληρωθεί ακόμη
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Ολοκληρωμένες</p>
          <p className="mt-3 text-3xl font-bold text-green-600">
            {completedTasks}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Εργασίες που έχουν κλείσει επιτυχώς
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Ποσοστό ολοκλήρωσης
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {completionRate}%
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Βάσει του συνολικού αριθμού εργασιών
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Πρόσφατες εργασίες
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Οι τελευταίες καταχωρήσεις εργασιών
              </p>
            </div>

            <Link
              href="/tasks"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Προβολή όλων
            </Link>
          </div>

          <div className="p-6">
            {recentTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  Δεν υπάρχουν ακόμη εργασίες
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Ξεκίνησε δημιουργώντας την πρώτη εργασία.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {task.title}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {task.property?.name || "Χωρίς ακίνητο"}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(task.date).toLocaleDateString("el-GR")}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${getTaskStatusClasses(
                          task.status
                        )}`}
                      >
                        {getTaskStatusLabel(task.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Πρόσφατα ακίνητα
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Οι τελευταίες καταχωρήσεις ακινήτων
              </p>
            </div>

            <Link
              href="/properties"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Προβολή όλων
            </Link>
          </div>

          <div className="p-6">
            {recentProperties.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  Δεν υπάρχουν ακόμη ακίνητα
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Πρόσθεσε το πρώτο ακίνητο για να ξεκινήσεις.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentProperties.map((property) => (
                  <div
                    key={property.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {property.name}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {property.address}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Δημιουργία:{" "}
                      {new Date(property.createdAt).toLocaleDateString("el-GR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Πρόσφατοι συνεργάτες
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Οι τελευταίοι συνεργάτες του συστήματος
              </p>
            </div>

            <Link
              href="/partners"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Προβολή όλων
            </Link>
          </div>

          <div className="p-6">
            {recentPartners.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  Δεν υπάρχουν ακόμη συνεργάτες
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Πρόσθεσε συνεργάτες για να μπορείς να κάνεις αναθέσεις.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentPartners.map((partner) => (
                  <div
                    key={partner.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {partner.name}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {partner.email}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {partner.specialty}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${getPartnerStatusClasses(
                          partner.status
                        )}`}
                      >
                        {getPartnerStatusLabel(partner.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}