import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

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

async function getPropertyBase(id: string) {
  return prisma.property.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      defaultPartnerId: true,
    },
  })
}

async function getFullProperty(id: string) {
  return prisma.property.findUnique({
    where: { id },
    include: {
      defaultPartner: true,

      bookings: {
        orderBy: {
          checkInDate: "desc",
        },
        take: 20,
      },

      tasks: {
        orderBy: {
          scheduledDate: "desc",
        },
        take: 30,
        include: {
          booking: {
            select: {
              id: true,
              guestName: true,
              checkInDate: true,
              checkOutDate: true,
              status: true,
            },
          },
          assignments: {
            orderBy: {
              assignedAt: "desc",
            },
            include: {
              partner: {
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
            },
          },
          checklistRun: {
            include: {
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
                  issueCreated: true,
                },
              },
            },
          },
        },
      },

      issues: {
        orderBy: {
          createdAt: "desc",
        },
        take: 30,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          booking: {
            select: {
              id: true,
              guestName: true,
              checkInDate: true,
              checkOutDate: true,
              status: true,
            },
          },
        },
      },

      checklistTemplates: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        include: {
          items: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },

      propertySupplies: {
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          supplyItem: true,
        },
      },

      taskPhotos: {
        orderBy: {
          uploadedAt: "desc",
        },
        take: 30,
      },

      events: {
        orderBy: {
          createdAt: "desc",
        },
        take: 30,
      },

      activityLogs: {
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
      },
    },
  })
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { id } = await context.params

    const base = await getPropertyBase(id)

    if (!base) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, base.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      )
    }

    const property = await getFullProperty(id)

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json({ property })
  } catch (error) {
    console.error("GET /api/properties/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης ακινήτου." },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { id } = await context.params
    const body = await req.json()

    const existing = await getPropertyBase(id)

    if (!existing) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existing.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      )
    }

    const code = toRequiredString(body.code, "code")
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

    const duplicateCode = await prisma.property.findFirst({
      where: {
        organizationId: existing.organizationId,
        code,
        NOT: {
          id,
        },
      },
      select: {
        id: true,
      },
    })

    if (duplicateCode) {
      return NextResponse.json(
        { error: "Υπάρχει ήδη άλλο ακίνητο με αυτόν τον κωδικό." },
        { status: 400 }
      )
    }

    if (defaultPartnerId) {
      const partner = await prisma.partner.findFirst({
        where: {
          id: defaultPartnerId,
          organizationId: existing.organizationId,
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

    const updated = await prisma.property.update({
      where: { id },
      data: {
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

    const property = await getFullProperty(updated.id)

    return NextResponse.json({
      success: true,
      property,
    })
  } catch (error) {
    console.error("PUT /api/properties/[id] error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία ενημέρωσης ακινήτου."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess()

    if (!access.ok) {
      return access.response
    }

    const auth = access.auth
    const { id } = await context.params
    const body = await req.json()

    const existing = await getPropertyBase(id)

    if (!existing) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
    }

    if (!canAccessOrganization(auth, existing.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      )
    }

    const data: {
      code?: string
      name?: string
      address?: string
      city?: string
      region?: string
      postalCode?: string
      country?: string
      type?: string
      status?: string
      bedrooms?: number
      bathrooms?: number
      maxGuests?: number
      notes?: string | null
      defaultPartnerId?: string | null
    } = {}

    if ("code" in body) data.code = toRequiredString(body.code, "code")
    if ("name" in body) data.name = toRequiredString(body.name, "name")
    if ("address" in body) data.address = toRequiredString(body.address, "address")
    if ("city" in body) data.city = toRequiredString(body.city, "city")
    if ("region" in body) data.region = toRequiredString(body.region, "region")
    if ("postalCode" in body) {
      data.postalCode = toRequiredString(body.postalCode, "postalCode")
    }
    if ("country" in body) data.country = toRequiredString(body.country, "country")
    if ("type" in body) data.type = toRequiredString(body.type, "type")
    if ("status" in body) data.status = normalizePropertyStatus(body.status)
    if ("bedrooms" in body) data.bedrooms = toNonNegativeInt(body.bedrooms, 0)
    if ("bathrooms" in body) data.bathrooms = toNonNegativeInt(body.bathrooms, 0)
    if ("maxGuests" in body) data.maxGuests = toNonNegativeInt(body.maxGuests, 0)
    if ("notes" in body) data.notes = toNullableString(body.notes)
    if ("defaultPartnerId" in body) {
      data.defaultPartnerId = toNullableString(body.defaultPartnerId)
    }

    if (data.code) {
      const duplicateCode = await prisma.property.findFirst({
        where: {
          organizationId: existing.organizationId,
          code: data.code,
          NOT: {
            id,
          },
        },
        select: {
          id: true,
        },
      })

      if (duplicateCode) {
        return NextResponse.json(
          { error: "Υπάρχει ήδη άλλο ακίνητο με αυτόν τον κωδικό." },
          { status: 400 }
        )
      }
    }

    if (data.defaultPartnerId) {
      const partner = await prisma.partner.findFirst({
        where: {
          id: data.defaultPartnerId,
          organizationId: existing.organizationId,
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

    await prisma.property.update({
      where: { id },
      data,
    })

    const property = await getFullProperty(id)

    return NextResponse.json({
      success: true,
      property,
    })
  } catch (error) {
    console.error("PATCH /api/properties/[id] error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία ενημέρωσης ακινήτου."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}