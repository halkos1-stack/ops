import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import { createSecureToken } from "@/lib/tokens"

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

function getAppBaseUrl(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (envUrl) {
    return envUrl.replace(/\/+$/, "")
  }

  const origin = req.headers.get("origin")
  if (origin) {
    return origin.replace(/\/+$/, "")
  }

  const host = req.headers.get("host")
  const protocol =
    process.env.NODE_ENV === "development" ? "http" : "https"

  if (host) {
    return `${protocol}://${host}`
  }

  return "http://localhost:3000"
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
    const appBaseUrl = getAppBaseUrl(req)

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

    const partnerIds = partners.map((partner) => partner.id)
    const portalTokens = partnerIds.length
      ? await prisma.partnerPortalAccessToken.findMany({
          where: {
            partnerId: {
              in: partnerIds,
            },
            isActive: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            partnerId: true,
            token: true,
            expiresAt: true,
          },
        })
      : []

    const latestPortalByPartnerId = new Map<
      string,
      {
        token: string
        expiresAt: Date | null
      }
    >()

    for (const portalToken of portalTokens) {
      if (!latestPortalByPartnerId.has(portalToken.partnerId)) {
        latestPortalByPartnerId.set(portalToken.partnerId, {
          token: portalToken.token,
          expiresAt: portalToken.expiresAt ?? null,
        })
      }
    }

    return NextResponse.json(
      partners.map((partner) => {
        const portalAccess = latestPortalByPartnerId.get(partner.id)
        const portalUrl = portalAccess
          ? `${appBaseUrl}/partner/${portalAccess.token}`
          : null

        return {
          ...partner,
          portalToken: portalAccess?.token ?? null,
          portalUrl,
          portalTokenExpiresAt: portalAccess?.expiresAt ?? null,
        }
      })
    )
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
    const appBaseUrl = getAppBaseUrl(req)

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

    const result = await prisma.$transaction(async (tx) => {
      const code = await generateNextPartnerCode(tx as TransactionClient, organizationId!)

      const partner = await tx.partner.create({
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

      const portalAccess = await tx.partnerPortalAccessToken.create({
        data: {
          partnerId: partner.id,
          token: createSecureToken(32),
          isActive: true,
        },
        select: {
          token: true,
          expiresAt: true,
        },
      })

      return {
        partner,
        portalToken: portalAccess.token,
        portalTokenExpiresAt: portalAccess.expiresAt ?? null,
      }
    })

    return NextResponse.json(
      {
        success: true,
        partner: {
          ...result.partner,
          portalToken: result.portalToken,
          portalUrl: `${appBaseUrl}/partner/${result.portalToken}`,
          portalTokenExpiresAt: result.portalTokenExpiresAt,
        },
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
