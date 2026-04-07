import { PropertySupplyStateMode } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { buildCanonicalSupplyWriteData } from "@/lib/supplies/compute-supply-state"

function toPrismaSupplyStateMode(
  mode: "direct_state" | "numeric_thresholds"
): PropertySupplyStateMode {
  return mode === "numeric_thresholds"
    ? PropertySupplyStateMode.NUMERIC_THRESHOLDS
    : PropertySupplyStateMode.DIRECT_STATE
}

export async function findPrimaryChecklistTemplate(
  organizationId: string,
  propertyId: string
) {
  return prisma.propertyChecklistTemplate.findFirst({
    where: {
      organizationId,
      propertyId,
      isPrimary: true,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      templateType: true,
      isPrimary: true,
      isActive: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })
}

export async function countActivePropertySupplies(propertyId: string) {
  return prisma.propertySupply.count({
    where: {
      propertyId,
      isActive: true,
    },
  })
}

export async function syncTaskChecklistRun(params: {
  taskId: string
  organizationId: string
  propertyId: string
  sendCleaningChecklist: boolean
}) {
  const { taskId, organizationId, propertyId, sendCleaningChecklist } = params

  const existingRun = await prisma.taskChecklistRun.findUnique({
    where: {
      taskId,
    },
    select: {
      id: true,
      templateId: true,
      status: true,
    },
  })

  if (!sendCleaningChecklist) {
    if (existingRun) {
      await prisma.taskChecklistAnswer.deleteMany({
        where: {
          checklistRunId: existingRun.id,
        },
      })

      await prisma.taskChecklistRun.delete({
        where: {
          taskId,
        },
      })
    }

    return null
  }

  const primaryTemplate = await findPrimaryChecklistTemplate(
    organizationId,
    propertyId
  )

  if (!primaryTemplate) {
    if (existingRun) {
      await prisma.taskChecklistAnswer.deleteMany({
        where: {
          checklistRunId: existingRun.id,
        },
      })

      await prisma.taskChecklistRun.delete({
        where: {
          taskId,
        },
      })
    }

    return null
  }

  if (!existingRun) {
    return prisma.taskChecklistRun.create({
      data: {
        taskId,
        templateId: primaryTemplate.id,
        status: "pending",
      },
    })
  }

  if (existingRun.templateId !== primaryTemplate.id) {
    await prisma.taskChecklistAnswer.deleteMany({
      where: {
        checklistRunId: existingRun.id,
      },
    })

    return prisma.taskChecklistRun.update({
      where: {
        taskId,
      },
      data: {
        templateId: primaryTemplate.id,
        status: "pending",
        startedAt: null,
        completedAt: null,
      },
    })
  }

  return prisma.taskChecklistRun.findUnique({
    where: {
      taskId,
    },
  })
}

export async function syncTaskSupplyRun(params: {
  taskId: string
  propertyId: string
  sendSuppliesChecklist: boolean
}) {
  const { taskId, propertyId, sendSuppliesChecklist } = params

  const existingRun = await prisma.taskSupplyRun.findUnique({
    where: {
      taskId,
    },
    include: {
      answers: {
        select: {
          id: true,
          propertySupplyId: true,
        },
      },
    },
  })

  if (!sendSuppliesChecklist) {
    if (existingRun) {
      await prisma.taskSupplyAnswer.deleteMany({
        where: {
          taskSupplyRunId: existingRun.id,
        },
      })

      await prisma.taskSupplyRun.delete({
        where: {
          taskId,
        },
      })
    }

    return null
  }

  const propertySupplies = await prisma.propertySupply.findMany({
    where: {
      propertyId,
      isActive: true,
    },
    select: {
      id: true,
      supplyItemId: true,
      fillLevel: true,
      stateMode: true,
      currentStock: true,
      mediumThreshold: true,
      fullThreshold: true,
      targetStock: true,
      reorderThreshold: true,
      targetLevel: true,
      minimumThreshold: true,
      trackingMode: true,
      isCritical: true,
      warningThreshold: true,
      notes: true,
      supplyItem: {
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          unit: true,
        },
      },
    },
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
  })

  if (propertySupplies.length === 0) {
    if (existingRun) {
      await prisma.taskSupplyAnswer.deleteMany({
        where: {
          taskSupplyRunId: existingRun.id,
        },
      })

      await prisma.taskSupplyRun.delete({
        where: {
          taskId,
        },
      })
    }

    return null
  }

  const run =
    existingRun ||
    (await prisma.taskSupplyRun.create({
      data: {
        taskId,
        status: "pending",
      },
      include: {
        answers: {
          select: {
            id: true,
            propertySupplyId: true,
          },
        },
      },
    }))

  const existingAnswerMap = new Map(
    run.answers
      .filter((answer) => Boolean(answer.propertySupplyId))
      .map((answer) => [String(answer.propertySupplyId), answer])
  )

  const activePropertySupplyIds = new Set(propertySupplies.map((row) => row.id))

  for (const propertySupply of propertySupplies) {
    const existingAnswer = existingAnswerMap.get(propertySupply.id)
    let runItem = await prisma.taskSupplyRunItem.findFirst({
      where: {
        taskSupplyRunId: run.id,
        propertySupplyId: propertySupply.id,
      },
      select: {
        id: true,
      },
    })

    const canonicalSupply = buildCanonicalSupplyWriteData({
      stateMode: propertySupply.stateMode,
      fillLevel: propertySupply.fillLevel,
      currentStock: propertySupply.currentStock,
      mediumThreshold: propertySupply.mediumThreshold,
      fullThreshold: propertySupply.fullThreshold,
      isActive: true,
    })

    if (!runItem) {
      runItem = await prisma.taskSupplyRunItem.create({
        data: {
          taskSupplyRunId: run.id,
          propertySupplyId: propertySupply.id,
          supplyItemId: propertySupply.supplyItemId,
          propertySupplyCode: propertySupply.supplyItem.code,
          label: propertySupply.supplyItem.name,
          labelEn: null,
          category: propertySupply.supplyItem.category,
          unit: propertySupply.supplyItem.unit,
          fillLevel: canonicalSupply.fillLevel,
          stateMode: toPrismaSupplyStateMode(canonicalSupply.stateMode),
          currentStock: canonicalSupply.currentStock,
          mediumThreshold: canonicalSupply.mediumThreshold,
          fullThreshold: canonicalSupply.fullThreshold,
          targetStock: canonicalSupply.targetStock,
          reorderThreshold: canonicalSupply.reorderThreshold,
          targetLevel: canonicalSupply.targetLevel,
          minimumThreshold: canonicalSupply.minimumThreshold,
          trackingMode: canonicalSupply.trackingMode,
          isCritical: propertySupply.isCritical,
          warningThreshold: canonicalSupply.warningThreshold,
          sortOrder: Array.from(activePropertySupplyIds).indexOf(propertySupply.id),
          isRequired: true,
          notes: propertySupply.notes,
        },
        select: {
          id: true,
        },
      })
    } else {
      await prisma.taskSupplyRunItem.update({
        where: {
          id: runItem.id,
        },
        data: {
          supplyItemId: propertySupply.supplyItemId,
          propertySupplyCode: propertySupply.supplyItem.code,
          label: propertySupply.supplyItem.name,
          labelEn: null,
          category: propertySupply.supplyItem.category,
          unit: propertySupply.supplyItem.unit,
          fillLevel: canonicalSupply.fillLevel,
          stateMode: toPrismaSupplyStateMode(canonicalSupply.stateMode),
          currentStock: canonicalSupply.currentStock,
          mediumThreshold: canonicalSupply.mediumThreshold,
          fullThreshold: canonicalSupply.fullThreshold,
          targetStock: canonicalSupply.targetStock,
          reorderThreshold: canonicalSupply.reorderThreshold,
          targetLevel: canonicalSupply.targetLevel,
          minimumThreshold: canonicalSupply.minimumThreshold,
          trackingMode: canonicalSupply.trackingMode,
          isCritical: propertySupply.isCritical,
          warningThreshold: canonicalSupply.warningThreshold,
          sortOrder: Array.from(activePropertySupplyIds).indexOf(propertySupply.id),
          isRequired: true,
          notes: propertySupply.notes,
        },
      })
    }

    if (!existingAnswer) {
      await prisma.taskSupplyAnswer.create({
        data: {
          taskSupplyRunId: run.id,
          runItemId: runItem.id,
          propertySupplyId: propertySupply.id,
          fillLevel: "full",
          notes: null,
        },
      })
    }
  }

  for (const answer of run.answers) {
    if (!answer.propertySupplyId || !activePropertySupplyIds.has(answer.propertySupplyId)) {
      await prisma.taskSupplyAnswer.delete({
        where: {
          id: answer.id,
        },
      })
    }
  }

  return prisma.taskSupplyRun.findUnique({
    where: {
      taskId,
    },
  })
}
