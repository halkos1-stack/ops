import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        property: true,
        booking: true,
        assignments: {
          include: {
            partner: true,
          },
          orderBy: {
            assignedAt: "desc",
          },
        },
        checklistRun: {
          include: {
            template: true,
            answers: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Get tasks error:", error)

    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const title = body.title?.trim()
    const propertyId = body.propertyId
    const bookingId = body.bookingId?.trim() || null
    const description = body.description?.trim() || null
    const taskType = body.taskType?.trim()
    const source = body.source?.trim() || "manual"
    const priority = body.priority?.trim() || "normal"
    const status = body.status?.trim() || "pending"
    const scheduledDate = body.scheduledDate
    const scheduledStartTime = body.scheduledStartTime?.trim() || null
    const scheduledEndTime = body.scheduledEndTime?.trim() || null
    const notes = body.notes?.trim() || null
    const requiresPhotos = Boolean(body.requiresPhotos)
    const requiresChecklist = Boolean(body.requiresChecklist)
    const requiresApproval = Boolean(body.requiresApproval)

    if (!title || !propertyId || !taskType || !scheduledDate) {
      return NextResponse.json(
        {
          error:
            "Τίτλος, ακίνητο, τύπος εργασίας και προγραμματισμένη ημερομηνία είναι υποχρεωτικά.",
        },
        { status: 400 }
      )
    }

    const property = await prisma.property.findUnique({
      where: {
        id: propertyId,
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: {
          id: bookingId,
        },
      })

      if (!booking) {
        return NextResponse.json(
          { error: "Η κράτηση δεν βρέθηκε." },
          { status: 404 }
        )
      }
    }

    const task = await prisma.task.create({
      data: {
        propertyId,
        bookingId,
        title,
        description,
        taskType,
        source,
        priority,
        status,
        scheduledDate: new Date(scheduledDate),
        scheduledStartTime,
        scheduledEndTime,
        notes,
        requiresPhotos,
        requiresChecklist,
        requiresApproval,
      },
    })

    if (requiresChecklist) {
      const propertyChecklist = await prisma.propertyChecklistTemplate.findUnique({
        where: {
          propertyId,
        },
        include: {
          items: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      })

      if (propertyChecklist && propertyChecklist.isActive) {
        await prisma.taskChecklistRun.create({
          data: {
            taskId: task.id,
            templateId: propertyChecklist.id,
            status: "pending",
            answers: {
              create: propertyChecklist.items.map((item) => ({
                templateItemId: item.id,
              })),
            },
          },
        })

        await prisma.activityLog.create({
          data: {
            propertyId: task.propertyId,
            taskId: task.id,
            bookingId: task.bookingId,
            entityType: "task_checklist_run",
            entityId: task.id,
            action: "checklist_created",
            message: `Δημιουργήθηκε checklist run για την εργασία "${task.title}"`,
            actorType: "system",
            actorName: "System",
            metadata: {
              taskId: task.id,
              propertyChecklistTemplatePropertyId: propertyId,
            },
          },
        })
      }
    }

    await prisma.activityLog.create({
      data: {
        propertyId: task.propertyId,
        taskId: task.id,
        bookingId: task.bookingId,
        entityType: "task",
        entityId: task.id,
        action: "created",
        message: `Δημιουργήθηκε εργασία "${task.title}"`,
        actorType: "admin",
        actorName: "System Admin",
        metadata: {
          taskId: task.id,
          taskType: task.taskType,
          source: task.source,
        },
      },
    })

    const fullTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        property: true,
        booking: true,
        assignments: {
          include: {
            partner: true,
          },
          orderBy: {
            assignedAt: "desc",
          },
        },
        checklistRun: {
          include: {
            template: true,
            answers: true,
          },
        },
      },
    })

    return NextResponse.json(fullTask, { status: 201 })
  } catch (error) {
    console.error("Create task error:", error)

    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    )
  }
}