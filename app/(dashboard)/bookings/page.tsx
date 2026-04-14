"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type BookingTask = {
  id: string
  title: string
  status: string
  taskType: string
  priority: string
  scheduledDate: string
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
}

type BookingRow = {
  id: string
  propertyId?: string | null
  sourcePlatform: string
  externalBookingId: string
  externalListingId?: string | null
  externalListingName?: string | null
  externalPropertyAddress?: string | null
  externalPropertyCity?: string | null
  externalPropertyRegion?: string | null
  externalPropertyPostalCode?: string | null
  externalPropertyCountry?: string | null
  guestName?: string | null
  guestPhone?: string | null
  guestEmail?: string | null
  checkInDate: string
  checkOutDate: string
  checkInTime?: string | null
  checkOutTime?: string | null
  status: string
  syncStatus: string
  needsMapping: boolean
  importedAt?: string | null
  lastProcessedAt?: string | null
  lastError?: string | null
  notes?: string | null
  taskStatus?: string
  property?: {
    id: string
    code?: string | null
    name?: string | null
    address?: string | null
    city?: string | null
    region?: string | null
    postalCode?: string | null
    country?: string | null
    status?: string | null
    readinessStatus?: string | null
    nextCheckInAt?: string | null
  } | null
  tasks: BookingTask[]
}

type CalendarView = "month" | "week" | "day"

