import { NextRequest, NextResponse } from "next/server"
import { requireApiAppAccessWithDevBypass } from "@/lib/dev-api-access"
import {
  normalizeBookingInput,
  normalizeCancelInput,
} from "@/lib/bookings/booking-normalizers"
import {
  cancelBookingByExternalKey,
  upsertBookingFromNormalizedInput,
} from "@/lib/bookings/booking-service"

export async function POST(req: NextRequest) {
  const access = await requireApiAppAccessWithDevBypass(req)
  if (!access.ok) return access.response

  try {
    const body = await req.json()

    const organizationId =
      access.auth.isSuperAdmin && body.organizationId
        ? String(body.organizationId)
        : access.auth.organizationId

    if (!organizationId) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε organizationId για import κράτησης." },
        { status: 400 }
      )
    }

    const mode = String(body.mode || "upsert").toLowerCase()

    if (mode === "cancel") {
      const normalized = normalizeCancelInput(body, organizationId)

      const result = await cancelBookingByExternalKey({
        organizationId: normalized.organizationId,
        sourcePlatform: normalized.sourcePlatform,
        externalBookingId: normalized.externalBookingId,
        sourceUpdatedAt: normalized.sourceUpdatedAt ?? null,
        rawPayload: normalized.rawPayload,
      })

      return NextResponse.json({
        success: true,
        mode,
        booking: result.booking,
      })
    }

    const normalized = normalizeBookingInput(body, organizationId)

    const result = await upsertBookingFromNormalizedInput({
      ...normalized,
      isManual: false,
    })

    return NextResponse.json({
      success: true,
      mode: "upsert",
      booking: result.booking,
    })
  } catch (error) {
    console.error("Bookings import POST error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία εισαγωγής κράτησης.",
      },
      { status: 500 }
    )
  }
}