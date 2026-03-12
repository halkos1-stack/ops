import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiSuperAdmin } from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiSuperAdmin()

    if (!access.ok) {
      return access.response
    }

    const { id } = await context.params

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
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
        memberships: {
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 8,
          select: {
            id: true,
            role: true,
            isActive: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                systemRole: true,
                isActive: true,
              },
            },
          },
        },
        properties: {
          orderBy: {
            createdAt: "desc",
          },
          take: 8,
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            city: true,
            status: true,
            createdAt: true,
          },
        },
        partners: {
          orderBy: {
            createdAt: "desc",
          },
          take: 8,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            specialty: true,
            status: true,
            createdAt: true,
          },
        },
        tasks: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
          select: {
            id: true,
            title: true,
            taskType: true,
            status: true,
            scheduledDate: true,
            createdAt: true,
            property: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            assignments: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
              select: {
                id: true,
                status: true,
                partner: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        issues: {
          orderBy: {
            createdAt: "desc",
          },
          take: 8,
          select: {
            id: true,
            title: true,
            status: true,
            severity: true,
            createdAt: true,
            property: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        events: {
          orderBy: {
            createdAt: "desc",
          },
          take: 8,
          select: {
            id: true,
            title: true,
            eventType: true,
            createdAt: true,
            property: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
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

    const openTasks = organization.tasks.filter((task) => {
      const status = String(task.status ?? "").toUpperCase()
      return !["COMPLETED", "CANCELLED"].includes(status)
    }).length

    const activeProperties = organization.properties.filter((property) => {
      return String(property.status ?? "").toLowerCase() === "active"
    }).length

    const activePartners = organization.partners.filter((partner) => {
      return String(partner.status ?? "").toLowerCase() === "active"
    }).length

    const activeUsers = organization.memberships.filter((membership) => {
      return membership.user.isActive && membership.isActive
    }).length

    return NextResponse.json({
      organization,
      summary: {
        totalUsers: organization._count.memberships,
        totalProperties: organization._count.properties,
        totalPartners: organization._count.partners,
        totalTasks: organization._count.tasks,
        totalIssues: organization._count.issues,
        totalEvents: organization._count.events,
        openTasks,
        activeProperties,
        activePartners,
        activeUsers,
      },
    })
  } catch (error) {
    console.error(
      "GET /api/super-admin/organizations/[id]/overview error:",
      error
    )

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης κεντρικού οργανισμού." },
      { status: 500 }
    )
  }
}