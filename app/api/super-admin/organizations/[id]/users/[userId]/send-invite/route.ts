import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiSuperAdmin } from "@/lib/route-access"
import {
  createFreshActivationTokenForUser,
  getOrganizationRoleLabel,
  sendOrganizationUserActivationEmail,
} from "@/lib/activation"

type RouteContext = {
  params: Promise<{
    id: string
    userId: string
  }>
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const access = await requireApiSuperAdmin()

    if (!access.ok) {
      return access.response
    }

    const { id: organizationId, userId } = await context.params

    const membership = await prisma.membership.findFirst({
      where: {
        organizationId,
        userId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
            "Δεν επιτρέπεται αποστολή πρόσκλησης σε SUPER_ADMIN από αυτό το route.",
        },
        { status: 400 }
      )
    }

    if (!membership.organization.isActive) {
      return NextResponse.json(
        { error: "Ο οργανισμός είναι ανενεργός." },
        { status: 400 }
      )
    }

    if (!membership.user.isActive || !membership.isActive) {
      return NextResponse.json(
        { error: "Ο χρήστης ή η πρόσβασή του είναι ανενεργή." },
        { status: 400 }
      )
    }

    const created = await createFreshActivationTokenForUser(membership.user.id)

    const persistedToken = await prisma.userActivationToken.findUnique({
      where: {
        token: created.token,
      },
      select: {
        id: true,
        token: true,
        userId: true,
        expiresAt: true,
        createdAt: true,
        usedAt: true,
      },
    })

    if (!persistedToken) {
      throw new Error(
        "Το activation token δεν βρέθηκε στη βάση μετά τη δημιουργία του."
      )
    }

    const mailResult = await sendOrganizationUserActivationEmail({
      to: membership.user.email,
      userName: membership.user.name,
      organizationName: membership.organization.name,
      activationUrl: created.activationUrl,
      roleLabel: getOrganizationRoleLabel(membership.role),
    })

    return NextResponse.json({
      message: mailResult.sent
        ? "Η πρόσκληση στάλθηκε επιτυχώς."
        : "Η πρόσκληση δημιουργήθηκε, αλλά δεν στάλθηκε email επειδή το SMTP δεν είναι ρυθμισμένο.",
      sent: mailResult.sent,
      reason: mailResult.sent ? null : mailResult.reason,
      expiresAt: created.expiresAt,
      activationUrl: mailResult.sent ? null : created.activationUrl,
      tokenRecordId: persistedToken.id,
      tokenPersisted: true,
    })
  } catch (error) {
    console.error(
      "POST /api/super-admin/organizations/[id]/users/[userId]/send-invite error:",
      error
    )

    return NextResponse.json(
      { error: "Αποτυχία αποστολής πρόσκλησης ενεργοποίησης." },
      { status: 500 }
    )
  }
}