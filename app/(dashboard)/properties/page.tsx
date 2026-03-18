"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type PartnerOption = {
  id: string
  code: string
  name: string
  email: string
  specialty: string
  status: string
}

type PropertyListItem = {
  id: string
  code: string
  name: string
  address: string
  city: string
  region: string
  postalCode: string
  country: string
  type: string
  status: string
  bedrooms: number
  bathrooms: number
  maxGuests: number
  notes?: string | null
  defaultPartnerId?: string | null
  createdAt: string
  updatedAt: string
  defaultPartner?: {
    id: string
    code: string
    name: string
    email: string
    phone?: string | null
    specialty: string
    status: string
  } | null
  bookings?: Array<{
    id: string
    status: string
    checkInDate: string
    checkOutDate: string
    checkInTime?: string | null
  }>
  tasks?: Array<{
    id: string
    status: string
    priority?: string | null
    taskType?: string | null
    scheduledDate?: string | null
    alertEnabled?: boolean
    alertAt?: string | null
    assignments?: Array<{
      id: string
      status: string
      assignedAt?: string | null
      acceptedAt?: string | null
      rejectedAt?: string | null
    }>
    checklistRun?: {
      id: string
      status: string
      startedAt?: string | null
      completedAt?: string | null
    } | null
  }>
  issues?: Array<{
    id: string
    status: string
    severity?: string | null
  }>
}

type CreatePropertyFormState = {
  name: string
  address: string
  city: string
  region: string
  postalCode: string
  country: string
  type: string
  status: string
  bedrooms: string
  bathrooms: string
  maxGuests: string
  defaultPartnerId: string
  notes: string
}

type MetricFilter =
  | "all"
  | "active"
  | "inactive"
  | "ready"
  | "requires_action"
  | "alerts"

const initialCreateForm: CreatePropertyFormState = {
  name: "",
  address: "",
  city: "",
  region: "",
  postalCode: "",
  country: "Ελλάδα",
  type: "Διαμέρισμα",
  status: "active",
  bedrooms: "0",
  bathrooms: "0",
  maxGuests: "0",
  defaultPartnerId: "",
  notes: "",
}

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function normalizeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDateTime(value: string | null | undefined, locale: string) {
  const date = normalizeDate(value)
  if (!date) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function combineCheckInDateTime(
  checkInDate?: string | null,
  checkInTime?: string | null
) {
  const date = normalizeDate(checkInDate)
  if (!date) return null

  if (checkInTime && /^\d{2}:\d{2}$/.test(checkInTime)) {
    const [hours, minutes] = checkInTime.split(":").map(Number)
    const merged = new Date(date)
    merged.setHours(hours, minutes, 0, 0)
    return merged
  }

  const merged = new Date(date)
  merged.setHours(15, 0, 0, 0)
  return merged
}

function getStatusBadgeClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "active":
    case "completed":
    case "confirmed":
    case "resolved":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    case "pending":
    case "assigned":
    case "accepted":
    case "in_progress":
    case "maintenance":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    case "inactive":
    case "cancelled":
    case "archived":
    case "closed":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
    case "critical":
    case "high":
    case "open":
      return "bg-red-50 text-red-700 ring-1 ring-red-200"
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  }
}

function getMetricCardClasses(
  active: boolean,
  tone: "default" | "green" | "slate" | "amber" | "red"
) {
  if (active) {
    switch (tone) {
      case "green":
        return "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200"
      case "slate":
        return "border-slate-400 bg-slate-100 ring-2 ring-slate-200"
      case "amber":
        return "border-amber-300 bg-amber-50 ring-2 ring-amber-200"
      case "red":
        return "border-red-300 bg-red-50 ring-2 ring-red-200"
      default:
        return "border-slate-300 bg-slate-50 ring-2 ring-slate-200"
    }
  }

  return "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
}

function getPropertiesPageTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      locale: "en-GB",
      title: "Properties",
      subtitle:
        "Clean operational view with dynamic filters, readiness status and critical alerts.",
      newProperty: "New property",
      loading: "Loading properties...",
      loadError: "Failed to load property data.",
      listTitle: "Properties",
      noResults: "No properties found with the current filters.",

      search: "Search",
      searchPlaceholder: "Name, code, address, city...",
      type: "Type",
      city: "City",
      sort: "Sort",
      clearFilters: "Clear filters",

      allTypes: "All",
      allCities: "All",

      sortUpdatedDesc: "Most recently updated",
      sortUpdatedAsc: "Oldest update",
      sortNameAsc: "Name A-Z",
      sortNameDesc: "Name Z-A",
      sortCityAsc: "City A-Z",
      sortCityDesc: "City Z-A",

      total: "Total properties",
      active: "Active",
      inactive: "Inactive",
      ready: "Ready",
      requiresAction: "Needs action",
      alerts: "Alerts",

      property: "Property",
      address: "Address",
      readiness: "Readiness",
      updated: "Updated",
      actions: "Actions",
      view: "View",

      propertyReady: "Ready",
      propertyNeedsAction: "Needs action",
      criticalAlert: "Critical before check-in",
      activeTaskAlert: "Active alert",
      noCriticalAlert: "No critical alert",

      formName: "Name *",
      formAddress: "Address *",
      formCity: "City *",
      formRegion: "Region / Area *",
      formPostalCode: "Postal code *",
      formCountry: "Country *",
      formType: "Type *",
      formStatus: "Status *",
      formBedrooms: "Bedrooms",
      formBathrooms: "Bathrooms",
      formMaxGuests: "Max guests",
      formDefaultPartner: "Default partner",
      formNotes: "Notes",

      placeholderName: "e.g. Villa Marina",
      placeholderAddress: "Street, number",
      placeholderCity: "e.g. Heraklion",
      placeholderRegion: "e.g. Crete",
      placeholderPostalCode: "e.g. 71307",
      placeholderNotes: "Internal notes for the property",

      apartment: "Apartment",
      villa: "Villa",
      studio: "Studio",
      house: "House",
      maisonette: "Maisonette",
      loft: "Loft",
      other: "Other",
      greece: "Greece",

      statusActive: "Active",
      statusInactive: "Inactive",
      statusMaintenance: "Maintenance",
      statusArchived: "Archived",

      noPartner: "Without partner",
      createTitle: "New property",
      createSubtitle:
        "The property code is generated automatically from the organization.",
      close: "Close",
      cancel: "Cancel",
      saveProperty: "Save property",
      saving: "Creating...",
      createError: "Failed to create property.",

      pageHint:
        "The counters work as dynamic filters. The list stays intentionally clean.",
    }
  }

  return {
    locale: "el-GR",
    title: "Ακίνητα",
    subtitle:
      "Καθαρή επιχειρησιακή εικόνα με δυναμικά φίλτρα, ετοιμότητα και κρίσιμα alerts.",
    newProperty: "Νέο ακίνητο",
    loading: "Φόρτωση ακινήτων...",
    loadError: "Αποτυχία φόρτωσης δεδομένων ακινήτων.",
    listTitle: "Ακίνητα",
    noResults: "Δεν βρέθηκαν ακίνητα με τα τρέχοντα φίλτρα.",

    search: "Αναζήτηση",
    searchPlaceholder: "Όνομα, κωδικός, διεύθυνση, πόλη...",
    type: "Τύπος",
    city: "Πόλη",
    sort: "Ταξινόμηση",
    clearFilters: "Καθαρισμός φίλτρων",

    allTypes: "Όλοι",
    allCities: "Όλες",

    sortUpdatedDesc: "Πιο πρόσφατη ενημέρωση",
    sortUpdatedAsc: "Παλαιότερη ενημέρωση",
    sortNameAsc: "Όνομα Α-Ω",
    sortNameDesc: "Όνομα Ω-Α",
    sortCityAsc: "Πόλη Α-Ω",
    sortCityDesc: "Πόλη Ω-Α",

    total: "Συνολικά ακίνητα",
    active: "Ενεργά",
    inactive: "Ανενεργά",
    ready: "Έτοιμα",
    requiresAction: "Θέλουν ενέργειες",
    alerts: "Alert",

    property: "Ακίνητο",
    address: "Διεύθυνση",
    readiness: "Κατάσταση",
    updated: "Ενημέρωση",
    actions: "Ενέργειες",
    view: "Προβολή",

    propertyReady: "Έτοιμο",
    propertyNeedsAction: "Θέλει ενέργειες",
    criticalAlert: "Κρίσιμο πριν το check-in",
    activeTaskAlert: "Ενεργό alert",
    noCriticalAlert: "Χωρίς κρίσιμο alert",

    formName: "Όνομα *",
    formAddress: "Διεύθυνση *",
    formCity: "Πόλη *",
    formRegion: "Περιοχή / Νομός *",
    formPostalCode: "Ταχυδρομικός κώδικας *",
    formCountry: "Χώρα *",
    formType: "Τύπος *",
    formStatus: "Κατάσταση *",
    formBedrooms: "Υπνοδωμάτια",
    formBathrooms: "Μπάνια",
    formMaxGuests: "Μέγιστοι επισκέπτες",
    formDefaultPartner: "Προεπιλεγμένος συνεργάτης",
    formNotes: "Σημειώσεις",

    placeholderName: "π.χ. Villa Marina",
    placeholderAddress: "Οδός, αριθμός",
    placeholderCity: "π.χ. Ηράκλειο",
    placeholderRegion: "π.χ. Κρήτη",
    placeholderPostalCode: "π.χ. 71307",
    placeholderNotes: "Εσωτερικές σημειώσεις για το ακίνητο",

    apartment: "Διαμέρισμα",
    villa: "Βίλα",
    studio: "Στούντιο",
    house: "Μονοκατοικία",
    maisonette: "Μεζονέτα",
    loft: "Loft",
    other: "Άλλο",
    greece: "Ελλάδα",

    statusActive: "Ενεργό",
    statusInactive: "Ανενεργό",
    statusMaintenance: "Σε συντήρηση",
    statusArchived: "Αρχειοθετημένο",

    noPartner: "Χωρίς συνεργάτη",
    createTitle: "Νέο ακίνητο",
    createSubtitle:
      "Ο κωδικός του ακινήτου δημιουργείται αυτόματα από τον οργανισμό.",
    close: "Κλείσιμο",
    cancel: "Ακύρωση",
    saveProperty: "Αποθήκευση ακινήτου",
    saving: "Δημιουργία...",
    createError: "Αποτυχία δημιουργίας ακινήτου.",

    pageHint:
      "Οι μετρητές λειτουργούν ως δυναμικά φίλτρα. Η λίστα μένει σκόπιμα καθαρή.",
  }
}

