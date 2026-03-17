import { prisma } from "@/lib/prisma"

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
    run.answers.map((answer) => [answer.propertySupplyId, answer])
  )

  const activePropertySupplyIds = new Set(propertySupplies.map((row) => row.id))

  for (const propertySupply of propertySupplies) {
    const existingAnswer = existingAnswerMap.get(propertySupply.id)

    if (!existingAnswer) {
      await prisma.taskSupplyAnswer.create({
        data: {
          taskSupplyRunId: run.id,
          propertySupplyId: propertySupply.id,
          fillLevel: "full",
          notes: null,
        },
      })
    }
  }

  for (const answer of run.answers) {
    if (!activePropertySupplyIds.has(answer.propertySupplyId)) {
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