import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    taskId: string
  }>
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toOptionalDate(value: unknown) {
  const text = toNullableString(value)
  if (!text) return null

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function toRequiredDate(value: unknown) {
  const text = toNullableString(value)
  if (!text) return null

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function toNullableTime(value: unknown) {
  const text = toNullableString(value)
  if (!text) return null

  const normalized = text.slice(0, 5)
  const isValid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized)
  if (!isValid) return null

  return normalized
}

function getActivePortalTokenFromPartner(
  partner?: {
    portalAccessTokens?: Array<{
      token: string
      isActive: boolean
      expiresAt: Date | null
      createdAt: Date
    }>
  } | null
) {
  if (!partner?.portalAccessTokens?.length) return null

  const now = Date.now()

  const activeTokens = partner.portalAccessTokens
    .filter((item) => {
      if (!item.isActive) return false
      if (item.expiresAt && new Date(item.expiresAt).getTime() < now) return false
      return true
    })
    .sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  return activeTokens[0]?.token || null
}

function looksLikeCleaningTemplate(template?: {
  title?: string | null
  description?: string | null
  templateType?: string | null
  items?: Array<{
    category?: string | null
    linkedSupplyItemId?: string | null
    supplyUpdateMode?: string | null
  }>
} | null) {
  if (!template) return false

  const title = String(template.title || "").toLowerCase()
  const description = String(template.description || "").toLowerCase()
  const templateType = String(template.templateType || "").toLowerCase()

  if (
    templateType === "main" ||
    templateType === "cleaning" ||
    title.includes("καθαρ") ||
    title.includes("clean") ||
    description.includes("καθαρ") ||
    description.includes("clean")
  ) {
    return true
  }

  const items = Array.isArray(template.items) ? template.items : []

  if (items.length === 0) return false

  return items.every((item) => {
    const category = String(item.category || "").toLowerCase()
    const mode = String(item.supplyUpdateMode || "").toLowerCase()

    return (
      !item.linkedSupplyItemId &&
      mode !== "status_map" &&
      mode !== "set_stock" &&
      mode !== "consume" &&
      mode !== "flag_low" &&
      !category.includes("supply") &&
      !category.includes("stock") &&
      !category.includes("inventory") &&
      !category.includes("αναλω")
    )
  })
}

function buildCleaningRunTitle(params: {
  checklistRun?: {
    template?: {
      title?: string | null
    } | null
  } | null
  primaryCleaningTemplate?: {
    title?: string | null
  } | null
}) {
  return (
    params.checklistRun?.template?.title ||
    params.primaryCleaningTemplate?.title ||
    "Λίστα καθαριότητας"
  )
}

function buildSuppliesRunTitle() {
  return "Λίστα αναλωσίμων"
}

function buildChecklistItemResponse(item: {
  id: string
  label: string
  description: string | null
  itemType: string
  sortOrder: number
  isRequired: boolean
  requiresPhoto: boolean
  opensIssueOnFail: boolean
  optionsText: string | null
  category: string | null
  linkedSupplyItemId: string | null
  supplyUpdateMode: string | null
  issueTypeOnFail?: string | null
  issueSeverityOnFail?: string | null
  failureValuesText?: string | null
}) {
  return {
    id: item.id,
    label: item.label,
    description: item.description,
    itemType: item.itemType,
    sortOrder: item.sortOrder,
    isRequired: item.isRequired,
    requiresPhoto: item.requiresPhoto,
    opensIssueOnFail: item.opensIssueOnFail,
    optionsText: item.optionsText,
    category: item.category,
    linkedSupplyItemId: item.linkedSupplyItemId,
    supplyUpdateMode: item.supplyUpdateMode,
    issueTypeOnFail: item.issueTypeOnFail ?? null,
    issueSeverityOnFail: item.issueSeverityOnFail ?? null,
    failureValuesText: item.failureValuesText ?? null,
  }
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { taskId } = await context.params

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        property: {
          include: {
            defaultPartner: {
              select: {
                id: true,
                name: true,
                email: true,
                specialty: true,
              },
            },
            checklistTemplates: {
              where: {
                isActive: true,
              },
              orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
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
                    sortOrder: true,
                    isRequired: true,
                    requiresPhoto: true,
                    opensIssueOnFail: true,
                    optionsText: true,
                    category: true,
                    linkedSupplyItemId: true,
                    supplyUpdateMode: true,
                    issueTypeOnFail: true,
                    issueSeverityOnFail: true,
                    failureValuesText: true,
                  },
                },
              },
            },
            propertySupplies: {
              where: {
                isActive: true,
              },
              orderBy: {
                createdAt: "asc",
              },
              include: {
                supplyItem: true,
              },
            },
          },
        },
        booking: {
          select: {
            id: true,
            sourcePlatform: true,
            externalBookingId: true,
            externalListingName: true,
            guestName: true,
            checkInDate: true,
            checkOutDate: true,
            checkInTime: true,
            checkOutTime: true,
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
                specialty: true,
                status: true,
                portalAccessTokens: {
                  orderBy: {
                    createdAt: "desc",
                  },
                  select: {
                    token: true,
                    isActive: true,
                    expiresAt: true,
                    createdAt: true,
                  },
                },
              },
            },
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
                    sortOrder: true,
                    isRequired: true,
                    requiresPhoto: true,
                    opensIssueOnFail: true,
                    optionsText: true,
                    category: true,
                    linkedSupplyItemId: true,
                    supplyUpdateMode: true,
                    issueTypeOnFail: true,
                    issueSeverityOnFail: true,
                    failureValuesText: true,
                  },
                },
              },
            },
            answers: {
              orderBy: {
                createdAt: "asc",
              },
              include: {
                templateItem: {
                  select: {
                    id: true,
                    label: true,
                    description: true,
                    itemType: true,
                    sortOrder: true,
                    isRequired: true,
                    requiresPhoto: true,
                    opensIssueOnFail: true,
                    optionsText: true,
                    category: true,
                    linkedSupplyItemId: true,
                    supplyUpdateMode: true,
                    issueTypeOnFail: true,
                    issueSeverityOnFail: true,
                    failureValuesText: true,
                  },
                },
              },
            },
          },
        },
        supplyRun: {
          include: {
            answers: {
              orderBy: {
                createdAt: "asc",
              },
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
        activityLogs: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Η εργασία δεν βρέθηκε." }, { status: 404 })
    }

    if (!canAccessOrganization(auth, task.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχεις πρόσβαση σε αυτή την εργασία." },
        { status: 403 }
      )
    }

    const partners = await prisma.partner.findMany({
      where: {
        organizationId: task.organizationId,
        status: {
          in: ["active", "ACTIVE"],
        },
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        specialty: true,
        status: true,
      },
    })

    const cleaningTemplates = (task.property?.checklistTemplates || []).filter((template) =>
      looksLikeCleaningTemplate(template)
    )

    const primaryCleaningTemplate =
      cleaningTemplates.find(
        (template) =>
          template.isPrimary === true ||
          String(template.templateType ?? "").toLowerCase() === "main"
      ) ||
      cleaningTemplates[0] ||
      null

    const propertyLists = {
      cleaning: {
        availableOnProperty: Boolean(primaryCleaningTemplate),
        primaryTemplate: primaryCleaningTemplate
          ? {
              id: primaryCleaningTemplate.id,
              title: primaryCleaningTemplate.title,
              description: primaryCleaningTemplate.description,
              templateType: primaryCleaningTemplate.templateType,
              isPrimary: primaryCleaningTemplate.isPrimary,
              isActive: primaryCleaningTemplate.isActive,
              updatedAt: primaryCleaningTemplate.updatedAt,
              items: primaryCleaningTemplate.items.map((item) =>
                buildChecklistItemResponse(item)
              ),
            }
          : null,
      },
      supplies: {
        availableOnProperty: (task.property?.propertySupplies?.length || 0) > 0,
        activeSuppliesCount: task.property?.propertySupplies?.length || 0,
        items: (task.property?.propertySupplies || []).map((propertySupply) => ({
          id: propertySupply.id,
          currentStock: propertySupply.currentStock,
          targetStock: propertySupply.targetStock,
          reorderThreshold: propertySupply.reorderThreshold,
          lastUpdatedAt: propertySupply.lastUpdatedAt,
          fillLevel: propertySupply.fillLevel,
          supplyItem: {
            id: propertySupply.supplyItem.id,
            code: propertySupply.supplyItem.code,
            name: propertySupply.supplyItem.name,
            category: propertySupply.supplyItem.category,
            unit: propertySupply.supplyItem.unit,
          },
        })),
      },
    }

    const cleaningRunTemplateItems = task.checklistRun?.template?.items || []
    const fallbackCleaningItems = primaryCleaningTemplate?.items || []

    const cleaningChecklistRun = task.checklistRun
      ? {
          id: task.checklistRun.id,
          title: buildCleaningRunTitle({
            checklistRun: task.checklistRun,
            primaryCleaningTemplate,
          }),
          status: task.checklistRun.status,
          startedAt: task.checklistRun.startedAt,
          completedAt: task.checklistRun.completedAt,
          submittedAt: task.checklistRun.completedAt,
          sentAt:
            task.assignments.find((assignment) => assignment.checklistEmailSentAt)
              ?.checklistEmailSentAt || null,
          isActive: task.sendCleaningChecklist,
          isRequired: task.sendCleaningChecklist,
          sendToPartner: task.sendCleaningChecklist,
          checklistType: "cleaning",
          template: task.checklistRun.template
            ? {
                id: task.checklistRun.template.id,
                title: task.checklistRun.template.title,
                name: task.checklistRun.template.title,
                isPrimary: task.checklistRun.template.isPrimary,
              }
            : primaryCleaningTemplate
              ? {
                  id: primaryCleaningTemplate.id,
                  title: primaryCleaningTemplate.title,
                  name: primaryCleaningTemplate.title,
                  isPrimary: primaryCleaningTemplate.isPrimary,
                }
              : null,
          items: (cleaningRunTemplateItems.length > 0
            ? cleaningRunTemplateItems
            : fallbackCleaningItems
          ).map((item) => buildChecklistItemResponse(item)),
          answers: task.checklistRun.answers.map((answer) => ({
            id: answer.id,
            checklistItemId: answer.templateItemId,
            itemLabel: answer.templateItem?.label || null,
            itemType: answer.templateItem?.itemType || null,
            valueBoolean: answer.valueBoolean,
            valueText: answer.valueText,
            valueNumber: answer.valueNumber,
            valueSelect: answer.valueSelect,
            note: answer.notes,
            photoUrl: null,
            issueCreated: answer.issueCreated,
            linkedSupplyItemId: answer.templateItem?.linkedSupplyItemId || null,
            createdAt: answer.createdAt,
            updatedAt: answer.updatedAt,
            photoUrls: Array.isArray(answer.photoUrls) ? (answer.photoUrls as string[]) : [],
            photos: Array.isArray(answer.photoUrls) ? (answer.photoUrls as string[]) : [],
            attachments: [],
          })),
        }
      : null

    const suppliesChecklistRun = task.supplyRun
      ? {
          id: task.supplyRun.id,
          title: buildSuppliesRunTitle(),
          status: task.supplyRun.status,
          startedAt: task.supplyRun.startedAt,
          completedAt: task.supplyRun.completedAt,
          submittedAt: task.supplyRun.completedAt,
          sentAt:
            task.assignments.find((assignment) => assignment.checklistEmailSentAt)
              ?.checklistEmailSentAt || null,
          isActive: task.sendSuppliesChecklist,
          isRequired: task.sendSuppliesChecklist,
          sendToPartner: task.sendSuppliesChecklist,
          checklistType: "supplies",
          template: null,
          items: task.supplyRun.answers.map((answer, index) => ({
            id: answer.propertySupplyId,
            label: answer.propertySupply.supplyItem.name,
            description:
              answer.propertySupply.supplyItem.category ||
              answer.propertySupply.supplyItem.unit ||
              "",
            itemType: "select",
            sortOrder: index + 1,
            isRequired: true,
            requiresPhoto: false,
            opensIssueOnFail: false,
            optionsText: "missing\nmedium\nfull",
            category: "supplies",
            linkedSupplyItemId: answer.propertySupply.supplyItemId,
            supplyUpdateMode: "status_map",
            issueTypeOnFail: null,
            issueSeverityOnFail: null,
            failureValuesText: null,
          })),
          answers: task.supplyRun.answers.map((answer) => ({
            id: answer.id,
            checklistItemId: answer.propertySupplyId,
            itemLabel: answer.propertySupply.supplyItem.name,
            itemType: "select",
            valueBoolean: null,
            valueText: null,
            valueNumber: null,
            valueSelect: answer.fillLevel,
            note: answer.notes,
            photoUrl: null,
            issueCreated: false,
            linkedSupplyItemId: answer.propertySupply.supplyItemId,
            createdAt: answer.createdAt,
            updatedAt: answer.updatedAt,
            photoUrls: [],
            photos: [],
            attachments: [],
          })),
        }
      : null

    const responseTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      taskType: task.taskType,
      source: task.source,
      priority: task.priority,
      status: task.status,
      scheduledDate: task.scheduledDate,
      scheduledStartTime: task.scheduledStartTime,
      scheduledEndTime: task.scheduledEndTime,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      notes: task.notes,
      resultNotes: task.resultNotes,
      requiresPhotos: task.requiresPhotos,
      requiresChecklist: task.requiresChecklist,
      requiresApproval: task.requiresApproval,
      sendCleaningChecklist: task.sendCleaningChecklist,
      sendSuppliesChecklist: task.sendSuppliesChecklist,
      usesCustomizedCleaningChecklist: task.usesCustomizedCleaningChecklist,
      alertEnabled: task.alertEnabled,
      alertAt: task.alertAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      property: task.property
        ? {
            id: task.property.id,
            code: task.property.code,
            name: task.property.name,
            address: task.property.address,
            city: task.property.city,
            region: task.property.region,
            country: task.property.country,
            status: task.property.status,
            defaultPartner: task.property.defaultPartner
              ? {
                  id: task.property.defaultPartner.id,
                  name: task.property.defaultPartner.name,
                  email: task.property.defaultPartner.email,
                  specialty: task.property.defaultPartner.specialty,
                }
              : null,
          }
        : null,
      booking: task.booking,
      partners,
      assignments: task.assignments.map((assignment) => {
        const portalToken = getActivePortalTokenFromPartner(assignment.partner)

        return {
          id: assignment.id,
          status: assignment.status,
          assignedAt: assignment.assignedAt,
          acceptedAt: assignment.acceptedAt,
          rejectedAt: assignment.rejectedAt,
          rejectionReason: assignment.rejectionReason,
          notes: assignment.notes,
          portalUrl: portalToken ? `/partner/${portalToken}` : null,
          partner: assignment.partner
            ? {
                id: assignment.partner.id,
                code: assignment.partner.code,
                name: assignment.partner.name,
                email: assignment.partner.email,
                specialty: assignment.partner.specialty,
                status: assignment.partner.status,
              }
            : null,
        }
      }),
      checklistRun: cleaningChecklistRun,
      cleaningChecklistRun,
      suppliesChecklistRun,
      activityLogs: task.activityLogs.map((log) => ({
        id: log.id,
        action: log.action,
        message: log.message,
        actorType: log.actorType,
        actorName: log.actorName,
        createdAt: log.createdAt,
      })),
      propertyLists,
    }

    return NextResponse.json({ task: responseTask })
  } catch (error) {
    console.error("GET /api/tasks/[taskId] error:", error)
    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης στοιχείων εργασίας." },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { taskId } = await context.params
    const body = await req.json().catch(() => ({}))

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        organizationId: true,
      },
    })

    if (!existingTask) {
      return NextResponse.json({ error: "Η εργασία δεν βρέθηκε." }, { status: 404 })
    }

    if (!canAccessOrganization(auth, existingTask.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχεις πρόσβαση σε αυτή την εργασία." },
        { status: 403 }
      )
    }

    let scheduledDateUpdate: Date | undefined

    if (body.scheduledDate !== undefined) {
      const parsedScheduledDate = toRequiredDate(body.scheduledDate)

      if (!parsedScheduledDate) {
        return NextResponse.json(
          { error: "Η ημερομηνία εργασίας είναι υποχρεωτική και πρέπει να είναι έγκυρη." },
          { status: 400 }
        )
      }

      scheduledDateUpdate = parsedScheduledDate
    }

    let scheduledStartTimeUpdate: string | null | undefined

    if (body.scheduledStartTime !== undefined) {
      scheduledStartTimeUpdate = toNullableTime(body.scheduledStartTime)
    }

    let scheduledEndTimeUpdate: string | null | undefined

    if (body.scheduledEndTime !== undefined) {
      scheduledEndTimeUpdate = toNullableTime(body.scheduledEndTime)
    }

    let notesUpdate: string | null | undefined

    if (body.notes !== undefined) {
      notesUpdate = toNullableString(body.notes)
    }

    let resultNotesUpdate: string | null | undefined

    if (body.resultNotes !== undefined) {
      resultNotesUpdate = toNullableString(body.resultNotes)
    }

    let dueDateUpdate: Date | null | undefined

    if (body.dueDate !== undefined) {
      dueDateUpdate = toOptionalDate(body.dueDate)
    }

    let alertAtUpdate: Date | null | undefined

    if (body.alertAt !== undefined) {
      alertAtUpdate = toOptionalDate(body.alertAt)
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(scheduledDateUpdate !== undefined
          ? { scheduledDate: scheduledDateUpdate }
          : {}),
        ...(scheduledStartTimeUpdate !== undefined
          ? { scheduledStartTime: scheduledStartTimeUpdate }
          : {}),
        ...(scheduledEndTimeUpdate !== undefined
          ? { scheduledEndTime: scheduledEndTimeUpdate }
          : {}),
        ...(notesUpdate !== undefined ? { notes: notesUpdate } : {}),
        ...(resultNotesUpdate !== undefined ? { resultNotes: resultNotesUpdate } : {}),
        ...(dueDateUpdate !== undefined ? { dueDate: dueDateUpdate } : {}),
        ...(body.alertEnabled !== undefined
          ? { alertEnabled: Boolean(body.alertEnabled) }
          : {}),
        ...(alertAtUpdate !== undefined ? { alertAt: alertAtUpdate } : {}),
      },
      select: {
        id: true,
        scheduledDate: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        dueDate: true,
        notes: true,
        resultNotes: true,
        alertEnabled: true,
        alertAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      message: "Η εργασία ενημερώθηκε επιτυχώς.",
      task: updatedTask,
    })
  } catch (error) {
    console.error("PATCH /api/tasks/[taskId] error:", error)
    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης εργασίας." },
      { status: 500 }
    )
  }
}