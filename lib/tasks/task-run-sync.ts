import { prisma } from "@/lib/prisma"
import { refreshPropertyReadinessSnapshot } from "@/lib/properties/readiness-snapshot"
import { buildCanonicalSupplyWriteData } from "@/lib/supplies/compute-supply-state"
import { toPrismaSupplyStateMode } from "@/lib/supplies/supply-mode-rules"

async function resolveOrganizationIdForTask(taskId: string) {
  const cleanTaskId = String(taskId || "").trim()

  if (!cleanTaskId) {
    return null
  }

  const task = await prisma.task.findUnique({
    where: {
      id: cleanTaskId,
    },
    select: {
      organizationId: true,
    },
  })

  return task?.organizationId ?? null
}

async function refreshTaskRunPropertyReadiness(params: {
  organizationId?: string | null
  propertyId: string
  taskId?: string | null
}) {
  let organizationId = String(params.organizationId || "").trim()
  const propertyId = String(params.propertyId || "").trim()

  if (!organizationId && params.taskId) {
    organizationId = String(
      (await resolveOrganizationIdForTask(String(params.taskId))) || ""
    ).trim()
  }

  if (!organizationId || !propertyId) {
    return null
  }

  return refreshPropertyReadinessSnapshot({
    organizationId,
    propertyId,
  })
}

