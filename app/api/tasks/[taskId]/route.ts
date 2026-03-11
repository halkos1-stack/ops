import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    taskId: string
  }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { taskId } = await context.params

    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
      },
      include: {
        property: {
          include: {
            defaultPartner: {
              select: {
                id: true,
                name: true,
                email: true,
                specialty: true,
              },
            },
          },
        },
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
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
        issues: {
          orderBy: {
            createdAt: "desc",
          },
        },
        taskPhotos: {
          orderBy: {
            uploadedAt: "desc",
          },
        },
        activityLogs: {
          orderBy: {
            createdAt: "desc",
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

    return NextResponse.json(task)
  } catch (error) {
    console.error("GET /api/tasks/[taskId] error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία φόρτωσης εργασίας.",
      },
      { status: 500 }
    )
  }
}