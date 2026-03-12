import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiOrgAdminOnly } from "@/lib/route-access"
import {
  createFreshActivationTokenForUser,
  getOrganizationRoleLabel,
  sendOrganizationUserActivationEmail,
} from "@/lib/activation"

type RouteContext = {
  params: Promise<{
    userId: string
  }>
}

export async function POST(_request: Request, context: RouteContext) {
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
            "Δεν επιτρέπεται αποστολή πρόσκλησης σε κεντρικό διαχειριστή από αυτό το route.",
        },
        { status: 403 }
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

    const verify = await prisma.userActivationToken.findUnique({
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

    if (!verify) {
      throw new Error(
        "Το activation token δεν αποθηκεύτηκε σωστά στη βάση."
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
        ? "Η πρόσκληση ενεργοποίησης στάλθηκε επιτυχώς."
        : "Η πρόσκληση δημιουργήθηκε, αλλά δεν στάλθηκε email επειδή το SMTP δεν είναι ρυθμισμένο.",
      sent: mailResult.sent,
      reason: mailResult.sent ? null : mailResult.reason,
      activationUrl: mailResult.sent ? null : created.activationUrl,
      expiresAt: created.expiresAt,
      tokenPersisted: true,
      tokenRecordId: verify.id,
    })
  } catch (error) {
    console.error("POST /api/users/[userId]/send-invite error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία αποστολής πρόσκλησης ενεργοποίησης."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}