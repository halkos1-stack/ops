import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiPartnerAccess,
  canPartnerAccessTask,
} from "@/lib/partner-route-access"

type RouteContext = {
  params: Promise<{
    taskId: string
  }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiPartnerAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { taskId } = await context.params

    const allowed = await canPartnerAccessTask(auth, taskId)

    if (!allowed) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την εργασία." },
        { status: 403 }
      )
    }

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: auth.organizationId,
      },
      include: {
        property: true,
        assignments: {
          where: {
            partnerId: auth.partnerId,
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            partner: true,
          },
        },
        checklistRuns: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            answers: true,
          },
        },
        issues: {
          orderBy: {
            createdAt: "desc",
          },
        },
        events: {
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
    console.error("Partner task GET by id error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης εργασίας συνεργάτη." },
      { status: 500 }
    )
  }
}