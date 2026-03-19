import { prisma } from "@/lib/prisma"

type ContextScope = {
  propertyId?: string | null
  taskId?: string | null
  bookingId?: string | null
}

type AuthContext = {
  systemRole?: "SUPER_ADMIN" | "USER"
  organizationId?: string | null
}

function getBasePath() {
  return {
    dashboard: "/dashboard",
    properties: "/properties",
    tasks: "/tasks",
    bookings: "/bookings",
    issues: "/issues",
    aiAssistant: "/ai-assistant",
  }
}

function taskLink(taskId?: string | null) {
  if (!taskId) return null
  return `${getBasePath().tasks}/${taskId}`
}

function propertyLink(propertyId?: string | null) {
  if (!propertyId) return null
  return `${getBasePath().properties}/${propertyId}`
}

function bookingLink(bookingId?: string | null) {
  if (!bookingId) return null
  return `${getBasePath().bookings}/${bookingId}`
}

function issueLink(issueId?: string | null) {
  if (!issueId) return null
  return `${getBasePath().issues}/${issueId}`
}

function formatDate(date?: Date | string | null) {
  if (!date) return null
  const value = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(value.getTime())) return null
  return value.toISOString()
}

function startOfTodayAthens() {
  const now = new Date()
  const athensNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Athens" })
  )
  athensNow.setHours(0, 0, 0, 0)
  return athensNow
}

function endOfTodayAthens() {
  const end = startOfTodayAthens()
  end.setHours(23, 59, 59, 999)
  return end
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
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
    organizationId: "__no_results__",
  }
}