function statusLabel(language: "el" | "en", status?: string | null) {
  const value = (status || "").toLowerCase()

  if (language === "en") {
    switch (value) {
      case "active":
        return "Active"
      case "inactive":
        return "Inactive"
      case "maintenance":
        return "Maintenance"
      case "archived":
        return "Archived"
      default:
        return status || "—"
    }
  }

  switch (value) {
    case "active":
      return "Ενεργό"
    case "inactive":
      return "Ανενεργό"
    case "maintenance":
      return "Σε συντήρηση"
    case "archived":
      return "Αρχειοθετημένο"
    default:
      return status || "—"
  }
}

function typeLabel(language: "el" | "en", type?: string | null) {
  if (!type) return "—"

  const normalized = type.toLowerCase()

  if (language === "en") {
    switch (normalized) {
      case "διαμέρισμα":
      case "apartment":
        return "Apartment"
      case "βίλα":
      case "villa":
        return "Villa"
      case "στούντιο":
      case "studio":
        return "Studio"
      case "μονοκατοικία":
      case "house":
        return "House"
      case "μεζονέτα":
      case "maisonette":
        return "Maisonette"
      case "loft":
        return "Loft"
      case "άλλο":
      case "other":
        return "Other"
      default:
        return type
    }
  }

  switch (normalized) {
    case "apartment":
    case "διαμέρισμα":
      return "Διαμέρισμα"
    case "villa":
    case "βίλα":
      return "Βίλα"
    case "studio":
    case "στούντιο":
      return "Στούντιο"
    case "house":
    case "μονοκατοικία":
      return "Μονοκατοικία"
    case "maisonette":
    case "μεζονέτα":
      return "Μεζονέτα"
    case "loft":
      return "Loft"
    case "other":
    case "άλλο":
      return "Άλλο"
    default:
      return type
  }
}

function getOpenIssuesCount(property: PropertyListItem) {
  return safeArray(property.issues).filter((issue) =>
    ["open", "in_progress"].includes(String(issue.status || "").toLowerCase())
  ).length
}

