import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

type RouteContext = {
  params: Promise<{
    token: string
    taskId: string
  }>
}

function isExpired(date?: Date | string | null) {
  if (!date) return false

  const parsed = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(parsed.getTime())) return false

  return parsed.getTime() < Date.now()
}

function mapSupplyFillLevel(params: {
  currentStock?: number | null
  targetStock?: number | null
  reorderThreshold?: number | null
  minimumStock?: number | null
}) {
  const currentStock =
    typeof params.currentStock === "number" && Number.isFinite(params.currentStock)
      ? params.currentStock
      : 0

  const targetStock =
    typeof params.targetStock === "number" && Number.isFinite(params.targetStock)
      ? params.targetStock
      : null

  const reorderThreshold =
    typeof params.reorderThreshold === "number" &&
    Number.isFinite(params.reorderThreshold)
      ? params.reorderThreshold
      : null

  const minimumStock =
    typeof params.minimumStock === "number" && Number.isFinite(params.minimumStock)
      ? params.minimumStock
      : null

  if (currentStock <= 0) {
    return "low"
  }

  if (targetStock !== null && targetStock > 0 && currentStock >= targetStock) {
    return "full"
  }

  if (reorderThreshold !== null && currentStock <= reorderThreshold) {
    return "medium"
  }

  if (minimumStock !== null && currentStock <= minimumStock) {
    return "medium"
  }

  if (targetStock !== null && currentStock < targetStock) {
    return "medium"
  }

  return "full"
}

const taskAssignmentWithDetailsArgs =
  Prisma.validator<Prisma.TaskAssignmentDefaultArgs>()({
    include: {
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
      task: {
        include: {
          property: {
            select: {
              id: true,
              code: true,
              name: true,
              address: true,
              city: true,
              region: true,
              postalCode: true,
              country: true,
              type: true,
              status: true,
              propertySupplies: {
                orderBy: [
                  {
                    lastUpdatedAt: "desc",
                  },
                  {
                    updatedAt: "desc",
                  },
                  {
                    createdAt: "desc",
                  },
                ],
                include: {
                  supplyItem: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      category: true,
                      unit: true,
                      minimumStock: true,
                      isActive: true,
                    },
                  },
                },
              },
            },
          },
          booking: {
            select: {
              id: true,
              sourcePlatform: true,
              externalBookingId: true,
              guestName: true,
              guestPhone: true,
              guestEmail: true,
              checkInDate: true,
              checkOutDate: true,
              checkInTime: true,
              checkOutTime: true,
              adults: true,
              children: true,
              infants: true,
              status: true,
              notes: true,
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
                    select: {
                      id: true,
                      label: true,
                      description: true,
                      itemType: true,
                      isRequired: true,
                      sortOrder: true,
                      optionsText: true,
                      category: true,
                      requiresPhoto: true,
                      opensIssueOnFail: true,
                      issueTypeOnFail: true,
                      issueSeverityOnFail: true,
                      failureValuesText: true,
                      linkedSupplyItemId: true,
                      supplyUpdateMode: true,
                      supplyQuantity: true,
                    },
                  },
                },
              },
              answers: {
                include: {
                  templateItem: {
                    select: {
                      id: true,
                      label: true,
                    },
                  },
                },
              },
            },
          },
          supplyRun: {
            include: {
              answers: {
                include: {
                  propertySupply: {
                    include: {
                      supplyItem: {
                        select: {
                          id: true,
                          code: true,
                          name: true,
                          category: true,
                          unit: true,
                          minimumStock: true,
                          isActive: true,
                        },
                      },
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
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              severity: true,
              createdAt: true,
            },
          },
          events: {
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              eventType: true,
              createdAt: true,
            },
          },
        },
      },
    },
  })

type TaskAssignmentWithDetails = Prisma.TaskAssignmentGetPayload<
  typeof taskAssignmentWithDetailsArgs
>

