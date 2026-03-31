import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"

function normalizeString(value: unknown) {
  return String(value ?? "").trim()
}

function toNullableString(value: unknown) {
  const text = String(value ?? "").trim()
  return text === "" ? null : text
}

function normalizePartnerStatus(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase()

  if (text === "inactive") return "inactive"
  return "active"
}

function buildPartnerCodeFromNumber(nextNumber: number) {
  return `PRT-${String(nextNumber).padStart(4, "0")}`
}

type TransactionClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">

async function generateNextPartnerCode(
  tx: TransactionClient,
  organizationId: string
) {
  const existingPartners = await tx.partner.findMany({
    where: {
      organizationId,
    },
    select: {
      code: true,
    },
  })

  let maxNumber = 0

  for (const partner of existingPartners) {
    const match = /^PRT-(\d+)$/.exec(String(partner.code || "").trim())
    if (!match) continue

    const parsed = Number(match[1])
    if (Number.isFinite(parsed) && parsed > maxNumber) {
      maxNumber = parsed
    }
  }

  return buildPartnerCodeFromNumber(maxNumber + 1)
}

export async function GET(req: NextRequest) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { searchParams } = new URL(req.url)

    const status = searchParams.get("status")
    const specialty = searchParams.get("specialty")
    const organizationIdParam = searchParams.get("organizationId")

    let organizationFilter: string | null = null

    if (auth.isSuperAdmin) {
      organizationFilter = organizationIdParam || auth.organizationId || null
    } else {
      organizationFilter = auth.organizationId || null
    }

    if (!auth.isSuperAdmin && !organizationFilter) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε οργανισμός χρήστη." },
        { status: 403 }
      )
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
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const body = await req.json()

    let organizationId: string | null = null

    if (auth.isSuperAdmin) {
      organizationId =
        normalizeString(body.organizationId) || auth.organizationId || null
    } else {
      organizationId = auth.organizationId || null
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε organizationId για δημιουργία συνεργάτη." },
        { status: 400 }
      )
    }

    if (!canAccessOrganization(auth, organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτόν τον οργανισμό." },
        { status: 403 }
      )
    }

    const name = normalizeString(body.name)
    const email = normalizeString(body.email).toLowerCase()
    const specialty = normalizeString(body.specialty)
    const phone = toNullableString(body.phone)
    const notes = toNullableString(body.notes)
    const status = normalizePartnerStatus(body.status)

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

    const partner = await prisma.$transaction(async (tx) => {
      const code = await generateNextPartnerCode(tx as TransactionClient, organizationId!)

      return tx.partner.create({
        data: {
          organizationId: organizationId!,
          code,
          name,
          email,
          phone,
          specialty,
          status,
          notes,
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