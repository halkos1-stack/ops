import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiPartnerAccess,
  canPartnerAccessChecklistRun,
} from "@/lib/partner-route-access"

type RouteContext = {
  params: Promise<{
    runId: string
  }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiPartnerAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { runId } = await context.params

    const allowed = await canPartnerAccessChecklistRun(auth, runId)

    if (!allowed) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το checklist run." },
        { status: 403 }
      )
    }

    const run = await prisma.taskChecklistRun.findFirst({
      where: {
        id: runId,
        organizationId: auth.organizationId,
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
    })

    if (!run) {
      return NextResponse.json(
        { error: "Το checklist run δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(run)
  } catch (error) {
    console.error("Partner checklist run GET by id error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης checklist run συνεργάτη." },
      { status: 500 }
    )
  }
}