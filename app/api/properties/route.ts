import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function toNullableString(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toRequiredString(value: unknown, fieldLabel: string) {
  const text = String(value ?? "").trim()

  if (!text) {
    throw new Error(`Το πεδίο "${fieldLabel}" είναι υποχρεωτικό.`)
  }

  return text
}

function toInt(value: unknown, fallback = 0) {
  const num = Number(value)
  if (Number.isNaN(num)) return fallback
  return Math.trunc(num)
}

function mapStatusToDb(status: unknown): "active" | "inactive" {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase()

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

  return "active"
}

function mapStatusToUi(status: string | null | undefined) {
  return status === "active" ? "Ενεργό" : "Ανενεργό"
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

export async function GET() {
  try {
    const properties = await prisma.property.findMany({
      include: {
        checklistTemplates: {
          include: {
            items: {
              select: {
                id: true,
              },
            },
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(properties.map(normalizePropertyForUi))
  } catch (error) {
    console.error("GET /api/properties error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης ακινήτων." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const code = toRequiredString(body.code, "Κωδικός ακινήτου")
    const name = toRequiredString(body.name, "Όνομα ακινήτου")
    const address = toRequiredString(body.address, "Διεύθυνση")
    const city = toRequiredString(body.city, "Πόλη")
    const region = toRequiredString(body.region, "Περιοχή")
    const postalCode = toRequiredString(body.postalCode, "Τ.Κ.")

    const country = String(body.country ?? "GR").trim() || "GR"
    const type = String(body.type ?? "apartment").trim() || "apartment"
    const status = mapStatusToDb(body.status)

    const bedrooms = toInt(body.bedrooms, 0)
    const bathrooms = toInt(body.bathrooms, 0)
    const maxGuests = toInt(body.maxGuests, 0)
    const notes = toNullableString(body.notes)

    const existingProperty = await prisma.property.findUnique({
      where: { code },
      select: { id: true },
    })

    if (existingProperty) {
      return NextResponse.json(
        { error: "Υπάρχει ήδη ακίνητο με αυτόν τον κωδικό." },
        { status: 409 }
      )
    }

    const created = await prisma.property.create({
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
      },
      include: {
        checklistTemplates: {
          include: {
            items: {
              select: {
                id: true,
              },
            },
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
      },
    })

    await prisma.activityLog.create({
      data: {
        propertyId: created.id,
        entityType: "PROPERTY",
        entityId: created.id,
        action: "PROPERTY_CREATED",
        message: `Δημιουργήθηκε το ακίνητο ${created.name}`,
        actorType: "manager",
        actorName: "Διαχειριστής",
        metadata: {
          propertyCode: created.code,
          propertyType: created.type,
          propertyStatus: created.status,
        },
      },
    })

    return NextResponse.json(normalizePropertyForUi(created), { status: 201 })
  } catch (error: any) {
    console.error("POST /api/properties error:", error)

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Υπάρχει ήδη εγγραφή με αυτά τα μοναδικά στοιχεία." },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Αποτυχία δημιουργίας ακινήτου.",
      },
      { status: 500 }
    )
  }
}