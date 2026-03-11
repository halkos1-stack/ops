import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createExpiryDate, createSecureToken } from "@/lib/tokens"
import { sendMailSafe } from "@/lib/mailer"

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value
  if (value === "true") return true
  if (value === "false") return false
  return fallback
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const propertyId = searchParams.get("propertyId")
    const bookingId = searchParams.get("bookingId")
    const source = searchParams.get("source")
    const partnerId = searchParams.get("partnerId")
    const taskType = searchParams.get("taskType")
    const status = searchParams.get("status")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const tasks = await prisma.task.findMany({
      where: {
        ...(propertyId ? { propertyId } : {}),
        ...(bookingId ? { bookingId } : {}),
        ...(source ? { source } : {}),
        ...(taskType ? { taskType } : {}),
        ...(status ? { status } : {}),
        ...(dateFrom || dateTo
          ? {
              scheduledDate: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
        ...(partnerId
          ? {
              assignments: {
                some: {
                  partnerId,
                },
              },
            }
          : {}),
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
          },
        },
        booking: {
          select: {
            id: true,
            guestName: true,
            checkInDate: true,
            checkOutDate: true,
          },
        },
        assignments: {
          include: {
            partner: {
              select: {
                id: true,
                name: true,
                email: true,
                specialty: true,
              },
            },
          },
          orderBy: {
            assignedAt: "desc",
          },
        },
        checklistRun: {
          include: {
            template: {
              select: {
                id: true,
                title: true,
                templateType: true,
              },
            },
            answers: {
              select: {
                id: true,
              },
            },
          },
        },
        issues: {
          select: {
            id: true,
            issueType: true,
            title: true,
            severity: true,
            status: true,
          },
        },
      },
      orderBy: [{ scheduledDate: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("GET /api/tasks error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης εργασιών." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const propertyId = String(body?.propertyId ?? "").trim()
    const title = String(body?.title ?? "").trim()
    const taskType = String(body?.taskType ?? "").trim()
    const scheduledDate = String(body?.scheduledDate ?? "").trim()
    const partnerId = String(body?.partnerId ?? "").trim()
    const templateId = String(body?.templateId ?? "").trim()

    if (!propertyId) {
      return NextResponse.json(
        { error: "Το propertyId είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: "Ο τίτλος εργασίας είναι υποχρεωτικός." },
        { status: 400 }
      )
    }

    if (!taskType) {
      return NextResponse.json(
        { error: "Ο τύπος εργασίας είναι υποχρεωτικός." },
        { status: 400 }
      )
    }

    if (!scheduledDate) {
      return NextResponse.json(
        { error: "Η ημερομηνία εργασίας είναι υποχρεωτική." },
        { status: 400 }
      )
    }

    if (!partnerId) {
      return NextResponse.json(
        { error: "Η επιλογή συνεργάτη είναι υποχρεωτική." },
        { status: 400 }
      )
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!partner) {
      return NextResponse.json(
        { error: "Ο συνεργάτης δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const requiresChecklist = toBoolean(body?.requiresChecklist, false)
    const requiresPhotos = toBoolean(body?.requiresPhotos, false)
    const requiresApproval = toBoolean(body?.requiresApproval, false)
    const saveAsDefaultPartner = toBoolean(body?.saveAsDefaultPartner, false)

    if (requiresChecklist && !templateId) {
      return NextResponse.json(
        { error: "Για εργασία με checklist πρέπει να επιλεγεί πρότυπο checklist." },
        { status: 400 }
      )
    }

    const responseToken = createSecureToken(24)
    const responseTokenExpiresAt = createExpiryDate(48)

    const createdTask = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          propertyId,
          bookingId: toNullableString(body?.bookingId),
          title,
          description: toNullableString(body?.description),
          taskType,
          source: String(body?.source ?? "manual"),
          priority: String(body?.priority ?? "normal"),
          status: "assigned",
          scheduledDate: new Date(scheduledDate),
          scheduledStartTime: toNullableString(body?.scheduledStartTime),
          scheduledEndTime: toNullableString(body?.scheduledEndTime),
          dueDate: body?.dueDate ? new Date(body.dueDate) : null,
          requiresPhotos,
          requiresChecklist,
          requiresApproval,
          notes: toNullableString(body?.notes),
        },
        include: {
          property: true,
        },
      })

      await tx.taskAssignment.create({
        data: {
          taskId: task.id,
          partnerId,
          status: "assigned",
          responseToken,
          responseTokenExpiresAt,
        },
      })

      if (requiresChecklist && templateId) {
        await tx.taskChecklistRun.create({
          data: {
            taskId: task.id,
            templateId,
            status: "pending",
          },
        })
      }

      if (saveAsDefaultPartner) {
        await tx.property.update({
          where: { id: propertyId },
          data: {
            defaultPartnerId: partnerId,
          },
        })
      }

      await tx.activityLog.create({
        data: {
          propertyId,
          taskId: task.id,
          partnerId,
          entityType: "TASK",
          entityId: task.id,
          action: "TASK_CREATED_AND_ASSIGNED",
          message: `Δημιουργήθηκε και ανατέθηκε εργασία: ${title}`,
          actorType: "manager",
          actorName: "Διαχειριστής",
          metadata: {
            taskType,
            priority: String(body?.priority ?? "normal"),
            requiresChecklist,
            templateId: requiresChecklist ? templateId : null,
          },
        },
      })

      return task
    })

    const fullTask = await prisma.task.findUnique({
      where: { id: createdTask.id },
      include: {
        property: true,
        booking: true,
        assignments: {
          include: {
            partner: true,
          },
          orderBy: {
            assignedAt: "desc",
          },
        },
        checklistRun: {
          include: {
            template: true,
            answers: true,
          },
        },
        issues: true,
      },
    })

    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000"
    const assignmentLink = `${appBaseUrl}/partner/assignment/${responseToken}`

    const mailResult = await sendMailSafe({
      to: partner.email,
      subject: `Νέα ανάθεση εργασίας - ${property.name}`,
      text: `Σου ανατέθηκε νέα εργασία για το ακίνητο ${property.name}. Άνοιξε το link: ${assignmentLink}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>Νέα ανάθεση εργασίας</h2>
          <p>Σου ανατέθηκε νέα εργασία.</p>
          <p><strong>Ακίνητο:</strong> ${property.name}</p>
          <p><strong>Κωδικός:</strong> ${property.code}</p>
          <p><strong>Διεύθυνση:</strong> ${property.address}</p>
          <p><strong>Εργασία:</strong> ${title}</p>
          <p><strong>Ημερομηνία:</strong> ${scheduledDate}</p>
          <p>
            <a href="${assignmentLink}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">
              Άνοιγμα ανάθεσης
            </a>
          </p>
        </div>
      `,
    })

    if (mailResult.sent) {
      await prisma.taskAssignment.updateMany({
        where: {
          taskId: createdTask.id,
          partnerId,
        },
        data: {
          assignmentEmailSentAt: new Date(),
        },
      })
    }

    return NextResponse.json(
      {
        task: fullTask,
        assignmentLink,
        emailSent: mailResult.sent,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/tasks error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία δημιουργίας εργασίας.",
      },
      { status: 500 }
    )
  }
}