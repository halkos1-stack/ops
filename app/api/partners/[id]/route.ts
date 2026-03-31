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
        ...(auth.isSuperAdmin || !auth.organizationId
          ? {}
          : { organizationId: auth.organizationId }),
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        taskAssignments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                taskType: true,
                scheduledDate: true,
                property: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        portalAccessTokens: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        defaultProperties: {
          orderBy: {
            updatedAt: "desc",
          },
          take: 20,
          select: {
            id: true,
            code: true,
            name: true,
            city: true,
            status: true,
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
    const body = await req.json().catch(() => ({}))

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

    const name = toStringValue(body.name || body.fullName)
    const email = toStringValue(body.email)
    const phone = toNullableString(body.phone)
    const specialty = toStringValue(body.specialty)
    const status = toNullableString(body.status)
    const notes = toNullableString(body.notes)

    if (!name) {
      return NextResponse.json(
        { error: "Το όνομα συνεργάτη είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { error: "Το email συνεργάτη είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!specialty) {
      return NextResponse.json(
        { error: "Η ειδικότητα συνεργάτη είναι υποχρεωτική." },
        { status: 400 }
      )
    }

    const updatedPartner = await prisma.partner.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        specialty,
        notes,
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
    const body = await req.json().catch(() => ({}))

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

    const data: {
      name?: string
      email?: string
      phone?: string | null
      specialty?: string
      status?: string
      notes?: string | null
    } = {}

    if (body.name !== undefined || body.fullName !== undefined) {
      const name = toStringValue(body.name ?? body.fullName)
      if (!name) {
        return NextResponse.json(
          { error: "Το όνομα συνεργάτη δεν μπορεί να είναι κενό." },
          { status: 400 }
        )
      }
      data.name = name
    }

    if (body.email !== undefined) {
      const email = toStringValue(body.email)
      if (!email) {
        return NextResponse.json(
          { error: "Το email συνεργάτη δεν μπορεί να είναι κενό." },
          { status: 400 }
        )
      }
      data.email = email
    }

    if (body.phone !== undefined) {
      data.phone = toNullableString(body.phone)
    }

    if (body.specialty !== undefined) {
      const specialty = toStringValue(body.specialty)
      if (!specialty) {
        return NextResponse.json(
          { error: "Η ειδικότητα συνεργάτη δεν μπορεί να είναι κενή." },
          { status: 400 }
        )
      }
      data.specialty = specialty
    }

    if (body.status !== undefined) {
      const status = toNullableString(body.status)
      if (status !== null) {
        data.status = status
      }
    }

    if (body.notes !== undefined) {
      data.notes = toNullableString(body.notes)
    }

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