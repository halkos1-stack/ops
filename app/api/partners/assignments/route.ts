import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiPartnerAccess } from "@/lib/partner-route-access"

export async function GET() {
  try {
    const access = await requireApiPartnerAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access

    const assignments = await prisma.taskAssignment.findMany({
      where: {
        organizationId: auth.organizationId,
        partnerId: auth.partnerId,
      },
      orderBy: {
        createdAt: "desc",
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

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Partner assignments GET error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης αναθέσεων συνεργάτη." },
      { status: 500 }
    )
  }
}