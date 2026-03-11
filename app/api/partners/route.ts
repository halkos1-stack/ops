import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type AuthContext = {
  systemRole?: "SUPER_ADMIN" | "USER"
  organizationId?: string | null
}

function getMockAuthFromRequest(req: NextRequest): AuthContext {
  const systemRole = req.headers.get("x-system-role") as
    | "SUPER_ADMIN"
    | "USER"
    | null

  const organizationId = req.headers.get("x-organization-id")

  return {
    systemRole: systemRole || "SUPER_ADMIN",
    organizationId: organizationId || null,
  }
}

function normalizeString(value: unknown) {
  const text = String(value ?? "").trim()
  return text
}

function toNullableString(value: unknown) {
  const text = String(value ?? "").trim()
  return text === "" ? null : text
}

export async function GET(req: NextRequest) {
  try {
    const auth = getMockAuthFromRequest(req)
    const { searchParams } = new URL(req.url)

    const status = searchParams.get("status")
    const specialty = searchParams.get("specialty")
    const organizationIdParam = searchParams.get("organizationId")

    let organizationFilter: string | null = null

    if (auth.systemRole === "SUPER_ADMIN") {
      organizationFilter = organizationIdParam || null
    } else {
      organizationFilter = auth.organizationId || null
    }

    const partners = await prisma.partner.findMany({
      where: {
        ...(organizationFilter ? { organizationId: organizationFilter } : {}),
        ...(status && status !== "all" ? { status } : {}),
        ...(specialty && specialty !== "all" ? { specialty } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            defaultProperties: true,
            taskAssignments: true,
            activityLogs: true,
            events: true,
          },
        },
      },
    })

    return NextResponse.json(partners)
  } catch (error) {
    console.error("Partners GET error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης συνεργατών." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getMockAuthFromRequest(req)
    const body = await req.json()

    const organizationId =
      body.organizationId || auth.organizationId || null

    if (!organizationId) {
      return NextResponse.json(
        { error: "Λείπει organizationId για δημιουργία συνεργάτη." },
        { status: 400 }
      )
    }

    const code = normalizeString(body.code)
    const name = normalizeString(body.name)
    const email = normalizeString(body.email)
    const specialty = normalizeString(body.specialty)

    if (!code) {
      return NextResponse.json(
        { error: "Το πεδίο code είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { error: "Το πεδίο name είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { error: "Το πεδίο email είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!specialty) {
      return NextResponse.json(
        { error: "Το πεδίο specialty είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const existingByCode = await prisma.partner.findFirst({
      where: {
        organizationId,
        code,
      },
      select: {
        id: true,
      },
    })

    if (existingByCode) {
      return NextResponse.json(
        { error: "Υπάρχει ήδη συνεργάτης με αυτόν τον κωδικό." },
        { status: 400 }
      )
    }

    const existingByEmail = await prisma.partner.findFirst({
      where: {
        organizationId,
        email,
      },
      select: {
        id: true,
      },
    })

    if (existingByEmail) {
      return NextResponse.json(
        { error: "Υπάρχει ήδη συνεργάτης με αυτό το email." },
        { status: 400 }
      )
    }

    const partner = await prisma.partner.create({
      data: {
        organizationId,
        code,
        name,
        email,
        phone: toNullableString(body.phone),
        specialty,
        status: normalizeString(body.status) || "active",
        notes: toNullableString(body.notes),
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            defaultProperties: true,
            taskAssignments: true,
            activityLogs: true,
            events: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        partner,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Partners POST error:", error)

    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας συνεργάτη." },
      { status: 500 }
    )
  }
}