function normalizeStatus(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { token, taskId } = await context.params

    const cleanToken = String(token || "").trim()
    const cleanTaskId = String(taskId || "").trim()

    if (!cleanToken) {
      return NextResponse.json(
        { error: "Το portal token είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!cleanTaskId) {
      return NextResponse.json(
        { error: "Το αναγνωριστικό εργασίας είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const portalAccess = await prisma.partnerPortalAccessToken.findFirst({
      where: {
        token: cleanToken,
        isActive: true,
      },
      select: {
        id: true,
        expiresAt: true,
        partnerId: true,
      },
    })

    if (!portalAccess) {
      return NextResponse.json(
        { error: "Το portal link δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (isExpired(portalAccess.expiresAt)) {
      return NextResponse.json(
        { error: "Το portal link έχει λήξει." },
        { status: 410 }
      )
    }

    await prisma.partnerPortalAccessToken.update({
      where: { id: portalAccess.id },
      data: {
        lastUsedAt: new Date(),
      },
    })

    const assignments: TaskAssignmentWithDetails[] =
      await prisma.taskAssignment.findMany({
        where: {
          partnerId: portalAccess.partnerId,
          taskId: cleanTaskId,
        },
        orderBy: [
          {
            assignedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        ...taskAssignmentWithDetailsArgs,
      })

    if (!assignments.length) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε για αυτόν τον συνεργάτη." },
        { status: 404 }
      )
    }

    const latestAssignment = assignments[0]

    const activePropertySupplies = latestAssignment.task.property.propertySupplies.filter(
      (propertySupply) => propertySupply.supplyItem?.isActive
    )

    const taskStatus = normalizeStatus(latestAssignment.task.status)
    const isCancelled = taskStatus === "cancelled"

    const payload = {
      isCancelled,
      cancellationMessage: isCancelled
        ? "Η εργασία έχει ακυρωθεί από τον διαχειριστή και δεν απαιτείται πλέον ενέργεια."
        : null,
      assignment: {
        id: latestAssignment.id,
        status: latestAssignment.status,
        assignedAt: latestAssignment.assignedAt,
        acceptedAt: latestAssignment.acceptedAt,
        rejectedAt: latestAssignment.rejectedAt,
        startedAt: latestAssignment.startedAt,
        completedAt: latestAssignment.completedAt,
        rejectionReason: latestAssignment.rejectionReason,
        notes: latestAssignment.notes,
        responseToken: latestAssignment.responseToken,
        checklistToken: latestAssignment.checklistToken,
        partner: latestAssignment.partner,
      },
      task: {
        id: latestAssignment.task.id,
        title: latestAssignment.task.title,
        description: latestAssignment.task.description,
        taskType: latestAssignment.task.taskType,
        source: latestAssignment.task.source,
        priority: latestAssignment.task.priority,
        status: latestAssignment.task.status,
        scheduledDate: latestAssignment.task.scheduledDate,
        scheduledStartTime: latestAssignment.task.scheduledStartTime,
        scheduledEndTime: latestAssignment.task.scheduledEndTime,
        dueDate: latestAssignment.task.dueDate,
        completedAt: latestAssignment.task.completedAt,
        requiresPhotos: latestAssignment.task.requiresPhotos,
        requiresChecklist: latestAssignment.task.requiresChecklist,
        requiresApproval: latestAssignment.task.requiresApproval,
        sendCleaningChecklist: latestAssignment.task.sendCleaningChecklist,
        sendSuppliesChecklist: latestAssignment.task.sendSuppliesChecklist,
        notes: latestAssignment.task.notes,
        resultNotes: latestAssignment.task.resultNotes,
        property: {
          id: latestAssignment.task.property.id,
          code: latestAssignment.task.property.code,
          name: latestAssignment.task.property.name,
          address: latestAssignment.task.property.address,
          city: latestAssignment.task.property.city,
          region: latestAssignment.task.property.region,
          postalCode: latestAssignment.task.property.postalCode,
          country: latestAssignment.task.property.country,
          type: latestAssignment.task.property.type,
          status: latestAssignment.task.property.status,
          supplies: activePropertySupplies.map((propertySupply) => ({
            id: propertySupply.id,
            fillLevel: mapSupplyFillLevel({
              currentStock: propertySupply.currentStock,
              targetStock: propertySupply.targetStock,
              reorderThreshold: propertySupply.reorderThreshold,
              minimumStock: propertySupply.supplyItem?.minimumStock ?? null,
            }),
            lastUpdatedAt: propertySupply.lastUpdatedAt,
            notes: propertySupply.notes,
            supplyItem: propertySupply.supplyItem
              ? {
                  id: propertySupply.supplyItem.id,
                  code: propertySupply.supplyItem.code,
                  name: propertySupply.supplyItem.name,
                  category: propertySupply.supplyItem.category,
                  unit: propertySupply.supplyItem.unit,
                  minimumStock: propertySupply.supplyItem.minimumStock,
                  isActive: propertySupply.supplyItem.isActive,
                }
              : null,
          })),
        },
        booking: latestAssignment.task.booking,
        checklistRun: latestAssignment.task.checklistRun
          ? {
              id: latestAssignment.task.checklistRun.id,
              status: latestAssignment.task.checklistRun.status,
              startedAt: latestAssignment.task.checklistRun.startedAt,
              completedAt: latestAssignment.task.checklistRun.completedAt,
              template: latestAssignment.task.checklistRun.template
                ? {
                    id: latestAssignment.task.checklistRun.template.id,
                    title: latestAssignment.task.checklistRun.template.title,
                    description:
                      latestAssignment.task.checklistRun.template.description,
                    templateType:
                      latestAssignment.task.checklistRun.template.templateType,
                    items:
                      latestAssignment.task.checklistRun.template.items.map(
                        (item) => ({
                          id: item.id,
                          label: item.label,
                          description: item.description,
                          itemType: item.itemType,
                          isRequired: item.isRequired,
                          sortOrder: item.sortOrder,
                          optionsText: item.optionsText,
                          category: item.category,
                          requiresPhoto: item.requiresPhoto,
                          opensIssueOnFail: item.opensIssueOnFail,
                          issueTypeOnFail: item.issueTypeOnFail,
                          issueSeverityOnFail: item.issueSeverityOnFail,
                          failureValuesText: item.failureValuesText,
                          linkedSupplyItemId: item.linkedSupplyItemId,
                          supplyUpdateMode: item.supplyUpdateMode,
                          supplyQuantity: item.supplyQuantity,
                        })
                      ),
                  }
                : null,
              answers: latestAssignment.task.checklistRun.answers.map((answer) => ({
                id: answer.id,
                notes: answer.notes,
                valueBoolean: answer.valueBoolean,
                valueText: answer.valueText,
                valueNumber: answer.valueNumber,
                valueSelect: answer.valueSelect,
                photoUrls: answer.photoUrls,
                templateItem: answer.templateItem
                  ? {
                      id: answer.templateItem.id,
                      label: answer.templateItem.label,
                    }
                  : null,
              })),
            }
          : null,
        supplyRun: latestAssignment.task.supplyRun
          ? {
              id: latestAssignment.task.supplyRun.id,
              status: latestAssignment.task.supplyRun.status,
              startedAt: latestAssignment.task.supplyRun.startedAt,
              completedAt: latestAssignment.task.supplyRun.completedAt,
              answers: latestAssignment.task.supplyRun.answers.map((answer) => ({
                id: answer.id,
                fillLevel: answer.fillLevel,
                notes: answer.notes,
                propertySupply: {
                  id: answer.propertySupply.id,
                  fillLevel: mapSupplyFillLevel({
                    currentStock: answer.propertySupply.currentStock,
                    targetStock: answer.propertySupply.targetStock,
                    reorderThreshold: answer.propertySupply.reorderThreshold,
                    minimumStock:
                      answer.propertySupply.supplyItem?.minimumStock ?? null,
                  }),
                  lastUpdatedAt: answer.propertySupply.lastUpdatedAt,
                  notes: answer.propertySupply.notes,
                  supplyItem: answer.propertySupply.supplyItem
                    ? {
                        id: answer.propertySupply.supplyItem.id,
                        code: answer.propertySupply.supplyItem.code,
                        name: answer.propertySupply.supplyItem.name,
                        category: answer.propertySupply.supplyItem.category,
                        unit: answer.propertySupply.supplyItem.unit,
                        minimumStock:
                          answer.propertySupply.supplyItem.minimumStock,
                        isActive: answer.propertySupply.supplyItem.isActive,
                      }
                    : null,
                },
              })),
            }
          : null,
        issues: latestAssignment.task.issues,
        events: latestAssignment.task.events,
      },
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error("GET /api/partner/[token]/tasks/[taskId] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης εργασίας συνεργάτη." },
      { status: 500 }
    )
  }
}