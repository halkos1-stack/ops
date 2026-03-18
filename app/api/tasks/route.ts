import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type AuthContext = {
  systemRole?: "SUPER_ADMIN" | "USER"
  organizationId?: string | null
}

function getMockAuthFromRequest(req: NextRequest): AuthContext {
  const systemRole = req.headers.get("x-system-role") as
    | "SUPER_ADMIN"
    | "USER"
    | null

  const organizationId = req.headers.get("x-organization-id")

  return {
    systemRole: systemRole || "SUPER_ADMIN",
    organizationId: organizationId || null,
  }
}

function buildTenantWhere(auth: AuthContext) {
  if (auth.systemRole === "SUPER_ADMIN") {
    return {}
  }

  if (auth.organizationId) {
    return {
      organizationId: auth.organizationId,
    }
  }

  return {
    id: "__no_results__",
  }
}

async function findPrimaryChecklistTemplate(
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

async function countActivePropertySupplies(propertyId: string) {
  return prisma.propertySupply.count({
    where: {
      propertyId,
    },
  })
}

async function syncTaskChecklistRun(params: {
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
      include: {
        template: {
          select: {
            id: true,
            title: true,
            templateType: true,
            isPrimary: true,
          },
        },
        answers: {
          select: {
            id: true,
            issueCreated: true,
            createdAt: true,
          },
        },
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
      include: {
        template: {
          select: {
            id: true,
            title: true,
            templateType: true,
            isPrimary: true,
          },
        },
        answers: {
          select: {
            id: true,
            issueCreated: true,
            createdAt: true,
          },
        },
      },
    })
  }

  return prisma.taskChecklistRun.findUnique({
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
      answers: {
        select: {
          id: true,
          issueCreated: true,
          createdAt: true,
        },
      },
    },
  })
}

async function syncTaskSupplyRun(params: {
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
                },
              },
            },
          },
        },
      },
    },
  })
}

export async function GET(req: NextRequest) {
  try {
    const auth = getMockAuthFromRequest(req)

    const tasks = await prisma.task.findMany({
      where: buildTenantWhere(auth),
      orderBy: {
        createdAt: "desc",
      },
      include: {
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
          },
        },
        booking: {
          select: {
            id: true,
            guestName: true,
            sourcePlatform: true,
            checkInDate: true,
            checkOutDate: true,
            status: true,
          },
        },
        assignments: {
          orderBy: {
            assignedAt: "desc",
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
            answers: {
              select: {
                id: true,
                issueCreated: true,
                createdAt: true,
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
                      },
                    },
                  },
                },
              },
            },
          },
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
      },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Tasks GET error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης εργασιών." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getMockAuthFromRequest(req)
    const body = await req.json()

    const organizationId = body.organizationId || auth.organizationId || null

    if (!organizationId) {
      return NextResponse.json(
        { error: "Λείπει organizationId για δημιουργία εργασίας." },
        { status: 400 }
      )
    }

    const propertyId = String(body.propertyId || "").trim()
    const title = String(body.title || "").trim()
    const taskType = String(body.taskType || "").trim()
    const scheduledDateRaw = String(body.scheduledDate || "").trim()

    if (!propertyId) {
      return NextResponse.json(
        { error: "Το πεδίο propertyId είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: "Το πεδίο title είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!taskType) {
      return NextResponse.json(
        { error: "Το πεδίο taskType είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!scheduledDateRaw) {
      return NextResponse.json(
        { error: "Το πεδίο scheduledDate είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const scheduledDate = new Date(scheduledDateRaw)

    if (Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: "Μη έγκυρη ημερομηνία scheduledDate." },
        { status: 400 }
      )
    }

    const requiresPhotos = Boolean(body.requiresPhotos)
    const requiresApproval = Boolean(body.requiresApproval)

    const sendCleaningChecklist =
      body.sendCleaningChecklist === undefined
        ? true
        : Boolean(body.sendCleaningChecklist)

    const sendSuppliesChecklist = Boolean(body.sendSuppliesChecklist)
    const usesCustomizedCleaningChecklist = Boolean(
      body.usesCustomizedCleaningChecklist
    )

    const alertEnabled = Boolean(body.alertEnabled)
    let alertAt: Date | null = null

    if (alertEnabled) {
      if (!body.alertAt || String(body.alertAt).trim() === "") {
        return NextResponse.json(
          { error: "Το alert είναι ενεργό αλλά δεν έχει οριστεί ώρα alert." },
          { status: 400 }
        )
      }

      alertAt = new Date(String(body.alertAt))

      if (Number.isNaN(alertAt.getTime())) {
        return NextResponse.json(
          { error: "Μη έγκυρη ώρα alert." },
          { status: 400 }
        )
      }
    }

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        organizationId,
      },
      select: {
        id: true,
        defaultPartnerId: true,
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε ή δεν ανήκει στον οργανισμό." },
        { status: 404 }
      )
    }

    if (sendCleaningChecklist) {
      const primaryTemplate = await findPrimaryChecklistTemplate(
        organizationId,
        propertyId
      )

      if (!primaryTemplate) {
        return NextResponse.json(
          {
            error:
              "Το ακίνητο δεν έχει ενεργή βασική λίστα καθαριότητας.",
          },
          { status: 400 }
        )
      }
    }

    if (sendSuppliesChecklist) {
      const activeSuppliesCount = await countActivePropertySupplies(propertyId)

      if (activeSuppliesCount === 0) {
        return NextResponse.json(
          {
            error:
              "Το ακίνητο δεν έχει ενεργά αναλώσιμα για αποστολή λίστας αναλωσίμων.",
          },
          { status: 400 }
        )
      }
    }

    const task = await prisma.task.create({
      data: {
        organizationId,
        propertyId,
        bookingId: body.bookingId ? String(body.bookingId) : null,
        title,
        description: body.description ? String(body.description) : null,
        taskType,
        source: body.source ? String(body.source) : "manual",
        priority: body.priority ? String(body.priority) : "normal",
        status: body.status ? String(body.status) : "pending",
        scheduledDate,
        scheduledStartTime: body.scheduledStartTime
          ? String(body.scheduledStartTime)
          : null,
        scheduledEndTime: body.scheduledEndTime
          ? String(body.scheduledEndTime)
          : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        requiresPhotos,
        requiresChecklist: sendCleaningChecklist,
        requiresApproval,
        sendCleaningChecklist,
        sendSuppliesChecklist,
        usesCustomizedCleaningChecklist,
        alertEnabled,
        alertAt,
        notes: body.notes ? String(body.notes) : null,
      },
    })

    await syncTaskChecklistRun({
      taskId: task.id,
      organizationId,
      propertyId,
      sendCleaningChecklist,
    })

    await syncTaskSupplyRun({
      taskId: task.id,
      propertyId,
      sendSuppliesChecklist,
    })

    const fullTask = await prisma.task.findUnique({
      where: {
        id: task.id,
      },
      include: {
        property: {
          include: {
            propertySupplies: {
              include: {
                supplyItem: true,
              },
            },
          },
        },
        assignments: {
          include: {
            partner: true,
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
            answers: {
              select: {
                id: true,
                issueCreated: true,
                createdAt: true,
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
                    supplyItem: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        task: fullTask,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Tasks POST error:", error)

    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας εργασίας." },
      { status: 500 }
    )
  }
}