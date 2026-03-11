import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const assignment = await prisma.taskAssignment.findUnique({
      where: { id },
      include: {
        task: {
          include: {
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
            checklistRun: {
              include: {
                template: {
                  include: {
                    items: {
                      orderBy: {
                        sortOrder: "asc",
                      },
                    },
                  },
                },
                answers: {
                  include: {
                    templateItem: true,
                  },
                },
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

    if (!assignment) {
      return NextResponse.json(
        { error: "Η ανάθεση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error("GET /api/task-assignments/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης ανάθεσης." },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()

    const existingAssignment = await prisma.taskAssignment.findUnique({
      where: { id },
      select: {
        id: true,
        taskId: true,
        partnerId: true,
        status: true,
        assignedAt: true,
        acceptedAt: true,
        rejectedAt: true,
        startedAt: true,
        completedAt: true,
        rejectionReason: true,
        notes: true,
        task: {
          select: {
            id: true,
            title: true,
            propertyId: true,
            status: true,
          },
        },
        partner: {
          select: {
            id: true,
            name: true,
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

    const status =
      body.status !== undefined ? String(body.status || "").trim() : undefined

    const rejectionReason =
      body.rejectionReason !== undefined
        ? String(body.rejectionReason || "").trim()
        : undefined

    const notes =
      body.notes !== undefined ? String(body.notes || "").trim() : undefined

    if (status !== undefined && !status) {
      return NextResponse.json(
        { error: "Το status δεν μπορεί να είναι κενό." },
        { status: 400 }
      )
    }

    const allowedStatuses = [
      "assigned",
      "accepted",
      "rejected",
      "in_progress",
      "completed",
      "cancelled",
    ]

    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Μη έγκυρη κατάσταση ανάθεσης." },
        { status: 400 }
      )
    }

    if (status === "rejected" && !rejectionReason?.trim()) {
      return NextResponse.json(
        { error: "Η αιτία απόρριψης είναι υποχρεωτική." },
        { status: 400 }
      )
    }

    const updatedAssignment = await prisma.$transaction(async (tx) => {
      const data: {
        status?: string
        rejectionReason?: string | null
        notes?: string | null
        acceptedAt?: Date | null
        rejectedAt?: Date | null
        startedAt?: Date | null
        completedAt?: Date | null
      } = {}

      if (status !== undefined) {
        data.status = status

        if (status === "accepted") {
          data.acceptedAt = new Date()
          data.rejectedAt = null
        }

        if (status === "rejected") {
          data.rejectedAt = new Date()
          data.acceptedAt = null
          data.startedAt = null
          data.completedAt = null
        }

        if (status === "in_progress") {
          data.startedAt = new Date()
        }

        if (status === "completed") {
          data.completedAt = new Date()
          if (!existingAssignment.startedAt) {
            data.startedAt = new Date()
          }
          if (!existingAssignment.acceptedAt) {
            data.acceptedAt = new Date()
          }
        }

        if (status === "cancelled") {
          data.acceptedAt = null
          data.rejectedAt = null
          data.startedAt = null
          data.completedAt = null
        }
      }

      if (rejectionReason !== undefined) {
        data.rejectionReason = rejectionReason || null
      }

      if (notes !== undefined) {
        data.notes = notes || null
      }

      const assignment = await tx.taskAssignment.update({
        where: { id },
        data,
        include: {
          task: {
            include: {
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

      if (status === "accepted") {
        await tx.task.update({
          where: { id: existingAssignment.taskId },
          data: {
            status: "accepted",
          },
        })
      }

      if (status === "rejected") {
        await tx.task.update({
          where: { id: existingAssignment.taskId },
          data: {
            status: "pending",
          },
        })
      }

      if (status === "in_progress") {
        await tx.task.update({
          where: { id: existingAssignment.taskId },
          data: {
            status: "in_progress",
          },
        })
      }

      if (status === "completed") {
        await tx.task.update({
          where: { id: existingAssignment.taskId },
          data: {
            status: "completed",
            completedAt: new Date(),
          },
        })
      }

      if (status === "cancelled") {
        await tx.task.update({
          where: { id: existingAssignment.taskId },
          data: {
            status: "pending",
          },
        })
      }

      await tx.activityLog.create({
        data: {
          propertyId: existingAssignment.task.propertyId,
          taskId: existingAssignment.taskId,
          partnerId: existingAssignment.partnerId,
          entityType: "TASK_ASSIGNMENT",
          entityId: existingAssignment.id,
          action: "TASK_ASSIGNMENT_UPDATED",
          message: `Η ανάθεση της εργασίας "${existingAssignment.task.title}" ενημερώθηκε σε ${status || existingAssignment.status}`,
          actorType: "manager",
          actorName: "Διαχειριστής",
          metadata: {
            previousStatus: existingAssignment.status,
            newStatus: status || existingAssignment.status,
            rejectionReason: rejectionReason || null,
          },
        },
      })

      return assignment
    })

    return NextResponse.json(updatedAssignment)
  } catch (error) {
    console.error("PUT /api/task-assignments/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης ανάθεσης." },
      { status: 500 }
    )
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const existingAssignment = await prisma.taskAssignment.findUnique({
      where: { id },
      select: {
        id: true,
        taskId: true,
        partnerId: true,
        task: {
          select: {
            id: true,
            title: true,
            propertyId: true,
          },
        },
        partner: {
          select: {
            id: true,
            name: true,
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

    await prisma.$transaction(async (tx) => {
      await tx.taskAssignment.delete({
        where: { id },
      })

      await tx.task.update({
        where: { id: existingAssignment.taskId },
        data: {
          status: "pending",
        },
      })

      await tx.activityLog.create({
        data: {
          propertyId: existingAssignment.task.propertyId,
          taskId: existingAssignment.taskId,
          partnerId: existingAssignment.partnerId,
          entityType: "TASK_ASSIGNMENT",
          entityId: existingAssignment.id,
          action: "TASK_ASSIGNMENT_DELETED",
          message: `Διαγράφηκε η ανάθεση της εργασίας "${existingAssignment.task.title}" από τον συνεργάτη ${existingAssignment.partner.name}`,
          actorType: "manager",
          actorName: "Διαχειριστής",
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/task-assignments/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία διαγραφής ανάθεσης." },
      { status: 500 }
    )
  }
}