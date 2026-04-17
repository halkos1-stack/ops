import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, buildTenantWhere } from "@/lib/route-access"

type IncidentIssueLike = {
  id: string
  propertyId: string
  taskId: string | null
  issueType: string
  title: string
  description: string | null
  severity: string
  status: string
  resolvedAt: Date | null
  createdAt: Date
  updatedAt: Date
  property: {
    id: string
    code: string
    name: string
  } | null
  task: {
    id: string
    title: string
    status: string
  } | null
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
    resolvedAt: issue.resolvedAt,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    property: issue.property,
    task: issue.task,
  }
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const { auth } = access
    const { searchParams } = new URL(request.url)

    const propertyId = searchParams.get("propertyId")
    const status = searchParams.get("status")
    const type = searchParams.get("type")

    const issues = await prisma.issue.findMany({
      where: buildTenantWhere(auth, {
        ...(propertyId ? { propertyId } : {}),
        ...(status ? { status } : {}),
        ...(type ? { issueType: type } : {}),
      }),
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(issues.map(mapIssueToIncidentLike))
  } catch (error) {
    console.error("GET /api/incidents error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης συμβάντων." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const { auth } = access
    const body = await request.json()

    const organizationId = auth.organizationId
    const propertyId = String(body.propertyId || "").trim()
    const issueType = String(body.type || "general").trim().toLowerCase()
    const title = toNullableString(body.title) || "Νέο συμβάν"
    const description = toNullableString(body.description)
    const severity = toNullableString(body.severity) || "medium"
    const status = toNullableString(body.status) || "open"
    const taskId = toNullableString(body.linkedTaskId)

    if (!organizationId) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε organizationId." },
        { status: 400 }
      )
    }

    if (!propertyId) {
      return NextResponse.json(
        { error: "Το propertyId είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const verifiedProperty = await prisma.property.findFirst({
      where: { id: propertyId, organizationId },
      select: { id: true },
    })

    if (!verifiedProperty) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε ή δεν ανήκει στον οργανισμό." },
        { status: 404 }
      )
    }

    if (taskId) {
      const verifiedTask = await prisma.task.findFirst({
        where: { id: taskId, organizationId },
        select: { id: true },
      })

      if (!verifiedTask) {
        return NextResponse.json(
          { error: "Η εργασία δεν βρέθηκε ή δεν ανήκει στον οργανισμό." },
          { status: 404 }
        )
      }
    }

    const normalizedStatus = status.toLowerCase()
    const resolvedAt =
      normalizedStatus === "resolved" || normalizedStatus === "closed"
        ? new Date()
        : null

    const issue = await prisma.issue.create({
      data: {
        organizationId,
        propertyId,
        taskId,
        issueType,
        title,
        description,
        severity,
        status,
        reportedBy: auth.email,
        ...(resolvedAt !== null ? { resolvedAt } : {}),
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

    return NextResponse.json(mapIssueToIncidentLike(issue), { status: 201 })
  } catch (error) {
    console.error("POST /api/incidents error:", error)
    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας συμβάντος." },
      { status: 500 }
    )
  }
}
