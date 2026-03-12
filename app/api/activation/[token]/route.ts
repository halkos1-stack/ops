import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    token: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params

    const activation = await prisma.userActivationToken.findUnique({
      where: {
        token,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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

    return NextResponse.json({
      valid: true,
      token: activation.token,
      expiresAt: activation.expiresAt,
      user: {
        id: activation.user.id,
        name: activation.user.name,
        email: activation.user.email,
      },
      organization: {
        id: activeMembership.organization.id,
        name: activeMembership.organization.name,
      },
    })
  } catch (error) {
    console.error("GET /api/activation/[token] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία ελέγχου activation token." },
      { status: 500 }
    )
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Η μέθοδος POST δεν επιτρέπεται σε αυτό το route. Χρησιμοποίησε το /api/activation/[token]/complete.",
    },
    { status: 405 }
  )
}