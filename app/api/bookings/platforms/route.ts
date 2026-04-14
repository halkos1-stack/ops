import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildTenantWhere, requireApiAppAccess } from "@/lib/route-access"

type ListingGroup = {
  sourcePlatform: string
  externalListingId: string | null
  externalListingName: string | null
  externalPropertyAddress: string | null
  externalPropertyCity: string | null
  externalPropertyRegion: string | null
  externalPropertyPostalCode: string | null
  externalPropertyCountry: string | null
  bookingsCount: number
  activeBookingsCount: number
  needsMappingCount: number
  latestImportAt: Date | null
  propertyId: string | null
  propertyName: string | null
  propertyCode: string | null
  syncStatusSet: string[]
}

function normalizeText(value: unknown) {
  const text = String(value ?? "").trim()
  return text === "" ? null : text
}

function slugBase(value: string) {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function createUniquePropertyCode(organizationId: string, sourcePlatform: string) {
  const prefix = slugBase(sourcePlatform).slice(0, 6) || "PLAT"

  for (let index = 1; index <= 9999; index += 1) {
    const candidate = `${prefix}-${String(index).padStart(4, "0")}`

    const found = await prisma.property.findFirst({
      where: {
        organizationId,
        code: candidate,
      },
      select: {
        id: true,
      },
    })

    if (!found) {
      return candidate
    }
  }

  throw new Error("Δεν ήταν δυνατή η δημιουργία μοναδικού κωδικού ακινήτου.")
}

async function buildListingGroups(organizationId: string, auth: Parameters<typeof buildTenantWhere>[0]) {
  const bookings = await prisma.booking.findMany({
    where: buildTenantWhere(auth, {
      sourcePlatform: {
        not: "manual",
      } as never,
    }),
    select: {
      id: true,
      propertyId: true,
      sourcePlatform: true,
      externalListingId: true,
      externalListingName: true,
      externalPropertyAddress: true,
      externalPropertyCity: true,
      externalPropertyRegion: true,
      externalPropertyPostalCode: true,
      externalPropertyCountry: true,
      status: true,
      syncStatus: true,
      needsMapping: true,
      importedAt: true,
      property: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
    orderBy: [{ importedAt: "desc" }, { createdAt: "desc" }],
  })

  const groups = new Map<string, ListingGroup>()

  for (const booking of bookings) {
    const platform = String(booking.sourcePlatform || "").trim().toLowerCase()
    const listingId = normalizeText(booking.externalListingId)
    const listingName = normalizeText(booking.externalListingName)

    if (!platform) continue
    if (!listingId && !listingName) continue

    const key = `${platform}::${listingId || listingName}`
    const current = groups.get(key)

    if (!current) {
      groups.set(key, {
        sourcePlatform: platform,
        externalListingId: listingId,
        externalListingName: listingName,
        externalPropertyAddress: normalizeText(booking.externalPropertyAddress),
        externalPropertyCity: normalizeText(booking.externalPropertyCity),
        externalPropertyRegion: normalizeText(booking.externalPropertyRegion),
        externalPropertyPostalCode: normalizeText(booking.externalPropertyPostalCode),
        externalPropertyCountry: normalizeText(booking.externalPropertyCountry),
        bookingsCount: 1,
        activeBookingsCount: String(booking.status || "").trim().toLowerCase() === "cancelled" ? 0 : 1,
        needsMappingCount: booking.needsMapping ? 1 : 0,
        latestImportAt: booking.importedAt,
        propertyId: booking.property?.id || booking.propertyId || null,
        propertyName: booking.property?.name || null,
        propertyCode: booking.property?.code || null,
        syncStatusSet: booking.syncStatus ? [String(booking.syncStatus)] : [],
      })
      continue
    }

    current.bookingsCount += 1
    current.activeBookingsCount += String(booking.status || "").trim().toLowerCase() === "cancelled" ? 0 : 1
    current.needsMappingCount += booking.needsMapping ? 1 : 0

    if (!current.latestImportAt || booking.importedAt > current.latestImportAt) {
      current.latestImportAt = booking.importedAt
    }

    if (!current.propertyId && (booking.property?.id || booking.propertyId)) {
      current.propertyId = booking.property?.id || booking.propertyId || null
      current.propertyName = booking.property?.name || null
      current.propertyCode = booking.property?.code || null
    }

    if (booking.syncStatus && !current.syncStatusSet.includes(String(booking.syncStatus))) {
      current.syncStatusSet.push(String(booking.syncStatus))
    }
  }

  const mappings = await prisma.bookingPropertyMapping.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
    },
    include: {
      property: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  for (const mapping of mappings) {
    const key = `${String(mapping.sourcePlatform || "").trim().toLowerCase()}::${String(mapping.externalListingId || "").trim()}`
    const current = groups.get(key)
    if (!current) continue

    current.propertyId = mapping.property.id
    current.propertyName = mapping.property.name
    current.propertyCode = mapping.property.code
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.propertyId && !b.propertyId) return 1
    if (!a.propertyId && b.propertyId) return -1
    return (a.externalListingName || a.externalListingId || "").localeCompare(
      b.externalListingName || b.externalListingId || "",
      "el"
    )
  })
}

