"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type ListingRow = {
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
  latestImportAt: string | null
  propertyId: string | null
  propertyName: string | null
  propertyCode: string | null
  syncStatusSet: string[]
}

type PagePayload = {
  stats: {
    totalListings: number
    mappedListings: number
    unmappedListings: number
    totalImportedBookings: number
  }
  listings: ListingRow[]
}

function normalizePlatformLabel(value: string, language: "el" | "en") {
  const normalized = String(value || "").trim().toLowerCase()

  if (normalized === "booking") return "Booking.com"
  if (normalized === "airbnb") return "Airbnb"
  if (normalized === "vrbo") return "Vrbo"
  if (normalized === "direct") return language === "en" ? "Direct" : "╬Η╬╝╬╡╧Δ╬╖"
  return value || "-"
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "έΑΦ"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "έΑΦ"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      locale: "en-GB",
      title: "Platform connections & imported listings",
      subtitle:
        "This page stays inside the bookings flow. It shows imported platform listings, automatic property creation and listing-to-property linking without mixing task execution here.",
      backToBookings: "Back to bookings",
      autoCreate: "Auto-create missing properties",
      autoCreateHelp:
        "Automatically create normal OPS properties for every imported listing that still has no mapped property. Property editing continues only inside the property page.",
      loading: "Loading platform listings...",
      loadError: "Failed to load platform listings.",
      actionError: "Failed to execute action.",
      actionSuccessAuto: "Missing properties were created successfully.",
      actionSuccessSingle: "Property was created and linked successfully.",
      searchPlaceholder: "Search by platform, listing or property...",
      searchHelp:
        "Search imported listings by platform, external listing id, external listing name or linked property.",
      allPlatforms: "All platforms",
      importedListings: "Imported listings",
      importedListingsHelp:
        "Each row is a platform listing identity coming from imported bookings. It is not a task and it should link to one OPS property.",
      mapped: "Mapped",
      unmapped: "Unmapped",
      totalBookings: "Imported bookings",
      empty: "No imported platform listings found.",
      linkedProperty: "Linked property",
      createProperty: "Create property",
      createPropertyHelp:
        "Create a normal OPS property from this imported listing and immediately map future and existing bookings to it.",
      openProperty: "Open property",
      openBookingPage: "Open bookings",
      propertyAutoText:
        "Auto-created properties become normal system properties and can be edited later only from the property page.",
      listingIdentity: "Listing identity",
      listingIdentityHelp:
        "The external identity comes from the booking platform and is used for stable mapping to one property.",
      latestImport: "Latest import",
      syncStatus: "Sync states",
      bookingCount: "Bookings",
      activeBookingCount: "Active bookings",
      noListingId: "No external listing id",
      mappingNeeded: "Needs property mapping",
      alreadyMapped: "Already linked",
      importedAddress: "Imported address",
      importedAddressHelp:
        "Imported address is informational and can help the user confirm whether the listing is the correct property before creation.",
    }
  }

  return {
    locale: "el-GR",
    title: "╬μ╧Ζ╬╜╬┤╬φ╧Δ╬╡╬╣╧Γ ╧Α╬╗╬▒╧Ε╧Η╬┐╧Β╬╝╧Ο╬╜ ╬║╬▒╬╣ ╬╡╬╣╧Δ╬▒╬│╧Ν╬╝╬╡╬╜╬▒ listings",
    subtitle:
      "╬Ω ╧Δ╬╡╬╗╬ψ╬┤╬▒ ╬╝╬φ╬╜╬╡╬╣ ╬▒╧Α╬┐╬║╬╗╬╡╬╣╧Δ╧Ε╬╣╬║╬υ ╧Δ╧Ε╬╖ ╧Β╬┐╬χ ╬║╧Β╬▒╧Ε╬χ╧Δ╬╡╧Κ╬╜. ╬Φ╬╡╬ψ╧Θ╬╜╬╡╬╣ ╧Ε╬▒ ╬╡╬╣╧Δ╬▒╬│╧Ν╬╝╬╡╬╜╬▒ listings ╬▒╧Α╧Ν ╧Α╬╗╬▒╧Ε╧Η╧Ν╧Β╬╝╬╡╧Γ, ╧Ε╬╖╬╜ ╬▒╧Ζ╧Ε╧Ν╬╝╬▒╧Ε╬╖ ╬┤╬╖╬╝╬╣╬┐╧Ζ╧Β╬│╬ψ╬▒ ╬▒╬║╬╣╬╜╬χ╧Ε╧Κ╬╜ ╬║╬▒╬╣ ╧Ε╬╖╬╜ ╬▒╬╜╧Ε╬╣╧Δ╧Ε╬┐╬ψ╧Θ╬╣╧Δ╬╖ listing έΗΤ ╬▒╬║╬ψ╬╜╬╖╧Ε╬┐ ╧Θ╧Κ╧Β╬ψ╧Γ ╬╜╬▒ ╬╝╧Α╬╗╬φ╬║╬╡╬╣ ╬╡╬┤╧Ο ╬╖ ╬╡╬║╧Ε╬φ╬╗╬╡╧Δ╬╖ ╬╡╧Β╬│╬▒╧Δ╬╣╧Ο╬╜.",
    backToBookings: "╬Χ╧Α╬╣╧Δ╧Ε╧Β╬┐╧Η╬χ ╧Δ╧Ε╬╣╧Γ ╬║╧Β╬▒╧Ε╬χ╧Δ╬╡╬╣╧Γ",
    autoCreate: "╬Σ╧Ζ╧Ε╧Ν╬╝╬▒╧Ε╬╖ ╬┤╬╖╬╝╬╣╬┐╧Ζ╧Β╬│╬ψ╬▒ ╬▒╬║╬╣╬╜╬χ╧Ε╧Κ╬╜ ╧Α╬┐╧Ζ ╬╗╬╡╬ψ╧Α╬┐╧Ζ╬╜",
    autoCreateHelp:
      "╬Φ╬╖╬╝╬╣╬┐╧Ζ╧Β╬│╬╡╬ψ ╬▒╧Ζ╧Ε╧Ν╬╝╬▒╧Ε╬▒ ╬║╬▒╬╜╬┐╬╜╬╣╬║╬υ ╬▒╬║╬ψ╬╜╬╖╧Ε╬▒ OPS ╬│╬╣╬▒ ╬║╬υ╬╕╬╡ ╬╡╬╣╧Δ╬▒╬│╧Ν╬╝╬╡╬╜╬┐ listing ╧Α╬┐╧Ζ ╬┤╬╡╬╜ ╬φ╧Θ╬╡╬╣ ╬▒╬║╧Ν╬╝╬╖ ╬▒╬╜╧Ε╬╣╧Δ╧Ε╬┐╬ψ╧Θ╬╣╧Δ╬╖. ╬Ω ╬╡╧Α╬╡╬╛╬╡╧Β╬│╬▒╧Δ╬ψ╬▒ ╬▒╬║╬╣╬╜╬χ╧Ε╬┐╧Ζ ╧Δ╧Ζ╬╜╬╡╧Θ╬ψ╬╢╬╡╬╣ ╬╝╧Ν╬╜╬┐ ╬╝╬φ╧Δ╬▒ ╬▒╧Α╧Ν ╧Ε╬╖ ╧Δ╬╡╬╗╬ψ╬┤╬▒ ╬▒╬║╬╣╬╜╬χ╧Ε╬┐╧Ζ.",
    loading: "╬ο╧Ν╧Β╧Ε╧Κ╧Δ╬╖ imported listings ╧Α╬╗╬▒╧Ε╧Η╬┐╧Β╬╝╧Ο╬╜...",
    loadError: "╬Σ╧Α╬┐╧Ε╧Ζ╧Θ╬ψ╬▒ ╧Η╧Ν╧Β╧Ε╧Κ╧Δ╬╖╧Γ ╧Α╬╗╬▒╧Ε╧Η╬┐╧Β╬╝╧Ο╬╜ ╬║╬▒╬╣ imported listings.",
    actionError: "╬Σ╧Α╬┐╧Ε╧Ζ╧Θ╬ψ╬▒ ╬╡╬║╧Ε╬φ╬╗╬╡╧Δ╬╖╧Γ ╬╡╬╜╬φ╧Β╬│╬╡╬╣╬▒╧Γ.",
    actionSuccessAuto: "╬Ω ╬▒╧Ζ╧Ε╧Ν╬╝╬▒╧Ε╬╖ ╬┤╬╖╬╝╬╣╬┐╧Ζ╧Β╬│╬ψ╬▒ ╬▒╬║╬╣╬╜╬χ╧Ε╧Κ╬╜ ╬┐╬╗╬┐╬║╬╗╬╖╧Β╧Ο╬╕╬╖╬║╬╡ ╬╡╧Α╬╣╧Ε╧Ζ╧Θ╧Ο╧Γ.",
    actionSuccessSingle: "╬ν╬┐ ╬▒╬║╬ψ╬╜╬╖╧Ε╬┐ ╬┤╬╖╬╝╬╣╬┐╧Ζ╧Β╬│╬χ╬╕╬╖╬║╬╡ ╬║╬▒╬╣ ╧Δ╧Ζ╬╜╬┤╬φ╬╕╬╖╬║╬╡ ╬╡╧Α╬╣╧Ε╧Ζ╧Θ╧Ο╧Γ.",
    searchPlaceholder: "╬Σ╬╜╬▒╬╢╬χ╧Ε╬╖╧Δ╬╖ ╬▒╬╜╬υ ╧Α╬╗╬▒╧Ε╧Η╧Ν╧Β╬╝╬▒, listing ╬χ ╬▒╬║╬ψ╬╜╬╖╧Ε╬┐...",
    searchHelp:
      "╬Σ╬╜╬▒╬╢╬χ╧Ε╬╖╧Δ╬╖ ╧Δ╧Ε╬▒ imported listings ╬╝╬╡ ╬▓╬υ╧Δ╬╖ ╧Α╬╗╬▒╧Ε╧Η╧Ν╧Β╬╝╬▒, ╬╡╬╛╧Κ╧Ε╬╡╧Β╬╣╬║╧Ν listing id, ╧Ν╬╜╬┐╬╝╬▒ listing ╬χ ╧Δ╧Ζ╬╜╬┤╬╡╬┤╬╡╬╝╬φ╬╜╬┐ ╬▒╬║╬ψ╬╜╬╖╧Ε╬┐.",
    allPlatforms: "╬Ν╬╗╬╡╧Γ ╬┐╬╣ ╧Α╬╗╬▒╧Ε╧Η╧Ν╧Β╬╝╬╡╧Γ",
    importedListings: "╬Χ╬╣╧Δ╬▒╬│╧Ν╬╝╬╡╬╜╬▒ listings",
    importedListingsHelp:
      "╬γ╬υ╬╕╬╡ ╬│╧Β╬▒╬╝╬╝╬χ ╬╡╬ψ╬╜╬▒╬╣ ╬╝╬ψ╬▒ ╧Ε╬▒╧Ζ╧Ε╧Ν╧Ε╬╖╧Ε╬▒ listing ╧Α╬╗╬▒╧Ε╧Η╧Ν╧Β╬╝╬▒╧Γ ╧Α╬┐╧Ζ ╧Α╧Β╬┐╬║╧Ξ╧Α╧Ε╬╡╬╣ ╬▒╧Α╧Ν ╬╡╬╣╧Δ╬▒╬│╧Ν╬╝╬╡╬╜╬╡╧Γ ╬║╧Β╬▒╧Ε╬χ╧Δ╬╡╬╣╧Γ. ╬Φ╬╡╬╜ ╬╡╬ψ╬╜╬▒╬╣ ╬╡╧Β╬│╬▒╧Δ╬ψ╬▒ ╬║╬▒╬╣ ╧Α╧Β╬φ╧Α╬╡╬╣ ╬╜╬▒ ╧Δ╧Ζ╬╜╬┤╬φ╬╡╧Ε╬▒╬╣ ╬╝╬╡ ╬φ╬╜╬▒ ╬▒╬║╬ψ╬╜╬╖╧Ε╬┐ OPS.",
    mapped: "╬Σ╬╜╧Ε╬╣╧Δ╧Ε╬┐╬╣╧Θ╬╣╧Δ╬╝╬φ╬╜╬▒",
    unmapped: "╬π╧Κ╧Β╬ψ╧Γ ╬▒╬╜╧Ε╬╣╧Δ╧Ε╬┐╬ψ╧Θ╬╣╧Δ╬╖",
    totalBookings: "╬Χ╬╣╧Δ╬▒╬│╧Ν╬╝╬╡╬╜╬╡╧Γ ╬║╧Β╬▒╧Ε╬χ╧Δ╬╡╬╣╧Γ",
    empty: "╬Φ╬╡╬╜ ╬▓╧Β╬φ╬╕╬╖╬║╬▒╬╜ imported listings ╧Α╬╗╬▒╧Ε╧Η╬┐╧Β╬╝╧Ο╬╜.",
    linkedProperty: "╬μ╧Ζ╬╜╬┤╬╡╬┤╬╡╬╝╬φ╬╜╬┐ ╬▒╬║╬ψ╬╜╬╖╧Ε╬┐",
    createProperty: "╬Φ╬╖╬╝╬╣╬┐╧Ζ╧Β╬│╬ψ╬▒ ╬▒╬║╬╣╬╜╬χ╧Ε╬┐╧Ζ",
    createPropertyHelp:
      "╬Φ╬╖╬╝╬╣╬┐╧Ζ╧Β╬│╬╡╬ψ ╬║╬▒╬╜╬┐╬╜╬╣╬║╧Ν ╬▒╬║╬ψ╬╜╬╖╧Ε╬┐ OPS ╬▒╧Α╧Ν ╬▒╧Ζ╧Ε╧Ν ╧Ε╬┐ imported listing ╬║╬▒╬╣ ╧Δ╧Ζ╬╜╬┤╬φ╬╡╬╣ ╬υ╬╝╬╡╧Δ╬▒ ╧Δ╬╡ ╬▒╧Ζ╧Ε╧Ν ╧Ε╬╣╧Γ ╧Ζ╧Α╬υ╧Β╧Θ╬┐╧Ζ╧Δ╬╡╧Γ ╬║╬▒╬╣ ╬╝╬╡╬╗╬╗╬┐╬╜╧Ε╬╣╬║╬φ╧Γ ╬║╧Β╬▒╧Ε╬χ╧Δ╬╡╬╣╧Γ.",
    openProperty: "╬Η╬╜╬┐╬╣╬│╬╝╬▒ ╬▒╬║╬╣╬╜╬χ╧Ε╬┐╧Ζ",
    openBookingPage: "╬Η╬╜╬┐╬╣╬│╬╝╬▒ ╬║╧Β╬▒╧Ε╬χ╧Δ╬╡╧Κ╬╜",
    propertyAutoText:
      "╬ν╬▒ ╬▒╬║╬ψ╬╜╬╖╧Ε╬▒ ╧Α╬┐╧Ζ ╬┤╬╖╬╝╬╣╬┐╧Ζ╧Β╬│╬┐╧Ξ╬╜╧Ε╬▒╬╣ ╬▒╧Ζ╧Ε╧Ν╬╝╬▒╧Ε╬▒ ╬│╬ψ╬╜╬┐╬╜╧Ε╬▒╬╣ ╬║╬▒╬╜╬┐╬╜╬╣╬║╬υ ╬▒╬║╬ψ╬╜╬╖╧Ε╬▒ ╧Ε╬┐╧Ζ ╧Δ╧Ζ╧Δ╧Ε╬χ╬╝╬▒╧Ε╬┐╧Γ ╬║╬▒╬╣ ╬╝╬╡╧Ε╬υ ╬╡╧Α╬╡╬╛╬╡╧Β╬│╬υ╬╢╬┐╬╜╧Ε╬▒╬╣ ╬╝╧Ν╬╜╬┐ ╬▒╧Α╧Ν ╧Ε╬╖ ╧Δ╬╡╬╗╬ψ╬┤╬▒ ╬▒╬║╬╣╬╜╬χ╧Ε╬┐╧Ζ.",
    listingIdentity: "╬ν╬▒╧Ζ╧Ε╧Ν╧Ε╬╖╧Ε╬▒ listing",
    listingIdentityHelp:
      "╬Ω ╬╡╬╛╧Κ╧Ε╬╡╧Β╬╣╬║╬χ ╧Ε╬▒╧Ζ╧Ε╧Ν╧Ε╬╖╧Ε╬▒ ╬φ╧Β╧Θ╬╡╧Ε╬▒╬╣ ╬▒╧Α╧Ν ╧Ε╬╖╬╜ ╧Α╬╗╬▒╧Ε╧Η╧Ν╧Β╬╝╬▒ ╬║╧Β╬▒╧Ε╬χ╧Δ╬╡╧Κ╬╜ ╬║╬▒╬╣ ╧Θ╧Β╬╖╧Δ╬╣╬╝╬┐╧Α╬┐╬╣╬╡╬ψ╧Ε╬▒╬╣ ╬│╬╣╬▒ ╧Δ╧Ε╬▒╬╕╬╡╧Β╬χ ╬▒╬╜╧Ε╬╣╧Δ╧Ε╬┐╬ψ╧Θ╬╣╧Δ╬╖ ╧Δ╬╡ ╬φ╬╜╬▒ ╬▒╬║╬ψ╬╜╬╖╧Ε╬┐.",
    latestImport: "╬ν╬╡╬╗╬╡╧Ζ╧Ε╬▒╬ψ╬▒ ╬╡╬╣╧Δ╬▒╬│╧Κ╬│╬χ",
    syncStatus: "╬γ╬▒╧Ε╬▒╧Δ╧Ε╬υ╧Δ╬╡╬╣╧Γ ╧Δ╧Ζ╬│╧Θ╧Β╬┐╬╜╬╣╧Δ╬╝╬┐╧Ξ",
    bookingCount: "╬γ╧Β╬▒╧Ε╬χ╧Δ╬╡╬╣╧Γ",
    activeBookingCount: "╬Χ╬╜╬╡╧Β╬│╬φ╧Γ ╬║╧Β╬▒╧Ε╬χ╧Δ╬╡╬╣╧Γ",
    noListingId: "╬π╧Κ╧Β╬ψ╧Γ ╬╡╬╛╧Κ╧Ε╬╡╧Β╬╣╬║╧Ν listing id",
    mappingNeeded: "╬π╧Β╬╡╬╣╬υ╬╢╬╡╧Ε╬▒╬╣ ╬▒╬╜╧Ε╬╣╧Δ╧Ε╬┐╬ψ╧Θ╬╣╧Δ╬╖",
    alreadyMapped: "╬Κ╬┤╬╖ ╧Δ╧Ζ╬╜╬┤╬╡╬┤╬╡╬╝╬φ╬╜╬┐",
    importedAddress: "╬Χ╬╣╧Δ╬▒╬│╧Ν╬╝╬╡╬╜╬╖ ╬┤╬╣╬╡╧Ξ╬╕╧Ζ╬╜╧Δ╬╖",
    importedAddressHelp:
      "╬Ω ╬╡╬╣╧Δ╬▒╬│╧Ν╬╝╬╡╬╜╬╖ ╬┤╬╣╬╡╧Ξ╬╕╧Ζ╬╜╧Δ╬╖ ╬╡╬ψ╬╜╬▒╬╣ ╬▓╬┐╬╖╬╕╬╖╧Ε╬╣╬║╬χ ╧Α╬╗╬╖╧Β╬┐╧Η╬┐╧Β╬ψ╬▒ ╧Ο╧Δ╧Ε╬╡ ╬┐ ╧Θ╧Β╬χ╧Δ╧Ε╬╖╧Γ ╬╜╬▒ ╬╡╧Α╬╣╬▓╬╡╬▓╬▒╬╣╧Ο╬╜╬╡╬╣ ╧Ν╧Ε╬╣ ╧Ε╬┐ listing ╬▒╬╜╧Ε╬╣╧Δ╧Ε╬┐╬╣╧Θ╬╡╬ψ ╧Δ╧Ε╬┐ ╧Δ╧Κ╧Δ╧Ε╧Ν ╬▒╬║╬ψ╬╜╬╖╧Ε╬┐ ╧Α╧Β╬╣╬╜ ╧Ε╬╖ ╬┤╬╖╬╝╬╣╬┐╧Ζ╧Β╬│╬ψ╬▒.",
  }
}

