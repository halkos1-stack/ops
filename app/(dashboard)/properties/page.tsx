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
  }>
  tasks?: Array<{
    id: string
    status: string
    priority?: string
    taskType?: string
    scheduledDate?: string
  }>
  issues?: Array<{
    id: string
    status: string
    severity?: string
  }>
  checklistTemplates?: Array<{
    id: string
    title: string
    templateType: string
    isPrimary: boolean
    isActive: boolean
  }>
}

type CreatePropertyFormState = {
  code: string
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

type PropertyMetricFilter =
  | "all"
  | "active"
  | "inactive"
  | "maintenance"
  | "archived"
  | "with_open_issues"
  | "with_pending_tasks"
  | "without_partner"

const initialCreateForm: CreatePropertyFormState = {
  code: "",
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

function formatDate(value: string | null | undefined, locale: string) {
  const date = normalizeDate(value)
  if (!date) return "—"

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
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
  tone: "default" | "green" | "slate" | "amber" | "red" | "blue"
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
      case "blue":
        return "border-blue-300 bg-blue-50 ring-2 ring-blue-200"
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
        "Complete portfolio view with status, partners, tasks and open issues.",
      calendar: "Calendar",
      newProperty: "New property",
      loading: "Loading properties...",
      loadError: "Failed to load property data.",
      listTitle: "Properties list",
      listSubtitlePrefix: "",
      listSubtitleMiddle: "of",
      listSubtitleSuffix: "properties",
      noResults: "No properties found with the current filters.",

      search: "Search",
      searchPlaceholder: "Name, code, address, city...",
      status: "Status",
      type: "Type",
      city: "City",
      defaultPartner: "Default partner",
      sort: "Sort",
      clearFilters: "Clear filters",

      allStatuses: "All",
      statusActive: "Active",
      statusInactive: "Inactive",
      statusMaintenance: "Maintenance",
      statusArchived: "Archived",

      allTypes: "All",
      allCities: "All",
      allPartners: "All",
      noPartner: "Without partner",

      sortUpdatedDesc: "Most recently updated",
      sortUpdatedAsc: "Oldest update",
      sortCreatedDesc: "Newest created",
      sortCreatedAsc: "Oldest created",
      sortNameAsc: "Name A-Z",
      sortNameDesc: "Name Z-A",
      sortCityAsc: "City A-Z",
      sortCityDesc: "City Z-A",

      total: "Total properties",
      active: "Active",
      inactive: "Inactive",
      maintenance: "Maintenance",
      archived: "Archived",
      pendingTasks: "Pending tasks",
      openIssues: "Open issues",
      withoutPartnerMetric: "Without partner",

      property: "Property",
      location: "Location",
      features: "Features",
      partner: "Partner",
      operations: "Operations",
      updated: "Updated",
      actions: "Actions",
      code: "Code",
      propertyType: "Type",
      createdAt: "Created",
      lastUpdated: "Last update",

      bookings: "Bookings",
      activeTasks: "Active tasks",
      openIssuesInline: "Open issues",
      primaryChecklist: "Primary checklist",

      notAssigned: "Not assigned",
      view: "View",
      checklists: "Checklists",

      createTitle: "New property",
      createSubtitle: "Create a new property with all basic details.",
      close: "Close",
      cancel: "Cancel",
      saveProperty: "Save property",
      saving: "Creating...",
      createError: "Failed to create property.",

      formCode: "Code *",
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

      placeholderCode: "e.g. PR-001",
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

      portfolioHint: "Dynamic portfolio view based on filters and metrics.",
      filterAll: "All",
      filterWithIssues: "With open issues",
      filterWithPendingTasks: "With pending tasks",
      filterWithoutPartner: "Without partner",
    }
  }

  return {
    locale: "el-GR",
    title: "Ακίνητα",
    subtitle:
      "Πλήρης εικόνα χαρτοφυλακίου, κατάστασης, συνεργατών, εργασιών και ανοιχτών θεμάτων.",
    calendar: "Ημερολόγιο",
    newProperty: "Νέο ακίνητο",
    loading: "Φόρτωση ακινήτων...",
    loadError: "Αποτυχία φόρτωσης δεδομένων ακινήτων.",
    listTitle: "Λίστα ακινήτων",
    listSubtitlePrefix: "",
    listSubtitleMiddle: "από",
    listSubtitleSuffix: "ακίνητα",
    noResults: "Δεν βρέθηκαν ακίνητα με τα τρέχοντα φίλτρα.",

    search: "Αναζήτηση",
    searchPlaceholder: "Όνομα, κωδικός, διεύθυνση, πόλη...",
    status: "Κατάσταση",
    type: "Τύπος",
    city: "Πόλη",
    defaultPartner: "Προεπιλεγμένος συνεργάτης",
    sort: "Ταξινόμηση",
    clearFilters: "Καθαρισμός φίλτρων",

    allStatuses: "Όλες",
    statusActive: "Ενεργό",
    statusInactive: "Ανενεργό",
    statusMaintenance: "Σε συντήρηση",
    statusArchived: "Αρχειοθετημένο",

    allTypes: "Όλοι",
    allCities: "Όλες",
    allPartners: "Όλοι",
    noPartner: "Χωρίς συνεργάτη",

    sortUpdatedDesc: "Πιο πρόσφατη ενημέρωση",
    sortUpdatedAsc: "Παλαιότερη ενημέρωση",
    sortCreatedDesc: "Νεότερη δημιουργία",
    sortCreatedAsc: "Παλαιότερη δημιουργία",
    sortNameAsc: "Όνομα Α-Ω",
    sortNameDesc: "Όνομα Ω-Α",
    sortCityAsc: "Πόλη Α-Ω",
    sortCityDesc: "Πόλη Ω-Α",

    total: "Σύνολο ακινήτων",
    active: "Ενεργά",
    inactive: "Ανενεργά",
    maintenance: "Σε συντήρηση",
    archived: "Αρχειοθετημένα",
    pendingTasks: "Εκκρεμείς εργασίες",
    openIssues: "Ανοιχτά θέματα",
    withoutPartnerMetric: "Χωρίς συνεργάτη",

    property: "Ακίνητο",
    location: "Τοποθεσία",
    features: "Χαρακτηριστικά",
    partner: "Συνεργάτης",
    operations: "Λειτουργία",
    updated: "Ενημέρωση",
    actions: "Ενέργειες",
    code: "Κωδικός",
    propertyType: "Τύπος",
    createdAt: "Δημιουργία",
    lastUpdated: "Τελευταία ενημέρωση",

    bookings: "Κρατήσεις",
    activeTasks: "Ενεργές εργασίες",
    openIssuesInline: "Ανοιχτά θέματα",
    primaryChecklist: "Κύρια checklist",

    notAssigned: "Δεν έχει οριστεί",
    view: "Προβολή",
    checklists: "Checklists",

    createTitle: "Νέο ακίνητο",
    createSubtitle: "Δημιουργία νέου ακινήτου με πλήρη βασικά στοιχεία.",
    close: "Κλείσιμο",
    cancel: "Ακύρωση",
    saveProperty: "Αποθήκευση ακινήτου",
    saving: "Δημιουργία...",
    createError: "Αποτυχία δημιουργίας ακινήτου.",

    formCode: "Κωδικός *",
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

    placeholderCode: "π.χ. PR-001",
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

    portfolioHint: "Δυναμική προβολή χαρτοφυλακίου με βάση φίλτρα και μετρητές.",
    filterAll: "Όλα",
    filterWithIssues: "Με ανοιχτά θέματα",
    filterWithPendingTasks: "Με εκκρεμείς εργασίες",
    filterWithoutPartner: "Χωρίς συνεργάτη",
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

function propertyMatchesMetricFilter(
  property: PropertyListItem,
  metricFilter: PropertyMetricFilter
) {
  const issues = safeArray(property.issues)
  const tasks = safeArray(property.tasks)

  const openIssues = issues.filter((issue) => issue.status === "open").length
  const pendingTasks = tasks.filter((task) =>
    ["pending", "assigned", "accepted", "in_progress"].includes(task.status)
  ).length

  switch (metricFilter) {
    case "active":
      return (property.status || "").toLowerCase() === "active"
    case "inactive":
      return (property.status || "").toLowerCase() === "inactive"
    case "maintenance":
      return (property.status || "").toLowerCase() === "maintenance"
    case "archived":
      return (property.status || "").toLowerCase() === "archived"
    case "with_open_issues":
      return openIssues > 0
    case "with_pending_tasks":
      return pendingTasks > 0
    case "without_partner":
      return !property.defaultPartnerId
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
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [cityFilter, setCityFilter] = useState("all")
  const [partnerFilter, setPartnerFilter] = useState("all")
  const [sortBy, setSortBy] = useState("updatedAt_desc")
  const [metricFilter, setMetricFilter] = useState<PropertyMetricFilter>("all")

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
      (item) => (item.status || "").toLowerCase() === "active"
    ).length

    const inactive = properties.filter(
      (item) => (item.status || "").toLowerCase() === "inactive"
    ).length

    const maintenance = properties.filter(
      (item) => (item.status || "").toLowerCase() === "maintenance"
    ).length

    const archived = properties.filter(
      (item) => (item.status || "").toLowerCase() === "archived"
    ).length

    const openIssues = properties.reduce((count, property) => {
      return (
        count +
        safeArray(property.issues).filter((issue) => issue.status === "open")
          .length
      )
    }, 0)

    const pendingTasks = properties.reduce((count, property) => {
      return (
        count +
        safeArray(property.tasks).filter((task) =>
          ["pending", "assigned", "accepted", "in_progress"].includes(task.status)
        ).length
      )
    }, 0)

    const withoutPartner = properties.filter(
      (property) => !property.defaultPartnerId
    ).length

    return {
      total: properties.length,
      active,
      inactive,
      maintenance,
      archived,
      openIssues,
      pendingTasks,
      withoutPartner,
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

      const matchesStatus =
        statusFilter === "all" ||
        (property.status || "").toLowerCase() === statusFilter.toLowerCase()

      const matchesType =
        typeFilter === "all" ||
        (property.type || "").toLowerCase() === typeFilter.toLowerCase()

      const matchesCity =
        cityFilter === "all" ||
        (property.city || "").toLowerCase() === cityFilter.toLowerCase()

      const matchesPartner =
        partnerFilter === "all" ||
        (partnerFilter === "none"
          ? !property.defaultPartnerId
          : property.defaultPartnerId === partnerFilter)

      const matchesMetric = propertyMatchesMetricFilter(property, metricFilter)

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesCity &&
        matchesPartner &&
        matchesMetric
      )
    })

    rows.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "", texts.locale)
        case "name_desc":
          return (b.name || "").localeCompare(a.name || "", texts.locale)
        case "city_asc":
          return (a.city || "").localeCompare(b.city || "", texts.locale)
        case "city_desc":
          return (b.city || "").localeCompare(a.city || "", texts.locale)
        case "createdAt_desc":
          return +new Date(b.createdAt) - +new Date(a.createdAt)
        case "createdAt_asc":
          return +new Date(a.createdAt) - +new Date(b.createdAt)
        case "updatedAt_asc":
          return +new Date(a.updatedAt) - +new Date(b.updatedAt)
        case "updatedAt_desc":
        default:
          return +new Date(b.updatedAt) - +new Date(a.updatedAt)
      }
    })

    return rows
  }, [
    properties,
    search,
    statusFilter,
    typeFilter,
    cityFilter,
    partnerFilter,
    sortBy,
    metricFilter,
    texts.locale,
  ])

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
        code: createForm.code.trim(),
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
    setStatusFilter("all")
    setTypeFilter("all")
    setCityFilter("all")
    setPartnerFilter("all")
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
            <Link
              href="/calendar"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {texts.calendar}
            </Link>

            <button
              type="button"
              onClick={openCreateDrawer}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              {texts.newProperty}
            </button>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
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
            onClick={() => setMetricFilter("maintenance")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "maintenance",
              "amber"
            )}`}
          >
            <div className="text-sm text-slate-500">{texts.maintenance}</div>
            <div className="mt-2 text-3xl font-bold text-amber-700">
              {summary.maintenance}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMetricFilter("with_pending_tasks")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "with_pending_tasks",
              "amber"
            )}`}
          >
            <div className="text-sm text-slate-500">{texts.pendingTasks}</div>
            <div className="mt-2 text-3xl font-bold text-amber-700">
              {summary.pendingTasks}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMetricFilter("with_open_issues")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "with_open_issues",
              "red"
            )}`}
          >
            <div className="text-sm text-slate-500">{texts.openIssues}</div>
            <div className="mt-2 text-3xl font-bold text-red-700">
              {summary.openIssues}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMetricFilter("without_partner")}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${getMetricCardClasses(
              metricFilter === "without_partner",
              "blue"
            )}`}
          >
            <div className="text-sm text-slate-500">
              {texts.withoutPartnerMetric}
            </div>
            <div className="mt-2 text-3xl font-bold text-blue-700">
              {summary.withoutPartner}
            </div>
          </button>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMetricFilter("all")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                metricFilter === "all"
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterAll}
            </button>

            <button
              type="button"
              onClick={() => setMetricFilter("with_open_issues")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                metricFilter === "with_open_issues"
                  ? "bg-red-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterWithIssues}
            </button>

            <button
              type="button"
              onClick={() => setMetricFilter("with_pending_tasks")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                metricFilter === "with_pending_tasks"
                  ? "bg-amber-500 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterWithPendingTasks}
            </button>

            <button
              type="button"
              onClick={() => setMetricFilter("without_partner")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                metricFilter === "without_partner"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {texts.filterWithoutPartner}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
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
                {texts.status}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="all">{texts.allStatuses}</option>
                <option value="active">{texts.statusActive}</option>
                <option value="inactive">{texts.statusInactive}</option>
                <option value="maintenance">{texts.statusMaintenance}</option>
                <option value="archived">{texts.statusArchived}</option>
              </select>
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
                {texts.defaultPartner}
              </label>
              <select
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="all">{texts.allPartners}</option>
                <option value="none">{texts.noPartner}</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name} ({partner.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
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
                <option value="createdAt_desc">{texts.sortCreatedDesc}</option>
                <option value="createdAt_asc">{texts.sortCreatedAsc}</option>
                <option value="name_asc">{texts.sortNameAsc}</option>
                <option value="name_desc">{texts.sortNameDesc}</option>
                <option value="city_asc">{texts.sortCityAsc}</option>
                <option value="city_desc">{texts.sortCityDesc}</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {texts.clearFilters}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {texts.listTitle}
                </h2>
                <p className="text-sm text-slate-500">
                  {filteredProperties.length} {texts.listSubtitleMiddle}{" "}
                  {properties.length} {texts.listSubtitleSuffix}
                </p>
              </div>

              <div className="text-xs text-slate-500">{texts.portfolioHint}</div>
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
                      <th className="px-4 py-3 font-semibold">{texts.location}</th>
                      <th className="px-4 py-3 font-semibold">{texts.features}</th>
                      <th className="px-4 py-3 font-semibold">{texts.status}</th>
                      <th className="px-4 py-3 font-semibold">{texts.partner}</th>
                      <th className="px-4 py-3 font-semibold">{texts.operations}</th>
                      <th className="px-4 py-3 font-semibold">{texts.updated}</th>
                      <th className="px-4 py-3 font-semibold text-right">
                        {texts.actions}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredProperties.map((property) => {
                      const bookings = safeArray(property.bookings)
                      const tasks = safeArray(property.tasks)
                      const issues = safeArray(property.issues)
                      const templates = safeArray(property.checklistTemplates)

                      const openIssues = issues.filter(
                        (issue) => issue.status === "open"
                      ).length

                      const activeTasks = tasks.filter((task) =>
                        ["pending", "assigned", "accepted", "in_progress"].includes(
                          task.status
                        )
                      ).length

                      const primaryTemplate = templates.find(
                        (template) => template.isPrimary
                      )

                      return (
                        <tr key={property.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-4 align-top">
                            <div className="font-semibold text-slate-900">
                              {property.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {texts.code}: {property.code}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {texts.propertyType}: {typeLabel(language, property.type)}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="text-slate-900">{property.address}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {property.city}, {property.region}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {property.postalCode} · {property.country}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="text-slate-900">
                              {property.bedrooms} υπν. · {property.bathrooms} μπάν. ·{" "}
                              {property.maxGuests} επισκ.
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {texts.createdAt}:{" "}
                              {formatDate(property.createdAt, texts.locale)}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(
                                property.status
                              )}`}
                            >
                              {statusLabel(language, property.status)}
                            </span>
                          </td>

                          <td className="px-4 py-4 align-top">
                            {property.defaultPartner ? (
                              <>
                                <div className="font-medium text-slate-900">
                                  {property.defaultPartner.name}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {property.defaultPartner.specialty}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {property.defaultPartner.email}
                                </div>
                              </>
                            ) : (
                              <span className="text-slate-400">
                                {texts.notAssigned}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="space-y-1 text-xs text-slate-600">
                              <div>
                                {texts.bookings}: {bookings.length}
                              </div>
                              <div>
                                {texts.activeTasks}: {activeTasks}
                              </div>
                              <div>
                                {texts.openIssuesInline}: {openIssues}
                              </div>
                              <div>
                                {texts.primaryChecklist}:{" "}
                                {primaryTemplate ? primaryTemplate.title : "—"}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="text-xs text-slate-500">
                              {texts.lastUpdated}
                            </div>
                            <div className="mt-1 text-sm text-slate-900">
                              {formatDateTime(property.updatedAt, texts.locale)}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top text-right">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/properties/${property.id}`}
                                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              >
                                {texts.view}
                              </Link>

                              <Link
                                href={`/property-checklists/${property.id}`}
                                className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                              >
                                {texts.checklists}
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 p-4 sm:p-6 xl:hidden">
                {filteredProperties.map((property) => {
                  const bookings = safeArray(property.bookings)
                  const tasks = safeArray(property.tasks)
                  const issues = safeArray(property.issues)
                  const templates = safeArray(property.checklistTemplates)

                  const openIssues = issues.filter(
                    (issue) => issue.status === "open"
                  ).length

                  const activeTasks = tasks.filter((task) =>
                    ["pending", "assigned", "accepted", "in_progress"].includes(
                      task.status
                    )
                  ).length

                  const primaryTemplate = templates.find(
                    (template) => template.isPrimary
                  )

                  return (
                    <div
                      key={property.id}
                      className="rounded-2xl border border-slate-200 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-slate-900">
                            {property.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {texts.code}: {property.code}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {typeLabel(language, property.type)}
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

                      <div className="mt-4 space-y-3 text-sm">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {texts.location}
                          </div>
                          <div className="mt-1 text-slate-900">
                            {property.address}
                          </div>
                          <div className="mt-1 text-slate-500">
                            {property.city}, {property.region}
                          </div>
                          <div className="mt-1 text-slate-500">
                            {property.postalCode} · {property.country}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {texts.features}
                          </div>
                          <div className="mt-1 text-slate-900">
                            {property.bedrooms} υπν. · {property.bathrooms} μπάν. ·{" "}
                            {property.maxGuests} επισκ.
                          </div>
                          <div className="mt-1 text-slate-500">
                            {texts.createdAt}:{" "}
                            {formatDate(property.createdAt, texts.locale)}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {texts.partner}
                          </div>
                          {property.defaultPartner ? (
                            <>
                              <div className="mt-1 font-medium text-slate-900">
                                {property.defaultPartner.name}
                              </div>
                              <div className="mt-1 text-slate-500">
                                {property.defaultPartner.specialty}
                              </div>
                              <div className="mt-1 text-slate-500">
                                {property.defaultPartner.email}
                              </div>
                            </>
                          ) : (
                            <div className="mt-1 text-slate-400">
                              {texts.notAssigned}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {texts.operations}
                          </div>
                          <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-slate-600">
                            <div>
                              {texts.bookings}: {bookings.length}
                            </div>
                            <div>
                              {texts.activeTasks}: {activeTasks}
                            </div>
                            <div>
                              {texts.openIssuesInline}: {openIssues}
                            </div>
                            <div>
                              {texts.primaryChecklist}:{" "}
                              {primaryTemplate ? primaryTemplate.title : "—"}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {texts.lastUpdated}
                          </div>
                          <div className="mt-1 text-slate-900">
                            {formatDateTime(property.updatedAt, texts.locale)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <Link
                          href={`/properties/${property.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {texts.view}
                        </Link>

                        <Link
                          href={`/property-checklists/${property.id}`}
                          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          {texts.checklists}
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
                          {texts.formCode}
                        </label>
                        <input
                          value={createForm.code}
                          onChange={(e) => updateCreateField("code", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                          placeholder={texts.placeholderCode}
                          required
                        />
                      </div>

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