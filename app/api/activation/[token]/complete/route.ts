import bcrypt from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    token: string
  }>
}

function toStringValue(value: unknown) {
  return String(value ?? "").trim()
}

function validateNewPassword(password: string) {
  if (password.length < 8) {
    return "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες."
  }

  const hasLetter = /[A-Za-zΑ-Ωα-ω]/.test(password)
  const hasNumber = /\d/.test(password)

  if (!hasLetter || !hasNumber) {
    return "Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα γράμμα και έναν αριθμό."
  }

  return null
}

export async function GET() {
  return NextResponse.json(
    { error: "Η μέθοδος GET δεν επιτρέπεται σε αυτό το route." },
    { status: 405 }
  )
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    const body = await request.json()

    const newPassword = toStringValue(body?.newPassword)
    const confirmPassword = toStringValue(body?.confirmPassword)

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Όλα τα πεδία είναι υποχρεωτικά." },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Η επιβεβαίωση κωδικού δεν ταιριάζει." },
        { status: 400 }
      )
    }

    const validationError = validateNewPassword(newPassword)

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      )
    }

    const activation = await prisma.userActivationToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
            memberships: {
              where: {
                isActive: true,
              },
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    isActive: true,
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    })

    if (!activation) {
      return NextResponse.json(
        { error: "Μη έγκυρο link ενεργοποίησης." },
        { status: 404 }
      )
    }

    if (activation.usedAt) {
      return NextResponse.json(
        { error: "Το link ενεργοποίησης έχει ήδη χρησιμοποιηθεί." },
        { status: 400 }
      )
    }

    if (activation.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Το link ενεργοποίησης έχει λήξει." },
        { status: 400 }
      )
    }

    const activeMembership = activation.user.memberships.find(
      (membership) => membership.organization.isActive
    )

    if (!activeMembership) {
      return NextResponse.json(
        {
          error:
            "Δεν υπάρχει ενεργή πρόσβαση σε ενεργό οργανισμό για αυτόν τον χρήστη.",
        },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: activation.user.id,
        },
        data: {
          passwordHash,
          isActive: true,
        },
      })

      await tx.membership.updateMany({
        where: {
          userId: activation.user.id,
          organizationId: activeMembership.organization.id,
        },
        data: {
          isActive: true,
        },
      })

      await tx.userActivationToken.update({
        where: {
          id: activation.id,
        },
        data: {
          usedAt: new Date(),
        },
      })
    })

    return NextResponse.json({
      message: "Ο λογαριασμός ενεργοποιήθηκε επιτυχώς.",
    })
  } catch (error) {
    console.error("POST /api/activation/[token]/complete error:", error)

    return NextResponse.json(
      { error: "Αποτυχία ενεργοποίησης λογαριασμού." },
      { status: 500 }
    )
  }
}