export default function BookingPlatformsPage() {
  const { language } = useAppLanguage()
  const texts = getTexts(language)

  const [data, setData] = useState<PagePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [platform, setPlatform] = useState("all")
  const [submittingKey, setSubmittingKey] = useState<string | null>(null)

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch("/api/bookings/platforms", {
        cache: "no-store",
      })
      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload?.error || texts.loadError)
      }

      setData(payload)
    } catch (err) {
      console.error("Load booking platforms error:", err)
      setError(err instanceof Error ? err.message : texts.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [language])

  const listings = data?.listings || []

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase()

    return listings.filter((item) => {
      if (platform !== "all" && item.sourcePlatform !== platform) return false

      if (!q) return true

      const haystack = [
        item.sourcePlatform,
        item.externalListingId,
        item.externalListingName,
        item.propertyCode,
        item.propertyName,
        item.externalPropertyAddress,
        item.externalPropertyCity,
        item.externalPropertyRegion,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [listings, platform, search])

  const platforms = useMemo(() => {
    return Array.from(new Set(listings.map((item) => item.sourcePlatform))).sort((a, b) =>
      a.localeCompare(b, "el")
    )
  }, [listings])

  async function createProperty(item: ListingRow) {
    if (!item.externalListingId) return

    try {
      setSubmittingKey(`${item.sourcePlatform}::${item.externalListingId}`)
      setError(null)
      setSuccess(null)

      const res = await fetch("/api/bookings/platforms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create_property_from_listing",
          sourcePlatform: item.sourcePlatform,
          externalListingId: item.externalListingId,
          externalListingName: item.externalListingName,
          externalPropertyAddress: item.externalPropertyAddress,
          externalPropertyCity: item.externalPropertyCity,
          externalPropertyRegion: item.externalPropertyRegion,
          externalPropertyPostalCode: item.externalPropertyPostalCode,
          externalPropertyCountry: item.externalPropertyCountry,
        }),
      })

      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload?.error || texts.actionError)
      }

      setSuccess(texts.actionSuccessSingle)
      await loadData()
    } catch (err) {
      console.error("Create property from listing error:", err)
      setError(err instanceof Error ? err.message : texts.actionError)
    } finally {
      setSubmittingKey(null)
    }
  }

  async function autoCreateMissingProperties() {
    try {
      setSubmittingKey("AUTO")
      setError(null)
      setSuccess(null)

      const res = await fetch("/api/bookings/platforms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "auto_create_missing_properties",
        }),
      })

      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload?.error || texts.actionError)
      }

      setSuccess(texts.actionSuccessAuto)
      await loadData()
    } catch (err) {
      console.error("Auto create missing properties error:", err)
      setError(err instanceof Error ? err.message : texts.actionError)
    } finally {
      setSubmittingKey(null)
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">OPS ┬╖ Bookings</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {texts.title}
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{texts.subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/bookings"
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            {texts.backToBookings}
          </Link>

          <button
            type="button"
            onClick={autoCreateMissingProperties}
            title={texts.autoCreateHelp}
            disabled={submittingKey === "AUTO"}
            className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submittingKey === "AUTO" ? "..." : texts.autoCreate}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">{texts.importedListings}</div>
          <div className="mt-3 text-3xl font-bold text-slate-950">{data?.stats.totalListings || 0}</div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="text-sm text-emerald-700">{texts.mapped}</div>
          <div className="mt-3 text-3xl font-bold text-emerald-900">{data?.stats.mappedListings || 0}</div>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="text-sm text-amber-700">{texts.unmapped}</div>
          <div className="mt-3 text-3xl font-bold text-amber-900">{data?.stats.unmappedListings || 0}</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">{texts.totalBookings}</div>
          <div className="mt-3 text-3xl font-bold text-slate-950">
            {data?.stats.totalImportedBookings || 0}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr),220px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.importedListings}
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={texts.searchPlaceholder}
              title={texts.searchHelp}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="all">{texts.allPlatforms}</option>
              {platforms.map((item) => (
                <option key={item} value={item}>
                  {normalizePlatformLabel(item, language)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-500">{texts.propertyAutoText}</p>
      </section>

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section
        className="rounded-3xl border border-slate-200 bg-white shadow-sm"
        title={texts.importedListingsHelp}
      >
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-950">{texts.importedListings}</h2>
          <p className="mt-1 text-sm text-slate-500">{texts.importedListingsHelp}</p>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">{texts.loading}</div>
        ) : filteredListings.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{texts.empty}</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredListings.map((item) => {
              const canCreate = !item.propertyId && Boolean(item.externalListingId)
              const rowKey = `${item.sourcePlatform}::${item.externalListingId || item.externalListingName || "row"}`

              return (
                <article key={rowKey} className="p-5">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {normalizePlatformLabel(item.sourcePlatform, language)}
                          </span>

                          <span
                            className={item.propertyId
                              ? "rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                              : "rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"}
                          >
                            {item.propertyId ? texts.alreadyMapped : texts.mappingNeeded}
                          </span>
                        </div>

                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-slate-500" title={texts.listingIdentityHelp}>
                            {texts.listingIdentity}
                          </div>
                          <h3 className="mt-1 text-xl font-semibold text-slate-950">
                            {item.externalListingName || item.externalListingId || texts.noListingId}
                          </h3>
                          <div className="mt-2 text-sm text-slate-500">
                            ID: {item.externalListingId || texts.noListingId}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-slate-500" title={texts.importedAddressHelp}>
                            {texts.importedAddress}
                          </div>
                          <div className="mt-1 text-sm text-slate-700">
                            {[
                              item.externalPropertyAddress,
                              item.externalPropertyCity,
                              item.externalPropertyRegion,
                              item.externalPropertyPostalCode,
                              item.externalPropertyCountry,
                            ]
                              .filter(Boolean)
                              .join(" ┬╖ ") || "έΑΦ"}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs text-slate-500">{texts.bookingCount}</div>
                            <div className="mt-1 text-lg font-semibold text-slate-950">{item.bookingsCount}</div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs text-slate-500">{texts.activeBookingCount}</div>
                            <div className="mt-1 text-lg font-semibold text-slate-950">
                              {item.activeBookingsCount}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs text-slate-500">{texts.latestImport}</div>
                            <div className="mt-1 text-sm font-semibold text-slate-950">
                              {formatDateTime(item.latestImportAt, texts.locale)}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs text-slate-500">{texts.syncStatus}</div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {item.syncStatusSet.length > 0 ? (
                                item.syncStatusSet.map((status) => (
                                  <span
                                    key={status}
                                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                                  >
                                    {status}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-slate-500">έΑΦ</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            {texts.linkedProperty}
                          </div>
                          <div className="mt-1 text-sm text-slate-700">
                            {item.propertyId
                              ? `${item.propertyCode ? `${item.propertyCode} ┬╖ ` : ""}${item.propertyName || "έΑΦ"}`
                              : texts.mappingNeeded}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-3 xl:w-[280px] xl:justify-end">
                        <Link
                          href="/bookings"
                          className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          {texts.openBookingPage}
                        </Link>

                        {item.propertyId ? (
                          <Link
                            href={`/properties/${item.propertyId}`}
                            className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                          >
                            {texts.openProperty}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled={!canCreate || submittingKey === rowKey}
                            onClick={() => createProperty(item)}
                            title={texts.createPropertyHelp}
                            className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {submittingKey === rowKey ? "..." : texts.createProperty}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
