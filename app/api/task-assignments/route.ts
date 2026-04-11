import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiAppAccess,
  canAccessOrganization,
} from "@/lib/route-access"
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

function formatTime(value?: string | null) {
  const text = String(value ?? "").trim()
  if (!text) return "—"
  return text.slice(0, 5)
}

function normalizeSystemTaskTitleForLog(rawTitle: unknown) {
  const title = String(rawTitle ?? "").trim()
  if (!title) return "Task"

  let match = title.match(/^Καθαρισμός μετά από check-out\s*-\s*(.+)$/i)
  if (match?.[1]) {
    return `Cleaning after check-out - ${match[1]}`
  }

  match = title.match(/^Cleaning after check-out\s*-\s*(.+)$/i)
  if (match?.[1]) {
    return `Cleaning after check-out - ${match[1]}`
  }

  match = title.match(/^Επιθεώρηση πριν από check-in\s*-\s*(.+)$/i)
  if (match?.[1]) {
    return `Inspection before check-in - ${match[1]}`
  }

  match = title.match(/^Inspection before check-in\s*-\s*(.+)$/i)
  if (match?.[1]) {
    return `Inspection before check-in - ${match[1]}`
  }

  match = title.match(/^Αναπλήρωση αναλωσίμων\s*-\s*(.+)$/i)
  if (match?.[1]) {
    return `Supplies refill - ${match[1]}`
  }

  match = title.match(/^Supplies refill\s*-\s*(.+)$/i)
  if (match?.[1]) {
    return `Supplies refill - ${match[1]}`
  }

  return title
}

function buildTaskAssignedMessage(partnerName: string, taskTitle: string) {
  return `Task "${taskTitle}" was assigned to partner ${partnerName}.`
}

function buildSupersededAssignmentMessage() {
  return "Previous pending assignment was replaced by a newer assignment before acceptance."
}

