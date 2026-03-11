import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiPartnerAccess } from "@/lib/partner-route-access"

type RouteContext = {
  params: Promise<{
    assignmentId: string
  }>
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiPartnerAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { assignmentId } = await context.params
    const body = await req.json()

    const action = toNullableString(body.action)?.toUpperCase()

    if (action !== "ACCEPTED" && action !== "REJECTED") {
      return NextResponse.json(
        { error: "Η ενέργεια πρέπει να είναι ACCEPTED ή REJECTED." },
        { status: 400 }
      )
    }

    const existingAssignment = await prisma.taskAssignment.findFirst({
      where: {
        id: assignmentId,
        organizationId: auth.organizationId,
        partnerId: auth.partnerId,
      },
      select: {
        id: true,
        taskId: true,
        status: true,
      },
    })

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Η ανάθεση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedAssignment = await tx.taskAssignment.update({
        where: {
          id: assignmentId,
        },
        data: {
          status: action,
          respondedAt: new Date(),
        },
      })

      await tx.task.update({
        where: {
          id: existingAssignment.taskId,
        },
        data: {
          status: action === "ACCEPTED" ? "ACCEPTED" : "REJECTED",
        },
      })

      return updatedAssignment
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Partner assignment respond POST error:", error)
    return NextResponse.json(
      { error: "Αποτυχία απάντησης ανάθεσης." },
      { status: 500 }
    )
  }
}