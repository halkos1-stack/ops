
"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import {
  TASK_TITLE_OPTIONS,
  addDays,
  addMonths,
  buildIssueTooltip,
  buildOccupancyTooltip,
  buildPropertyCalendarCounters,
  buildPropertyDayEntries,
  buildPropertyFormState,
  buildPropertyHourRows,
  buildSupplyRows,
  buildSupplyTooltip,
  buildTaskTooltip,
  buildVisibleDates,
  formatDateTime,
  formatFullDate,
  formatMonthTitle,
  formatShortDate,
  formatTime,
  getBookingDayKind,
  getBookingDayLabel,
  getCalendarEntryAttentionState,
  getCalendarFilterVisibility,
  getIssueStatusLabel,
  getIssuesTone,
  getLatestAssignment,
  getOccupancyTone,
  getSupplyStateLabel,
  getSuppliesTone,
  getTaskStatusLabel,
  getTaskTitleOptions,
  getTaskTone,
  getToneClasses,
  normalizeDateOnly,
  selectEntryIssueRecords,
  selectEntrySupplyRows,
  selectPropertyDayEntry,
  selectPropertyOpenIssues,
  toDateTimeLocalValue,
  translations,
  type CalendarFilter,
  type CalendarGranularity,
  type DayEntry,
  type Language,
  type PropertyDetail,
  type PropertyFormState,
  type PropertyIssueLite,
  type PropertyTaskLite,
  type SupplyRow,
  type TaskModalState,
  type TaskTitleKey,
  type Tone,
  type WorkWindow,
} from "@/lib/properties/property-detail-display"
import {
  buildWorkWindows,
  safeArray,
  startOfDay,
} from "@/lib/properties/property-detail-helpers"

type ViewMode = "calendar" | "management"

type PartnerOption = {
  id: string
  code: string
  name: string
  email?: string | null
  phone?: string | null
  specialty?: string | null
  status?: string | null
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function CalendarFilterButton({
  icon,
  label,
  count,
  active,
  tone,
  onClick,
}: {
  icon: ReactNode
  label: string
  count: number
  active: boolean
  tone: Tone
  onClick: () => void
}) {
  const classes = getToneClasses(tone)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition hover:scale-[1.02]",
        active
          ? cn(classes.soft, "ring-2 ring-current/30 shadow-sm")
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      )}
    >
      <span className={cn("flex h-5 w-5 items-center justify-center", active ? "" : "opacity-50")}>
        {icon}
      </span>
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
          active ? "bg-current/10 text-current" : "bg-slate-100 text-slate-500"
        )}
      >
        {count}
      </span>
    </button>
  )
}

function BedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7v13M21 7v13" />
      <path d="M3 13h18" />
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2" />
      <rect x="7" y="7" width="4" height="3" rx="0.5" />
    </svg>
  )
}

function BroomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

function SupplyBarsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="20" x2="4" y2="14" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="20" y1="20" x2="20" y2="4" />
    </svg>
  )
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
    </svg>
  )
}

