import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiAppAccess,
  canAccessOrganization,
} from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    taskId: string
    id: string
  }>
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function toNullableBoolean(value: unknown) {
  if (typeof value === "boolean") return value
  if (value === undefined || value === null || value === "") return null
  return null
}

function toPhotoUrls(value: unknown) {
  if (!Array.isArray(value)) return undefined

  const urls = value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)

  // Επιστρέφουμε undefined για άδειο array ώστε να μην σβήνονται staged photos
  // που έχουν ανέβει μέσω του upload path. Μόνο populated array αντικαθιστά.
  return urls.length > 0 ? urls : undefined
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response
    const { auth } = access

    const { taskId, id } = await context.params
    const body = await req.json().catch(() => ({}))

    const action = String(body.action ?? "").trim().toLowerCase()
    const answers = Array.isArray(body.answers) ? body.answers : []

    if (action !== "save" && action !== "submit") {
      return NextResponse.json(
        { error: "Μη έγκυρη ενέργεια." },
        { status: 400 }
      )
    }

    const taskScope = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, organizationId: true },
    })

    if (!taskScope) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, taskScope.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτή την εργασία." },
        { status: 403 }
      )
    }

    const run = await prisma.taskChecklistRun.findFirst({
      where: {
        id,
        taskId,
      },
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

    if (String(run.status ?? "").toLowerCase() === "completed") {
      return NextResponse.json(
        {
          error:
            "Η checklist έχει ήδη οριστικοποιηθεί και δεν επιτρέπεται τροποποίηση.",
        },
        { status: 409 }
      )
    }

    for (const answer of answers) {
      const answerId = String(answer?.id ?? "").trim()
      if (!answerId) continue

      await prisma.taskChecklistAnswer.update({
        where: { id: answerId },
        data: {
          valueBoolean: toNullableBoolean(answer.booleanValue),
          valueText: toNullableString(answer.textValue),
          valueNumber: toNullableNumber(answer.numberValue),
          valueSelect: toNullableString(answer.selectValue ?? answer.valueSelect),
          notes: toNullableString(answer.notes),
          ...(toPhotoUrls(answer.photoUrls) !== undefined
            ? { photoUrls: toPhotoUrls(answer.photoUrls) }
            : {}),
        },
      })
    }

    const refreshedRun = await prisma.taskChecklistRun.findFirst({
      where: {
        id,
        taskId,
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
          status:
            refreshedRun.status === "completed" ? "completed" : "in_progress",
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
          organizationId: refreshedRun.task.organizationId,
          propertyId: refreshedRun.task.propertyId,
          taskId: refreshedRun.task.id,
          entityType: "TASK_CHECKLIST_RUN",
          entityId: refreshedRun.id,
          action: "CHECKLIST_SAVED",
          message: `Έγινε προσωρινή αποθήκευση checklist για την εργασία "${refreshedRun.task.title}"`,
          actorType: "manager",
          actorName: auth.name || auth.email || "Διαχειριστής",
          metadata: {
            runId: refreshedRun.id,
            taskId: refreshedRun.task.id,
          },
        },
      })

      return NextResponse.json(savedRun)
    }

    const invalidRequiredItems = refreshedRun.answers.filter((answer) => {
      const templateItem = answer.templateItem

      if (!templateItem?.isRequired) return false

      if (templateItem.itemType === "boolean") {
        return answer.valueBoolean === null
      }

      if (templateItem.itemType === "text") {
        return !answer.valueText || answer.valueText.trim() === ""
      }

      if (templateItem.itemType === "number") {
        return (
          answer.valueNumber === null || answer.valueNumber === undefined
        )
      }

      if (
        templateItem.itemType === "select" ||
        templateItem.itemType === "choice"
      ) {
        return !answer.valueSelect || answer.valueSelect.trim() === ""
      }

      return false
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
        status: "completed",
        startedAt: refreshedRun.startedAt ?? new Date(),
        completedAt: new Date(),
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
        organizationId: refreshedRun.task.organizationId,
        propertyId: refreshedRun.task.propertyId,
        taskId: refreshedRun.task.id,
        entityType: "TASK_CHECKLIST_RUN",
        entityId: refreshedRun.id,
        action: "CHECKLIST_SUBMITTED",
        message: `Υποβλήθηκε checklist για την εργασία "${refreshedRun.task.title}"`,
        actorType: "manager",
        actorName: auth.name || auth.email || "Διαχειριστής",
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
      { error: "Αποτυχία ενημέρωσης checklist run." },
      { status: 500 }
    )
  }
}
