import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiOrgAdminOnly } from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    userId: string
  }>
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiOrgAdminOnly()

    if (!access.ok) {
      return access.response
    }

    const organizationId = access.auth.organizationId!
    const { userId } = await context.params
    const body = await request.json()

    const membership = await prisma.membership.findFirst({
      where: {
        organizationId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            systemRole: true,
            isActive: true,
          },
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Ο χρήστης του οργανισμού δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (membership.user.systemRole === "SUPER_ADMIN") {
      return NextResponse.json(
        {
          error:
            "Δεν επιτρέπεται επεξεργασία κεντρικού διαχειριστή από αυτό το route.",
        },
        { status: 403 }
      )
    }

    const nextName =
      body?.name !== undefined ? String(body.name).trim() : membership.user.name ?? ""

    const nextEmail =
      body?.email !== undefined
        ? normalizeEmail(body.email)
        : membership.user.email

    if (!nextName) {
      return NextResponse.json(
        { error: "Το όνομα είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!nextEmail) {
      return NextResponse.json(
        { error: "Το email είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const existingUserWithEmail = await prisma.user.findFirst({
      where: {
        email: nextEmail,
        id: {
          not: membership.user.id,
        },
      },
      select: {
        id: true,
      },
    })

    if (existingUserWithEmail) {
      return NextResponse.json(
        { error: "Υπάρχει ήδη άλλος χρήστης με αυτό το email." },
        { status: 409 }
      )
    }

    const requestedIsActive =
      body?.isActive !== undefined ? Boolean(body.isActive) : membership.isActive

    if (
      body?.organizationRole !== undefined &&
      body.organizationRole !== "MANAGER"
    ) {
      return NextResponse.json(
        {
          error: "Από αυτή τη σελίδα επιτρέπεται μόνο διαχείριση managers.",
        },
        { status: 400 }
      )
    }

    const nextRole = membership.isPrimaryOrgAdmin ? "ORG_ADMIN" : "MANAGER"
    const nextIsActive = membership.isPrimaryOrgAdmin ? true : requestedIsActive

    const updated = await prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: {
          id: membership.id,
        },
        data: {
          role: nextRole,
          isActive: nextIsActive,
        },
      })

      await tx.user.update({
        where: {
          id: membership.user.id,
        },
        data: {
          name: nextName,
          email: nextEmail,
          isActive: nextIsActive,
        },
      })

      return tx.membership.findUnique({
        where: {
          id: membership.id,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              systemRole: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      })
    })

    return NextResponse.json({
      message: membership.isPrimaryOrgAdmin
        ? "Ο βασικός διαχειριστής ενημερώθηκε μόνο στα επιτρεπτά στοιχεία."
        : "Ο manager ενημερώθηκε επιτυχώς.",
      user: updated
        ? {
            membershipId: updated.id,
            userId: updated.user.id,
            name: updated.user.name,
            email: updated.user.email,
            systemRole: updated.user.systemRole,
            userIsActive: updated.user.isActive,
            membershipIsActive: updated.isActive,
            isActive: updated.user.isActive && updated.isActive,
            organizationRole: updated.role,
            isPrimaryOrgAdmin: updated.isPrimaryOrgAdmin,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
            userCreatedAt: updated.user.createdAt,
          }
        : null,
    })
  } catch (error) {
    console.error("PATCH /api/users/[userId] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης χρήστη οργανισμού." },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiOrgAdminOnly()

    if (!access.ok) {
      return access.response
    }

    const organizationId = access.auth.organizationId!
    const { userId } = await context.params

    const membership = await prisma.membership.findFirst({
      where: {
        organizationId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            systemRole: true,
          },
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Ο χρήστης του οργανισμού δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (membership.user.systemRole === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Δεν επιτρέπεται διαγραφή SUPER_ADMIN." },
        { status: 403 }
      )
    }

    if (membership.isPrimaryOrgAdmin) {
      return NextResponse.json(
        {
          error:
            "Ο βασικός διαχειριστής οργανισμού δεν μπορεί να διαγραφεί από αυτή τη σελίδα.",
        },
        { status: 403 }
      )
    }

    if (membership.role !== "MANAGER") {
      return NextResponse.json(
        {
          error:
            "Από αυτή τη σελίδα επιτρέπεται διαγραφή μόνο manager του οργανισμού.",
        },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.membership.delete({
        where: {
          id: membership.id,
        },
      })

      const remainingMemberships = await tx.membership.count({
        where: {
          userId: membership.user.id,
        },
      })

      if (remainingMemberships === 0) {
        await tx.user.delete({
          where: {
            id: membership.user.id,
          },
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: `Ο manager "${membership.user.name ?? membership.user.email}" διαγράφηκε επιτυχώς.`,
    })
  } catch (error) {
    console.error("DELETE /api/users/[userId] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία διαγραφής manager." },
      { status: 500 }
    )
  }
}