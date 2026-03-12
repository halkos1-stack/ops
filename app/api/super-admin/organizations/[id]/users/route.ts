import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireApiSuperAdmin } from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiSuperAdmin()

    if (!access.ok) {
      return access.response
    }

    const { id: organizationId } = await context.params

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Ο οργανισμός δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const memberships = await prisma.membership.findMany({
      where: {
        organizationId,
      },
      orderBy: [{ isPrimaryOrgAdmin: "desc" }, { createdAt: "desc" }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            systemRole: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    const mappedUsers = memberships.map((membership) => ({
      membershipId: membership.id,
      userId: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      systemRole: membership.user.systemRole,
      userIsActive: membership.user.isActive,
      membershipIsActive: membership.isActive,
      isActive: membership.user.isActive && membership.isActive,
      organizationRole: membership.role,
      isPrimaryOrgAdmin: membership.isPrimaryOrgAdmin,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      userCreatedAt: membership.user.createdAt,
    }))

    const primaryOrgAdmin =
      mappedUsers.find((user) => user.isPrimaryOrgAdmin) ?? null

    const users = mappedUsers.filter((user) => !user.isPrimaryOrgAdmin)

    return NextResponse.json({
      organization,
      primaryOrgAdmin,
      users,
    })
  } catch (error) {
    console.error("GET /api/super-admin/organizations/[id]/users error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης χρηστών οργανισμού." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiSuperAdmin()

    if (!access.ok) {
      return access.response
    }

    const { id: organizationId } = await context.params
    const body = await request.json()

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Ο οργανισμός δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const existingPrimary = await prisma.membership.findFirst({
      where: {
        organizationId,
        isPrimaryOrgAdmin: true,
      },
      select: {
        id: true,
        userId: true,
      },
    })

    if (existingPrimary) {
      return NextResponse.json(
        {
          error:
            "Ο οργανισμός έχει ήδη βασικό διαχειριστή. Από τη SUPER ADMIN διαχείριση επιτρέπεται μόνο ένας βασικός διαχειριστής ανά οργανισμό.",
        },
        { status: 409 }
      )
    }

    const name = String(body?.name ?? "").trim()
    const email = normalizeEmail(body?.email)
    const password = String(body?.password ?? "")
    const isActive = Boolean(body?.isActive ?? true)

    if (!name) {
      return NextResponse.json(
        { error: "Το όνομα είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { error: "Το email είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Ο προσωρινός κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες." },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
      },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "Υπάρχει ήδη χρήστης με αυτό το email. Για τον βασικό διαχειριστή χρησιμοποίησε μοναδικό email.",
        },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          systemRole: "USER",
          isActive,
        },
      })

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId,
          role: "ORG_ADMIN",
          isActive: true,
          isPrimaryOrgAdmin: true,
        },
      })

      return { user, membership }
    })

    return NextResponse.json(
      {
        message: "Ο βασικός διαχειριστής οργανισμού δημιουργήθηκε επιτυχώς.",
        user: {
          userId: created.user.id,
          membershipId: created.membership.id,
          name: created.user.name,
          email: created.user.email,
          systemRole: created.user.systemRole,
          userIsActive: created.user.isActive,
          membershipIsActive: created.membership.isActive,
          isActive: created.user.isActive && created.membership.isActive,
          organizationRole: created.membership.role,
          isPrimaryOrgAdmin: created.membership.isPrimaryOrgAdmin,
          createdAt: created.membership.createdAt,
          updatedAt: created.membership.updatedAt,
          userCreatedAt: created.user.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/super-admin/organizations/[id]/users error:", error)

    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας βασικού διαχειριστή οργανισμού." },
      { status: 500 }
    )
  }
}