function lower(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

function isOpenTaskStatus(status?: string | null) {
  const s = lower(status)
  return ![
    "completed",
    "cancelled",
    "canceled",
    "closed",
    "done",
    "archived",
    "Ολοκληρωμένη",
    "Ολοκληρωθηκε",
    "Ακυρωμένη",
  ].includes(s)
}

function isOpenIssueStatus(status?: string | null) {
  const s = lower(status)
  return !["resolved", "closed", "done", "completed", "cancelled"].includes(s)
}

function isLowFillLevel(fillLevel?: string | null) {
  const s = lower(fillLevel)
  return ["low", "empty", "missing", "έλλειψη", "χαμηλό", "χαμηλη"].includes(s)
}

function isSubmittedStatus(status?: string | null) {
  const s = lower(status)
  return ["submitted", "completed", "done", "finished"].includes(s)
}

function isPendingStatus(status?: string | null) {
  const s = lower(status)
  return ["pending", "assigned", "waiting", "open", ""].includes(s)
}

function classifyQuestionMode(question: string): "data" | "usage" | "mixed" | "briefing" | "risk" {
  const q = lower(question)

  const usageKeywords = [
    "πώς",
    "πως",
    "οδηγ",
    "χρήση",
    "χρηση",
    "τι κάνω",
    "τι κανω",
    "βήμα",
    "βημα",
    "πού βρίσκω",
    "που βρισκω",
    "πού βλέπω",
    "που βλεπω",
    "πώς λειτουργεί",
    "πως λειτουργει",
    "τι σημαίνει",
    "τι σημαινει",
  ]

  const briefingKeywords = [
    "σύνοψη ημέρας",
    "συνοψη ημερας",
    "πρωινή σύνοψη",
    "πρωινη συνοψη",
    "τι πρέπει να προσέξω σήμερα",
    "τι πρεπει να προσεξω σημερα",
    "εικόνα ημέρας",
    "εικονα ημερας",
  ]

  const riskKeywords = [
    "κίνδυνο",
    "κινδυνο",
    "κίνδυνος",
    "κινδυνος",
    "ρίσκο",
    "ρισκο",
    "εκκρεμότητες",
    "εκκρεμοτητες",
    "τι λείπει",
    "τι λειπει",
    "προτεραιότητα",
    "προτεραιοτητα",
    "τι είναι επείγον",
    "τι ειναι επειγον",
    "alert",
  ]

  const hasUsage = usageKeywords.some((k) => q.includes(k))
  const hasBriefing = briefingKeywords.some((k) => q.includes(k))
  const hasRisk = riskKeywords.some((k) => q.includes(k))

  if (hasBriefing) return "briefing"
  if (hasRisk && hasUsage) return "mixed"
  if (hasRisk) return "risk"
  if (hasUsage) return "usage"

  const dataKeywords = [
    "δείξε",
    "δειξε",
    "ποια",
    "ποιες",
    "λίστα",
    "λιστα",
    "κρατήσεις",
    "κρατησεις",
    "εργασίες",
    "εργασιες",
    "ακίνητα",
    "ακινητα",
    "ζημιές",
    "ζημιες",
    "βλάβες",
    "βλαβες",
    "αναλώσιμα",
    "αναλωσιμα",
  ]

  const hasData = dataKeywords.some((k) => q.includes(k))

  if (hasData && hasUsage) return "mixed"
  return "data"
}

export async function buildAssistantContext(params: {
  auth: AuthContext
  question: string
  scope?: ContextScope
}) {
  const { auth, question, scope } = params
  const tenantWhere = buildTenantWhere(auth)

  const todayStart = startOfTodayAthens()
  const todayEnd = endOfTodayAthens()
  const next7Days = addDays(todayEnd, 7)

  const [
    settings,
    properties,
    partners,
    bookings,
    tasks,
    issues,
    propertySupplies,
    checklistTemplates,
    checklistRuns,
    supplyRuns,
  ] = await Promise.all([
    prisma.settings.findFirst({
      where: tenantWhere,
      select: {
        organizationId: true,
        companyName: true,
        companyEmail: true,
        timezone: true,
        language: true,
      },
    }),

    prisma.property.findMany({
      where: tenantWhere,
      orderBy: [{ updatedAt: "desc" }],
      take: 60,
      select: {
        id: true,
        organizationId: true,
        code: true,
        name: true,
        address: true,
        city: true,
        region: true,
        postalCode: true,
        country: true,
        type: true,
        status: true,
        defaultPartnerId: true,
        createdAt: true,
        updatedAt: true,
        defaultPartner: {
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            specialty: true,
            status: true,
          },
        },
      },
    }),

    prisma.partner.findMany({
      where: tenantWhere,
      orderBy: [{ updatedAt: "desc" }],
      take: 60,
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        phone: true,
        specialty: true,
        status: true,
        updatedAt: true,
      },
    }),

    prisma.booking.findMany({
      where: tenantWhere,
      orderBy: [{ checkOutDate: "asc" }, { updatedAt: "desc" }],
      take: 80,
      select: {
        id: true,
        organizationId: true,
        propertyId: true,
        sourcePlatform: true,
        externalBookingId: true,
        externalListingId: true,
        externalListingName: true,
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
        syncStatus: true,
        needsMapping: true,
        isManual: true,
        sourceUpdatedAt: true,
        lastProcessedAt: true,
        lastError: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        property: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            status: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            taskType: true,
            scheduledDate: true,
          },
          take: 10,
          orderBy: { updatedAt: "desc" },
        },
      },
    }),

    prisma.task.findMany({
      where: tenantWhere,
      orderBy: [{ scheduledDate: "asc" }, { updatedAt: "desc" }],
      take: 100,
      select: {
        id: true,
        organizationId: true,
        propertyId: true,
        bookingId: true,
        title: true,
        description: true,
        taskType: true,
        source: true,
        priority: true,
        status: true,
        scheduledDate: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        dueDate: true,
        completedAt: true,
        requiresPhotos: true,
        requiresChecklist: true,
        requiresApproval: true,
        sendCleaningChecklist: true,
        sendSuppliesChecklist: true,
        usesCustomizedCleaningChecklist: true,
        alertEnabled: true,
        alertAt: true,
        notes: true,
        resultNotes: true,
        createdAt: true,
        updatedAt: true,
        property: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            status: true,
          },
        },
        booking: {
          select: {
            id: true,
            externalBookingId: true,
            sourcePlatform: true,
            guestName: true,
            checkInDate: true,
            checkOutDate: true,
          },
        },
        assignments: {
          select: {
            id: true,
            partnerId: true,
            status: true,
            assignedAt: true,
            acceptedAt: true,
            rejectedAt: true,
            startedAt: true,
            completedAt: true,
            partner: {
              select: {
                id: true,
                code: true,
                name: true,
                email: true,
                specialty: true,
                status: true,
              },
            },
          },
          orderBy: { assignedAt: "desc" },
          take: 5,
        },
        checklistRun: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
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
                valueBoolean: true,
                valueText: true,
                valueNumber: true,
                valueSelect: true,
                notes: true,
                issueCreated: true,
                templateItem: {
                  select: {
                    id: true,
                    label: true,
                    itemType: true,
                    category: true,
                    opensIssueOnFail: true,
                    issueTypeOnFail: true,
                    issueSeverityOnFail: true,
                  },
                },
              },
              take: 120,
            },
          },
        },
        supplyRun: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            answers: {
              select: {
                id: true,
                fillLevel: true,
                notes: true,
                propertySupply: {
                  select: {
                    id: true,
                    lastUpdatedAt: true,
                    fillLevel: true,
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
              take: 120,
            },
          },
        },
      },
    }),

    prisma.issue.findMany({
      where: tenantWhere,
      orderBy: [{ updatedAt: "desc" }],
      take: 80,
      select: {
        id: true,
        organizationId: true,
        propertyId: true,
        taskId: true,
        bookingId: true,
        issueType: true,
        title: true,
        description: true,
        severity: true,
        status: true,
        reportedBy: true,
        resolutionNotes: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
        property: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            status: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            taskType: true,
            scheduledDate: true,
          },
        },
        booking: {
          select: {
            id: true,
            externalBookingId: true,
            sourcePlatform: true,
            guestName: true,
            checkInDate: true,
            checkOutDate: true,
          },
        },
      },
    }),

    prisma.propertySupply.findMany({
      where: {
        ...tenantWhere,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 150,
      select: {
        id: true,
        propertyId: true,
        supplyItemId: true,
        isActive: true,
        fillLevel: true,
        currentStock: true,
        targetStock: true,
        reorderThreshold: true,
        lastUpdatedAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        property: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            status: true,
          },
        },
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
    }),

    prisma.propertyChecklistTemplate.findMany({
      where: tenantWhere,
      orderBy: [{ updatedAt: "desc" }],
      take: 80,
      select: {
        id: true,
        organizationId: true,
        propertyId: true,
        title: true,
        description: true,
        templateType: true,
        isPrimary: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        property: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
          },
        },
        items: {
          select: {
            id: true,
            label: true,
            itemType: true,
            isRequired: true,
            sortOrder: true,
            category: true,
            requiresPhoto: true,
            opensIssueOnFail: true,
            issueTypeOnFail: true,
            issueSeverityOnFail: true,
            linkedSupplyItemId: true,
            supplyUpdateMode: true,
            supplyQuantity: true,
          },
          orderBy: { sortOrder: "asc" },
          take: 120,
        },
      },
    }),

    prisma.taskChecklistRun.findMany({
      where: {
        task: tenantWhere,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 80,
      select: {
        id: true,
        taskId: true,
        templateId: true,
        status: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            taskType: true,
            scheduledDate: true,
            property: {
              select: {
                id: true,
                code: true,
                name: true,
                address: true,
              },
            },
            booking: {
              select: {
                id: true,
                externalBookingId: true,
                sourcePlatform: true,
                guestName: true,
              },
            },
          },
        },
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
            valueBoolean: true,
            valueText: true,
            valueNumber: true,
            valueSelect: true,
            notes: true,
            issueCreated: true,
            templateItem: {
              select: {
                id: true,
                label: true,
                itemType: true,
                category: true,
                opensIssueOnFail: true,
                issueTypeOnFail: true,
                issueSeverityOnFail: true,
              },
            },
          },
          take: 150,
        },
      },
    }),

    prisma.taskSupplyRun.findMany({
      where: {
        task: tenantWhere,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 80,
      select: {
        id: true,
        taskId: true,
        status: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            taskType: true,
            scheduledDate: true,
            property: {
              select: {
                id: true,
                code: true,
                name: true,
                address: true,
              },
            },
            booking: {
              select: {
                id: true,
                externalBookingId: true,
                sourcePlatform: true,
                guestName: true,
              },
            },
          },
        },
        answers: {
          select: {
            id: true,
            fillLevel: true,
            notes: true,
            propertySupply: {
              select: {
                id: true,
                fillLevel: true,
                lastUpdatedAt: true,
                property: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    address: true,
                  },
                },
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
          take: 150,
        },
      },
    }),
  ])

  const mappedProperties = properties.map((item) => ({
    ...item,
    createdAt: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
    propertyLink: propertyLink(item.id),
  }))

  const mappedPartners = partners.map((item) => ({
    ...item,
    updatedAt: formatDate(item.updatedAt),
  }))

  const mappedBookings = bookings.map((item) => ({
    ...item,
    checkInDate: formatDate(item.checkInDate),
    checkOutDate: formatDate(item.checkOutDate),
    sourceUpdatedAt: formatDate(item.sourceUpdatedAt),
    lastProcessedAt: formatDate(item.lastProcessedAt),
    createdAt: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
    bookingLink: bookingLink(item.id),
    propertyLink: propertyLink(item.propertyId),
    taskLinks: item.tasks.map((task) => ({
      taskId: task.id,
      title: task.title,
      taskLink: taskLink(task.id),
    })),
  }))

  const mappedTasks = tasks.map((item) => ({
    ...item,
    scheduledDate: formatDate(item.scheduledDate),
    dueDate: formatDate(item.dueDate),
    completedAt: formatDate(item.completedAt),
    alertAt: formatDate(item.alertAt),
    createdAt: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
    taskLink: taskLink(item.id),
    propertyLink: propertyLink(item.propertyId),
    bookingLink: bookingLink(item.bookingId),
    latestAssignment: item.assignments[0] ?? null,
  }))

  const mappedIssues = issues.map((item) => ({
    ...item,
    resolvedAt: formatDate(item.resolvedAt),
    createdAt: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
    issueLink: issueLink(item.id),
    propertyLink: propertyLink(item.propertyId),
    taskLink: taskLink(item.taskId),
    bookingLink: bookingLink(item.bookingId),
  }))

  const mappedPropertySupplies = propertySupplies.map((item) => ({
    ...item,
    lastUpdatedAt: formatDate(item.lastUpdatedAt),
    createdAt: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
    propertyLink: propertyLink(item.propertyId),
  }))

  const mappedChecklistTemplates = checklistTemplates.map((item) => ({
    ...item,
    createdAt: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
    propertyLink: propertyLink(item.propertyId),
  }))

  const mappedChecklistRuns = checklistRuns.map((item) => ({
    ...item,
    startedAt: formatDate(item.startedAt),
    completedAt: formatDate(item.completedAt),
    createdAt: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
    taskLink: taskLink(item.taskId),
    propertyLink: propertyLink(item.task.property?.id),
    bookingLink: bookingLink(item.task.booking?.id),
  }))

  const mappedSupplyRuns = supplyRuns.map((item) => ({
    ...item,
    startedAt: formatDate(item.startedAt),
    completedAt: formatDate(item.completedAt),
    createdAt: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
    taskLink: taskLink(item.taskId),
    propertyLink: propertyLink(item.task.property?.id),
    bookingLink: bookingLink(item.task.booking?.id),
  }))

  const openTasks = mappedTasks
    .filter((item) => isOpenTaskStatus(item.status))
    .slice(0, 40)

  const activeAlerts = mappedTasks
    .filter((item) => item.alertEnabled)
    .filter((item) => isOpenTaskStatus(item.status))
    .sort((a, b) => {
      const da = a.alertAt ? new Date(a.alertAt).getTime() : Number.MAX_SAFE_INTEGER
      const db = b.alertAt ? new Date(b.alertAt).getTime() : Number.MAX_SAFE_INTEGER
      return da - db
    })
    .slice(0, 30)

  const upcomingBookings = mappedBookings
    .filter((item) => {
      const checkIn = item.checkInDate ? new Date(item.checkInDate) : null
      return checkIn && checkIn >= todayStart && checkIn <= next7Days
    })
    .slice(0, 40)

  const todayCheckOuts = mappedBookings
    .filter((item) => {
      const checkOut = item.checkOutDate ? new Date(item.checkOutDate) : null
      return checkOut && checkOut >= todayStart && checkOut <= todayEnd
    })
    .slice(0, 40)

  const bookingsWithoutTask = mappedBookings
    .filter((item) => item.tasks.length === 0)
    .slice(0, 40)

  const openIssues = mappedIssues
    .filter((item) => isOpenIssueStatus(item.status))
    .slice(0, 40)

  const lowSupplies = mappedPropertySupplies
    .filter((item) => item.isActive)
    .filter((item) => isLowFillLevel(item.fillLevel))
    .slice(0, 50)

  const submittedChecklistRuns = mappedChecklistRuns
    .filter((item) => isSubmittedStatus(item.status))
    .slice(0, 40)

  const pendingChecklistRuns = mappedChecklistRuns
    .filter((item) => isPendingStatus(item.status))
    .slice(0, 40)

  const submittedSupplyRuns = mappedSupplyRuns
    .filter((item) => isSubmittedStatus(item.status))
    .slice(0, 40)

  const pendingSupplyRuns = mappedSupplyRuns
    .filter((item) => isPendingStatus(item.status))
    .slice(0, 40)

  const checklistFindings = mappedChecklistRuns.flatMap((run) => {
    return run.answers
      .filter((answer) => {
        const hasIssue = Boolean(answer.issueCreated)
        const hasNotes = Boolean(answer.notes?.trim())
        const hasSelect = Boolean(answer.valueSelect && lower(answer.valueSelect) !== "ok")
        const hasBooleanFail = answer.valueBoolean === false
        const hasText = Boolean(answer.valueText?.trim())
        return hasIssue || hasNotes || hasSelect || hasBooleanFail || hasText
      })
      .map((answer) => ({
        checklistRunId: run.id,
        checklistRunStatus: run.status,
        taskId: run.task.id,
        taskTitle: run.task.title,
        taskStatus: run.task.status,
        propertyId: run.task.property?.id ?? null,
        propertyCode: run.task.property?.code ?? null,
        propertyName: run.task.property?.name ?? null,
        bookingId: run.task.booking?.id ?? null,
        bookingExternalId: run.task.booking?.externalBookingId ?? null,
        templateTitle: run.template.title,
        itemLabel: answer.templateItem.label,
        itemType: answer.templateItem.itemType,
        category: answer.templateItem.category,
        valueBoolean: answer.valueBoolean,
        valueText: answer.valueText,
        valueNumber: answer.valueNumber,
        valueSelect: answer.valueSelect,
        notes: answer.notes,
        issueCreated: answer.issueCreated,
        taskLink: taskLink(run.task.id),
        propertyLink: propertyLink(run.task.property?.id),
        bookingLink: bookingLink(run.task.booking?.id),
      }))
  }).slice(0, 80)

  const supplyFindings = mappedSupplyRuns.flatMap((run) => {
    return run.answers
      .filter((answer) => isLowFillLevel(answer.fillLevel) || Boolean(answer.notes?.trim()))
      .map((answer) => ({
        supplyRunId: run.id,
        taskId: run.task.id,
        taskTitle: run.task.title,
        taskStatus: run.task.status,
        propertyId: run.task.property?.id ?? null,
        propertyCode: run.task.property?.code ?? null,
        propertyName: run.task.property?.name ?? null,
        bookingId: run.task.booking?.id ?? null,
        bookingExternalId: run.task.booking?.externalBookingId ?? null,
        supplyName: answer.propertySupply.supplyItem.name,
        supplyCode: answer.propertySupply.supplyItem.code,
        fillLevel: answer.fillLevel,
        notes: answer.notes,
        updatedFillLevel: answer.propertySupply.fillLevel,
        lastUpdatedAt: answer.propertySupply.lastUpdatedAt,
        taskLink: taskLink(run.task.id),
        propertyLink: propertyLink(run.task.property?.id),
        bookingLink: bookingLink(run.task.booking?.id),
      }))
  }).slice(0, 80)

  const scopedProperty = scope?.propertyId
    ? mappedProperties.find((item) => item.id === scope.propertyId) ?? null
    : null

  const scopedTask = scope?.taskId
    ? mappedTasks.find((item) => item.id === scope.taskId) ?? null
    : null

  const scopedBooking = scope?.bookingId
    ? mappedBookings.find((item) => item.id === scope.bookingId) ?? null
    : null

  const taskRiskSignals = openTasks
    .map((task) => {
      const reasons: string[] = []

      if (task.alertEnabled && task.alertAt) {
        reasons.push("Έχει ενεργό alert.")
      }

      if (!task.latestAssignment) {
        reasons.push("Δεν υπάρχει ανάθεση συνεργάτη.")
      } else {
        const assignmentStatus = lower(task.latestAssignment.status)
        if (!["accepted", "completed", "started"].includes(assignmentStatus)) {
          reasons.push("Η τελευταία ανάθεση δεν έχει αποδοχή ή ολοκλήρωση.")
        }
      }

      if (task.sendCleaningChecklist && !task.checklistRun) {
        reasons.push("Απαιτείται λίστα καθαριότητας αλλά δεν υπάρχει run λίστας.")
      }

      if (task.sendSuppliesChecklist && !task.supplyRun) {
        reasons.push("Απαιτείται λίστα αναλωσίμων αλλά δεν υπάρχει run λίστας.")
      }

      if (task.checklistRun && isPendingStatus(task.checklistRun.status)) {
        reasons.push("Η λίστα καθαριότητας παραμένει εκκρεμής.")
      }

      if (task.supplyRun && isPendingStatus(task.supplyRun.status)) {
        reasons.push("Η λίστα αναλωσίμων παραμένει εκκρεμής.")
      }

      if (reasons.length === 0) return null

      return {
        taskId: task.id,
        taskTitle: task.title,
        taskStatus: task.status,
        propertyId: task.propertyId,
        propertyName: task.property?.name ?? null,
        propertyCode: task.property?.code ?? null,
        bookingId: task.bookingId,
        taskLink: task.taskLink,
        propertyLink: task.propertyLink,
        bookingLink: task.bookingLink,
        reasons,
      }
    })
    .filter(Boolean)
    .slice(0, 40)

  const bookingRiskSignals = upcomingBookings
    .map((booking) => {
      const reasons: string[] = []

      if (!booking.propertyId) {
        reasons.push("Η κράτηση δεν έχει αντιστοίχιση με ακίνητο.")
      }

      if (booking.tasks.length === 0) {
        reasons.push("Η κράτηση δεν έχει συνδεδεμένη εργασία.")
      }

      if (lower(booking.syncStatus) === "pending_match") {
        reasons.push("Η κράτηση παραμένει σε κατάσταση αντιστοίχισης.")
      }

      if (reasons.length === 0) return null

      return {
        bookingId: booking.id,
        externalBookingId: booking.externalBookingId,
        sourcePlatform: booking.sourcePlatform,
        guestName: booking.guestName,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        propertyId: booking.propertyId,
        propertyName: booking.property?.name ?? null,
        propertyCode: booking.property?.code ?? null,
        bookingLink: booking.bookingLink,
        propertyLink: booking.propertyLink,
        reasons,
      }
    })
    .filter(Boolean)
    .slice(0, 40)

  const issueRiskSignals = openIssues
    .map((issue) => ({
      issueId: issue.id,
      issueTitle: issue.title,
      issueType: issue.issueType,
      severity: issue.severity,
      status: issue.status,
      propertyId: issue.propertyId,
      propertyName: issue.property?.name ?? null,
      propertyCode: issue.property?.code ?? null,
      taskId: issue.taskId,
      bookingId: issue.bookingId,
      issueLink: issue.issueLink,
      propertyLink: issue.propertyLink,
      taskLink: issue.taskLink,
      bookingLink: issue.bookingLink,
    }))
    .slice(0, 40)

  const dailyBriefing = {
    todayCheckOutsCount: todayCheckOuts.length,
    upcomingBookingsCount: upcomingBookings.length,
    openTasksCount: openTasks.length,
    activeAlertsCount: activeAlerts.length,
    bookingsWithoutTaskCount: bookingsWithoutTask.length,
    openIssuesCount: openIssues.length,
    lowSuppliesCount: lowSupplies.length,
    pendingChecklistRunsCount: pendingChecklistRuns.length,
    pendingSupplyRunsCount: pendingSupplyRuns.length,
  }

  return {
    questionMode: classifyQuestionMode(question),

    settings: settings
      ? {
          ...settings,
        }
      : null,

    navigation: {
      dashboard: "/dashboard",
      properties: "/properties",
      tasks: "/tasks",
      bookings: "/bookings",
      issues: "/issues",
      aiAssistant: "/ai-assistant",
    },

    entities: {
      properties: mappedProperties,
      partners: mappedPartners,
      bookings: mappedBookings,
      tasks: mappedTasks,
      issues: mappedIssues,
      propertySupplies: mappedPropertySupplies,
      checklistTemplates: mappedChecklistTemplates,
      checklistRuns: mappedChecklistRuns,
      supplyRuns: mappedSupplyRuns,
    },

    derived: {
      dailyBriefing,
      openTasks,
      activeAlerts,
      upcomingBookings,
      todayCheckOuts,
      bookingsWithoutTask,
      openIssues,
      lowSupplies,
      submittedChecklistRuns,
      pendingChecklistRuns,
      submittedSupplyRuns,
      pendingSupplyRuns,
      checklistFindings,
      supplyFindings,
      taskRiskSignals,
      bookingRiskSignals,
      issueRiskSignals,
    },

    scoped: {
      scopedProperty,
      scopedTask,
      scopedBooking,
    },

    limits: {
      note: "Το context είναι συμπυκνωμένο και προσανατολισμένο στις πιο πρόσφατες και σχετικές εγγραφές. Ο βοηθός πρέπει να το χρησιμοποιεί ως operational snapshot και όχι ως πλήρες export βάσης.",
    },
  }
}