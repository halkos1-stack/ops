"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type BookingDetail = {
  id: string
  sourcePlatform: string
  externalBookingId: string | null
  guestName: string | null
  guestPhone: string | null
  guestEmail: string | null
  checkInDate: string
  checkOutDate: string
  checkInTime: string | null
  checkOutTime: string | null
  adults: number | null
  children: number | null
  infants: number | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  property: {
    id: string
    code: string
    name: string
    address: string
    city: string
    region: string
    postalCode: string
    country: string
    type: string
    status: string
  }
}

function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDate(value: string | null | undefined, locale: string) {
  const date = normalizeDate(value)
  if (!date) return "—"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value: string | null | undefined, locale: string) {
  const date = normalizeDate(value)
  if (!date) return "—"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      locale: "en-GB",
      back: "Back to bookings",
      title: "Booking details",
      property: "Property",
      source: "Platform",
      code: "External booking code",
      guest: "Guest",
      phone: "Phone",
      email: "Email",
      checkIn: "Check-in",
      checkOut: "Check-out",
      status: "Status",
      createdAt: "Created",
      updatedAt: "Updated",
      notes: "Notes",
      openProperty: "Open property",
    }
  }

  return {
    locale: "el-GR",
    back: "Επιστροφή στις κρατήσεις",
    title: "Στοιχεία κράτησης",
    property: "Ακίνητο",
    source: "Πλατφόρμα",
    code: "Εξωτερικός κωδικός κράτησης",
    guest: "Επισκέπτης",
    phone: "Τηλέφωνο",
    email: "Email",
    checkIn: "Check-in",
    checkOut: "Check-out",
    status: "Κατάσταση",
    createdAt: "Δημιουργία",
    updatedAt: "Τελευταία ενημέρωση",
    notes: "Σημειώσεις",
    openProperty: "Προβολή ακινήτου",
  }
}

export default function BookingDetailPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { language } = useAppLanguage()
  const texts = getTexts(language)

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      if (!id) return

      try {
        setLoading(true)
        setError("")

        const res = await fetch(`/api/bookings/${id}`, {
          cache: "no-store",
        })

        const json = await res.json().catch(() => null)

        if (!res.ok) {
          throw new Error(json?.error || "Αποτυχία φόρτωσης κράτησης.")
        }

        setBooking(json?.booking ?? null)
      } catch (err) {
        console.error("Booking detail load error:", err)
        setError(
          err instanceof Error ? err.message : "Αποτυχία φόρτωσης κράτησης."
        )
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">
          {language === "en" ? "Loading booking..." : "Φόρτωση κράτησης..."}
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-red-600">{error || "Σφάλμα φόρτωσης."}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/bookings"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          {texts.back}
        </Link>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {texts.title}
        </h1>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.property}
            </div>
            <div className="mt-1 text-sm text-slate-900">
              {booking.property.code} · {booking.property.name}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.source}
            </div>
            <div className="mt-1 text-sm text-slate-900">{booking.sourcePlatform}</div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.code}
            </div>
            <div className="mt-1 text-sm text-slate-900">
              {booking.externalBookingId || "—"}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.guest}
            </div>
            <div className="mt-1 text-sm text-slate-900">{booking.guestName || "—"}</div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.phone}
            </div>
            <div className="mt-1 text-sm text-slate-900">{booking.guestPhone || "—"}</div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.email}
            </div>
            <div className="mt-1 text-sm text-slate-900">{booking.guestEmail || "—"}</div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.checkIn}
            </div>
            <div className="mt-1 text-sm text-slate-900">
              {formatDate(booking.checkInDate, texts.locale)}
              {booking.checkInTime ? ` · ${booking.checkInTime}` : ""}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.checkOut}
            </div>
            <div className="mt-1 text-sm text-slate-900">
              {formatDate(booking.checkOutDate, texts.locale)}
              {booking.checkOutTime ? ` · ${booking.checkOutTime}` : ""}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.status}
            </div>
            <div className="mt-1 text-sm text-slate-900">{booking.status}</div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.createdAt}
            </div>
            <div className="mt-1 text-sm text-slate-900">
              {formatDateTime(booking.createdAt, texts.locale)}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {texts.updatedAt}
            </div>
            <div className="mt-1 text-sm text-slate-900">
              {formatDateTime(booking.updatedAt, texts.locale)}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {texts.notes}
          </div>
          <div className="mt-1 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            {booking.notes || "—"}
          </div>
        </div>

        <div className="mt-6">
          <Link
            href={`/properties/${booking.property.id}`}
            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {texts.openProperty}
          </Link>
        </div>
      </section>
    </div>
  )
}