"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { getPropertyChecklistManagementTexts } from "@/lib/i18n/translations"

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
  issueTypeOnFail?: string | null
  issueSeverityOnFail?: string | null
  failureValuesText?: string | null
  linkedSupplyItemId?: string | null
  supplyUpdateMode?: string | null
  supplyQuantity?: number | null
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
  propertySupplyId?: string | null
  name: string
  code?: string | null
  isActive: boolean
  fillLevel?: string | null
  category?: string | null
  unit?: string | null
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
    issueTypeOnFail:
      raw.issueTypeOnFail === null || raw.issueTypeOnFail === undefined
        ? null
        : String(raw.issueTypeOnFail),
    issueSeverityOnFail:
      raw.issueSeverityOnFail === null || raw.issueSeverityOnFail === undefined
        ? null
        : String(raw.issueSeverityOnFail),
    failureValuesText:
      raw.failureValuesText === null || raw.failureValuesText === undefined
        ? null
        : String(raw.failureValuesText),
    linkedSupplyItemId:
      raw.linkedSupplyItemId === null || raw.linkedSupplyItemId === undefined
        ? null
        : String(raw.linkedSupplyItemId),
    supplyUpdateMode:
      raw.supplyUpdateMode === null || raw.supplyUpdateMode === undefined
        ? null
        : String(raw.supplyUpdateMode),
    supplyQuantity:
      raw.supplyQuantity === null || raw.supplyQuantity === undefined
        ? null
        : Number(raw.supplyQuantity),
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

  const supplyItem =
    raw.supplyItem && typeof raw.supplyItem === "object"
      ? (raw.supplyItem as Record<string, unknown>)
      : null

  const id = String(
    supplyItem?.id ??
      raw.supplyItemId ??
      raw.id ??
      raw.propertySupplyId ??
      ""
  ).trim()

  const name = String(
    supplyItem?.name ??
      raw.name ??
      raw.title ??
      ""
  ).trim()

  if (!id || !name) return null

  return {
    id,
    propertySupplyId:
      raw.propertySupplyId === null || raw.propertySupplyId === undefined
        ? raw.id
          ? String(raw.id)
          : null
        : String(raw.propertySupplyId),
    name,
    code:
      supplyItem?.code === null || supplyItem?.code === undefined
        ? raw.code === null || raw.code === undefined
          ? null
          : String(raw.code)
        : String(supplyItem.code),
    isActive: Boolean(raw.isActive ?? true),
    fillLevel:
      raw.fillLevel === null || raw.fillLevel === undefined
        ? null
        : String(raw.fillLevel),
    category:
      supplyItem?.category === null || supplyItem?.category === undefined
        ? raw.category === null || raw.category === undefined
          ? null
          : String(raw.category)
        : String(supplyItem.category),
    unit:
      supplyItem?.unit === null || supplyItem?.unit === undefined
        ? raw.unit === null || raw.unit === undefined
          ? null
          : String(raw.unit)
        : String(supplyItem.unit),
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
    issueTypeOnFail: "repair",
    issueSeverityOnFail: "medium",
    failureValuesText: "",
    linkedSupplyItemId: null,
    supplyUpdateMode: "none",
    supplyQuantity: "",
  }
}

function parseOptions(optionsText?: string | null) {
  if (!optionsText) return []

  return optionsText
    .split(/\r?\n|,/)
    .map((option) => option.trim())
    .filter(Boolean)
}

function joinOptions(options: string[]) {
  return options
    .map((option) => option.trim())
    .filter(Boolean)
    .join("\n")
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

export default function PropertyChecklistsPage({
  params,
}: {
  params: PageParams
}) {
  const { propertyId } = use(params)
  const { language } = useAppLanguage()
  const t = getPropertyChecklistManagementTexts(language)

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

  async function loadData() {
    try {
      setLoading(true)
      setError("")
      setSuccessMessage("")

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
            ? (checklistData as { error?: string }).error!
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
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.length > 0 ? next : [buildEmptyItem()]
    })
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
              {property?.code ? <span>{t.propertyCode}: {property.code}</span> : null}
              {property?.address ? <span>• {property.address}</span> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              {t.editorConsistencyNote}
            </p>
          </div>

          {primaryTemplate ? (
            <Link
              href={`/property-checklists/${propertyId}/templates/${primaryTemplate.id}`}
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

                          {(item.itemType === "choice" || item.itemType === "select") ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="mb-3">
                                <h5 className="text-sm font-semibold text-slate-800">
                                  {t.itemChoices}
                                </h5>
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

                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <h5 className="text-sm font-semibold text-slate-900">
                              {t.issueRules}
                            </h5>

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
                            <h5 className="text-sm font-semibold text-slate-900">
                              {t.supplyItem}
                            </h5>

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
                                  {activeSupplies.map((supply) => (
                                    <option key={supply.id} value={supply.id}>
                                      {supply.name}
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