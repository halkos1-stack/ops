"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type Language = "el" | "en"

type IssueTemplateItemForm = {
  localId: string
  label: string
  labelEn: string
  description: string
  sortOrder: number
  itemType: string
  isRequired: boolean
  allowsIssue: boolean
  allowsDamage: boolean
  defaultIssueType: string
  defaultSeverity: string
  requiresPhoto: boolean
  affectsHostingByDefault: boolean
  urgentByDefault: boolean
  locationHint: string
}

type IssueTemplateItemResponse = {
  id: string
  label: string
  labelEn?: string | null
  description?: string | null
  sortOrder: number
  itemType?: string | null
  isRequired?: boolean
  allowsIssue?: boolean
  allowsDamage?: boolean
  defaultIssueType?: string | null
  defaultSeverity?: string | null
  requiresPhoto?: boolean
  affectsHostingByDefault?: boolean
  urgentByDefault?: boolean
  locationHint?: string | null
}

type IssueTemplateResponse = {
  id: string
  title: string
  description?: string | null
  isPrimary: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  items: IssueTemplateItemResponse[]
}

type IssueRouteResponse = {
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

function createEmptyItem(sortOrder: number): IssueTemplateItemForm {
  return {
    localId: buildLocalId(),
    label: "",
    labelEn: "",
    description: "",
    sortOrder,
    itemType: "issue_check",
    isRequired: true,
    allowsIssue: true,
    allowsDamage: true,
    defaultIssueType: "repair",
    defaultSeverity: "medium",
    requiresPhoto: false,
    affectsHostingByDefault: false,
    urgentByDefault: false,
    locationHint: "",
  }
}

function normalizeTemplate(rawValue: unknown): IssueTemplateResponse | null {
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
          sortOrder: Number(row.sortOrder ?? index + 1),
          itemType:
            row.itemType === null || row.itemType === undefined
              ? null
              : String(row.itemType),
          isRequired: Boolean(row.isRequired ?? false),
          allowsIssue: Boolean(row.allowsIssue ?? true),
          allowsDamage: Boolean(row.allowsDamage ?? true),
          defaultIssueType:
            row.defaultIssueType === null || row.defaultIssueType === undefined
              ? null
              : String(row.defaultIssueType),
          defaultSeverity:
            row.defaultSeverity === null || row.defaultSeverity === undefined
              ? null
              : String(row.defaultSeverity),
          requiresPhoto: Boolean(row.requiresPhoto ?? false),
          affectsHostingByDefault: Boolean(row.affectsHostingByDefault ?? false),
          urgentByDefault: Boolean(row.urgentByDefault ?? false),
          locationHint:
            row.locationHint === null || row.locationHint === undefined
              ? null
              : String(row.locationHint),
        } satisfies IssueTemplateItemResponse
      })
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

function mapTemplateToFormItems(template: IssueTemplateResponse | null): IssueTemplateItemForm[] {
  if (!template || !Array.isArray(template.items) || template.items.length === 0) {
    return [createEmptyItem(1)]
  }

  return template.items.map((item, index) => ({
    localId: item.id || buildLocalId(),
    label: item.label || "",
    labelEn: item.labelEn || "",
    description: item.description || "",
    sortOrder: Number(item.sortOrder || index + 1),
    itemType: item.itemType || "issue_check",
    isRequired: Boolean(item.isRequired),
    allowsIssue: Boolean(item.allowsIssue ?? true),
    allowsDamage: Boolean(item.allowsDamage ?? true),
    defaultIssueType: item.defaultIssueType || "repair",
    defaultSeverity: item.defaultSeverity || "medium",
    requiresPhoto: Boolean(item.requiresPhoto),
    affectsHostingByDefault: Boolean(item.affectsHostingByDefault),
    urgentByDefault: Boolean(item.urgentByDefault),
    locationHint: item.locationHint || "",
  }))
}

