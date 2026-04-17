import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    token: string
  }>
}

function isExpired(date?: Date | string | null) {
  if (!date) return false

  const parsed = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(parsed.getTime())) return false

  return parsed.getTime() < Date.now()
}

function normalizeStatus(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

function isCancelledTaskStatus(value: unknown) {
  return normalizeStatus(value) === "cancelled"
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    const cleanToken = String(token || "").trim()

    if (!cleanToken) {
      return NextResponse.json(
        { error: "Το portal token είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const portalAccess = await prisma.partnerPortalAccessToken.findFirst({
      where: {
        token: cleanToken,
        isActive: true,
      },
      include: {
        partner: {
          include: {
            taskAssignments: {
              orderBy: [
                {
                  assignedAt: "desc",
                },
                {
                  createdAt: "desc",
                },
              ],
              include: {
                task: {
                  include: {
                    property: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        address: true,
                        city: true,
                        region: true,
                      },
                    },
                    checklistRun: {
                      select: {
                        id: true,
                        status: true,
                      },
                    },
                    supplyRun: {
                      select: {
                        id: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
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

    const allAssignments = portalAccess.partner.taskAssignments || []

    const latestAssignmentsMap = new Map<string, (typeof allAssignments)[number]>()

    for (const assignment of allAssignments) {
      if (!latestAssignmentsMap.has(assignment.taskId)) {
        latestAssignmentsMap.set(assignment.taskId, assignment)
      }
    }

    const latestAssignments = Array.from(latestAssignmentsMap.values())

    const ACTIVE_ASSIGNMENT_STATUSES = ["assigned", "accepted", "in_progress", "completed"]

    const activeAssignments = latestAssignments.filter(
      (assignment) =>
        !isCancelledTaskStatus(assignment.task?.status) &&
        ACTIVE_ASSIGNMENT_STATUSES.includes(normalizeStatus(assignment.status))
    )

    const pendingAcceptance = activeAssignments.filter((assignment) =>
      ["assigned"].includes(normalizeStatus(assignment.status))
    ).length

    const accepted = activeAssignments.filter((assignment) =>
      ["accepted"].includes(normalizeStatus(assignment.status))
    ).length

    const inProgress = activeAssignments.filter((assignment) =>
      ["in_progress"].includes(normalizeStatus(assignment.status))
    ).length

    const completedToday = activeAssignments.filter((assignment) => {
      if (!assignment.completedAt) return false

      const today = new Date()
      const date = new Date(assignment.completedAt)

      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      )
    }).length

    const urgentItems = activeAssignments
      .filter((assignment) =>
        ["assigned", "accepted", "in_progress"].includes(
          normalizeStatus(assignment.status)
        )
      )
      .slice(0, 8)
      .map((assignment) => ({
        assignmentId: assignment.id,
        assignmentStatus: assignment.status,
        task: {
          id: assignment.task.id,
          title: assignment.task.title,
          taskType: assignment.task.taskType,
          status: assignment.task.status,
          scheduledDate: assignment.task.scheduledDate,
          scheduledStartTime: assignment.task.scheduledStartTime,
          scheduledEndTime: assignment.task.scheduledEndTime,
          property: assignment.task.property,
          checklistRun: assignment.task.checklistRun,
          supplyRun: assignment.task.supplyRun,
        },
      }))

    return NextResponse.json({
      partner: {
        id: portalAccess.partner.id,
        code: portalAccess.partner.code,
        name: portalAccess.partner.name,
        email: portalAccess.partner.email,
        phone: portalAccess.partner.phone,
        specialty: portalAccess.partner.specialty,
        status: portalAccess.partner.status,
      },
      stats: {
        totalAssignments: activeAssignments.length,
        pendingAcceptance,
        accepted,
        inProgress,
        completedToday,
      },
      urgentItems,
    })
  } catch (error) {
    console.error("GET /api/partner/[token] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης partner portal." },
      { status: 500 }
    )
  }
}