import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { mergePropertyCondition } from "@/lib/checklists/merge-property-conditions"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"

type RouteContext = {
  params: Promise<{
    token: string
    taskId: string
  }>
}

type SupplyFillLevel = "low" | "medium" | "full"

type IncomingSupplyAnswer = {
  propertySupplyId: string
  fillLevel?: SupplyFillLevel | null
  notes?: string | null
}

function buildSupplyConditionMergeKey(input: {
  propertyId: string
  propertySupplyId: string
  supplyItemId?: string | null
}) {
  const supplyAnchor = input.supplyItemId ?? input.propertySupplyId
  return `property:${input.propertyId}:supply-item:${supplyAnchor}:condition:supply`
}

function buildSupplyConditionTitle(name: string) {
  return `Supply shortage: ${name}`
}

function buildSupplyConditionDescription(input: {
  supplyName: string
  fillLevel: SupplyFillLevel
  notes?: string | null
}) {
  const parts = [
    `Supply run reported "${input.supplyName}" with fill level "${input.fillLevel}".`,
  ]

  if (toNullableTrimmedString(input.notes)) {
    parts.push(`Partner notes: ${toNullableTrimmedString(input.notes)}.`)
  }

  parts.push(
    "This keeps the property not ready until the shortage is explicitly resolved or dismissed."
  )

  return parts.join(" ")
}

function isExpired(date?: Date | string | null) {
  if (!date) return false

  const parsed = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(parsed.getTime())) return false

  return parsed.getTime() < Date.now()
}

function toNullableTrimmedString(value: unknown) {
  if (value === undefined || value === null) return null

  const text = String(value).trim()
  return text === "" ? null : text
}

function normalizeFillLevel(value: unknown): SupplyFillLevel | null {
  const text = String(value || "")
    .trim()
    .toLowerCase()

  if (["low", "empty", "missing", "έλλειψη", "ελλειψη"].includes(text)) {
    return "low"
  }

  if (["medium", "partial", "μέτρια", "μετρια"].includes(text)) {
    return "medium"
  }

  if (["full", "ok", "πλήρης", "πληρης"].includes(text)) {
    return "full"
  }

  return null
}

