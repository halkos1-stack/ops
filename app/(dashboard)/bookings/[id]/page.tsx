"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { getBookingsModuleTexts } from "@/lib/i18n/translations"

type BookingDetail = {
  id: string
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
  adults?: number
  children?: number
  infants?: number
  status: string
  syncStatus: string
  needsMapping: boolean
  notes?: string | null
  property?: {
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
    readinessStatus?: string | null
  } | null
  syncEvents: Array<{
    id: string
    eventType: string
    resultStatus?: string | null
    message?: string | null
    createdAt: string
  }>
}

function isValidDate(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value || !isValidDate(value)) return "-"
  return new Date(value).toLocaleDateString(locale)
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value || !isValidDate(value)) return "-"
  return new Date(value).toLocaleString(locale)
}

function formatTime(value?: string | null) {
  if (!value) return ""
  const text = String(value).trim()
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(text) ? text.slice(0, 5) : ""
}

function normalizeSourcePlatform(sourcePlatform: string, language: "el" | "en") {
  const normalized = sourcePlatform.trim().toUpperCase()
  if (normalized === "AIRBNB") return "Airbnb"
  if (normalized === "BOOKING_COM") return "Booking.com"
  if (normalized === "VRBO") return "Vrbo"
  if (normalized === "DIRECT") return language === "en" ? "Direct" : "Άμεση"
  return sourcePlatform
}

function getBookingStatusDisplay(status: string, language: "el" | "en") {
  const normalized = status.trim().toLowerCase()
  if (language === "en") {
    if (normalized === "cancelled") return "Cancelled"
    if (normalized === "confirmed") return "Confirmed"
    if (normalized === "active") return "Active"
    if (normalized === "completed") return "Completed"
    if (normalized === "pending") return "Pending"
    return status
  }
  if (normalized === "cancelled") return "Ακυρωμένη"
  if (normalized === "confirmed") return "Επιβεβαιωμένη"
  if (normalized === "active") return "Ενεργή"
  if (normalized === "completed") return "Ολοκληρωμένη"
  if (normalized === "pending") return "Σε αναμονή"
  return status
}

