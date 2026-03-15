"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

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

type DashboardFilter =
  | "all"
  | "today"
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "urgent"

function normalizeDateOnly(dateValue: string | Date | null | undefined) {
  if (!dateValue) return null

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDate(dateValue: string | Date | null | undefined, locale: string) {
  const normalized = normalizeDateOnly(dateValue)
  if (!normalized) return "-"
  return normalized.toLocaleDateString(locale)
}

function isToday(dateValue: string | null | undefined) {
  const today = normalizeDateOnly(new Date())
  const target = normalizeDateOnly(dateValue)

  if (!today || !target) return false

  return target.getTime() === today.getTime()
}

function isOverdueOrTodayOpenTask(task: Task) {
  const status = task.status.toLowerCase()

  if (status === "completed" || status === "cancelled") {
    return false
  }

  const today = normalizeDateOnly(new Date())
  const taskDate = normalizeDateOnly(task.date)

  if (!today || !taskDate) return false

  return taskDate.getTime() <= today.getTime()
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

function getDashboardTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      title: "Dashboard",
      subtitle:
        "Overall operational view for properties, tasks and partners.",
      newProperty: "New property",
      newTask: "New task",
      loadError: "Dashboard data could not be loaded.",
      loadingProperties: "Failed to load properties",
      loadingTasks: "Failed to load tasks",
      loadingPartners: "Failed to load partners",

      totalProperties: "Total properties",
      totalPropertiesHint: "Registered properties in the system",

      totalTasks: "Total tasks",
      totalTasksHint: "All tasks created in the system",

      tasksToday: "Tasks today",
      tasksTodayHint: "Scheduled for today",

      activePartners: "Active partners",
      activePartnersHint: "Partners available for assignment",

      pendingTasks: "Pending",
      pendingTasksHint: "Tasks not completed yet",

      completedTasks: "Completed",
      completedTasksHint: "Tasks successfully closed",

      completionRate: "Completion rate",
      completionRateHint: "Based on the total number of tasks",

      urgentAlerts: "Urgent pending items",
      urgentAlertsHint:
        "Tasks requiring immediate attention because they are open and due today or overdue.",
      noUrgentAlerts: "No urgent pending items right now.",
      noUrgentAlertsHint: "Everything looks under control.",
      urgentBadge: "Urgent",
      dueToday: "Due today",
      overdue: "Overdue",
      withoutProperty: "Without property",

      recentTasks: "Recent tasks",
      recentTasksHint: "Latest task entries",
      noTasks: "No tasks yet",
      noTasksHint: "Start by creating the first task.",

      recentProperties: "Recent properties",
      recentPropertiesHint: "Latest property entries",
      noProperties: "No properties yet",
      noPropertiesHint: "Add the first property to get started.",

      recentPartners: "Recent partners",
      recentPartnersHint: "Latest partners in the system",
      noPartners: "No partners yet",
      noPartnersHint: "Add partners so you can assign tasks.",

      viewAll: "View all",
      createdAt: "Created",
      filterResults: "Filtered tasks",
      filterResultsHint: "Live view based on the selected dashboard filter.",
      noFilteredTasks: "No tasks match the selected filter.",
      noFilteredTasksHint: "Try another filter or create a new task.",

      filterAll: "All tasks",
      filterToday: "Today",
      filterPending: "Pending",
      filterInProgress: "In progress",
      filterCompleted: "Completed",
      filterCancelled: "Cancelled",
      filterUrgent: "Urgent",

      openAlertsLink: "View tasks",

      taskStatus: {
        completed: "Completed",
        in_progress: "In progress",
        pending: "Pending",
        cancelled: "Cancelled",
      },
      partnerStatus: {
        active: "Active",
        inactive: "Inactive",
      },
      navigationTargetProperties: "/properties",
      navigationTargetTasks: "/tasks",
      navigationTargetPartners: "/partners",
      locale: "en-GB",
    }
  }

  return {
    title: "Dashboard",
    subtitle: "Συνολική εικόνα λειτουργίας για ακίνητα, εργασίες και συνεργάτες.",
    newProperty: "Νέο ακίνητο",
    newTask: "Νέα εργασία",
    loadError: "Δεν ήταν δυνατή η φόρτωση του dashboard.",
    loadingProperties: "Αποτυχία φόρτωσης ακινήτων",
    loadingTasks: "Αποτυχία φόρτωσης εργασιών",
    loadingPartners: "Αποτυχία φόρτωσης συνεργατών",

    totalProperties: "Σύνολο ακινήτων",
    totalPropertiesHint: "Καταχωρημένα ακίνητα στο σύστημα",

    totalTasks: "Σύνολο εργασιών",
    totalTasksHint: "Όλες οι εργασίες που έχουν δημιουργηθεί",

    tasksToday: "Εργασίες σήμερα",
    tasksTodayHint: "Προγραμματισμένες για τη σημερινή ημέρα",

    activePartners: "Ενεργοί συνεργάτες",
    activePartnersHint: "Συνεργάτες διαθέσιμοι για ανάθεση",

    pendingTasks: "Σε αναμονή",
    pendingTasksHint: "Εργασίες που δεν έχουν ολοκληρωθεί ακόμη",

    completedTasks: "Ολοκληρωμένες",
    completedTasksHint: "Εργασίες που έχουν κλείσει επιτυχώς",

    completionRate: "Ποσοστό ολοκλήρωσης",
    completionRateHint: "Βάσει του συνολικού αριθμού εργασιών",

    urgentAlerts: "Επείγουσες εκκρεμότητες",
    urgentAlertsHint:
      "Εργασίες που χρειάζονται άμεση προσοχή επειδή είναι ανοιχτές και αφορούν σήμερα ή έχουν ήδη καθυστερήσει.",
    noUrgentAlerts: "Δεν υπάρχουν επείγουσες εκκρεμότητες αυτή τη στιγμή.",
    noUrgentAlertsHint: "Η λειτουργία φαίνεται ελεγχόμενη.",
    urgentBadge: "Επείγον",
    dueToday: "Για σήμερα",
    overdue: "Σε καθυστέρηση",
    withoutProperty: "Χωρίς ακίνητο",

    recentTasks: "Πρόσφατες εργασίες",
    recentTasksHint: "Οι τελευταίες καταχωρήσεις εργασιών",
    noTasks: "Δεν υπάρχουν ακόμη εργασίες",
    noTasksHint: "Ξεκίνησε δημιουργώντας την πρώτη εργασία.",

    recentProperties: "Πρόσφατα ακίνητα",
    recentPropertiesHint: "Οι τελευταίες καταχωρήσεις ακινήτων",
    noProperties: "Δεν υπάρχουν ακόμη ακίνητα",
    noPropertiesHint: "Πρόσθεσε το πρώτο ακίνητο για να ξεκινήσεις.",

    recentPartners: "Πρόσφατοι συνεργάτες",
    recentPartnersHint: "Οι τελευταίοι συνεργάτες του συστήματος",
    noPartners: "Δεν υπάρχουν ακόμη συνεργάτες",
    noPartnersHint: "Πρόσθεσε συνεργάτες για να μπορείς να κάνεις αναθέσεις.",

    viewAll: "Προβολή όλων",
    createdAt: "Δημιουργία",
    filterResults: "Φιλτραρισμένες εργασίες",
    filterResultsHint: "Ζωντανή προβολή βάσει του επιλεγμένου φίλτρου dashboard.",
    noFilteredTasks: "Δεν βρέθηκαν εργασίες για το επιλεγμένο φίλτρο.",
    noFilteredTasksHint: "Δοκίμασε άλλο φίλτρο ή δημιούργησε νέα εργασία.",

    filterAll: "Όλες οι εργασίες",
    filterToday: "Σήμερα",
    filterPending: "Σε αναμονή",
    filterInProgress: "Σε εξέλιξη",
    filterCompleted: "Ολοκληρωμένες",
    filterCancelled: "Ακυρωμένες",
    filterUrgent: "Επείγουσες",

    openAlertsLink: "Προβολή εργασιών",

    taskStatus: {
      completed: "Ολοκληρωμένη",
      in_progress: "Σε εξέλιξη",
      pending: "Σε αναμονή",
      cancelled: "Ακυρωμένη",
    },
    partnerStatus: {
      active: "Ενεργός",
      inactive: "Ανενεργός",
    },
    navigationTargetProperties: "/properties",
    navigationTargetTasks: "/tasks",
    navigationTargetPartners: "/partners",
    locale: "el-GR",
  }
}

