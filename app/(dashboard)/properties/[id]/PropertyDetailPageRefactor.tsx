"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { getPropertyStatusLabel, getPropertyTypeLabel, getTaskStatusLabel } from "@/lib/i18n/labels"
import PropertyDayView from "./PropertyDayView"
import {
  buildPropertyPageDayStatusFromCanonical,
  type PropertyPageDayStatusIssue,
  type PropertyPageDayStatusResult,
  type PropertyPageDayStatusSupply,
  type PropertyPageDayStatusTask,
} from "@/lib/properties/property-day-status"

type PropertyBookingLite = {
  id: string
  guestName?: string | null
  checkInDate?: string | null
  checkOutDate?: string | null
  status?: string | null
  checkInTime?: string | null
  checkOutTime?: string | null
  sourcePlatform?: string | null
  hasTask?: boolean
  taskCount?: number
}

type PropertyIssueLite = {
  id: string
  issueType?: string | null
  title: string
  description?: string | null
  severity?: string | null
  status?: string | null
  locationText?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

type PropertySupplyLite = {
  id: string
  currentStock?: number | null
  derivedState?: string | null
  isCritical?: boolean | null
  updatedAt?: string | null
  lastUpdatedAt?: string | null
  supplyItem?: {
    code?: string | null
    name?: string | null
    nameEl?: string | null
    nameEn?: string | null
    category?: string | null
    unit?: string | null
  } | null
}

type PropertyTaskLite = {
  id: string
  title: string
  taskType?: string | null
  source?: string | null
  status?: string | null
  scheduledDate?: string | null
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  completedAt?: string | null
  bookingId?: string | null
  alertEnabled?: boolean | null
  alertAt?: string | null
  assignments?: Array<{
    id: string
    status?: string | null
    assignedAt?: string | null
    acceptedAt?: string | null
    rejectedAt?: string | null
    partner?: {
      id: string
      name: string
    } | null
  }>
}

type PropertyDetail = {
  id: string
  code: string
  name: string
  address?: string | null
  city?: string | null
  region?: string | null
  postalCode?: string | null
  country?: string | null
  type?: string | null
  status?: string | null
  updatedAt?: string | null
  openBlockingConditionCount?: number | null
  operationalStatus?: string | null
  operationalStatusReason?: { el: string; en: string } | null
  operationalStatusExplanation?: { el: string; en: string } | null
  operationalAlertActive?: boolean | null
  operationalAlertTask?: {
    id: string
    title: string
    alertAt?: string | null
  } | null
  operationalActiveBooking?: {
    id: string
    guestName?: string | null
    checkInDate?: string | null
    checkOutDate?: string | null
  } | null
  operationalRelevantTask?: {
    id: string
    title: string
    status?: string | null
    scheduledDate?: string | null
    latestAssignmentStatus?: string | null
  } | null
  readinessStatus?: string | null
  bookings?: PropertyBookingLite[]
  tasks?: PropertyTaskLite[]
  issues?: PropertyIssueLite[]
  propertySupplies?: PropertySupplyLite[]
}

type PropertyViewTab = "day" | "bookings" | "tasks" | "supplies" | "damages" | "issues"

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

function formatDateTime(value: string | Date | null | undefined, locale: string) {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getSupplyDisplayName(supply: PropertySupplyLite, language: "el" | "en") {
  const item = supply.supplyItem
  if (!item) return "—"
  if (language === "en") return item.nameEn || item.name || item.nameEl || item.code || "—"
  return item.nameEl || item.name || item.nameEn || item.code || "—"
}

function isDamageIssue(issue: PropertyIssueLite) {
  const value = normalizeText(issue.issueType)
  return value.includes("damage") || value.includes("ζημια")
}

function mapTaskToDayStatusTask(task: PropertyTaskLite): PropertyPageDayStatusTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status || null,
    taskType: task.taskType || null,
    source: task.source || null,
    scheduledDate: task.scheduledDate || null,
    scheduledStartTime: task.scheduledStartTime || null,
    scheduledEndTime: task.scheduledEndTime || null,
    completedAt: task.completedAt || null,
    bookingId: task.bookingId || null,
    alertEnabled: task.alertEnabled ?? false,
    alertAt: task.alertAt || null,
    latestAssignmentStatus: safeArray(task.assignments)[0]?.status || null,
  }
}

