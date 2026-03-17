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

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    const cleanToken = String(token || "").trim()

    const { searchParams } = new URL(req.url)
    const status = normalizeStatus(searchParams.get("status"))

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

    const assignments = await prisma.taskAssignment.findMany({
      where: {
        partnerId: portalAccess.partnerId,
      },
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
                postalCode: true,
                country: true,
                type: true,
                status: true,
              },
            },
            booking: {
              select: {
                id: true,
                sourcePlatform: true,
                externalBookingId: true,
                guestName: true,
                guestPhone: true,
                guestEmail: true,
                checkInDate: true,
                checkOutDate: true,
                checkInTime: true,
                checkOutTime: true,
                adults: true,
                children: true,
                infants: true,
                status: true,
                notes: true,
              },
            },
            checklistRun: {
              select: {
                id: true,
                status: true,
                startedAt: true,
                completedAt: true,
              },
            },
            supplyRun: {
              select: {
                id: true,
                status: true,
                startedAt: true,
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

    let latestAssignments = Array.from(latestAssignmentsMap.values())

    latestAssignments = latestAssignments.filter(
      (assignment) => !isCancelledTaskStatus(assignment.task.status)
    )

    if (status) {
      latestAssignments = latestAssignments.filter(
        (assignment) => normalizeStatus(assignment.status) === status
      )
    }

    const rows = latestAssignments.map((assignment) => ({
      assignmentId: assignment.id,
      taskId: assignment.task.id,
      title: assignment.task.title,
      taskType: assignment.task.taskType,
      taskStatus: assignment.task.status,
      assignmentStatus: assignment.status,
      scheduledDate: assignment.task.scheduledDate,
      scheduledStartTime: assignment.task.scheduledStartTime,
      scheduledEndTime: assignment.task.scheduledEndTime,
      assignedAt: assignment.assignedAt,
      acceptedAt: assignment.acceptedAt,
      rejectedAt: assignment.rejectedAt,
      startedAt: assignment.startedAt,
      completedAt: assignment.completedAt,
      checklistToken: assignment.checklistToken,
      responseToken: assignment.responseToken,
      requiresChecklist: assignment.task.requiresChecklist,
      requiresPhotos: assignment.task.requiresPhotos,
      requiresApproval: assignment.task.requiresApproval,
      sendCleaningChecklist: assignment.task.sendCleaningChecklist,
      sendSuppliesChecklist: assignment.task.sendSuppliesChecklist,
      property: {
        id: assignment.task.property.id,
        code: assignment.task.property.code,
        name: assignment.task.property.name,
        address: assignment.task.property.address,
        city: assignment.task.property.city,
        region: assignment.task.property.region,
        postalCode: assignment.task.property.postalCode,
        country: assignment.task.property.country,
        type: assignment.task.property.type,
        status: assignment.task.property.status,
      },
      booking: assignment.task.booking
        ? {
            id: assignment.task.booking.id,
            sourcePlatform: assignment.task.booking.sourcePlatform,
            externalBookingId: assignment.task.booking.externalBookingId,
            guestName: assignment.task.booking.guestName,
            guestPhone: assignment.task.booking.guestPhone,
            guestEmail: assignment.task.booking.guestEmail,
            checkInDate: assignment.task.booking.checkInDate,
            checkOutDate: assignment.task.booking.checkOutDate,
            checkInTime: assignment.task.booking.checkInTime,
            checkOutTime: assignment.task.booking.checkOutTime,
            adults: assignment.task.booking.adults,
            children: assignment.task.booking.children,
            infants: assignment.task.booking.infants,
            status: assignment.task.booking.status,
            notes: assignment.task.booking.notes,
          }
        : null,
      checklistRun: assignment.task.checklistRun
        ? {
            id: assignment.task.checklistRun.id,
            status: assignment.task.checklistRun.status,
            startedAt: assignment.task.checklistRun.startedAt,
            completedAt: assignment.task.checklistRun.completedAt,
          }
        : null,
      supplyRun: assignment.task.supplyRun
        ? {
            id: assignment.task.supplyRun.id,
            status: assignment.task.supplyRun.status,
            startedAt: assignment.task.supplyRun.startedAt,
            completedAt: assignment.task.supplyRun.completedAt,
          }
        : null,
    }))

    return NextResponse.json(rows)
  } catch (error) {
    console.error("GET /api/partner/[token]/tasks error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης εργασιών συνεργάτη." },
      { status: 500 }
    )
  }
}