type SettingsPayload = {
  calendarDefaultView?: string | null
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function startOfWeekMonday(date: Date) {
  const next = startOfDay(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  return next
}

function endOfWeekSunday(date: Date) {
  const next = startOfWeekMonday(date)
  next.setDate(next.getDate() + 6)
  return endOfDay(next)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDate(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizePlatformLabel(value: string, language: "el" | "en") {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "booking") return "Booking.com"
  if (normalized === "airbnb") return "Airbnb"
  if (normalized === "vrbo") return "Vrbo"
  if (normalized === "direct") return language === "en" ? "Direct" : "Άμεση"
  if (normalized === "manual") return language === "en" ? "Manual" : "Χειροκίνητη"
  return value || "-"
}

function formatDayLabel(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date)
}

function formatDateRangeTitle(view: CalendarView, date: Date, locale: string) {
  if (view === "day") {
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date)
  }

  if (view === "week") {
    const start = startOfWeekMonday(date)
    const end = endOfWeekSunday(date)
    const startText = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
    }).format(start)
    const endText = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(end)
    return `${startText} - ${endText}`
  }

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value: string | null | undefined, locale: string, fallback = "—") {
  const date = parseDate(value)
  if (!date) return fallback

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function bookingOverlapsDay(booking: BookingRow, date: Date) {
  const start = parseDate(booking.checkInDate)
  const end = parseDate(booking.checkOutDate)
  if (!start || !end) return false

  const dayStart = startOfDay(date).getTime()
  const dayEnd = endOfDay(date).getTime()

  return start.getTime() <= dayEnd && end.getTime() >= dayStart
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isCancelled(status?: string | null) {
  return String(status || "").trim().toLowerCase() === "cancelled"
}

function bookingTitle(booking: BookingRow, fallback: string) {
  return (
    booking.property?.name ||
    booking.externalListingName ||
    booking.externalListingId ||
    fallback
  )
}

function bookingAddress(booking: BookingRow, fallback: string) {
  return (
    [
      booking.property?.address,
      booking.property?.city,
      booking.property?.region,
      booking.property?.postalCode,
      booking.property?.country,
    ]
      .filter(Boolean)
      .join(" · ") ||
    [
      booking.externalPropertyAddress,
      booking.externalPropertyCity,
      booking.externalPropertyRegion,
      booking.externalPropertyPostalCode,
      booking.externalPropertyCountry,
    ]
      .filter(Boolean)
      .join(" · ") ||
    fallback
  )
}

function badgeClasses(params: { cancelled?: boolean; unmapped?: boolean }) {
  if (params.cancelled) {
    return "border-rose-200 bg-rose-100 text-rose-700"
  }

  if (params.unmapped) {
    return "border-amber-200 bg-amber-100 text-amber-700"
  }

  return "border-emerald-200 bg-emerald-100 text-emerald-700"
}

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      locale: "en-GB",
      title: "Bookings",
      subtitle:
        "This page is only for booking visibility. Task execution stays in the property calendar. Here the user sees only reservations with a clean month-first calendar and optional week/day views.",
      connectionsButton: "Platform connections",
      connectionsHelp:
        "Open the platform listings page to auto-create properties from imported listings and keep future imported bookings linked correctly to the property calendar.",
      loading: "Loading bookings calendar...",
      loadError: "Failed to load bookings calendar.",
      refresh: "Refresh",
      today: "Today",
      month: "Month",
      week: "Week",
      day: "Day",
      searchPlaceholder: "Search by property, guest, listing or booking code...",
      searchHelp:
        "Search bookings by guest, property, imported listing identity or booking code.",
      allProperties: "All properties",
      allPlatforms: "All platforms",
      allStatuses: "All statuses",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
      pending: "Pending",
      importedBookings: "Imported bookings",
      mappedBookings: "Mapped bookings",
      unmappedBookings: "Bookings needing mapping",
      selectedBooking: "Selected booking",
      noSelection: "Select a booking from the calendar.",
      noResults: "No bookings found for the current filters.",
      noProperty: "No mapped property yet",
      guest: "Guest",
      platform: "Platform",
      property: "Property",
      bookingCode: "Booking code",
      dateRange: "Stay",
      importedAt: "Imported at",
      syncStatus: "Sync status",
      openBooking: "Open booking",
      openProperty: "Open property",
      openConnections: "Open platform connections",
      bookingOnlyHint:
        "This page intentionally shows only bookings. Task creation and operational execution continue only from the property calendar.",
      calendarHint:
        "Month view is the main view. Week and day stay available for denser reading without mixing operations here.",
      monthHelp:
        "Month view keeps the page clean and booking-first, similar to booking calendars users already know from platforms.",
      weekHelp:
        "Week view shows the active reservations per day for denser operational reading.",
      dayHelp:
        "Day view isolates a single day so the user can inspect arrivals, stays and departures more clearly.",
      active: "Active",
      needsMapping: "Needs mapping",
      cancelledLabel: "Cancelled",
      emptyDay: "No bookings",
      importedListing: "Imported listing",
      address: "Address",
      notes: "Notes",
      lastError: "Last import error",
      checkIn: "Check-in",
      checkOut: "Check-out",
      clearFilters: "Clear filters",
    }
  }

  return {
    locale: "el-GR",
    title: "Κρατήσεις",
    subtitle:
      "Η σελίδα αυτή είναι μόνο για προβολή κρατήσεων. Η διαχείριση και εκτέλεση εργασιών μένει στο ημερολόγιο ακινήτου. Εδώ ο χρήστης βλέπει μόνο κρατήσεις με καθαρό ημερολόγιο μήνα και προαιρετικές προβολές εβδομάδας και ημέρας.",
    connectionsButton: "Συνδέσεις πλατφορμών",
    connectionsHelp:
      "Άνοιγμα της σελίδας πλατφορμών για αυτόματη δημιουργία ακινήτων από imported listings και σωστή σύνδεση των μελλοντικών εισαγόμενων κρατήσεων με το ημερολόγιο ακινήτου.",
    loading: "Φόρτωση ημερολογίου κρατήσεων...",
    loadError: "Αποτυχία φόρτωσης ημερολογίου κρατήσεων.",
    refresh: "Ανανέωση",
    today: "Σήμερα",
    month: "Μήνας",
    week: "Εβδομάδα",
    day: "Ημέρα",
    searchPlaceholder: "Αναζήτηση ανά ακίνητο, επισκέπτη, listing ή κωδικό κράτησης...",
    searchHelp:
      "Αναζήτηση κρατήσεων με βάση επισκέπτη, ακίνητο, ταυτότητα imported listing ή κωδικό κράτησης.",
    allProperties: "Όλα τα ακίνητα",
    allPlatforms: "Όλες οι πλατφόρμες",
    allStatuses: "Όλες οι καταστάσεις",
    confirmed: "Επιβεβαιωμένη",
    cancelled: "Ακυρωμένη",
    pending: "Σε αναμονή",
    importedBookings: "Εισαγόμενες κρατήσεις",
    mappedBookings: "Συνδεδεμένες κρατήσεις",
    unmappedBookings: "Κρατήσεις που θέλουν αντιστοίχιση",
    selectedBooking: "Επιλεγμένη κράτηση",
    noSelection: "Επίλεξε μία κράτηση από το ημερολόγιο.",
    noResults: "Δεν βρέθηκαν κρατήσεις για τα τρέχοντα φίλτρα.",
    noProperty: "Δεν έχει συνδεθεί ακόμη ακίνητο",
    guest: "Επισκέπτης",
    platform: "Πλατφόρμα",
    property: "Ακίνητο",
    bookingCode: "Κωδικός κράτησης",
    dateRange: "Διαμονή",
    importedAt: "Ημερομηνία εισαγωγής",
    syncStatus: "Κατάσταση συγχρονισμού",
    openBooking: "Άνοιγμα κράτησης",
    openProperty: "Άνοιγμα ακινήτου",
    openConnections: "Άνοιγμα συνδέσεων πλατφορμών",
    bookingOnlyHint:
      "Η σελίδα αυτή δείχνει σκόπιμα μόνο κρατήσεις. Η δημιουργία εργασίας και η λειτουργική εκτέλεση συνεχίζουν μόνο από το ημερολόγιο ακινήτου.",
    calendarHint:
      "Η κύρια προβολή είναι ο μήνας. Η εβδομάδα και η ημέρα παραμένουν διαθέσιμες για πιο πυκνή ανάγνωση χωρίς να μπαίνει εδώ η λειτουργική εκτέλεση.",
    monthHelp:
      "Η προβολή μήνα κρατά τη σελίδα καθαρή και booking-first, όπως τα ημερολόγια κρατήσεων που ήδη γνωρίζει ο χρήστης από τις πλατφόρμες.",
    weekHelp:
      "Η προβολή εβδομάδας δείχνει τις ενεργές κρατήσεις ανά ημέρα για πιο πυκνή ανάγνωση.",
    dayHelp:
      "Η προβολή ημέρας απομονώνει μία μόνο ημέρα ώστε ο χρήστης να βλέπει καθαρότερα αφίξεις, διαμονές και αναχωρήσεις.",
    active: "Ενεργή",
    needsMapping: "Θέλει αντιστοίχιση",
    cancelledLabel: "Ακυρωμένη",
    emptyDay: "Χωρίς κρατήσεις",
    importedListing: "Imported listing",
    address: "Διεύθυνση",
    notes: "Σημειώσεις",
    lastError: "Τελευταίο σφάλμα εισαγωγής",
    checkIn: "Check-in",
    checkOut: "Check-out",
    clearFilters: "Καθαρισμός φίλτρων",
  }
}

