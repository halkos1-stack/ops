"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type Property = {
  id: string
  name: string
  address: string
  createdAt?: string
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

type CalendarDay = {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  key: string
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("el-GR", {
    month: "long",
    year: "numeric",
  })
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString("el-GR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function getMonthDays(currentMonth: Date): CalendarDay[] {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  const startWeekday = (firstDayOfMonth.getDay() + 6) % 7
  const daysInMonth = lastDayOfMonth.getDate()

  const today = normalizeDate(new Date())
  const days: CalendarDay[] = []

  for (let i = startWeekday; i > 0; i--) {
    const date = new Date(year, month, 1 - i)
    const normalized = normalizeDate(date)

    days.push({
      date,
      isCurrentMonth: false,
      isToday: normalized.getTime() === today.getTime(),
      key: toDateKey(date),
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const normalized = normalizeDate(date)

    days.push({
      date,
      isCurrentMonth: true,
      isToday: normalized.getTime() === today.getTime(),
      key: toDateKey(date),
    })
  }

  while (days.length % 7 !== 0) {
    const nextDay = days.length - (startWeekday + daysInMonth) + 1
    const date = new Date(year, month + 1, nextDay)
    const normalized = normalizeDate(date)

    days.push({
      date,
      isCurrentMonth: false,
      isToday: normalized.getTime() === today.getTime(),
      key: toDateKey(date),
    })
  }

  return days
}

function getTaskStatusClasses(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
      return "border-green-200 bg-green-100 text-green-700"
    case "in_progress":
      return "border-blue-200 bg-blue-100 text-blue-700"
    case "pending":
      return "border-amber-200 bg-amber-100 text-amber-700"
    case "cancelled":
      return "border-red-200 bg-red-100 text-red-700"
    default:
      return "border-slate-200 bg-slate-100 text-slate-700"
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

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const [selectedDate, setSelectedDate] = useState(() => normalizeDate(new Date()))

  async function loadTasks() {
    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/tasks", {
        cache: "no-store",
      })

      if (!res.ok) {
        throw new Error("Αποτυχία φόρτωσης εργασιών")
      }

      const data = await res.json()
      setTasks(data)
    } catch (err) {
      console.error("Load calendar tasks error:", err)
      setError("Δεν ήταν δυνατή η φόρτωση του ημερολογίου.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const calendarDays = useMemo(() => {
    return getMonthDays(currentMonth)
  }, [currentMonth])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()

    for (const task of tasks) {
      const taskDate = normalizeDate(new Date(task.date))
      const key = toDateKey(taskDate)

      if (!map.has(key)) {
        map.set(key, [])
      }

      map.get(key)!.push(task)
    }

    for (const [, value] of map) {
      value.sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      })
    }

    return map
  }, [tasks])

  const selectedDateKey = toDateKey(selectedDate)

  const selectedDateTasks = useMemo(() => {
    return tasksByDate.get(selectedDateKey) || []
  }, [tasksByDate, selectedDateKey])

  const monthTaskCount = useMemo(() => {
    return tasks.filter((task) => {
      const date = new Date(task.date)
      return (
        date.getFullYear() === currentMonth.getFullYear() &&
        date.getMonth() === currentMonth.getMonth()
      )
    }).length
  }, [tasks, currentMonth])

  const todayTaskCount = useMemo(() => {
    const todayKey = toDateKey(normalizeDate(new Date()))
    return (tasksByDate.get(todayKey) || []).length
  }, [tasksByDate])

  const pendingTaskCount = useMemo(() => {
    return tasks.filter((task) => task.status.toLowerCase() === "pending").length
  }, [tasks])

  const upcomingTasks = useMemo(() => {
    const today = normalizeDate(new Date()).getTime()

    return [...tasks]
      .filter((task) => normalizeDate(new Date(task.date)).getTime() >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6)
  }, [tasks])

  function goToPreviousMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    )
  }

  function goToNextMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    )
  }

  function goToToday() {
    const today = normalizeDate(new Date())
    setSelectedDate(today)
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <section>
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-96 animate-pulse rounded bg-slate-200" />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 h-8 w-16 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-3 w-32 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
            <div className="mt-6 grid grid-cols-7 gap-3">
              {Array.from({ length: 35 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-6 space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-100 p-4">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Ημερολόγιο
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Μηνιαία προβολή εργασιών και καθημερινή επιχειρησιακή εικόνα.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={goToToday}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Σήμερα
          </button>

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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Εργασίες μήνα
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {monthTaskCount}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Όλες οι εργασίες του επιλεγμένου μήνα
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Εργασίες σήμερα
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {todayTaskCount}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Καταχωρήσεις για τη σημερινή ημέρα
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Σε αναμονή
          </p>
          <p className="mt-3 text-3xl font-bold text-amber-600">
            {pendingTaskCount}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Εργασίες που περιμένουν εκτέλεση
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 capitalize">
                {formatMonthYear(currentMonth)}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Μηνιαία προβολή όλων των εργασιών
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Προηγούμενος
              </button>

              <button
                type="button"
                onClick={goToNextMonth}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Επόμενος
              </button>
            </div>
          </div>

          <div className="p-4 md:p-6">
            <div className="mb-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              <div>Δευ</div>
              <div>Τρι</div>
              <div>Τετ</div>
              <div>Πεμ</div>
              <div>Παρ</div>
              <div>Σαβ</div>
              <div>Κυρ</div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const dayTasks = tasksByDate.get(day.key) || []
                const isSelected = day.key === selectedDateKey

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDate(normalizeDate(day.date))}
                    className={[
                      "min-h-[120px] rounded-2xl border p-2 text-left transition md:p-3",
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={[
                          "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                          day.isToday
                            ? "bg-slate-900 text-white"
                            : day.isCurrentMonth
                            ? "text-slate-900"
                            : "text-slate-400",
                        ].join(" ")}
                      >
                        {day.date.getDate()}
                      </span>

                      {dayTasks.length > 0 && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className={[
                            "truncate rounded-lg border px-2 py-1 text-[11px] font-medium",
                            getTaskStatusClasses(task.status),
                          ].join(" ")}
                        >
                          {task.title}
                        </div>
                      ))}

                      {dayTasks.length > 3 && (
                        <div className="text-[11px] font-medium text-slate-500">
                          +{dayTasks.length - 3} ακόμη
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Επιλεγμένη ημέρα
              </h2>
              <p className="mt-1 text-sm text-slate-500 capitalize">
                {formatLongDate(selectedDate)}
              </p>
            </div>

            <div className="p-6">
              {selectedDateTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    Δεν υπάρχουν εργασίες
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Δεν έχει προγραμματιστεί εργασία για την επιλεγμένη ημέρα.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {task.title}
                            </p>
                            <p className="mt-1 truncate text-sm text-slate-500">
                              {task.property?.name || "Χωρίς ακίνητο"}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {task.property?.address || "Χωρίς διεύθυνση"}
                            </p>
                          </div>

                          <span
                            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getTaskStatusClasses(
                              task.status
                            )}`}
                          >
                            {getTaskStatusLabel(task.status)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-slate-500">
                            Ημερομηνία:{" "}
                            {new Date(task.date).toLocaleDateString("el-GR")}
                          </p>

                          <Link
                            href="/tasks"
                            className="text-xs font-medium text-blue-600 hover:text-blue-700"
                          >
                            Προβολή εργασιών
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Επόμενες εργασίες
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Οι πιο κοντινές προγραμματισμένες εργασίες
              </p>
            </div>

            <div className="p-6">
              {upcomingTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    Δεν υπάρχουν επερχόμενες εργασίες
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Δημιούργησε νέες εργασίες για να εμφανιστούν εδώ.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {task.title}
                            </p>
                            <p className="mt-1 truncate text-sm text-slate-500">
                              {task.property?.name || "Χωρίς ακίνητο"}
                            </p>
                          </div>

                          <span
                            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getTaskStatusClasses(
                              task.status
                            )}`}
                          >
                            {getTaskStatusLabel(task.status)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500">
                          {new Date(task.date).toLocaleDateString("el-GR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}