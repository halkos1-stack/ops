import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireApiUser } from "@/lib/route-access"

function toStringValue(value: unknown) {
  return String(value ?? "").trim()
}

function validateNewPassword(password: string) {
  if (password.length < 8) {
    return "Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες."
  }

  const hasLetter = /[A-Za-zΑ-Ωα-ω]/.test(password)
  const hasNumber = /\d/.test(password)

  if (!hasLetter || !hasNumber) {
    return "Ο νέος κωδικός πρέπει να περιέχει τουλάχιστον ένα γράμμα και έναν αριθμό."
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireApiUser()

    if (!access.ok) {
      return access.response
    }

    const body = await request.json()

    const currentPassword = toStringValue(body?.currentPassword)
    const newPassword = toStringValue(body?.newPassword)
    const confirmPassword = toStringValue(body?.confirmPassword)

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Όλα τα πεδία είναι υποχρεωτικά." },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Η επιβεβαίωση νέου κωδικού δεν ταιριάζει." },
        { status: 400 }
      )
    }

    const passwordValidationError = validateNewPassword(newPassword)

    if (passwordValidationError) {
      return NextResponse.json(
        { error: passwordValidationError },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: access.auth.userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        passwordHash: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Ο χρήστης δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Ο λογαριασμός είναι ανενεργός." },
        { status: 403 }
      )
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Δεν υπάρχει διαθέσιμος κωδικός για τον λογαριασμό." },
        { status: 400 }
      )
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    )

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Ο τρέχων κωδικός δεν είναι σωστός." },
        { status: 400 }
      )
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash)

    if (isSamePassword) {
      return NextResponse.json(
        { error: "Ο νέος κωδικός πρέπει να είναι διαφορετικός από τον τρέχοντα." },
        { status: 400 }
      )
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
      },
    })

    return NextResponse.json({
      message: "Ο κωδικός άλλαξε επιτυχώς.",
    })
  } catch (error) {
    console.error("POST /api/account/change-password error:", error)

    return NextResponse.json(
      { error: "Αποτυχία αλλαγής κωδικού." },
      { status: 500 }
    )
  }
}