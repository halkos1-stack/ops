import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess } from "@/lib/route-access"

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null

  const text = String(value).trim()
  return text === "" ? null : text
}

function toRequiredString(value: unknown, fieldName: string) {
  const text = String(value ?? "").trim()

  if (!text) {
    throw new Error(`Το πεδίο "${fieldName}" είναι υποχρεωτικό.`)
  }

  return text
}

function toNonNegativeInt(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback

  const num = Number(value)

  if (Number.isNaN(num)) return fallback

  return Math.max(0, Math.trunc(num))
}

function normalizePropertyStatus(value: unknown) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()

  if (["active", "inactive", "maintenance", "archived"].includes(text)) {
    return text
  }

  return "active"
}

function buildOrganizationPrefix(name: string) {
  const cleaned = name
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toUpperCase()

  if (!cleaned) return "ORG"
  if (cleaned.length >= 3) return cleaned.slice(0, 3)
  return cleaned.padEnd(3, "X")
}

async function generateNextPropertyCode(
  organizationId: string,
  organizationName: string
) {
  const prefix = buildOrganizationPrefix(organizationName)

  const existing = await prisma.property.findMany({
    where: {
      organizationId,
      code: {
        startsWith: prefix,
      },
    },
    select: {
      code: true,
    },
  })

  let maxNumber = 0

  for (const row of existing) {
    const code = String(row.code || "")
    const suffix = code.slice(prefix.length)
    const match = suffix.match(/(\d+)$/)

    if (match) {
      const num = Number(match[1])
      if (!Number.isNaN(num) && num > maxNumber) {
        maxNumber = num
      }
    }
  }

  const nextNumber = maxNumber + 1
  return `${prefix}${String(nextNumber).padStart(4, "0")}`
}