function ModalShell({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function ViewSwitchButton({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={hint}
      onClick={onClick}
      className={cn(
        "rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      )}
    >
      {label}
    </button>
  )
}

function CalendarModeButton({
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
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      )}
    >
      {label}
    </button>
  )
}

function ManagementCard({
  title,
  hint,
  action,
}: {
  title: string
  hint: string
  action: ReactNode
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-500">{hint}</div>
      <div className="mt-4">{action}</div>
    </div>
  )
}
function CalendarCell({
  entry,
  granularity,
  language,
  locale,
  activeFilter,
  allSupplyRows,
  allOpenIssues,
  onOpenDay,
  onOpenIssues,
  onOpenSupplies,
}: {
  entry: DayEntry
  granularity: CalendarGranularity
  language: Language
  locale: string
  activeFilter: CalendarFilter
  allSupplyRows: SupplyRow[]
  allOpenIssues: PropertyIssueLite[]
  onOpenDay: () => void
  onOpenIssues: () => void
  onOpenSupplies: () => void
}) {
  const router = useRouter()
  const t = translations[language]
  const isCompact = granularity === "month"
  const { showBookings, showTasks, showSupplies, showIssues } =
    getCalendarFilterVisibility(activeFilter)

  const slotBase = "min-h-[22px] w-full"
  const barBase =
    "flex h-[22px] w-full items-center gap-1.5 rounded-lg px-2 text-xs font-medium cursor-pointer select-none transition hover:opacity-80"

  const arrivalAttention = getCalendarEntryAttentionState({
    entry,
    language,
    allSupplyRows,
    allPropertyIssues: allOpenIssues,
  })
  const arrivalNeedsAttention = arrivalAttention.needsAttention
  const arrivalAttentionReasons = arrivalAttention.reasons
  return (
    <button
      type="button"
      onClick={onOpenDay}
      title={arrivalNeedsAttention ? arrivalAttentionReasons.join(" · ") : undefined}
      className={cn(
        "flex flex-col rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
        arrivalNeedsAttention
          ? "border-red-300 bg-red-50"
          : entry.isCurrentMonth || granularity !== "month"
            ? "border-slate-200 bg-white"
            : "border-slate-100 bg-slate-50/70",
        entry.isToday && "ring-2 ring-slate-900/10"
      )}
    >
      {/* Αριθμός ημέρας */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-sm font-semibold",
            entry.isCurrentMonth || granularity !== "month"
              ? "text-slate-900"
              : "text-slate-400"
          )}
        >
          {entry.date.getDate()}
        </span>
        {entry.isToday ? (
          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
            {t.today}
          </span>
        ) : null}
      </div>

      {/* 4 fixed slots — σταθερή θέση ανεξάρτητα από περιεχόμενο */}
      <div className="mt-2 flex flex-1 flex-col gap-1">

        {/* Slot 1: Κρατήσεις (🛏) */}
        <div className={slotBase}>
          {showBookings && entry.activeBookings.length > 0
            ? entry.activeBookings.slice(0, 1).map((booking) => {
                const kind = getBookingDayKind(booking, entry.key)
                const classes = getToneClasses(getOccupancyTone(kind))
                const label = getBookingDayLabel(t, kind)
                return (
                  <div
                    key={booking.id}
                    title={buildOccupancyTooltip(language, locale, kind, [booking])}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); router.push(`/bookings/${booking.id}`) }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); router.push(`/bookings/${booking.id}`) } }}
                    className={cn(barBase, classes.soft)}
                  >
                    <BedIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate font-semibold">{label}</span>
                    {!isCompact && booking.guestName ? (
                      <span className="ml-auto truncate opacity-60">{booking.guestName}</span>
                    ) : null}
                  </div>
                )
              })
            : (
              <div title={t.filterBookings} className="flex h-[22px] w-full items-center rounded-lg px-1.5 text-slate-400 opacity-20 transition hover:opacity-100 hover:text-sky-500 hover:bg-sky-50">
                <BedIcon className="h-3 w-3" />
              </div>
            )
          }
        </div>

        {/* Slot 2: Εργασία (🧹) — μόνο την ημέρα scheduledDate */}
        <div className={slotBase}>
          {showTasks && entry.taskForCalendar ? (
            <div
              title={buildTaskTooltip(language, locale, entry.taskForCalendar)}
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); router.push(`/tasks/${entry.taskForCalendar!.id}`) }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); router.push(`/tasks/${entry.taskForCalendar!.id}`) } }}
              className={cn(barBase, getToneClasses(getTaskTone(entry.taskForCalendar)).soft)}
            >
              <BroomIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{getTaskStatusLabel(language, entry.taskForCalendar.status)}</span>
            </div>
          ) : (
            <div title={t.filterTasks} className="flex h-[22px] w-full items-center rounded-lg px-1.5 text-slate-400 opacity-20 transition hover:opacity-100 hover:text-amber-500 hover:bg-amber-50">
              <BroomIcon className="h-3 w-3" />
            </div>
          )}
        </div>

        {/* Slot 3: Αναλώσιμα (📊) — χρώμα: κόκκινο/κίτρινο/πράσινο */}
        <div className={slotBase}>
          {showSupplies && entry.supplyRecords.length > 0 ? (
            <div
              title={buildSupplyTooltip(language, entry.supplyRecords)}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                if (entry.taskForCalendar) { router.push(`/tasks/${entry.taskForCalendar.id}`) }
                else { onOpenSupplies() }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation()
                  if (entry.taskForCalendar) { router.push(`/tasks/${entry.taskForCalendar.id}`) }
                  else { onOpenSupplies() }
                }
              }}
              className={cn(barBase, getToneClasses(getSuppliesTone(entry.supplyRecords)).soft)}
            >
              <SupplyBarsIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{t.supplies}: {entry.supplyRecords.length}</span>
            </div>
          ) : (
            <div title={t.filterSupplies} className="flex h-[22px] w-full items-center rounded-lg px-1.5 text-slate-400 opacity-20 transition hover:opacity-100 hover:text-emerald-500 hover:bg-emerald-50">
              <SupplyBarsIcon className="h-3 w-3" />
            </div>
          )}
        </div>

        {/* Slot 4: Ζημιές / Βλάβες (🔧) */}
        <div className={slotBase}>
          {showIssues && entry.issueRecords.length > 0 ? (
            <div
              title={buildIssueTooltip(language, entry.issueRecords)}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                if (entry.taskForCalendar) { router.push(`/tasks/${entry.taskForCalendar.id}`) }
                else { onOpenIssues() }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation()
                  if (entry.taskForCalendar) { router.push(`/tasks/${entry.taskForCalendar.id}`) }
                  else { onOpenIssues() }
                }
              }}
              className={cn(barBase, getToneClasses(getIssuesTone(entry.issueRecords)).soft)}
            >
              <WrenchIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{t.issues}: {entry.issueRecords.length}</span>
            </div>
          ) : (
            <div title={t.filterIssues} className="flex h-[22px] w-full items-center rounded-lg px-1.5 text-slate-400 opacity-20 transition hover:opacity-100 hover:text-red-500 hover:bg-red-50">
              <WrenchIcon className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>

      {/* Κουμπί προβολής ημέρας */}
      <div className="mt-2 flex items-center justify-end gap-1 border-t border-slate-100 pt-1.5">
        <span className="text-[10px] font-semibold text-slate-400">{t.viewDay}</span>
        <span className="text-[10px] text-slate-300">→</span>
      </div>
    </button>
  )
}