function mapIssueToDayStatusIssue(issue: PropertyIssueLite): PropertyPageDayStatusIssue {
  return {
    id: issue.id,
    title: issue.title,
    status: issue.status || null,
    severity: issue.severity || null,
    issueType: issue.issueType || null,
  }
}

function mapSupplyToDayStatusSupply(
  supply: PropertySupplyLite,
  language: "el" | "en"
): PropertyPageDayStatusSupply {
  return {
    id: supply.id,
    displayName: getSupplyDisplayName(supply, language),
    derivedState: supply.derivedState || null,
    isCritical: supply.isCritical ?? false,
  }
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
      {text}
    </div>
  )
}

function BookingsView({ bookings, locale }: { bookings: PropertyBookingLite[]; locale: string }) {
  if (!bookings.length) return <EmptyState text="Δεν υπάρχουν κρατήσεις για αυτό το ακίνητο." />

  return (
    <div className="grid gap-4">
      {bookings.map((booking) => (
        <div key={booking.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{booking.guestName || "Χωρίς όνομα"}</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              {booking.status || "—"}
            </span>
            {booking.hasTask || Number(booking.taskCount || 0) > 0 ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                Υπάρχει εργασία
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                Χωρίς εργασία
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Check-in</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(booking.checkInDate, locale)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Check-out</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(booking.checkOutDate, locale)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Πλατφόρμα</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{booking.sourcePlatform || "—"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Εργασίες</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{String(booking.taskCount || 0)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TasksView({ tasks, locale, language }: { tasks: PropertyTaskLite[]; locale: string; language: "el" | "en" }) {
  if (!tasks.length) return <EmptyState text="Δεν υπάρχουν εργασίες για αυτό το ακίνητο." />

  return (
    <div className="grid gap-4">
      {tasks.map((task) => {
        const latestAssignment = safeArray(task.assignments)[0] || null
        return (
          <div key={task.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/tasks/${task.id}`} className="text-base font-semibold text-slate-900 underline-offset-4 hover:underline">
                {task.title}
              </Link>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {getTaskStatusLabel(language, task.status)}
              </span>
              {task.source ? (
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  {task.source === "booking" ? "Από κράτηση" : "Χειροκίνητη"}
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ημερομηνία</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(task.scheduledDate, locale)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ανάθεση</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{latestAssignment?.status || "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Συνεργάτης</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{latestAssignment?.partner?.name || "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ολοκλήρωση</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(task.completedAt, locale)}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SuppliesView({ supplies, language, locale }: { supplies: PropertySupplyLite[]; language: "el" | "en"; locale: string }) {
  if (!supplies.length) return <EmptyState text="Δεν υπάρχουν αναλώσιμα για αυτό το ακίνητο." />

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {supplies.map((supply) => (
        <div key={supply.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{getSupplyDisplayName(supply, language)}</h3>
              <p className="mt-1 text-sm text-slate-500">{supply.supplyItem?.code || "—"}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
              supply.derivedState === "missing"
                ? "bg-red-50 text-red-700 ring-red-200"
                : supply.derivedState === "medium"
                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                  : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}>
              {supply.derivedState === "missing" ? "Έλλειψη" : supply.derivedState === "medium" ? "Μέτρια" : "Πλήρης"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Τρέχουσα ποσότητα</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{String(supply.currentStock ?? "—")}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Τελευταία ενημέρωση</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(supply.lastUpdatedAt || supply.updatedAt, locale)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function IssuesView({ items, locale }: { items: PropertyIssueLite[]; locale: string }) {
  if (!items.length) return <EmptyState text="Δεν υπάρχουν στοιχεία για αυτή την ενότητα." />

  return (
    <div className="grid gap-4">
      {items.map((issue) => (
        <div key={issue.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{issue.title}</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              {issue.status || "—"}
            </span>
            {issue.severity ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                {issue.severity}
              </span>
            ) : null}
          </div>

          {issue.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{issue.description}</p> : null}

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Τοποθεσία</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{issue.locationText || "—"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Καταγράφηκε</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(issue.createdAt, locale)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Τελευταία ενημέρωση</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(issue.updatedAt, locale)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PropertyDetailPageRefactor() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { language } = useAppLanguage()
  const locale = language === "en" ? "en-GB" : "el-GR"

  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<PropertyViewTab>("day")

  const loadPage = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const propertyRes = await fetch(`/api/properties/${id}`, { cache: "no-store" })
      const propertyJson = await propertyRes.json().catch(() => null)

      if (!propertyRes.ok) {
        throw new Error(propertyJson?.error || "Δεν ήταν δυνατή η φόρτωση του ακινήτου.")
      }

      const normalizedProperty = (propertyJson?.property ?? propertyJson?.data ?? propertyJson) as PropertyDetail
      setProperty(normalizedProperty)
    } catch (err) {
      console.error("Load property detail refactor error:", err)
      setError(err instanceof Error ? err.message : "Δεν ήταν δυνατή η φόρτωση του ακινήτου.")
      setProperty(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  const bookings = useMemo(() => safeArray(property?.bookings), [property])
  const tasks = useMemo(() => safeArray(property?.tasks), [property])
  const issues = useMemo(() => safeArray(property?.issues), [property])
  const supplies = useMemo(() => safeArray(property?.propertySupplies), [property])

  const dayStatus: PropertyPageDayStatusResult | null = useMemo(() => {
    if (!property) return null

    return buildPropertyPageDayStatusFromCanonical({
      operationalStatus: property.operationalStatus,
      operationalReason: property.operationalStatusReason ?? null,
      operationalExplanation: property.operationalStatusExplanation ?? null,
      operationalRelevantTask: property.operationalRelevantTask ?? null,
      operationalActiveBooking: property.operationalActiveBooking ?? null,
      operationalAlertActive: property.operationalAlertActive ?? false,
      operationalAlertTask: property.operationalAlertTask ?? null,
      readinessStatus: property.readinessStatus,
      bookings,
      tasks: tasks.map(mapTaskToDayStatusTask),
      issues: issues.map(mapIssueToDayStatusIssue),
      supplies: supplies.map((item) => mapSupplyToDayStatusSupply(item, language)),
      blockingConditionCount: property.openBlockingConditionCount || 0,
    })
  }, [property, bookings, tasks, issues, supplies, language])

  const damages = useMemo(() => issues.filter((issue) => isDamageIssue(issue)), [issues])
  const technicalIssues = useMemo(() => issues.filter((issue) => !isDamageIssue(issue)), [issues])

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">Φόρτωση ακινήτου...</div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Δεν ήταν δυνατή η φόρτωση του ακινήτου.</h1>
        <p className="mt-2 text-sm text-red-600">{error || "Δεν επιστράφηκαν δεδομένα ακινήτου."}</p>
        <div className="mt-4">
          <Link href="/properties" className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Επιστροφή στα ακίνητα</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <Link href="/properties" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <span>←</span>
            <span>Επιστροφή στα ακίνητα</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{property.name}</h1>
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {getPropertyStatusLabel(language, property.status)}
          </span>
          <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {getPropertyTypeLabel(language, property.type)}
          </span>
        </div>

        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          {[property.address, property.city, property.region, property.postalCode, property.country].filter(Boolean).join(", ")}
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === "day"} label="Κατάσταση ημέρας" onClick={() => setTab("day")} />
          <TabButton active={tab === "bookings"} label="Κρατήσεις ακινήτου" onClick={() => setTab("bookings")} />
          <TabButton active={tab === "tasks"} label="Εργασίες ακινήτου" onClick={() => setTab("tasks")} />
          <TabButton active={tab === "supplies"} label="Αναλώσιμα" onClick={() => setTab("supplies")} />
          <TabButton active={tab === "damages"} label="Ζημιές" onClick={() => setTab("damages")} />
          <TabButton active={tab === "issues"} label="Βλάβες" onClick={() => setTab("issues")} />
        </div>
      </section>

      {tab === "day" && dayStatus ? (
        <PropertyDayView
          propertyId={property.id}
          propertyName={property.name}
          language={language}
          dayStatus={dayStatus}
          bookingsHref={`/bookings?propertyId=${property.id}`}
          tasksHref={`/tasks?propertyId=${property.id}`}
          createManualTaskHref={`/properties/${property.id}/tasks`}
          createBookingTaskHref={`/bookings?propertyId=${property.id}&filter=withoutTasks`}
        />
      ) : null}

      {tab === "bookings" ? <BookingsView bookings={bookings} locale={locale} /> : null}
      {tab === "tasks" ? <TasksView tasks={tasks} locale={locale} language={language} /> : null}
      {tab === "supplies" ? <SuppliesView supplies={supplies} language={language} locale={locale} /> : null}
      {tab === "damages" ? <IssuesView items={damages} locale={locale} /> : null}
      {tab === "issues" ? <IssuesView items={technicalIssues} locale={locale} /> : null}
    </div>
  )
}
