import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  mergePropertyCondition,
  resolveActiveSupplyShortageConditions,
} from "@/lib/checklists/merge-property-conditions"
import { refreshPropertyReadiness } from "@/lib/readiness/refresh-property-readiness"
import {
  buildCanonicalSupplyWriteData,
} from "@/lib/supplies/compute-supply-state"
import {
  normalizeSupplyState,
  normalizeSupplyStateMode,
  toPrismaSupplyStateMode,
} from "@/lib/supplies/supply-mode-rules"

type RouteContext = {
  params: Promise<{
    token: string
    taskId: string
  }>
}

type IncomingSupplyAnswer = {
  propertySupplyId: string
  fillLevel?: "missing" | "medium" | "full" | null
  quantityValue?: number | null
  /// Ποσότητα που βρέθηκε πριν τη συμπλήρωση (προαιρετική — από partner)
  quantityFound?: number | null
  /// Ποσότητα που προστέθηκε κατά την εκτέλεση (προαιρετική — από partner)
  quantityReplenished?: number | null
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

function isNumericSupplyMode(value: unknown) {
  return normalizeSupplyStateMode(value) === "numeric_thresholds"
}

function buildSupplyConditionDescription(input: {
  supplyName: string
  fillLevel: "missing" | "medium" | "full"
  quantityValue?: number | null
  notes?: string | null
}) {
  const parts = [
    `Supply run reported "${input.supplyName}" in state "${input.fillLevel}".`,
  ]

  if (typeof input.quantityValue === "number" && Number.isFinite(input.quantityValue)) {
    parts.push(`Reported stock: ${input.quantityValue}.`)
  }

  if (toNullableTrimmedString(input.notes)) {
    parts.push(`Partner notes: ${toNullableTrimmedString(input.notes)}.`)
  }

  parts.push(
    input.fillLevel === "missing"
      ? "This is a blocking shortage and keeps the property not ready until explicit closure."
      : "This is an active supply warning and keeps the property borderline until explicit closure."
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
          issueRun: {
            select: {
              id: true,
              status: true,
              startedAt: true,
              completedAt: true,
            },
          },
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
        { error: "The portal token is required." },
        { status: 400 }
      )
    }

    if (!cleanTaskId) {
      return NextResponse.json(
        { error: "The task id is required." },
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

        function toFiniteOrNull(value: unknown): number | null {
          if (value === undefined || value === null || value === "") return null
          const n = Number(value)
          return Number.isFinite(n) ? n : null
        }

        return {
          propertySupplyId: String(raw.propertySupplyId || "").trim(),
          fillLevel: normalizeSupplyState(raw.fillLevel),
          quantityValue: toFiniteOrNull(raw.quantityValue),
          quantityFound: toFiniteOrNull(raw.quantityFound),
          quantityReplenished: toFiniteOrNull(raw.quantityReplenished),
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
        { error: "The portal link was not found." },
        { status: 404 }
      )
    }

    if (isExpired(portalAccess.expiresAt)) {
      return NextResponse.json(
        { error: "The portal link has expired." },
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
        { error: "The task was not found for this partner." },
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
            "Supplies can only be submitted when the task is accepted or already in progress.",
        },
        { status: 400 }
      )
    }

    const supplyRun = latestAssignment.task.supplyRun

    if (!supplyRun) {
      return NextResponse.json(
        { error: "This task does not have an active supplies run." },
        { status: 400 }
      )
    }

    if (String(supplyRun.status || "").toLowerCase() === "completed") {
      return NextResponse.json(
        { error: "This supply run has already been submitted and cannot be modified." },
        { status: 409 }
      )
    }

    const activeSupplies = latestAssignment.task.property.propertySupplies.filter(
      (propertySupply) => propertySupply.supplyItem?.isActive
    )

    if (!activeSupplies.length) {
      return NextResponse.json(
        { error: "The property does not have active supplies." },
        { status: 400 }
      )
    }

    const runItemsByPropertySupplyId = new Map(
      supplyRun.items
        .filter((runItem) => Boolean(runItem.propertySupplyId))
        .map((runItem) => [String(runItem.propertySupplyId), runItem])
    )
    const answerMap = new Map<string, IncomingSupplyAnswer>()

    for (const answer of incomingAnswers) {
      if (!answer.propertySupplyId) continue
      answerMap.set(answer.propertySupplyId, answer)
    }

    if (mode === "submit") {
      for (const propertySupply of activeSupplies) {
        const answer = answerMap.get(propertySupply.id)
        const runItem = runItemsByPropertySupplyId.get(propertySupply.id)

        if (!runItem) {
          return NextResponse.json(
            {
              error: `Missing supply run item for "${propertySupply.supplyItem?.name || propertySupply.id}".`,
            },
            { status: 400 }
          )
        }

        const usesNumericMode =
          String(runItem.stateMode || "").trim().toUpperCase() ===
          "NUMERIC_THRESHOLDS"

        if (
          usesNumericMode &&
          (answer?.quantityValue === null ||
            answer?.quantityValue === undefined ||
            !Number.isFinite(answer.quantityValue))
        ) {
          return NextResponse.json(
            {
              error: `The supply "${propertySupply.supplyItem?.name || propertySupply.id}" requires a numeric stock value.`,
            },
            { status: 400 }
          )
        }

        if (!usesNumericMode && !answer?.fillLevel) {
          return NextResponse.json(
            {
              error: `The supply "${propertySupply.supplyItem?.name || propertySupply.id}" requires a supply state.`,
            },
            { status: 400 }
          )
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      const now = new Date()
      const mergeKeysToKeepOpen: string[] = []

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

        if (!incoming || !runItem) {
          continue
        }

        const usesNumericMode = isNumericSupplyMode(runItem.stateMode)

        const canonical = buildCanonicalSupplyWriteData(
          usesNumericMode
            ? {
                stateMode: "numeric_thresholds",
                currentStock: incoming.quantityValue,
                mediumThreshold: runItem.mediumThreshold,
                fullThreshold: runItem.fullThreshold,
              }
            : {
                stateMode: "direct_state",
                fillLevel: incoming.fillLevel,
              }
        )

        const finalState = canonical.fillLevel

        const answerWriteData = {
          fillLevel: canonical.fillLevel,
          quantityValue:
            canonical.stateMode === "numeric_thresholds"
              ? canonical.canonicalTruth.currentStock
              : null,
          quantityFound: incoming.quantityFound ?? null,
          quantityReplenished: incoming.quantityReplenished ?? null,
          finalStateAfterReplenishment: finalState,
          notes: incoming.notes || null,
        }

        const existingAnswer = supplyRun.answers.find(
          (answer) => answer.propertySupplyId === propertySupply.id
        )
        let savedAnswerId: string

        if (existingAnswer) {
          const updatedAnswer = await tx.taskSupplyAnswer.update({
            where: {
              id: existingAnswer.id,
            },
            data: answerWriteData,
            select: {
              id: true,
            },
          })
          savedAnswerId = updatedAnswer.id
        } else {
          const createdAnswer = await tx.taskSupplyAnswer.create({
            data: {
              taskSupplyRunId: supplyRun.id,
              runItemId: runItem.id,
              propertySupplyId: propertySupply.id,
              ...answerWriteData,
            },
            select: {
              id: true,
            },
          })
          savedAnswerId = createdAnswer.id
        }

        if (mode === "submit") {
          const stateBefore = propertySupply.fillLevel

          await tx.propertySupply.update({
            where: {
              id: propertySupply.id,
            },
            data: {
              fillLevel: canonical.fillLevel,
              stateMode: toPrismaSupplyStateMode(canonical.stateMode),
              currentStock: canonical.currentStock,
              mediumThreshold: canonical.mediumThreshold,
              fullThreshold: canonical.fullThreshold,
              targetStock: canonical.targetStock,
              reorderThreshold: canonical.reorderThreshold,
              targetLevel: canonical.targetLevel,
              minimumThreshold: canonical.minimumThreshold,
              trackingMode: canonical.trackingMode,
              warningThreshold: canonical.warningThreshold,
              lastUpdatedAt: now,
              notes: incoming.notes || propertySupply.notes || null,
            },
          })

          await tx.supplyReplenishmentLog.create({
            data: {
              organizationId: latestAssignment.task.property.organizationId,
              propertyId: latestAssignment.task.property.id,
              propertySupplyId: propertySupply.id,
              supplyItemId: propertySupply.supplyItemId,
              taskId: latestAssignment.task.id,
              taskSupplyAnswerId: savedAnswerId,
              quantityBefore: incoming.quantityFound ?? null,
              quantityAdded: incoming.quantityReplenished ?? null,
              quantityAfter:
                canonical.stateMode === "numeric_thresholds"
                  ? (canonical.canonicalTruth.currentStock ?? null)
                  : null,
              stateBefore,
              stateAfter: canonical.fillLevel,
              performedBy: latestAssignment.partner.name,
              notes: incoming.notes || null,
              loggedAt: now,
            },
          })
        }

        const computedState = canonical.fillLevel

        const mergeKey = buildSupplyConditionMergeKey({
          propertyId: latestAssignment.task.property.id,
          propertySupplyId: propertySupply.id,
          supplyItemId: propertySupply.supplyItem?.id ?? null,
        })

        if (mode === "submit" && computedState !== "full") {
          mergeKeysToKeepOpen.push(mergeKey)

          await mergePropertyCondition(
            {
              organizationId: latestAssignment.task.property.organizationId,
              propertyId: latestAssignment.task.property.id,
              taskId: latestAssignment.task.id,
              bookingId: latestAssignment.task.bookingId ?? null,
              propertySupplyId: propertySupply.id,
              mergeKey,
              sourceType: "task_supply_proof",
              sourceLabel: "Supplies run",
              sourceItemId: propertySupply.supplyItem?.id ?? propertySupply.id,
              sourceItemLabel:
                propertySupply.supplyItem?.name ?? propertySupply.id,
              sourceRunId: supplyRun.id,
              sourceAnswerId: savedAnswerId,
              conditionType: "SUPPLY",
              title: buildSupplyConditionTitle(
                propertySupply.supplyItem?.name ?? propertySupply.id
              ),
              description: buildSupplyConditionDescription({
                supplyName:
                  propertySupply.supplyItem?.name ?? propertySupply.id,
                fillLevel: computedState,
                quantityValue:
                  canonical.stateMode === "numeric_thresholds"
                    ? canonical.canonicalTruth.currentStock
                    : null,
                notes: incoming.notes,
              }),
              blockingStatus:
                computedState === "missing" ? "BLOCKING" : "WARNING",
              severity:
                computedState === "missing"
                  ? propertySupply.isCritical
                    ? "HIGH"
                    : "MEDIUM"
                  : propertySupply.isCritical
                    ? "MEDIUM"
                    : "LOW",
              evidence: {
                fillLevel: computedState,
                quantityValue:
                  canonical.stateMode === "numeric_thresholds"
                    ? canonical.canonicalTruth.currentStock
                    : null,
                notes: incoming.notes ?? null,
                propertySupplyId: propertySupply.id,
                runItemId: runItem.id,
              },
              detectedAt: now,
            },
            tx as never
          )
        }
      }

      if (mode === "submit") {
        await resolveActiveSupplyShortageConditions(
          {
            organizationId: latestAssignment.task.property.organizationId,
            propertyId: latestAssignment.task.property.id,
            mergeKeysToKeepOpen,
            resolvedAt: now,
          },
          tx as never
        )
      }

      const refreshedTask = await tx.task.findUnique({
        where: {
          id: latestAssignment.task.id,
        },
        include: {
          checklistRun: true,
          supplyRun: true,
          issueRun: true,
        },
      })

      const cleaningCompleted =
        !refreshedTask?.checklistRun ||
        refreshedTask.checklistRun.status === "completed"

      const suppliesCompleted =
        !refreshedTask?.supplyRun ||
        refreshedTask.supplyRun.status === "completed"

      const issuesCompleted =
        !refreshedTask?.issueRun ||
        refreshedTask.issueRun.status === "completed"

      if (mode === "submit" && cleaningCompleted && suppliesCompleted && issuesCompleted) {
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
            sendIssuesChecklist: latestAssignment.task.sendIssuesChecklist,
            issueRunStatus: latestAssignment.task.issueRun?.status || null,
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
      { error: "Failed to submit partner supplies." },
      { status: 500 }
    )
  }
}
