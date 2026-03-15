import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"

type RouteContext = {
  params: Promise<{
    token: string
    taskId: string
  }>
}

function isExpired(date?: Date | string | null) {
  if (!date) return false

  const parsed = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(parsed.getTime())) return false

  return parsed.getTime() < Date.now()
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export async function POST(req: NextRequest, context: RouteContext) {
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
                    items: true,
                  },
                },
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

    const checklistItem = checklistRun.template.items.find(
      (item) => item.id === templateItemId
    )

    if (!checklistItem) {
      return NextResponse.json(
        { error: "Το στοιχείο checklist δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
      "image/heic",
      "image/heif",
    ]

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Μη αποδεκτός τύπος αρχείου εικόνας." },
        { status: 400 }
      )
    }

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

    const filePath = path.join(uploadsDir, filename)
    await writeFile(filePath, buffer)

    const fileUrl = `/uploads/partner-checklists/${cleanTaskId}/${templateItemId}/${filename}`

    await prisma.activityLog.create({
      data: {
        organizationId: latestAssignment.task.property.organizationId,
        propertyId: latestAssignment.task.property.id,
        taskId: latestAssignment.task.id,
        partnerId: latestAssignment.partnerId,
        entityType: "TASK_CHECKLIST_ANSWER",
        entityId: templateItemId,
        action: "PARTNER_CHECKLIST_PHOTO_UPLOADED",
        message: `Ο συνεργάτης ${latestAssignment.partner.name} ανέβασε φωτογραφία για το στοιχείο "${checklistItem.label}".`,
        actorType: "PARTNER_PORTAL",
        actorName: latestAssignment.partner.name,
        metadata: {
          checklistRunId: checklistRun.id,
          templateItemId,
          fileUrl,
        },
      },
    })

    return NextResponse.json({
      success: true,
      fileUrl,
    })
  } catch (error) {
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