function isTaskStillOperationallyOpen(
  task: NonNullable<PropertyListItem["tasks"]>[number]
) {
  const taskStatus = String(task?.status || "").toLowerCase()
  const assignmentStatus = String(task?.assignments?.[0]?.status || "").toLowerCase()
  const checklistStatus = String(task?.checklistRun?.status || "").toLowerCase()

  if (["completed", "cancelled", "archived", "closed"].includes(taskStatus)) {
    return false
  }

  if (
    ["pending", "assigned", "accepted", "in_progress", "new"].includes(taskStatus)
  ) {
    return true
  }

  if (
    ["pending", "assigned", "sent", "accepted", "waiting_acceptance"].includes(
      assignmentStatus
    )
  ) {
    return true
  }

  if (
    ["pending", "in_progress", "submitted", "needs_review"].includes(
      checklistStatus
    )
  ) {
    return true
  }

  return false
}

function isTaskAlertActive(
  task: NonNullable<PropertyListItem["tasks"]>[number]
) {
  if (!isTaskStillOperationallyOpen(task)) return false
  if (!task.alertEnabled) return false
  if (!task.alertAt) return false

  const alertDate = normalizeDate(task.alertAt)
  if (!alertDate) return false

  return alertDate.getTime() <= Date.now()
}

function getOpenTasksCount(property: PropertyListItem) {
  return safeArray(property.tasks).filter((task) =>
    isTaskStillOperationallyOpen(task)
  ).length
}

function getActiveAlertsCount(property: PropertyListItem) {
  return safeArray(property.tasks).filter((task) =>
    isTaskAlertActive(task)
  ).length
}

function hasActiveAlert(property: PropertyListItem) {
  return getActiveAlertsCount(property) > 0
}

function getNextUpcomingBooking(property: PropertyListItem) {
  const now = Date.now()

  return safeArray(property.bookings)
    .map((booking) => {
      const checkInAt = combineCheckInDateTime(
        booking.checkInDate,
        booking.checkInTime || null
      )

      return {
        ...booking,
        checkInAt,
      }
    })
    .filter((booking) => {
      const status = String(booking.status || "").toLowerCase()
      return (
        booking.checkInAt &&
        booking.checkInAt.getTime() >= now &&
        ["confirmed", "pending"].includes(status)
      )
    })
    .sort((a, b) => {
      return (
        (a.checkInAt?.getTime() || Number.MAX_SAFE_INTEGER) -
        (b.checkInAt?.getTime() || Number.MAX_SAFE_INTEGER)
      )
    })[0]
}

function hasCriticalCheckInAlert(property: PropertyListItem) {
  const nextBooking = getNextUpcomingBooking(property)
  if (!nextBooking?.checkInAt) return false

  const openIssues = getOpenIssuesCount(property)
  if (openIssues <= 0) return false

  const diffMs = nextBooking.checkInAt.getTime() - Date.now()
  const threeHoursMs = 3 * 60 * 60 * 1000

  return diffMs >= 0 && diffMs <= threeHoursMs
}

function isPropertyOperationallyReady(property: PropertyListItem) {
  const openIssues = getOpenIssuesCount(property)
  const openTasks = getOpenTasksCount(property)
  const criticalAlert = hasCriticalCheckInAlert(property)
  const activeAlert = hasActiveAlert(property)

  return openIssues === 0 && openTasks === 0 && !criticalAlert && !activeAlert
}

