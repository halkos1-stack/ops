import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createSecureToken, createExpiryDate } from "@/lib/tokens"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"

type RouteContext = {
  params: Promise<{
    token: string
    assignmentId: string
  }>
}

function isExpired(date?: Date | string | null) {
  if (!date) return false

  const parsed = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(parsed.getTime())) return false

  return parsed.getTime() < Date.now()
}

function normalizeAction(value: unknown) {
  const text = String(value || "").trim().toLowerCase()

  if (text === "accept") return "accept"
  if (text === "reject") return "reject"

  return null
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { token, assignmentId } = await context.params
    const cleanToken = String(token || "").trim()
    const cleanAssignmentId = String(assignmentId || "").trim()

    if (!cleanToken || !cleanAssignmentId) {
      return NextResponse.json(
        { error: "Το portal token και το assignmentId είναι υποχρεωτικά." },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const action = normalizeAction(body?.action)
    const rejectionReason = String(body?.rejectionReason || "").trim()

    if (!action) {
      return NextResponse.json(
        { error: "Η ενέργεια πρέπει να είναι accept ή reject." },
        { status: 400 }
      )
    }

    if (action === "reject" && !rejectionReason) {
      return NextResponse.json(
        { error: "Η αιτία απόρριψης είναι υποχρεωτική." },
        { status: 400 }
      )
    }

    const portalAccess = await prisma.partnerPortalAccessToken.findFirst({
      where: {
        token: cleanToken,
        isActive: true,
      },
      select: {
        id: true,
        expiresAt: true,
        partnerId: true,
      },
    })

    if (!portalAccess) {
      return NextResponse.json(
        { error: "Το portal link δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (isExpired(portalAccess.expiresAt)) {
      return NextResponse.json(
        { error: "Το portal link έχει λήξει." },
        { status: 410 }
      )
    }

    await prisma.partnerPortalAccessToken.update({
      where: { id: portalAccess.id },
      data: {
        lastUsedAt: new Date(),
      },
    })

    const existingAssignment = await prisma.taskAssignment.findFirst({
      where: {
        id: cleanAssignmentId,
        partnerId: portalAccess.partnerId,
      },
      include: {
        partner: true,
        task: {
          include: {
            property: true,
            checklistRun: true,
            supplyRun: true,
          },
        },
      },
    })

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Η ανάθεση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!["assigned"].includes(String(existingAssignment.status || "").toLowerCase())) {
      return NextResponse.json(
        { error: "Η ανάθεση δεν είναι διαθέσιμη για νέα απάντηση." },
        { status: 409 }
      )
    }

    const taskStatus = String(existingAssignment.task.status || "").toLowerCase()
    if (taskStatus === "cancelled") {
      return NextResponse.json(
        { error: "Η εργασία έχει ακυρωθεί και δεν δέχεται πλέον απαντήσεις." },
        { status: 409 }
      )
    }

    if (taskStatus === "completed") {
      return NextResponse.json(
        { error: "Η εργασία έχει ήδη ολοκληρωθεί." },
        { status: 409 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      if (action === "reject") {
        const updatedAssignment = await tx.taskAssignment.update({
          where: { id: existingAssignment.id },
          data: {
            status: "rejected",
            rejectedAt: new Date(),
            acceptedAt: null,
            rejectionReason,
          },
        })

        await tx.task.update({
          where: { id: existingAssignment.taskId },
          data: {
            status: "pending",
          },
        })

        if (existingAssignment.task.checklistRun) {
          await tx.taskChecklistRun.update({
            where: { id: existingAssignment.task.checklistRun.id },
            data: {
              status: "pending",
              startedAt: null,
              completedAt: null,
            },
          })
        }

        if (existingAssignment.task.supplyRun) {
          await tx.taskSupplyRun.update({
            where: { id: existingAssignment.task.supplyRun.id },
            data: {
              status: "pending",
              startedAt: null,
              completedAt: null,
            },
          })
        }

        await tx.activityLog.create({
          data: {
            organizationId: existingAssignment.task.organizationId,
            propertyId: existingAssignment.task.propertyId,
            taskId: existingAssignment.taskId,
            partnerId: existingAssignment.partnerId,
            entityType: "TASK_ASSIGNMENT",
            entityId: existingAssignment.id,
            action: "ASSIGNMENT_REJECTED_BY_PARTNER_PORTAL",
            message: `Ο συνεργάτης ${existingAssignment.partner.name} απέρριψε την εργασία "${existingAssignment.task.title}" από το portal.`,
            actorType: "partner",
            actorName: existingAssignment.partner.name,
            metadata: {
              rejectionReason,
            },
          },
        })

        return updatedAssignment
      }

      let checklistToken = existingAssignment.checklistToken
      let checklistTokenExpiresAt = existingAssignment.checklistTokenExpiresAt

      if (
        existingAssignment.task.sendCleaningChecklist &&
        existingAssignment.task.checklistRun &&
        !checklistToken
      ) {
        checklistToken = createSecureToken(32)
        checklistTokenExpiresAt = createExpiryDate(72)
      }

      const updatedAssignment = await tx.taskAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          status: "accepted",
          acceptedAt: new Date(),
          rejectedAt: null,
          rejectionReason: null,
          checklistToken,
          checklistTokenExpiresAt,
        },
      })

      await tx.task.update({
        where: { id: existingAssignment.taskId },
        data: {
          status: "accepted",
        },
      })

      if (existingAssignment.task.checklistRun) {
        await tx.taskChecklistRun.update({
          where: { id: existingAssignment.task.checklistRun.id },
          data: {
            status: "pending",
          },
        })
      }

      if (existingAssignment.task.supplyRun) {
        await tx.taskSupplyRun.update({
          where: { id: existingAssignment.task.supplyRun.id },
          data: {
            status: "pending",
          },
        })
      }

      await tx.activityLog.create({
        data: {
          organizationId: existingAssignment.task.organizationId,
          propertyId: existingAssignment.task.propertyId,
          taskId: existingAssignment.taskId,
          partnerId: existingAssignment.partnerId,
          entityType: "TASK_ASSIGNMENT",
          entityId: existingAssignment.id,
          action: "ASSIGNMENT_ACCEPTED_BY_PARTNER_PORTAL",
          message: `Ο συνεργάτης ${existingAssignment.partner.name} αποδέχθηκε την εργασία "${existingAssignment.task.title}" από το portal.`,
          actorType: "partner",
          actorName: existingAssignment.partner.name,
          metadata: {
            sendCleaningChecklist: existingAssignment.task.sendCleaningChecklist,
            sendSuppliesChecklist: existingAssignment.task.sendSuppliesChecklist,
          },
        },
      })

      return updatedAssignment
    })

    if (existingAssignment.task.propertyId) {
      await refreshPropertyReadiness(existingAssignment.task.propertyId)
    }

    return NextResponse.json({
      success: true,
      assignment: result,
    })
  } catch (error) {
    console.error("POST /api/partner/[token]/assignments/[assignmentId]/respond error:", error)

    return NextResponse.json(
      { error: "Αποτυχία απάντησης στην ανάθεση." },
      { status: 500 }
    )
  }
}