import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireApiPartnerAccess,
  canPartnerAccessChecklistRun,
} from "@/lib/partner-route-access"

type RouteContext = {
  params: Promise<{
    runId: string
  }>
}

type AnswerInput = {
  templateItemId?: unknown
  valueBoolean?: unknown
  valueText?: unknown
  valueNumber?: unknown
  valueSelect?: unknown
  notes?: unknown
  photoUrls?: unknown
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

function normalizePhotoUrls(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item || "").trim()).filter(Boolean)
}

function normalizeAnswers(input: unknown) {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      const row = (item ?? {}) as AnswerInput
      const templateItemId = toNullableString(row.templateItemId)

      if (!templateItemId) return null

      return {
        templateItemId,
        valueBoolean:
          typeof row.valueBoolean === "boolean" ? row.valueBoolean : null,
        valueText: toNullableString(row.valueText),
        valueNumber: toNullableNumber(row.valueNumber),
        valueSelect: toNullableString(row.valueSelect),
        notes: toNullableString(row.notes),
        photoUrls: normalizePhotoUrls(row.photoUrls),
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

function hasRequiredValue(itemType: string, answer?: ReturnType<typeof normalizeAnswers>[number]) {
  if (!answer) return false

  const normalized = String(itemType || "").trim().toLowerCase()

  if (
    normalized === "boolean" ||
    normalized === "yes_no" ||
    normalized === "pass_fail" ||
    normalized === "checkbox"
  ) {
    return typeof answer.valueBoolean === "boolean"
  }

  if (normalized === "number" || normalized === "numeric") {
    return typeof answer.valueNumber === "number" && Number.isFinite(answer.valueNumber)
  }

  if (
    normalized === "select" ||
    normalized === "dropdown" ||
    normalized === "choice" ||
    normalized === "option" ||
    normalized === "options"
  ) {
    return Boolean(answer.valueSelect)
  }

  if (normalized === "photo") {
    return answer.photoUrls.length > 0
  }

  return Boolean(answer.valueText)
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiPartnerAccess()

    if (!access.ok) {
      return access.response
    }

    const { auth } = access
    const { runId } = await context.params
    const body = await req.json()

    const allowed = await canPartnerAccessChecklistRun(auth, runId)

    if (!allowed) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το checklist run." },
        { status: 403 }
      )
    }

    const submittedAnswers = normalizeAnswers(body.answers)

    if (submittedAnswers.length === 0) {
      return NextResponse.json(
        { error: "Δεν υπάρχουν answers για υποβολή." },
        { status: 400 }
      )
    }

    const existingRun = await prisma.taskChecklistRun.findFirst({
      where: {
        id: runId,
        task: {
          organizationId: auth.organizationId,
        },
      },
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
        answers: true,
        task: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    if (!existingRun) {
      return NextResponse.json(
        { error: "Το checklist run δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const templateItems = existingRun.template.items
    const templateItemIds = new Set(templateItems.map((item) => item.id))

    for (const answer of submittedAnswers) {
      if (!templateItemIds.has(answer.templateItemId)) {
        return NextResponse.json(
          { error: "Υπάρχει answer με template item που δεν ανήκει στο συγκεκριμένο run." },
          { status: 400 }
        )
      }
    }

    const missingRequiredItems = templateItems.filter((item) => {
      if (!item.isRequired) return false

      const answer = submittedAnswers.find(
        (submitted) => submitted.templateItemId === item.id
      )

      return !hasRequiredValue(item.itemType, answer)
    })

    if (missingRequiredItems.length > 0) {
      return NextResponse.json(
        {
          error: "Λείπουν υποχρεωτικές απαντήσεις από το checklist.",
          missingItems: missingRequiredItems.map((item) => ({
            id: item.id,
            label: item.label,
          })),
        },
        { status: 400 }
      )
    }

    const submittedMap = new Map(
      submittedAnswers.map((answer) => [answer.templateItemId, answer])
    )

    const result = await prisma.$transaction(async (tx) => {
      for (const item of templateItems) {
        const submitted = submittedMap.get(item.id)
        const existing = existingRun.answers.find((row) => row.templateItemId === item.id)

        if (!submitted) {
          if (existing) {
            await tx.taskChecklistAnswer.delete({
              where: { id: existing.id },
            })
          }
          continue
        }

        const data = {
          valueBoolean: submitted.valueBoolean,
          valueText: submitted.valueText,
          valueNumber: submitted.valueNumber,
          valueSelect: submitted.valueSelect,
          notes: submitted.notes,
          photoUrls: submitted.photoUrls,
        }

        if (existing) {
          await tx.taskChecklistAnswer.update({
            where: { id: existing.id },
            data,
          })
        } else {
          await tx.taskChecklistAnswer.create({
            data: {
              checklistRunId: runId,
              templateItemId: item.id,
              ...data,
            },
          })
        }
      }

      const now = new Date()

      await tx.taskChecklistRun.update({
        where: {
          id: runId,
        },
        data: {
          status: "completed",
          startedAt: body.startedAt ? new Date(body.startedAt) : now,
          completedAt: body.completedAt ? new Date(body.completedAt) : now,
        },
      })

      const refreshedTask = await tx.task.findUnique({
        where: { id: existingRun.task.id },
        include: {
          checklistRun: true,
          supplyRun: true,
        },
      })

      const suppliesCompleted =
        !refreshedTask?.supplyRun ||
        refreshedTask.supplyRun.status === "completed"

      if (suppliesCompleted) {
        await tx.task.update({
          where: { id: existingRun.task.id },
          data: {
            status: "completed",
            completedAt: now,
          },
        })

        const latestAssignment = await tx.taskAssignment.findFirst({
          where: {
            partnerId: auth.partnerId,
            taskId: existingRun.task.id,
          },
          orderBy: [
            { assignedAt: "desc" },
            { createdAt: "desc" },
          ],
          select: { id: true },
        })

        if (latestAssignment) {
          await tx.taskAssignment.update({
            where: { id: latestAssignment.id },
            data: {
              status: "completed",
              completedAt: now,
            },
          })
        }
      }

      return tx.taskChecklistRun.findUnique({
        where: { id: runId },
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
          answers: true,
          task: true,
        },
      })
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Partner checklist submit POST error:", error)
    return NextResponse.json(
      { error: "Αποτυχία υποβολής checklist." },
      { status: 500 }
    )
  }
}