"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type Language = "el" | "en"

type CleaningTemplateItemForm = {
  localId: string
  label: string
  labelEn: string
  description: string
  itemType: string
  isRequired: boolean
  sortOrder: number
  category: string
  requiresPhoto: boolean
  optionsText: string
}

type CleaningTemplateItemResponse = {
  id: string
  label: string
  labelEn?: string | null
  description?: string | null
  itemType: string
  isRequired: boolean
  sortOrder: number
  category?: string | null
  requiresPhoto?: boolean
  optionsText?: string | null
}

type CleaningTemplateResponse = {
  id: string
  title: string
  description?: string | null
  templateType: string
  isPrimary: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  items: CleaningTemplateItemResponse[]
}

type CleaningRouteResponse = {
  propertyId?: string
  propertyName?: string
  template?: unknown
  error?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function buildLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function createEmptyItem(sortOrder: number): CleaningTemplateItemForm {
  return {
    localId: buildLocalId(),
    label: "",
    labelEn: "",
    description: "",
    itemType: "boolean",
    isRequired: true,
    sortOrder,
    category: "cleaning",
    requiresPhoto: false,
    optionsText: "",
  }
}

function normalizeTemplate(rawValue: unknown): CleaningTemplateResponse | null {
  if (!rawValue || typeof rawValue !== "object") return null

  const raw = rawValue as Record<string, unknown>
  const id = String(raw.id ?? "").trim()
  if (!id) return null

  const itemsRaw = Array.isArray(raw.items) ? raw.items : []

  return {
    id,
    title: String(raw.title ?? ""),
    description:
      raw.description === null || raw.description === undefined
        ? null
        : String(raw.description),
    templateType: String(raw.templateType ?? "cleaning"),
    isPrimary: Boolean(raw.isPrimary ?? false),
    isActive: Boolean(raw.isActive ?? false),
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    items: itemsRaw
      .map((item, index) => {
        const row = (item ?? {}) as Record<string, unknown>
        return {
          id: String(row.id ?? `item-${index}`),
          label: String(row.label ?? ""),
          labelEn:
            row.labelEn === null || row.labelEn === undefined ? null : String(row.labelEn),
          description:
            row.description === null || row.description === undefined
              ? null
              : String(row.description),
          itemType: String(row.itemType ?? "boolean"),
          isRequired: Boolean(row.isRequired ?? false),
          sortOrder: Number(row.sortOrder ?? index + 1),
          category:
            row.category === null || row.category === undefined
              ? null
              : String(row.category),
          requiresPhoto: Boolean(row.requiresPhoto ?? false),
          optionsText:
            row.optionsText === null || row.optionsText === undefined
              ? null
              : String(row.optionsText),
        } satisfies CleaningTemplateItemResponse
      })
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

function mapTemplateToFormItems(template: CleaningTemplateResponse | null): CleaningTemplateItemForm[] {
  if (!template || !Array.isArray(template.items) || template.items.length === 0) {
    return [createEmptyItem(1)]
  }

  return template.items.map((item, index) => ({
    localId: item.id || buildLocalId(),
    label: item.label || "",
    labelEn: item.labelEn || "",
    description: item.description || "",
    itemType: item.itemType || "boolean",
    isRequired: Boolean(item.isRequired),
    sortOrder: Number(item.sortOrder || index + 1),
    category: item.category || "cleaning",
    requiresPhoto: Boolean(item.requiresPhoto),
    optionsText: item.optionsText || "",
  }))
}

function normalizeItemsForSubmit(items: CleaningTemplateItemForm[]) {
  return items.map((item, index) => ({
    label: item.label.trim(),
    labelEn: item.labelEn.trim() || null,
    description: item.description.trim() || null,
    itemType: item.itemType,
    isRequired: item.isRequired,
    sortOrder: index + 1,
    category: item.category.trim() || "cleaning",
    requiresPhoto: item.requiresPhoto,
    optionsText: item.itemType === "select" ? item.optionsText.trim() || null : null,
  }))
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function SvgIcon({
  children,
  className = "h-5 w-5",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function IconArrowLeft({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </SvgIcon>
  )
}

function IconPlus({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </SvgIcon>
  )
}

function IconTrash({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
    </SvgIcon>
  )
}

function IconGrip({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M9 6h.01" />
      <path d="M9 12h.01" />
      <path d="M9 18h.01" />
      <path d="M15 6h.01" />
      <path d="M15 12h.01" />
      <path d="M15 18h.01" />
    </SvgIcon>
  )
}

function IconClipboard({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <rect x="7" y="4" width="10" height="16" rx="2" />
      <path d="M9 4.5h6" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
    </SvgIcon>
  )
}

export default function PropertyCleaningTemplatePage() {
  const params = useParams<{ propertyId: string }>()
  const router = useRouter()
  const propertyId = String(params?.propertyId || "")
  const { language } = useAppLanguage()

  const t = useMemo(() => {
    if (language === "en") {
      return {
        loading: "Loading cleaning template...",
        loadError: "The cleaning template page could not be loaded.",
        noProperty: "Property not found.",
        pageEyebrow: "Property cleaning template",
        pageTitleCreate: "Create main cleaning list",
        pageTitleEdit: "Edit main cleaning list",
        pageSubtitle:
          "This page manages the main cleaning template of the property. Tasks create execution runs from this template and must not rewrite the property-level source list.",
        backToLists: "Back to property lists",
        backToProperty: "Back to property",
        basicInfo: "Basic information",
        title: "Title",
        description: "Description",
        titlePlaceholder: "Main cleaning list",
        descriptionPlaceholder: "Short explanation for the cleaning team...",
        itemSection: "Cleaning items",
        addItem: "Add item",
        saveCreate: "Create cleaning list",
        saveUpdate: "Save changes",
        saving: "Saving...",
        itemLabel: "Label",
        itemLabelEn: "English label",
        itemDescription: "Description",
        itemType: "Item type",
        itemCategory: "Category",
        itemOptions: "Options",
        itemRequired: "Required",
        itemPhoto: "Requires photo",
        removeItem: "Remove",
        moveHint: "Order",
        createdSuccess: "The main cleaning template was created successfully.",
        updatedSuccess: "The main cleaning template was updated successfully.",
        itemTypeBoolean: "Yes / No",
        itemTypeText: "Text",
        itemTypeNumber: "Number",
        itemTypeSelect: "Options",
        itemGuide:
          "Keep this list focused on cleaning proof only. Do not insert supplies logic or issue reporting items here.",
        validationTitle: "Please complete the required fields.",
        emptyItems: "Add at least one cleaning item.",
      }
    }

    return {
      loading: "Φόρτωση λίστας καθαριότητας...",
      loadError: "Δεν ήταν δυνατή η φόρτωση της σελίδας λίστας καθαριότητας.",
      noProperty: "Το ακίνητο δεν βρέθηκε.",
      pageEyebrow: "Βασική λίστα καθαριότητας ακινήτου",
      pageTitleCreate: "Δημιουργία βασικής λίστας καθαριότητας",
      pageTitleEdit: "Επεξεργασία βασικής λίστας καθαριότητας",
      pageSubtitle:
        "Αυτή η σελίδα διαχειρίζεται το κύριο cleaning template του ακινήτου. Οι εργασίες δημιουργούν runs εκτέλεσης από αυτό το template και δεν πρέπει να ξαναγράφουν τη property-level βασική λίστα.",
      backToLists: "Επιστροφή στις λίστες ακινήτου",
      backToProperty: "Επιστροφή στο ακίνητο",
      basicInfo: "Βασικά στοιχεία",
      title: "Τίτλος",
      description: "Περιγραφή",
      titlePlaceholder: "Βασική λίστα καθαριότητας",
      descriptionPlaceholder: "Σύντομη περιγραφή για την ομάδα καθαρισμού...",
      itemSection: "Στοιχεία καθαριότητας",
      addItem: "Προσθήκη στοιχείου",
      saveCreate: "Δημιουργία λίστας καθαριότητας",
      saveUpdate: "Αποθήκευση αλλαγών",
      saving: "Αποθήκευση...",
      itemLabel: "Ετικέτα",
      itemLabelEn: "Αγγλική ετικέτα",
      itemDescription: "Περιγραφή",
      itemType: "Τύπος στοιχείου",
      itemCategory: "Κατηγορία",
      itemOptions: "Επιλογές",
      itemRequired: "Υποχρεωτικό",
      itemPhoto: "Απαιτεί φωτογραφία",
      removeItem: "Αφαίρεση",
      moveHint: "Σειρά",
      createdSuccess: "Η βασική λίστα καθαριότητας δημιουργήθηκε επιτυχώς.",
      updatedSuccess: "Η βασική λίστα καθαριότητας ενημερώθηκε επιτυχώς.",
      itemTypeBoolean: "Ναι / Όχι",
      itemTypeText: "Κείμενο",
      itemTypeNumber: "Αριθμός",
      itemTypeSelect: "Επιλογές",
      itemGuide:
        "Κράτα αυτή τη λίστα αποκλειστικά για cleaning proof. Μην βάζεις εδώ λογική αναλωσίμων ή στοιχεία αναφοράς προβλημάτων.",
      validationTitle: "Συμπλήρωσε τα υποχρεωτικά πεδία.",
      emptyItems: "Πρόσθεσε τουλάχιστον ένα στοιχείο καθαριότητας.",
    }
  }, [language])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [propertyName, setPropertyName] = useState("")
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [items, setItems] = useState<CleaningTemplateItemForm[]>([createEmptyItem(1)])

  const isEditMode = Boolean(templateId)

  const loadTemplate = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      setSuccess("")

      const response = await fetch(`/api/property-checklists/${propertyId}/cleaning`, {
        method: "GET",
        cache: "no-store",
      })

      const data: CleaningRouteResponse = await response.json()

      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : t.loadError)
      }

      setPropertyName(String(data?.propertyName || ""))

      const template = normalizeTemplate(data?.template)

      if (template) {
        setTemplateId(template.id)
        setTitle(template.title)
        setDescription(template.description || "")
        setItems(mapTemplateToFormItems(template))
      } else {
        setTemplateId(null)
        setTitle("")
        setDescription("")
        setItems([createEmptyItem(1)])
      }
    } catch (err) {
      console.error("Cleaning template page load error:", err)
      setError(err instanceof Error ? err.message : t.loadError)
    } finally {
      setLoading(false)
    }
  }, [propertyId, t.loadError])

  useEffect(() => {
    if (!propertyId) return
    void loadTemplate()
  }, [propertyId, loadTemplate])

  const addItem = () => {
    setItems((prev) => [...prev, createEmptyItem(prev.length + 1)])
  }

  const removeItem = (localId: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.localId !== localId)
      if (next.length === 0) return [createEmptyItem(1)]
      return next.map((item, index) => ({ ...item, sortOrder: index + 1 }))
    })
  }

  const moveItem = (localId: string, direction: "up" | "down") => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.localId === localId)
      if (index === -1) return prev

      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= prev.length) return prev

      const clone = [...prev]
      const current = clone[index]
      clone[index] = clone[targetIndex]
      clone[targetIndex] = current

      return clone.map((item, idx) => ({ ...item, sortOrder: idx + 1 }))
    })
  }

  const updateItem = <K extends keyof CleaningTemplateItemForm>(
    localId: string,
    field: K,
    value: CleaningTemplateItemForm[K]
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.localId === localId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    )
  }

  const validateForm = () => {
    if (!title.trim()) {
      throw new Error(`${t.validationTitle} (${t.title})`)
    }

    if (!items.length) {
      throw new Error(t.emptyItems)
    }

    const hasEmptyLabel = items.some((item) => !item.label.trim())
    if (hasEmptyLabel) {
      throw new Error(`${t.validationTitle} (${t.itemLabel})`)
    }

    const invalidSelect = items.some(
      (item) => item.itemType === "select" && !item.optionsText.trim()
    )

    if (invalidSelect) {
      throw new Error(`${t.validationTitle} (${t.itemOptions})`)
    }
  }

  const handleSubmit = async () => {
    try {
      validateForm()
      setSaving(true)
      setError("")
      setSuccess("")

      const payload = {
        ...(templateId ? { templateId } : {}),
        title: title.trim(),
        description: description.trim() || null,
        items: normalizeItemsForSubmit(items),
      }

      const response = await fetch(`/api/property-checklists/${propertyId}/cleaning`, {
        method: templateId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : t.loadError)
      }

      setSuccess(templateId ? t.updatedSuccess : t.createdSuccess)
      await loadTemplate()
    } catch (err) {
      console.error("Cleaning template save error:", err)
      setError(err instanceof Error ? err.message : t.loadError)
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
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">{t.pageEyebrow}</p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              {isEditMode ? t.pageTitleEdit : t.pageTitleCreate}
            </h1>
            <p className="max-w-4xl text-sm leading-6 text-slate-600">{t.pageSubtitle}</p>
            {propertyName ? (
              <p className="text-sm text-slate-500">{propertyName}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/property-checklists/${propertyId}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <IconArrowLeft className="h-4 w-4" />
              {t.backToLists}
            </Link>

            <Link
              href={`/properties/${propertyId}`}
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t.backToProperty}
            </Link>
          </div>
        </div>
      </Card>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <Card>
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <IconClipboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{t.basicInfo}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">{t.itemGuide}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-5 xl:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t.title}</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.titlePlaceholder}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t.description}</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.descriptionPlaceholder}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{t.itemSection}</h2>
            <p className="mt-1 text-sm text-slate-500">{t.itemGuide}</p>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <IconPlus className="h-4 w-4" />
            {t.addItem}
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {items.map((item, index) => (
            <div key={item.localId} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3 text-slate-700">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
                    <IconGrip className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.moveHint} #{index + 1}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => moveItem(item.localId, "up")}
                    disabled={index === 0}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(item.localId, "down")}
                    disabled={index === items.length - 1}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.localId)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                  >
                    <IconTrash className="h-4 w-4" />
                    {t.removeItem}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t.itemLabel}</label>
                  <input
                    value={item.label}
                    onChange={(e) => updateItem(item.localId, "label", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t.itemLabelEn}</label>
                  <input
                    value={item.labelEn}
                    onChange={(e) => updateItem(item.localId, "labelEn", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  />
                </div>

                <div className="xl:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t.itemDescription}</label>
                  <input
                    value={item.description}
                    onChange={(e) => updateItem(item.localId, "description", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t.itemType}</label>
                  <select
                    value={item.itemType}
                    onChange={(e) => updateItem(item.localId, "itemType", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  >
                    <option value="boolean">{t.itemTypeBoolean}</option>
                    <option value="text">{t.itemTypeText}</option>
                    <option value="number">{t.itemTypeNumber}</option>
                    <option value="select">{t.itemTypeSelect}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t.itemCategory}</label>
                  <input
                    value={item.category}
                    onChange={(e) => updateItem(item.localId, "category", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  />
                </div>

                {item.itemType === "select" ? (
                  <div className="xl:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">{t.itemOptions}</label>
                    <input
                      value={item.optionsText}
                      onChange={(e) => updateItem(item.localId, "optionsText", e.target.value)}
                      placeholder={language === "en" ? "e.g. ok,needs_check,not_done" : "π.χ. ok,θέλει_έλεγχο,δεν_έγινε"}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    />
                  </div>
                ) : null}

                <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={item.isRequired}
                    onChange={(e) => updateItem(item.localId, "isRequired", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {t.itemRequired}
                </label>

                <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={item.requiresPhoto}
                    onChange={(e) => updateItem(item.localId, "requiresPhoto", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {t.itemPhoto}
                </label>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link
          href={`/property-checklists/${propertyId}`}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {t.backToLists}
        </Link>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t.saving : isEditMode ? t.saveUpdate : t.saveCreate}
        </button>
      </div>
    </div>
  )
}
