import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiPartnerAccess,
  buildPartnerChecklistRunWhere,
} from "@/lib/partner-route-access"

export async function GET() {
  try {
    const access = await requireApiPartnerAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access

    const checklistRuns = await prisma.taskChecklistRun.findMany({
      where: buildPartnerChecklistRunWhere(auth),
      orderBy: {
        createdAt: "desc",
      },
      include: {
        task: {
          include: {
            property: true,
            assignments: {
              where: {
                partnerId: auth.partnerId,
              },
              include: {
                partner: true,
              },
            },
          },
        },
        answers: true,
      },
    })

    return NextResponse.json(checklistRuns)
  } catch (error) {
    console.error("Partner checklist runs GET error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης checklist runs συνεργάτη." },
      { status: 500 }
    )
  }
}