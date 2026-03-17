"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"

type Language = "el" | "en"

type PageParams = Promise<{
  propertyId: string
}>

type TemplateItem = {
  id: string
  label: string
  description: string | null
  itemType: string
  isRequired: boolean
  sortOrder: number
  category: string | null
  requiresPhoto: boolean
  opensIssueOnFail: boolean
  optionsText: string | null
}

type ChecklistTemplate = {
  id: string
  title: string
  description: string | null
  templateType: string
  isPrimary: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  items: TemplateItem[]
}

type PropertyInfo = {
  id: string
  code: string
  name: string
  address: string
}

type PropertyChecklistResponse = {
  property?: Partial<PropertyInfo> | null
  templates?: unknown
  primaryTemplate?: unknown
}

type PropertySupply = {
  id: string
  name: string
  code?: string | null
  isActive: boolean
  fillLevel?: string | null
}

type PropertySuppliesResponse = {
  supplies?: unknown
}

type NewItemDraft = {
  label: string
  description: string
  itemType: string
  category: string
  isRequired: boolean
  requiresPhoto: boolean
  opensIssueOnFail: boolean
  options: string[]
}

const texts = {
  el: {
    pageEyebrow: "Διαχείριση λιστών ακινήτου",
    pageTitleFallback: "Λίστες ακινήτου",
    pageSubtitle:
      "Για κάθε ακίνητο υπάρχουν μόνο δύο λίστες: μία βασική λίστα εργασιών καθαριότητας και μία λίστα αναλωσίμων που χτίζεται αυτόματα από τα ενεργά αναλώσιμα του ακινήτου.",

    backToProperty: "Επιστροφή στο ακίνητο",
    backToChecklists: "Επιστροφή στα checklists",

    loading: "Φόρτωση...",
    loadError: "Αποτυχία φόρτωσης λιστών ακινήτου.",
    saveError: "Αποτυχία δημιουργίας λίστας καθαριότητας.",
    createdSuccess: "Η βασική λίστα καθαριότητας δημιουργήθηκε επιτυχώς.",

    propertyCode: "Κωδικός",
    propertyAddress: "Διεύθυνση",

    summaryTitle: "Σύνοψη",
    cleaningSummary: "Λίστα καθαριότητας",
    suppliesSummary: "Λίστα αναλωσίμων",
    configured: "Ρυθμισμένη",
    missing: "Δεν έχει οριστεί",
    activeSupplies: "Ενεργά αναλώσιμα",

    cleaningSectionTitle: "Βασική λίστα εργασιών καθαριότητας",
    cleaningSectionSubtitle:
      "Αυτή είναι η μοναδική βασική λίστα καθαριότητας του ακινήτου και χρησιμοποιείται αυτόματα στις εργασίες όταν επιλέγεται αποστολή λίστας καθαριότητας.",
    noCleaningTitle: "Δεν έχει οριστεί ακόμη βασική λίστα καθαριότητας",
    noCleaningSubtitle:
      "Δημιούργησε τώρα τη μοναδική βασική λίστα καθαριότητας του ακινήτου.",
    createCleaningChecklist: "Δημιουργία βασικής λίστας",
    hideCreateForm: "Απόκρυψη φόρμας",
    editCleaningChecklist: "Προβολή / επεξεργασία λίστας",
    cleaningItemsCount: "Στοιχεία λίστας",
    cleaningStatus: "Κατάσταση",
    activeBadge: "Ενεργή",
    inactiveBadge: "Ανενεργή",

    suppliesSectionTitle: "Λίστα αναλωσίμων",
    suppliesSectionSubtitle:
      "Η λίστα αναλωσίμων δεν ορίζεται χειροκίνητα εδώ. Χτίζεται αυτόματα από τα ενεργά αναλώσιμα της σελίδας αναλωσίμων του ακινήτου και ανεβαίνει στην εργασία όταν επιλέγεται αποστολή λίστας αναλωσίμων.",
    manageSupplies: "Διαχείριση αναλωσίμων",
    suppliesReadyTitle: "Η λίστα αναλωσίμων είναι έτοιμη",
    suppliesReadySubtitle:
      "Η εργασία θα χρησιμοποιεί αυτόματα τα ενεργά αναλώσιμα του ακινήτου.",
    noSuppliesTitle: "Δεν υπάρχουν ενεργά αναλώσιμα",
    noSuppliesSubtitle:
      "Πήγαινε στη σελίδα αναλωσίμων και ενεργοποίησε όσα θέλεις να συμμετέχουν στη λίστα αναλωσίμων των εργασιών.",
    activeSuppliesCount: "Ενεργά αναλώσιμα",
    sampleItems: "Ενδεικτικά ενεργά στοιχεία",

    formTitle: "Νέα βασική λίστα καθαριότητας",
    formSubtitle:
      "Ορίζεις μία μοναδική βασική λίστα για το ακίνητο. Δεν δημιουργούμε βοηθητικά πρότυπα σε αυτή τη ροή.",
    checklistTitle: "Τίτλος λίστας",
    checklistTitlePlaceholder: "π.χ. Βασική λίστα καθαριότητας ακινήτου",
    checklistDescription: "Περιγραφή",
    checklistDescriptionPlaceholder:
      "Σύντομη περιγραφή της βασικής λίστας καθαριότητας.",
    checklistItems: "Στοιχεία λίστας",
    checklistItemsSubtitle:
      "Όρισε τα βήματα που θα εμφανίζονται στον συνεργάτη στην ενότητα καθαριότητας.",

    itemLabel: "Τίτλος στοιχείου",
    itemLabelPlaceholder: "π.χ. Έλεγχος κουζίνας",
    itemDescription: "Περιγραφή",
    itemDescriptionPlaceholder: "Προαιρετική επεξήγηση του βήματος.",
    itemFieldType: "Τύπος πεδίου",
    itemCategory: "Κατηγορία",
    itemCategoryPlaceholder: "π.χ. inspection",

    itemChoices: "Επιλογές",
    itemChoicesSubtitle:
      "Πρόσθεσε τις επιλογές που θα εμφανίζονται στον συνεργάτη.",
    choicePlaceholder: "π.χ. Καλή",
    addChoice: "Προσθήκη επιλογής",
    removeChoice: "Αφαίρεση επιλογής",

    required: "Υποχρεωτικό",
    requiresPhoto: "Απαιτεί φωτογραφία",
    opensIssueOnFail: "Δημιουργεί συμβάν σε αποτυχία",

    addItem: "Προσθήκη στοιχείου",
    removeItem: "Αφαίρεση",
    createChecklist: "Δημιουργία λίστας",
    creating: "Δημιουργία...",

    yesNo: "Ναι / Όχι",
    text: "Κείμενο",
    number: "Αριθμός",
    choice: "Επιλογή",
    photo: "Φωτογραφία",

    languageGreek: "Ελληνικά",
    languageEnglish: "English",
  },
  en: {
    pageEyebrow: "Property lists management",
    pageTitleFallback: "Property lists",
    pageSubtitle:
      "Each property has only two lists: one main cleaning checklist and one supplies list built automatically from the active property supplies.",

    backToProperty: "Back to property",
    backToChecklists: "Back to checklists",

    loading: "Loading...",
    loadError: "Failed to load property lists.",
    saveError: "Failed to create cleaning checklist.",
    createdSuccess: "Main cleaning checklist created successfully.",

    propertyCode: "Code",
    propertyAddress: "Address",

    summaryTitle: "Summary",
    cleaningSummary: "Cleaning checklist",
    suppliesSummary: "Supplies list",
    configured: "Configured",
    missing: "Missing",
    activeSupplies: "Active supplies",

    cleaningSectionTitle: "Main cleaning checklist",
    cleaningSectionSubtitle:
      "This is the single main cleaning checklist of the property and is used automatically in tasks when sending a cleaning checklist.",
    noCleaningTitle: "No main cleaning checklist yet",
    noCleaningSubtitle:
      "Create the single main cleaning checklist for this property.",
    createCleaningChecklist: "Create main checklist",
    hideCreateForm: "Hide form",
    editCleaningChecklist: "View / edit checklist",
    cleaningItemsCount: "Checklist items",
    cleaningStatus: "Status",
    activeBadge: "Active",
    inactiveBadge: "Inactive",

    suppliesSectionTitle: "Supplies list",
    suppliesSectionSubtitle:
      "The supplies list is not managed manually here. It is built automatically from the active supplies of the property supplies page and is attached to the task when sending the supplies list.",
    manageSupplies: "Manage supplies",
    suppliesReadyTitle: "Supplies list is ready",
    suppliesReadySubtitle:
      "The task will automatically use the active property supplies.",
    noSuppliesTitle: "There are no active supplies",
    noSuppliesSubtitle:
      "Go to the supplies page and activate the items you want to participate in the task supplies list.",
    activeSuppliesCount: "Active supplies",
    sampleItems: "Sample active items",

    formTitle: "New main cleaning checklist",
    formSubtitle:
      "You define one single main checklist for the property. We do not create support templates in this flow.",
    checklistTitle: "Checklist title",
    checklistTitlePlaceholder: "e.g. Main property cleaning checklist",
    checklistDescription: "Description",
    checklistDescriptionPlaceholder:
      "Short description of the main cleaning checklist.",
    checklistItems: "Checklist items",
    checklistItemsSubtitle:
      "Define the steps shown to the partner in the cleaning section.",

    itemLabel: "Item title",
    itemLabelPlaceholder: "e.g. Kitchen inspection",
    itemDescription: "Description",
    itemDescriptionPlaceholder: "Optional explanation for this step.",
    itemFieldType: "Field type",
    itemCategory: "Category",
    itemCategoryPlaceholder: "e.g. inspection",

    itemChoices: "Choices",
    itemChoicesSubtitle: "Add the options shown to the partner.",
    choicePlaceholder: "e.g. Good",
    addChoice: "Add choice",
    removeChoice: "Remove choice",

    required: "Required",
    requiresPhoto: "Requires photo",
    opensIssueOnFail: "Creates issue on failure",

    addItem: "Add item",
    removeItem: "Remove",
    createChecklist: "Create checklist",
    creating: "Creating...",

    yesNo: "Yes / No",
    text: "Text",
    number: "Number",
    choice: "Choice",
    photo: "Photo",

    languageGreek: "Ελληνικά",
    languageEnglish: "English",
  },
} satisfies Record<Language, Record<string, string>>

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "el"

  const url = new URL(window.location.href)
  const lang = url.searchParams.get("lang")
  if (lang === "el" || lang === "en") return lang

  const saved = window.localStorage.getItem("ops-language")
  if (saved === "el" || saved === "en") return saved

  return "el"
}

