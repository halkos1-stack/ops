import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireApiOrgAdminOnly } from "@/lib/route-access"

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

export async function GET() {
  try {
    const access = await requireApiOrgAdminOnly()

    if (!access.ok) {
      return access.response
    }

    const organizationId = access.auth.organizationId!

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
        user: {
          systemRole: {
            not: "SUPER_ADMIN",
          },
        },
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
      supportContact: {
        email: process.env.SUPPORT_EMAIL || "admin@ops.local",
        label: "Υποστήριξη πλατφόρμας",
      },
    })
  } catch (error) {
    console.error("GET /api/users error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης χρηστών οργανισμού." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireApiOrgAdminOnly()

    if (!access.ok) {
      return access.response
    }

    const organizationId = access.auth.organizationId!
    const body = await request.json()

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Ο οργανισμός δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!organization.isActive) {
      return NextResponse.json(
        { error: "Ο οργανισμός είναι ανενεργός." },
        { status: 403 }
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
        {
          error:
            "Ο κωδικός πρώτης εισόδου πρέπει να έχει τουλάχιστον 6 χαρακτήρες.",
        },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Υπάρχει ήδη χρήστης με αυτό το email." },
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
          role: "MANAGER",
          isActive,
          isPrimaryOrgAdmin: false,
        },
      })

      return { user, membership }
    })

    return NextResponse.json(
      {
        message: "Ο manager δημιουργήθηκε επιτυχώς.",
        user: {
          membershipId: created.membership.id,
          userId: created.user.id,
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
    console.error("POST /api/users error:", error)

    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας manager." },
      { status: 500 }
    )
  }
}