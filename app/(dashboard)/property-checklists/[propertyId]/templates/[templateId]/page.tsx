"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type PageParams = Promise<{
  propertyId: string
  templateId: string
}>

type PropertyInfo = {
  id: string
  code?: string | null
  name?: string | null
  address?: string | null
}

type ActiveSupplyRow = {
  propertySupplyId: string
  currentStock: number
  targetStock?: number | null
  reorderThreshold?: number | null
  lastUpdatedAt?: string | null
  supplyItem: {
    id: string
    code: string
    name: string
    category: string
    unit: string
    minimumStock?: number | null
    isActive: boolean
  }
}

type TemplateResponse = {
  id: string
  title?: string | null
  description?: string | null
  templateType?: string | null
  isPrimary?: boolean
  isActive?: boolean
  items?: any[]
  property?: PropertyInfo | null
  activeSupplies?: ActiveSupplyRow[]
}

type ItemDraft = {
  id?: string
  label: string
  description: string
  itemType: string
  isRequired: boolean
  sortOrder: number
  category: string
  requiresPhoto: boolean
  opensIssueOnFail: boolean
  options: string[]

  issueTypeOnFail: string
  issueSeverityOnFail: string
  failureValuesText: string

  linkedSupplyItemId: string
  supplyUpdateMode: string
  supplyQuantity: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function parseOptions(optionsText?: string | null) {
  if (!optionsText) return [""]

  const parsed = optionsText
    .split(/\r?\n|,/)
    .map((value) => String(value).trim())
    .filter(Boolean)

  return parsed.length > 0 ? parsed : [""]
}

function joinOptions(options: string[]) {
  return options
    .map((option) => option.trim())
    .filter(Boolean)
    .join("\n")
}

function normalizeItem(raw: any, index: number): ItemDraft {
  const linkedSupplyItemId =
    raw?.linkedSupplyItemId === null || raw?.linkedSupplyItemId === undefined
      ? ""
      : String(raw.linkedSupplyItemId)

  const normalizedCategory =
    raw?.category === null || raw?.category === undefined
      ? "inspection"
      : String(raw.category)

  const isSupplyLinked = Boolean(linkedSupplyItemId)

  return {
    id: raw?.id ? String(raw.id) : undefined,
    label: String(raw?.label ?? ""),
    description:
      raw?.description === null || raw?.description === undefined
        ? ""
        : String(raw.description),
    itemType: isSupplyLinked
      ? "select"
      : String(raw?.itemType ?? "boolean").toLowerCase(),
    isRequired: isSupplyLinked ? true : Boolean(raw?.isRequired ?? true),
    sortOrder: Number(raw?.sortOrder ?? index + 1),
    category: isSupplyLinked ? "supplies" : normalizedCategory,
    requiresPhoto: isSupplyLinked ? false : Boolean(raw?.requiresPhoto ?? false),
    opensIssueOnFail: isSupplyLinked
      ? false
      : Boolean(raw?.opensIssueOnFail ?? false),
    options: isSupplyLinked
      ? ["missing", "medium", "full"]
      : parseOptions(raw?.optionsText),

    issueTypeOnFail: String(raw?.issueTypeOnFail ?? "repair").toLowerCase(),
    issueSeverityOnFail: String(raw?.issueSeverityOnFail ?? "medium").toLowerCase(),
    failureValuesText:
      raw?.failureValuesText === null || raw?.failureValuesText === undefined
        ? ""
        : String(raw.failureValuesText),

    linkedSupplyItemId,
    supplyUpdateMode: isSupplyLinked
      ? "status_map"
      : String(raw?.supplyUpdateMode ?? "none").toLowerCase(),
    supplyQuantity:
      raw?.supplyQuantity === null || raw?.supplyQuantity === undefined
        ? ""
        : String(raw.supplyQuantity),
  }
}

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      pageEyebrow: "Checklist template",
      pageTitleFallback: "Checklist template",
      pageSubtitle:
        "Configure checklist items, active supply mapping and issue reporting for this property.",

      backToTemplates: "Back to templates",
      backToProperty: "Back to property",

      loading: "Loading...",
      loadError: "Failed to load checklist template.",
      saveError: "Failed to save checklist template.",
      saveSuccess: "Template saved successfully.",
      saving: "Saving...",
      save: "Save changes",

      templateInfo: "Template details",
      templateTitle: "Template title",
      templateTitlePlaceholder: "e.g. Main readiness checklist",
      templateDescription: "Description",
      templateDescriptionPlaceholder: "Short template description.",
      setAsPrimary: "Set as primary property template",

      templateType: "Template type",
      templateStatus: "Status",
      mainType: "Main template",
      supportType: "Support template",
      activeStatus: "Active",
      inactiveStatus: "Inactive",

      primaryBadge: "Primary",
      helperBadge: "Support",
      activeBadge: "Active",
      inactiveBadge: "Inactive",

      propertySection: "Property",
      itemsSection: "Checklist items",
      itemsSubtitle:
        "Configure checklist behavior, supply mapping and issue reporting.",

      itemLabel: "Item title",
      itemLabelPlaceholder: "e.g. Kitchen inspection",
      itemDescription: "Description",
      itemDescriptionPlaceholder: "Optional explanation for the partner.",
      itemFieldType: "Field type",
      itemCategory: "Category",
      itemCategoryPlaceholder: "e.g. inspection",

      itemChoices: "Choices",
      itemChoicesSubtitle: "Add the possible field options.",
      choicePlaceholder: "e.g. Good",
      addChoice: "Add choice",
      removeChoice: "Remove choice",

      required: "Required",
      requiresPhoto: "Requires photo",
      opensIssueOnFail: "Create issue on failure",

      issueRules: "Issue rules",
      issueTypeOnFail: "Issue type",
      issueSeverityOnFail: "Issue severity",
      failureValuesText: "Failure values",
      failureValuesPlaceholder: "e.g. fail, broken, damaged",

      supplyRules: "Supply rules",
      linkedSupplyItemId: "Linked supply item",
      supplyUpdateMode: "Supply update mode",
      supplyQuantity: "Supply quantity",
      supplyQuantityPlaceholder: "e.g. 2",

      activeSuppliesTitle: "Active property supplies",
      activeSuppliesSubtitle:
        "Add active property supplies to the checklist with automatic Missing / Medium / Full logic.",
      noActiveSupplies:
        "There are no active supplies for this property yet. First activate supplies from the property supplies page.",
      addSupplyItem: "Add to checklist",
      alreadyLinked: "Already linked",
      supplyLinkedLabel: "Linked supply item",
      supplyStatusMapLabel: "Automatic status_map",
      stockLabel: "Stock",

      issueReportTitle: "Issue / damage reporting",
      issueReportSubtitle:
        "Add a ready-made checklist field so the partner can report a damage or issue directly from the task checklist.",
      addIssueReportField: "Add issue report field",
      issueReportDefaultLabel: "Issue / damage report",
      issueReportDefaultDescription:
        "If the partner writes something here, a property issue will be created on checklist submit.",

      generalItemsTitle: "General checklist items",
      generalItemsSubtitle:
        "Use these for inspection, cleaning, notes and any non-supply item.",
      addItem: "Add general item",
      removeItem: "Remove",

      yesNo: "Yes / No",
      text: "Text",
      number: "Number",
      choice: "Choice",
      select: "Select",
      photo: "Photo",

      damage: "Damage",
      repair: "Repair",
      supplies: "Supplies",
      inspection: "Inspection",
      cleaning: "Cleaning",
      general: "General",

      low: "Low",
      medium: "Medium",
      high: "High",
      critical: "Critical",

      itemsCount: "Items",
      templateId: "Template ID",
      noItems: "There are no items in this template.",

      propertyName: "Name",
      propertyCode: "Code",
      propertyAddress: "Address",

      supplyMissing: "Missing",
      supplyMedium: "Medium",
      supplyFull: "Full",
      issueReportBadge: "Issue report field",
      categoryIssueReport: "Issue report",
      noDescription: "No description",
    }
  }

  return {
    pageEyebrow: "Πρότυπο checklist",
    pageTitleFallback: "Πρότυπο checklist",
    pageSubtitle:
      "Ρύθμισε τα στοιχεία της λίστας, τη σύνδεση με ενεργά αναλώσιμα και την αναφορά βλάβης / ζημιάς για αυτό το ακίνητο.",

    backToTemplates: "Επιστροφή στα πρότυπα",
    backToProperty: "Επιστροφή στο ακίνητο",

    loading: "Φόρτωση...",
    loadError: "Αποτυχία φόρτωσης προτύπου checklist.",
    saveError: "Αποτυχία αποθήκευσης προτύπου checklist.",
    saveSuccess: "Το πρότυπο αποθηκεύτηκε επιτυχώς.",
    saving: "Αποθήκευση...",
    save: "Αποθήκευση αλλαγών",

    templateInfo: "Στοιχεία προτύπου",
    templateTitle: "Τίτλος προτύπου",
    templateTitlePlaceholder: "π.χ. Βασική checklist ετοιμότητας",
    templateDescription: "Περιγραφή",
    templateDescriptionPlaceholder: "Σύντομη περιγραφή του προτύπου.",
    setAsPrimary: "Ορισμός ως κύριο πρότυπο του ακινήτου",

    templateType: "Τύπος προτύπου",
    templateStatus: "Κατάσταση",
    mainType: "Κύριο πρότυπο",
    supportType: "Βοηθητικό πρότυπο",
    activeStatus: "Ενεργό",
    inactiveStatus: "Ανενεργό",

    primaryBadge: "Κύριο",
    helperBadge: "Βοηθητικό",
    activeBadge: "Ενεργό",
    inactiveBadge: "Ανενεργό",

    propertySection: "Ακίνητο",
    itemsSection: "Στοιχεία checklist",
    itemsSubtitle:
      "Ρύθμισε τη συμπεριφορά κάθε item, τη χαρτογράφηση αναλωσίμων και την αναφορά βλάβης / ζημιάς.",

    itemLabel: "Τίτλος στοιχείου",
    itemLabelPlaceholder: "π.χ. Έλεγχος κουζίνας",
    itemDescription: "Περιγραφή",
    itemDescriptionPlaceholder: "Προαιρετική επεξήγηση για τον συνεργάτη.",
    itemFieldType: "Τύπος πεδίου",
    itemCategory: "Κατηγορία",
    itemCategoryPlaceholder: "π.χ. inspection",

    itemChoices: "Επιλογές",
    itemChoicesSubtitle: "Πρόσθεσε τις πιθανές επιλογές του πεδίου.",
    choicePlaceholder: "π.χ. Καλή",
    addChoice: "Προσθήκη επιλογής",
    removeChoice: "Αφαίρεση επιλογής",

    required: "Υποχρεωτικό",
    requiresPhoto: "Απαιτεί φωτογραφία",
    opensIssueOnFail: "Δημιουργεί θέμα σε αποτυχία",

    issueRules: "Κανόνες θέματος",
    issueTypeOnFail: "Τύπος θέματος",
    issueSeverityOnFail: "Σοβαρότητα θέματος",
    failureValuesText: "Τιμές αποτυχίας",
    failureValuesPlaceholder: "π.χ. fail, broken, damaged",

    supplyRules: "Κανόνες αναλωσίμων",
    linkedSupplyItemId: "Συνδεδεμένο αναλώσιμο",
    supplyUpdateMode: "Τρόπος ενημέρωσης αναλωσίμου",
    supplyQuantity: "Ποσότητα αναλωσίμου",
    supplyQuantityPlaceholder: "π.χ. 2",

    activeSuppliesTitle: "Ενεργά αναλώσιμα ακινήτου",
    activeSuppliesSubtitle:
      "Πρόσθεσε τα ενεργά αναλώσιμα του ακινήτου στη checklist με έτοιμη λογική Έλλειψη / Μέτρια / Πλήρης.",
    noActiveSupplies:
      "Δεν υπάρχουν ενεργά αναλώσιμα στο ακίνητο ακόμη. Ενεργοποίησέ τα πρώτα από τη σελίδα αναλωσίμων.",
    addSupplyItem: "Προσθήκη στη checklist",
    alreadyLinked: "Ήδη συνδεδεμένο",
    supplyLinkedLabel: "Συνδεδεμένο αναλώσιμο",
    supplyStatusMapLabel: "Αυτόματο status_map",
    stockLabel: "Απόθεμα",

    issueReportTitle: "Αναφορά βλάβης / ζημιάς",
    issueReportSubtitle:
      "Πρόσθεσε έτοιμο πεδίο στη checklist ώστε ο συνεργάτης να δηλώνει βλάβη ή ζημιά και να δημιουργείται θέμα στην υποβολή.",
    addIssueReportField: "Προσθήκη πεδίου αναφοράς",
    issueReportDefaultLabel: "Αναφορά βλάβης / ζημιάς",
    issueReportDefaultDescription:
      "Αν ο συνεργάτης γράψει κάτι εδώ, θα δημιουργηθεί θέμα ακινήτου κατά την υποβολή της checklist.",

    generalItemsTitle: "Γενικά checklist items",
    generalItemsSubtitle:
      "Χρησιμοποίησε αυτά για επιθεώρηση, καθαριότητα, σημειώσεις και μη συνδεδεμένα αναλώσιμα.",
    addItem: "Προσθήκη γενικού item",
    removeItem: "Αφαίρεση",

    yesNo: "Ναι / Όχι",
    text: "Κείμενο",
    number: "Αριθμός",
    choice: "Επιλογή",
    select: "Επιλογή λίστας",
    photo: "Φωτογραφία",

    damage: "Ζημιά",
    repair: "Βλάβη",
    supplies: "Αναλώσιμα",
    inspection: "Επιθεώρηση",
    cleaning: "Καθαριότητα",
    general: "Γενικό",

    low: "Χαμηλή",
    medium: "Μεσαία",
    high: "Υψηλή",
    critical: "Κρίσιμη",

    itemsCount: "Στοιχεία",
    templateId: "ID προτύπου",
    noItems: "Δεν υπάρχουν στοιχεία σε αυτό το πρότυπο.",

    propertyName: "Όνομα",
    propertyCode: "Κωδικός",
    propertyAddress: "Διεύθυνση",

    supplyMissing: "Έλλειψη",
    supplyMedium: "Μέτρια",
    supplyFull: "Πλήρης",
    issueReportBadge: "Πεδίο αναφοράς",
    categoryIssueReport: "Αναφορά προβλήματος",
    noDescription: "Χωρίς περιγραφή",
  }
}

