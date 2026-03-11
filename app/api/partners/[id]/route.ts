import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiAppAccess,
  canAccessOrganization,
} from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toStringValue(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback
  return value.trim()
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { id } = await context.params

    const partner = await prisma.partner.findFirst({
      where: {
        id,
        ...(auth.isSuperAdmin ? {} : { organizationId: auth.organizationId }),
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        assignments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        tasks: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
      },
    })

    if (!partner) {
      return NextResponse.json(
        { error: "Ο συνεργάτης δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(partner)
  } catch (error) {
    console.error("Partner GET by id error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης συνεργάτη." },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { id } = await context.params
    const body = await req.json()

    const existingPartner = await prisma.partner.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
      },
    })

    if (!existingPartner) {
      return NextResponse.json(
        { error: "Ο συνεργάτης δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existingPartner.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτόν τον συνεργάτη." },
        { status: 403 }
      )
    }

    const fullName = toStringValue(body.fullName)
    const email = toNullableString(body.email)
    const phone = toNullableString(body.phone)
    const status = toNullableString(body.status)

    if (!fullName) {
      return NextResponse.json(
        { error: "Το ονοματεπώνυμο συνεργάτη είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const updatedPartner = await prisma.partner.update({
      where: { id },
      data: {
        fullName,
        email,
        phone,
        ...(status !== null ? { status } : {}),
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    return NextResponse.json(updatedPartner)
  } catch (error) {
    console.error("Partner PUT error:", error)
    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης συνεργάτη." },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { id } = await context.params
    const body = await req.json()

    const existingPartner = await prisma.partner.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
      },
    })

    if (!existingPartner) {
      return NextResponse.json(
        { error: "Ο συνεργάτης δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existingPartner.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτόν τον συνεργάτη." },
        { status: 403 }
      )
    }

    const data: Record<string, unknown> = {}

    if (body.fullName !== undefined) data.fullName = toStringValue(body.fullName)
    if (body.email !== undefined) data.email = toNullableString(body.email)
    if (body.phone !== undefined) data.phone = toNullableString(body.phone)
    if (body.status !== undefined) data.status = toNullableString(body.status)

    const updatedPartner = await prisma.partner.update({
      where: { id },
      data,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    return NextResponse.json(updatedPartner)
  } catch (error) {
    console.error("Partner PATCH error:", error)
    return NextResponse.json(
      { error: "Αποτυχία μερικής ενημέρωσης συνεργάτη." },
      { status: 500 }
    )
  }
}