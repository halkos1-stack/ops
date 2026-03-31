import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiPartnerAccess,
  buildPartnerTaskWhere,
} from "@/lib/partner-route-access"

export async function GET() {
  try {
    const access = await requireApiPartnerAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access

    const tasks = await prisma.task.findMany({
      where: buildPartnerTaskWhere(auth),
      orderBy: {
        createdAt: "desc",
      },
      include: {
        property: true,
        booking: true,
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
        supplyRun: {
          include: {
            answers: {
              include: {
                propertySupply: {
                  include: {
                    supplyItem: true,
                  },
                },
              },
            },
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

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Partner tasks GET error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης εργασιών συνεργάτη." },
      { status: 500 }
    )
  }
}