async function getFullPropertyList(where: Record<string, unknown>) {
  return prisma.property.findMany({
    where,
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      defaultPartner: {
        select: {
          id: true,
          code: true,
          name: true,
          email: true,
          phone: true,
          specialty: true,
          status: true,
        },
      },

      bookings: {
        select: {
          id: true,
          status: true,
          checkInDate: true,
          checkOutDate: true,
          checkInTime: true,
        },
        orderBy: {
          checkInDate: "desc",
        },
        take: 10,
      },

      tasks: {
        select: {
          id: true,
          status: true,
          priority: true,
          taskType: true,
          scheduledDate: true,
          alertEnabled: true,
          alertAt: true,

          assignments: {
            orderBy: {
              assignedAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              status: true,
              assignedAt: true,
              acceptedAt: true,
              rejectedAt: true,
            },
          },

          checklistRun: {
            select: {
              id: true,
              status: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
        orderBy: {
          scheduledDate: "desc",
        },
        take: 20,
      },

      issues: {
        select: {
          id: true,
          status: true,
          severity: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
    },
  })
}

export async function GET(req: NextRequest) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { searchParams } = new URL(req.url)

    const requestedOrganizationId = searchParams.get("organizationId")
    const status = searchParams.get("status")
    const city = searchParams.get("city")
    const type = searchParams.get("type")
    const search = searchParams.get("search")

    let organizationId: string | null = null

    if (auth.isSuperAdmin) {
      organizationId = requestedOrganizationId ? requestedOrganizationId : null
    } else {
      organizationId = auth.organizationId
    }

    if (!organizationId) {
      return NextResponse.json([])
    }

    const where: Record<string, unknown> = {
      organizationId,
      ...(status && status !== "all" ? { status } : {}),
      ...(city && city !== "all" ? { city } : {}),
      ...(type && type !== "all" ? { type } : {}),
    }

    if (search && search.trim()) {
      const term = search.trim()

      where.OR = [
        { code: { contains: term, mode: "insensitive" } },
        { name: { contains: term, mode: "insensitive" } },
        { address: { contains: term, mode: "insensitive" } },
        { city: { contains: term, mode: "insensitive" } },
        { region: { contains: term, mode: "insensitive" } },
        { country: { contains: term, mode: "insensitive" } },
      ]
    }

    const properties = await getFullPropertyList(where)

    return NextResponse.json(properties)
  } catch (error) {
    console.error("Properties GET error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης ακινήτων." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const body = await req.json()

    const requestedOrganizationId = toNullableString(body.organizationId)

    const organizationId = auth.isSuperAdmin
      ? requestedOrganizationId
      : auth.organizationId

    if (!organizationId) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε organizationId για δημιουργία ακινήτου." },
        { status: 400 }
      )
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Ο οργανισμός δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const name = toRequiredString(body.name, "name")
    const address = toRequiredString(body.address, "address")
    const city = toRequiredString(body.city, "city")
    const region = toRequiredString(body.region, "region")
    const postalCode = toRequiredString(body.postalCode, "postalCode")
    const country = toRequiredString(body.country, "country")
    const type = toRequiredString(body.type, "type")
    const status = normalizePropertyStatus(body.status)
    const bedrooms = toNonNegativeInt(body.bedrooms, 0)
    const bathrooms = toNonNegativeInt(body.bathrooms, 0)
    const maxGuests = toNonNegativeInt(body.maxGuests, 0)
    const notes = toNullableString(body.notes)
    const defaultPartnerId = toNullableString(body.defaultPartnerId)

    if (defaultPartnerId) {
      const partner = await prisma.partner.findFirst({
        where: {
          id: defaultPartnerId,
          organizationId,
        },
        select: {
          id: true,
        },
      })

      if (!partner) {
        return NextResponse.json(
          { error: "Ο προεπιλεγμένος συνεργάτης δεν ανήκει στον ίδιο οργανισμό." },
          { status: 400 }
        )
      }
    }

    let code = await generateNextPropertyCode(organizationId, organization.name)

    const duplicateCode = await prisma.property.findFirst({
      where: {
        organizationId,
        code,
      },
      select: {
        id: true,
      },
    })

    if (duplicateCode) {
      let counter = 2

      while (counter < 1000) {
        const candidate = `${buildOrganizationPrefix(organization.name)}${String(
          counter
        ).padStart(4, "0")}`

        const exists = await prisma.property.findFirst({
          where: {
            organizationId,
            code: candidate,
          },
          select: {
            id: true,
          },
        })

        if (!exists) {
          code = candidate
          break
        }

        counter += 1
      }
    }

    const created = await prisma.property.create({
      data: {
        organizationId,
        code,
        name,
        address,
        city,
        region,
        postalCode,
        country,
        type,
        status,
        bedrooms,
        bathrooms,
        maxGuests,
        notes,
        defaultPartnerId,
      },
    })

    const property = await prisma.property.findUnique({
      where: {
        id: created.id,
      },
      include: {
        defaultPartner: {
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            phone: true,
            specialty: true,
            status: true,
          },
        },

        bookings: {
          select: {
            id: true,
            status: true,
            checkInDate: true,
            checkOutDate: true,
            checkInTime: true,
          },
          orderBy: {
            checkInDate: "desc",
          },
          take: 10,
        },

        tasks: {
          select: {
            id: true,
            status: true,
            priority: true,
            taskType: true,
            scheduledDate: true,
            alertEnabled: true,
            alertAt: true,

            assignments: {
              orderBy: {
                assignedAt: "desc",
              },
              take: 1,
              select: {
                id: true,
                status: true,
                assignedAt: true,
                acceptedAt: true,
                rejectedAt: true,
              },
            },

            checklistRun: {
              select: {
                id: true,
                status: true,
                startedAt: true,
                completedAt: true,
              },
            },
          },
          orderBy: {
            scheduledDate: "desc",
          },
          take: 20,
        },

        issues: {
          select: {
            id: true,
            status: true,
            severity: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        property,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Properties POST error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία δημιουργίας ακινήτου."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}