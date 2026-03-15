import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import { createSecureToken } from "@/lib/tokens"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function getAppBaseUrl(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (envUrl) return envUrl.replace(/\/+$/, "")

  const origin = req.headers.get("origin")
  if (origin) return origin.replace(/\/+$/, "")

  const host = req.headers.get("host")
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https"

  if (host) return `${protocol}://${host}`

  return "http://localhost:3000"
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { id } = await context.params

    const partner = await prisma.partner.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        portalAccessTokens: {
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            token: true,
            isActive: true,
            expiresAt: true,
            createdAt: true,
            lastUsedAt: true,
          },
        },
      },
    })

    if (!partner) {
      return NextResponse.json(
        { error: "Ο συνεργάτης δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, partner.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτόν τον συνεργάτη." },
        { status: 403 }
      )
    }

    const appBaseUrl = getAppBaseUrl(req)
    const existingToken = partner.portalAccessTokens[0] || null

    return NextResponse.json({
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
      },
      portalAccess: existingToken
        ? {
            id: existingToken.id,
            token: existingToken.token,
            isActive: existingToken.isActive,
            expiresAt: existingToken.expiresAt,
            createdAt: existingToken.createdAt,
            lastUsedAt: existingToken.lastUsedAt,
            portalUrl: `${appBaseUrl}/partner/${existingToken.token}`,
          }
        : null,
    })
  } catch (error) {
    console.error("GET /api/partners/[id]/portal-link error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης portal link συνεργάτη." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { id } = await context.params

    const partner = await prisma.partner.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
      },
    })

    if (!partner) {
      return NextResponse.json(
        { error: "Ο συνεργάτης δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, partner.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτόν τον συνεργάτη." },
        { status: 403 }
      )
    }

    const token = createSecureToken(32)
    const appBaseUrl = getAppBaseUrl(req)

    await prisma.partnerPortalAccessToken.updateMany({
      where: {
        partnerId: partner.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    })

    const portalAccess = await prisma.partnerPortalAccessToken.create({
      data: {
        partnerId: partner.id,
        token,
        isActive: true,
      },
      select: {
        id: true,
        token: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        lastUsedAt: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
        },
        portalAccess: {
          ...portalAccess,
          portalUrl: `${appBaseUrl}/partner/${portalAccess.token}`,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/partners/[id]/portal-link error:", error)

    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας portal link συνεργάτη." },
      { status: 500 }
    )
  }
}