function DayListCard({
  title,
  emptyText,
  children,
}: {
  title: string
  emptyText: string
  children: ReactNode
}) {
  const isEmpty = Array.isArray(children) && children.length === 0

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 text-sm font-semibold text-slate-900">{title}</div>
      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </div>
  )
}

export default function PropertyDetailPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { language } = useAppLanguage()
  const locale = language === "en" ? "en-GB" : "el-GR"
  const t = translations[language]
  const taskTitleOptions = getTaskTitleOptions(language)

  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<ViewMode>("calendar")
  const [granularity, setGranularity] = useState<CalendarGranularity>("week")
  const [anchorDate, setAnchorDate] = useState<Date>(startOfDay(new Date()))

  const [propertyModalOpen, setPropertyModalOpen] = useState(false)
  const [partnerModalOpen, setPartnerModalOpen] = useState(false)
  const [taskModal, setTaskModal] = useState<TaskModalState | null>(null)
  const [issuesModalOpen, setIssuesModalOpen] = useState(false)
  const [suppliesModalOpen, setSuppliesModalOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<CalendarFilter>(null)

  const [propertyForm, setPropertyForm] = useState<PropertyFormState | null>(null)
  const [selectedPartnerId, setSelectedPartnerId] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const [propertyRes, partnersRes] = await Promise.allSettled([
        fetch(`/api/properties/${id}`, { cache: "no-store" }),
        fetch("/api/partners", { cache: "no-store" }),
      ])

      if (propertyRes.status !== "fulfilled") {
        throw new Error(t.loadError)
      }

      const propertyJson = await propertyRes.value.json().catch(() => null)
      if (!propertyRes.value.ok) {
        throw new Error(propertyJson?.error || t.loadError)
      }

      const nextProperty = (propertyJson?.property ?? propertyJson?.data ?? propertyJson) as PropertyDetail
      setProperty(nextProperty)
      setPropertyForm(buildPropertyFormState(nextProperty))
      setSelectedPartnerId(String(nextProperty.defaultPartnerId || ""))

      if (partnersRes.status === "fulfilled") {
        const partnersJson = await partnersRes.value.json().catch(() => null)
        const nextPartners = Array.isArray(partnersJson)
          ? partnersJson
          : Array.isArray(partnersJson?.partners)
            ? partnersJson.partners
            : Array.isArray(partnersJson?.data)
              ? partnersJson.data
              : []
        setPartners(nextPartners as PartnerOption[])
      } else {
        setPartners([])
      }
    } catch (err) {
      console.error("Property page load error:", err)
      setError(err instanceof Error ? err.message : t.loadError)
      setProperty(null)
      setPartners([])
    } finally {
      setLoading(false)
    }
  }, [id, t.loadError])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const supplyRows = useMemo(() => buildSupplyRows(language, property), [language, property])

  const workWindows = useMemo(() => {
    return buildWorkWindows(safeArray(property?.bookings), safeArray(property?.tasks))
  }, [property?.bookings, property?.tasks])

  const visibleDates = useMemo(
    () => buildVisibleDates(anchorDate, granularity),
    [anchorDate, granularity]
  )

  const openIssues = useMemo(() => selectPropertyOpenIssues(property), [property])

  const dayEntries = useMemo(
    () =>
      buildPropertyDayEntries({
        property,
        anchorDate,
        visibleDates,
        supplyRows,
        workWindows,
      }),
    [property, anchorDate, visibleDates, supplyRows, workWindows]
  )

  const calendarCounters = useMemo(
    () => buildPropertyCalendarCounters(dayEntries),
    [dayEntries]
  )

  const selectedEntry = useMemo(
    () =>
      selectPropertyDayEntry({
        property,
        dayEntries,
        anchorDate,
        supplyRows,
        workWindows,
      }),
    [property, dayEntries, anchorDate, supplyRows, workWindows]
  )

  const selectedIssueRecords = useMemo(
    () => selectEntryIssueRecords(selectedEntry),
    [selectedEntry]
  )

  const selectedSupplyRows = useMemo(
    () => selectEntrySupplyRows(selectedEntry),
    [selectedEntry]
  )

  const hourRows = useMemo(
    () => buildPropertyHourRows(selectedEntry),
    [selectedEntry]
  )

  function moveRange(direction: "prev" | "next") {
    if (granularity === "month") {
      setAnchorDate((prev) => addMonths(prev, direction === "prev" ? -1 : 1))
      return
    }

    if (granularity === "week") {
      setAnchorDate((prev) => addDays(prev, direction === "prev" ? -7 : 7))
      return
    }

    setAnchorDate((prev) => addDays(prev, direction === "prev" ? -1 : 1))
  }

  function openCreateTaskModal(window: WorkWindow) {
    const selectedDate =
      normalizeDateOnly(anchorDate) ||
      normalizeDateOnly(window.startAt) ||
      ""

    const defaultStart = normalizeDateOnly(window.startAt) === selectedDate
      ? `${String(window.startAt.getHours()).padStart(2, "0")}:${String(
          window.startAt.getMinutes()
        ).padStart(2, "0")}`
      : ""

    setTaskModal({
      mode: "create",
      workWindowKey: window.key,
      titleKey: "cleaning",
      scheduledDate: selectedDate,
      scheduledStartTime: defaultStart,
      scheduledEndTime: "",
      alertEnabled: false,
      alertAt: "",
      notes: "",
    })
  }

  function openEditTaskModal(window: WorkWindow, task: PropertyTaskLite) {
    const normalizedType = String(task.taskType || "").trim().toLowerCase()
    const titleKey = TASK_TITLE_OPTIONS.includes(normalizedType as TaskTitleKey)
      ? (normalizedType as TaskTitleKey)
      : "cleaning"

    setTaskModal({
      mode: "edit",
      taskId: task.id,
      workWindowKey: window.key,
      titleKey,
      scheduledDate:
        normalizeDateOnly(task.scheduledDate) ||
        normalizeDateOnly(anchorDate) ||
        "",
      scheduledStartTime: task.scheduledStartTime || "",
      scheduledEndTime: task.scheduledEndTime || "",
      alertEnabled: Boolean(task.alertEnabled),
      alertAt: task.alertAt ? toDateTimeLocalValue(new Date(task.alertAt)) : "",
      notes: task.notes || "",
    })
  }

  async function savePropertyChanges(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!property || !propertyForm) return

    try {
      setSaving(true)
      setMessage(null)

      const response = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: propertyForm.code.trim(),
          name: propertyForm.name.trim(),
          address: propertyForm.address.trim(),
          city: propertyForm.city.trim(),
          region: propertyForm.region.trim(),
          postalCode: propertyForm.postalCode.trim(),
          country: propertyForm.country.trim(),
          type: propertyForm.type.trim(),
          status: propertyForm.status.trim(),
          notes: propertyForm.notes.trim() || null,
        }),
      })

      const json = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(json?.error || t.saveError)
      }

      setMessage(t.propertySaved)
      await loadData()
      setPropertyModalOpen(false)
    } catch (err) {
      console.error("Save property error:", err)
      setMessage(err instanceof Error ? err.message : t.saveError)
    } finally {
      setSaving(false)
    }
  }

  async function savePartnerChanges(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!property) return

    try {
      setSaving(true)
      setMessage(null)

      const response = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultPartnerId: selectedPartnerId || null }),
      })

      const json = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(json?.error || t.saveError)
      }

      setMessage(t.partnerSaved)
      await loadData()
      setPartnerModalOpen(false)
    } catch (err) {
      console.error("Save partner error:", err)
      setMessage(err instanceof Error ? err.message : t.saveError)
    } finally {
      setSaving(false)
    }
  }

  async function saveTaskChanges(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!property || !taskModal) return

    try {
      setSaving(true)
      setMessage(null)

      const targetWindow =
        workWindows.find((window) => window.key === taskModal.workWindowKey) || null
      const title = taskTitleOptions[taskModal.titleKey]

      const payload = {
        propertyId: property.id,
        bookingId: targetWindow?.booking.id || null,
        source: targetWindow?.booking.id ? "booking" : "manual",
        title,
        taskType: taskModal.titleKey,
        priority: "normal",
        scheduledDate: taskModal.scheduledDate,
        scheduledStartTime: taskModal.scheduledStartTime || null,
        scheduledEndTime: taskModal.scheduledEndTime || null,
        alertEnabled: taskModal.alertEnabled,
        alertAt: taskModal.alertEnabled ? taskModal.alertAt || null : null,
        notes: taskModal.notes.trim() || null,
        description: null,
        requiresPhotos: false,
        requiresChecklist: false,
        requiresApproval: false,
        sendCleaningChecklist: false,
        sendSuppliesChecklist: false,
        sendIssuesChecklist: false,
      }

      const response = await fetch(
        taskModal.mode === "create" ? "/api/tasks" : `/api/tasks/${taskModal.taskId}`,
        {
          method: taskModal.mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      const json = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(json?.error || t.saveError)
      }

      setMessage(t.taskSaved)
      await loadData()
      setTaskModal(null)
    } catch (err) {
      console.error("Save task error:", err)
      setMessage(err instanceof Error ? err.message : t.saveError)
    } finally {
      setSaving(false)
    }
  }

  async function deleteTask(taskId: string) {
    if (!window.confirm(t.deleteConfirm)) return

    try {
      setDeletingTaskId(taskId)
      setMessage(null)

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })

      const json = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(json?.error || t.deleteError)
      }

      setMessage(t.taskDeleted)
      await loadData()
      setTaskModal(null)
    } catch (err) {
      console.error("Delete task error:", err)
      setMessage(err instanceof Error ? err.message : t.deleteError)
    } finally {
      setDeletingTaskId(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">{t.loading}</div>
      </div>
    )
  }

  if (error || !property || !propertyForm || !selectedEntry) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-red-700">{error || t.noData}</div>
      </div>
    )
  }

  const selectedWindow = selectedEntry.workWindow
  const selectedTask = selectedEntry.taskForCalendar

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {property.name}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {[property.address, property.city, property.region, property.postalCode, property.country]
              .filter(Boolean)
              .join(", ")}
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
              <ViewSwitchButton
                active={viewMode === "calendar"}
                label={t.calendarView}
                hint={t.calendarViewHint}
                onClick={() => setViewMode("calendar")}
              />
              <ViewSwitchButton
                active={viewMode === "management"}
                label={t.managementView}
                hint={t.managementViewHint}
                onClick={() => setViewMode("management")}
              />
            </div>

            {viewMode === "calendar" ? (
              <button
                type="button"
                onClick={() => selectedWindow && !selectedTask && openCreateTaskModal(selectedWindow)}
                disabled={!selectedWindow || Boolean(selectedTask)}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {t.createTask}
              </button>
            ) : null}
          </div>

          {message ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          ) : null}
        </section>

        {viewMode === "management" ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t.managementTitle}</h2>
              <p className="mt-2 text-sm text-slate-500">{t.managementSubtitle}</p>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <ManagementCard
                title={t.lists}
                hint={t.editListsHint}
                action={
                  <Link
                    href={`/property-checklists/${property.id}`}
                    className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t.lists}
                  </Link>
                }
              />
              <ManagementCard
                title={t.editPartner}
                hint={t.editPartnerHint}
                action={
                  <button
                    type="button"
                    onClick={() => setPartnerModalOpen(true)}
                    className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t.editPartner}
                  </button>
                }
              />
              <ManagementCard
                title={t.editProperty}
                hint={t.editPropertyHint}
                action={
                  <button
                    type="button"
                    onClick={() => setPropertyModalOpen(true)}
                    className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t.editProperty}
                  </button>
                }
              />
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
                <CalendarModeButton active={granularity === "month"} label={t.month} onClick={() => setGranularity("month")} />
                <CalendarModeButton active={granularity === "week"} label={t.week} onClick={() => setGranularity("week")} />
                <CalendarModeButton active={granularity === "day"} label={t.day} onClick={() => setGranularity("day")} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => moveRange("prev")} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t.previous}</button>
                <button type="button" onClick={() => setAnchorDate(startOfDay(new Date()))} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t.today}</button>
                <button type="button" onClick={() => moveRange("next")} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t.next}</button>
              </div>
            </div>

            <div className="mt-5 text-2xl font-bold capitalize text-slate-900">
              {granularity === "day"
                ? formatFullDate(anchorDate, locale)
                : formatMonthTitle(anchorDate, locale)}
            </div>

            {/* Δυναμικοί μετρητές / φίλτρα */}
            <div className="mt-4 flex flex-wrap gap-2">
              <CalendarFilterButton
                icon={<span className="text-[11px] font-bold leading-none">✓</span>}
                label={t.filterAll}
                count={calendarCounters.bookings + calendarCounters.tasks + calendarCounters.supplies + calendarCounters.issues}
                active={activeFilter === null}
                tone="slate"
                onClick={() => setActiveFilter(null)}
              />
              <CalendarFilterButton
                icon={<BedIcon className="h-3.5 w-3.5" />}
                label={t.filterBookings}
                count={calendarCounters.bookings}
                active={activeFilter === "bookings"}
                tone="sky"
                onClick={() => setActiveFilter(activeFilter === "bookings" ? null : "bookings")}
              />
              <CalendarFilterButton
                icon={<BroomIcon className="h-3.5 w-3.5" />}
                label={t.filterTasks}
                count={calendarCounters.tasks}
                active={activeFilter === "tasks"}
                tone="amber"
                onClick={() => setActiveFilter(activeFilter === "tasks" ? null : "tasks")}
              />
              <CalendarFilterButton
                icon={<SupplyBarsIcon className="h-3.5 w-3.5" />}
                label={t.filterSupplies}
                count={calendarCounters.supplies}
                active={activeFilter === "supplies"}
                tone="emerald"
                onClick={() => setActiveFilter(activeFilter === "supplies" ? null : "supplies")}
              />
              <CalendarFilterButton
                icon={<WrenchIcon className="h-3.5 w-3.5" />}
                label={t.filterIssues}
                count={calendarCounters.issues}
                active={activeFilter === "issues"}
                tone="red"
                onClick={() => setActiveFilter(activeFilter === "issues" ? null : "issues")}
              />
            </div>

            {granularity !== "day" ? (
              <div className="mt-5 grid grid-cols-7 gap-3">
                {t.weekdays.map((label: string) => (
                  <div
                    key={label}
                    className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {label}
                  </div>
                ))}
              </div>
            ) : null}

            {granularity === "month" ? (
              <div className="mt-3 grid grid-cols-7 gap-3">
                {dayEntries.map((entry) => (
                  <CalendarCell
                    key={entry.key}
                    entry={entry}
                    granularity={granularity}
                    language={language}
                    locale={locale}
                    activeFilter={activeFilter}
                    allSupplyRows={supplyRows}
                    allOpenIssues={openIssues}
                    onOpenDay={() => {
                      setAnchorDate(entry.date)
                      setGranularity("day")
                    }}
                    onOpenIssues={() => {
                      setAnchorDate(entry.date)
                      setGranularity("day")
                      setIssuesModalOpen(true)
                    }}
                    onOpenSupplies={() => {
                      setAnchorDate(entry.date)
                      setGranularity("day")
                      setSuppliesModalOpen(true)
                    }}
                  />
                ))}
              </div>
            ) : null}

            {granularity === "week" ? (
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
                {dayEntries.map((entry) => (
                  <CalendarCell
                    key={entry.key}
                    entry={entry}
                    granularity={granularity}
                    language={language}
                    locale={locale}
                    activeFilter={activeFilter}
                    allSupplyRows={supplyRows}
                    allOpenIssues={openIssues}
                    onOpenDay={() => {
                      setAnchorDate(entry.date)
                      setGranularity("day")
                    }}
                    onOpenIssues={() => {
                      setAnchorDate(entry.date)
                      setGranularity("day")
                      setIssuesModalOpen(true)
                    }}
                    onOpenSupplies={() => {
                      setAnchorDate(entry.date)
                      setGranularity("day")
                      setSuppliesModalOpen(true)
                    }}
                  />
                ))}
              </div>
            ) : null}
            
            {granularity === "day" ? (
              <div className="mt-5 space-y-5">
                {/* Αφίξεις / Αναχωρήσεις / Διαμονές */}
                <div className="grid gap-5 xl:grid-cols-3">
                  <DayListCard title={t.arrivalsTitle} emptyText={t.noArrivals}>
                    {selectedEntry.arrivals.map((booking) => (
                      <Link
                        key={booking.id}
                        href={`/bookings/${booking.id}`}
                        className="block rounded-2xl border border-slate-200 bg-sky-50 p-4 transition hover:bg-sky-100"
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          {booking.guestName || t.unnamedGuest}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {formatShortDate(booking.checkInDate, locale)} • {formatTime(booking.checkInTime)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatShortDate(booking.checkOutDate, locale)} • {formatTime(booking.checkOutTime)}
                        </div>
                      </Link>
                    ))}
                  </DayListCard>

                  <DayListCard title={t.departuresTitle} emptyText={t.noDepartures}>
                    {selectedEntry.departures.map((booking) => (
                      <Link
                        key={booking.id}
                        href={`/bookings/${booking.id}`}
                        className="block rounded-2xl border border-slate-200 bg-amber-50 p-4 transition hover:bg-amber-100"
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          {booking.guestName || t.unnamedGuest}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {formatShortDate(booking.checkInDate, locale)} • {formatTime(booking.checkInTime)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatShortDate(booking.checkOutDate, locale)} • {formatTime(booking.checkOutTime)}
                        </div>
                      </Link>
                    ))}
                  </DayListCard>

                  <DayListCard title={t.staysTitle} emptyText={t.noStays}>
                    {selectedEntry.stays.map((booking) => (
                      <Link
                        key={booking.id}
                        href={`/bookings/${booking.id}`}
                        className="block rounded-2xl border border-slate-200 bg-emerald-50 p-4 transition hover:bg-emerald-100"
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          {booking.guestName || t.unnamedGuest}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {formatShortDate(booking.checkInDate, locale)} • {formatTime(booking.checkInTime)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatShortDate(booking.checkOutDate, locale)} • {formatTime(booking.checkOutTime)}
                        </div>
                      </Link>
                    ))}
                  </DayListCard>
                </div>

                {/* Πάνελ εργασίας / αναλωσίμων / ζημιών — πάνω από την ωριαία προβολή */}
                <div className="grid gap-5 xl:grid-cols-3">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {t.taskPanelTitle}
                      </div>

                      {!selectedTask && selectedWindow ? (
                        <button
                          type="button"
                          onClick={() => openCreateTaskModal(selectedWindow)}
                          className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          {t.createTask}
                        </button>
                      ) : null}
                    </div>

                    {!selectedWindow ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        {t.noWorkWindow}
                      </div>
                    ) : !selectedTask ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                        <div className="text-sm font-semibold text-red-700">
                          {t.noTaskForDay}
                        </div>
                        <div className="mt-2 text-xs text-red-600">
                          {formatDateTime(selectedWindow.startAt, locale)} → {selectedWindow.endAt
                            ? formatDateTime(selectedWindow.endAt, locale)
                            : "—"}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "rounded-2xl border p-4",
                          getToneClasses(getTaskTone(selectedTask)).soft
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">
                            {selectedTask.title}
                          </span>
                          <span className="rounded-full border border-current/20 bg-white/70 px-2.5 py-1 text-[11px] font-semibold">
                            {getTaskStatusLabel(language, selectedTask.status)}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-xs">
                          <div>
                            {t.date}: {formatShortDate(selectedTask.scheduledDate, locale)}
                          </div>
                          <div>
                            {t.startTime}: {formatTime(selectedTask.scheduledStartTime)}
                          </div>
                          <div>
                            {t.endTime}: {formatTime(selectedTask.scheduledEndTime)}
                          </div>
                          <div>
                            {t.editPartner}: {getLatestAssignment(selectedTask)?.partner?.name || t.noPartner}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href={`/tasks/${selectedTask.id}`}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {t.openTask}
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              selectedWindow &&
                              openEditTaskModal(selectedWindow, selectedTask)
                            }
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {t.editTask}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {t.suppliesPanelTitle}
                      </div>

                      {selectedSupplyRows.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSuppliesModalOpen(true)}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {t.supplies}
                        </button>
                      ) : null}
                    </div>

                    {selectedSupplyRows.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        {t.noSuppliesForDay}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedSupplyRows.map((row) => (
                          <div
                            key={row.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-900">
                                  {row.displayName}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {row.currentStock ?? 0}
                                </div>
                              </div>

                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                  getToneClasses(getSuppliesTone([row])).soft
                                )}
                              >
                                {getSupplyStateLabel(language, row.state)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {t.issuesPanelTitle}
                      </div>

                      {selectedIssueRecords.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setIssuesModalOpen(true)}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {t.issues}
                        </button>
                      ) : null}
                    </div>

                    {selectedIssueRecords.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        {t.noIssuesForDay}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedIssueRecords.map((issue) => (
                          <div
                            key={issue.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {issue.title}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                  getToneClasses(getIssuesTone([issue])).soft
                                )}
                              >
                                {getIssueStatusLabel(language, issue.status)}
                              </span>
                            </div>

                            {issue.description ? (
                              <div className="mt-2 text-xs leading-5 text-slate-500">
                                {issue.description}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ωριαία προβολή — κάτω από τα πάνελ */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 text-sm font-semibold text-slate-900">
                    {t.dayTimelineTitle}
                  </div>

                  <div className="space-y-2">
                    {hourRows.map((row) => {
                      const hasContent =
                        row.arrivals.length > 0 ||
                        row.departures.length > 0 ||
                        row.activeStays.length > 0 ||
                        row.tasks.length > 0

                      return (
                        <div
                          key={row.hour}
                          className={cn(
                            "grid gap-3 rounded-2xl border p-3 md:grid-cols-[84px_1fr]",
                            hasContent
                              ? "border-slate-200 bg-slate-50"
                              : "border-slate-100 bg-white"
                          )}
                        >
                          <div className="text-sm font-semibold text-slate-700">
                            {row.label}
                          </div>

                          {!hasContent ? (
                            <div className="text-sm text-slate-400">
                              {t.noTimelineItems}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {row.arrivals.map((booking) => (
                                <Link
                                  key={`arrival-${booking.id}-${row.hour}`}
                                  href={`/bookings/${booking.id}`}
                                  className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 transition hover:bg-sky-100"
                                >
                                  {t.timelineArrival} • {booking.guestName || t.unnamedGuest} • {formatTime(booking.checkInTime)}
                                </Link>
                              ))}

                              {row.departures.map((booking) => (
                                <Link
                                  key={`departure-${booking.id}-${row.hour}`}
                                  href={`/bookings/${booking.id}`}
                                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                                >
                                  {t.timelineDeparture} • {booking.guestName || t.unnamedGuest} • {formatTime(booking.checkOutTime)}
                                </Link>
                              ))}

                              {row.tasks.map((task) => (
                                <Link
                                  key={`task-${task.id}-${row.hour}`}
                                  href={`/tasks/${task.id}`}
                                  className={cn(
                                    "rounded-xl border px-3 py-2 text-xs font-medium transition hover:opacity-80",
                                    getToneClasses(getTaskTone(task)).soft
                                  )}
                                >
                                  {t.timelineTask} • {task.title} • {getTaskStatusLabel(language, task.status)}
                                </Link>
                              ))}

                              {row.activeStays.length > 0 ? (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                                  {t.timelineStay} • {row.activeStays.length}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        )}
      </div>

      <ModalShell
        open={propertyModalOpen}
        title={t.propertyDetailsTitle}
        onClose={() => setPropertyModalOpen(false)}
      >
        <form onSubmit={savePropertyChanges} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">{t.code}</span>
              <input
                value={propertyForm.code}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, code: e.target.value } : prev
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">{t.name}</span>
              <input
                value={propertyForm.name}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">{t.address}</span>
            <input
              value={propertyForm.address}
              onChange={(e) =>
                setPropertyForm((prev) =>
                  prev ? { ...prev, address: e.target.value } : prev
                )
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">{t.city}</span>
              <input
                value={propertyForm.city}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, city: e.target.value } : prev
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">{t.region}</span>
              <input
                value={propertyForm.region}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, region: e.target.value } : prev
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">{t.postalCode}</span>
              <input
                value={propertyForm.postalCode}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, postalCode: e.target.value } : prev
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">{t.country}</span>
              <input
                value={propertyForm.country}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, country: e.target.value } : prev
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">{t.type}</span>
              <input
                value={propertyForm.type}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, type: e.target.value } : prev
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">{t.status}</span>
              <input
                value={propertyForm.status}
                onChange={(e) =>
                  setPropertyForm((prev) =>
                    prev ? { ...prev, status: e.target.value } : prev
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">{t.notes}</span>
            <textarea
              value={propertyForm.notes}
              onChange={(e) =>
                setPropertyForm((prev) =>
                  prev ? { ...prev, notes: e.target.value } : prev
                )
              }
              rows={5}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
            />
          </label>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPropertyModalOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {t.save}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={partnerModalOpen}
        title={t.partnerTitle}
        onClose={() => setPartnerModalOpen(false)}
      >
        <form onSubmit={savePartnerChanges} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">{t.choosePartner}</span>
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
            >
              <option value="">{t.noPartner}</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name} ({partner.code})
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPartnerModalOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {t.save}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={Boolean(taskModal)}
        title={t.taskModalTitle}
        onClose={() => setTaskModal(null)}
      >
        {taskModal ? (
          <form onSubmit={saveTaskChanges} className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div>
                <strong>{t.name}:</strong> {property.name}
              </div>
              <div className="mt-1">{property.address}</div>

              {selectedWindow ? (
                <div className="mt-2">
                  <strong>Παράθυρο:</strong> {formatDateTime(selectedWindow.startAt, locale)} → {selectedWindow.endAt
                    ? formatDateTime(selectedWindow.endAt, locale)
                    : "—"}
                </div>
              ) : null}
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">{t.taskTitleLabel}</span>
              <select
                value={taskModal.titleKey}
                onChange={(e) =>
                  setTaskModal((prev) =>
                    prev
                      ? { ...prev, titleKey: e.target.value as TaskTitleKey }
                      : prev
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                {TASK_TITLE_OPTIONS.map((key) => (
                  <option key={key} value={key}>
                    {taskTitleOptions[key]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">{t.date}</span>
              <input
                type="date"
                value={taskModal.scheduledDate}
                onChange={(e) =>
                  setTaskModal((prev) =>
                    prev ? { ...prev, scheduledDate: e.target.value } : prev
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                required
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">{t.startTime}</span>
                <input
                  type="time"
                  value={taskModal.scheduledStartTime}
                  onChange={(e) =>
                    setTaskModal((prev) =>
                      prev
                        ? { ...prev, scheduledStartTime: e.target.value }
                        : prev
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">{t.endTime}</span>
                <input
                  type="time"
                  value={taskModal.scheduledEndTime}
                  onChange={(e) =>
                    setTaskModal((prev) =>
                      prev ? { ...prev, scheduledEndTime: e.target.value } : prev
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={taskModal.alertEnabled}
                  onChange={(e) =>
                    setTaskModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            alertEnabled: e.target.checked,
                            alertAt: e.target.checked ? prev.alertAt : "",
                          }
                        : prev
                    )
                  }
                />
                {t.alertEnabled}
              </label>

              {taskModal.alertEnabled ? (
                <label className="mt-3 block space-y-1">
                  <span className="text-sm font-medium text-slate-700">{t.alertAt}</span>
                  <input
                    type="datetime-local"
                    value={taskModal.alertAt}
                    onChange={(e) =>
                      setTaskModal((prev) =>
                        prev ? { ...prev, alertAt: e.target.value } : prev
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                  />
                </label>
              ) : null}
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">{t.notes}</span>
              <textarea
                value={taskModal.notes}
                onChange={(e) =>
                  setTaskModal((prev) =>
                    prev ? { ...prev, notes: e.target.value } : prev
                  )
                }
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </label>

            <div className="flex flex-wrap justify-end gap-3">
              {taskModal.mode === "edit" && taskModal.taskId ? (
                <button
                  type="button"
                  onClick={() => deleteTask(taskModal.taskId!)}
                  disabled={deletingTaskId === taskModal.taskId}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  {t.deleteTask}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setTaskModal(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t.cancel}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {taskModal.mode === "create" ? t.createTask : t.save}
              </button>
            </div>
          </form>
        ) : null}
      </ModalShell>

      <ModalShell
        open={issuesModalOpen}
        title={t.issueDetailTitle}
        onClose={() => setIssuesModalOpen(false)}
      >
        {selectedIssueRecords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            {t.noIssuesForDay}
          </div>
        ) : (
          <div className="space-y-3">
            {selectedIssueRecords.map((issue) => (
              <div
                key={issue.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{issue.title}</span>
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                      getToneClasses(getIssuesTone([issue])).soft
                    )}
                  >
                    {getIssueStatusLabel(language, issue.status)}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  Severity: {String(issue.severity || "—").toUpperCase()}
                </div>

                {issue.description ? (
                  <div className="mt-3 text-sm leading-6 text-slate-700">
                    {issue.description}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ModalShell>

      <ModalShell
        open={suppliesModalOpen}
        title={t.supplyDetailTitle}
        onClose={() => setSuppliesModalOpen(false)}
      >
        {selectedSupplyRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            {t.noSuppliesForDay}
          </div>
        ) : (
          <div className="space-y-3">
            {selectedSupplyRows.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {row.displayName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.currentStock ?? 0}
                    </div>
                  </div>

                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                      getToneClasses(getSuppliesTone([row])).soft
                    )}
                  >
                    {getSupplyStateLabel(language, row.state)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalShell>
    </>
  )
}




