import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendMailSafe } from "@/lib/mailer"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"

type RouteContext = {
  params: Promise<{
    taskId: string
  }>
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null

  const text = String(value).trim()
  return text === "" ? null : text
}

function isOpenTaskStatus(status?: string | null) {
  const value = String(status || "").toLowerCase()
  return ["pending", "assigned", "accepted", "in_progress"].includes(value)
}

function mergeCancellationReason(
  existingResultNotes: string | null | undefined,
  reason: string | null
) {
  const timestamp = new Date().toISOString()
  const note = reason
    ? `[${timestamp}] Η εργασία ακυρώθηκε. Αιτία: ${reason}`
    : `[${timestamp}] Η εργασία ακυρώθηκε.`

  const current = String(existingResultNotes || "").trim()
  if (!current) return note

  return `${current}\n\n${note}`
}

function mergeAssignmentCancellationNote(
  existingNotes: string | null | undefined,
  reason: string | null
) {
  const timestamp = new Date().toISOString()
  const note = reason
    ? `[${timestamp}] Η συνδεδεμένη εργασία ακυρώθηκε από τον διαχειριστή. Αιτία: ${reason}`
    : `[${timestamp}] Η συνδεδεμένη εργασία ακυρώθηκε από τον διαχειριστή.`

  const current = String(existingNotes || "").trim()
  if (!current) return note

  return `${current}\n\n${note}`
}

function getAppBaseUrl(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (envUrl) {
    return envUrl.replace(/\/+$/, "")
  }

  const origin = req.headers.get("origin")
  if (origin) {
    return origin.replace(/\/+$/, "")
  }

  const host = req.headers.get("host")
  const protocol =
    process.env.NODE_ENV === "development" ? "http" : "https"

  if (host) {
    return `${protocol}://${host}`
  }

  return "http://localhost:3000"
}

async function sendCancellationEmail(params: {
  req: NextRequest
  partnerEmail?: string | null
  partnerName?: string | null
  propertyName?: string | null
  taskTitle?: string | null
  scheduledDate?: Date | string | null
  portalToken?: string | null
  reason?: string | null
}) {
  const {
    req,
    partnerEmail,
    partnerName,
    propertyName,
    taskTitle,
    scheduledDate,
    portalToken,
    reason,
  } = params

  if (!partnerEmail) return

  const cleanBaseUrl = getAppBaseUrl(req)
  const portalUrl = portalToken
    ? `${cleanBaseUrl}/partner/${portalToken}`
    : null

  const dateText = scheduledDate
    ? new Intl.DateTimeFormat("el-GR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(scheduledDate))
    : "—"

  const safePartnerName = partnerName || "συνεργάτη"
  const safeTaskTitle = taskTitle || "Εργασία"
  const safePropertyName = propertyName || "—"
  const safeReason = reason || "Δεν δόθηκε αιτία."

  const subject = `Ακύρωση εργασίας: ${safeTaskTitle}`

  const text = [
    `Γεια σου ${safePartnerName},`,
    "",
    "Η παρακάτω εργασία ακυρώθηκε από τον διαχειριστή:",
    `- Εργασία: ${safeTaskTitle}`,
    `- Ακίνητο: ${safePropertyName}`,
    `- Ημερομηνία: ${dateText}`,
    `- Αιτία: ${safeReason}`,
    "",
    portalUrl ? `Portal συνεργάτη: ${portalUrl}` : null,
    "",
    "Δεν απαιτείται πλέον καμία ενέργεια για αυτή την εργασία.",
  ]
    .filter(Boolean)
    .join("\n")

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #0f172a;">
      <p>Γεια σου ${safePartnerName},</p>
      <p>Η παρακάτω εργασία <strong>ακυρώθηκε</strong> από τον διαχειριστή:</p>
      <ul>
        <li><strong>Εργασία:</strong> ${safeTaskTitle}</li>
        <li><strong>Ακίνητο:</strong> ${safePropertyName}</li>
        <li><strong>Ημερομηνία:</strong> ${dateText}</li>
        <li><strong>Αιτία:</strong> ${safeReason}</li>
      </ul>
      ${
        portalUrl
          ? `<p><a href="${portalUrl}" target="_blank" rel="noopener noreferrer">Άνοιγμα portal συνεργάτη</a></p>`
          : ""
      }
      <p>Δεν απαιτείται πλέον καμία ενέργεια για αυτή την εργασία.</p>
    </div>
  `

  try {
    await sendMailSafe({
      to: partnerEmail,
      subject,
      text,
      html,
    })
  } catch (error) {
    console.error("Cancellation email send failed:", error)
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response
    const auth = access.auth

    const { taskId } = await context.params

    if (!taskId) {
      return NextResponse.json(
        { error: "Δεν δόθηκε taskId." },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => null)
    const reason = toNullableString(body?.reason)

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        organizationId: true,
        propertyId: true,
        status: true,
        title: true,
        scheduledDate: true,
        resultNotes: true,
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existingTask.organizationId)) {
      return NextResponse.json(
        {
          error: "Δεν επιτρέπεται πρόσβαση σε αυτή την εργασία.",
        },
        { status: 403 }
      )
    }

    if (!isOpenTaskStatus(existingTask.status)) {
      return NextResponse.json(
        {
          error:
            "Μπορούν να ακυρωθούν μόνο ανοιχτές εργασίες με κατάσταση pending, assigned, accepted ή in_progress.",
        },
        { status: 400 }
      )
    }

    const latestAssignment = await prisma.taskAssignment.findFirst({
      where: {
        taskId: existingTask.id,
      },
      orderBy: [
        {
          assignedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        status: true,
        notes: true,
        checklistToken: true,
        responseToken: true,
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "cancelled",
        resultNotes: mergeCancellationReason(existingTask.resultNotes, reason),
      },
      select: {
        id: true,
        status: true,
        resultNotes: true,
        updatedAt: true,
      },
    })

    await prisma.taskAssignment.updateMany({
      where: {
        taskId: existingTask.id,
        status: {
          in: ["assigned", "accepted", "in_progress"],
        },
      },
      data: {
        status: "cancelled",
      },
    })

    if (latestAssignment?.id) {
      try {
        await prisma.taskAssignment.update({
          where: {
            id: latestAssignment.id,
          },
          data: {
            notes: mergeAssignmentCancellationNote(
              latestAssignment.notes,
              reason
            ),
          },
        })
      } catch (error) {
        console.error("TaskAssignment note update failed:", error)
      }
    }

    if (existingTask.propertyId) {
      await refreshPropertyReadiness(existingTask.propertyId)
    }

    await sendCancellationEmail({
      req,
      partnerEmail: latestAssignment?.partner?.email,
      partnerName: latestAssignment?.partner?.name,
      propertyName: existingTask.property?.name,
      taskTitle: existingTask.title,
      scheduledDate: existingTask.scheduledDate,
      portalToken: latestAssignment?.responseToken || latestAssignment?.checklistToken,
      reason,
    })

    return NextResponse.json({
      success: true,
      message: "Η εργασία ακυρώθηκε επιτυχώς.",
      task: updatedTask,
    })
  } catch (error) {
    console.error("POST /api/tasks/[taskId]/cancel error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Παρουσιάστηκε σφάλμα κατά την ακύρωση της εργασίας.",
      },
      { status: 500 }
    )
  }
}