function getTemplateTypeLabel(templateType: string, language: "el" | "en") {
  const t = getTexts(language)
  return templateType === "main" ? t.mainType : t.supportType
}

function isSupplyLinkedItem(item: ItemDraft) {
  return Boolean(item.linkedSupplyItemId)
}

function isIssueReportItem(item: ItemDraft) {
  return String(item.category || "").trim().toLowerCase() === "issue_report"
}

export default function PropertyChecklistTemplateDetailPage({
  params,
}: {
  params: PageParams
}) {
  const { propertyId, templateId } = use(params)
  const { language } = useAppLanguage()
  const t = getTexts(language)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const [property, setProperty] = useState<PropertyInfo | null>(null)
  const [activeSupplies, setActiveSupplies] = useState<ActiveSupplyRow[]>([])

  const [templateTitle, setTemplateTitle] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [templateType, setTemplateType] = useState("main")
  const [isPrimary, setIsPrimary] = useState(false)
  const [isActive, setIsActive] = useState(true)

  const [items, setItems] = useState<ItemDraft[]>([])

  async function loadData() {
    try {
      setLoading(true)
      setError("")
      setSuccessMessage("")

      const response = await fetch(
        `/api/property-checklists/${propertyId}/templates/${templateId}`,
        {
          method: "GET",
          cache: "no-store",
        }
      )

      const data: TemplateResponse | any = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : t.loadError
        )
      }

      const normalizedItems = Array.isArray(data?.items)
        ? data.items.map((item: any, index: number) => normalizeItem(item, index))
        : []

      setProperty(data?.property ?? null)
      setActiveSupplies(Array.isArray(data?.activeSupplies) ? data.activeSupplies : [])
      setTemplateTitle(String(data?.title ?? ""))
      setTemplateDescription(
        data?.description === null || data?.description === undefined
          ? ""
          : String(data.description)
      )
      setTemplateType(String(data?.templateType ?? "main").toLowerCase())
      setIsPrimary(Boolean(data?.isPrimary ?? false))
      setIsActive(Boolean(data?.isActive ?? true))
      setItems(normalizedItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [propertyId, templateId])

  function addGeneralItem() {
    setItems((prev) => [
      ...prev,
      {
        label: "",
        description: "",
        itemType: "boolean",
        isRequired: true,
        sortOrder: prev.length + 1,
        category: "inspection",
        requiresPhoto: false,
        opensIssueOnFail: false,
        options: [""],

        issueTypeOnFail: "repair",
        issueSeverityOnFail: "medium",
        failureValuesText: "",

        linkedSupplyItemId: "",
        supplyUpdateMode: "none",
        supplyQuantity: "",
      },
    ])
  }

  function addIssueReportItem() {
    const existing = items.find((item) => isIssueReportItem(item))
    if (existing) return

    setItems((prev) => [
      ...prev,
      {
        label: t.issueReportDefaultLabel,
        description: t.issueReportDefaultDescription,
        itemType: "text",
        isRequired: false,
        sortOrder: prev.length + 1,
        category: "issue_report",
        requiresPhoto: false,
        opensIssueOnFail: false,
        options: [""],

        issueTypeOnFail: "repair",
        issueSeverityOnFail: "medium",
        failureValuesText: "",

        linkedSupplyItemId: "",
        supplyUpdateMode: "none",
        supplyQuantity: "",
      },
    ])
  }

  function addSupplyItem(supply: ActiveSupplyRow) {
    const exists = items.some(
      (item) => item.linkedSupplyItemId === supply.supplyItem.id
    )

    if (exists) return

    setItems((prev) => [
      ...prev,
      {
        label: supply.supplyItem.name,
        description: "",
        itemType: "select",
        isRequired: true,
        sortOrder: prev.length + 1,
        category: "supplies",
        requiresPhoto: false,
        opensIssueOnFail: false,
        options: ["missing", "medium", "full"],

        issueTypeOnFail: "supplies",
        issueSeverityOnFail: "medium",
        failureValuesText: "",

        linkedSupplyItemId: supply.supplyItem.id,
        supplyUpdateMode: "status_map",
        supplyQuantity: "",
      },
    ])
  }

  function removeItem(index: number) {
    setItems((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, idx) => ({
          ...item,
          sortOrder: idx + 1,
        }))
    )
  }

  function updateItem<K extends keyof ItemDraft>(
    index: number,
    field: K,
    value: ItemDraft[K]
  ) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item

        const updated = {
          ...item,
          [field]: value,
        }

        if (field === "linkedSupplyItemId" && !value) {
          updated.supplyUpdateMode = "none"
          updated.supplyQuantity = ""
        }

        if (field === "opensIssueOnFail" && value === false) {
          updated.failureValuesText = ""
        }

        return updated
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

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
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
        items: items.map((item, index) => {
          const isSupply = isSupplyLinkedItem(item)
          const isIssueReport = isIssueReportItem(item)

          return {
            label: item.label,
            description: item.description,
            itemType: isSupply ? "select" : item.itemType,
            isRequired: isSupply ? true : item.isRequired,
            sortOrder: index + 1,
            category: isSupply ? "supplies" : isIssueReport ? "issue_report" : item.category,
            requiresPhoto: isSupply ? false : item.requiresPhoto,
            opensIssueOnFail: isSupply ? false : item.opensIssueOnFail,
            optionsText: isSupply
              ? "missing\nmedium\nfull"
              : item.itemType === "choice" || item.itemType === "select"
              ? joinOptions(item.options)
              : "",

            issueTypeOnFail: isIssueReport ? item.issueTypeOnFail : isSupply ? null : item.issueTypeOnFail,
            issueSeverityOnFail: isIssueReport ? item.issueSeverityOnFail : isSupply ? null : item.issueSeverityOnFail,
            failureValuesText: isSupply ? "" : item.failureValuesText,

            linkedSupplyItemId: isSupply ? item.linkedSupplyItemId : null,
            supplyUpdateMode: isSupply ? "status_map" : "none",
            supplyQuantity: null,
          }
        }),
      }

      const response = await fetch(
        `/api/property-checklists/${propertyId}/templates/${templateId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : t.saveError
        )
      }

      setSuccessMessage(t.saveSuccess)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError)
    } finally {
      setSaving(false)
    }
  }

  const itemsCount = useMemo(() => items.length, [items])

  const linkedSupplyIds = useMemo(
    () => new Set(items.map((item) => item.linkedSupplyItemId).filter(Boolean)),
    [items]
  )

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
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {templateTitle || t.pageTitleFallback}
              </h1>

              {isPrimary ? (
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
                  isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                )}
              >
                {isActive ? t.activeBadge : t.inactiveBadge}
              </span>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                {getTemplateTypeLabel(templateType, language)}
              </span>
            </div>

            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              {t.pageSubtitle}
            </p>

            <p className="mt-3 text-sm text-slate-500">
              {t.templateId}: {templateId}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/property-checklists/${propertyId}`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {t.backToTemplates}
          </Link>

          <Link
            href={`/properties/${propertyId}`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {t.backToProperty}
          </Link>
        </div>
      </div>

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

      {property ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            {t.propertySection}
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <InfoCard label={t.propertyName} value={property.name || "-"} />
            <InfoCard label={t.propertyCode} value={property.code || "-"} />
            <InfoCard label={t.propertyAddress} value={property.address || "-"} />
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {t.activeSuppliesTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {t.activeSuppliesSubtitle}
            </p>
          </div>

          <Link
            href={`/properties/${propertyId}/supplies`}
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {language === "en" ? "Manage property supplies" : "Διαχείριση αναλωσίμων ακινήτου"}
          </Link>
        </div>

        {activeSupplies.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
            {t.noActiveSupplies}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeSupplies.map((row) => {
              const alreadyLinked = linkedSupplyIds.has(row.supplyItem.id)

              return (
                <div
                  key={row.propertySupplyId}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {row.supplyItem.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.supplyItem.code}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        alreadyLinked
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border border-slate-200 bg-white text-slate-600"
                      )}
                    >
                      {alreadyLinked ? t.alreadyLinked : t.supplyLinkedLabel}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <span>{language === "en" ? "Category" : "Κατηγορία"}</span>
                      <span className="font-medium text-slate-900">
                        {row.supplyItem.category}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span>{language === "en" ? "Unit" : "Μονάδα"}</span>
                      <span className="font-medium text-slate-900">
                        {row.supplyItem.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span>{t.stockLabel}</span>
                      <span className="font-medium text-slate-900">
                        {row.currentStock}
                        {row.targetStock !== null && row.targetStock !== undefined
                          ? ` / ${row.targetStock}`
                          : ""}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                      {t.supplyStatusMapLabel}: {t.supplyMissing} / {t.supplyMedium} / {t.supplyFull}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => addSupplyItem(row)}
                    disabled={alreadyLinked}
                    className={cn(
                      "mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition",
                      alreadyLinked
                        ? "cursor-not-allowed border border-slate-200 bg-white text-slate-400"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    )}
                  >
                    {alreadyLinked ? t.alreadyLinked : t.addSupplyItem}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {t.issueReportTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {t.issueReportSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={addIssueReportItem}
            disabled={items.some((item) => isIssueReportItem(item))}
            className={cn(
              "inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition",
              items.some((item) => isIssueReportItem(item))
                ? "cursor-not-allowed border border-slate-200 bg-white text-slate-400"
                : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            {items.some((item) => isIssueReportItem(item))
              ? t.issueReportBadge
              : t.addIssueReportField}
          </button>
        </div>
      </section>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            {t.templateInfo}
          </h2>

          <div className="mt-5 grid gap-5">
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
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="main">{t.mainType}</option>
                  <option value="support">{t.supportType}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t.templateStatus}
                </label>
                <select
                  value={isActive ? "active" : "inactive"}
                  onChange={(e) => setIsActive(e.target.value === "active")}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="active">{t.activeStatus}</option>
                  <option value="inactive">{t.inactiveStatus}</option>
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
              <span className="text-sm text-slate-700">
                {t.setAsPrimary}
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {t.itemsSection}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {t.itemsSubtitle}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              {t.itemsCount}: {itemsCount}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={addGeneralItem}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t.addItem}
            </button>

            <button
              type="button"
              onClick={addIssueReportItem}
              disabled={items.some((item) => isIssueReportItem(item))}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium transition",
                items.some((item) => isIssueReportItem(item))
                  ? "cursor-not-allowed border border-slate-200 bg-white text-slate-400"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              {t.addIssueReportField}
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                {t.noItems}
              </div>
            ) : (
              items.map((item, index) => {
                const supplyLinked = isSupplyLinkedItem(item)
                const issueReport = isIssueReportItem(item)

                return (
                  <div
                    key={item.id ?? `item-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-700">
                          #{index + 1}
                        </p>

                        {supplyLinked ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {t.supplyLinkedLabel}
                          </span>
                        ) : null}

                        {issueReport ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            {t.issueReportBadge}
                          </span>
                        ) : null}
                      </div>

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
                          disabled={supplyLinked}
                          onChange={(e) => updateItem(index, "label", e.target.value)}
                          placeholder={t.itemLabelPlaceholder}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
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

                      {supplyLinked ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                          <h3 className="text-sm font-semibold text-emerald-900">
                            {t.supplyRules}
                          </h3>

                          <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <InfoMini
                              label={t.linkedSupplyItemId}
                              value={
                                activeSupplies.find(
                                  (row) => row.supplyItem.id === item.linkedSupplyItemId
                                )?.supplyItem.name || "-"
                              }
                            />
                            <InfoMini
                              label={t.supplyUpdateMode}
                              value={t.supplyStatusMapLabel}
                            />
                            <InfoMini
                              label={t.itemChoices}
                              value={`${t.supplyMissing} / ${t.supplyMedium} / ${t.supplyFull}`}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
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
                                <option value="select">{t.select}</option>
                                <option value="photo">{t.photo}</option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700">
                                {t.itemCategory}
                              </label>
                              <input
                                value={item.category}
                                disabled={issueReport}
                                onChange={(e) =>
                                  updateItem(index, "category", e.target.value)
                                }
                                placeholder={t.itemCategoryPlaceholder}
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                              />
                            </div>
                          </div>

                          {(item.itemType === "choice" || item.itemType === "select") ? (
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
                                    className="flex flex-col gap-2 sm:flex-row sm:items-center"
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

                          <div className="grid gap-3 lg:grid-cols-3">
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

                            {!issueReport ? (
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
                            ) : (
                              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                {t.issueReportBadge}
                              </div>
                            )}
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {t.issueRules}
                            </h3>

                            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                  {t.issueTypeOnFail}
                                </label>
                                <select
                                  value={item.issueTypeOnFail}
                                  onChange={(e) =>
                                    updateItem(index, "issueTypeOnFail", e.target.value)
                                  }
                                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                >
                                  <option value="damage">{t.damage}</option>
                                  <option value="repair">{t.repair}</option>
                                  <option value="supplies">{t.supplies}</option>
                                  <option value="inspection">{t.inspection}</option>
                                  <option value="cleaning">{t.cleaning}</option>
                                  <option value="general">{t.general}</option>
                                </select>
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                  {t.issueSeverityOnFail}
                                </label>
                                <select
                                  value={item.issueSeverityOnFail}
                                  onChange={(e) =>
                                    updateItem(index, "issueSeverityOnFail", e.target.value)
                                  }
                                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                >
                                  <option value="low">{t.low}</option>
                                  <option value="medium">{t.medium}</option>
                                  <option value="high">{t.high}</option>
                                  <option value="critical">{t.critical}</option>
                                </select>
                              </div>

                              {!issueReport ? (
                                <div className="md:col-span-2 xl:col-span-1">
                                  <label className="mb-2 block text-sm font-medium text-slate-700">
                                    {t.failureValuesText}
                                  </label>
                                  <input
                                    value={item.failureValuesText}
                                    onChange={(e) =>
                                      updateItem(index, "failureValuesText", e.target.value)
                                    }
                                    placeholder={t.failureValuesPlaceholder}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </section>
      </form>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function InfoMini({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}