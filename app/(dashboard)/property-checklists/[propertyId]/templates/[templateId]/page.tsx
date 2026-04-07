"use client"

import Link from "next/link"
import { use, useEffect, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { resolveSupplyDisplayName } from "@/lib/supply-display"

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

type SupplyCatalogItem = {
  id: string
  code?: string | null
  name: string
  nameEl?: string | null
  nameEn?: string | null
  category?: string | null
  unit?: string | null
  minimumStock?: number | null
}

type ActiveSupplyRow = {
  propertySupplyId: string
  currentStock?: number | null
  targetStock?: number | null
  reorderThreshold?: number | null
  lastUpdatedAt?: string | null
  supplyItem: SupplyCatalogItem
}

type TemplateResponse = {
  id: string
  title?: string | null
  description?: string | null
  templateType?: string | null
  isPrimary?: boolean
  isActive?: boolean
  items?: unknown[]
  property?: PropertyInfo | null
  activeSupplies?: ActiveSupplyRow[]
  supplyCatalog?: SupplyCatalogItem[]
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
  linkedSupplyItemId: string | null
  supplyUpdateMode: string
  supplyQuantity: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function parseOptions(optionsText?: unknown) {
  const normalized =
    optionsText === null || optionsText === undefined ? "" : String(optionsText)

  if (!normalized) return [""]

  const parsed = normalized
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

function getTemplateApiError(data: TemplateResponse | { error?: string }) {
  if ("error" in data && typeof data.error === "string") {
    return data.error
  }

  return null
}

function isTemplateResponse(data: TemplateResponse | { error?: string }): data is TemplateResponse {
  return "items" in data
}

function normalizeItem(
  raw: Record<string, unknown> | null | undefined,
  index: number
): ItemDraft {
  return {
    id: raw?.id ? String(raw.id) : undefined,
    label: String(raw?.label ?? ""),
    description:
      raw?.description === null || raw?.description === undefined
        ? ""
        : String(raw.description),
    itemType: String(raw?.itemType ?? "boolean").toLowerCase(),
    isRequired: Boolean(raw?.isRequired ?? true),
    sortOrder: Number(raw?.sortOrder ?? index + 1),
    category:
      raw?.category === null || raw?.category === undefined
        ? "inspection"
        : String(raw.category),
    requiresPhoto: Boolean(raw?.requiresPhoto ?? false),
    opensIssueOnFail: Boolean(raw?.opensIssueOnFail ?? false),
    options: parseOptions(raw?.optionsText),
    issueTypeOnFail: String(raw?.issueTypeOnFail ?? "repair").toLowerCase(),
    issueSeverityOnFail: String(raw?.issueSeverityOnFail ?? "medium").toLowerCase(),
    failureValuesText:
      raw?.failureValuesText === null || raw?.failureValuesText === undefined
        ? ""
        : String(raw.failureValuesText),
    linkedSupplyItemId:
      raw?.linkedSupplyItemId === null || raw?.linkedSupplyItemId === undefined
        ? null
        : String(raw.linkedSupplyItemId),
    supplyUpdateMode: String(raw?.supplyUpdateMode ?? "none").toLowerCase(),
    supplyQuantity:
      raw?.supplyQuantity === null || raw?.supplyQuantity === undefined
        ? ""
        : String(raw.supplyQuantity),
  }
}

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      pageEyebrow: "Cleaning checklist",
      pageTitleFallback: "Cleaning checklist",
      pageSubtitle:
        "Configure the exact form used for the property's cleaning list. The task-level cleaning list editor follows the same structure and fields.",
      backToTemplates: "Back to lists",
      backToProperty: "Back to property",
      loading: "Loading...",
      loadError: "Failed to load checklist.",
      saveError: "Failed to save checklist.",
      saveSuccess: "Checklist saved successfully.",
      saving: "Saving...",
      save: "Save changes",
      templateInfo: "Checklist details",
      templateTitle: "Checklist title",
      templateTitlePlaceholder: "e.g. Main cleaning checklist",
      templateDescription: "Description",
      templateDescriptionPlaceholder: "Short checklist description.",
      setAsPrimary: "Set as primary property checklist",
      templateStatus: "Status",
      activeStatus: "Active",
      inactiveStatus: "Inactive",
      primaryBadge: "Primary",
      activeBadge: "Active",
      inactiveBadge: "Inactive",
      propertySection: "Property",
      itemsSection: "Checklist items",
      itemsSubtitle:
        "This editor is the same structure used by the task-level cleaning list editor.",
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
      addItem: "Add item",
      removeItem: "Remove",
      yesNo: "Yes / No",
      text: "Text",
      number: "Number",
      choice: "Choice",
      select: "Select",
      photo: "Photo",
      damage: "Damage",
      repair: "Repair",
      inspection: "Inspection",
      cleaning: "Cleaning",
      general: "General",
      low: "Low",
      medium: "Medium",
      high: "High",
      critical: "Critical",
      itemsCount: "Items",
      templateId: "Checklist ID",
      noItems: "There are no items in this checklist.",
      propertyName: "Name",
      propertyCode: "Code",
      propertyAddress: "Address",
      editorConsistencyNote:
        "This page and the task cleaning list editor must remain visually and structurally aligned.",
      categoryInspection: "Inspection",
      categoryCleaning: "Cleaning",
      categoryBathroom: "Bathroom",
      categoryKitchen: "Kitchen",
      categoryBedroom: "Bedroom",
      categoryGeneral: "General",
      supplyItem: "Linked supply",
      noLinkedSupply: "No linked supply",
      supplyUpdateMode: "Supply update mode",
      supplyQuantity: "Quantity",
      supplyModeNone: "None",
      supplyModeStatusMap: "Status map",
      supplyModeSetStock: "Set stock",
      supplyModeConsume: "Consume",
      supplyModeFlagLow: "Flag low",
      optionsHelp: "Used only for choice/select fields.",
    }
  }

  return {
    pageEyebrow: "Λίστα καθαριότητας",
    pageTitleFallback: "Λίστα καθαριότητας",
    pageSubtitle:
      "Ρύθμισε ακριβώς τη φόρμα που χρησιμοποιείται στη λίστα καθαριότητας του ακινήτου. Ο επεξεργαστής λίστας καθαριότητας μέσα στην εργασία ακολουθεί την ίδια δομή και τα ίδια πεδία.",
    backToTemplates: "Επιστροφή στις λίστες",
    backToProperty: "Επιστροφή στο ακίνητο",
    loading: "Φόρτωση...",
    loadError: "Αποτυχία φόρτωσης λίστας καθαριότητας.",
    saveError: "Αποτυχία αποθήκευσης λίστας καθαριότητας.",
    saveSuccess: "Η λίστα καθαριότητας αποθηκεύτηκε επιτυχώς.",
    saving: "Αποθήκευση...",
    save: "Αποθήκευση αλλαγών",
    templateInfo: "Στοιχεία λίστας",
    templateTitle: "Τίτλος λίστας",
    templateTitlePlaceholder: "π.χ. Βασική λίστα καθαριότητας",
    templateDescription: "Περιγραφή",
    templateDescriptionPlaceholder: "Σύντομη περιγραφή της λίστας.",
    setAsPrimary: "Ορισμός ως βασική λίστα καθαριότητας ακινήτου",
    templateStatus: "Κατάσταση",
    activeStatus: "Ενεργή",
    inactiveStatus: "Ανενεργή",
    primaryBadge: "Κύρια",
    activeBadge: "Ενεργή",
    inactiveBadge: "Ανενεργή",
    propertySection: "Ακίνητο",
    itemsSection: "Στοιχεία λίστας",
    itemsSubtitle:
      "Αυτός ο επεξεργαστής είναι η ίδια δομή που χρησιμοποιεί και ο επεξεργαστής λίστας καθαριότητας της εργασίας.",
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
    addItem: "Προσθήκη στοιχείου",
    removeItem: "Αφαίρεση",
    yesNo: "Ναι / Όχι",
    text: "Κείμενο",
    number: "Αριθμός",
    choice: "Επιλογή",
    select: "Επιλογή λίστας",
    photo: "Φωτογραφία",
    damage: "Ζημιά",
    repair: "Βλάβη",
    inspection: "Επιθεώρηση",
    cleaning: "Καθαριότητα",
    general: "Γενικό",
    low: "Χαμηλή",
    medium: "Μεσαία",
    high: "Υψηλή",
    critical: "Κρίσιμη",
    itemsCount: "Στοιχεία",
    templateId: "ID λίστας",
    noItems: "Δεν υπάρχουν στοιχεία σε αυτή τη λίστα.",
    propertyName: "Όνομα",
    propertyCode: "Κωδικός",
    propertyAddress: "Διεύθυνση",
    editorConsistencyNote:
      "Αυτή η σελίδα και ο επεξεργαστής λίστας καθαριότητας της εργασίας πρέπει να παραμένουν οπτικά και δομικά ευθυγραμμισμένοι.",
    categoryInspection: "Επιθεώρηση",
    categoryCleaning: "Καθαριότητα",
    categoryBathroom: "Μπάνιο",
    categoryKitchen: "Κουζίνα",
    categoryBedroom: "Υπνοδωμάτιο",
    categoryGeneral: "Γενικά",
    supplyItem: "Συνδεδεμένο αναλώσιμο",
    noLinkedSupply: "Χωρίς συνδεδεμένο αναλώσιμο",
    supplyUpdateMode: "Τρόπος ενημέρωσης αναλώσιμου",
    supplyQuantity: "Ποσότητα",
    supplyModeNone: "Χωρίς ενημέρωση",
    supplyModeStatusMap: "Χαρτογράφηση κατάστασης",
    supplyModeSetStock: "Ορισμός αποθέματος",
    supplyModeConsume: "Κατανάλωση",
    supplyModeFlagLow: "Σήμανση χαμηλού",
    optionsHelp: "Χρησιμοποιείται μόνο σε πεδία επιλογής.",
  }
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
  const [templateTitle, setTemplateTitle] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [isPrimary, setIsPrimary] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [items, setItems] = useState<ItemDraft[]>([])
  const [activeSupplies, setActiveSupplies] = useState<ActiveSupplyRow[]>([])

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

      const data = (await response.json()) as TemplateResponse | { error?: string }

      if (!response.ok) {
        throw new Error(getTemplateApiError(data) ?? t.loadError)
      }

      const payload = isTemplateResponse(data) ? data : null

      const normalizedItems = Array.isArray(payload?.items)
        ? payload.items.map((item, index: number) =>
            normalizeItem((item as Record<string, unknown> | null | undefined) ?? null, index)
          )
        : []

      setProperty(payload?.property ?? null)
      setTemplateTitle(String(payload?.title ?? ""))
      setTemplateDescription(
        payload?.description === null || payload?.description === undefined
          ? ""
          : String(payload.description)
      )
      setIsPrimary(Boolean(payload?.isPrimary ?? false))
      setIsActive(Boolean(payload?.isActive ?? true))
      setItems(normalizedItems)
      setActiveSupplies(Array.isArray(payload?.activeSupplies) ? payload.activeSupplies : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
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
        linkedSupplyItemId: null,
        supplyUpdateMode: "none",
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

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    try {
      setSaving(true)
      setError("")
      setSuccessMessage("")

      const payload = {
        title: templateTitle,
        description: templateDescription,
        templateType: "main",
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
            item.itemType === "choice" || item.itemType === "select"
              ? joinOptions(item.options)
              : "",
          issueTypeOnFail: item.issueTypeOnFail,
          issueSeverityOnFail: item.issueSeverityOnFail,
          failureValuesText: item.failureValuesText,
          linkedSupplyItemId: item.linkedSupplyItemId,
          supplyUpdateMode: item.supplyUpdateMode,
          supplyQuantity:
            item.supplyQuantity.trim() === ""
              ? null
              : Number(item.supplyQuantity),
        })),
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

  const itemsCount = items.length

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
              ) : null}

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
            </div>

            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              {t.pageSubtitle}
            </p>

            <p className="mt-3 text-sm text-slate-500">
              {t.templateId}: {templateId}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {t.editorConsistencyNote}
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
          </div>

          <div className="mt-6 space-y-4">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                {t.noItems}
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.id ?? `item-${index}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-700">
                        #{index + 1}
                      </p>
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
                        onChange={(e) => updateItem(index, "label", e.target.value)}
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
                          onChange={(e) =>
                            updateItem(index, "category", e.target.value)
                          }
                          placeholder={t.itemCategoryPlaceholder}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    {item.itemType === "choice" || item.itemType === "select" ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-3">
                          <h4 className="text-sm font-semibold text-slate-800">
                            {t.itemChoices}
                          </h4>
                          <p className="mt-1 text-xs text-slate-500">
                            {t.itemChoicesSubtitle}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {t.optionsHelp}
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
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {t.supplyItem}
                      </h3>

                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            {t.supplyItem}
                          </label>
                          <select
                            value={item.linkedSupplyItemId ?? ""}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "linkedSupplyItemId",
                                e.target.value.trim() ? e.target.value : null
                              )
                            }
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="">{t.noLinkedSupply}</option>
                            {activeSupplies.map((row) => (
                              <option key={row.supplyItem.id} value={row.supplyItem.id}>
                                {resolveSupplyDisplayName(language, row.supplyItem)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            {t.supplyUpdateMode}
                          </label>
                          <select
                            value={item.supplyUpdateMode}
                            onChange={(e) =>
                              updateItem(index, "supplyUpdateMode", e.target.value)
                            }
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="none">{t.supplyModeNone}</option>
                            <option value="status_map">{t.supplyModeStatusMap}</option>
                            <option value="set_stock">{t.supplyModeSetStock}</option>
                            <option value="consume">{t.supplyModeConsume}</option>
                            <option value="flag_low">{t.supplyModeFlagLow}</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            {t.supplyQuantity}
                          </label>
                          <input
                            value={item.supplyQuantity}
                            onChange={(e) =>
                              updateItem(index, "supplyQuantity", e.target.value)
                            }
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={addGeneralItem}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t.addItem}
              </button>

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
