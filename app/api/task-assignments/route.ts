import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const taskId = searchParams.get("taskId")
    const partnerId = searchParams.get("partnerId")
    const status = searchParams.get("status")

    const assignments = await prisma.taskAssignment.findMany({
      where: {
        ...(taskId ? { taskId } : {}),
        ...(partnerId ? { partnerId } : {}),
        ...(status ? { status } : {}),
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
    const body = await request.json()

    const taskId = String(body.taskId || "").trim()
    const partnerId = String(body.partnerId || "").trim()
    const notes =
      body.notes !== undefined ? String(body.notes || "").trim() : ""

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
        title: true,
        status: true,
        propertyId: true,
      },
    })

    if (!task) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        name: true,
        status: true,
      },
    })

    if (!partner) {
      return NextResponse.json(
        { error: "Ο συνεργάτης δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (partner.status !== "active") {
      return NextResponse.json(
        { error: "Ο συνεργάτης δεν είναι ενεργός." },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const openAssignments = await tx.taskAssignment.findMany({
        where: {
          taskId,
          status: {
            in: ["assigned", "accepted", "in_progress"],
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
              in: ["assigned", "accepted", "in_progress"],
            },
          },
          data: {
            status: "cancelled",
            notes: "Ακυρώθηκε λόγω νέας ανάθεσης.",
          },
        })
      }

      const assignment = await tx.taskAssignment.create({
        data: {
          taskId,
          partnerId,
          status: "assigned",
          notes: notes || null,
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
          propertyId: task.propertyId,
          taskId: task.id,
          partnerId: partner.id,
          entityType: "TASK_ASSIGNMENT",
          entityId: assignment.id,
          action: "TASK_ASSIGNED",
          message: `Η εργασία "${task.title}" ανατέθηκε στον συνεργάτη ${partner.name}`,
          actorType: "manager",
          actorName: "Διαχειριστής",
          metadata: {
            assignmentStatus: "assigned",
            partnerId: partner.id,
            partnerName: partner.name,
          },
        },
      })

      return assignment
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("POST /api/task-assignments error:", error)

    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας ανάθεσης." },
      { status: 500 }
    )
  }
}