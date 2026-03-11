import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiAppAccess,
  buildTenantWhere,
  canAccessOrganization,
} from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    taskId: string
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
    const { taskId } = await context.params

    const task = await prisma.task.findFirst({
      where: buildTenantWhere(auth, { id: taskId }),
      include: {
        property: true,
        assignments: {
          include: {
            partner: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        checklistRuns: {
          include: {
            answers: true,
          },
          orderBy: {
            createdAt: "desc",
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

    if (!task) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Task GET by id error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης εργασίας." },
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
    const { taskId } = await context.params
    const body = await req.json()

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        organizationId: true,
      },
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existingTask.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την εργασία." },
        { status: 403 }
      )
    }

    const title = toStringValue(body.title)
    const description = toNullableString(body.description)
    const type = toNullableString(body.type)
    const status = toNullableString(body.status)

    if (!title) {
      return NextResponse.json(
        { error: "Ο τίτλος εργασίας είναι υποχρεωτικός." },
        { status: 400 }
      )
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title,
        description,
        type,
        ...(status !== null ? { status } : {}),
      },
      include: {
        property: true,
        assignments: {
          include: {
            partner: true,
          },
        },
        checklistRuns: true,
      },
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error("Task PUT error:", error)
    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης εργασίας." },
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
    const { taskId } = await context.params
    const body = await req.json()

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        organizationId: true,
      },
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existingTask.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την εργασία." },
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

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        property: true,
        assignments: {
          include: {
            partner: true,
          },
        },
        checklistRuns: true,
      },
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error("Task PATCH error:", error)
    return NextResponse.json(
      { error: "Αποτυχία μερικής ενημέρωσης εργασίας." },
      { status: 500 }
    )
  }
}