function BookingChip({
  booking,
  language,
  texts,
  isSelected,
  onSelect,
}: {
  booking: BookingRow
  language: "el" | "en"
  texts: ReturnType<typeof getTexts>
  isSelected: boolean
  onSelect: () => void
}) {
  const cancelled = isCancelled(booking.status)
  const chipClass = isSelected
    ? "border-slate-900 bg-slate-900 text-white"
    : cancelled
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : booking.needsMapping
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border px-3 py-2 text-left text-xs shadow-sm transition ${chipClass}`}
      title={booking.externalBookingId}
    >
      <div className="truncate font-semibold">{bookingTitle(booking, texts.noProperty)}</div>
      <div className="mt-1 flex flex-wrap items-center gap-2 opacity-90">
        <span>{normalizePlatformLabel(booking.sourcePlatform, language)}</span>
        <span>•</span>
        <span>{booking.guestName || booking.externalBookingId}</span>
      </div>
    </button>
  )
}

export default function BookingsPage() {
  const { language } = useAppLanguage()
  const texts = getTexts(language)

  const [view, setView] = useState<CalendarView>("month")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [propertyFilter, setPropertyFilter] = useState("all")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  const range = useMemo(() => {
    if (view === "day") {
      return {
        from: startOfDay(currentDate),
        to: endOfDay(currentDate),
      }
    }

    if (view === "week") {
      return {
        from: startOfWeekMonday(currentDate),
        to: endOfWeekSunday(currentDate),
      }
    }

    return {
      from: startOfWeekMonday(startOfMonth(currentDate)),
      to: endOfWeekSunday(endOfMonth(currentDate)),
    }
  }, [currentDate, view])

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" })
      const payload: SettingsPayload = await res.json()
      const raw = String(payload?.calendarDefaultView || "").trim().toLowerCase()

      if (raw === "week" || raw === "day" || raw === "month") {
        setView(raw)
      }
    } catch (settingsError) {
      console.error("Load settings for bookings calendar error:", settingsError)
    }
  }

  async function loadBookings() {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        fromDate: formatDateKey(range.from),
        toDate: formatDateKey(range.to),
      })

      const res = await fetch(`/api/bookings/calendar?${params.toString()}`, {
        cache: "no-store",
      })
      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload?.error || texts.loadError)
      }

      setBookings(Array.isArray(payload) ? payload : [])
    } catch (err) {
      console.error("Load bookings calendar error:", err)
      setError(err instanceof Error ? err.message : texts.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    loadBookings()
  }, [view, currentDate, language])

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase()

    return bookings.filter((booking) => {
      if (propertyFilter !== "all" && booking.property?.id !== propertyFilter) return false
      if (platformFilter !== "all" && booking.sourcePlatform !== platformFilter) return false
      if (statusFilter !== "all" && String(booking.status || "").trim().toLowerCase() !== statusFilter)
        return false

      if (!q) return true

      const haystack = [
        booking.externalBookingId,
        booking.guestName,
        booking.externalListingId,
        booking.externalListingName,
        booking.property?.code,
        booking.property?.name,
        booking.externalPropertyAddress,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [bookings, platformFilter, propertyFilter, search, statusFilter])

  const propertyOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>()

    for (const booking of bookings) {
      if (!booking.property?.id) continue
      map.set(booking.property.id, {
        id: booking.property.id,
        label: booking.property.code
          ? `${booking.property.code} · ${booking.property.name || ""}`
          : booking.property.name || booking.property.id,
      })
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "el"))
  }, [bookings])

  const platformOptions = useMemo(() => {
    return Array.from(new Set(bookings.map((booking) => booking.sourcePlatform))).sort((a, b) =>
      a.localeCompare(b, "el")
    )
  }, [bookings])

  const stats = useMemo(() => {
    return {
      total: filteredBookings.length,
      mapped: filteredBookings.filter((item) => !item.needsMapping).length,
      unmapped: filteredBookings.filter((item) => item.needsMapping).length,
    }
  }, [filteredBookings])

  useEffect(() => {
    if (filteredBookings.length === 0) {
      setSelectedBookingId(null)
      return
    }

    const found = filteredBookings.find((item) => item.id === selectedBookingId)
    if (!found) {
      setSelectedBookingId(filteredBookings[0].id)
    }
  }, [filteredBookings, selectedBookingId])

  const selectedBooking = filteredBookings.find((item) => item.id === selectedBookingId) || null

  const monthCells = useMemo(() => {
    const start = startOfWeekMonday(startOfMonth(currentDate))
    return Array.from({ length: 42 }, (_, index) => addDays(start, index))
  }, [currentDate])

  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(currentDate)
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }, [currentDate])

  function movePrevious() {
    setCurrentDate((prev) => {
      if (view === "day") return addDays(prev, -1)
      if (view === "week") return addDays(prev, -7)
      return addMonths(prev, -1)
    })
  }

  function moveNext() {
    setCurrentDate((prev) => {
      if (view === "day") return addDays(prev, 1)
      if (view === "week") return addDays(prev, 7)
      return addMonths(prev, 1)
    })
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">OPS · Bookings</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{texts.title}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{texts.subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/bookings/platforms"
            title={texts.connectionsHelp}
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            {texts.connectionsButton}
          </Link>

          <button
            type="button"
            onClick={loadBookings}
            className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            {texts.refresh}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">{texts.importedBookings}</div>
          <div className="mt-3 text-3xl font-bold text-slate-950">{stats.total}</div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="text-sm text-emerald-700">{texts.mappedBookings}</div>
          <div className="mt-3 text-3xl font-bold text-emerald-900">{stats.mapped}</div>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="text-sm text-amber-700">{texts.unmappedBookings}</div>
          <div className="mt-3 text-3xl font-bold text-amber-900">{stats.unmapped}</div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr),220px,220px,220px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={texts.searchPlaceholder}
              title={texts.searchHelp}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{texts.property}</label>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="all">{texts.allProperties}</option>
              {propertyOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{texts.platform}</label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="all">{texts.allPlatforms}</option>
              {platformOptions.map((item) => (
                <option key={item} value={item}>
                  {normalizePlatformLabel(item, language)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="all">{texts.allStatuses}</option>
              <option value="confirmed">{texts.confirmed}</option>
              <option value="pending">{texts.pending}</option>
              <option value="cancelled">{texts.cancelled}</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs leading-5 text-slate-500">{texts.bookingOnlyHint}</div>
          <button
            type="button"
            onClick={() => {
              setSearch("")
              setPropertyFilter("all")
              setPlatformFilter("all")
              setStatusFilter("all")
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {texts.clearFilters}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{formatDateRangeTitle(view, currentDate, texts.locale)}</h2>
            <p className="mt-1 text-sm text-slate-500">{texts.calendarHint}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={movePrevious}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date())}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {texts.today}
              </button>
              <button
                type="button"
                onClick={moveNext}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                →
              </button>
            </div>

            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setView("month")}
                title={texts.monthHelp}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  view === "month" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {texts.month}
              </button>
              <button
                type="button"
                onClick={() => setView("week")}
                title={texts.weekHelp}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  view === "week" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {texts.week}
              </button>
              <button
                type="button"
                onClick={() => setView("day")}
                title={texts.dayHelp}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  view === "day" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {texts.day}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">{texts.loading}</div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-600">{error}</div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{texts.noResults}</div>
        ) : (
          <div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr),380px]">
            <div className="min-w-0 border-b border-slate-200 xl:border-b-0 xl:border-r xl:border-slate-200">
              {view === "month" ? (
                <div>
                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                    {Array.from({ length: 7 }, (_, index) => addDays(startOfWeekMonday(currentDate), index)).map((date) => (
                      <div key={formatDateKey(date)} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {new Intl.DateTimeFormat(texts.locale, { weekday: "short" }).format(date)}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7">
                    {monthCells.map((date) => {
                      const dayBookings = filteredBookings.filter((booking) => bookingOverlapsDay(booking, date))
                      const inCurrentMonth = date.getMonth() === currentDate.getMonth()

                      return (
                        <div key={formatDateKey(date)} className="min-h-[160px] border-b border-r border-slate-200 p-3 align-top">
                          <div className={`mb-3 flex items-center justify-between text-sm font-semibold ${
                            inCurrentMonth ? "text-slate-900" : "text-slate-400"
                          }`}>
                            <span>{date.getDate()}</span>
                            {isSameDay(date, new Date()) ? (
                              <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-semibold text-white">
                                {texts.today}
                              </span>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            {dayBookings.length === 0 ? (
                              <div className="text-xs text-slate-400">{texts.emptyDay}</div>
                            ) : (
                              dayBookings.slice(0, 4).map((booking) => (
                                <BookingChip
                                  key={`${booking.id}-${formatDateKey(date)}`}
                                  booking={booking}
                                  language={language}
                                  texts={texts}
                                  isSelected={selectedBookingId === booking.id}
                                  onSelect={() => setSelectedBookingId(booking.id)}
                                />
                              ))
                            )}

                            {dayBookings.length > 4 ? (
                              <div className="text-xs font-medium text-slate-500">+{dayBookings.length - 4}</div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {view === "week" ? (
                <div className="grid grid-cols-1 gap-0 md:grid-cols-7">
                  {weekDays.map((date) => {
                    const dayBookings = filteredBookings.filter((booking) => bookingOverlapsDay(booking, date))

                    return (
                      <div key={formatDateKey(date)} className="min-h-[420px] border-b border-r border-slate-200 p-4">
                        <div className="mb-4 text-sm font-semibold text-slate-900">{formatDayLabel(date, texts.locale)}</div>
                        <div className="space-y-2">
                          {dayBookings.length === 0 ? (
                            <div className="text-xs text-slate-400">{texts.emptyDay}</div>
                          ) : (
                            dayBookings.map((booking) => (
                              <BookingChip
                                key={`${booking.id}-${formatDateKey(date)}`}
                                booking={booking}
                                language={language}
                                texts={texts}
                                isSelected={selectedBookingId === booking.id}
                                onSelect={() => setSelectedBookingId(booking.id)}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {view === "day" ? (
                <div className="p-5">
                  <div className="mb-4 text-base font-semibold text-slate-900">{formatDateRangeTitle("day", currentDate, texts.locale)}</div>
                  <div className="space-y-3">
                    {filteredBookings.filter((booking) => bookingOverlapsDay(booking, currentDate)).map((booking) => (
                      <BookingChip
                        key={booking.id}
                        booking={booking}
                        language={language}
                        texts={texts}
                        isSelected={selectedBookingId === booking.id}
                        onSelect={() => setSelectedBookingId(booking.id)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="min-w-0 bg-slate-50/60">
              <div className="border-b border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-slate-950">{texts.selectedBooking}</h3>
                <p className="mt-1 text-sm text-slate-500">{texts.bookingOnlyHint}</p>
              </div>

              {!selectedBooking ? (
                <div className="p-5 text-sm text-slate-500">{texts.noSelection}</div>
              ) : (
                <div className="space-y-4 p-5">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {normalizePlatformLabel(selectedBooking.sourcePlatform, language)}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses({
                        cancelled: isCancelled(selectedBooking.status),
                        unmapped: selectedBooking.needsMapping,
                      })}`}>
                        {isCancelled(selectedBooking.status)
                          ? texts.cancelledLabel
                          : selectedBooking.needsMapping
                            ? texts.needsMapping
                            : texts.active}
                      </span>
                    </div>

                    <h4 className="mt-4 text-xl font-semibold text-slate-950">
                      {bookingTitle(selectedBooking, texts.noProperty)}
                    </h4>
                    <p className="mt-2 text-sm text-slate-500">{bookingAddress(selectedBooking, "—")}</p>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">{texts.bookingCode}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-950">
                          {selectedBooking.externalBookingId}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">{texts.guest}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-950">
                          {selectedBooking.guestName || "—"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">{texts.checkIn}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-950">
                          {formatDateTime(selectedBooking.checkInDate, texts.locale)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">{texts.checkOut}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-950">
                          {formatDateTime(selectedBooking.checkOutDate, texts.locale)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                        <div className="text-xs text-slate-500">{texts.importedListing}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-950">
                          {selectedBooking.externalListingName || selectedBooking.externalListingId || "—"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                        <div className="text-xs text-slate-500">{texts.property}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-950">
                          {selectedBooking.property?.name
                            ? `${selectedBooking.property.code ? `${selectedBooking.property.code} · ` : ""}${selectedBooking.property.name}`
                            : texts.noProperty}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                        <div className="text-xs text-slate-500">{texts.syncStatus}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-950">{selectedBooking.syncStatus}</div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                        <div className="text-xs text-slate-500">{texts.importedAt}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-950">
                          {formatDateTime(selectedBooking.importedAt, texts.locale)}
                        </div>
                      </div>
                    </div>

                    {selectedBooking.lastError ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-rose-700">
                          {texts.lastError}
                        </div>
                        <div className="mt-2 text-sm text-rose-700">{selectedBooking.lastError}</div>
                      </div>
                    ) : null}

                    {selectedBooking.notes ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {texts.notes}
                        </div>
                        <div className="mt-2 text-sm text-slate-700">{selectedBooking.notes}</div>
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/bookings/${selectedBooking.id}`}
                        className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        {texts.openBooking}
                      </Link>

                      {selectedBooking.property?.id ? (
                        <Link
                          href={`/properties/${selectedBooking.property.id}`}
                          className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                          {texts.openProperty}
                        </Link>
                      ) : (
                        <Link
                          href="/bookings/platforms"
                          className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                          {texts.openConnections}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </section>
    </div>
  )
}