function getTaskStatusLabel(language: "el" | "en", status: string) {
  const texts = getDashboardTexts(language)

  switch (status.toLowerCase()) {
    case "completed":
      return texts.taskStatus.completed
    case "in_progress":
      return texts.taskStatus.in_progress
    case "pending":
      return texts.taskStatus.pending
    case "cancelled":
      return texts.taskStatus.cancelled
    default:
      return status
  }
}

function getPartnerStatusLabel(language: "el" | "en", status: string) {
  const texts = getDashboardTexts(language)

  switch (status.toLowerCase()) {
    case "active":
      return texts.partnerStatus.active
    case "inactive":
      return texts.partnerStatus.inactive
    default:
      return status
  }
}

function getFilterCardClasses(
  active: boolean,
  tone: "default" | "blue" | "amber" | "green" | "red"
) {
  if (active) {
    switch (tone) {
      case "blue":
        return "border-blue-300 bg-blue-50 ring-2 ring-blue-200"
      case "amber":
        return "border-amber-300 bg-amber-50 ring-2 ring-amber-200"
      case "green":
        return "border-green-300 bg-green-50 ring-2 ring-green-200"
      case "red":
        return "border-red-300 bg-red-50 ring-2 ring-red-200"
      default:
        return "border-slate-300 bg-slate-50 ring-2 ring-slate-200"
    }
  }

  return "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
}