async function createPropertyAndMapping(params: {
  organizationId: string
  sourcePlatform: string
  externalListingId: string
  externalListingName?: string | null
  externalPropertyAddress?: string | null
  externalPropertyCity?: string | null
  externalPropertyRegion?: string | null
  externalPropertyPostalCode?: string | null
  externalPropertyCountry?: string | null
}) {
  const propertyCode = await createUniquePropertyCode(
    params.organizationId,
    params.sourcePlatform
  )

  const name =
    normalizeText(params.externalListingName) ||
    normalizeText(params.externalListingId) ||
    `${params.sourcePlatform.toUpperCase()} listing`

  const property = await prisma.property.create({
    data: {
      organizationId: params.organizationId,
      code: propertyCode,
      name,
      address: normalizeText(params.externalPropertyAddress) || "Εισαγωγή από πλατφόρμα",
      city: normalizeText(params.externalPropertyCity) || "-",
      region: normalizeText(params.externalPropertyRegion) || "-",
      postalCode: normalizeText(params.externalPropertyPostalCode) || "-",
      country: normalizeText(params.externalPropertyCountry) || "Ελλάδα",
      type: "apartment",
      status: "active",
      bedrooms: 0,
      bathrooms: 0,
      maxGuests: 0,
      notes: `Αυτόματη δημιουργία από listing πλατφόρμας ${params.sourcePlatform}`,
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  })

  await prisma.bookingPropertyMapping.upsert({
    where: {
      organizationId_sourcePlatform_externalListingId: {
        organizationId: params.organizationId,
        sourcePlatform: params.sourcePlatform,
        externalListingId: params.externalListingId,
      },
    },
    update: {
      propertyId: property.id,
      externalListingName: normalizeText(params.externalListingName),
      status: "ACTIVE",
      notes: "Αυτόματη αντιστοίχιση από τη σελίδα πλατφορμών.",
    },
    create: {
      organizationId: params.organizationId,
      propertyId: property.id,
      sourcePlatform: params.sourcePlatform,
      externalListingId: params.externalListingId,
      externalListingName: normalizeText(params.externalListingName),
      status: "ACTIVE",
      notes: "Αυτόματη αντιστοίχιση από τη σελίδα πλατφορμών.",
    },
  })

  const affectedBookings = await prisma.booking.findMany({
    where: {
      organizationId: params.organizationId,
      sourcePlatform: params.sourcePlatform,
      externalListingId: params.externalListingId,
    },
    select: {
      id: true,
    },
  })

  await prisma.booking.updateMany({
    where: {
      organizationId: params.organizationId,
      sourcePlatform: params.sourcePlatform,
      externalListingId: params.externalListingId,
    },
    data: {
      propertyId: property.id,
      needsMapping: false,
      syncStatus: "READY_FOR_ACTION",
      lastProcessedAt: new Date(),
      lastError: null,
    },
  })

  if (affectedBookings.length > 0) {
    await prisma.bookingSyncEvent.createMany({
      data: affectedBookings.map((booking) => ({
        bookingId: booking.id,
        organizationId: params.organizationId,
        eventType: "MATCH",
        sourcePlatform: params.sourcePlatform,
        resultStatus: "READY_FOR_ACTION",
        message: `Αυτόματη δημιουργία ακινήτου και αντιστοίχιση listing ${params.externalListingId}`,
        payload: {
          propertyId: property.id,
          propertyCode: property.code,
          externalListingId: params.externalListingId,
          externalListingName: params.externalListingName || null,
        },
      })),
    })
  }

  return property
}

export async function GET() {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const organizationId = access.auth.organizationId

    if (!organizationId) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε organizationId." },
        { status: 400 }
      )
    }

    const listings = await buildListingGroups(organizationId, access.auth)

    const stats = {
      totalListings: listings.length,
      mappedListings: listings.filter((item) => Boolean(item.propertyId)).length,
      unmappedListings: listings.filter((item) => !item.propertyId).length,
      totalImportedBookings: listings.reduce((sum, item) => sum + item.bookingsCount, 0),
    }

    return NextResponse.json({
      stats,
      listings,
    })
  } catch (error) {
    console.error("GET /api/bookings/platforms error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης πλατφορμών και listings." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireApiAppAccess()
    if (!access.ok) return access.response

    const organizationId = access.auth.organizationId

    if (!organizationId) {
      return NextResponse.json(
        { error: "Δεν βρέθηκε organizationId." },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || "").trim().toLowerCase()

    if (action === "create_property_from_listing") {
      const sourcePlatform = String(body.sourcePlatform || "").trim().toLowerCase()
      const externalListingId = String(body.externalListingId || "").trim()

      if (!sourcePlatform || !externalListingId) {
        return NextResponse.json(
          { error: "Απαιτούνται sourcePlatform και externalListingId." },
          { status: 400 }
        )
      }

      const property = await createPropertyAndMapping({
        organizationId,
        sourcePlatform,
        externalListingId,
        externalListingName: normalizeText(body.externalListingName),
        externalPropertyAddress: normalizeText(body.externalPropertyAddress),
        externalPropertyCity: normalizeText(body.externalPropertyCity),
        externalPropertyRegion: normalizeText(body.externalPropertyRegion),
        externalPropertyPostalCode: normalizeText(body.externalPropertyPostalCode),
        externalPropertyCountry: normalizeText(body.externalPropertyCountry),
      })

      return NextResponse.json({
        success: true,
        property,
      })
    }

    if (action === "auto_create_missing_properties") {
      const listings = await buildListingGroups(organizationId, access.auth)
      const created = [] as Array<{ id: string; code: string; name: string }>

      for (const listing of listings) {
        if (listing.propertyId) continue
        if (!listing.externalListingId) continue

        const property = await createPropertyAndMapping({
          organizationId,
          sourcePlatform: listing.sourcePlatform,
          externalListingId: listing.externalListingId,
          externalListingName: listing.externalListingName,
          externalPropertyAddress: listing.externalPropertyAddress,
          externalPropertyCity: listing.externalPropertyCity,
          externalPropertyRegion: listing.externalPropertyRegion,
          externalPropertyPostalCode: listing.externalPropertyPostalCode,
          externalPropertyCountry: listing.externalPropertyCountry,
        })

        created.push(property)
      }

      return NextResponse.json({
        success: true,
        createdCount: created.length,
        created,
      })
    }

    return NextResponse.json(
      { error: "Μη έγκυρη ενέργεια." },
      { status: 400 }
    )
  } catch (error) {
    console.error("POST /api/bookings/platforms error:", error)

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία ενημέρωσης πλατφορμών και imported listings."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