function getPropertyReadinessDetails(
  property: PropertyListItem,
  language: "el" | "en"
) {
  const openTasks = getOpenTasksCount(property)
  const openIssues = getOpenIssuesCount(property)
  const criticalAlert = hasCriticalCheckInAlert(property)
  const activeAlerts = getActiveAlertsCount(property)
  const ready = isPropertyOperationallyReady(property)

  if (language === "en") {
    if (ready) {
      return {
        label: "Ready",
        detail: "No active operational alert",
      }
    }

    if (activeAlerts > 0 && openTasks > 0 && openIssues > 0) {
      return {
        label: "Needs action",
        detail: `${activeAlerts} alerts · ${openTasks} open tasks · ${openIssues} open issues`,
      }
    }

    if (activeAlerts > 0 && openTasks > 0) {
      return {
        label: "Needs action",
        detail: `${activeAlerts} alerts · ${openTasks} open tasks`,
      }
    }

    if (activeAlerts > 0) {
      return {
        label: "Needs action",
        detail: `${activeAlerts} active alerts`,
      }
    }

    if (openTasks > 0 && openIssues > 0) {
      return {
        label: "Needs action",
        detail: `${openTasks} open tasks · ${openIssues} open issues`,
      }
    }

    if (openTasks > 0) {
      return {
        label: "Needs action",
        detail: `${openTasks} open tasks`,
      }
    }

    if (openIssues > 0) {
      return {
        label: "Needs action",
        detail: `${openIssues} open issues`,
      }
    }

    if (criticalAlert) {
      return {
        label: "Needs action",
        detail: "Critical before check-in",
      }
    }

    return {
      label: "Needs action",
      detail: "Operational action required",
    }
  }

  if (ready) {
    return {
      label: "Έτοιμο",
      detail: "Χωρίς ενεργό λειτουργικό alert",
    }
  }

  if (activeAlerts > 0 && openTasks > 0 && openIssues > 0) {
    return {
      label: "Θέλει ενέργειες",
      detail: `${activeAlerts} alert · ${openTasks} ανοιχτές εργασίες · ${openIssues} ανοιχτά θέματα`,
    }
  }

  if (activeAlerts > 0 && openTasks > 0) {
    return {
      label: "Θέλει ενέργειες",
      detail: `${activeAlerts} alert · ${openTasks} ανοιχτές εργασίες`,
    }
  }

  if (activeAlerts > 0) {
    return {
      label: "Θέλει ενέργειες",
      detail: `${activeAlerts} ενεργά alert`,
    }
  }

  if (openTasks > 0 && openIssues > 0) {
    return {
      label: "Θέλει ενέργειες",
      detail: `${openTasks} ανοιχτές εργασίες · ${openIssues} ανοιχτά θέματα`,
    }
  }

  if (openTasks > 0) {
    return {
      label: "Θέλει ενέργειες",
      detail: `${openTasks} ανοιχτές εργασίες`,
    }
  }

  if (openIssues > 0) {
    return {
      label: "Θέλει ενέργειες",
      detail: `${openIssues} ανοιχτά θέματα`,
    }
  }

  if (criticalAlert) {
    return {
      label: "Θέλει ενέργειες",
      detail: "Κρίσιμο πριν το check-in",
    }
  }

  return {
    label: "Θέλει ενέργειες",
    detail: "Απαιτείται επιχειρησιακή ενέργεια",
  }
}

function matchesMetricFilter(property: PropertyListItem, metricFilter: MetricFilter) {
  switch (metricFilter) {
    case "active":
      return String(property.status || "").toLowerCase() === "active"
    case "inactive":
      return String(property.status || "").toLowerCase() === "inactive"
    case "ready":
      return isPropertyOperationallyReady(property)
    case "requires_action":
      return !isPropertyOperationallyReady(property)
    case "alerts":
      return hasActiveAlert(property)
    case "all":
    default:
      return true
  }
}

