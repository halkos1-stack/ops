import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"
import { createExpiryDate, createSecureToken } from "@/lib/tokens"
import { sendMailSafe } from "@/lib/mailer"

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null

  const text = String(value).trim()
  return text === "" ? null : text
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

function formatDateForGreek(value?: Date | string | null) {
  if (!value) return "—"

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { searchParams } = new URL(request.url)

    const taskId = searchParams.get("taskId")
    const partnerId = searchParams.get("partnerId")
    const status = searchParams.get("status")

    const where: {
      taskId?: string
      partnerId?: string
      status?: string
      task?: {
        organizationId?: string
      }
    } = {
      ...(taskId ? { taskId } : {}),
      ...(partnerId ? { partnerId } : {}),
      ...(status ? { status } : {}),
    }

    if (!auth.isSuperAdmin) {
      where.task = {
        organizationId: auth.organizationId || undefined,
      }
    }

    const assignments = await prisma.taskAssignment.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            organizationId: true,
            title: true,
            taskType: true,
            status: true,
            scheduledDate: true,
            scheduledStartTime: true,
            scheduledEndTime: true,
            requiresChecklist: true,
            requiresPhotos: true,
            requiresApproval: true,
            property: {
              select: {
                id: true,
                code: true,
                name: true,
                city: true,
                address: true,
              },
            },
            booking: {
              select: {
                id: true,
                guestName: true,
                checkInDate: true,
                checkOutDate: true,
                status: true,
              },
            },
          },
        },
        partner: {
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            phone: true,
            specialty: true,
            status: true,
          },
        },
      },
      orderBy: [
        {
          assignedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("GET /api/task-assignments error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης αναθέσεων." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const body = await request.json()

    const taskId = String(body.taskId || "").trim()
    const partnerId = String(body.partnerId || "").trim()
    const notes = toNullableString(body.notes)

    if (!taskId) {
      return NextResponse.json(
        { error: "Το taskId είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!partnerId) {
      return NextResponse.json(
        { error: "Το partnerId είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        organizationId: true,
        title: true,
        status: true,
        propertyId: true,
        scheduledDate: true,
        requiresChecklist: true,
        property: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, task.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την εργασία." },
        { status: 403 }
      )
    }

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        status: true,
      },
    })

    if (!partner) {
      return NextResponse.json(
        { error: "Ο συνεργάτης δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, partner.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτόν τον συνεργάτη." },
        { status: 403 }
      )
    }

    if (partner.organizationId !== task.organizationId) {
      return NextResponse.json(
        { error: "Η εργασία και ο συνεργάτης δεν ανήκουν στον ίδιο οργανισμό." },
        { status: 400 }
      )
    }

    if (partner.status !== "active") {
      return NextResponse.json(
        { error: "Ο συνεργάτης δεν είναι ενεργός." },
        { status: 400 }
      )
    }

    const existingAssignments = await prisma.taskAssignment.findMany({
      where: {
        taskId,
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
        partnerId: true,
        partner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const blockingAssignment = existingAssignments.find((assignment) =>
      ["accepted", "in_progress", "completed"].includes(
        String(assignment.status || "").toLowerCase()
      )
    )

    if (blockingAssignment) {
      let message = `Η εργασία είναι ήδη ανατεθειμένη στον συνεργάτη ${blockingAssignment.partner?.name || "—"}.`

      if (String(blockingAssignment.status).toLowerCase() === "accepted") {
        message = `Η εργασία έχει ήδη αποδεχθεί από τον συνεργάτη ${blockingAssignment.partner?.name || "—"} και δεν μπορεί να ανατεθεί ξανά.`
      }

      if (String(blockingAssignment.status).toLowerCase() === "in_progress") {
        message = `Η εργασία εκτελείται ήδη από τον συνεργάτη ${blockingAssignment.partner?.name || "—"} και δεν μπορεί να ανατεθεί ξανά.`
      }

      if (String(blockingAssignment.status).toLowerCase() === "completed") {
        message = `Η εργασία έχει ήδη ολοκληρωθεί από τον συνεργάτη ${blockingAssignment.partner?.name || "—"} και δεν μπορεί να ανατεθεί ξανά.`
      }

      return NextResponse.json(
        {
          error: message,
          blockingStatus: blockingAssignment.status,
          blockingAssignmentId: blockingAssignment.id,
        },
        { status: 409 }
      )
    }

    const responseToken = createSecureToken(32)
    const responseTokenExpiresAt = createExpiryDate(72)
    const appBaseUrl = getAppBaseUrl(request)

    const existingPortalAccess = await prisma.partnerPortalAccessToken.findFirst({
      where: {
        partnerId: partner.id,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        token: true,
        isActive: true,
        expiresAt: true,
      },
    })

    let portalToken = existingPortalAccess?.token || null

    if (!portalToken) {
      const portalAccess = await prisma.partnerPortalAccessToken.create({
        data: {
          partnerId: partner.id,
          token: createSecureToken(32),
          isActive: true,
        },
        select: {
          token: true,
        },
      })

      portalToken = portalAccess.token
    }

    const portalLink = `${appBaseUrl}/partner/${portalToken}`

    const result = await prisma.$transaction(async (tx) => {
      const openAssignments = await tx.taskAssignment.findMany({
        where: {
          taskId,
          status: {
            in: ["assigned"],
          },
        },
        select: {
          id: true,
        },
      })

      if (openAssignments.length > 0) {
        await tx.taskAssignment.updateMany({
          where: {
            taskId,
            status: {
              in: ["assigned"],
            },
          },
          data: {
            status: "cancelled",
            notes: "Ακυρώθηκε λόγω νέας ανάθεσης πριν την αποδοχή.",
          },
        })
      }

      const assignment = await tx.taskAssignment.create({
        data: {
          taskId,
          partnerId,
          status: "assigned",
          notes,
          responseToken,
          responseTokenExpiresAt,
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              taskType: true,
              status: true,
              scheduledDate: true,
              scheduledStartTime: true,
              scheduledEndTime: true,
              requiresChecklist: true,
              requiresPhotos: true,
              requiresApproval: true,
              property: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  city: true,
                  address: true,
                },
              },
              booking: {
                select: {
                  id: true,
                  guestName: true,
                  checkInDate: true,
                  checkOutDate: true,
                  status: true,
                },
              },
            },
          },
          partner: {
            select: {
              id: true,
              code: true,
              name: true,
              email: true,
              phone: true,
              specialty: true,
              status: true,
            },
          },
        },
      })

      await tx.task.update({
        where: { id: taskId },
        data: {
          status: "assigned",
        },
      })

      await tx.activityLog.create({
        data: {
          organizationId: task.organizationId,
          propertyId: task.propertyId,
          taskId: task.id,
          partnerId: partner.id,
          entityType: "TASK_ASSIGNMENT",
          entityId: assignment.id,
          action: "TASK_ASSIGNED",
          message: `Η εργασία "${task.title}" ανατέθηκε στον συνεργάτη ${partner.name}.`,
          actorType: "manager",
          actorName: "Διαχειριστής",
          metadata: {
            assignmentStatus: "assigned",
            partnerId: partner.id,
            partnerName: partner.name,
            responseToken,
            portalToken,
            portalLink,
          },
        },
      })

      return assignment
    })

    const mailResult = await sendMailSafe({
      to: partner.email,
      subject: `Νέα ανάθεση εργασίας: ${task.title}`,
      text: [
        `Γεια σου ${partner.name},`,
        ``,
        `Σου ανατέθηκε νέα εργασία.`,
        `Τίτλος εργασίας: ${task.title}`,
        `Ακίνητο: ${task.property.name}`,
        `Ημερομηνία: ${formatDateForGreek(task.scheduledDate)}`,
        ``,
        `Για να δεις την ανάθεση και να απαντήσεις, άνοιξε το portal σου από το παρακάτω link:`,
        portalLink,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <p>Γεια σου ${partner.name},</p>
          <p>Σου ανατέθηκε νέα εργασία.</p>
          <p><strong>Τίτλος εργασίας:</strong> ${task.title}</p>
          <p><strong>Ακίνητο:</strong> ${task.property.name}</p>
          <p><strong>Ημερομηνία:</strong> ${formatDateForGreek(task.scheduledDate)}</p>
          <p>Για να δεις την ανάθεση, να απαντήσεις και να εκτελέσεις τη λίστα εργασίας, άνοιξε το portal σου:</p>
          <p>
            <a href="${portalLink}" target="_blank" rel="noreferrer">
              Άνοιγμα portal συνεργάτη
            </a>
          </p>
        </div>
      `,
    })

    if (mailResult.sent) {
      await prisma.taskAssignment.update({
        where: {
          id: result.id,
        },
        data: {
          assignmentEmailSentAt: new Date(),
        },
      })
    }

    return NextResponse.json(
      {
        success: true,
        assignment: result,
        portalLink,
        assignmentEmailSent: mailResult.sent,
        assignmentEmailSendReason: mailResult.sent
          ? null
          : String(mailResult.reason || "SEND_FAILED"),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/task-assignments error:", error)

    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας ανάθεσης." },
      { status: 500 }
    )
  }
}