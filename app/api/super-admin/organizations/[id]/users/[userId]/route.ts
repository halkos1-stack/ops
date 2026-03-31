import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireApiSuperAdmin } from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    id: string
    userId: string
  }>
}

type OrganizationRole = "ORG_ADMIN" | "MANAGER" | "PARTNER"

function toNullableString(value: unknown) {
  if (value === undefined || value === null) {
    return null
  }

  const text = String(value).trim()
  return text === "" ? null : text
}

function toRequiredString(value: unknown) {
  return String(value ?? "").trim()
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

function normalizeOrganizationRole(value: unknown): OrganizationRole | null {
  if (value === "ORG_ADMIN") return "ORG_ADMIN"
  if (value === "MANAGER") return "MANAGER"
  if (value === "PARTNER") return "PARTNER"
  return null
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiSuperAdmin()

    if (!access.ok) {
      return access.response
    }

    const { id: organizationId, userId } = await context.params
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
            createdAt: true,
            updatedAt: true,
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
        { error: "Δεν επιτρέπεται επεξεργασία SUPER_ADMIN από αυτό το route." },
        { status: 400 }
      )
    }

    const nextName =
      body?.name !== undefined
        ? toRequiredString(body.name)
        : membership.user.name ?? ""

    if (!nextName) {
      return NextResponse.json(
        { error: "Το ονοματεπώνυμο είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const nextEmail =
      body?.email !== undefined
        ? normalizeEmail(body.email)
        : membership.user.email

    if (!nextEmail) {
      return NextResponse.json(
        { error: "Το email είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (nextEmail !== membership.user.email) {
      const existingUserWithEmail = await prisma.user.findUnique({
        where: {
          email: nextEmail,
        },
        select: {
          id: true,
        },
      })

      if (existingUserWithEmail && existingUserWithEmail.id !== membership.user.id) {
        return NextResponse.json(
          { error: "Υπάρχει ήδη άλλος χρήστης με αυτό το email." },
          { status: 409 }
        )
      }
    }

    const requestedRole =
      body?.organizationRole !== undefined
        ? normalizeOrganizationRole(body.organizationRole)
        : undefined

    const requestedIsActive =
      body?.isActive !== undefined ? Boolean(body.isActive) : undefined

    const temporaryPassword = toNullableString(body?.temporaryPassword)

    if (temporaryPassword !== null && temporaryPassword.length < 6) {
      return NextResponse.json(
        { error: "Ο νέος προσωρινός κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες." },
        { status: 400 }
      )
    }

    if (membership.isPrimaryOrgAdmin) {
      if (requestedRole !== undefined && requestedRole !== membership.role) {
        return NextResponse.json(
          {
            error:
              "Ο βασικός διαχειριστής οργανισμού δεν μπορεί να αλλάξει ρόλο.",
          },
          { status: 400 }
        )
      }

      if (
        requestedIsActive !== undefined &&
        requestedIsActive !== membership.isActive
      ) {
        return NextResponse.json(
          {
            error:
              "Ο βασικός διαχειριστής οργανισμού δεν μπορεί να απενεργοποιηθεί από τον οργανισμό.",
          },
          { status: 400 }
        )
      }
    } else {
      if (requestedRole !== undefined) {
        if (requestedRole === "ORG_ADMIN") {
          return NextResponse.json(
            {
              error:
                "Δεν επιτρέπεται δημιουργία ή μετατροπή δεύτερου χρήστη σε διαχειριστή οργανισμού.",
            },
            { status: 400 }
          )
        }

        if (requestedRole === "PARTNER") {
          return NextResponse.json(
            {
              error:
                "Οι συνεργάτες δεν διαχειρίζονται από τη σελίδα χρηστών οργανισμού.",
            },
            { status: 400 }
          )
        }
      }
    }

    const nextRole =
      membership.isPrimaryOrgAdmin
        ? membership.role
        : requestedRole !== undefined
          ? requestedRole
          : membership.role

    const nextMembershipIsActive =
      membership.isPrimaryOrgAdmin
        ? membership.isActive
        : requestedIsActive !== undefined
          ? requestedIsActive
          : membership.isActive

    const nextUserIsActive =
      membership.isPrimaryOrgAdmin
        ? membership.user.isActive
        : requestedIsActive !== undefined
          ? requestedIsActive
          : membership.user.isActive

    const updated = await prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: {
          id: membership.id,
        },
        data: {
          role: nextRole,
          isActive: nextMembershipIsActive,
        },
      })

      await tx.user.update({
        where: {
          id: membership.user.id,
        },
        data: {
          name: nextName,
          email: nextEmail,
          isActive: nextUserIsActive,
          ...(temporaryPassword
            ? {
                passwordHash: await bcrypt.hash(temporaryPassword, 10),
              }
            : {}),
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

    if (!updated) {
      return NextResponse.json(
        { error: "Αποτυχία ανάγνωσης του ενημερωμένου χρήστη." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: updated.isPrimaryOrgAdmin
        ? "Ο βασικός διαχειριστής οργανισμού ενημερώθηκε επιτυχώς."
        : "Ο χρήστης ενημερώθηκε επιτυχώς.",
      user: {
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
        userUpdatedAt: updated.user.updatedAt,
      },
    })
  } catch (error) {
    console.error(
      "PATCH /api/super-admin/organizations/[id]/users/[userId] error:",
      error
    )

    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης χρήστη οργανισμού." },
      { status: 500 }
    )
  }
}