import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type AuthContext = {
  systemRole?: "SUPER_ADMIN" | "USER"
  organizationId?: string | null
}

function getMockAuthFromRequest(req: NextRequest): AuthContext {
  const systemRole = req.headers.get("x-system-role") as
    | "SUPER_ADMIN"
    | "USER"
    | null

  const organizationId = req.headers.get("x-organization-id")

  return {
    systemRole: systemRole || "SUPER_ADMIN",
    organizationId: organizationId || null,
  }
}

function buildTenantWhere(auth: AuthContext) {
  if (auth.systemRole === "SUPER_ADMIN") {
    return {}
  }

  if (auth.organizationId) {
    return {
      organizationId: auth.organizationId,
    }
  }

  return {
    id: "__no_results__",
  }
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

async function getAccessibleOrganizationId(req: NextRequest, auth: AuthContext) {
  if (auth.systemRole === "SUPER_ADMIN") {
    const bodyClone = req.clone()

    try {
      const body = await bodyClone.json()
      const bodyOrganizationId = toNullableString(body?.organizationId)

      if (bodyOrganizationId) return bodyOrganizationId
    } catch {
      // ignore
    }

    const queryOrganizationId = req.nextUrl.searchParams.get("organizationId")
    if (queryOrganizationId) return queryOrganizationId

    const firstOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })

    return firstOrg?.id || null
  }

  return auth.organizationId || null
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
      checklistTemplates: {
        select: {
          id: true,
          title: true,
          templateType: true,
          isPrimary: true,
          isActive: true,
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      },
    },
  })
}

export async function GET(req: NextRequest) {
  try {
    const auth = getMockAuthFromRequest(req)
    const { searchParams } = new URL(req.url)

    const requestedOrganizationId = searchParams.get("organizationId")
    const status = searchParams.get("status")
    const city = searchParams.get("city")
    const type = searchParams.get("type")
    const search = searchParams.get("search")

    let organizationFilter: string | null = null

    if (auth.systemRole === "SUPER_ADMIN") {
      organizationFilter = requestedOrganizationId || null
    } else {
      organizationFilter = auth.organizationId || null
    }

    const where: Record<string, unknown> = {
      ...(organizationFilter ? { organizationId: organizationFilter } : {}),
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
    const auth = getMockAuthFromRequest(req)
    const body = await req.json()

    const organizationId =
      auth.systemRole === "SUPER_ADMIN"
        ? toNullableString(body.organizationId) ||
          (await prisma.organization.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          }))?.id ||
          null
        : auth.organizationId || null

    if (!organizationId) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε organizationId για δημιουργία ακινήτου." },
        { status: 400 }
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
        organizationId,
        code,
      },
      select: {
        id: true,
      },
    })

    if (duplicateCode) {
      return NextResponse.json(
        { error: "Υπάρχει ήδη ακίνητο με αυτόν τον κωδικό." },
        { status: 400 }
      )
    }

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
        checklistTemplates: {
          select: {
            id: true,
            title: true,
            templateType: true,
            isPrimary: true,
            isActive: true,
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
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