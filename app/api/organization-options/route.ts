import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess } from "@/lib/route-access"

export async function GET() {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access

    if (auth.isSuperAdmin) {
      const organizations = await prisma.organization.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      })

      return NextResponse.json(organizations)
    }

    const organizations = await prisma.organization.findMany({
      where: {
        id: auth.organizationId!,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
    })

    return NextResponse.json(organizations)
  } catch (error) {
    console.error("Organization options GET error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης οργανισμών." },
      { status: 500 }
    )
  }
}