export default function PropertiesPage() {
  const { language } = useAppLanguage()
  const texts = getPropertiesPageTexts(language)

  const [properties, setProperties] = useState<PropertyListItem[]>([])
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [cityFilter, setCityFilter] = useState("all")
  const [sortBy, setSortBy] = useState("updatedAt_desc")
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("all")

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] =
    useState<CreatePropertyFormState>(initialCreateForm)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [propertiesRes, partnersRes] = await Promise.all([
        fetch("/api/properties", { cache: "no-store" }),
        fetch("/api/partners", { cache: "no-store" }),
      ])

      const propertiesJson = await propertiesRes.json().catch(() => [])
      const partnersJson = await partnersRes.json().catch(() => [])

      const propertyData = Array.isArray(propertiesJson)
        ? propertiesJson
        : Array.isArray(propertiesJson?.data)
          ? propertiesJson.data
          : Array.isArray(propertiesJson?.properties)
            ? propertiesJson.properties
            : []

      const partnerData = Array.isArray(partnersJson)
        ? partnersJson
        : Array.isArray(partnersJson?.data)
          ? partnersJson.data
          : Array.isArray(partnersJson?.partners)
            ? partnersJson.partners
            : []

      setProperties(propertyData)
      setPartners(partnerData)
    } catch (err) {
      console.error("Load properties page error:", err)
      setError(texts.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const typeOptions = useMemo(() => {
    const values = Array.from(
      new Set(properties.map((item) => item.type).filter(Boolean))
    )
    return values.sort((a, b) => a.localeCompare(b, texts.locale))
  }, [properties, texts.locale])

  const cityOptions = useMemo(() => {
    const values = Array.from(
      new Set(properties.map((item) => item.city).filter(Boolean))
    )
    return values.sort((a, b) => a.localeCompare(b, texts.locale))
  }, [properties, texts.locale])

  const summary = useMemo(() => {
    const active = properties.filter(
      (item) => String(item.status || "").toLowerCase() === "active"
    ).length

    const inactive = properties.filter(
      (item) => String(item.status || "").toLowerCase() === "inactive"
    ).length

    const ready = properties.filter((item) =>
      isPropertyOperationallyReady(item)
    ).length

    const requiresAction = properties.filter(
      (item) => !isPropertyOperationallyReady(item)
    ).length

    const alerts = properties.filter((item) => hasActiveAlert(item)).length

    return {
      total: properties.length,
      active,
      inactive,
      ready,
      requiresAction,
      alerts,
    }
  }, [properties])

  const filteredProperties = useMemo(() => {
    const term = search.trim().toLowerCase()

    const rows = [...properties].filter((property) => {
      const matchesSearch =
        term === "" ||
        property.name?.toLowerCase().includes(term) ||
        property.code?.toLowerCase().includes(term) ||
        property.address?.toLowerCase().includes(term) ||
        property.city?.toLowerCase().includes(term) ||
        property.region?.toLowerCase().includes(term) ||
        property.country?.toLowerCase().includes(term)

      const matchesType =
        typeFilter === "all" ||
        String(property.type || "").toLowerCase() === typeFilter.toLowerCase()

      const matchesCity =
        cityFilter === "all" ||
        String(property.city || "").toLowerCase() === cityFilter.toLowerCase()

      const matchesMetric = matchesMetricFilter(property, metricFilter)

      return matchesSearch && matchesType && matchesCity && matchesMetric
    })

    rows.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return String(a.name || "").localeCompare(String(b.name || ""), texts.locale)
        case "name_desc":
          return String(b.name || "").localeCompare(String(a.name || ""), texts.locale)
        case "city_asc":
          return String(a.city || "").localeCompare(String(b.city || ""), texts.locale)
        case "city_desc":
          return String(b.city || "").localeCompare(String(a.city || ""), texts.locale)
        case "updatedAt_asc":
          return +new Date(a.updatedAt) - +new Date(b.updatedAt)
        case "updatedAt_desc":
        default:
          return +new Date(b.updatedAt) - +new Date(a.updatedAt)
      }
    })

    return rows
  }, [properties, search, typeFilter, cityFilter, sortBy, metricFilter, texts.locale])

  function openCreateDrawer() {
    setCreateError(null)
    setCreateForm({
      ...initialCreateForm,
      country: texts.greece,
      type: texts.apartment,
    })
    setIsCreateOpen(true)
  }

  function closeCreateDrawer() {
    if (createSubmitting) return
    setIsCreateOpen(false)
    setCreateError(null)
  }

  function updateCreateField(
    field: keyof CreatePropertyFormState,
    value: string
  ) {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleCreateProperty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreateSubmitting(true)
    setCreateError(null)

    try {
      const payload = {
        name: createForm.name.trim(),
        address: createForm.address.trim(),
        city: createForm.city.trim(),
        region: createForm.region.trim(),
        postalCode: createForm.postalCode.trim(),
        country: createForm.country.trim(),
        type: createForm.type.trim(),
        status: createForm.status,
        bedrooms: Number(createForm.bedrooms || 0),
        bathrooms: Number(createForm.bathrooms || 0),
        maxGuests: Number(createForm.maxGuests || 0),
        defaultPartnerId: createForm.defaultPartnerId || null,
        notes: createForm.notes.trim() || null,
      }

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || texts.createError)
      }

      await loadData()
      setIsCreateOpen(false)
      setCreateForm(initialCreateForm)
    } catch (err) {
      console.error("Create property error:", err)
      setCreateError(err instanceof Error ? err.message : texts.createError)
    } finally {
      setCreateSubmitting(false)
    }
  }

  function resetFilters() {
    setSearch("")
    setTypeFilter("all")
    setCityFilter("all")
    setSortBy("updatedAt_desc")
    setMetricFilter("all")
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {texts.title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              {texts.subtitle}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={openCreateDrawer}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              {texts.newProperty}
            </button>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <button
            type="button"
            onClick={() => setMetricFilter("all")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "all",
              "default"
            )}`}
          >
            <div className="text-sm text-slate-500">{texts.total}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {summary.total}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMetricFilter("active")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "active",
              "green"
            )}`}
          >
            <div className="text-sm text-slate-500">{texts.active}</div>
            <div className="mt-2 text-3xl font-bold text-emerald-700">
              {summary.active}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMetricFilter("inactive")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "inactive",
              "slate"
            )}`}
          >
            <div className="text-sm text-slate-500">{texts.inactive}</div>
            <div className="mt-2 text-3xl font-bold text-slate-700">
              {summary.inactive}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMetricFilter("ready")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "ready",
              "green"
            )}`}
          >
            <div className="text-sm text-slate-500">{texts.ready}</div>
            <div className="mt-2 text-3xl font-bold text-emerald-700">
              {summary.ready}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMetricFilter("requires_action")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "requires_action",
              "red"
            )}`}
          >
            <div className="text-sm text-slate-500">{texts.requiresAction}</div>
            <div className="mt-2 text-3xl font-bold text-red-700">
              {summary.requiresAction}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMetricFilter("alerts")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "alerts",
              "red"
            )}`}
          >
            <div className="text-sm text-slate-500">{texts.alerts}</div>
            <div className="mt-2 text-3xl font-bold text-red-700">
              {summary.alerts}
            </div>
          </button>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {texts.search}
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={texts.searchPlaceholder}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {texts.type}
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="all">{texts.allTypes}</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {typeLabel(language, type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {texts.city}
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="all">{texts.allCities}</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {texts.sort}
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="updatedAt_desc">{texts.sortUpdatedDesc}</option>
                <option value="updatedAt_asc">{texts.sortUpdatedAsc}</option>
                <option value="name_asc">{texts.sortNameAsc}</option>
                <option value="name_desc">{texts.sortNameDesc}</option>
                <option value="city_asc">{texts.sortCityAsc}</option>
                <option value="city_desc">{texts.sortCityDesc}</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">{texts.pageHint}</div>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {texts.clearFilters}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {texts.listTitle}
                </h2>
                <p className="text-sm text-slate-500">
                  {filteredProperties.length} / {properties.length}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">{texts.loading}</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : filteredProperties.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">{texts.noResults}</div>
          ) : (
            <>
              <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">{texts.property}</th>
                      <th className="px-4 py-3 font-semibold">{texts.address}</th>
                      <th className="px-4 py-3 font-semibold">{texts.readiness}</th>
                      <th className="px-4 py-3 font-semibold">{texts.updated}</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        {texts.actions}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredProperties.map((property) => {
                      const criticalAlert = hasCriticalCheckInAlert(property)
                      const activeAlert = hasActiveAlert(property)
                      const ready = isPropertyOperationallyReady(property)
                      const readiness = getPropertyReadinessDetails(
                        property,
                        language
                      )

                      return (
                        <tr key={property.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-4 align-top">
                            <div className="font-semibold text-slate-900">
                              {property.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {property.code}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {typeLabel(language, property.type)} ·{" "}
                              {statusLabel(language, property.status)}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="text-slate-900">{property.address}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {property.city}, {property.region}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-col gap-2">
                              <span
                                className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  ready
                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                }`}
                              >
                                {readiness.label}
                              </span>

                              {activeAlert ? (
                                <span className="inline-flex w-fit rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                                  {texts.activeTaskAlert}
                                </span>
                              ) : null}

                              {criticalAlert ? (
                                <span className="inline-flex w-fit rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                                  {texts.criticalAlert}
                                </span>
                              ) : null}

                              <div className="text-xs text-slate-500">
                                {readiness.detail}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="text-sm text-slate-900">
                              {formatDateTime(property.updatedAt, texts.locale)}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top text-right">
                            <Link
                              href={`/properties/${property.id}`}
                              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {texts.view}
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 p-4 sm:p-6 xl:hidden">
                {filteredProperties.map((property) => {
                  const criticalAlert = hasCriticalCheckInAlert(property)
                  const activeAlert = hasActiveAlert(property)
                  const ready = isPropertyOperationallyReady(property)
                  const readiness = getPropertyReadinessDetails(
                    property,
                    language
                  )

                  return (
                    <div
                      key={property.id}
                      className="rounded-2xl border border-slate-200 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-slate-900">
                            {property.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {property.code}
                          </div>
                        </div>

                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(
                            property.status
                          )}`}
                        >
                          {statusLabel(language, property.status)}
                        </span>
                      </div>

                      <div className="mt-4 text-sm text-slate-900">
                        {property.address}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {property.city}, {property.region}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            ready
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                          }`}
                        >
                          {readiness.label}
                        </span>

                        {activeAlert ? (
                          <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                            {texts.activeTaskAlert}
                          </span>
                        ) : null}

                        {criticalAlert ? (
                          <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                            {texts.criticalAlert}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        {readiness.detail}
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {texts.updated}
                        </div>
                        <div className="mt-1 text-sm text-slate-900">
                          {formatDateTime(property.updatedAt, texts.locale)}
                        </div>
                      </div>

                      <div className="mt-4">
                        <Link
                          href={`/properties/${property.id}`}
                          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {texts.view}
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-950/35"
            onClick={closeCreateDrawer}
          />

          <div className="absolute inset-y-0 right-0 flex w-full max-w-2xl">
            <div className="ml-auto h-full w-full border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex h-full flex-col">
                <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {texts.createTitle}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {texts.createSubtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeCreateDrawer}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {texts.close}
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={handleCreateProperty}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6">
                    {createError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {createError}
                      </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formName}
                        </label>
                        <input
                          value={createForm.name}
                          onChange={(e) => updateCreateField("name", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderName}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formType}
                        </label>
                        <select
                          value={createForm.type}
                          onChange={(e) => updateCreateField("type", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        >
                          <option value={texts.apartment}>{texts.apartment}</option>
                          <option value={texts.villa}>{texts.villa}</option>
                          <option value={texts.studio}>{texts.studio}</option>
                          <option value={texts.house}>{texts.house}</option>
                          <option value={texts.maisonette}>{texts.maisonette}</option>
                          <option value={texts.loft}>{texts.loft}</option>
                          <option value={texts.other}>{texts.other}</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formAddress}
                        </label>
                        <input
                          value={createForm.address}
                          onChange={(e) =>
                            updateCreateField("address", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderAddress}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formCity}
                        </label>
                        <input
                          value={createForm.city}
                          onChange={(e) => updateCreateField("city", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderCity}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formRegion}
                        </label>
                        <input
                          value={createForm.region}
                          onChange={(e) => updateCreateField("region", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderRegion}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formPostalCode}
                        </label>
                        <input
                          value={createForm.postalCode}
                          onChange={(e) =>
                            updateCreateField("postalCode", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderPostalCode}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formCountry}
                        </label>
                        <input
                          value={createForm.country}
                          onChange={(e) => updateCreateField("country", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formStatus}
                        </label>
                        <select
                          value={createForm.status}
                          onChange={(e) => updateCreateField("status", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        >
                          <option value="active">{texts.statusActive}</option>
                          <option value="inactive">{texts.statusInactive}</option>
                          <option value="maintenance">{texts.statusMaintenance}</option>
                          <option value="archived">{texts.statusArchived}</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formDefaultPartner}
                        </label>
                        <select
                          value={createForm.defaultPartnerId}
                          onChange={(e) =>
                            updateCreateField("defaultPartnerId", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        >
                          <option value="">{texts.noPartner}</option>
                          {partners.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                              {partner.name} ({partner.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formBedrooms}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={createForm.bedrooms}
                          onChange={(e) =>
                            updateCreateField("bedrooms", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formBathrooms}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={createForm.bathrooms}
                          onChange={(e) =>
                            updateCreateField("bathrooms", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formMaxGuests}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={createForm.maxGuests}
                          onChange={(e) =>
                            updateCreateField("maxGuests", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {texts.formNotes}
                        </label>
                        <textarea
                          value={createForm.notes}
                          onChange={(e) => updateCreateField("notes", e.target.value)}
                          rows={5}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderNotes}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 px-4 py-4 sm:px-6">
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeCreateDrawer}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        disabled={createSubmitting}
                      >
                        {texts.cancel}
                      </button>

                      <button
                        type="submit"
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={createSubmitting}
                      >
                        {createSubmitting ? texts.saving : texts.saveProperty}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}