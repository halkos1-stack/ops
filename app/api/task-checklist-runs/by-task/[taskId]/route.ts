import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    taskId: string
  }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const auth = access.auth
    const { taskId } = await context.params

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        organizationId: true,
      },
    })

    if (!task) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, task.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την εργασία." },
        { status: 403 }
      )
    }

    const run = await prisma.taskChecklistRun.findUnique({
      where: {
        taskId,
      },
      include: {
        template: {
          include: {
            items: {
              orderBy: {
                sortOrder: "asc",
              },
              include: {
                supplyItem: true,
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
        task: {
          include: {
            property: true,
            assignments: {
              include: {
                partner: true,
              },
              orderBy: {
                assignedAt: "desc",
              },
            },
            issues: true,
          },
        },
      },
    })

    if (!run) {
      return NextResponse.json(
        { error: "Δεν υπάρχει checklist run για αυτή την εργασία." },
        { status: 404 }
      )
    }

    return NextResponse.json(run)
  } catch (error) {
    console.error("GET /api/task-checklist-runs/by-task/[taskId] error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης checklist run." },
      { status: 500 }
    )
  }
}