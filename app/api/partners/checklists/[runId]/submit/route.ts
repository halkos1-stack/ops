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
  value?: unknown
  notes?: unknown
  status?: unknown
}

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function normalizeStatus(value: unknown) {
  const text = String(value ?? "").trim().toUpperCase()

  if (text === "OK") return "OK"
  if (text === "WARNING") return "WARNING"
  if (text === "FAIL") return "FAIL"

  return "OK"
}

function normalizeAnswers(input: unknown) {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      const row = (item ?? {}) as AnswerInput

      const templateItemId = toNullableString(row.templateItemId)
      const value = toNullableString(row.value)
      const notes = toNullableString(row.notes)
      const status = normalizeStatus(row.status)

      if (!templateItemId) {
        return null
      }

      return {
        templateItemId,
        value,
        notes,
        status,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
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

    const startedAt = body.startedAt ? new Date(body.startedAt) : undefined
    const completedAt = body.completedAt ? new Date(body.completedAt) : new Date()

    const existingRun = await prisma.taskChecklistRun.findFirst({
      where: {
        id: runId,
        organizationId: auth.organizationId,
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
        task: {
          select: {
            id: true,
            organizationId: true,
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

    if (!existingRun.template) {
      return NextResponse.json(
        { error: "Το checklist run δεν συνδέεται με πρότυπο checklist." },
        { status: 400 }
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

      if (!answer) return true

      const hasValue =
        (answer.value !== null && answer.value !== "") ||
        (answer.notes !== null && answer.notes !== "")

      return !hasValue
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

    const answersByTemplateItemId = new Map(
      submittedAnswers.map((answer) => [answer.templateItemId, answer])
    )

    const result = await prisma.$transaction(async (tx) => {
      await tx.taskChecklistAnswer.deleteMany({
        where: {
          runId,
        },
      })

      const createdAnswers = templateItems
        .map((item) => {
          const submitted = answersByTemplateItemId.get(item.id)

          if (!submitted) return null

          return {
            organizationId: auth.organizationId,
            runId,
            templateItemId: item.id,
            itemLabel: item.label,
            value: submitted.value,
            notes: submitted.notes,
            status: submitted.status,
          }
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)

      if (createdAnswers.length > 0) {
        await tx.taskChecklistAnswer.createMany({
          data: createdAnswers,
        })
      }

      const updatedRun = await tx.taskChecklistRun.update({
        where: {
          id: runId,
        },
        data: {
          status: "COMPLETED",
          startedAt,
          completedAt,
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
          task: true,
        },
      })

      await tx.task.update({
        where: {
          id: existingRun.task.id,
        },
        data: {
          status: "COMPLETED",
        },
      })

      return updatedRun
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