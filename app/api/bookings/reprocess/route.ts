import { NextRequest, NextResponse } from "next/server"
import { requireApiAppAccessWithDevBypass } from "@/lib/dev-api-access"
import {
  reprocessBookingById,
  reprocessBookingsForMapping,
} from "@/lib/bookings/booking-service"

export async function POST(req: NextRequest) {
  const access = await requireApiAppAccessWithDevBypass(req)
  if (!access.ok) return access.response

  try {
    const body = await req.json()

    if (body.bookingId) {
      const result = await reprocessBookingById(String(body.bookingId))

      return NextResponse.json({
        success: true,
        mode: "single",
        booking: result.booking,
      })
    }

    const organizationId =
      access.auth.isSuperAdmin && body.organizationId
        ? String(body.organizationId)
        : access.auth.organizationId

    const sourcePlatform = String(body.sourcePlatform || "").trim().toLowerCase()
    const externalListingId = String(body.externalListingId || "").trim()

    if (!organizationId || !sourcePlatform || !externalListingId) {
      return NextResponse.json(
        {
          error:
            "Για μαζικό reprocess απαιτούνται organizationId, sourcePlatform και externalListingId.",
        },
        { status: 400 }
      )
    }

    const result = await reprocessBookingsForMapping({
      organizationId,
      sourcePlatform,
      externalListingId,
    })

    return NextResponse.json({
      success: true,
      mode: "mapping",
      result,
    })
  } catch (error) {
    console.error("Bookings reprocess POST error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία επανεπεξεργασίας κράτησης.",
      },
      { status: 500 }
    )
  }
}