function computeStockFromFillLevel(params: {
  fillLevel: SupplyFillLevel
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
      : 0

  if (params.fillLevel === "low") {
    return 0
  }

  if (params.fillLevel === "medium") {
    if (reorderThreshold !== null && reorderThreshold > 0) {
      return reorderThreshold
    }

    if (targetStock !== null && targetStock > 1) {
      return Math.max(1, Math.ceil(targetStock / 2))
    }

    if (minimumStock > 0) {
      return minimumStock
    }

    return Math.max(1, currentStock || 1)
  }

  if (targetStock !== null && targetStock > 0) {
    return targetStock
  }

  if (reorderThreshold !== null && reorderThreshold > 0) {
    return Math.max(reorderThreshold + 1, 2)
  }

  if (minimumStock > 0) {
    return Math.max(minimumStock + 1, 2)
  }

  return Math.max(currentStock, 3)
}

const taskAssignmentWithSupplyArgs =
  Prisma.validator<Prisma.TaskAssignmentDefaultArgs>()({
    include: {
      partner: {
        select: {
          id: true,
          name: true,
        },
      },
      task: {
        include: {
          property: {
            select: {
              id: true,
              organizationId: true,
              name: true,
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
          supplyRun: {
            include: {
              items: true,
              answers: true,
            },
          },
          checklistRun: true,
        },
      },
    },
  })

type TaskAssignmentWithSupply = Prisma.TaskAssignmentGetPayload<
  typeof taskAssignmentWithSupplyArgs
>

export async function POST(req: NextRequest, context: RouteContext) {
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

    const body = await req.json().catch(() => null)

    const mode =
      String(body?.mode || "save").trim().toLowerCase() === "submit"
        ? "submit"
        : "save"

    const rawAnswers = Array.isArray(body?.answers) ? body.answers : []

    const incomingAnswers: IncomingSupplyAnswer[] = rawAnswers.map(
      (entry: unknown) => {
        const raw = (entry ?? {}) as Record<string, unknown>

        return {
          propertySupplyId: String(raw.propertySupplyId || "").trim(),
          fillLevel: normalizeFillLevel(raw.fillLevel),
          notes: toNullableTrimmedString(raw.notes),
        }
      }
    )

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

    const assignments: TaskAssignmentWithSupply[] =
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
        ...taskAssignmentWithSupplyArgs,
      })

    if (!assignments.length) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε για αυτόν τον συνεργάτη." },
        { status: 404 }
      )
    }

    const latestAssignment = assignments[0]

    if (
      !["accepted", "in_progress"].includes(
        String(latestAssignment.status || "").toLowerCase()
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Τα αναλώσιμα μπορούν να συμπληρωθούν μόνο όταν η εργασία είναι αποδεκτή ή σε εξέλιξη.",
        },
        { status: 400 }
      )
    }

    const supplyRun = latestAssignment.task.supplyRun

    if (!supplyRun) {
      return NextResponse.json(
        { error: "Δεν υπάρχει συνδεδεμένη ενότητα αναλωσίμων για αυτή την εργασία." },
        { status: 400 }
      )
    }

    const activeSupplies = latestAssignment.task.property.propertySupplies.filter(
      (propertySupply) => propertySupply.supplyItem?.isActive
    )

    if (!activeSupplies.length) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν έχει ενεργά αναλώσιμα." },
        { status: 400 }
      )
    }

    const runItemsByPropertySupplyId = new Map(
      supplyRun.items
        .filter((runItem) => Boolean(runItem.propertySupplyId))
        .map((runItem) => [String(runItem.propertySupplyId), runItem])
    )

    for (const propertySupply of activeSupplies) {
      if (runItemsByPropertySupplyId.has(propertySupply.id)) continue

      return NextResponse.json(
        {
          error: `Missing supply run item for property supply "${propertySupply.supplyItem?.name || propertySupply.id}".`,
        },
        { status: 400 }
      )
    }

    const answerMap = new Map<string, IncomingSupplyAnswer>()

    for (const answer of incomingAnswers) {
      if (!answer.propertySupplyId) continue
      answerMap.set(answer.propertySupplyId, answer)
    }

    if (mode === "submit") {
      for (const propertySupply of activeSupplies) {
        const answer = answerMap.get(propertySupply.id)

        if (!answer?.fillLevel) {
          return NextResponse.json(
            {
              error: `Το αναλώσιμο "${propertySupply.supplyItem?.name || "—"}" δεν έχει συμπληρωθεί.`,
            },
            { status: 400 }
          )
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      const now = new Date()

      if (latestAssignment.status === "accepted") {
        await tx.taskAssignment.update({
          where: {
            id: latestAssignment.id,
          },
          data: {
            startedAt: latestAssignment.startedAt || now,
            status: "in_progress",
          },
        })

        await tx.task.update({
          where: {
            id: latestAssignment.task.id,
          },
          data: {
            status: "in_progress",
          },
        })
      }

      await tx.taskSupplyRun.update({
        where: {
          taskId: latestAssignment.task.id,
        },
        data: {
          status: mode === "submit" ? "completed" : "in_progress",
          startedAt: supplyRun.startedAt || now,
          completedAt: mode === "submit" ? now : null,
        },
      })

      for (const propertySupply of activeSupplies) {
        const incoming = answerMap.get(propertySupply.id)
        const runItem = runItemsByPropertySupplyId.get(propertySupply.id)

        if (!incoming?.fillLevel) {
          continue
        }

        const existingAnswer = supplyRun.answers.find(
          (answer) => answer.propertySupplyId === propertySupply.id
        )

        if (existingAnswer) {
          await tx.taskSupplyAnswer.update({
            where: {
              id: existingAnswer.id,
            },
            data: {
              fillLevel: incoming.fillLevel,
              notes: incoming.notes || null,
            },
          })
        } else {
          await tx.taskSupplyAnswer.create({
            data: {
              taskSupplyRunId: supplyRun.id,
              runItemId: runItem!.id,
              propertySupplyId: propertySupply.id,
              fillLevel: incoming.fillLevel,
              notes: incoming.notes || null,
            },
          })
        }

        const nextStock = computeStockFromFillLevel({
          fillLevel: incoming.fillLevel,
          currentStock: propertySupply.currentStock,
          targetStock: propertySupply.targetStock,
          reorderThreshold: propertySupply.reorderThreshold,
          minimumStock: propertySupply.supplyItem?.minimumStock ?? null,
        })

        await tx.propertySupply.update({
          where: {
            id: propertySupply.id,
          },
          data: {
            currentStock: nextStock,
            lastUpdatedAt: now,
            notes: incoming.notes || propertySupply.notes || null,
          },
        })

        if (mode === "submit" && incoming.fillLevel === "low") {
          await mergePropertyCondition(
            {
              organizationId: latestAssignment.task.property.organizationId,
              propertyId: latestAssignment.task.property.id,
              taskId: latestAssignment.task.id,
              bookingId: latestAssignment.task.bookingId ?? null,
              propertySupplyId: propertySupply.id,
              mergeKey: buildSupplyConditionMergeKey({
                propertyId: latestAssignment.task.property.id,
                propertySupplyId: propertySupply.id,
                supplyItemId: propertySupply.supplyItem?.id ?? null,
              }),
              sourceType: "task_supply_proof",
              sourceLabel: "Supplies run",
              sourceItemId: propertySupply.supplyItem?.id ?? propertySupply.id,
              sourceItemLabel:
                propertySupply.supplyItem?.name ?? propertySupply.id,
              sourceRunId: supplyRun.id,
              sourceAnswerId: existingAnswer?.id ?? null,
              conditionType: "SUPPLY",
              title: buildSupplyConditionTitle(
                propertySupply.supplyItem?.name ?? propertySupply.id
              ),
              description: buildSupplyConditionDescription({
                supplyName:
                  propertySupply.supplyItem?.name ?? propertySupply.id,
                fillLevel: incoming.fillLevel,
                notes: incoming.notes,
              }),
              blockingStatus: "BLOCKING",
              severity: propertySupply.isCritical ? "HIGH" : "MEDIUM",
              evidence: {
                fillLevel: incoming.fillLevel,
                notes: incoming.notes ?? null,
                propertySupplyId: propertySupply.id,
                runItemId: runItem?.id ?? null,
              },
              detectedAt: now,
            },
            tx as never
          )
        }
      }

      const refreshedTask = await tx.task.findUnique({
        where: {
          id: latestAssignment.task.id,
        },
        include: {
          checklistRun: true,
          supplyRun: true,
        },
      })

      const cleaningCompleted =
        !refreshedTask?.checklistRun ||
        refreshedTask.checklistRun.status === "completed"

      const suppliesCompleted =
        !refreshedTask?.supplyRun ||
        refreshedTask.supplyRun.status === "completed"

      if (mode === "submit" && cleaningCompleted && suppliesCompleted) {
        await tx.taskAssignment.update({
          where: {
            id: latestAssignment.id,
          },
          data: {
            completedAt: now,
            status: "completed",
          },
        })

        await tx.task.update({
          where: {
            id: latestAssignment.task.id,
          },
          data: {
            completedAt: now,
            status: "completed",
          },
        })
      }

      await tx.activityLog.create({
        data: {
          organizationId: latestAssignment.task.property.organizationId,
          propertyId: latestAssignment.task.property.id,
          taskId: latestAssignment.task.id,
          partnerId: latestAssignment.partnerId,
          entityType: "TASK_SUPPLY_RUN",
          entityId: supplyRun.id,
          action:
            mode === "submit"
              ? "PARTNER_SUPPLIES_SUBMITTED"
              : "PARTNER_SUPPLIES_SAVED",
          message:
            mode === "submit"
              ? `Ο συνεργάτης ${latestAssignment.partner.name} υπέβαλε τα αναλώσιμα από το portal.`
              : `Ο συνεργάτης ${latestAssignment.partner.name} αποθήκευσε πρόοδο αναλωσίμων από το portal.`,
          actorType: "PARTNER_PORTAL",
          actorName: latestAssignment.partner.name,
          metadata: {
            taskId: latestAssignment.task.id,
            taskSupplyRunId: supplyRun.id,
            mode,
            answersCount: incomingAnswers.length,
          },
        },
      })
    })

    const propertyTruth = await refreshPropertyReadiness(
      latestAssignment.task.property.id
    )

    return NextResponse.json({
      success: true,
      mode,
      propertyReadiness: {
        status: propertyTruth.readiness.status,
        explain: propertyTruth.readiness.explain,
        reasons: propertyTruth.readiness.reasons,
        updatedAt:
          propertyTruth.updatedProperty.readinessUpdatedAt?.toISOString() ?? null,
      },
    })
  } catch (error) {
    console.error("POST /api/partner/[token]/tasks/[taskId]/supplies error:", error)

    return NextResponse.json(
      { error: "Αποτυχία υποβολής αναλωσίμων συνεργάτη." },
      { status: 500 }
    )
  }
}
