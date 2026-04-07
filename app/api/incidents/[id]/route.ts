import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, buildTenantWhere } from "@/lib/route-access"

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

function mapIssueToIncidentLike(issue: IncidentIssueLike) {
  return {
    id: issue.id,
    code: `ISS-${String(issue.id).slice(-8).toUpperCase()}`,
    propertyId: issue.propertyId,
    linkedTaskId: issue.taskId,
    type: issue.issueType,
    title: issue.title,
    description: issue.description,
    severity: issue.severity,
    status: issue.status,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    property: issue.property,
    task: issue.task,
  }
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const { auth } = access
    const { id } = await context.params

    const issue = await prisma.issue.findFirst({
      where: buildTenantWhere(auth, { id }),
      include: {
        property: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            city: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            scheduledDate: true,
          },
        },
      },
    })

    if (!issue) {
      return NextResponse.json(
        { error: "Το συμβάν δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(mapIssueToIncidentLike(issue))
  } catch (error) {
    console.error("GET /api/incidents/[id] error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης συμβάντος." },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const { auth } = access
    const { id } = await context.params
    const body = await request.json()

    const existing = await prisma.issue.findFirst({
      where: buildTenantWhere(auth, { id }),
      select: {
        id: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Το συμβάν δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const updated = await prisma.issue.update({
      where: { id },
      data: {
        ...(body.type !== undefined ? { issueType: toNullableString(body.type) || "general" } : {}),
        ...(body.title !== undefined ? { title: toNullableString(body.title) || "Νέο συμβάν" } : {}),
        ...(body.description !== undefined ? { description: toNullableString(body.description) } : {}),
        ...(body.severity !== undefined ? { severity: toNullableString(body.severity) || "medium" } : {}),
        ...(body.status !== undefined ? { status: toNullableString(body.status) || "open" } : {}),
        ...(body.linkedTaskId !== undefined ? { taskId: toNullableString(body.linkedTaskId) } : {}),
      },
      include: {
        property: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json(mapIssueToIncidentLike(updated))
  } catch (error) {
    console.error("PUT /api/incidents/[id] error:", error)
    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης συμβάντος." },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const { auth } = access
    const { id } = await context.params

    const existing = await prisma.issue.findFirst({
      where: buildTenantWhere(auth, { id }),
      select: {
        id: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Το συμβάν δεν βρέθηκε." },
        { status: 404 }
      )
    }

    await prisma.issue.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/incidents/[id] error:", error)
    return NextResponse.json(
      { error: "Αποτυχία διαγραφής συμβάντος." },
      { status: 500 }
    )
  }
}
type IncidentIssueLike = {
  id: string
  propertyId: string
  taskId: string | null
  issueType: string
  title: string
  description: string | null
  severity: string
  status: string
  createdAt: Date
  updatedAt: Date
  property: {
    id: string
    code: string
    name: string
    address?: string | null
    city?: string | null
  } | null
  task: {
    id: string
    title: string
    status: string
    scheduledDate?: Date | null
  } | null
}
