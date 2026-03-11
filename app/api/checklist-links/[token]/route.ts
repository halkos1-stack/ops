import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    token: string
  }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params

    const assignment = await prisma.taskAssignment.findFirst({
      where: {
        checklistToken: token,
      },
      include: {
        partner: true,
        task: {
          include: {
            property: true,
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
                answers: true,
              },
            },
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε το checklist link." },
        { status: 404 }
      )
    }

    const isExpired =
      assignment.checklistTokenExpiresAt &&
      new Date(assignment.checklistTokenExpiresAt).getTime() < Date.now()

    return NextResponse.json({
      assignment,
      isExpired,
    })
  } catch (error) {
    console.error("GET /api/checklist-links/[token] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης checklist." },
      { status: 500 }
    )
  }
}