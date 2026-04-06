#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const TEST_MARKER = "[PLATFORM_BOOKING_TEST]"
const DEFAULT_PLATFORM = "airbnb"

function parseArgs(argv) {
  const args = {
    reset: false,
    organizationId: null,
    platform: DEFAULT_PLATFORM,
    limit: null,
  }

  for (const raw of argv.slice(2)) {
    if (raw === "--reset") {
      args.reset = true
      continue
    }

    if (raw.startsWith("--orgId=")) {
      args.organizationId = raw.split("=")[1]?.trim() || null
      continue
    }

    if (raw.startsWith("--organizationId=")) {
      args.organizationId = raw.split("=")[1]?.trim() || null
      continue
    }

    if (raw.startsWith("--platform=")) {
      args.platform = raw.split("=")[1]?.trim() || DEFAULT_PLATFORM
      continue
    }

    if (raw.startsWith("--limit=")) {
      const value = Number(raw.split("=")[1]?.trim() || "")
      args.limit = Number.isFinite(value) && value > 0 ? value : null
      continue
    }
  }

  return args
}

function addDays(baseDate, days) {
  const next = new Date(baseDate)
  next.setDate(next.getDate() + days)
  return next
}

function atTime(date, hours, minutes = 0) {
  const next = new Date(date)
  next.setHours(hours, minutes, 0, 0)
  return next
}

function isoDay(value) {
  return new Date(value).toISOString().slice(0, 10)
}

function buildPropertyBookings(property, platform, indexOffset = 0) {
  const now = new Date()

  const firstCheckInBase = addDays(now, 1 + indexOffset)
  const firstCheckOutBase = addDays(now, 3 + indexOffset)

  const secondCheckInBase = addDays(now, 6 + indexOffset)
  const secondCheckOutBase = addDays(now, 7 + indexOffset)

  const thirdCheckInBase = addDays(now, 11 + indexOffset)
  const thirdCheckOutBase = addDays(now, 14 + indexOffset)

  const listingId = `platform-listing-${property.code.toLowerCase()}`
  const listingName = `${property.name} Demo Listing`

  return [
    {
      externalBookingId: `test-${property.code}-001-${isoDay(firstCheckInBase)}`,
      externalListingId: listingId,
      externalListingName: listingName,
      guestName: `${property.code} Guest A`,
      guestPhone: "+306900000101",
      guestEmail: `${property.code.toLowerCase()}-guest-a@example.com`,
      checkInDate: atTime(firstCheckInBase, 15, 0),
      checkOutDate: atTime(firstCheckOutBase, 11, 0),
      checkInTime: "15:00",
      checkOutTime: "11:00",
      adults: 2,
      children: 0,
      infants: 0,
      status: "confirmed",
      sourcePlatform: platform,
      notes: `${TEST_MARKER} Κράτηση 1 για ${property.code}. Κοντινό check-in.`,
    },
    {
      externalBookingId: `test-${property.code}-002-${isoDay(secondCheckInBase)}`,
      externalListingId: listingId,
      externalListingName: listingName,
      guestName: `${property.code} Guest B`,
      guestPhone: "+306900000102",
      guestEmail: `${property.code.toLowerCase()}-guest-b@example.com`,
      checkInDate: atTime(secondCheckInBase, 16, 0),
      checkOutDate: atTime(secondCheckOutBase, 10, 30),
      checkInTime: "16:00",
      checkOutTime: "10:30",
      adults: 1,
      children: 1,
      infants: 0,
      status: "confirmed",
      sourcePlatform: platform,
      notes: `${TEST_MARKER} Κράτηση 2 για ${property.code}. Μικρό turnover test.`,
    },
    {
      externalBookingId: `test-${property.code}-003-${isoDay(thirdCheckInBase)}`,
      externalListingId: listingId,
      externalListingName: listingName,
      guestName: `${property.code} Guest C`,
      guestPhone: "+306900000103",
      guestEmail: `${property.code.toLowerCase()}-guest-c@example.com`,
      checkInDate: atTime(thirdCheckInBase, 15, 30),
      checkOutDate: atTime(thirdCheckOutBase, 11, 0),
      checkInTime: "15:30",
      checkOutTime: "11:00",
      adults: 3,
      children: 0,
      infants: 0,
      status: "confirmed",
      sourcePlatform: platform,
      notes: `${TEST_MARKER} Κράτηση 3 για ${property.code}. Μεσαία διάρκεια για εβδομάδα/μήνα.`,
    },
  ]
}

async function ensureOrganizationExists(organizationId) {
  if (!organizationId) {
    throw new Error("Λείπει το --orgId=ORGANIZATION_ID.")
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  })

  if (!organization) {
    throw new Error(`Δεν βρέθηκε organization με id "${organizationId}".`)
  }

  return organization
}

