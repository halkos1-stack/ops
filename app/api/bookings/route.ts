import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toStringValue(value: unknown, fallback = "") {
  if (value === undefined || value === null) return fallback
  return String(value).trim()
}

function toNumberValue(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        property: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error("Get bookings error:", error)

    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const propertyId = toStringValue(body.propertyId)
    const sourcePlatform = toStringValue(body.sourcePlatform)
    const externalBookingId = toNullableString(body.externalBookingId)
    const guestName = toNullableString(body.guestName)
    const guestPhone = toNullableString(body.guestPhone)
    const guestEmail = toNullableString(body.guestEmail)
    const checkInDate = toStringValue(body.checkInDate)
    const checkOutDate = toStringValue(body.checkOutDate)
    const checkInTime = toNullableString(body.checkInTime)
    const checkOutTime = toNullableString(body.checkOutTime)
    const adults = toNumberValue(body.adults, 1)
    const children = toNumberValue(body.children, 0)
    const infants = toNumberValue(body.infants, 0)
    const status = toStringValue(body.status, "confirmed")
    const notes = toNullableString(body.notes)

    if (!propertyId || !sourcePlatform || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        {
          error:
            "Ακίνητο, πλατφόρμα, check-in και check-out είναι υποχρεωτικά.",
        },
        { status: 400 }
      )
    }

    const property = await prisma.property.findUnique({
      where: {
        id: propertyId,
      },
      select: {
        id: true,
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const booking = await prisma.booking.create({
      data: {
        property: {
          connect: {
            id: propertyId,
          },
        },
        sourcePlatform,
        externalBookingId,
        guestName,
        guestPhone,
        guestEmail,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        checkInTime,
        checkOutTime,
        adults,
        children,
        infants,
        status,
        notes,
        importedAt: sourcePlatform === "manual" ? null : new Date(),
      },
      include: {
        property: true,
      },
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error("Create booking error:", error)

    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    )
  }
}