function getSyncStatusDisplay(syncStatus: string, needsMapping: boolean, language: "el" | "en") {
  if (needsMapping) return language === "en" ? "Needs mapping" : "Χρειάζεται αντιστοίχιση"
  if (syncStatus === "READY_FOR_ACTION") return language === "en" ? "Ready for action" : "Έτοιμη για ενέργεια"
  if (syncStatus === "ERROR") return language === "en" ? "Error" : "Σφάλμα"
  if (syncStatus === "PENDING_MATCH") return language === "en" ? "Pending match" : "Αναμονή αντιστοίχισης"
  if (syncStatus === "CANCELLED") return language === "en" ? "Cancelled" : "Ακυρωμένη"
  return syncStatus
}

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { language } = useAppLanguage()
  const texts = getBookingsModuleTexts(language)
  const locale = language === "en" ? "en-GB" : "el-GR"
  const bookingId = String(params.id)

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadBooking() {
    setLoading(true)
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || texts.detail.loadError)
      setBooking(data)
    } catch (error) {
      alert(error instanceof Error ? error.message : texts.detail.loadError)
      router.push("/bookings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (bookingId) loadBooking()
  }, [bookingId, language])

  if (loading) return <div className="p-6 text-sm text-slate-500">{texts.common.loading}</div>
  if (!booking) return <div className="p-6 text-sm text-slate-500">{texts.detail.notFound}</div>

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-3 text-sm text-slate-500">
            <Link href="/bookings" className="font-medium text-slate-700 underline underline-offset-4">
              {texts.detail.breadcrumb}
            </Link>
            {" / "}
            {booking.externalBookingId}
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {booking.property?.name || booking.externalListingName || booking.externalListingId || texts.detail.titleFallback}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{normalizeSourcePlatform(booking.sourcePlatform, language)}</span>
            <span>·</span>
            <span>{getBookingStatusDisplay(booking.status, language)}</span>
            <span>·</span>
            <span>{getSyncStatusDisplay(booking.syncStatus, booking.needsMapping, language)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/bookings" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950">
            {texts.common.backToBookings}
          </Link>
          {booking.property ? (
            <Link href={`/properties/${booking.property.id}`} className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
              {texts.common.viewProperty}
            </Link>
          ) : (
            <Link href="/bookings/platforms" className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
              {language === "en" ? "Open platforms" : "Άνοιγμα πλατφορμών"}
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">{language === "en" ? "Booking summary" : "Σύνοψη κράτησης"}</h2>
            <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{texts.labels.bookingCode}</div><div className="mt-1 font-medium text-slate-950">{booking.externalBookingId}</div></div>
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{texts.labels.listingId}</div><div className="mt-1">{booking.externalListingId || texts.common.noValue}</div></div>
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{texts.labels.checkIn}</div><div className="mt-1">{formatDate(booking.checkInDate, locale)}{formatTime(booking.checkInTime) ? ` · ${formatTime(booking.checkInTime)}` : ""}</div></div>
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{texts.labels.checkOut}</div><div className="mt-1">{formatDate(booking.checkOutDate, locale)}{formatTime(booking.checkOutTime) ? ` · ${formatTime(booking.checkOutTime)}` : ""}</div></div>
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{language === "en" ? "Guest" : "Επισκέπτης"}</div><div className="mt-1">{booking.guestName || texts.common.noValue}</div></div>
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{language === "en" ? "Contact" : "Επικοινωνία"}</div><div className="mt-1">{booking.guestEmail || booking.guestPhone || texts.common.noValue}</div></div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">{texts.detail.syncHistoryCard}</h2>
            {booking.syncEvents.length === 0 ? (
              <div className="text-sm text-slate-500">{texts.detail.noHistory}</div>
            ) : (
              <div className="space-y-3">
                {booking.syncEvents.map((event) => (
                  <article key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <div className="font-semibold text-slate-950">{event.eventType}</div>
                    <div className="mt-1 text-slate-600">{event.resultStatus || texts.common.noValue}</div>
                    <div className="mt-1 text-slate-600">{event.message || texts.common.noValue}</div>
                    <div className="mt-2 text-slate-500">{formatDateTime(event.createdAt, locale)}</div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">{texts.detail.propertyCard}</h2>
            {booking.property ? (
              <div className="space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{texts.labels.property}</div><div className="mt-1 font-medium text-slate-950">{booking.property.code} · {booking.property.name}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{language === "en" ? "Address" : "Διεύθυνση"}</div><div className="mt-1">{booking.property.address || texts.common.noValue}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{language === "en" ? "Location" : "Τοποθεσία"}</div><div className="mt-1">{booking.property.city || texts.common.noValue}{booking.property.region ? ` · ${booking.property.region}` : ""}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Readiness</div><div className="mt-1">{booking.property.readinessStatus || texts.common.noValue}</div></div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {language === "en" ? "This booking is not mapped to a property yet. Complete the mapping from the platforms page." : "Αυτή η κράτηση δεν έχει ακόμη αντιστοιχιστεί με ακίνητο. Ολοκλήρωσε την αντιστοίχιση από τη σελίδα πλατφορμών."}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">{language === "en" ? "Imported listing data" : "Στοιχεία εισαγόμενου listing"}</h2>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Listing</div><div className="mt-1">{booking.externalListingName || booking.externalListingId || texts.common.noValue}</div></div>
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{language === "en" ? "Imported address" : "Εισαγόμενη διεύθυνση"}</div><div className="mt-1">{[booking.externalPropertyAddress, booking.externalPropertyCity, booking.externalPropertyRegion, booking.externalPropertyPostalCode, booking.externalPropertyCountry].filter(Boolean).join(" · ") || texts.common.noValue}</div></div>
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</div><div className="mt-1">{booking.notes || texts.common.noValue}</div></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
