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
        responseToken: token,
      },
      include: {
        partner: true,
        task: {
          include: {
            property: true,
            checklistRun: {
              include: {
                template: true,
              },
            },
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε η ανάθεση." },
        { status: 404 }
      )
    }

    const isExpired =
      assignment.responseTokenExpiresAt &&
      new Date(assignment.responseTokenExpiresAt).getTime() < Date.now()

    return NextResponse.json({
      assignment,
      isExpired,
    })
  } catch (error) {
    console.error("GET /api/assignment-links/[token] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης ανάθεσης." },
      { status: 500 }
    )
  }
}