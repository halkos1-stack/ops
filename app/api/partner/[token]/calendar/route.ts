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

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function startOfWeekMonday(date: Date) {
  const next = startOfDay(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  return next
}

function endOfWeekSunday(date: Date) {
  const next = startOfWeekMonday(date)
  next.setDate(next.getDate() + 6)
  return endOfDay(next)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function normalizeStatus(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    const cleanToken = String(token || "").trim()

    const { searchParams } = new URL(req.url)
    const rawView = String(searchParams.get("view") || "month").trim().toLowerCase()
    const rawDate = String(searchParams.get("date") || "").trim()

    const view: "day" | "week" | "month" =
      rawView === "day" || rawView === "week" ? rawView : "month"

    const baseDate =
      rawDate && !Number.isNaN(new Date(`${rawDate}T12:00:00`).getTime())
        ? new Date(`${rawDate}T12:00:00`)
        : new Date()

    const rangeStart =
      view === "day"
        ? startOfDay(baseDate)
        : view === "week"
          ? startOfWeekMonday(baseDate)
          : startOfWeekMonday(startOfMonth(baseDate))

    const rangeEnd =
      view === "day"
        ? endOfDay(baseDate)
        : view === "week"
          ? endOfWeekSunday(baseDate)
          : endOfWeekSunday(endOfMonth(baseDate))

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
          in: ["assigned", "accepted", "in_progress", "completed"],
        },
        task: {
          scheduledDate: {
            gte: rangeStart,
            lte: rangeEnd,
          },
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

    const rows = Array.from(latestAssignmentsMap.values())
      .filter((assignment) => normalizeStatus(assignment.task.status) !== "cancelled")
      .map((assignment) => ({
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

    const groupedByDay = rows.reduce<Record<string, typeof rows>>((acc, item) => {
      const key = formatDateKey(new Date(item.task.scheduledDate))
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})

    return NextResponse.json({
      partner: portalAccess.partner,
      view,
      rangeStart,
      rangeEnd,
      baseDate,
      items: rows,
      groupedByDay,
    })
  } catch (error) {
    console.error("GET /api/partner/[token]/calendar error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης ημερολογίου συνεργάτη." },
      { status: 500 }
    )
  }
}