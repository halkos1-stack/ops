import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/auth"

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toStringValue(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback
  return value.trim()
}

function toBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true
    if (value.toLowerCase() === "false") return false
  }
  return fallback
}

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET() {
  try {
    await requireSuperAdmin()

    const organizations = await prisma.organization.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            memberships: true,
            properties: true,
            partners: true,
            tasks: true,
            issues: true,
            events: true,
          },
        },
      },
    })

    return NextResponse.json(organizations)
  } catch (error) {
    console.error("Super admin organizations GET error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης οργανισμών." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()

    const body = await req.json()

    const name = toStringValue(body.name)
    const slugInput = toNullableString(body.slug)
    const isActive = toBoolean(body.isActive, true)

    if (!name) {
      return NextResponse.json(
        { error: "Το όνομα οργανισμού είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const slug = slugInput ? slugify(slugInput) : slugify(name)

    if (!slug) {
      return NextResponse.json(
        { error: "Δεν προέκυψε έγκυρο slug οργανισμού." },
        { status: 400 }
      )
    }

    const existing = await prisma.organization.findFirst({
      where: {
        slug,
      },
      select: {
        id: true,
      },
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
    })

    return NextResponse.json(organization, { status: 201 })
  } catch (error) {
    console.error("Super admin organizations POST error:", error)
    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας οργανισμού." },
      { status: 500 }
    )
  }
}