import { NextRequest, NextResponse } from "next/server"
import { requireApiOrgAdminOnly } from "@/lib/route-access"
import { prisma } from "@/lib/prisma"
import { sendMailSafe } from "@/lib/mailer"

async function readJsonSafely(request: NextRequest) {
  const text = await request.text()

  if (!text || !text.trim()) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error("Μη έγκυρα δεδομένα φόρμας επικοινωνίας.")
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireApiOrgAdminOnly()

    if (!access.ok) {
      return access.response
    }

    const organizationId = access.auth.organizationId!
    const requesterEmail = access.auth.email || "άγνωστο@email"
    const requesterName = access.auth.name || "Διαχειριστής οργανισμού"

    const body = await readJsonSafely(request)

    const subject = String(body?.subject ?? "").trim()
    const message = String(body?.message ?? "").trim()

    if (!subject) {
      return NextResponse.json(
        { error: "Το θέμα είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!message) {
      return NextResponse.json(
        { error: "Το μήνυμα είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Ο οργανισμός δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const supportEmail = process.env.SUPPORT_EMAIL || "admin@ops.local"

    const text = [
      `Νέο μήνυμα προς την υποστήριξη πλατφόρμας`,
      ``,
      `Οργανισμός: ${organization.name}`,
      `Slug οργανισμού: ${organization.slug}`,
      `Αποστολέας: ${requesterName}`,
      `Email αποστολέα: ${requesterEmail}`,
      ``,
      `Θέμα: ${subject}`,
      ``,
      `Μήνυμα:`,
      message,
    ].join("\n")

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin-bottom:8px;">Νέο μήνυμα προς την υποστήριξη πλατφόρμας</h2>
        <p><strong>Οργανισμός:</strong> ${organization.name}</p>
        <p><strong>Slug οργανισμού:</strong> ${organization.slug}</p>
        <p><strong>Αποστολέας:</strong> ${requesterName}</p>
        <p><strong>Email αποστολέα:</strong> ${requesterEmail}</p>
        <p><strong>Θέμα:</strong> ${subject}</p>
        <div style="margin-top:16px;padding:16px;border:1px solid #cbd5e1;border-radius:12px;background:#ffffff;">
          <p style="margin:0 0 8px 0;"><strong>Μήνυμα:</strong></p>
          <p style="white-space:pre-wrap;margin:0;">${message}</p>
        </div>
      </div>
    `

    const mailResult = await sendMailSafe({
      to: supportEmail,
      subject: `Μήνυμα υποστήριξης – ${organization.name} – ${subject}`,
      html,
      text,
    })

    return NextResponse.json({
      sent: mailResult.sent,
      message: mailResult.sent
        ? "Το μήνυμα προς την υποστήριξη στάλθηκε επιτυχώς."
        : "Το μήνυμα καταγράφηκε, αλλά δεν στάλθηκε email επειδή το SMTP δεν είναι ρυθμισμένο.",
      reason: mailResult.sent ? null : mailResult.reason,
    })
  } catch (error) {
    console.error("POST /api/users/support-contact error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία αποστολής μηνύματος προς την υποστήριξη."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}