function normalizeTemplateItem(
  item: unknown,
  index: number,
  parentId: string
): TemplateItem {
  const raw = (item ?? {}) as Record<string, unknown>

  return {
    id: String(raw.id ?? `${parentId}-${index}`),
    label: String(raw.label ?? ""),
    description:
      raw.description === null || raw.description === undefined
        ? null
        : String(raw.description),
    itemType: String(raw.itemType ?? "boolean"),
    isRequired: Boolean(raw.isRequired ?? false),
    sortOrder: Number(raw.sortOrder ?? index + 1),
    category:
      raw.category === null || raw.category === undefined
        ? null
        : String(raw.category),
    requiresPhoto: Boolean(raw.requiresPhoto ?? false),
    opensIssueOnFail: Boolean(raw.opensIssueOnFail ?? false),
    optionsText:
      raw.optionsText === null || raw.optionsText === undefined
        ? null
        : String(raw.optionsText),
  }
}

function normalizeTemplate(rawValue: unknown): ChecklistTemplate {
  const raw = (rawValue ?? {}) as Record<string, unknown>
  const itemsRaw = Array.isArray(raw.items) ? raw.items : []
  const templateId = String(raw.id ?? "")

  return {
    id: templateId,
    title: String(raw.title ?? ""),
    description:
      raw.description === null || raw.description === undefined
        ? null
        : String(raw.description),
    templateType: String(raw.templateType ?? "main"),
    isPrimary: Boolean(raw.isPrimary ?? false),
    isActive: Boolean(raw.isActive ?? false),
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    items: itemsRaw
      .map((item: unknown, index: number) =>
        normalizeTemplateItem(item, index, templateId || "template")
      )
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

function normalizeSupply(rawValue: unknown): PropertySupply | null {
  const raw = (rawValue ?? {}) as Record<string, unknown>
  const id = String(raw.id ?? "").trim()
  const name = String(raw.name ?? raw.title ?? "").trim()

  if (!id || !name) return null

  return {
    id,
    name,
    code:
      raw.code === null || raw.code === undefined ? null : String(raw.code),
    isActive: Boolean(raw.isActive ?? false),
    fillLevel:
      raw.fillLevel === null || raw.fillLevel === undefined
        ? null
        : String(raw.fillLevel),
  }
}

function buildEmptyItem(): NewItemDraft {
  return {
    label: "",
    description: "",
    itemType: "boolean",
    category: "inspection",
    isRequired: true,
    requiresPhoto: false,
    opensIssueOnFail: false,
    options: [""],
  }
}

function joinOptions(options: string[]) {
  return options
    .map((option) => option.trim())
    .filter(Boolean)
    .join(", ")
}

export default function PropertyChecklistsPage({
  params,
}: {
  params: PageParams
}) {
  const { propertyId } = use(params)

  const [language, setLanguage] = useState<Language>("el")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const [property, setProperty] = useState<PropertyInfo | null>(null)
  const [primaryTemplate, setPrimaryTemplate] = useState<ChecklistTemplate | null>(
    null
  )
  const [activeSupplies, setActiveSupplies] = useState<PropertySupply[]>([])

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [templateTitle, setTemplateTitle] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [items, setItems] = useState<NewItemDraft[]>([buildEmptyItem()])

  const t = texts[language]

  useEffect(() => {
    setLanguage(getInitialLanguage())
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const url = new URL(window.location.href)
    url.searchParams.set("lang", language)
    window.history.replaceState({}, "", url.toString())
    window.localStorage.setItem("ops-language", language)
  }, [language])

  async function loadData() {
    try {
      setLoading(true)
      setError("")

      const [checklistsResponse, suppliesResponse] = await Promise.all([
        fetch(`/api/property-checklists/${propertyId}`, {
          method: "GET",
          cache: "no-store",
        }),
        fetch(`/api/properties/${propertyId}/supplies`, {
          method: "GET",
          cache: "no-store",
        }),
      ])

      const checklistData: PropertyChecklistResponse =
        await checklistsResponse.json()
      const suppliesData: PropertySuppliesResponse = await suppliesResponse.json()

      if (!checklistsResponse.ok) {
        throw new Error(
          typeof (checklistData as { error?: unknown })?.error === "string"
            ? (checklistData as { error?: string }).error
            : t.loadError
        )
      }

      const rawProperty = checklistData?.property ?? null
      const rawPrimaryTemplate = checklistData?.primaryTemplate ?? null
      const rawSupplies = Array.isArray(suppliesData?.supplies)
        ? suppliesData.supplies
        : []

      const normalizedSupplies = rawSupplies
        .map((supply: unknown) => normalizeSupply(supply))
        .filter((supply): supply is PropertySupply => supply !== null)
        .filter((supply) => supply.isActive)

      setProperty({
        id: String(rawProperty?.id ?? propertyId),
        code: String(rawProperty?.code ?? ""),
        name: String(rawProperty?.name ?? ""),
        address: String(rawProperty?.address ?? ""),
      })

      setPrimaryTemplate(
        rawPrimaryTemplate ? normalizeTemplate(rawPrimaryTemplate) : null
      )
      setActiveSupplies(normalizedSupplies)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId])

  const suppliesPreview = useMemo(() => activeSupplies.slice(0, 6), [activeSupplies])

  function resetForm() {
    setTemplateTitle("")
    setTemplateDescription("")
    setItems([buildEmptyItem()])
  }

  function addItem() {
    setItems((prev) => [...prev, buildEmptyItem()])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem<K extends keyof NewItemDraft>(
    index: number,
    field: K,
    value: NewItemDraft[K]
  ) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        return {
          ...item,
          [field]: value,
        }
      })
    )
  }

  function addChoice(itemIndex: number) {
    setItems((prev) =>
      prev.map((item, index) => {
        if (index !== itemIndex) return item
        return {
          ...item,
          options: [...item.options, ""],
        }
      })
    )
  }

  function removeChoice(itemIndex: number, choiceIndex: number) {
    setItems((prev) =>
      prev.map((item, index) => {
        if (index !== itemIndex) return item

        const nextOptions = item.options.filter((_, i) => i !== choiceIndex)

        return {
          ...item,
          options: nextOptions.length > 0 ? nextOptions : [""],
        }
      })
    )
  }

  function updateChoice(itemIndex: number, choiceIndex: number, value: string) {
    setItems((prev) =>
      prev.map((item, index) => {
        if (index !== itemIndex) return item

        return {
          ...item,
          options: item.options.map((choice, i) =>
            i === choiceIndex ? value : choice
          ),
        }
      })
    )
  }

  async function handleCreateChecklist(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    try {
      setSaving(true)
      setError("")
      setSuccessMessage("")

      const payload = {
        title: templateTitle,
        description: templateDescription,
        templateType: "main",
        isPrimary: true,
        isActive: true,
        items: items.map((item, index) => ({
          label: item.label,
          description: item.description,
          itemType: item.itemType,
          isRequired: item.isRequired,
          sortOrder: index + 1,
          category: item.category,
          requiresPhoto: item.requiresPhoto,
          opensIssueOnFail: item.opensIssueOnFail,
          optionsText:
            item.itemType === "choice" ? joinOptions(item.options) : "",
        })),
      }

      const response = await fetch(`/api/property-checklists/${propertyId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : t.saveError
        )
      }

      resetForm()
      setSuccessMessage(t.createdSuccess)
      setShowCreateForm(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        {t.loading}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">{t.pageEyebrow}</p>

          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              {property?.name || t.pageTitleFallback}
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              {t.pageSubtitle}
            </p>

            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
              {property?.code ? (
                <span>{t.propertyCode}: {property.code}</span>
              ) : null}
              {property?.address ? <span>• {property.address}</span> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setLanguage("el")}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                language === "el"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {t.languageGreek}
            </button>

            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                language === "en"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {t.languageEnglish}
            </button>
          </div>

          <Link
            href="/checklists"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {t.backToChecklists}
          </Link>

          <Link
            href={`/properties/${propertyId}`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {t.backToProperty}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title={t.cleaningSummary}
          value={primaryTemplate ? t.configured : t.missing}
        />
        <SummaryCard
          title={t.suppliesSummary}
          value={activeSupplies.length > 0 ? t.configured : t.missing}
        />
        <SummaryCard
          title={t.activeSupplies}
          value={String(activeSupplies.length)}
        />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {t.cleaningSectionTitle}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              {t.cleaningSectionSubtitle}
            </p>
          </div>

          {primaryTemplate ? (
            <Link
              href={`/property-checklists/${propertyId}/templates/${primaryTemplate.id}?lang=${language}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t.editCleaningChecklist}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {showCreateForm ? t.hideCreateForm : t.createCleaningChecklist}
            </button>
          )}
        </div>

        {primaryTemplate ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900">
                {primaryTemplate.title}
              </h3>

              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  primaryTemplate.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-600"
                )}
              >
                {primaryTemplate.isActive ? t.activeBadge : t.inactiveBadge}
              </span>
            </div>

            {primaryTemplate.description ? (
              <p className="mt-3 text-sm text-slate-600">
                {primaryTemplate.description}
              </p>
            ) : null}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InfoCard
                label={t.cleaningItemsCount}
                value={String(primaryTemplate.items.length)}
              />
              <InfoCard
                label={t.cleaningStatus}
                value={primaryTemplate.isActive ? t.activeBadge : t.inactiveBadge}
              />
            </div>

            {primaryTemplate.items.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-sm font-semibold text-slate-800">
                  {t.checklistItems}
                </p>

                <div className="space-y-2">
                  {primaryTemplate.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">
                          {index + 1}. {item.label}
                        </span>

                        {item.isRequired ? (
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
                            {t.required}
                          </span>
                        ) : null}

                        {item.requiresPhoto ? (
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
                            {t.requiresPhoto}
                          </span>
                        ) : null}
                      </div>

                      {item.description ? (
                        <p className="mt-2 text-sm text-slate-600">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-base font-semibold text-amber-900">
                {t.noCleaningTitle}
              </h3>
              <p className="mt-2 text-sm text-amber-800">
                {t.noCleaningSubtitle}
              </p>
            </div>

            {showCreateForm ? (
              <form onSubmit={handleCreateChecklist} className="mt-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {t.formTitle}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {t.formSubtitle}
                  </p>
                </div>

                <div className="grid gap-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t.checklistTitle}
                    </label>
                    <input
                      value={templateTitle}
                      onChange={(e) => setTemplateTitle(e.target.value)}
                      placeholder={t.checklistTitlePlaceholder}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {t.checklistDescription}
                    </label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder={t.checklistDescriptionPlaceholder}
                      className="min-h-[120px] w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">
                      {t.checklistItems}
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                      {t.checklistItemsSubtitle}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div
                        key={`new-item-${index}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-700">
                            #{index + 1}
                          </p>

                          {items.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                            >
                              {t.removeItem}
                            </button>
                          ) : null}
                        </div>

                        <div className="grid gap-4">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              {t.itemLabel}
                            </label>
                            <input
                              value={item.label}
                              onChange={(e) =>
                                updateItem(index, "label", e.target.value)
                              }
                              placeholder={t.itemLabelPlaceholder}
                              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              required
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              {t.itemDescription}
                            </label>
                            <textarea
                              value={item.description}
                              onChange={(e) =>
                                updateItem(index, "description", e.target.value)
                              }
                              placeholder={t.itemDescriptionPlaceholder}
                              className="min-h-[100px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700">
                                {t.itemFieldType}
                              </label>
                              <select
                                value={item.itemType}
                                onChange={(e) =>
                                  updateItem(index, "itemType", e.target.value)
                                }
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              >
                                <option value="boolean">{t.yesNo}</option>
                                <option value="text">{t.text}</option>
                                <option value="number">{t.number}</option>
                                <option value="choice">{t.choice}</option>
                                <option value="photo">{t.photo}</option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700">
                                {t.itemCategory}
                              </label>
                              <input
                                value={item.category}
                                onChange={(e) =>
                                  updateItem(index, "category", e.target.value)
                                }
                                placeholder={t.itemCategoryPlaceholder}
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              />
                            </div>
                          </div>

                          {item.itemType === "choice" ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="mb-3">
                                <h5 className="text-sm font-semibold text-slate-800">
                                  {t.itemChoices}
                                </h5>
                                <p className="mt-1 text-xs text-slate-500">
                                  {t.itemChoicesSubtitle}
                                </p>
                              </div>

                              <div className="space-y-3">
                                {item.options.map((choice, choiceIndex) => (
                                  <div
                                    key={`item-${index}-choice-${choiceIndex}`}
                                    className="flex items-center gap-3"
                                  >
                                    <input
                                      value={choice}
                                      onChange={(e) =>
                                        updateChoice(
                                          index,
                                          choiceIndex,
                                          e.target.value
                                        )
                                      }
                                      placeholder={t.choicePlaceholder}
                                      className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeChoice(index, choiceIndex)
                                      }
                                      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                    >
                                      {t.removeChoice}
                                    </button>
                                  </div>
                                ))}

                                <button
                                  type="button"
                                  onClick={() => addChoice(index)}
                                  className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                >
                                  {t.addChoice}
                                </button>
                              </div>
                            </div>
                          ) : null}

                          <div className="grid gap-3 md:grid-cols-3">
                            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                              <input
                                type="checkbox"
                                checked={item.isRequired}
                                onChange={(e) =>
                                  updateItem(index, "isRequired", e.target.checked)
                                }
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              <span className="text-sm text-slate-700">
                                {t.required}
                              </span>
                            </label>

                            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                              <input
                                type="checkbox"
                                checked={item.requiresPhoto}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "requiresPhoto",
                                    e.target.checked
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              <span className="text-sm text-slate-700">
                                {t.requiresPhoto}
                              </span>
                            </label>

                            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                              <input
                                type="checkbox"
                                checked={item.opensIssueOnFail}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "opensIssueOnFail",
                                    e.target.checked
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              <span className="text-sm text-slate-700">
                                {t.opensIssueOnFail}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={addItem}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      {t.addItem}
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {saving ? t.creating : t.createChecklist}
                    </button>
                  </div>
                </div>
              </form>
            ) : null}
          </>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {t.suppliesSectionTitle}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              {t.suppliesSectionSubtitle}
            </p>
          </div>

          <Link
            href={`/properties/${propertyId}/supplies`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {t.manageSupplies}
          </Link>
        </div>

        {activeSupplies.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="text-base font-semibold text-emerald-900">
              {t.suppliesReadyTitle}
            </h3>
            <p className="mt-2 text-sm text-emerald-800">
              {t.suppliesReadySubtitle}
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InfoCard
                label={t.activeSuppliesCount}
                value={String(activeSupplies.length)}
              />
              <InfoCard
                label={t.suppliesSummary}
                value={t.configured}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-slate-800">
                {t.sampleItems}
              </p>

              <div className="flex flex-wrap gap-2">
                {suppliesPreview.map((supply) => (
                  <span
                    key={supply.id}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {supply.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="text-base font-semibold text-amber-900">
              {t.noSuppliesTitle}
            </h3>
            <p className="mt-2 text-sm text-amber-800">
              {t.noSuppliesSubtitle}
            </p>
          </div>
        )}
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}
    </div>
  )
}

function SummaryCard({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  )
}

function InfoCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}