import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiSuperAdmin } from "@/lib/route-access"

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null

  const text = String(value).trim()
  return text === "" ? null : text
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function createUniqueSlug(baseValue: string) {
  const baseSlug = slugify(baseValue)

  if (!baseSlug) {
    throw new Error("Δεν ήταν δυνατή η δημιουργία έγκυρου slug.")
  }

  const existing = await prisma.organization.findUnique({
    where: { slug: baseSlug },
    select: { id: true },
  })

  if (!existing) {
    return baseSlug
  }

  let counter = 2

  while (true) {
    const candidate = `${baseSlug}-${counter}`

    const found = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })

    if (!found) {
      return candidate
    }

    counter += 1
  }
}

export async function GET() {
  try {
    const access = await requireApiSuperAdmin()

    if (!access.ok) {
      return access.response
    }

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
    console.error("GET /api/super-admin/organizations error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης οργανισμών." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireApiSuperAdmin()

    if (!access.ok) {
      return access.response
    }

    const body = await request.json()

    const name = String(body?.name ?? "").trim()
    const providedSlug = toNullableString(body?.slug)
    const isActive = Boolean(body?.isActive ?? true)

    if (!name) {
      return NextResponse.json(
        { error: "Το όνομα οργανισμού είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const finalSlug = await createUniqueSlug(providedSlug || name)

    const existingBySlug = await prisma.organization.findUnique({
      where: { slug: finalSlug },
      select: { id: true },
    })

    if (existingBySlug) {
      return NextResponse.json(
        { error: "Υπάρχει ήδη οργανισμός με αυτό το slug." },
        { status: 409 }
      )
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug: finalSlug,
        isActive,
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

    return NextResponse.json(organization, { status: 201 })
  } catch (error) {
    console.error("POST /api/super-admin/organizations error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία δημιουργίας οργανισμού."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}