export default function DashboardPage() {
  const { language } = useAppLanguage()
  const texts = getDashboardTexts(language)

  const [properties, setProperties] = useState<Property[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [partners, setPartners] = useState<Partner[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("all")

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
        throw new Error(texts.loadingProperties)
      }

      if (!tasksRes.ok) {
        throw new Error(texts.loadingTasks)
      }

      if (!partnersRes.ok) {
        throw new Error(texts.loadingPartners)
      }

      const [propertiesData, tasksData, partnersData] = await Promise.all([
        propertiesRes.json(),
        tasksRes.json(),
        partnersRes.json(),
      ])

      setProperties(Array.isArray(propertiesData) ? propertiesData : [])
      setTasks(Array.isArray(tasksData) ? tasksData : [])
      setPartners(Array.isArray(partnersData) ? partnersData : [])
    } catch (err) {
      console.error("Dashboard load error:", err)
      setError(texts.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalProperties = properties.length
  const totalTasks = tasks.length

  const activePartners = useMemo(() => {
    return partners.filter(
      (partner) => partner.status.toLowerCase() === "active"
    ).length
  }, [partners])

  const pendingTasks = useMemo(() => {
    return tasks.filter((task) => task.status.toLowerCase() === "pending").length
  }, [tasks])

  const inProgressTasks = useMemo(() => {
    return tasks.filter(
      (task) => task.status.toLowerCase() === "in_progress"
    ).length
  }, [tasks])

  const completedTasks = useMemo(() => {
    return tasks.filter(
      (task) => task.status.toLowerCase() === "completed"
    ).length
  }, [tasks])

  const cancelledTasks = useMemo(() => {
    return tasks.filter(
      (task) => task.status.toLowerCase() === "cancelled"
    ).length
  }, [tasks])

  const tasksToday = useMemo(() => {
    return tasks.filter((task) => isToday(task.date)).length
  }, [tasks])

  const urgentTasks = useMemo(() => {
    return tasks.filter((task) => isOverdueOrTodayOpenTask(task))
  }, [tasks])

  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0
    return Math.round((completedTasks / tasks.length) * 100)
  }, [tasks, completedTasks])

  const filteredTasks = useMemo(() => {
    switch (activeFilter) {
      case "today":
        return tasks.filter((task) => isToday(task.date))
      case "pending":
        return tasks.filter((task) => task.status.toLowerCase() === "pending")
      case "in_progress":
        return tasks.filter(
          (task) => task.status.toLowerCase() === "in_progress"
        )
      case "completed":
        return tasks.filter((task) => task.status.toLowerCase() === "completed")
      case "cancelled":
        return tasks.filter((task) => task.status.toLowerCase() === "cancelled")
      case "urgent":
        return tasks.filter((task) => isOverdueOrTodayOpenTask(task))
      case "all":
      default:
        return tasks
    }
  }, [activeFilter, tasks])

  const recentTasks = useMemo(() => {
    if (activeFilter === "all") return tasks.slice(0, 5)
    return filteredTasks.slice(0, 5)
  }, [tasks, filteredTasks, activeFilter])

  const recentProperties = useMemo(() => {
    return properties.slice(0, 5)
  }, [properties])

  const recentPartners = useMemo(() => {
    return partners.slice(0, 5)
  }, [partners])

  const sortedUrgentTasks = useMemo(() => {
    return [...urgentTasks]
      .sort((a, b) => {
        const aDate = normalizeDateOnly(a.date)
        const bDate = normalizeDateOnly(b.date)

        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1

        return aDate.getTime() - bDate.getTime()
      })
      .slice(0, 6)
  }, [urgentTasks])

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

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
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

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-3 w-64 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
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
            {texts.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{texts.subtitle}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={texts.navigationTargetProperties}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {texts.newProperty}
          </Link>

          <Link
            href={texts.navigationTargetTasks}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {texts.newTask}
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${getFilterCardClasses(
            activeFilter === "all",
            "default"
          )}`}
        >
          <p className="text-sm font-medium text-slate-500">
            {texts.totalTasks}
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{totalTasks}</p>
          <p className="mt-2 text-xs text-slate-500">{texts.totalTasksHint}</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("today")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${getFilterCardClasses(
            activeFilter === "today",
            "blue"
          )}`}
        >
          <p className="text-sm font-medium text-slate-500">
            {texts.tasksToday}
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{tasksToday}</p>
          <p className="mt-2 text-xs text-slate-500">{texts.tasksTodayHint}</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("urgent")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${getFilterCardClasses(
            activeFilter === "urgent",
            "red"
          )}`}
        >
          <p className="text-sm font-medium text-slate-500">
            {texts.filterUrgent}
          </p>
          <p className="mt-3 text-3xl font-bold text-red-600">
            {urgentTasks.length}
          </p>
          <p className="mt-2 text-xs text-slate-500">{texts.urgentAlertsHint}</p>
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            {texts.activePartners}
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {activePartners}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {texts.activePartnersHint}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            {texts.totalProperties}
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {totalProperties}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {texts.totalPropertiesHint}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveFilter("pending")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${getFilterCardClasses(
            activeFilter === "pending",
            "amber"
          )}`}
        >
          <p className="text-sm font-medium text-slate-500">
            {texts.pendingTasks}
          </p>
          <p className="mt-3 text-3xl font-bold text-amber-600">
            {pendingTasks}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {texts.pendingTasksHint}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("in_progress")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${getFilterCardClasses(
            activeFilter === "in_progress",
            "blue"
          )}`}
        >
          <p className="text-sm font-medium text-slate-500">
            {texts.filterInProgress}
          </p>
          <p className="mt-3 text-3xl font-bold text-blue-600">
            {inProgressTasks}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {texts.filterResultsHint}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("completed")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${getFilterCardClasses(
            activeFilter === "completed",
            "green"
          )}`}
        >
          <p className="text-sm font-medium text-slate-500">
            {texts.completedTasks}
          </p>
          <p className="mt-3 text-3xl font-bold text-green-600">
            {completedTasks}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {texts.completedTasksHint}
          </p>
        </button>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-red-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {texts.urgentAlerts}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {texts.urgentAlertsHint}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveFilter("urgent")}
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              {texts.filterUrgent}
            </button>
          </div>

          <div className="p-6">
            {sortedUrgentTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  {texts.noUrgentAlerts}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {texts.noUrgentAlertsHint}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedUrgentTasks.map((task) => {
                  const taskDate = normalizeDateOnly(task.date)
                  const today = normalizeDateOnly(new Date())
                  const isOverdue =
                    !!taskDate && !!today && taskDate.getTime() < today.getTime()

                  return (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-red-100 bg-red-50/40 p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {task.title}
                            </p>
                            <span className="inline-flex rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                              {texts.urgentBadge}
                            </span>
                          </div>

                          <p className="mt-1 truncate text-sm text-slate-600">
                            {task.property?.name || texts.withoutProperty}
                          </p>

                          <p className="mt-2 text-xs text-slate-500">
                            {formatDate(task.date, texts.locale)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getTaskStatusClasses(
                              task.status
                            )}`}
                          >
                            {getTaskStatusLabel(language, task.status)}
                          </span>

                          <span className="inline-flex rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700">
                            {isOverdue ? texts.overdue : texts.dueToday}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {texts.completionRate}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {texts.completionRateHint}
              </p>
            </div>
          </div>

          <div className="p-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-4xl font-bold text-slate-900">
                {completionRate}%
              </p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-slate-500">{texts.completedTasks}</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {completedTasks}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-slate-500">{texts.filterCancelled}</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {cancelledTasks}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {texts.filterResults}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {texts.filterResultsHint}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeFilter === "all"
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterAll}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("today")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeFilter === "today"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterToday}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("pending")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeFilter === "pending"
                  ? "bg-amber-500 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterPending}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("in_progress")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeFilter === "in_progress"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterInProgress}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("completed")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeFilter === "completed"
                  ? "bg-green-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterCompleted}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("urgent")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeFilter === "urgent"
                  ? "bg-red-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterUrgent}
            </button>
          </div>
        </div>

        <div className="p-6">
          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                {texts.noFilteredTasks}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {texts.noFilteredTasksHint}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.slice(0, 8).map((task) => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {task.title}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {task.property?.name || texts.withoutProperty}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatDate(task.date, texts.locale)}
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${getTaskStatusClasses(
                        task.status
                      )}`}
                    >
                      {getTaskStatusLabel(language, task.status)}
                    </span>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <Link
                  href={texts.navigationTargetTasks}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {texts.openAlertsLink}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {texts.recentTasks}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {texts.recentTasksHint}
              </p>
            </div>

            <Link
              href={texts.navigationTargetTasks}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {texts.viewAll}
            </Link>
          </div>

          <div className="p-6">
            {recentTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  {texts.noTasks}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {texts.noTasksHint}
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
                          {task.property?.name || texts.withoutProperty}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {formatDate(task.date, texts.locale)}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${getTaskStatusClasses(
                          task.status
                        )}`}
                      >
                        {getTaskStatusLabel(language, task.status)}
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
                {texts.recentProperties}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {texts.recentPropertiesHint}
              </p>
            </div>

            <Link
              href={texts.navigationTargetProperties}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {texts.viewAll}
            </Link>
          </div>

          <div className="p-6">
            {recentProperties.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  {texts.noProperties}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {texts.noPropertiesHint}
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
                      {texts.createdAt}: {formatDate(property.createdAt, texts.locale)}
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
                {texts.recentPartners}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {texts.recentPartnersHint}
              </p>
            </div>

            <Link
              href={texts.navigationTargetPartners}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {texts.viewAll}
            </Link>
          </div>

          <div className="p-6">
            {recentPartners.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  {texts.noPartners}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {texts.noPartnersHint}
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
                        {getPartnerStatusLabel(language, partner.status)}
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