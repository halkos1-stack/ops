import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createExpiryDate, createSecureToken } from "@/lib/tokens"
import { sendMailSafe } from "@/lib/mailer"

type RouteContext = {
  params: Promise<{
    token: string
  }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    const body = await req.json()

    const action = String(body?.action ?? "").trim().toLowerCase()
    const rejectionReason =
      body?.rejectionReason !== undefined
        ? String(body.rejectionReason).trim()
        : null

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Μη έγκυρη ενέργεια." },
        { status: 400 }
      )
    }

    const assignment = await prisma.taskAssignment.findFirst({
      where: {
        responseToken: token,
      },
      include: {
        partner: true,
        task: {
          include: {
            property: true,
            checklistRun: {
              include: {
                template: true,
              },
            },
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε η ανάθεση." },
        { status: 404 }
      )
    }

    const isExpired =
      assignment.responseTokenExpiresAt &&
      new Date(assignment.responseTokenExpiresAt).getTime() < Date.now()

    if (isExpired) {
      return NextResponse.json(
        { error: "Το link αποδοχής έχει λήξει." },
        { status: 410 }
      )
    }

    if (
      assignment.status === "accepted" ||
      assignment.status === "rejected" ||
      assignment.status === "completed"
    ) {
      return NextResponse.json({
        success: true,
        alreadyHandled: true,
        status: assignment.status,
      })
    }

    if (action === "reject") {
      const updated = await prisma.$transaction(async (tx) => {
        const updatedAssignment = await tx.taskAssignment.update({
          where: {
            id: assignment.id,
          },
          data: {
            status: "rejected",
            rejectedAt: new Date(),
            rejectionReason: rejectionReason || "Δεν δόθηκε αιτιολογία.",
          },
        })

        await tx.task.update({
          where: {
            id: assignment.taskId,
          },
          data: {
            status: "pending",
          },
        })

        return updatedAssignment
      })

      return NextResponse.json({
        success: true,
        status: updated.status,
      })
    }

    const checklistToken = createSecureToken(24)
    const checklistTokenExpiresAt = createExpiryDate(72)

    const result = await prisma.$transaction(async (tx) => {
      const updatedAssignment = await tx.taskAssignment.update({
        where: {
          id: assignment.id,
        },
        data: {
          status: "accepted",
          acceptedAt: new Date(),
          checklistToken:
            assignment.task.requiresChecklist && assignment.task.checklistRun
              ? checklistToken
              : null,
          checklistTokenExpiresAt:
            assignment.task.requiresChecklist && assignment.task.checklistRun
              ? checklistTokenExpiresAt
              : null,
        },
      })

      await tx.task.update({
        where: {
          id: assignment.taskId,
        },
        data: {
          status: assignment.task.requiresChecklist ? "accepted" : "in_progress",
        },
      })

      return updatedAssignment
    })

    let checklistLink: string | null = null

    if (assignment.task.requiresChecklist && assignment.task.checklistRun) {
      const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000"
      checklistLink = `${appBaseUrl}/partner/checklist/${checklistToken}`

      const mailResult = await sendMailSafe({
        to: assignment.partner.email,
        subject: `Checklist εργασίας - ${assignment.task.property.name}`,
        text: `Η ανάθεση έγινε αποδεκτή. Συμπλήρωσε το checklist εδώ: ${checklistLink}`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6">
            <h2>Checklist εργασίας</h2>
            <p>Η ανάθεση έγινε αποδεκτή.</p>
            <p><strong>Ακίνητο:</strong> ${assignment.task.property.name}</p>
            <p><strong>Εργασία:</strong> ${assignment.task.title}</p>
            <p><strong>Πρότυπο:</strong> ${assignment.task.checklistRun.template?.title || "Checklist"}</p>
            <p>
              <a href="${checklistLink}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">
                Άνοιγμα checklist
              </a>
            </p>
          </div>
        `,
      })

      if (mailResult.sent) {
        await prisma.taskAssignment.update({
          where: {
            id: assignment.id,
          },
          data: {
            checklistEmailSentAt: new Date(),
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      checklistLink,
    })
  } catch (error) {
    console.error("POST /api/assignment-links/[token]/respond error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία ενημέρωσης ανάθεσης.",
      },
      { status: 500 }
    )
  }
}