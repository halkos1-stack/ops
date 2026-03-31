import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess } from "@/lib/route-access"

function toText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback
  return value.trim()
}

export async function GET() {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access

    if (!auth.organizationId) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε οργανισμός χρήστη." },
        { status: 400 }
      )
    }

    const settings = await prisma.settings.findUnique({
      where: {
        organizationId: auth.organizationId,
      },
    })

    if (!settings) {
      return NextResponse.json({
        organizationId: auth.organizationId,
        companyName: "",
        companyEmail: "",
        companyPhone: "",
        companyAddress: "",
        defaultTaskStatus: "pending",
        defaultPartnerStatus: "active",
        timezone: "Europe/Athens",
        language: "el",
        notificationsEnabled: true,
        calendarDefaultView: "month",
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Get settings error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης ρυθμίσεων." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access

    if (!auth.organizationId) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε οργανισμός χρήστη." },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({}))

    const companyName = toText(body.companyName)
    const companyEmail = toText(body.companyEmail)
    const companyPhone = toText(body.companyPhone)
    const companyAddress = toText(body.companyAddress)
    const defaultTaskStatus = toText(body.defaultTaskStatus, "pending")
    const defaultPartnerStatus = toText(body.defaultPartnerStatus, "active")
    const timezone = toText(body.timezone, "Europe/Athens")
    const language = toText(body.language, "el")
    const notificationsEnabled =
      typeof body.notificationsEnabled === "boolean"
        ? body.notificationsEnabled
        : true
    const calendarDefaultView = toText(body.calendarDefaultView, "month")

    if (!companyName || !companyEmail) {
      return NextResponse.json(
        { error: "Το όνομα εταιρείας και το email εταιρείας είναι υποχρεωτικά." },
        { status: 400 }
      )
    }

    const existingSettings = await prisma.settings.findUnique({
      where: {
        organizationId: auth.organizationId,
      },
    })

    if (existingSettings) {
      const updatedSettings = await prisma.settings.update({
        where: {
          id: existingSettings.id,
        },
        data: {
          companyName,
          companyEmail,
          companyPhone,
          companyAddress,
          defaultTaskStatus,
          defaultPartnerStatus,
          timezone,
          language,
          notificationsEnabled,
          calendarDefaultView,
        },
      })

      return NextResponse.json(updatedSettings)
    }

    const createdSettings = await prisma.settings.create({
      data: {
        organizationId: auth.organizationId,
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
        defaultTaskStatus,
        defaultPartnerStatus,
        timezone,
        language,
        notificationsEnabled,
        calendarDefaultView,
      },
    })

    return NextResponse.json(createdSettings, { status: 201 })
  } catch (error) {
    console.error("Save settings error:", error)

    return NextResponse.json(
      { error: "Αποτυχία αποθήκευσης ρυθμίσεων." },
      { status: 500 }
    )
  }
}