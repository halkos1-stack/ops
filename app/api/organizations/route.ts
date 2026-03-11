import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function toRequiredString(value: unknown, fieldName: string) {
  const text = String(value ?? "").trim()

  if (!text) {
    throw new Error(`Το πεδίο "${fieldName}" είναι υποχρεωτικό.`)
  }

  return text
}

function normalizeSlug(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
}

export async function GET() {
  try {
    const organizations = await prisma.organization.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            properties: true,
            bookings: true,
            partners: true,
            tasks: true,
            issues: true,
            events: true,
            memberships: true,
          },
        },
      },
    })

    return NextResponse.json(organizations)
  } catch (error) {
    console.error("Organizations GET error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης οργανισμών." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const name = toRequiredString(body.name, "name")
    const slug = normalizeSlug(toRequiredString(body.slug, "slug"))
    const isActive = body.isActive === undefined ? true : Boolean(body.isActive)

    const existing = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Υπάρχει ήδη οργανισμός με αυτό το slug." },
        { status: 400 }
      )
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        isActive,
      },
      include: {
        _count: {
          select: {
            properties: true,
            bookings: true,
            partners: true,
            tasks: true,
            issues: true,
            events: true,
            memberships: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        organization,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Organizations POST error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία δημιουργίας οργανισμού."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}