export async function findPrimaryCleaningTemplate(
  organizationId: string,
  propertyId: string
) {
  return prisma.propertyChecklistTemplate.findFirst({
    where: {
      organizationId,
      propertyId,
      isPrimary: true,
      isActive: true,
      NOT: {
        templateType: "supplies",
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      templateType: true,
      isPrimary: true,
      isActive: true,
      items: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          label: true,
          labelEn: true,
          description: true,
          itemType: true,
          isRequired: true,
          sortOrder: true,
          category: true,
          requiresPhoto: true,
          opensIssueOnFail: true,
          optionsText: true,
          issueTypeOnFail: true,
          issueSeverityOnFail: true,
          failureValuesText: true,
          linkedSupplyItemId: true,
          supplyUpdateMode: true,
          supplyQuantity: true,
          supplyItem: {
            select: {
              id: true,
              name: true,
              nameEl: true,
              nameEn: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })
}

export async function findPrimaryIssueTemplate(
  organizationId: string,
  propertyId: string
) {
  return prisma.propertyIssueTemplate.findFirst({
    where: {
      organizationId,
      propertyId,
      isPrimary: true,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      description: true,
      isPrimary: true,
      isActive: true,
      items: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          label: true,
          labelEn: true,
          description: true,
          sortOrder: true,
          itemType: true,
          isRequired: true,
          allowsIssue: true,
          allowsDamage: true,
          defaultIssueType: true,
          defaultSeverity: true,
          requiresPhoto: true,
          affectsHostingByDefault: true,
          urgentByDefault: true,
          locationHint: true,
        },
      },
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

async function getActivePropertySupplies(propertyId: string) {
  return prisma.propertySupply.findMany({
    where: {
      propertyId,
      isActive: true,
    },
    orderBy: [
      {
        isCritical: "desc",
      },
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: {
      id: true,
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
      supplyItemId: true,
      supplyItem: {
        select: {
          id: true,
          code: true,
          name: true,
          nameEl: true,
          nameEn: true,
          category: true,
          unit: true,
        },
      },
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
    include: {
      items: {
        select: {
          id: true,
          propertyTemplateItemId: true,
        },
      },
    },
  })

  if (!sendCleaningChecklist) {
    if (existingRun) {
      await prisma.taskChecklistRun.delete({
        where: {
          taskId,
        },
      })
    }

    await refreshTaskRunPropertyReadiness({ organizationId, propertyId, taskId })
    return null
  }

  const primaryTemplate = await findPrimaryCleaningTemplate(
    organizationId,
    propertyId
  )

  if (!primaryTemplate) {
    if (existingRun) {
      await prisma.taskChecklistRun.delete({
        where: {
          taskId,
        },
      })
    }

    await refreshTaskRunPropertyReadiness({ organizationId, propertyId, taskId })
    return null
  }

  const run =
    existingRun ||
    (await prisma.taskChecklistRun.create({
      data: {
        taskId,
        templateId: primaryTemplate.id,
        sourceTemplateTitle: primaryTemplate.title,
        sourceTemplateDescription: primaryTemplate.description,
        templateType: primaryTemplate.templateType ?? "main",
        status: "pending",
        isCustomized: false,
      },
      include: {
        items: {
          select: {
            id: true,
            propertyTemplateItemId: true,
          },
        },
      },
    }))

  const templateChanged = run.templateId !== primaryTemplate.id

  if (templateChanged) {
    await prisma.taskChecklistRun.update({
      where: {
        taskId,
      },
      data: {
        templateId: primaryTemplate.id,
        sourceTemplateTitle: primaryTemplate.title,
        sourceTemplateDescription: primaryTemplate.description,
        templateType: primaryTemplate.templateType ?? "main",
        status: "pending",
        startedAt: null,
        completedAt: null,
        isCustomized: false,
      },
    })

    await prisma.taskChecklistAnswer.deleteMany({
      where: {
        checklistRunId: run.id,
      },
    })

    await prisma.taskChecklistRunItem.deleteMany({
      where: {
        checklistRunId: run.id,
      },
    })
  } else {
    await prisma.taskChecklistRun.update({
      where: {
        taskId,
      },
      data: {
        sourceTemplateTitle: primaryTemplate.title,
        sourceTemplateDescription: primaryTemplate.description,
        templateType: primaryTemplate.templateType ?? "main",
      },
    })
  }

  const currentItems = templateChanged
    ? []
    : await prisma.taskChecklistRunItem.findMany({
        where: {
          checklistRunId: run.id,
        },
        select: {
          id: true,
          propertyTemplateItemId: true,
        },
      })

  const existingMap = new Map(
    currentItems
      .filter((item) => item.propertyTemplateItemId)
      .map((item) => [item.propertyTemplateItemId as string, item])
  )

  const templateItemIds = new Set(primaryTemplate.items.map((item) => item.id))

  for (const item of primaryTemplate.items) {
    const existingItem = existingMap.get(item.id)

    if (!existingItem) {
      await prisma.taskChecklistRunItem.create({
        data: {
          checklistRunId: run.id,
          propertyTemplateItemId: item.id,
          label: item.label,
          labelEn: item.labelEn,
          description: item.description,
          itemType: item.itemType,
          isRequired: item.isRequired,
          sortOrder: item.sortOrder,
          category: item.category ?? "inspection",
          requiresPhoto: item.requiresPhoto,
          opensIssueOnFail: item.opensIssueOnFail,
          optionsText: item.optionsText,
          issueTypeOnFail: item.issueTypeOnFail,
          issueSeverityOnFail: item.issueSeverityOnFail,
          failureValuesText: item.failureValuesText,
          linkedSupplyItemId: item.linkedSupplyItemId,
          linkedSupplyItemName: item.supplyItem?.name ?? null,
          linkedSupplyItemNameEl: item.supplyItem?.nameEl ?? null,
          linkedSupplyItemNameEn: item.supplyItem?.nameEn ?? null,
          supplyUpdateMode: item.supplyUpdateMode,
          supplyQuantity: item.supplyQuantity,
        },
      })
    }
  }

  for (const existingItem of currentItems) {
    if (
      existingItem.propertyTemplateItemId &&
      !templateItemIds.has(existingItem.propertyTemplateItemId)
    ) {
      await prisma.taskChecklistAnswer.deleteMany({
        where: {
          runItemId: existingItem.id,
        },
      })

      await prisma.taskChecklistRunItem.delete({
        where: {
          id: existingItem.id,
        },
      })
    }
  }

  const refreshedRun = await prisma.taskChecklistRun.findUnique({
    where: {
      taskId,
    },
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
          sortOrder: "asc",
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
  })

  await refreshTaskRunPropertyReadiness({ organizationId, propertyId, taskId })
  return refreshedRun
}

export async function syncTaskSupplyRun(params: {
  taskId: string
  propertyId: string
  sendSuppliesChecklist: boolean
  organizationId?: string | null
}) {
  const { taskId, propertyId, sendSuppliesChecklist, organizationId } = params

  const existingRun = await prisma.taskSupplyRun.findUnique({
    where: {
      taskId,
    },
    include: {
      items: {
        select: {
          id: true,
          propertySupplyId: true,
        },
      },
      answers: {
        select: {
          id: true,
          runItemId: true,
          propertySupplyId: true,
        },
      },
    },
  })

  if (!sendSuppliesChecklist) {
    if (existingRun) {
      await prisma.taskSupplyRun.delete({
        where: {
          taskId,
        },
      })
    }

    await refreshTaskRunPropertyReadiness({ organizationId, propertyId, taskId })
    return null
  }

  const propertySupplies = await getActivePropertySupplies(propertyId)

  if (propertySupplies.length === 0) {
    if (existingRun) {
      await prisma.taskSupplyRun.delete({
        where: {
          taskId,
        },
      })
    }

    await refreshTaskRunPropertyReadiness({ organizationId, propertyId, taskId })
    return null
  }

  const run =
    existingRun ||
    (await prisma.taskSupplyRun.create({
      data: {
        taskId,
        status: "pending",
        isCustomized: false,
      },
      include: {
        items: {
          select: {
            id: true,
            propertySupplyId: true,
          },
        },
        answers: {
          select: {
            id: true,
            runItemId: true,
            propertySupplyId: true,
          },
        },
      },
    }))

  const existingItems = await prisma.taskSupplyRunItem.findMany({
    where: {
      taskSupplyRunId: run.id,
    },
    select: {
      id: true,
      propertySupplyId: true,
      supplyItemId: true,
    },
  })

  const existingItemMap = new Map(
    existingItems
      .filter((item) => item.propertySupplyId)
      .map((item) => [item.propertySupplyId as string, item])
  )

  const activePropertySupplyIds = new Set(propertySupplies.map((row) => row.id))

  for (let index = 0; index < propertySupplies.length; index += 1) {
    const propertySupply = propertySupplies[index]
    const existingItem = existingItemMap.get(propertySupply.id)
    const canonicalSupply = buildCanonicalSupplyWriteData({
      stateMode: propertySupply.stateMode,
      fillLevel: propertySupply.fillLevel,
      currentStock: propertySupply.currentStock,
      mediumThreshold: propertySupply.mediumThreshold,
      fullThreshold: propertySupply.fullThreshold,
      isActive: true,
    })

    if (!existingItem) {
      await prisma.taskSupplyRunItem.create({
        data: {
          taskSupplyRunId: run.id,
          propertySupplyId: propertySupply.id,
          supplyItemId: propertySupply.supplyItemId,
          propertySupplyCode: propertySupply.supplyItem?.code ?? null,
          label:
            propertySupply.supplyItem?.nameEl ||
            propertySupply.supplyItem?.name ||
            "Αναλώσιμο",
          labelEn: propertySupply.supplyItem?.nameEn ?? null,
          category: propertySupply.supplyItem?.category ?? null,
          unit: propertySupply.supplyItem?.unit ?? null,
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
          sortOrder: index,
          isRequired: true,
          notes: propertySupply.notes,
        },
      })
    } else {
      await prisma.taskSupplyRunItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          supplyItemId: propertySupply.supplyItemId,
          propertySupplyCode: propertySupply.supplyItem?.code ?? null,
          label:
            propertySupply.supplyItem?.nameEl ||
            propertySupply.supplyItem?.name ||
            "Αναλώσιμο",
          labelEn: propertySupply.supplyItem?.nameEn ?? null,
          category: propertySupply.supplyItem?.category ?? null,
          unit: propertySupply.supplyItem?.unit ?? null,
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
          sortOrder: index,
          isRequired: true,
          notes: propertySupply.notes,
        },
      })
    }
  }

  for (const item of existingItems) {
    if (item.propertySupplyId && !activePropertySupplyIds.has(item.propertySupplyId)) {
      await prisma.taskSupplyAnswer.deleteMany({
        where: {
          runItemId: item.id,
        },
      })

      await prisma.taskSupplyRunItem.delete({
        where: {
          id: item.id,
        },
      })
    }
  }

  const refreshedRun = await prisma.taskSupplyRun.findUnique({
    where: {
      taskId,
    },
    include: {
      items: {
        orderBy: {
          sortOrder: "asc",
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
  })

  await refreshTaskRunPropertyReadiness({ organizationId, propertyId, taskId })
  return refreshedRun
}

export async function syncTaskIssueRun(params: {
  taskId: string
  organizationId: string
  propertyId: string
  sendIssuesChecklist: boolean
}) {
  const { taskId, organizationId, propertyId, sendIssuesChecklist } = params

  const existingRun = await prisma.taskIssueRun.findUnique({
    where: {
      taskId,
    },
    include: {
      items: {
        select: {
          id: true,
          propertyTemplateItemId: true,
        },
      },
    },
  })

  if (!sendIssuesChecklist) {
    if (existingRun) {
      await prisma.taskIssueRun.delete({
        where: {
          taskId,
        },
      })
    }

    await refreshTaskRunPropertyReadiness({ organizationId, propertyId, taskId })
    return null
  }

  const primaryTemplate = await findPrimaryIssueTemplate(
    organizationId,
    propertyId
  )

  if (!primaryTemplate) {
    if (existingRun) {
      await prisma.taskIssueRun.delete({
        where: {
          taskId,
        },
      })
    }

    await refreshTaskRunPropertyReadiness({ organizationId, propertyId, taskId })
    return null
  }

  const run =
    existingRun ||
    (await prisma.taskIssueRun.create({
      data: {
        taskId,
        templateId: primaryTemplate.id,
        sourceTemplateTitle: primaryTemplate.title,
        sourceTemplateDescription: primaryTemplate.description,
        status: "pending",
        isCustomized: false,
      },
      include: {
        items: {
          select: {
            id: true,
            propertyTemplateItemId: true,
          },
        },
      },
    }))

  const templateChanged = run.templateId !== primaryTemplate.id

  if (templateChanged) {
    await prisma.taskIssueRun.update({
      where: {
        taskId,
      },
      data: {
        templateId: primaryTemplate.id,
        sourceTemplateTitle: primaryTemplate.title,
        sourceTemplateDescription: primaryTemplate.description,
        status: "pending",
        startedAt: null,
        completedAt: null,
        isCustomized: false,
      },
    })

    await prisma.taskIssueAnswer.deleteMany({
      where: {
        issueRunId: run.id,
      },
    })

    await prisma.taskIssueRunItem.deleteMany({
      where: {
        issueRunId: run.id,
      },
    })
  } else {
    await prisma.taskIssueRun.update({
      where: {
        taskId,
      },
      data: {
        sourceTemplateTitle: primaryTemplate.title,
        sourceTemplateDescription: primaryTemplate.description,
      },
    })
  }

  const currentItems = templateChanged
    ? []
    : await prisma.taskIssueRunItem.findMany({
        where: {
          issueRunId: run.id,
        },
        select: {
          id: true,
          propertyTemplateItemId: true,
        },
      })

  const existingMap = new Map(
    currentItems
      .filter((item) => item.propertyTemplateItemId)
      .map((item) => [item.propertyTemplateItemId as string, item])
  )

  const templateItemIds = new Set(primaryTemplate.items.map((item) => item.id))

  for (const item of primaryTemplate.items) {
    const existingItem = existingMap.get(item.id)

    if (!existingItem) {
      await prisma.taskIssueRunItem.create({
        data: {
          issueRunId: run.id,
          propertyTemplateItemId: item.id,
          label: item.label,
          labelEn: item.labelEn,
          description: item.description,
          sortOrder: item.sortOrder,
          itemType: item.itemType,
          isRequired: item.isRequired,
          allowsIssue: item.allowsIssue,
          allowsDamage: item.allowsDamage,
          defaultIssueType: item.defaultIssueType,
          defaultSeverity: item.defaultSeverity,
          requiresPhoto: item.requiresPhoto,
          affectsHostingByDefault: item.affectsHostingByDefault,
          urgentByDefault: item.urgentByDefault,
          locationHint: item.locationHint,
        },
      })
    }
  }

  for (const existingItem of currentItems) {
    if (
      existingItem.propertyTemplateItemId &&
      !templateItemIds.has(existingItem.propertyTemplateItemId)
    ) {
      await prisma.taskIssueAnswer.deleteMany({
        where: {
          runItemId: existingItem.id,
        },
      })

      await prisma.taskIssueRunItem.delete({
        where: {
          id: existingItem.id,
        },
      })
    }
  }

  const refreshedRun = await prisma.taskIssueRun.findUnique({
    where: {
      taskId,
    },
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
          sortOrder: "asc",
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
  })

  await refreshTaskRunPropertyReadiness({ organizationId, propertyId, taskId })
  return refreshedRun
}
