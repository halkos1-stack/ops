import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const partners = await prisma.partner.findMany({
      where: {
        status: "active",
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        phone: true,
        specialty: true,
        status: true,
      },
    })

    return NextResponse.json(partners)
  } catch (error) {
    console.error("GET /api/partners error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης συνεργατών." },
      { status: 500 }
    )
  }
}