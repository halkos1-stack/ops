import { Prisma } from "@prisma/client"
import { getOperationalTaskValidity } from "@/lib/tasks/ops-task-contract"
import {
  buildPropertyConditionSnapshot,
  mapDbConditionToRawRecord,
  type RawPropertyConditionRecord,
} from "@/lib/readiness/property-condition-mappers"

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function toLowerStringOrNull(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text ? text.toLowerCase() : null
}

export function buildTaskOpenConditionsSummary(
  rawConditions: RawPropertyConditionRecord[]
) {
  const snapshot = buildPropertyConditionSnapshot(rawConditions)

  return {
    summary: snapshot.summary,
    reasons: snapshot.reasons,
    active: snapshot.buckets.active,
    blocking: snapshot.buckets.blocking,
    warning: snapshot.buckets.warning,
    monitoring: snapshot.buckets.monitoring,
  }
}

export const taskDetailsInclude = {
  organization: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  property: {
    select: {
      id: true,
      code: true,
      name: true,
      city: true,
      region: true,
      status: true,
      readinessStatus: true,
      readinessUpdatedAt: true,
      readinessReasonsText: true,
      nextCheckInAt: true,
      openConditionCount: true,
      openBlockingConditionCount: true,
      openWarningConditionCount: true,
      propertySupplies: {
        include: {
          supplyItem: true,
        },
      },
    },
  },
  booking: {
    select: {
      id: true,
      guestName: true,
      sourcePlatform: true,
      checkInDate: true,
      checkOutDate: true,
      checkInTime: true,
      checkOutTime: true,
      status: true,
    },
  },
  assignments: {
    orderBy: {
      assignedAt: "desc" as const,
    },
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
    },
  },
  checklistRun: {
    include: {
      template: {
        select: {
          id: true,
          title: true,
          templateType: true,
          isPrimary: true,
        },
      },
      items: {
        orderBy: {
          sortOrder: "asc" as const,
        },
      },
      answers: {
        select: {
          id: true,
          runItemId: true,
          issueCreated: true,
          createdAt: true,
        },
      },
    },
  },
  supplyRun: {
    include: {
      items: {
        orderBy: {
          sortOrder: "asc" as const,
        },
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
                },
              },
            },
          },
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
            },
          },
        },
      },
      answers: {
        include: {
          runItem: true,
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
                },
              },
            },
          },
        },
      },
    },
  },
  issueRun: {
    include: {
      template: {
        select: {
          id: true,
          title: true,
          isPrimary: true,
          isActive: true,
        },
      },
      items: {
        orderBy: {
          sortOrder: "asc" as const,
        },
      },
      answers: {
        select: {
          id: true,
          runItemId: true,
          createdIssueId: true,
          createdAt: true,
        },
      },
    },
  },
  propertyConditions: {
    where: {
      status: {
        in: ["OPEN", "MONITORING"],
      },
    },
    select: {
      id: true,
      propertyId: true,
      taskId: true,
      bookingId: true,
      propertySupplyId: true,
      mergeKey: true,
      sourceType: true,
      sourceLabel: true,
      sourceItemId: true,
      sourceItemLabel: true,
      sourceRunId: true,
      sourceAnswerId: true,
      conditionType: true,
      title: true,
      description: true,
      status: true,
      blockingStatus: true,
      severity: true,
      managerDecision: true,
      managerNotes: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      dismissedAt: true,
    },
    orderBy: [{ updatedAt: "desc" as const }, { createdAt: "desc" as const }],
  },
  issues: {
    select: {
      id: true,
      issueType: true,
      title: true,
      severity: true,
      status: true,
      createdAt: true,
    },
  },
  taskPhotos: {
    select: {
      id: true,
      category: true,
      fileUrl: true,
      fileName: true,
      uploadedAt: true,
    },
  },
  events: {
    select: {
      id: true,
      title: true,
      eventType: true,
      status: true,
      startAt: true,
      endAt: true,
      createdAt: true,
    },
  },
} satisfies Prisma.TaskInclude

export function shapeTaskForResponse(
  task: Prisma.TaskGetPayload<{ include: typeof taskDetailsInclude }>
) {
  const rawConditions = safeArray(task.propertyConditions).map((condition) =>
    mapDbConditionToRawRecord({
      id: condition.id,
      propertyId: condition.propertyId,
      taskId: condition.taskId,
      bookingId: condition.bookingId,
      propertySupplyId: condition.propertySupplyId,
      mergeKey: condition.mergeKey,
      title: condition.title,
      description: condition.description,
      sourceType: condition.sourceType,
      sourceLabel: condition.sourceLabel,
      sourceItemId: condition.sourceItemId,
      sourceItemLabel: condition.sourceItemLabel,
      sourceRunId: condition.sourceRunId,
      sourceAnswerId: condition.sourceAnswerId,
      conditionType: String(condition.conditionType).toLowerCase(),
      status: String(condition.status).toLowerCase(),
      blockingStatus: String(condition.blockingStatus).toLowerCase(),
      severity: String(condition.severity).toLowerCase(),
      managerDecision: condition.managerDecision
        ? String(condition.managerDecision).toLowerCase()
        : null,
      managerNotes: condition.managerNotes,
      createdAt: condition.createdAt,
      updatedAt: condition.updatedAt,
      resolvedAt: condition.resolvedAt,
      dismissedAt: condition.dismissedAt,
    })
  )

  return {
    ...task,
    opsValidity: getOperationalTaskValidity(task),
    latestAssignment: task.assignments[0] ?? null,
    cleaningChecklistRun: task.checklistRun,
    suppliesChecklistRun: task.supplyRun,
    issuesChecklistRun: task.issueRun,
    propertyReadiness: {
      status: toLowerStringOrNull(task.property?.readinessStatus) ?? "unknown",
      updatedAt: task.property?.readinessUpdatedAt?.toISOString() ?? null,
      reasonsText: task.property?.readinessReasonsText ?? null,
      nextCheckInAt: task.property?.nextCheckInAt?.toISOString() ?? null,
      openConditionCount: task.property?.openConditionCount ?? 0,
      openBlockingConditionCount: task.property?.openBlockingConditionCount ?? 0,
      openWarningConditionCount: task.property?.openWarningConditionCount ?? 0,
    },
    taskConditionProofSummary: buildTaskOpenConditionsSummary(rawConditions),
    propertyConditionsSummary: buildTaskOpenConditionsSummary(rawConditions),
  }
}
