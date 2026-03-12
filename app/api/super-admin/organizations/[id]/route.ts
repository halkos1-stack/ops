import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiSuperAdmin } from "@/lib/route-access"

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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function createUniqueSlug(baseValue: string, excludeId?: string) {
  const baseSlug = slugify(baseValue)

  if (!baseSlug) {
    throw new Error("Δεν ήταν δυνατή η δημιουργία έγκυρου slug.")
  }

  const existing = await prisma.organization.findFirst({
    where: {
      slug: baseSlug,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  })

  if (!existing) {
    return baseSlug
  }

  let counter = 2

  while (true) {
    const candidate = `${baseSlug}-${counter}`

    const found = await prisma.organization.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    })

    if (!found) {
      return candidate
    }

    counter += 1
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiSuperAdmin()

    if (!access.ok) {
      return access.response
    }

    const { id } = await context.params

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            memberships: true,
            properties: true,
            partners: true,
            tasks: true,
            issues: true,
            events: true,
            bookings: true,
            checklistTemplates: true,
            settings: true,
          },
        },
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Ο οργανισμός δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(organization)
  } catch (error) {
    console.error("GET /api/super-admin/organizations/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης οργανισμού." },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiSuperAdmin()

    if (!access.ok) {
      return access.response
    }

    const { id } = await context.params
    const body = await request.json()

    const existing = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Ο οργανισμός δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const name =
      body?.name !== undefined ? String(body.name).trim() : existing.name

    if (!name) {
      return NextResponse.json(
        { error: "Το όνομα οργανισμού είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const requestedSlug = toNullableString(body?.slug)
    const isActive =
      body?.isActive !== undefined ? Boolean(body.isActive) : existing.isActive

    const finalSlug =
      requestedSlug !== null
        ? await createUniqueSlug(requestedSlug, id)
        : existing.slug

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        name,
        slug: finalSlug,
        isActive,
      },
      include: {
        _count: {
          select: {
            memberships: true,
            properties: true,
            partners: true,
            tasks: true,
            issues: true,
            events: true,
            bookings: true,
            checklistTemplates: true,
            settings: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PATCH /api/super-admin/organizations/[id] error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία ενημέρωσης οργανισμού."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiSuperAdmin()

    if (!access.ok) {
      return access.response
    }

    const { id } = await context.params

    const existing = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Ο οργανισμός δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const membershipUsers = await prisma.membership.findMany({
      where: {
        organizationId: id,
      },
      select: {
        userId: true,
      },
    })

    const affectedUserIds = membershipUsers.map((item) => item.userId)

    await prisma.$transaction(async (tx) => {
      await tx.organization.delete({
        where: {
          id,
        },
      })

      if (affectedUserIds.length > 0) {
        const usersMembershipCount = await tx.membership.groupBy({
          by: ["userId"],
          where: {
            userId: {
              in: affectedUserIds,
            },
          },
          _count: {
            userId: true,
          },
        })

        const usersStillLinked = new Set(
          usersMembershipCount.map((item) => item.userId)
        )

        const orphanUserIds = affectedUserIds.filter(
          (userId) => !usersStillLinked.has(userId)
        )

        if (orphanUserIds.length > 0) {
          await tx.user.deleteMany({
            where: {
              id: {
                in: orphanUserIds,
              },
              systemRole: "USER",
            },
          })
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Ο οργανισμός "${existing.name}" διαγράφηκε επιτυχώς.`,
    })
  } catch (error) {
    console.error("DELETE /api/super-admin/organizations/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία διαγραφής οργανισμού." },
      { status: 500 }
    )
  }
}