import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function mapStatusToDb(status: unknown): "active" | "inactive" | undefined {
  if (status === undefined) return undefined

  const normalized = String(status ?? "").trim().toLowerCase()

  if (
    normalized === "ενεργό" ||
    normalized === "ενεργο" ||
    normalized === "active"
  ) {
    return "active"
  }

  if (
    normalized === "ανενεργό" ||
    normalized === "ανενεργο" ||
    normalized === "inactive"
  ) {
    return "inactive"
  }

  return undefined
}

function mapStatusToUi(status: string | null | undefined) {
  return status === "active" ? "Ενεργό" : "Ανενεργό"
}

function toNullableString(value: unknown) {
  if (value === undefined) return undefined
  if (value === null) return null

  const text = String(value).trim()
  return text === "" ? null : text
}

function toNullableInt(value: unknown) {
  if (value === undefined) return undefined
  if (value === null || value === "") return null

  const num = Number(value)
  if (Number.isNaN(num)) return undefined

  return Math.trunc(num)
}

function normalizePropertyForUi(property: any) {
  return {
    ...property,
    status: mapStatusToUi(property.status),
    checklistTemplates: Array.isArray(property.checklistTemplates)
      ? property.checklistTemplates
      : [],
    primaryChecklist:
      Array.isArray(property.checklistTemplates) &&
      property.checklistTemplates.length > 0
        ? property.checklistTemplates.find((x: any) => x.isPrimary) ||
          property.checklistTemplates[0]
        : null,
  }
}

async function getPropertyById(id: string) {
  return prisma.property.findUnique({
    where: { id },
    include: {
      defaultPartner: {
        select: {
          id: true,
          name: true,
          email: true,
          specialty: true,
        },
      },
      bookings: {
        orderBy: {
          checkInDate: "desc",
        },
        take: 20,
      },
      tasks: {
        include: {
          assignments: {
            include: {
              partner: true,
            },
            orderBy: {
              assignedAt: "desc",
            },
          },
          checklistRun: {
            include: {
              template: true,
              answers: true,
            },
          },
        },
        orderBy: {
          scheduledDate: "desc",
        },
        take: 50,
      },
      issues: {
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
      },
      checklistTemplates: {
        include: {
          items: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
    },
  })
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const property = await getPropertyById(id)

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(normalizePropertyForUi(property))
  } catch (error) {
    console.error("GET /api/properties/[id] error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία φόρτωσης ακινήτου.",
      },
      { status: 500 }
    )
  }
}

async function updateProperty(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await req.json()

    const dbStatus = mapStatusToDb(body?.status)

    const updated = await prisma.property.update({
      where: { id },
      data: {
        ...(body?.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body?.code !== undefined ? { code: String(body.code).trim() } : {}),
        ...(body?.address !== undefined
          ? { address: String(body.address).trim() }
          : {}),
        ...(body?.city !== undefined ? { city: String(body.city).trim() } : {}),
        ...(body?.region !== undefined
          ? { region: String(body.region).trim() }
          : {}),
        ...(body?.postalCode !== undefined
          ? { postalCode: String(body.postalCode).trim() }
          : {}),
        ...(body?.country !== undefined
          ? { country: String(body.country).trim() }
          : {}),
        ...(body?.type !== undefined ? { type: String(body.type).trim() } : {}),
        ...(dbStatus !== undefined ? { status: dbStatus } : {}),
        ...(body?.bedrooms !== undefined
          ? { bedrooms: toNullableInt(body.bedrooms) ?? 0 }
          : {}),
        ...(body?.bathrooms !== undefined
          ? { bathrooms: toNullableInt(body.bathrooms) ?? 0 }
          : {}),
        ...(body?.maxGuests !== undefined
          ? { maxGuests: toNullableInt(body.maxGuests) ?? 0 }
          : {}),
        ...(body?.notes !== undefined ? { notes: toNullableString(body.notes) } : {}),
        ...(body?.defaultPartnerId !== undefined
          ? { defaultPartnerId: body.defaultPartnerId || null }
          : {}),
      },
      include: {
        defaultPartner: {
          select: {
            id: true,
            name: true,
            email: true,
            specialty: true,
          },
        },
        bookings: {
          orderBy: {
            checkInDate: "desc",
          },
          take: 20,
        },
        tasks: {
          include: {
            assignments: {
              include: {
                partner: true,
              },
              orderBy: {
                assignedAt: "desc",
              },
            },
            checklistRun: {
              include: {
                template: true,
                answers: true,
              },
            },
          },
          orderBy: {
            scheduledDate: "desc",
          },
          take: 50,
        },
        issues: {
          orderBy: {
            createdAt: "desc",
          },
          take: 50,
        },
        checklistTemplates: {
          include: {
            items: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
      },
    })

    return NextResponse.json(normalizePropertyForUi(updated))
  } catch (error) {
    console.error("UPDATE /api/properties/[id] error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία αποθήκευσης αλλαγών.",
      },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return updateProperty(req, context)
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return updateProperty(req, context)
}