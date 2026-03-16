"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"

type Language = "el" | "en"
type TemplateFilter = "all" | "primary" | "active" | "inactive"

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
    pageEyebrow: "Πρότυπα λίστας καθαριότητας ακινήτου",
    pageTitleFallback: "Λίστα καθαριότητας ακινήτου",
    pageSubtitle:
      "Εδώ διαχειρίζεσαι μόνο τη λογική των προτύπων καθαριότητας του ακινήτου. Τα αναλώσιμα διαχειρίζονται ξεχωριστά από τη σελίδα αναλωσίμων και όχι ως checklist templates.",
    backToChecklists: "Επιστροφή στα checklists",
    backToProperty: "Επιστροφή στο ακίνητο",

    totalTemplates: "Σύνολο προτύπων",
    primaryTemplates: "Κύρια πρότυπα",
    activeTemplates: "Ενεργά πρότυπα",
    inactiveTemplates: "Ανενεργά πρότυπα",

    filterAllSubtitle: "Όλα τα πρότυπα καθαριότητας του ακινήτου",
    filterPrimarySubtitle: "Μόνο το κύριο πρότυπο",
    filterActiveSubtitle: "Μόνο τα ενεργά πρότυπα",
    filterInactiveSubtitle: "Μόνο τα ανενεργά πρότυπα",

    showNewTemplate: "Νέο πρότυπο",
    hideNewTemplate: "Απόκρυψη φόρμας",

    newTemplateTitle: "Νέο πρότυπο καθαριότητας",
    newTemplateSubtitle:
      "Δημιούργησε νέο πρότυπο για τη βασική ροή καθαριότητας ή για ειδικές βοηθητικές περιπτώσεις καθαριότητας / επιθεώρησης.",

    templateTitle: "Τίτλος προτύπου",
    templateTitlePlaceholder: "π.χ. Βασική λίστα εργασιών ακινήτου",

    templateDescription: "Περιγραφή",
    templateDescriptionPlaceholder:
      "Σύντομη περιγραφή της χρήσης του προτύπου.",

    templateType: "Τύπος προτύπου",
    activeStatus: "Κατάσταση",
    setAsPrimary: "Ορισμός ως κύριο πρότυπο του ακινήτου",

    checklistItems: "Στοιχεία λίστας",
    checklistItemsSubtitle:
      "Όρισε τα βήματα που θα εκτελούνται σε κάθε εκτέλεση της λίστας καθαριότητας.",

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
    createTemplate: "Δημιουργία προτύπου",
    creating: "Δημιουργία...",

    existingTemplates: "Υπάρχοντα πρότυπα",
    existingTemplatesSubtitle:
      "Εδώ εμφανίζονται μόνο τα πρότυπα καθαριότητας του ακινήτου. Τα παλιά πρότυπα αναλωσίμων αποκλείονται από αυτή τη σελίδα.",
    noTemplates: "Δεν υπάρχουν πρότυπα για αυτό το ακίνητο.",
    noTemplatesForFilter: "Δεν υπάρχουν πρότυπα για το συγκεκριμένο φίλτρο.",

    viewTemplate: "Προβολή",

    primaryBadge: "Κύριο πρότυπο",
    helperBadge: "Βοηθητικό πρότυπο",
    activeBadge: "Ενεργό",
    inactiveBadge: "Ανενεργό",

    itemsCount: "Στοιχεία",

    loading: "Φόρτωση...",
    loadError: "Αποτυχία φόρτωσης προτύπων checklist.",
    saveError: "Αποτυχία δημιουργίας προτύπου checklist.",
    createdSuccess: "Το πρότυπο δημιουργήθηκε επιτυχώς.",

    yesNo: "Ναι / Όχι",
    text: "Κείμενο",
    number: "Αριθμός",
    choice: "Επιλογή",
    photo: "Φωτογραφία",

    mainType: "Κύριο πρότυπο",
    supportType: "Βοηθητικό πρότυπο",

    activeLabel: "Ενεργό",
    inactiveLabel: "Ανενεργό",

    languageGreek: "Ελληνικά",
    languageEnglish: "English",
  },
  en: {
    pageEyebrow: "Property cleaning checklist templates",
    pageTitleFallback: "Property cleaning checklist",
    pageSubtitle:
      "Manage only the cleaning checklist logic of the property here. Supplies are managed separately in the supplies page and not as checklist templates.",
    backToChecklists: "Back to checklists",
    backToProperty: "Back to property",

    totalTemplates: "Total templates",
    primaryTemplates: "Primary templates",
    activeTemplates: "Active templates",
    inactiveTemplates: "Inactive templates",

    filterAllSubtitle: "All cleaning templates for this property",
    filterPrimarySubtitle: "Only the primary template",
    filterActiveSubtitle: "Only active templates",
    filterInactiveSubtitle: "Only inactive templates",

    showNewTemplate: "New template",
    hideNewTemplate: "Hide form",

    newTemplateTitle: "New cleaning template",
    newTemplateSubtitle:
      "Create a new template for the main cleaning workflow or for helper cleaning / inspection cases.",

    templateTitle: "Template title",
    templateTitlePlaceholder: "e.g. Main property cleaning list",

    templateDescription: "Description",
    templateDescriptionPlaceholder: "Short description of this template.",

    templateType: "Template type",
    activeStatus: "Status",
    setAsPrimary: "Set as primary template for this property",

    checklistItems: "Checklist items",
    checklistItemsSubtitle:
      "Define the steps that will run each time this cleaning checklist is executed.",

    itemLabel: "Item title",
    itemLabelPlaceholder: "e.g. Kitchen inspection",

    itemDescription: "Description",
    itemDescriptionPlaceholder: "Optional explanation for this step.",

    itemFieldType: "Field type",
    itemCategory: "Category",
    itemCategoryPlaceholder: "e.g. inspection",

    itemChoices: "Choices",
    itemChoicesSubtitle:
      "Add the options that will be shown to the partner.",
    choicePlaceholder: "e.g. Good",
    addChoice: "Add choice",
    removeChoice: "Remove choice",

    required: "Required",
    requiresPhoto: "Requires photo",
    opensIssueOnFail: "Creates issue on failure",

    addItem: "Add item",
    removeItem: "Remove",
    createTemplate: "Create template",
    creating: "Creating...",

    existingTemplates: "Existing templates",
    existingTemplatesSubtitle:
      "Only property cleaning templates are shown here. Legacy supplies templates are excluded from this page.",
    noTemplates: "There are no templates for this property.",
    noTemplatesForFilter: "There are no templates for this filter.",

    viewTemplate: "View",

    primaryBadge: "Primary template",
    helperBadge: "Support template",
    activeBadge: "Active",
    inactiveBadge: "Inactive",

    itemsCount: "Items",

    loading: "Loading...",
    loadError: "Failed to load checklist templates.",
    saveError: "Failed to create checklist template.",
    createdSuccess: "Template created successfully.",

    yesNo: "Yes / No",
    text: "Text",
    number: "Number",
    choice: "Choice",
    photo: "Photo",

    mainType: "Main template",
    supportType: "Support template",

    activeLabel: "Active",
    inactiveLabel: "Inactive",

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
    items: itemsRaw.map((item: unknown, index: number) =>
      normalizeTemplateItem(item, index, templateId || "template")
    ),
  }
}