async function findPrimaryChecklistTemplate(
  organizationId: string,
  propertyId: string
) {
  return prisma.propertyChecklistTemplate.findFirst({
    where: {
      organizationId,
      propertyId,
      isPrimary: true,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      templateType: true,
      isPrimary: true,
      isActive: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })
}

async function ensureTaskChecklistRun(params: {
  taskId: string
  organizationId: string
  propertyId: string
  sendCleaningChecklist: boolean
}) {
  const { taskId, organizationId, propertyId, sendCleaningChecklist } = params

  if (!sendCleaningChecklist) {
    const existingRun = await prisma.taskChecklistRun.findUnique({
      where: { taskId },
      select: { id: true },
    })

    if (existingRun) {
      await prisma.taskChecklistAnswer.deleteMany({
        where: { checklistRunId: existingRun.id },
      })

      await prisma.taskChecklistRun.delete({
        where: { taskId },
      })
    }

    return null
  }

  const primaryTemplate = await findPrimaryChecklistTemplate(
    organizationId,
    propertyId
  )

  if (!primaryTemplate) {
    return null
  }

  const existingRun = await prisma.taskChecklistRun.findUnique({
    where: { taskId },
    select: {
      id: true,
      templateId: true,
    },
  })

  if (!existingRun) {
    return prisma.taskChecklistRun.create({
      data: {
        taskId,
        templateId: primaryTemplate.id,
        status: "pending",
      },
    })
  }

  if (existingRun.templateId !== primaryTemplate.id) {
    await prisma.taskChecklistAnswer.deleteMany({
      where: {
        checklistRunId: existingRun.id,
      },
    })

    return prisma.taskChecklistRun.update({
      where: { taskId },
      data: {
        templateId: primaryTemplate.id,
        status: "pending",
        startedAt: null,
        completedAt: null,
      },
    })
  }

  return prisma.taskChecklistRun.update({
    where: { taskId },
    data: {
      status: "pending",
      startedAt: null,
      completedAt: null,
    },
  })
}

async function ensureTaskSupplyRun(params: {
  taskId: string
  sendSuppliesChecklist: boolean
}) {
  const { taskId, sendSuppliesChecklist } = params

  const existingRun = await prisma.taskSupplyRun.findUnique({
    where: { taskId },
    select: { id: true },
  })

  if (!sendSuppliesChecklist) {
    if (existingRun) {
      await prisma.taskSupplyAnswer.deleteMany({
        where: {
          taskSupplyRunId: existingRun.id,
        },
      })

      await prisma.taskSupplyRun.delete({
        where: {
          taskId,
        },
      })
    }

    return null
  }

  if (!existingRun) {
    return prisma.taskSupplyRun.create({
      data: {
        taskId,
        status: "pending",
      },
    })
  }

  return prisma.taskSupplyRun.update({
    where: { taskId },
    data: {
      status: "pending",
      startedAt: null,
      completedAt: null,
    },
  })
}

async function getLatestPortalAccessForPartner(partnerId: string) {
  return prisma.partnerPortalAccessToken.findFirst({
    where: {
      partnerId,
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
      createdAt: true,
    },
  })
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
    const appBaseUrl = getAppBaseUrl(request)

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
            sendCleaningChecklist: true,
            sendSuppliesChecklist: true,
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
                checkInTime: true,
                checkOutTime: true,
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

    const partnerIds = Array.from(
      new Set(
        assignments
          .map((assignment) => assignment.partnerId)
          .filter((value): value is string => Boolean(value))
      )
    )

    const portalAccesses = partnerIds.length
      ? await prisma.partnerPortalAccessToken.findMany({
          where: {
            partnerId: {
              in: partnerIds,
            },
            isActive: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            partnerId: true,
            token: true,
            expiresAt: true,
            createdAt: true,
          },
        })
      : []

    const latestPortalByPartnerId = new Map<
      string,
      {
        token: string
        expiresAt: Date | null
      }
    >()

    for (const portalAccess of portalAccesses) {
      if (!latestPortalByPartnerId.has(portalAccess.partnerId)) {
        latestPortalByPartnerId.set(portalAccess.partnerId, {
          token: portalAccess.token,
          expiresAt: portalAccess.expiresAt ?? null,
        })
      }
    }

    const enrichedAssignments = assignments.map((assignment) => {
      const portalAccess = latestPortalByPartnerId.get(assignment.partnerId)
      const portalToken = portalAccess?.token ?? null
      const portalUrl = portalToken ? `${appBaseUrl}/partner/${portalToken}` : null

      return {
        ...assignment,
        responseToken: assignment.responseToken ?? null,
        responseTokenExpiresAt: assignment.responseTokenExpiresAt ?? null,
        portalToken,
        portalUrl,
        portalTokenExpiresAt: portalAccess?.expiresAt ?? null,
      }
    })

    return NextResponse.json(enrichedAssignments)
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
    const saveAsDefaultPartner = Boolean(body.saveAsDefaultPartner)

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
        scheduledStartTime: true,
        scheduledEndTime: true,
        requiresChecklist: true,
        sendCleaningChecklist: true,
        sendSuppliesChecklist: true,
        property: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
          },
        },
        booking: {
          select: {
            id: true,
            guestName: true,
            checkInDate: true,
            checkOutDate: true,
            checkInTime: true,
            checkOutTime: true,
            status: true,
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

    if (!task.sendCleaningChecklist) {
      return NextResponse.json(
        {
          error:
            "Δεν μπορεί να σταλεί ανάθεση αν δεν είναι ενεργή τουλάχιστον η λίστα καθαριότητας για αυτή την εργασία.",
        },
        { status: 400 }
      )
    }

    const primaryTemplate = await findPrimaryChecklistTemplate(
      task.organizationId,
      task.propertyId
    )

    if (!primaryTemplate) {
      return NextResponse.json(
        {
          error:
            "Δεν μπορεί να σταλεί λίστα καθαριότητας γιατί το ακίνητο δεν έχει ενεργό κύριο πρότυπο.",
        },
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

    const blockingStatuses = [
      "assigned",
      "waiting_acceptance",
      "accepted",
      "in_progress",
      "completed",
    ]

    const blockingAssignment = existingAssignments.find((assignment) =>
      blockingStatuses.includes(String(assignment.status || "").toLowerCase())
    )

    if (blockingAssignment) {
      const normalizedBlockingStatus = String(
        blockingAssignment.status || ""
      ).toLowerCase()
      let message = `Η εργασία έχει ήδη σταλεί στον συνεργάτη ${blockingAssignment.partner?.name || "—"}.`

      if (normalizedBlockingStatus === "accepted") {
        message = `Η εργασία έχει ήδη αποδεχθεί από τον συνεργάτη ${blockingAssignment.partner?.name || "—"} και δεν μπορεί να ανατεθεί ξανά.`
      }

      if (normalizedBlockingStatus === "in_progress") {
        message = `Η εργασία εκτελείται ήδη από τον συνεργάτη ${blockingAssignment.partner?.name || "—"} και δεν μπορεί να ανατεθεί ξανά.`
      }

      if (normalizedBlockingStatus === "completed") {
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

    let portalAccess = await getLatestPortalAccessForPartner(partner.id)

    if (!portalAccess) {
      const createdPortalAccess = await prisma.partnerPortalAccessToken.create({
        data: {
          partnerId: partner.id,
          token: createSecureToken(32),
          isActive: true,
        },
        select: {
          id: true,
          token: true,
          isActive: true,
          expiresAt: true,
          createdAt: true,
        },
      })

      portalAccess = createdPortalAccess
    }

    const portalToken = portalAccess.token
    const portalLink = `${appBaseUrl}/partner/${portalToken}`

    const result = await prisma.$transaction(async (tx) => {
      const previousAssignedAssignments = await tx.taskAssignment.findMany({
        where: {
          taskId,
          status: "assigned",
        },
        select: {
          id: true,
          partnerId: true,
        },
      })

      await ensureTaskChecklistRun({
        taskId: task.id,
        organizationId: task.organizationId,
        propertyId: task.propertyId,
        sendCleaningChecklist: true,
      })

      if (task.sendSuppliesChecklist) {
        await ensureTaskSupplyRun({
          taskId: task.id,
          sendSuppliesChecklist: true,
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
              sendCleaningChecklist: true,
              sendSuppliesChecklist: true,
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
                  checkInTime: true,
                  checkOutTime: true,
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

      if (saveAsDefaultPartner) {
        await tx.property.update({
          where: {
            id: task.propertyId,
          },
          data: {
            defaultPartnerId: partner.id,
          },
        })
      }

      for (const previousAssignment of previousAssignedAssignments) {
        await tx.activityLog.create({
          data: {
            organizationId: task.organizationId,
            propertyId: task.propertyId,
            taskId: task.id,
            partnerId: previousAssignment.partnerId,
            entityType: "TASK_ASSIGNMENT",
            entityId: previousAssignment.id,
            action: "TASK_ASSIGNMENT_SUPERSEDED",
            message: buildSupersededAssignmentMessage(),
            actorType: "MANAGER",
            actorName: "Manager",
            metadata: {
              supersededByAssignmentId: assignment.id,
              canonicalMessageFormat: "task-assignment-superseded-v1",
            },
          },
        })
      }

      await tx.activityLog.create({
        data: {
          organizationId: task.organizationId,
          propertyId: task.propertyId,
          taskId: task.id,
          partnerId: partner.id,
          entityType: "TASK_ASSIGNMENT",
          entityId: assignment.id,
          action: "TASK_ASSIGNED",
          message: buildTaskAssignedMessage(
            partner.name,
            normalizeSystemTaskTitleForLog(task.title)
          ),
          actorType: "MANAGER",
          actorName: "Manager",
          metadata: {
            assignmentStatus: "assigned",
            partnerId: partner.id,
            partnerName: partner.name,
            responseToken,
            responseTokenExpiresAt,
            portalToken,
            portalLink,
            sendCleaningChecklist: task.sendCleaningChecklist,
            sendSuppliesChecklist: task.sendSuppliesChecklist,
            saveAsDefaultPartner,
            canonicalMessageFormat: "task-assigned-partner-v1",
          },
        },
      })

      return assignment
    })

    const bookingLines = task.booking
      ? [
          `Checkout: ${formatDateForGreek(task.booking.checkOutDate)} · ${formatTime(task.booking.checkOutTime)}`,
          `Check-in: ${formatDateForGreek(task.booking.checkInDate)} · ${formatTime(task.booking.checkInTime)}`,
        ]
      : []

    const mailResult = await sendMailSafe({
      to: partner.email,
      subject: `Νέα ανάθεση εργασίας: ${task.title}`,
      text: [
        `Γεια σου ${partner.name},`,
        ``,
        `Σου ανατέθηκε νέα εργασία.`,
        `Τίτλος εργασίας: ${task.title}`,
        `Ακίνητο: ${task.property.name}`,
        `Ημερομηνία εργασίας: ${formatDateForGreek(task.scheduledDate)}`,
        `Ώρα εργασίας: ${formatTime(task.scheduledStartTime)} - ${formatTime(task.scheduledEndTime)}`,
        ...(bookingLines.length > 0 ? ["", ...bookingLines] : []),
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
          <p><strong>Ημερομηνία εργασίας:</strong> ${formatDateForGreek(task.scheduledDate)}</p>
          <p><strong>Ώρα εργασίας:</strong> ${formatTime(task.scheduledStartTime)} - ${formatTime(task.scheduledEndTime)}</p>
          ${
            bookingLines.length > 0
              ? `<p><strong>${bookingLines[0]}</strong></p><p><strong>${bookingLines[1]}</strong></p>`
              : ""
          }
          <p>Για να δεις την ανάθεση, να απαντήσεις και να εκτελέσεις τις ενότητες εργασίας, άνοιξε το portal σου:</p>
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
        assignment: {
          ...result,
          responseToken,
          responseTokenExpiresAt,
          portalToken,
          portalUrl: portalLink,
        },
        responseToken,
        responseTokenExpiresAt,
        portalToken,
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
