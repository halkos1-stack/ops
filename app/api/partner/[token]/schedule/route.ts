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
      select: {
        id: true,
        expiresAt: true,
        partnerId: true,
        partner: {
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            specialty: true,
            status: true,
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
      data: { lastUsedAt: new Date() },
    })

    const assignments = await prisma.taskAssignment.findMany({
      where: {
        partnerId: portalAccess.partnerId,
        status: {
          in: ["assigned", "accepted", "in_progress"],
        },
      },
      orderBy: [
        {
          task: {
            scheduledDate: "asc",
          },
        },
        {
          task: {
            scheduledStartTime: "asc",
          },
        },
        {
          assignedAt: "desc",
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
                completedAt: true,
              },
            },
          },
        },
      },
    })

    const latestAssignmentsMap = new Map<string, (typeof assignments)[number]>()

    for (const assignment of assignments) {
      if (!latestAssignmentsMap.has(assignment.taskId)) {
        latestAssignmentsMap.set(assignment.taskId, assignment)
      }
    }

    const rows = Array.from(latestAssignmentsMap.values()).map((assignment) => ({
      assignmentId: assignment.id,
      assignmentStatus: assignment.status,
      assignedAt: assignment.assignedAt,
      acceptedAt: assignment.acceptedAt,
      startedAt: assignment.startedAt,
      completedAt: assignment.completedAt,
      task: {
        id: assignment.task.id,
        title: assignment.task.title,
        description: assignment.task.description,
        taskType: assignment.task.taskType,
        priority: assignment.task.priority,
        status: assignment.task.status,
        scheduledDate: assignment.task.scheduledDate,
        scheduledStartTime: assignment.task.scheduledStartTime,
        scheduledEndTime: assignment.task.scheduledEndTime,
        requiresChecklist: assignment.task.requiresChecklist,
        checklistRun: assignment.task.checklistRun,
        property: assignment.task.property,
      },
    }))

    return NextResponse.json({
      partner: portalAccess.partner,
      items: rows,
    })
  } catch (error) {
    console.error("GET /api/partner/[token]/schedule error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης προγράμματος εργασιών συνεργάτη." },
      { status: 500 }
    )
  }
}