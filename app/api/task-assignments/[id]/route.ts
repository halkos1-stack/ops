import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiAppAccess,
  canAccessOrganization,
} from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type AssignmentStatus = "assigned" | "accepted" | "rejected" | "completed"

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function normalizeAssignmentStatus(value: unknown): AssignmentStatus | null {
  const text = String(value ?? "").trim().toLowerCase()

  if (text === "assigned") return "assigned"
  if (text === "accepted") return "accepted"
  if (text === "rejected") return "rejected"
  if (text === "completed") return "completed"

  return null
}

function getBaseUrlFromRequest(req?: NextRequest | null) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (envUrl) {
    return envUrl.replace(/\/+$/, "")
  }

  const origin = req?.headers.get("origin")
  if (origin) {
    return origin.replace(/\/+$/, "")
  }

  const host = req?.headers.get("host")
  const protocol =
    process.env.NODE_ENV === "development" ? "http" : "https"

  if (host) {
    return `${protocol}://${host}`
  }

  return "http://localhost:3000"
}

async function getAssignmentBase(id: string) {
  return prisma.taskAssignment.findUnique({
    where: { id },
    select: {
      id: true,
      taskId: true,
      partnerId: true,
      status: true,
      assignedAt: true,
      acceptedAt: true,
      rejectedAt: true,
      startedAt: true,
      completedAt: true,
      rejectionReason: true,
      notes: true,
      responseToken: true,
      responseTokenExpiresAt: true,
      task: {
        select: {
          id: true,
          title: true,
          propertyId: true,
          organizationId: true,
          status: true,
        },
      },
      partner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}

async function buildAssignmentResponse(id: string, req?: NextRequest) {
  const assignment = await prisma.taskAssignment.findUnique({
    where: { id },
    include: {
      task: {
        include: {
          property: {
            select: {
              id: true,
              code: true,
              name: true,
              city: true,
              address: true,
            },
          },
          booking: {
            select: {
              id: true,
              guestName: true,
              checkInDate: true,
              checkOutDate: true,
              status: true,
            },
          },
          checklistRun: {
            include: {
              template: {
                include: {
                  items: {
                    orderBy: {
                      sortOrder: "asc",
                    },
                  },
                },
              },
              answers: {
                include: {
                  templateItem: true,
                },
              },
            },
          },
        },
      },
      partner: {
        select: {
          id: true,
          code: true,
          name: true,
          email: true,
          phone: true,
          specialty: true,
          status: true,
        },
      },
    },
  })

  if (!assignment) return null

  const portalAccess = assignment.partnerId
    ? await prisma.partnerPortalAccessToken.findFirst({
        where: {
          partnerId: assignment.partnerId,
          isActive: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          token: true,
          expiresAt: true,
        },
      })
    : null

  const baseUrl = getBaseUrlFromRequest(req)
  const portalToken = portalAccess?.token ?? null
  const portalUrl = portalToken ? `${baseUrl}/partner/${portalToken}` : null

  return {
    ...assignment,
    responseToken: assignment.responseToken ?? null,
    responseTokenExpiresAt: assignment.responseTokenExpiresAt ?? null,
    portalToken,
    portalUrl,
    portalTokenExpiresAt: portalAccess?.expiresAt ?? null,
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { id } = await context.params

    const base = await getAssignmentBase(id)

    if (!base) {
      return NextResponse.json(
        { error: "Η ανάθεση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, base.task.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την ανάθεση." },
        { status: 403 }
      )
    }

    const assignment = await buildAssignmentResponse(id, req)

    if (!assignment) {
      return NextResponse.json(
        { error: "Η ανάθεση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error("GET /api/task-assignments/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης ανάθεσης." },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { id } = await context.params
    const body = await request.json()

    const existingAssignment = await getAssignmentBase(id)

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Η ανάθεση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existingAssignment.task.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την ανάθεση." },
        { status: 403 }
      )
    }

    const status =
      body.status !== undefined
        ? normalizeAssignmentStatus(body.status) ?? undefined
        : undefined

    const rejectionReason =
      body.rejectionReason !== undefined
        ? toNullableString(body.rejectionReason)
        : undefined

    const notes =
      body.notes !== undefined ? toNullableString(body.notes) : undefined

    if (body.status !== undefined && status === undefined) {
      return NextResponse.json(
        { error: "Μη έγκυρη κατάσταση ανάθεσης." },
        { status: 400 }
      )
    }

    if (status === "rejected" && !rejectionReason?.trim()) {
      return NextResponse.json(
        { error: "Η αιτία απόρριψης είναι υποχρεωτική." },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      const data: {
        status?: AssignmentStatus
        rejectionReason?: string | null
        notes?: string | null
        acceptedAt?: Date | null
        rejectedAt?: Date | null
        startedAt?: Date | null
        completedAt?: Date | null
      } = {}

      if (status !== undefined) {
        data.status = status

        if (status === "accepted") {
          data.acceptedAt = new Date()
          data.rejectedAt = null
        }

        if (status === "rejected") {
          data.rejectedAt = new Date()
          data.acceptedAt = null
          data.startedAt = null
          data.completedAt = null
        }

        if (status === "completed") {
          data.completedAt = new Date()

          if (!existingAssignment.startedAt) {
            data.startedAt = new Date()
          }

          if (!existingAssignment.acceptedAt) {
            data.acceptedAt = new Date()
          }
        }
      }

      if (rejectionReason !== undefined) {
        data.rejectionReason = rejectionReason || null
      }

      if (notes !== undefined) {
        data.notes = notes || null
      }

      await tx.taskAssignment.update({
        where: { id },
        data,
      })

      if (status === "accepted") {
        await tx.task.update({
          where: { id: existingAssignment.taskId },
          data: {
            status: "accepted",
          },
        })
      }

      if (status === "rejected") {
        await tx.task.update({
          where: { id: existingAssignment.taskId },
          data: {
            status: "pending",
          },
        })
      }

      if (status === "completed") {
        await tx.task.update({
          where: { id: existingAssignment.taskId },
          data: {
            status: "completed",
            completedAt: new Date(),
          },
        })
      }

      await tx.activityLog.create({
        data: {
          organizationId: existingAssignment.task.organizationId,
          propertyId: existingAssignment.task.propertyId,
          taskId: existingAssignment.taskId,
          partnerId: existingAssignment.partnerId,
          entityType: "TASK_ASSIGNMENT",
          entityId: existingAssignment.id,
          action: "TASK_ASSIGNMENT_UPDATED",
          message: `Η ανάθεση της εργασίας "${existingAssignment.task.title}" ενημερώθηκε σε ${status || existingAssignment.status}`,
          actorType: "manager",
          actorName: "Διαχειριστής",
          metadata: {
            previousStatus: existingAssignment.status,
            newStatus: status || existingAssignment.status,
            rejectionReason: rejectionReason || null,
          },
        },
      })
    })

    const updatedAssignment = await buildAssignmentResponse(id, request)

    return NextResponse.json(updatedAssignment)
  } catch (error) {
    console.error("PUT /api/task-assignments/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης ανάθεσης." },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { id } = await context.params

    const existingAssignment = await getAssignmentBase(id)

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Η ανάθεση δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existingAssignment.task.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την ανάθεση." },
        { status: 403 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.taskAssignment.delete({
        where: { id },
      })

      await tx.task.update({
        where: { id: existingAssignment.taskId },
        data: {
          status: "pending",
        },
      })

      await tx.activityLog.create({
        data: {
          organizationId: existingAssignment.task.organizationId,
          propertyId: existingAssignment.task.propertyId,
          taskId: existingAssignment.taskId,
          partnerId: existingAssignment.partnerId,
          entityType: "TASK_ASSIGNMENT",
          entityId: existingAssignment.id,
          action: "TASK_ASSIGNMENT_DELETED",
          message: `Διαγράφηκε η ανάθεση της εργασίας "${existingAssignment.task.title}" από τον συνεργάτη ${existingAssignment.partner.name}`,
          actorType: "manager",
          actorName: "Διαχειριστής",
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/task-assignments/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία διαγραφής ανάθεσης." },
      { status: 500 }
    )
  }
}
