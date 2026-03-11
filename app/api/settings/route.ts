import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const settings = await prisma.settings.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    })

    if (!settings) {
      return NextResponse.json({
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
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const companyName = body.companyName?.trim()
    const companyEmail = body.companyEmail?.trim()
    const companyPhone = body.companyPhone?.trim() || ""
    const companyAddress = body.companyAddress?.trim() || ""
    const defaultTaskStatus = body.defaultTaskStatus?.trim() || "pending"
    const defaultPartnerStatus = body.defaultPartnerStatus?.trim() || "active"
    const timezone = body.timezone?.trim() || "Europe/Athens"
    const language = body.language?.trim() || "el"
    const notificationsEnabled =
      typeof body.notificationsEnabled === "boolean"
        ? body.notificationsEnabled
        : true
    const calendarDefaultView = body.calendarDefaultView?.trim() || "month"

    if (!companyName || !companyEmail) {
      return NextResponse.json(
        { error: "Company name and company email are required" },
        { status: 400 }
      )
    }

    const existingSettings = await prisma.settings.findFirst({
      orderBy: {
        createdAt: "asc",
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
      { error: "Failed to save settings" },
      { status: 500 }
    )
  }
}