import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { buildCanonicalSupplySnapshot } from "@/lib/supplies/compute-supply-state"

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

function normalizeStatus(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

function normalizeSupplyMode(value: unknown) {
  return String(value ?? "").trim().toLowerCase() === "numeric_thresholds"
    ? "numeric_thresholds"
    : "direct_state"
}

function normalizeStoredReadinessStatus(
  value: unknown
): "ready" | "borderline" | "not_ready" | "unknown" {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "ready") return "ready"
  if (normalized === "borderline") return "borderline"
  if (normalized === "not_ready") return "not_ready"
  if (normalized === "unknown") return "unknown"

  const upper = String(value ?? "").trim().toUpperCase()
  if (upper === "READY") return "ready"
  if (upper === "BORDERLINE") return "borderline"
  if (upper === "NOT_READY") return "not_ready"
  if (upper === "UNKNOWN") return "unknown"

  return "unknown"
}

function toPortalFillLevel(state: "missing" | "medium" | "full") {
  if (state === "missing") return "low"
  if (state === "medium") return "medium"
  return "full"
}

function buildPartnerSupplyPayload(params: {
  propertySupply: {
    id: string
    fillLevel: string
    stateMode: string
    currentStock: number
    mediumThreshold: number | null
    fullThreshold: number | null
    targetStock: number | null
    reorderThreshold: number | null
    targetLevel: number | null
    minimumThreshold: number | null
    trackingMode: string
    isCritical: boolean
    warningThreshold: number | null
    lastUpdatedAt: Date
    notes: string | null
    supplyItem: {
      id: string
      code: string
      name: string
      nameEl: string | null
      nameEn: string | null
      category: string
      unit: string
      minimumStock: number | null
      isActive: boolean
    } | null
  }
  runItem?: {
    id: string
    stateMode: string
    mediumThreshold: number | null
    fullThreshold: number | null
  } | null
  answerFillLevel?: string | null
  answerQuantityValue?: number | null
}) {
  const { propertySupply, runItem, answerFillLevel, answerQuantityValue } = params

  const computed = buildCanonicalSupplySnapshot({
    isActive: true,
    stateMode: runItem?.stateMode ?? propertySupply.stateMode,
    fillLevel: answerFillLevel ?? propertySupply.fillLevel,
    currentStock:
      typeof answerQuantityValue === "number" && Number.isFinite(answerQuantityValue)
        ? answerQuantityValue
        : propertySupply.currentStock,
    mediumThreshold: runItem?.mediumThreshold ?? propertySupply.mediumThreshold,
    fullThreshold: runItem?.fullThreshold ?? propertySupply.fullThreshold,
    minimumThreshold: propertySupply.minimumThreshold,
    reorderThreshold: propertySupply.reorderThreshold,
    warningThreshold: propertySupply.warningThreshold,
    targetLevel: propertySupply.targetLevel,
    targetStock: propertySupply.targetStock,
    trackingMode: propertySupply.trackingMode,
    supplyMinimumStock: propertySupply.supplyItem?.minimumStock ?? null,
  })

  return {
    id: propertySupply.id,
    fillLevel: toPortalFillLevel(computed.derivedState),
    derivedState: computed.derivedState,
    stateMode: computed.stateMode,
    inputMode:
      computed.stateMode === "numeric_thresholds" ? "quantity" : "state",
    isCountBased: computed.stateMode === "numeric_thresholds",
    currentStock:
      typeof answerQuantityValue === "number" && Number.isFinite(answerQuantityValue)
        ? answerQuantityValue
        : computed.currentStock,
    mediumThreshold: runItem?.mediumThreshold ?? computed.mediumThreshold,
    fullThreshold: runItem?.fullThreshold ?? computed.fullThreshold,
    targetStock: propertySupply.targetStock,
    reorderThreshold: propertySupply.reorderThreshold,
    targetLevel: propertySupply.targetLevel,
    minimumThreshold: propertySupply.minimumThreshold,
    warningThreshold: propertySupply.warningThreshold,
    trackingMode: propertySupply.trackingMode,
    isCritical: propertySupply.isCritical,
    lastUpdatedAt: propertySupply.lastUpdatedAt,
    notes: propertySupply.notes,
    runItem: runItem
      ? {
          id: runItem.id,
          stateMode: normalizeSupplyMode(runItem.stateMode),
          mediumThreshold: runItem.mediumThreshold,
          fullThreshold: runItem.fullThreshold,
        }
      : null,
    supplyItem: propertySupply.supplyItem
      ? {
          id: propertySupply.supplyItem.id,
          code: propertySupply.supplyItem.code,
          name: propertySupply.supplyItem.name,
          nameEl: propertySupply.supplyItem.nameEl,
          nameEn: propertySupply.supplyItem.nameEn,
          category: propertySupply.supplyItem.category,
          unit: propertySupply.supplyItem.unit,
          minimumStock: propertySupply.supplyItem.minimumStock,
          isActive: propertySupply.supplyItem.isActive,
        }
      : null,
  }
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
              readinessStatus: true,
              readinessUpdatedAt: true,
              readinessReasonsText: true,
              nextCheckInAt: true,
              openConditionCount: true,
              openBlockingConditionCount: true,
              openWarningConditionCount: true,
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
                      nameEl: true,
                      nameEn: true,
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
              items: true,
              answers: {
                include: {
                  propertySupply: {
                    include: {
                      supplyItem: {
                        select: {
                          id: true,
                          code: true,
                          name: true,
                          nameEl: true,
                          nameEn: true,
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

    const supplyRunItemsByPropertySupplyId = new Map(
      (latestAssignment.task.supplyRun?.items || [])
        .filter((item) => Boolean(item.propertySupplyId))
        .map((item) => [String(item.propertySupplyId), item])
    )

    const activePropertySupplies = latestAssignment.task.property.propertySupplies.filter(
      (propertySupply) => propertySupply.supplyItem?.isActive
    )

    const taskStatus = normalizeStatus(latestAssignment.task.status)
    const isCancelled = taskStatus === "cancelled"
    const storedReadinessStatus = normalizeStoredReadinessStatus(
      latestAssignment.task.property.readinessStatus
    )

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
          readiness: {
            status: storedReadinessStatus,
            updatedAt: latestAssignment.task.property.readinessUpdatedAt,
            reasonsText: latestAssignment.task.property.readinessReasonsText,
            nextCheckInAt: latestAssignment.task.property.nextCheckInAt,
            openConditionCount: latestAssignment.task.property.openConditionCount,
            openBlockingConditionCount:
              latestAssignment.task.property.openBlockingConditionCount,
            openWarningConditionCount:
              latestAssignment.task.property.openWarningConditionCount,
          },
          supplies: activePropertySupplies.map((propertySupply) =>
            buildPartnerSupplyPayload({
              propertySupply,
              runItem:
                supplyRunItemsByPropertySupplyId.get(propertySupply.id) ?? null,
            })
          ),
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
              items: latestAssignment.task.supplyRun.items.map((item) => ({
                id: item.id,
                propertySupplyId: item.propertySupplyId,
                stateMode: normalizeSupplyMode(item.stateMode),
                mediumThreshold: item.mediumThreshold,
                fullThreshold: item.fullThreshold,
                label: item.label,
                labelEn: item.labelEn,
                sortOrder: item.sortOrder,
              })),
              answers: latestAssignment.task.supplyRun.answers.map((answer) => {
                const runItem = answer.propertySupplyId
                  ? supplyRunItemsByPropertySupplyId.get(answer.propertySupplyId) ?? null
                  : null

                const propertySupplyPayload = answer.propertySupply
                  ? buildPartnerSupplyPayload({
                      propertySupply: answer.propertySupply,
                      runItem,
                      answerFillLevel: answer.fillLevel,
                      answerQuantityValue: answer.quantityValue,
                    })
                  : null

                return {
                  id: answer.id,
                  fillLevel: propertySupplyPayload?.fillLevel ?? "full",
                  derivedState: propertySupplyPayload?.derivedState ?? "full",
                  quantityValue: answer.quantityValue,
                  notes: answer.notes,
                  propertySupply: propertySupplyPayload,
                }
              }),
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
