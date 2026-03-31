import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiPartnerAccess } from "@/lib/partner-route-access"

type RouteContext = {
  params: Promise<{
    assignmentId: string
  }>
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
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

function buildAssignmentAcceptedMessage(partnerName: string, taskTitle: string) {
  return `Partner ${partnerName} accepted task "${taskTitle}" from the portal.`
}

function buildAssignmentRejectedMessage(partnerName: string, taskTitle: string) {
  return `Partner ${partnerName} rejected task "${taskTitle}" from the portal.`
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiPartnerAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { assignmentId } = await context.params
    const body = await req.json().catch(() => ({}))

    const action = toNullableString(body.action)?.toUpperCase()
    const rejectionReason = toNullableString(body.rejectionReason)

    if (action !== "ACCEPTED" && action !== "REJECTED") {
      return NextResponse.json(
        { error: "Η ενέργεια πρέπει να είναι ACCEPTED ή REJECTED." },
        { status: 400 }
      )
    }

    const existingAssignment = await prisma.taskAssignment.findFirst({
      where: {
        id: assignmentId,
        partnerId: auth.partnerId,
        task: {
          organizationId: auth.organizationId,
        },
      },
      select: {
        id: true,
        taskId: true,
        status: true,
        partnerId: true,
        task: {
          select: {
            id: true,
            organizationId: true,
            status: true,
            propertyId: true,
            title: true,
            checklistRun: {
              select: { id: true },
            },
            supplyRun: {
              select: { id: true },
            },
          },
        },
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
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

    if (String(existingAssignment.status || "").toLowerCase() !== "assigned") {
      return NextResponse.json(
        { error: "Η ανάθεση δεν είναι διαθέσιμη για νέα απάντηση." },
        { status: 409 }
      )
    }

    const now = new Date()

    const partnerName =
      existingAssignment.partner?.name?.trim() ||
      auth.email?.trim() ||
      "Partner"

    const taskTitle = normalizeSystemTaskTitleForLog(existingAssignment.task.title)

    const result = await prisma.$transaction(async (tx) => {
      const updatedAssignment = await tx.taskAssignment.update({
        where: {
          id: assignmentId,
        },
        data:
          action === "ACCEPTED"
            ? {
                status: "accepted",
                acceptedAt: now,
                rejectedAt: null,
                rejectionReason: null,
              }
            : {
                status: "rejected",
                acceptedAt: null,
                rejectedAt: now,
                rejectionReason,
              },
      })

      await tx.task.update({
        where: {
          id: existingAssignment.taskId,
        },
        data: {
          status: action === "ACCEPTED" ? "accepted" : "pending",
        },
      })

      if (action === "REJECTED") {
        if (existingAssignment.task.checklistRun) {
          await tx.taskChecklistRun.update({
            where: { id: existingAssignment.task.checklistRun.id },
            data: { status: "pending", startedAt: null, completedAt: null },
          })
        }

        if (existingAssignment.task.supplyRun) {
          await tx.taskSupplyRun.update({
            where: { id: existingAssignment.task.supplyRun.id },
            data: { status: "pending", startedAt: null, completedAt: null },
          })
        }
      }

      await tx.activityLog.create({
        data: {
          organizationId: existingAssignment.task.organizationId,
          propertyId: existingAssignment.task.propertyId,
          taskId: existingAssignment.taskId,
          partnerId: existingAssignment.partnerId,
          entityType: "TASK_ASSIGNMENT",
          entityId: existingAssignment.id,
          action:
            action === "ACCEPTED"
              ? "ASSIGNMENT_ACCEPTED"
              : "ASSIGNMENT_REJECTED",
          message:
            action === "ACCEPTED"
              ? buildAssignmentAcceptedMessage(partnerName, taskTitle)
              : buildAssignmentRejectedMessage(partnerName, taskTitle),
          actorType: "PARTNER",
          actorName: partnerName,
          metadata: {
            assignmentId: existingAssignment.id,
            taskId: existingAssignment.taskId,
            responseAction: action,
            rejectionReason,
            canonicalMessageFormat: "partner-task-portal-v1",
          },
        },
      })

      return updatedAssignment
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Partner assignment respond POST error:", error)

    return NextResponse.json(
      { error: "Αποτυχία απάντησης ανάθεσης." },
      { status: 500 }
    )
  }
}