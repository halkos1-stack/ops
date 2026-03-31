require("dotenv/config")

const BASE_URL =
  process.env.APP_BASE_URL?.trim() || "http://localhost:3000"

const IMPORT_URL = `${BASE_URL}/api/bookings/import`

/**
 * ΒΑΛΕ ΕΔΩ ΤΟ organizationId ΣΟΥ
 */
const ORG_ID = "cmmtgqzt30003chk20nt7mqyk"

const DEV_HEADERS = {
  "Content-Type": "application/json",
  "x-system-role": "USER",
  "x-organization-id": ORG_ID,
  "x-dev-email": "dev@local.test",
  "x-dev-name": "Local Dev Admin",
}

async function importBooking(payload) {
  console.log("")
  console.log(
    `IMPORT -> ${payload.sourcePlatform} -> ${payload.externalBookingId}`
  )

  const response = await fetch(IMPORT_URL, {
    method: "POST",
    headers: DEV_HEADERS,
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.error ||
        `Αποτυχία import για ${payload.externalBookingId} (${response.status})`
    )
  }

  console.log(JSON.stringify(data, null, 2))
}

async function main() {
  if (!ORG_ID || !String(ORG_ID).trim()) {
    throw new Error("Λείπει το ORG_ID από το script.")
  }

  console.log("")
  console.log("Ξεκινά import test κρατήσεων από πλατφόρμες...")
  console.log(`API: ${IMPORT_URL}`)
  console.log(`ORG_ID: ${ORG_ID}`)

  const bookings = [
    // =========================================
    // LISTING A -> για αντιστοίχιση με υπάρχον ακίνητο
    // =========================================
    {
      sourcePlatform: "AIRBNB",
      externalBookingId: "ABNB-TEST-A-001",
      externalListingId: "AIRBNB_TEST_LISTING_A",
      externalListingName: "Airbnb Test Listing A",
      externalPropertyAddress: "Λεωφόρος Ποσειδώνος 12",
      externalPropertyCity: "Αθήνα",
      externalPropertyRegion: "Αττική",
      externalPropertyPostalCode: "17455",
      externalPropertyCountry: "Ελλάδα",
      guestName: "Maria Papadopoulou",
      guestPhone: "+306912345001",
      guestEmail: "maria.test.a1@example.com",
      checkInDate: "2026-03-24",
      checkOutDate: "2026-03-27",
      checkInTime: "15:00",
      checkOutTime: "11:00",
      status: "confirmed",
      rawPayload: {
        source: "platform-test",
        listing: "A",
        reservationCode: "ABNB-TEST-A-001",
        propertyAddress: "Λεωφόρος Ποσειδώνος 12",
        propertyCity: "Αθήνα",
      },
    },
    {
      sourcePlatform: "AIRBNB",
      externalBookingId: "ABNB-TEST-A-002",
      externalListingId: "AIRBNB_TEST_LISTING_A",
      externalListingName: "Airbnb Test Listing A",
      externalPropertyAddress: "Λεωφόρος Ποσειδώνος 12",
      externalPropertyCity: "Αθήνα",
      externalPropertyRegion: "Αττική",
      externalPropertyPostalCode: "17455",
      externalPropertyCountry: "Ελλάδα",
      guestName: "John Miller",
      guestPhone: "+447700900111",
      guestEmail: "john.test.a2@example.com",
      checkInDate: "2026-03-29",
      checkOutDate: "2026-04-01",
      checkInTime: "15:00",
      checkOutTime: "11:00",
      status: "confirmed",
      rawPayload: {
        source: "platform-test",
        listing: "A",
        reservationCode: "ABNB-TEST-A-002",
        propertyAddress: "Λεωφόρος Ποσειδώνος 12",
        propertyCity: "Αθήνα",
      },
    },
    {
      sourcePlatform: "AIRBNB",
      externalBookingId: "ABNB-TEST-A-003",
      externalListingId: "AIRBNB_TEST_LISTING_A",
      externalListingName: "Airbnb Test Listing A",
      externalPropertyAddress: "Λεωφόρος Ποσειδώνος 12",
      externalPropertyCity: "Αθήνα",
      externalPropertyRegion: "Αττική",
      externalPropertyPostalCode: "17455",
      externalPropertyCountry: "Ελλάδα",
      guestName: "Eleni Georgiou",
      guestPhone: "+306912345003",
      guestEmail: "eleni.test.a3@example.com",
      checkInDate: "2026-04-03",
      checkOutDate: "2026-04-06",
      checkInTime: "16:00",
      checkOutTime: "11:00",
      status: "confirmed",
      rawPayload: {
        source: "platform-test",
        listing: "A",
        reservationCode: "ABNB-TEST-A-003",
        propertyAddress: "Λεωφόρος Ποσειδώνος 12",
        propertyCity: "Αθήνα",
      },
    },

    // =========================================
    // LISTING B -> για δημιουργία νέου ακινήτου
    // =========================================
    {
      sourcePlatform: "BOOKING_COM",
      externalBookingId: "BCOM-TEST-B-001",
      externalListingId: "BOOKING_TEST_LISTING_B",
      externalListingName: "Booking Test Listing B",
      externalPropertyAddress: "Οδός Νίκης 44",
      externalPropertyCity: "Θεσσαλονίκη",
      externalPropertyRegion: "Κεντρική Μακεδονία",
      externalPropertyPostalCode: "54624",
      externalPropertyCountry: "Ελλάδα",
      guestName: "Anna Rossi",
      guestPhone: "+393401112233",
      guestEmail: "anna.test.b1@example.com",
      checkInDate: "2026-03-25",
      checkOutDate: "2026-03-28",
      checkInTime: "14:00",
      checkOutTime: "10:30",
      status: "confirmed",
      rawPayload: {
        source: "platform-test",
        listing: "B",
        reservationCode: "BCOM-TEST-B-001",
        propertyAddress: "Οδός Νίκης 44",
        propertyCity: "Θεσσαλονίκη",
      },
    },
    {
      sourcePlatform: "BOOKING_COM",
      externalBookingId: "BCOM-TEST-B-002",
      externalListingId: "BOOKING_TEST_LISTING_B",
      externalListingName: "Booking Test Listing B",
      externalPropertyAddress: "Οδός Νίκης 44",
      externalPropertyCity: "Θεσσαλονίκη",
      externalPropertyRegion: "Κεντρική Μακεδονία",
      externalPropertyPostalCode: "54624",
      externalPropertyCountry: "Ελλάδα",
      guestName: "Nikos Stavrou",
      guestPhone: "+306912345004",
      guestEmail: "nikos.test.b2@example.com",
      checkInDate: "2026-03-28",
      checkOutDate: "2026-03-31",
      checkInTime: "18:00",
      checkOutTime: "11:00",
      status: "confirmed",
      rawPayload: {
        source: "platform-test",
        listing: "B",
        reservationCode: "BCOM-TEST-B-002",
        propertyAddress: "Οδός Νίκης 44",
        propertyCity: "Θεσσαλονίκη",
      },
    },
    {
      sourcePlatform: "BOOKING_COM",
      externalBookingId: "BCOM-TEST-B-003",
      externalListingId: "BOOKING_TEST_LISTING_B",
      externalListingName: "Booking Test Listing B",
      externalPropertyAddress: "Οδός Νίκης 44",
      externalPropertyCity: "Θεσσαλονίκη",
      externalPropertyRegion: "Κεντρική Μακεδονία",
      externalPropertyPostalCode: "54624",
      externalPropertyCountry: "Ελλάδα",
      guestName: "Claire Dubois",
      guestPhone: "+33612345678",
      guestEmail: "claire.test.b3@example.com",
      checkInDate: "2026-04-02",
      checkOutDate: "2026-04-05",
      checkInTime: "15:00",
      checkOutTime: "10:00",
      status: "confirmed",
      rawPayload: {
        source: "platform-test",
        listing: "B",
        reservationCode: "BCOM-TEST-B-003",
        propertyAddress: "Οδός Νίκης 44",
        propertyCity: "Θεσσαλονίκη",
      },
    },
  ]

  for (const booking of bookings) {
    await importBooking(booking)
  }

  console.log("")
  console.log("ΟΛΟΚΛΗΡΩΘΗΚΕ ΤΟ IMPORT TEST BOOKINGS")
  console.log("")
  console.log("Listing A:")
  console.log("sourcePlatform = AIRBNB")
  console.log("externalListingId = AIRBNB_TEST_LISTING_A")
  console.log("Διεύθυνση = Λεωφόρος Ποσειδώνος 12, Αθήνα")
  console.log("")
  console.log("Listing B:")
  console.log("sourcePlatform = BOOKING_COM")
  console.log("externalListingId = BOOKING_TEST_LISTING_B")
  console.log("Διεύθυνση = Οδός Νίκης 44, Θεσσαλονίκη")
  console.log("")
  console.log("Αναμενόμενη ροή μετά:")
  console.log("1. Στη σελίδα Κρατήσεις θα εμφανιστούν ως needsMapping.")
  console.log("2. Για το Listing A κάνεις αντιστοίχιση με υπάρχον ακίνητο.")
  console.log("3. Για το Listing B κάνεις δημιουργία νέου ακινήτου.")
  console.log("4. Μετά θα γίνει reprocess και θα επιτραπεί δημιουργία εργασίας.")
  console.log("")
  console.log("Αναμενόμενα παράθυρα μετά το mapping:")
  console.log("Listing A:")
  console.log("27/03/2026 11:00 -> 29/03/2026 15:00")
  console.log("01/04/2026 11:00 -> 03/04/2026 16:00")
  console.log("")
  console.log("Listing B:")
  console.log("28/03/2026 10:30 -> 28/03/2026 18:00")
  console.log("31/03/2026 11:00 -> 02/04/2026 15:00")
}

main().catch((error) => {
  console.error("")
  console.error("Σφάλμα στο import test:")
  console.error(error)
  process.exit(1)
})