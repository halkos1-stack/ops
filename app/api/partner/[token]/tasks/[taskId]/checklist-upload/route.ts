import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { mkdir, writeFile, unlink } from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"

type RouteContext = {
  params: Promise<{
    token: string
    taskId: string
  }>
}

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "image/heic",
  "image/heif",
]

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

function isExpired(date?: Date | string | null) {
  if (!date) return false

  const parsed = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(parsed.getTime())) return false

  return parsed.getTime() < Date.now()
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function normalizePhotoUrls(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
}

function mergePhotoUrls(...groups: unknown[]) {
  const merged = groups.flatMap((group) => normalizePhotoUrls(group))
  return Array.from(new Set(merged))
}

export async function POST(req: NextRequest, context: RouteContext) {
  let uploadedFilePath: string | null = null

  try {
    const { token, taskId } = await context.params

    const cleanToken = String(token || "").trim()
    const cleanTaskId = String(taskId || "").trim()

    if (!cleanToken) {
      return NextResponse.json(
        { error: "Το portal token είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!cleanTaskId) {
      return NextResponse.json(
        { error: "Το αναγνωριστικό εργασίας είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    const portalAccess = await prisma.partnerPortalAccessToken.findFirst({
      where: {
        token: cleanToken,
        isActive: true,
      },
      select: {
        id: true,
        expiresAt: true,
        partnerId: true,
      },
    })

    if (!portalAccess) {
      return NextResponse.json(
        { error: "Το portal link δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (isExpired(portalAccess.expiresAt)) {
      return NextResponse.json(
        { error: "Το portal link έχει λήξει." },
        { status: 410 }
      )
    }

    const assignments = await prisma.taskAssignment.findMany({
      where: {
        partnerId: portalAccess.partnerId,
        taskId: cleanTaskId,
      },
      orderBy: [
        {
          assignedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      include: {
        task: {
          include: {
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
                items: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
                answers: true,
              },
            },
            property: {
              select: {
                id: true,
                organizationId: true,
              },
            },
          },
        },
        partner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!assignments.length) {
      return NextResponse.json(
        { error: "Η εργασία δεν βρέθηκε για αυτόν τον συνεργάτη." },
        { status: 404 }
      )
    }

    const latestAssignment = assignments[0]

    if (
      !["accepted", "in_progress"].includes(
        String(latestAssignment.status || "").toLowerCase()
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Η αποστολή φωτογραφίας επιτρέπεται μόνο όταν η εργασία είναι αποδεκτή ή σε εξέλιξη.",
        },
        { status: 400 }
      )
    }

    const checklistRun = latestAssignment.task.checklistRun

    if (!checklistRun) {
      return NextResponse.json(
        { error: "Δεν υπάρχει συνδεδεμένη checklist για αυτή την εργασία." },
        { status: 400 }
      )
    }

    if (String(checklistRun.status || "").toLowerCase() === "completed") {
      return NextResponse.json(
        {
          error:
            "Η checklist έχει ήδη οριστικοποιηθεί και δεν επιτρέπεται νέα αποστολή φωτογραφίας.",
        },
        { status: 409 }
      )
    }

    if (!checklistRun.template) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε πρότυπο checklist για αυτή την εργασία." },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const templateItemId = String(formData.get("templateItemId") || "").trim()
    const file = formData.get("file")

    if (!templateItemId) {
      return NextResponse.json(
        { error: "Το templateItemId είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε αρχείο φωτογραφίας." },
        { status: 400 }
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Μη αποδεκτός τύπος αρχείου εικόνας." },
        { status: 400 }
      )
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "Το αρχείο εικόνας είναι κενό." },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Το αρχείο εικόνας είναι πολύ μεγάλο." },
        { status: 400 }
      )
    }

    const checklistItem = checklistRun.template.items.find(
      (item) => item.id === templateItemId
    )

    if (!checklistItem) {
      return NextResponse.json(
        { error: "Το στοιχείο checklist δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const runItem = checklistRun.items.find(
      (item) => String(item.propertyTemplateItemId || "") === templateItemId
    )

    if (!runItem) {
      return NextResponse.json(
        {
          error:
            "Δεν βρέθηκε το αντίστοιχο checklist run item για το στοιχείο φωτογραφίας.",
        },
        { status: 400 }
      )
    }

    const existingAnswer = checklistRun.answers.find(
      (answer) => answer.templateItemId === templateItemId
    )

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "partner-checklists",
      cleanTaskId,
      templateItemId
    )

    await mkdir(uploadsDir, { recursive: true })

    const ext =
      path.extname(file.name || "") ||
      (file.type === "image/png"
        ? ".png"
        : file.type === "image/webp"
          ? ".webp"
          : ".jpg")

    const filename = sanitizeFilename(
      `${Date.now()}-${crypto.randomUUID()}${ext}`
    )

    uploadedFilePath = path.join(uploadsDir, filename)
    await writeFile(uploadedFilePath, buffer)

    const fileUrl = `/uploads/partner-checklists/${cleanTaskId}/${templateItemId}/${filename}`

    const result = await prisma.$transaction(async (tx) => {
      await tx.partnerPortalAccessToken.update({
        where: { id: portalAccess.id },
        data: { lastUsedAt: new Date() },
      })

      const savedAnswer = existingAnswer
        ? await tx.taskChecklistAnswer.update({
            where: {
              id: existingAnswer.id,
            },
            data: {
              runItemId: existingAnswer.runItemId || runItem.id,
              photoUrls: mergePhotoUrls(existingAnswer.photoUrls, [fileUrl]),
            },
          })
        : await tx.taskChecklistAnswer.create({
            data: {
              checklistRunId: checklistRun.id,
              runItemId: runItem.id,
              templateItemId,
              photoUrls: [fileUrl],
            },
          })

      await tx.activityLog.create({
        data: {
          organizationId: latestAssignment.task.property.organizationId,
          propertyId: latestAssignment.task.property.id,
          taskId: latestAssignment.task.id,
          partnerId: latestAssignment.partnerId,
          entityType: "TASK_CHECKLIST_ANSWER",
          entityId: savedAnswer.id,
          action: "PARTNER_CHECKLIST_PHOTO_UPLOADED",
          message: `Ο συνεργάτης ${latestAssignment.partner.name} ανέβασε φωτογραφία για το στοιχείο "${checklistItem.label}".`,
          actorType: "PARTNER_PORTAL",
          actorName: latestAssignment.partner.name,
          metadata: {
            checklistRunId: checklistRun.id,
            runItemId: runItem.id,
            templateItemId,
            fileUrl,
            photoCount: mergePhotoUrls(savedAnswer.photoUrls).length,
          },
        },
      })

      return {
        answerId: savedAnswer.id,
        photoUrls: mergePhotoUrls(savedAnswer.photoUrls),
      }
    })

    return NextResponse.json({
      success: true,
      fileUrl,
      answerId: result.answerId,
      photoUrls: result.photoUrls,
    })
  } catch (error) {
    if (uploadedFilePath) {
      try {
        await unlink(uploadedFilePath)
      } catch {
        // αγνόηση cleanup error
      }
    }

    console.error(
      "POST /api/partner/[token]/tasks/[taskId]/checklist-upload error:",
      error
    )

    return NextResponse.json(
      { error: "Αποτυχία αποστολής φωτογραφίας." },
      { status: 500 }
    )
  }
}