function normalizeItemsForSubmit(items: IssueTemplateItemForm[]) {
  return items.map((item, index) => ({
    label: item.label.trim(),
    labelEn: item.labelEn.trim() || null,
    description: item.description.trim() || null,
    sortOrder: index + 1,
    itemType: item.itemType,
    isRequired: item.isRequired,
    allowsIssue: item.allowsIssue,
    allowsDamage: item.allowsDamage,
    defaultIssueType: item.defaultIssueType.trim() || "repair",
    defaultSeverity: item.defaultSeverity.trim() || "medium",
    requiresPhoto: item.requiresPhoto,
    affectsHostingByDefault: item.affectsHostingByDefault,
    urgentByDefault: item.urgentByDefault,
    locationHint: item.locationHint.trim() || null,
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

function IconWrench({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M14.5 6.5a4 4 0 01-5 5L4 17l3 3 5.5-5.5a4 4 0 005-5l-3 3-2-2 3-3z" />
    </SvgIcon>
  )
}

export default function PropertyIssuesTemplatePage() {
  const params = useParams<{ propertyId: string }>()
  const propertyId = String(params?.propertyId || "")
  const { language } = useAppLanguage()

  const t = useMemo(() => {
    if (language === "en") {
      return {
        loading: "Loading issues template...",
        loadError: "The issues template page could not be loaded.",
        pageEyebrow: "Property issues template",
        pageTitleCreate: "Create main issues list",
        pageTitleEdit: "Edit main issues list",
        pageSubtitle:
          "This page manages the main issue and damage reporting template of the property. Tasks create execution runs from this template and must not rewrite the property-level source list.",
        backToLists: "Back to property lists",
        backToProperty: "Back to property",
        basicInfo: "Basic information",
        title: "Title",
        description: "Description",
        titlePlaceholder: "Main issues list",
        descriptionPlaceholder: "Short explanation for issue and damage reporting...",
        itemSection: "Issue reporting items",
        addItem: "Add item",
        saveCreate: "Create issues list",
        saveUpdate: "Save changes",
        saving: "Saving...",
        itemLabel: "Label",
        itemLabelEn: "English label",
        itemDescription: "Description",
        itemType: "Item type",
        itemIssueType: "Default issue type",
        itemSeverity: "Default severity",
        itemLocationHint: "Location hint",
        itemRequired: "Required",
        itemPhoto: "Requires photo",
        itemAllowsIssue: "Allows issue",
        itemAllowsDamage: "Allows damage",
        affectsHosting: "Affects hosting by default",
        urgent: "Urgent by default",
        removeItem: "Remove",
        moveHint: "Order",
        createdSuccess: "The main issues template was created successfully.",
        updatedSuccess: "The main issues template was updated successfully.",
        itemTypeIssueCheck: "Issue check",
        itemTypeIssue: "Issue",
        itemTypeDamage: "Damage",
        itemTypeReport: "Report",
        issueTypeRepair: "Repair",
        issueTypeDamage: "Damage",
        issueTypeMaintenance: "Maintenance",
        issueTypeSafety: "Safety",
        severityLow: "Low",
        severityMedium: "Medium",
        severityHigh: "High",
        severityCritical: "Critical",
        severityUrgent: "Urgent",
        itemGuide:
          "Keep this list focused on structured issue and damage reporting. Do not insert cleaning proof or supplies logic here.",
        validationTitle: "Please complete the required fields.",
        emptyItems: "Add at least one reporting item.",
        invalidItem: "Each item must allow issue or damage reporting.",
      }
    }

    return {
      loading: "Φόρτωση λίστας ζημιών / βλαβών...",
      loadError: "Δεν ήταν δυνατή η φόρτωση της σελίδας λίστας ζημιών / βλαβών.",
      pageEyebrow: "Βασική λίστα ζημιών / βλαβών ακινήτου",
      pageTitleCreate: "Δημιουργία βασικής λίστας ζημιών / βλαβών",
      pageTitleEdit: "Επεξεργασία βασικής λίστας ζημιών / βλαβών",
      pageSubtitle:
        "Αυτή η σελίδα διαχειρίζεται το κύριο template αναφοράς ζημιών και βλαβών του ακινήτου. Οι εργασίες δημιουργούν runs εκτέλεσης από αυτό το template και δεν πρέπει να ξαναγράφουν τη property-level βασική λίστα.",
      backToLists: "Επιστροφή στις λίστες ακινήτου",
      backToProperty: "Επιστροφή στο ακίνητο",
      basicInfo: "Βασικά στοιχεία",
      title: "Τίτλος",
      description: "Περιγραφή",
      titlePlaceholder: "Βασική λίστα ζημιών / βλαβών",
      descriptionPlaceholder: "Σύντομη περιγραφή για τη δομημένη αναφορά προβλημάτων...",
      itemSection: "Στοιχεία αναφοράς",
      addItem: "Προσθήκη στοιχείου",
      saveCreate: "Δημιουργία λίστας ζημιών / βλαβών",
      saveUpdate: "Αποθήκευση αλλαγών",
      saving: "Αποθήκευση...",
      itemLabel: "Ετικέτα",
      itemLabelEn: "Αγγλική ετικέτα",
      itemDescription: "Περιγραφή",
      itemType: "Τύπος στοιχείου",
      itemIssueType: "Προεπιλεγμένος τύπος θέματος",
      itemSeverity: "Προεπιλεγμένη σοβαρότητα",
      itemLocationHint: "Υπόδειξη τοποθεσίας",
      itemRequired: "Υποχρεωτικό",
      itemPhoto: "Απαιτεί φωτογραφία",
      itemAllowsIssue: "Επιτρέπει βλάβη / θέμα",
      itemAllowsDamage: "Επιτρέπει ζημιά",
      affectsHosting: "Επηρεάζει φιλοξενία από προεπιλογή",
      urgent: "Επείγον από προεπιλογή",
      removeItem: "Αφαίρεση",
      moveHint: "Σειρά",
      createdSuccess: "Η βασική λίστα ζημιών / βλαβών δημιουργήθηκε επιτυχώς.",
      updatedSuccess: "Η βασική λίστα ζημιών / βλαβών ενημερώθηκε επιτυχώς.",
      itemTypeIssueCheck: "Έλεγχος θέματος",
      itemTypeIssue: "Βλάβη / θέμα",
      itemTypeDamage: "Ζημιά",
      itemTypeReport: "Αναφορά",
      issueTypeRepair: "Επισκευή",
      issueTypeDamage: "Ζημιά",
      issueTypeMaintenance: "Συντήρηση",
      issueTypeSafety: "Ασφάλεια",
      severityLow: "Χαμηλή",
      severityMedium: "Μεσαία",
      severityHigh: "Υψηλή",
      severityCritical: "Κρίσιμη",
      severityUrgent: "Επείγουσα",
      itemGuide:
        "Κράτα αυτή τη λίστα αποκλειστικά για δομημένη αναφορά ζημιών και βλαβών. Μην βάζεις εδώ cleaning proof ή λογική αναλωσίμων.",
      validationTitle: "Συμπλήρωσε τα υποχρεωτικά πεδία.",
      emptyItems: "Πρόσθεσε τουλάχιστον ένα στοιχείο αναφοράς.",
      invalidItem: "Κάθε στοιχείο πρέπει να επιτρέπει αναφορά βλάβης ή ζημιάς.",
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
  const [items, setItems] = useState<IssueTemplateItemForm[]>([createEmptyItem(1)])

  const isEditMode = Boolean(templateId)

  const loadTemplate = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      setSuccess("")

      const response = await fetch(`/api/property-checklists/${propertyId}/issues`, {
        method: "GET",
        cache: "no-store",
      })

      const data: IssueRouteResponse = await response.json()

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
      console.error("Issues template page load error:", err)
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

  const updateItem = <K extends keyof IssueTemplateItemForm>(
    localId: string,
    field: K,
    value: IssueTemplateItemForm[K]
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

    const hasInvalidAllowances = items.some((item) => !item.allowsIssue && !item.allowsDamage)
    if (hasInvalidAllowances) {
      throw new Error(t.invalidItem)
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

      const response = await fetch(`/api/property-checklists/${propertyId}/issues`, {
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
      console.error("Issues template save error:", err)
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
            {propertyName ? <p className="text-sm text-slate-500">{propertyName}</p> : null}
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
              <IconWrench className="h-5 w-5" />
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
                    <option value="issue_check">{t.itemTypeIssueCheck}</option>
                    <option value="issue">{t.itemTypeIssue}</option>
                    <option value="damage">{t.itemTypeDamage}</option>
                    <option value="report">{t.itemTypeReport}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t.itemIssueType}</label>
                  <select
                    value={item.defaultIssueType}
                    onChange={(e) => updateItem(item.localId, "defaultIssueType", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  >
                    <option value="repair">{t.issueTypeRepair}</option>
                    <option value="damage">{t.issueTypeDamage}</option>
                    <option value="maintenance">{t.issueTypeMaintenance}</option>
                    <option value="safety">{t.issueTypeSafety}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t.itemSeverity}</label>
                  <select
                    value={item.defaultSeverity}
                    onChange={(e) => updateItem(item.localId, "defaultSeverity", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  >
                    <option value="low">{t.severityLow}</option>
                    <option value="medium">{t.severityMedium}</option>
                    <option value="high">{t.severityHigh}</option>
                    <option value="critical">{t.severityCritical}</option>
                    <option value="urgent">{t.severityUrgent}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t.itemLocationHint}</label>
                  <input
                    value={item.locationHint}
                    onChange={(e) => updateItem(item.localId, "locationHint", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  />
                </div>

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

                <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={item.allowsIssue}
                    onChange={(e) => updateItem(item.localId, "allowsIssue", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {t.itemAllowsIssue}
                </label>

                <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={item.allowsDamage}
                    onChange={(e) => updateItem(item.localId, "allowsDamage", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {t.itemAllowsDamage}
                </label>

                <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 xl:col-span-2">
                  <input
                    type="checkbox"
                    checked={item.affectsHostingByDefault}
                    onChange={(e) => updateItem(item.localId, "affectsHostingByDefault", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {t.affectsHosting}
                </label>

                <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 xl:col-span-2">
                  <input
                    type="checkbox"
                    checked={item.urgentByDefault}
                    onChange={(e) => updateItem(item.localId, "urgentByDefault", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {t.urgent}
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

