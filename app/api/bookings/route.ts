import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

    const propertyId = body.propertyId
    const sourcePlatform = body.sourcePlatform?.trim()
    const externalBookingId = body.externalBookingId?.trim() || null
    const guestName = body.guestName?.trim() || null
    const guestPhone = body.guestPhone?.trim() || null
    const guestEmail = body.guestEmail?.trim() || null
    const checkInDate = body.checkInDate
    const checkOutDate = body.checkOutDate
    const checkInTime = body.checkInTime?.trim() || null
    const checkOutTime = body.checkOutTime?.trim() || null
    const adults =
      body.adults !== "" && body.adults !== undefined ? Number(body.adults) : 1
    const children =
      body.children !== "" && body.children !== undefined
        ? Number(body.children)
        : 0
    const infants =
      body.infants !== "" && body.infants !== undefined
        ? Number(body.infants)
        : 0
    const status = body.status?.trim() || "confirmed"
    const notes = body.notes?.trim() || null

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
    })

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const booking = await prisma.booking.create({
      data: {
        propertyId,
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