async function getOrganizationProperties(organizationId, limit = null) {
  const properties = await prisma.property.findMany({
    where: {
      organizationId,
    },
    orderBy: [
      { code: "asc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      organizationId: true,
      code: true,
      name: true,
      address: true,
      city: true,
      region: true,
      postalCode: true,
      country: true,
    },
  })

  if (!properties.length) {
    throw new Error("Δεν βρέθηκαν ακίνητα σε αυτόν τον οργανισμό.")
  }

  if (limit && limit > 0) {
    return properties.slice(0, limit)
  }

  return properties
}

async function deletePreviousTestBookings(organizationId) {
  const result = await prisma.booking.deleteMany({
    where: {
      organizationId,
      OR: [
        {
          notes: {
            contains: TEST_MARKER,
          },
        },
        {
          externalBookingId: {
            startsWith: "test-",
          },
        },
      ],
    },
  })

  return result.count
}

function buildBookingCreateData(property, bookingItem, platformOverride) {
  return {
    organizationId: property.organizationId,
    propertyId: property.id,
    sourcePlatform: platformOverride || bookingItem.sourcePlatform,
    externalBookingId: bookingItem.externalBookingId,
    externalListingId: bookingItem.externalListingId,
    externalListingName: bookingItem.externalListingName,
    externalPropertyAddress: property.address || null,
    externalPropertyCity: property.city || null,
    externalPropertyRegion: property.region || null,
    externalPropertyPostalCode: property.postalCode || null,
    externalPropertyCountry: property.country || null,
    guestName: bookingItem.guestName,
    guestPhone: bookingItem.guestPhone,
    guestEmail: bookingItem.guestEmail,
    checkInDate: bookingItem.checkInDate,
    checkOutDate: bookingItem.checkOutDate,
    checkInTime: bookingItem.checkInTime,
    checkOutTime: bookingItem.checkOutTime,
    adults: bookingItem.adults,
    children: bookingItem.children,
    infants: bookingItem.infants,
    status: bookingItem.status,
    syncStatus: "READY_FOR_ACTION",
    needsMapping: false,
    isManual: false,
    sourceUpdatedAt: new Date(),
    rawPayload: {
      test: true,
      marker: TEST_MARKER,
      generatedAt: new Date().toISOString(),
      sourcePlatform: platformOverride || bookingItem.sourcePlatform,
      externalBookingId: bookingItem.externalBookingId,
      externalListingId: bookingItem.externalListingId,
      propertyCode: property.code,
      propertyName: property.name,
    },
    lastProcessedAt: new Date(),
    lastError: null,
    notes: bookingItem.notes,
    importedAt: new Date(),
  }
}

async function seedBookingsForProperties(properties, platformArg) {
  const created = []

  for (let i = 0; i < properties.length; i += 1) {
    const property = properties[i]
    const propertyBookings = buildPropertyBookings(property, platformArg, i)

    for (const bookingItem of propertyBookings) {
      const data = buildBookingCreateData(property, bookingItem, platformArg)
      const row = await prisma.booking.create({ data })
      created.push({
        booking: row,
        property,
      })
    }
  }

  return created
}

async function main() {
  const args = parseArgs(process.argv)
  const organization = await ensureOrganizationExists(args.organizationId)
  const properties = await getOrganizationProperties(
    organization.id,
    args.limit
  )

  console.log("")
  console.log("========== PLATFORM BOOKING TEST ==========")
  console.log(`Organization: ${organization.name} (${organization.slug})`)
  console.log(`OrganizationId: ${organization.id}`)
  console.log(`Platform: ${args.platform}`)
  console.log(`Ακίνητα που θα χρησιμοποιηθούν: ${properties.length}`)
  console.log("Ροή test: πραγματικές κρατήσεις δεμένες σε κάθε ακίνητο")
  console.log("")

  if (args.reset) {
    const deletedCount = await deletePreviousTestBookings(organization.id)
    console.log(`Διαγράφηκαν ${deletedCount} παλιές test κρατήσεις.`)
  }

  const created = await seedBookingsForProperties(properties, args.platform)

  console.log(`Δημιουργήθηκαν ${created.length} νέες test κρατήσεις.`)
  console.log("")

  const grouped = new Map()

  for (const row of created) {
    const key = row.property.code
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key).push(row)
  }

  console.log("Κρατήσεις ανά ακίνητο:")
  for (const property of properties) {
    const rows = grouped.get(property.code) || []
    console.log("")
    console.log(`- ${property.code} | ${property.name} | ${rows.length} κρατήσεις`)
    for (const row of rows) {
      console.log(
        `  • ${row.booking.guestName || "Guest"} | ${new Date(row.booking.checkInDate).toISOString()} -> ${new Date(row.booking.checkOutDate).toISOString()} | ${row.booking.externalBookingId}`
      )
    }
  }

  console.log("")
  console.log("Ολοκληρώθηκε επιτυχώς.")
  console.log("")
  console.log("Τώρα μπορείς να ελέγξεις:")
  console.log("1. Σελίδα ακινήτου")
  console.log("2. Ημερολόγιο ακινήτου")
  console.log("3. Ενότητα κρατήσεων")
  console.log("4. Readiness εικόνα κοντά στα check-in/check-out")
  console.log("")
}

main()
  .catch(async (error) => {
    console.error("")
    console.error("Σφάλμα seed-platform-booking-test:")
    console.error(error)
    console.error("")
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })