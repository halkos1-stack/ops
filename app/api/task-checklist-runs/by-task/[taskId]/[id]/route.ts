import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await req.json()

    const action = body.action?.trim()
    const answers = Array.isArray(body.answers) ? body.answers : []

    const run = await prisma.taskChecklistRun.findUnique({
      where: { id },
      include: {
        task: true,
        template: {
          include: {
            items: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        },
        answers: {
          include: {
            templateItem: true,
          },
        },
      },
    })

    if (!run) {
      return NextResponse.json(
        { error: "Η checklist δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (action !== "save" && action !== "submit") {
      return NextResponse.json(
        { error: "Μη έγκυρη ενέργεια." },
        { status: 400 }
      )
    }

    for (const answer of answers) {
      const answerId = answer.id?.trim()

      if (!answerId) continue

      await prisma.taskChecklistAnswer.update({
        where: { id: answerId },
        data: {
          booleanValue:
            typeof answer.booleanValue === "boolean"
              ? answer.booleanValue
              : null,
          textValue:
            typeof answer.textValue === "string"
              ? answer.textValue.trim() || null
              : null,
          numberValue:
            answer.numberValue !== null &&
            answer.numberValue !== undefined &&
            answer.numberValue !== ""
              ? Number(answer.numberValue)
              : null,
          notes:
            typeof answer.notes === "string"
              ? answer.notes.trim() || null
              : null,
          completedAt: new Date(),
        },
      })
    }

    const refreshedRun = await prisma.taskChecklistRun.findUnique({
      where: { id },
      include: {
        task: true,
        template: {
          include: {
            property: true,
            items: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        },
        answers: {
          include: {
            templateItem: true,
          },
          orderBy: {
            templateItem: {
              sortOrder: "asc",
            },
          },
        },
      },
    })

    if (!refreshedRun) {
      return NextResponse.json(
        { error: "Η checklist δεν βρέθηκε μετά την ενημέρωση." },
        { status: 404 }
      )
    }

    if (action === "save") {
      const savedRun = await prisma.taskChecklistRun.update({
        where: { id },
        data: {
          status: refreshedRun.status === "submitted" ? "submitted" : "in_progress",
          startedAt: refreshedRun.startedAt ?? new Date(),
        },
        include: {
          task: true,
          template: {
            include: {
              property: true,
              items: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
            },
          },
          answers: {
            include: {
              templateItem: true,
            },
            orderBy: {
              templateItem: {
                sortOrder: "asc",
              },
            },
          },
        },
      })

      await prisma.activityLog.create({
        data: {
          propertyId: refreshedRun.task.propertyId,
          taskId: refreshedRun.task.id,
          entityType: "task_checklist_run",
          entityId: refreshedRun.id,
          action: "checklist_saved",
          message: `Έγινε προσωρινή αποθήκευση checklist για την εργασία "${refreshedRun.task.title}"`,
          actorType: "partner",
          actorName: "Partner User",
          metadata: {
            runId: refreshedRun.id,
            taskId: refreshedRun.task.id,
          },
        },
      })

      return NextResponse.json(savedRun)
    }

    const invalidRequiredItems = refreshedRun.answers.filter((answer) => {
      if (!answer.templateItem.isRequired) return false

      if (answer.templateItem.itemType === "boolean") {
        return answer.booleanValue === null
      }

      if (answer.templateItem.itemType === "text") {
        return !answer.textValue || answer.textValue.trim() === ""
      }

      if (answer.templateItem.itemType === "number") {
        return answer.numberValue === null || answer.numberValue === undefined
      }

      return true
    })

    if (invalidRequiredItems.length > 0) {
      return NextResponse.json(
        {
          error:
            "Δεν έχουν συμπληρωθεί όλα τα υποχρεωτικά βήματα της checklist.",
        },
        { status: 400 }
      )
    }

    const submittedRun = await prisma.taskChecklistRun.update({
      where: { id },
      data: {
        status: "submitted",
        startedAt: refreshedRun.startedAt ?? new Date(),
        submittedAt: new Date(),
      },
      include: {
        task: true,
        template: {
          include: {
            property: true,
            items: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        },
        answers: {
          include: {
            templateItem: true,
          },
          orderBy: {
            templateItem: {
              sortOrder: "asc",
            },
          },
        },
      },
    })

    await prisma.activityLog.create({
      data: {
        propertyId: refreshedRun.task.propertyId,
        taskId: refreshedRun.task.id,
        entityType: "task_checklist_run",
        entityId: refreshedRun.id,
        action: "checklist_submitted",
        message: `Υποβλήθηκε checklist για την εργασία "${refreshedRun.task.title}"`,
        actorType: "partner",
        actorName: "Partner User",
        metadata: {
          runId: refreshedRun.id,
          taskId: refreshedRun.task.id,
        },
      },
    })

    return NextResponse.json(submittedRun)
  } catch (error) {
    console.error("Update checklist run error:", error)

    return NextResponse.json(
      { error: "Failed to update checklist run" },
      { status: 500 }
    )
  }
}