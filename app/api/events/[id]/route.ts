import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiAppAccess,
  buildTenantWhere,
  canAccessOrganization,
} from "@/lib/route-access"

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

function toStringValue(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback
  return value.trim()
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { id } = await context.params

    const event = await prisma.event.findFirst({
      where: buildTenantWhere(auth, { id }),
      include: {
        property: true,
        task: true,
        issue: true,
      },
    })

    if (!event) {
      return NextResponse.json(
        { error: "Το συμβάν δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error("Event GET by id error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης συμβάντος." },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { id } = await context.params
    const body = await req.json()

    const existingEvent = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
      },
    })

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Το συμβάν δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existingEvent.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το συμβάν." },
        { status: 403 }
      )
    }

    const title = toStringValue(body.title)
    const description = toNullableString(body.description)
    const type = toNullableString(body.type)
    const status = toNullableString(body.status)

    if (!title) {
      return NextResponse.json(
        { error: "Ο τίτλος συμβάντος είναι υποχρεωτικός." },
        { status: 400 }
      )
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        type,
        status,
      },
      include: {
        property: true,
        task: true,
        issue: true,
      },
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error("Event PUT error:", error)
    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης συμβάντος." },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { id } = await context.params
    const body = await req.json()

    const existingEvent = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
      },
    })

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Το συμβάν δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existingEvent.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το συμβάν." },
        { status: 403 }
      )
    }

    const data: Record<string, unknown> = {}

    if (body.title !== undefined) data.title = toStringValue(body.title)
    if (body.description !== undefined) {
      data.description = toNullableString(body.description)
    }
    if (body.type !== undefined) data.type = toNullableString(body.type)
    if (body.status !== undefined) data.status = toNullableString(body.status)

    const updatedEvent = await prisma.event.update({
      where: { id },
      data,
      include: {
        property: true,
        task: true,
        issue: true,
      },
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error("Event PATCH error:", error)
    return NextResponse.json(
      { error: "Αποτυχία μερικής ενημέρωσης συμβάντος." },
      { status: 500 }
    )
  }
}