function getTemplateTypeLabel(templateType: string, language: Language) {
  const t = texts[language]
  const normalized = String(templateType).toLowerCase()

  if (normalized === "main" || normalized === "core") {
    return t.mainType
  }

  return t.supportType
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
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [activeFilter, setActiveFilter] = useState<TemplateFilter>("all")
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [templateTitle, setTemplateTitle] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [templateType, setTemplateType] = useState("main")
  const [isPrimary, setIsPrimary] = useState(true)
  const [isActive, setIsActive] = useState(true)

  const [items, setItems] = useState<NewItemDraft[]>([
    {
      label: "",
      description: "",
      itemType: "boolean",
      category: "inspection",
      isRequired: true,
      requiresPhoto: false,
      opensIssueOnFail: false,
      options: [""],
    },
  ])

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

      const response = await fetch(`/api/property-checklists/${propertyId}`, {
        method: "GET",
        cache: "no-store",
      })

      const data: PropertyChecklistResponse = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof (data as { error?: unknown })?.error === "string"
            ? (data as { error?: string }).error
            : t.loadError
        )
      }

      const rawTemplates = Array.isArray(data?.templates) ? data.templates : []

      const normalizedTemplates = rawTemplates
        .map((template: unknown) => normalizeTemplate(template))
        .sort((a: ChecklistTemplate, b: ChecklistTemplate) => {
          if (a.isPrimary && !b.isPrimary) return -1
          if (!a.isPrimary && b.isPrimary) return 1
          if (a.isActive && !b.isActive) return -1
          if (!a.isActive && b.isActive) return 1
          return a.title.localeCompare(b.title, "el")
        })

      const rawProperty = data?.property ?? null

      setProperty({
        id: String(rawProperty?.id ?? propertyId),
        code: String(rawProperty?.code ?? ""),
        name: String(rawProperty?.name ?? ""),
        address: String(rawProperty?.address ?? ""),
      })
      setTemplates(normalizedTemplates)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, language])

  const totalCount = templates.length
  const primaryCount = templates.filter((template) => template.isPrimary).length
  const activeCount = templates.filter((template) => template.isActive).length
  const inactiveCount = templates.filter((template) => !template.isActive).length

  const filteredTemplates = useMemo(() => {
    if (activeFilter === "primary") {
      return templates.filter((template) => template.isPrimary)
    }

    if (activeFilter === "active") {
      return templates.filter((template) => template.isActive)
    }

    if (activeFilter === "inactive") {
      return templates.filter((template) => !template.isActive)
    }

    return templates
  }, [templates, activeFilter])

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        label: "",
        description: "",
        itemType: "boolean",
        category: "inspection",
        isRequired: true,
        requiresPhoto: false,
        opensIssueOnFail: false,
        options: [""],
      },
    ])
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

  async function handleCreateTemplate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    try {
      setSaving(true)
      setError("")
      setSuccessMessage("")

      const payload = {
        title: templateTitle,
        description: templateDescription,
        templateType,
        isPrimary,
        isActive,
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

      setTemplateTitle("")
      setTemplateDescription("")
      setTemplateType("main")
      setIsPrimary(true)
      setIsActive(true)
      setItems([
        {
          label: "",
          description: "",
          itemType: "boolean",
          category: "inspection",
          isRequired: true,
          requiresPhoto: false,
          opensIssueOnFail: false,
          options: [""],
        },
      ])

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
            <p className="mt-3 text-sm text-slate-500">
              {[property?.code, property?.address].filter(Boolean).join(" • ")}
            </p>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FilterCard
          title={t.totalTemplates}
          value={totalCount}
          subtitle={t.filterAllSubtitle}
          active={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
        />
        <FilterCard
          title={t.primaryTemplates}
          value={primaryCount}
          subtitle={t.filterPrimarySubtitle}
          active={activeFilter === "primary"}
          onClick={() => setActiveFilter("primary")}
        />
        <FilterCard
          title={t.activeTemplates}
          value={activeCount}
          subtitle={t.filterActiveSubtitle}
          active={activeFilter === "active"}
          onClick={() => setActiveFilter("active")}
        />
        <FilterCard
          title={t.inactiveTemplates}
          value={inactiveCount}
          subtitle={t.filterInactiveSubtitle}
          active={activeFilter === "inactive"}
          onClick={() => setActiveFilter("inactive")}
        />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {t.newTemplateTitle}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              {t.newTemplateSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {showCreateForm ? t.hideNewTemplate : t.showNewTemplate}
          </button>
        </div>

        {showCreateForm ? (
          <form onSubmit={handleCreateTemplate} className="mt-6 space-y-6">
            <div className="grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t.templateTitle}
                </label>
                <input
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  placeholder={t.templateTitlePlaceholder}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t.templateDescription}
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder={t.templateDescriptionPlaceholder}
                  className="min-h-[120px] w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t.templateType}
                  </label>
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="main">{t.mainType}</option>
                    <option value="support">{t.supportType}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t.activeStatus}
                  </label>
                  <select
                    value={isActive ? "active" : "inactive"}
                    onChange={(e) => setIsActive(e.target.value === "active")}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="active">{t.activeLabel}</option>
                    <option value="inactive">{t.inactiveLabel}</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">{t.setAsPrimary}</span>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {t.checklistItems}
                </h3>
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
                            <h4 className="text-sm font-semibold text-slate-800">
                              {t.itemChoices}
                            </h4>
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
                                    updateChoice(index, choiceIndex, e.target.value)
                                  }
                                  placeholder={t.choicePlaceholder}
                                  className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />

                                <button
                                  type="button"
                                  onClick={() => removeChoice(index, choiceIndex)}
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
                              updateItem(index, "requiresPhoto", e.target.checked)
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
                              updateItem(index, "opensIssueOnFail", e.target.checked)
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
                  {saving ? t.creating : t.createTemplate}
                </button>
              </div>
            </div>
          </form>
        ) : null}
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

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">
            {t.existingTemplates}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {t.existingTemplatesSubtitle}
          </p>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
            {t.noTemplates}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
            {t.noTemplatesForFilter}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {template.title}
                      </h3>

                      {template.isPrimary ? (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {t.primaryBadge}
                        </span>
                      ) : (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {t.helperBadge}
                        </span>
                      )}

                      <span
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          template.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        )}
                      >
                        {template.isActive ? t.activeBadge : t.inactiveBadge}
                      </span>

                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        {getTemplateTypeLabel(template.templateType, language)}
                      </span>
                    </div>

                    {template.description ? (
                      <p className="mt-3 text-sm text-slate-600">
                        {template.description}
                      </p>
                    ) : null}

                    <p className="mt-3 text-sm text-slate-500">
                      {t.itemsCount}: {template.items.length}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      href={`/property-checklists/${propertyId}/templates/${template.id}?lang=${language}`}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      {t.viewTemplate}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function FilterCard({
  title,
  value,
  subtitle,
  active,
  onClick,
}: {
  title: string
  value: number
  subtitle: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-3xl border p-5 text-left shadow-sm transition",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <p
        className={cn(
          "text-sm font-medium",
          active ? "text-white/80" : "text-slate-600"
        )}
      >
        {title}
      </p>
      <p className="mt-3 text-4xl font-bold tracking-tight">{value}</p>
      <p
        className={cn(
          "mt-2 text-sm",
          active ? "text-white/80" : "text-slate-500"
        )}
      >
        {subtitle}
      </p>
    </button>
  )
}