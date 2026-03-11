import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/auth"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
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

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    await requireSuperAdmin()
    const { id } = await context.params

    const organization = await prisma.organization.findUnique({
      where: { id },
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

    if (!organization) {
      return NextResponse.json(
        { error: "Ο οργανισμός δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(organization)
  } catch (error) {
    console.error("Super admin organization GET by id error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης οργανισμού." },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await requireSuperAdmin()
    const { id } = await context.params
    const body = await req.json()

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Ο οργανισμός δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const name = toNullableString(body.name)
    const slugInput = toNullableString(body.slug)
    const isActive =
      body.isActive === undefined ? undefined : toBoolean(body.isActive, true)

    let nextSlug: string | undefined

    if (slugInput !== null && slugInput !== undefined) {
      nextSlug = slugify(slugInput)

      if (!nextSlug) {
        return NextResponse.json(
          { error: "Μη έγκυρο slug οργανισμού." },
          { status: 400 }
        )
      }

      const slugExists = await prisma.organization.findFirst({
        where: {
          slug: nextSlug,
          NOT: {
            id,
          },
        },
        select: {
          id: true,
        },
      })

      if (slugExists) {
        return NextResponse.json(
          { error: "Το slug χρησιμοποιείται ήδη από άλλον οργανισμό." },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        ...(name !== null && name !== undefined ? { name } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Super admin organization PATCH error:", error)
    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης οργανισμού." },
      { status: 500 }
    )
  }
}