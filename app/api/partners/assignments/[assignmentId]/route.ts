import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiPartnerAccess } from "@/lib/partner-route-access"

type RouteContext = {
  params: Promise<{
    assignmentId: string
  }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiPartnerAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { assignmentId } = await context.params

    const assignment = await prisma.taskAssignment.findFirst({
      where: {
        id: assignmentId,
        organizationId: auth.organizationId,
        partnerId: auth.partnerId,
      },
      include: {
        task: {
          include: {
            property: true,
          },
        },
        partner: true,
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
    console.error("Partner assignment GET by id error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης ανάθεσης συνεργάτη." },
      { status: 500 }
    )
  }
}