import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    token: string
  }>
}

type AnswerInput = {
  templateItemId: string
  valueBoolean?: boolean | null
  valueText?: string | null
  valueNumber?: number | null
  valueSelect?: string | null
  notes?: string | null
  photoUrls?: string[] | null
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function buildIssueTitle(itemLabel: string) {
  return `Αποτυχία checklist: ${itemLabel}`
}

function buildIssueDescription(args: {
  taskTitle: string
  propertyName: string
  itemLabel: string
  itemDescription?: string | null
  answerNotes?: string | null
}) {
  const parts = [
    `Η εργασία "${args.taskTitle}" στο ακίνητο "${args.propertyName}" απέτυχε στο βήμα checklist "${args.itemLabel}".`,
  ]

  if (args.itemDescription) {
    parts.push(`Περιγραφή βήματος: ${args.itemDescription}`)
  }

  if (args.answerNotes) {
    parts.push(`Σημειώσεις συνεργάτη: ${args.answerNotes}`)
  }

  return parts.join(" ")
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    const body = await req.json()

    const startedAtValue = body?.startedAt ? new Date(body.startedAt) : null
    const completedAtValue = body?.completedAt ? new Date(body.completedAt) : new Date()
    const resultNotes = toNullableString(body?.resultNotes)
    const answers = Array.isArray(body?.answers) ? body.answers : []

    const assignment = await prisma.taskAssignment.findFirst({
      where: {
        checklistToken: token,
      },
      include: {
        partner: true,
        task: {
          include: {
            property: true,
            checklistRun: {
              include: {
                template: {
                  include: {
                    items: {
                      orderBy: {
                        sortOrder: "asc",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε η checklist ανάθεση." },
        { status: 404 }
      )
    }

    const isExpired =
      assignment.checklistTokenExpiresAt &&
      new Date(assignment.checklistTokenExpiresAt).getTime() < Date.now()

    if (isExpired) {
      return NextResponse.json(
        { error: "Το link checklist έχει λήξει." },
        { status: 410 }
      )
    }

    if (!assignment.task.checklistRun) {
      return NextResponse.json(
        { error: "Δεν υπάρχει checklist run για αυτή την εργασία." },
        { status: 400 }
      )
    }

    if (!assignment.task.checklistRun.template) {
      return NextResponse.json(
        { error: "Δεν υπάρχει πρότυπο checklist για αυτή την εργασία." },
        { status: 400 }
      )
    }

    const runId = assignment.task.checklistRun.id
    const templateItems = assignment.task.checklistRun.template.items || []

    const templateItemsMap = new Map(templateItems.map((item) => [item.id, item]))

    const cleanAnswers = (answers as AnswerInput[]).filter(
      (answer) => answer.templateItemId
    )

    const normalizedAnswers = cleanAnswers.map((answer) => {
      const templateItem = templateItemsMap.get(answer.templateItemId)

      const shouldCreateIssue = Boolean(
        templateItem &&
          templateItem.itemType === "boolean" &&
          templateItem.opensIssueOnFail &&
          answer.valueBoolean === false
      )

      return {
        templateItemId: answer.templateItemId,
        valueBoolean:
          answer.valueBoolean !== undefined ? answer.valueBoolean : null,
        valueText: toNullableString(answer.valueText),
        valueNumber:
          answer.valueNumber !== undefined && answer.valueNumber !== null
            ? Number(answer.valueNumber)
            : null,
        valueSelect: toNullableString(answer.valueSelect),
        notes: toNullableString(answer.notes),
        photoUrls: Array.isArray(answer.photoUrls) ? answer.photoUrls : null,
        issueCreated: shouldCreateIssue,
        templateItem,
      }
    })

    const issuePayloads = normalizedAnswers
      .filter((answer) => answer.issueCreated && answer.templateItem)
      .map((answer) => {
        const item = answer.templateItem!

        return {
          propertyId: assignment.task.propertyId,
          taskId: assignment.taskId,
          bookingId: assignment.task.bookingId || null,
          issueType: item.category || "inspection",
          title: buildIssueTitle(item.label),
          description: buildIssueDescription({
            taskTitle: assignment.task.title,
            propertyName: assignment.task.property.name,
            itemLabel: item.label,
            itemDescription: item.description,
            answerNotes: answer.notes,
          }),
          severity: "medium",
          status: "open",
          reportedBy: assignment.partner.name || "Συνεργάτης",
        }
      })

    const result = await prisma.$transaction(async (tx) => {
      await tx.taskChecklistAnswer.deleteMany({
        where: {
          checklistRunId: runId,
        },
      })

      if (normalizedAnswers.length > 0) {
        await tx.taskChecklistAnswer.createMany({
          data: normalizedAnswers.map((answer) => ({
            checklistRunId: runId,
            templateItemId: answer.templateItemId,
            valueBoolean: answer.valueBoolean,
            valueText: answer.valueText,
            valueNumber: answer.valueNumber,
            valueSelect: answer.valueSelect,
            notes: answer.notes,
            photoUrls: answer.photoUrls,
            issueCreated: answer.issueCreated,
          })),
        })
      }

      let createdIssuesCount = 0

      if (issuePayloads.length > 0) {
        for (const issueData of issuePayloads) {
          await tx.issue.create({
            data: issueData,
          })
          createdIssuesCount += 1
        }
      }

      await tx.taskChecklistRun.update({
        where: {
          id: runId,
        },
        data: {
          status: "completed",
          startedAt: startedAtValue,
          completedAt: completedAtValue,
        },
      })

      await tx.taskAssignment.update({
        where: {
          id: assignment.id,
        },
        data: {
          status: "completed",
          startedAt: startedAtValue,
          completedAt: completedAtValue,
        },
      })

      await tx.task.update({
        where: {
          id: assignment.taskId,
        },
        data: {
          status: "completed",
          completedAt: completedAtValue,
          resultNotes,
        },
      })

      await tx.activityLog.create({
        data: {
          propertyId: assignment.task.propertyId,
          taskId: assignment.taskId,
          partnerId: assignment.partnerId,
          entityType: "TASK",
          entityId: assignment.taskId,
          action: "CHECKLIST_SUBMITTED",
          message: "Υποβλήθηκε checklist και ολοκληρώθηκε η εργασία.",
          actorType: "partner",
          actorName: assignment.partner.name || "Συνεργάτης",
          metadata: {
            checklistRunId: runId,
            startedAt: startedAtValue,
            completedAt: completedAtValue,
            answerCount: normalizedAnswers.length,
            createdIssuesCount,
          },
        },
      })

      if (issuePayloads.length > 0) {
        await tx.activityLog.create({
          data: {
            propertyId: assignment.task.propertyId,
            taskId: assignment.taskId,
            partnerId: assignment.partnerId,
            entityType: "TASK",
            entityId: assignment.taskId,
            action: "ISSUES_CREATED_FROM_CHECKLIST",
            message: `Δημιουργήθηκαν ${issuePayloads.length} νέα συμβάντα από αποτυχημένα βήματα checklist.`,
            actorType: "system",
            actorName: "OPS System",
            metadata: {
              checklistRunId: runId,
              issuesCreated: issuePayloads.length,
              issueTitles: issuePayloads.map((issue) => issue.title),
            },
          },
        })
      }

      return {
        success: true,
        createdIssuesCount,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("POST /api/checklist-links/[token]/submit error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία υποβολής checklist.",
      },
      { status: 500 }
    )
  }
}