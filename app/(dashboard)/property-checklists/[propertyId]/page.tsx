"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import { getPropertyStatusLabel, getPropertyTypeLabel } from "@/lib/i18n/labels"
import { getSupplyDisplayName } from "@/lib/supply-presets"

type Language = "el" | "en"
type SupplyState = "missing" | "medium" | "full"
type SupplyFilter = "all" | SupplyState

type CleaningTemplateItem = {
  id: string
  label: string
  labelEn?: string | null
  description?: string | null
  itemType: string
  isRequired: boolean
  sortOrder: number
  category?: string | null
  requiresPhoto?: boolean
  opensIssueOnFail?: boolean
  optionsText?: string | null
}

type CleaningTemplate = {
  id: string
  title: string
  description?: string | null
  templateType: string
  isPrimary: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  items: CleaningTemplateItem[]
}

type IssueTemplateItem = {
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

type IssueTemplate = {
  id: string
  title: string
  description?: string | null
  isPrimary: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  items: IssueTemplateItem[]
}

type PropertySupplyRow = {
  id: string
  currentStock: number
  targetStock?: number | null
  reorderThreshold?: number | null
  minimumThreshold?: number | null
  trackingMode?: string | null
  isCritical?: boolean
  notes?: string | null
  updatedAt?: string | null
  lastUpdatedAt?: string | null
  fillLevel?: string | null
  derivedState?: string | null
  supplyItem?: {
    id: string
    code: string
    name: string
    nameEl?: string | null
    nameEn?: string | null
    category: string
    unit: string
    minimumStock?: number | null
    isActive: boolean
  } | null
}

type PropertyDetailResponse = {
  property?: unknown
  data?: unknown
  error?: string
}

type PropertyPageData = {
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
  checklistTemplates: CleaningTemplate[]
  issueTemplates: IssueTemplate[]
  propertySupplies: PropertySupplyRow[]
  cleaningTemplate?: CleaningTemplate | null
  issuesTemplate?: IssueTemplate | null
  checklistHints?: {
    cleaning?: string
    supplies?: string
    issues?: string
  } | null
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function safeArray<T>(value: T[] | null | undefined): T[] {
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

function normalizeCleaningTemplateItem(
  rawValue: unknown,
  index: number,
  parentId: string
): CleaningTemplateItem {
  const raw = (rawValue ?? {}) as Record<string, unknown>

  return {
    id: String(raw.id ?? `${parentId}-item-${index}`),
    label: String(raw.label ?? ""),
    labelEn:
      raw.labelEn === null || raw.labelEn === undefined ? null : String(raw.labelEn),
    description:
      raw.description === null || raw.description === undefined
        ? null
        : String(raw.description),
    itemType: String(raw.itemType ?? "boolean"),
    isRequired: Boolean(raw.isRequired ?? false),
    sortOrder: Number(raw.sortOrder ?? index + 1),
    category:
      raw.category === null || raw.category === undefined ? null : String(raw.category),
    requiresPhoto: Boolean(raw.requiresPhoto ?? false),
    opensIssueOnFail: Boolean(raw.opensIssueOnFail ?? false),
    optionsText:
      raw.optionsText === null || raw.optionsText === undefined
        ? null
        : String(raw.optionsText),
  }
}

function normalizeCleaningTemplate(rawValue: unknown): CleaningTemplate | null {
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
      .map((item, index) => normalizeCleaningTemplateItem(item, index, id))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

function normalizeIssueTemplateItem(
  rawValue: unknown,
  index: number,
  parentId: string
): IssueTemplateItem {
  const raw = (rawValue ?? {}) as Record<string, unknown>

  return {
    id: String(raw.id ?? `${parentId}-issue-item-${index}`),
    label: String(raw.label ?? ""),
    labelEn:
      raw.labelEn === null || raw.labelEn === undefined ? null : String(raw.labelEn),
    description:
      raw.description === null || raw.description === undefined
        ? null
        : String(raw.description),
    sortOrder: Number(raw.sortOrder ?? index + 1),
    itemType:
      raw.itemType === null || raw.itemType === undefined ? null : String(raw.itemType),
    isRequired: Boolean(raw.isRequired ?? false),
    allowsIssue: Boolean(raw.allowsIssue ?? true),
    allowsDamage: Boolean(raw.allowsDamage ?? true),
    defaultIssueType:
      raw.defaultIssueType === null || raw.defaultIssueType === undefined
        ? null
        : String(raw.defaultIssueType),
    defaultSeverity:
      raw.defaultSeverity === null || raw.defaultSeverity === undefined
        ? null
        : String(raw.defaultSeverity),
    requiresPhoto: Boolean(raw.requiresPhoto ?? false),
    affectsHostingByDefault: Boolean(raw.affectsHostingByDefault ?? false),
    urgentByDefault: Boolean(raw.urgentByDefault ?? false),
    locationHint:
      raw.locationHint === null || raw.locationHint === undefined
        ? null
        : String(raw.locationHint),
  }
}

function normalizeIssueTemplate(rawValue: unknown): IssueTemplate | null {
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
      .map((item, index) => normalizeIssueTemplateItem(item, index, id))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

function normalizeSupply(rawValue: unknown): PropertySupplyRow | null {
  if (!rawValue || typeof rawValue !== "object") return null

  const raw = rawValue as Record<string, unknown>
  const supplyItem =
    raw.supplyItem && typeof raw.supplyItem === "object"
      ? (raw.supplyItem as Record<string, unknown>)
      : null

  const id = String(raw.id ?? "").trim()
  if (!id) return null

  return {
    id,
    currentStock: Number(raw.currentStock ?? 0),
    targetStock:
      raw.targetStock === null || raw.targetStock === undefined
        ? null
        : Number(raw.targetStock),
    reorderThreshold:
      raw.reorderThreshold === null || raw.reorderThreshold === undefined
        ? null
        : Number(raw.reorderThreshold),
    minimumThreshold:
      raw.minimumThreshold === null || raw.minimumThreshold === undefined
        ? null
        : Number(raw.minimumThreshold),
    trackingMode:
      raw.trackingMode === null || raw.trackingMode === undefined
        ? null
        : String(raw.trackingMode),
    isCritical: Boolean(raw.isCritical ?? false),
    notes:
      raw.notes === null || raw.notes === undefined ? null : String(raw.notes),
    updatedAt:
      raw.updatedAt === null || raw.updatedAt === undefined
        ? null
        : String(raw.updatedAt),
    lastUpdatedAt:
      raw.lastUpdatedAt === null || raw.lastUpdatedAt === undefined
        ? null
        : String(raw.lastUpdatedAt),
    fillLevel:
      raw.fillLevel === null || raw.fillLevel === undefined
        ? null
        : String(raw.fillLevel),
    derivedState:
      raw.derivedState === null || raw.derivedState === undefined
        ? null
        : String(raw.derivedState),
    supplyItem: supplyItem
      ? {
          id: String(supplyItem.id ?? ""),
          code: String(supplyItem.code ?? ""),
          name: String(supplyItem.name ?? ""),
          nameEl:
            supplyItem.nameEl === null || supplyItem.nameEl === undefined
              ? null
              : String(supplyItem.nameEl),
          nameEn:
            supplyItem.nameEn === null || supplyItem.nameEn === undefined
              ? null
              : String(supplyItem.nameEn),
          category: String(supplyItem.category ?? ""),
          unit: String(supplyItem.unit ?? ""),
          minimumStock:
            supplyItem.minimumStock === null || supplyItem.minimumStock === undefined
              ? null
              : Number(supplyItem.minimumStock),
          isActive: Boolean(supplyItem.isActive ?? true),
        }
      : null,
  }
}

function normalizeProperty(rawValue: unknown): PropertyPageData | null {
  if (!rawValue || typeof rawValue !== "object") return null

  const raw = rawValue as Record<string, unknown>
  const id = String(raw.id ?? "").trim()
  if (!id) return null

  const checklistTemplatesRaw = Array.isArray(raw.checklistTemplates)
    ? raw.checklistTemplates
    : []
  const issueTemplatesRaw = Array.isArray(raw.issueTemplates) ? raw.issueTemplates : []
  const propertySuppliesRaw = Array.isArray(raw.propertySupplies) ? raw.propertySupplies : []

  const checklistTemplates = checklistTemplatesRaw
    .map((item) => normalizeCleaningTemplate(item))
    .filter((item): item is CleaningTemplate => item !== null)

  const issueTemplates = issueTemplatesRaw
    .map((item) => normalizeIssueTemplate(item))
    .filter((item): item is IssueTemplate => item !== null)

  const cleaningTemplate = normalizeCleaningTemplate(raw.cleaningTemplate)
  const issuesTemplate = normalizeIssueTemplate(raw.issuesTemplate)

  return {
    id,
    code: String(raw.code ?? ""),
    name: String(raw.name ?? ""),
    address: String(raw.address ?? ""),
    city: String(raw.city ?? ""),
    region: String(raw.region ?? ""),
    postalCode: String(raw.postalCode ?? ""),
    country: String(raw.country ?? ""),
    type: String(raw.type ?? ""),
    status: String(raw.status ?? ""),
    checklistTemplates,
    issueTemplates,
    propertySupplies: propertySuppliesRaw
      .map((item) => normalizeSupply(item))
      .filter((item): item is PropertySupplyRow => item !== null)
      .filter((item) => Boolean(item.supplyItem?.isActive ?? true)),
    cleaningTemplate,
    issuesTemplate,
    checklistHints:
      raw.checklistHints && typeof raw.checklistHints === "object"
        ? {
            cleaning:
              (raw.checklistHints as Record<string, unknown>).cleaning == null
                ? undefined
                : String((raw.checklistHints as Record<string, unknown>).cleaning),
            supplies:
              (raw.checklistHints as Record<string, unknown>).supplies == null
                ? undefined
                : String((raw.checklistHints as Record<string, unknown>).supplies),
            issues:
              (raw.checklistHints as Record<string, unknown>).issues == null
                ? undefined
                : String((raw.checklistHints as Record<string, unknown>).issues),
          }
        : null,
  }
}

function getSupplyStateThree(
  current: number,
  target?: number | null,
  threshold?: number | null
): SupplyState {
  if (current <= 0) return "missing"

  const safeTarget =
    typeof target === "number" && Number.isFinite(target) ? target : null
  const safeThreshold =
    typeof threshold === "number" && Number.isFinite(threshold) ? threshold : null

  if (safeTarget !== null && safeTarget > 0 && current >= safeTarget) {
    return "full"
  }

  if (safeThreshold !== null && current <= safeThreshold) {
    return "medium"
  }

  if (safeTarget !== null && safeTarget > 0 && current < safeTarget) {
    return "medium"
  }

  return "full"
}

function supplyStateTone(state: SupplyState) {
  if (state === "missing") return "bg-red-50 text-red-700 ring-1 ring-red-200"
  if (state === "medium") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
}

function buildSupplyStateLabel(language: Language, state: SupplyState) {
  if (language === "en") {
    if (state === "missing") return "Missing"
    if (state === "medium") return "Medium"
    return "Full"
  }

  if (state === "missing") return "Έλλειψη"
  if (state === "medium") return "Μέτρια"
  return "Πλήρης"
}

function buildItemTypeLabel(language: Language, itemType?: string | null) {
  const normalized = String(itemType || "").trim().toLowerCase()

  if (language === "en") {
    if (normalized === "boolean") return "Yes / No"
    if (normalized === "text") return "Text"
    if (normalized === "number") return "Number"
    if (normalized === "select") return "Options"
    if (normalized === "choice") return "Choice"
    if (normalized === "photo") return "Photo"
    if (normalized === "issue_check") return "Issue check"
    return normalized || "Item"
  }

  if (normalized === "boolean") return "Ναι / Όχι"
  if (normalized === "text") return "Κείμενο"
  if (normalized === "number") return "Αριθμός"
  if (normalized === "select") return "Επιλογές"
  if (normalized === "choice") return "Επιλογή"
  if (normalized === "photo") return "Φωτογραφία"
  if (normalized === "issue_check") return "Έλεγχος θέματος"
  return normalized || "Στοιχείο"
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

function IconChevronDown({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M6 9l6 6 6-6" />
    </SvgIcon>
  )
}

function IconChevronUp({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M18 15l-6-6-6 6" />
    </SvgIcon>
  )
}

function IconClipboardList({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <rect x="7" y="4" width="10" height="16" rx="2" />
      <path d="M9 4.5h6" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </SvgIcon>
  )
}

function IconPackage2({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M12 3l7 4-7 4-7-4 7-4z" />
      <path d="M5 7v10l7 4 7-4V7" />
      <path d="M12 11v10" />
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

function IconInfo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7.5h.01" />
    </SvgIcon>
  )
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
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
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
    </div>
  )
}

function HoverGuide({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="group relative inline-flex">
      <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
        <IconInfo className="h-4 w-4" />
        <span>{title}</span>
      </div>

      <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600 opacity-0 shadow-xl transition duration-150 group-hover:opacity-100">
        {description}
      </div>
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  description,
  action,
  guides,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  guides?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            {icon}
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {guides ? <div className="flex flex-wrap gap-3">{guides}</div> : null}
    </div>
  )
}

function ChecklistItemCard({
  item,
  language,
}: {
  item: CleaningTemplateItem
  language: Language
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-900">
            {language === "en" ? item.labelEn || item.label : item.label}
          </div>

          {item.description ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            #{item.sortOrder}
          </span>

          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {buildItemTypeLabel(language, item.itemType)}
          </span>

          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
              item.isRequired
                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
            )}
          >
            {language === "en"
              ? item.isRequired
                ? "Required"
                : "Optional"
              : item.isRequired
                ? "Υποχρεωτικό"
                : "Προαιρετικό"}
          </span>

          {item.requiresPhoto ? (
            <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
              {language === "en" ? "Photo required" : "Απαιτεί φωτογραφία"}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function IssueItemCard({
  item,
  language,
}: {
  item: IssueTemplateItem
  language: Language
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-900">
            {language === "en" ? item.labelEn || item.label : item.label}
          </div>

          {item.description ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          ) : null}

          {item.locationHint ? (
            <p className="mt-2 text-sm text-slate-500">
              {language === "en" ? "Location hint:" : "Υπόδειξη τοποθεσίας:"} {item.locationHint}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            #{item.sortOrder}
          </span>

          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
              item.isRequired
                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
            )}
          >
            {language === "en"
              ? item.isRequired
                ? "Required"
                : "Optional"
              : item.isRequired
                ? "Υποχρεωτικό"
                : "Προαιρετικό"}
          </span>

          {item.requiresPhoto ? (
            <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
              {language === "en" ? "Photo required" : "Απαιτεί φωτογραφία"}
            </span>
          ) : null}

          {item.urgentByDefault ? (
            <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
              {language === "en" ? "Urgent by default" : "Επείγον από προεπιλογή"}
            </span>
          ) : null}

          {item.affectsHostingByDefault ? (
            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
              {language === "en" ? "Affects hosting" : "Επηρεάζει φιλοξενία"}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SupplyCounterButton({
  title,
  count,
  active,
  onClick,
  tone,
  helper,
}: {
  title: string
  count: number
  active: boolean
  onClick: () => void
  tone: "slate" | "red" | "amber" | "emerald"
  helper: string
}) {
  const toneClass =
    tone === "red"
      ? active
        ? "border-red-600 bg-red-600 text-white"
        : "border-red-200 bg-white text-red-800 hover:bg-red-50"
      : tone === "amber"
        ? active
          ? "border-amber-500 bg-amber-500 text-white"
          : "border-amber-200 bg-white text-amber-800 hover:bg-amber-50"
        : tone === "emerald"
          ? active
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
          : active
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-left shadow-sm transition ${toneClass}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {title}
      </div>
      <div className="mt-1.5 text-2xl font-bold leading-none">{count}</div>
      <div className="mt-1 text-[11px] opacity-80">{helper}</div>
    </button>
  )
}

function SupplyRowCard({
  language,
  locale,
  row,
}: {
  language: Language
  locale: string
  row: PropertySupplyRow & { displayName: string; effectiveState: SupplyState }
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-900">{row.displayName}</div>
          <div className="mt-1 text-sm text-slate-500">{row.supplyItem?.code || "—"}</div>
        </div>

        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${supplyStateTone(
            row.effectiveState
          )}`}
        >
          {buildSupplyStateLabel(language, row.effectiveState)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          label={language === "en" ? "Current quantity" : "Τρέχουσα ποσότητα"}
          value={String(row.currentStock ?? 0)}
        />
        <InfoCard
          label={language === "en" ? "Target quantity" : "Στόχος ποσότητας"}
          value={row.targetStock === null || row.targetStock === undefined ? "—" : String(row.targetStock)}
        />
        <InfoCard
          label={language === "en" ? "Category" : "Κατηγορία"}
          value={row.supplyItem?.category || "—"}
        />
        <InfoCard
          label={language === "en" ? "Last update" : "Τελευταία ενημέρωση"}
          value={formatDateTime(row.lastUpdatedAt || row.updatedAt || null, locale)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
            row.isCritical
              ? "bg-red-50 text-red-700 ring-1 ring-red-200"
              : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
          )}
        >
          {language === "en"
            ? row.isCritical
              ? "Critical supply"
              : "Non-critical supply"
            : row.isCritical
              ? "Κρίσιμο αναλώσιμο"
              : "Μη κρίσιμο αναλώσιμο"}
        </span>

        {row.fillLevel ? (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {language === "en" ? "Fill level:" : "Επίπεδο:"} {row.fillLevel}
          </span>
        ) : null}

        {row.supplyItem?.unit ? (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {language === "en" ? "Unit:" : "Μονάδα:"} {row.supplyItem.unit}
          </span>
        ) : null}
      </div>
    </div>
  )
}
export default function PropertyChecklistsPage() {
  const params = useParams<{ propertyId: string }>()
  const propertyId = String(params?.propertyId || "")
  const { language } = useAppLanguage()
  const locale = language === "en" ? "en-GB" : "el-GR"

  const t = useMemo(() => {
    if (language === "en") {
      return {
        loading: "Loading property lists...",
        loadError: "The property lists page could not be loaded.",
        noData: "No property data were returned.",
        backToProperty: "Back to property",
        pageEyebrow: "Property lists management",
        pageTitleFallback: "Property",
        pageSubtitle:
          "This page keeps the three core property lists: one main cleaning list, one dynamic supplies list built from active supplies, and one main damage / issue reporting list.",
        propertyCode: "Code",
        cleaningSummary: "Cleaning list",
        suppliesSummary: "Supplies list",
        issuesSummary: "Damage / issues list",
        activeSupplies: "Active supplies",
        configured: "Configured",
        missing: "Not configured",
        activeBadge: "Active",
        inactiveBadge: "Inactive",
        cleaningSectionTitle: "Main cleaning list",
        cleaningSectionSubtitle:
          "This list is used for cleaning execution only. It should remain clean and focused on cleanliness checks and cleaning proof.",
        cleaningGuide1Title: "What belongs here",
        cleaningGuide1Text:
          "Use this list only for cleaning work, cleanliness proof, room checks and operational cleaning steps. Do not mix supplies logic or damage reporting here.",
        cleaningGuide2Title: "How tasks use it",
        cleaningGuide2Text:
          "When a task enables the cleaning list, the task creates its own execution run from this main property list. The task must not change the main property list.",
        cleaningGuide3Title: "Recommended structure",
        cleaningGuide3Text:
          "Prefer simple, clear items: spaces, surfaces, linens, bathroom, kitchen, final visual check and photo proof only where truly needed.",
        cleaningPrimaryTemplate: "Main template",
        cleaningItemsCount: "Items",
        cleaningStatus: "Status",
        checklistItems: "Checklist items",
        noCleaningTitle: "No main cleaning list has been defined yet.",
        noCleaningSubtitle:
          "Create one main cleaning list for the property. This list becomes the default source for cleaning runs in tasks.",
        createCleaning: "Create cleaning list",
        editCleaning: "Edit cleaning list",
        suppliesSectionTitle: "Dynamic supplies list",
        suppliesSectionSubtitle:
          "Supplies are correct as a separate dynamic list. They stay collapsed by default and open through the counters below.",
        suppliesGuide1Title: "Why collapsed",
        suppliesGuide1Text:
          "The supplies area is secondary to the main cleaning template. It stays collapsed to keep the page focused and opens only when you need to inspect stock state.",
        suppliesGuide2Title: "How it works",
        suppliesGuide2Text:
          "The supplies list is built automatically from the active supplies of the property. It is not edited here as a normal checklist template.",
        suppliesGuide3Title: "How tasks use it",
        suppliesGuide3Text:
          "When a task enables the supplies list, the task creates a supplies run from the active property supplies. The task run does not rewrite the property supply setup.",
        openSupplies: "Open supplies list",
        closeSupplies: "Close supplies list",
        suppliesReadyTitle: "The supplies list is ready.",
        suppliesReadySubtitle:
          "The system builds it dynamically from the active property supplies.",
        activeSuppliesCount: "Active supplies count",
        sampleItems: "Example active supplies",
        allSupplies: "All supplies",
        missingSupplies: "Missing",
        mediumSupplies: "Medium",
        fullSupplies: "Full",
        allSuppliesHelper: "All active supplies",
        missingSuppliesHelper: "Need immediate refill",
        mediumSuppliesHelper: "Need refill soon",
        fullSuppliesHelper: "Adequate level",
        visibleGroup: "Visible group",
        noSuppliesForFilter: "There are no supplies for the selected filter.",
        manageSupplies: "Manage supplies",
        issuesSectionTitle: "Main damage / issue reporting list",
        issuesSectionSubtitle:
          "This third list is dedicated to damage and issue reporting. It should not be mixed with cleaning or supplies checks.",
        issuesGuide1Title: "What belongs here",
        issuesGuide1Text:
          "Use this list for faults, damages, wear, hosting-impact risks, missing equipment, maintenance findings and issue-reporting prompts.",
        issuesGuide2Title: "Operational purpose",
        issuesGuide2Text:
          "This list feeds the reporting structure for damages and faults. It helps the partner submit structured evidence instead of free-form notes only.",
        issuesGuide3Title: "Recommended structure",
        issuesGuide3Text:
          "Prefer location-based reporting: bathroom, kitchen, bedroom, living room, entrance, exterior, appliances, safety and general observations.",
        issuesPrimaryTemplate: "Main template",
        issueItemsCount: "Items",
        issueStatus: "Status",
        issueItems: "Issue reporting items",
        noIssuesTitle: "No main damage / issue reporting list has been defined yet.",
        noIssuesSubtitle:
          "Create one main issue / damage list for the property so tasks can use a proper structured reporting flow.",
        createIssues: "Create issues list",
        editIssues: "Edit issues list",
      }
    }

    return {
      loading: "Φόρτωση λιστών ακινήτου...",
      loadError: "Δεν ήταν δυνατή η φόρτωση της σελίδας λιστών ακινήτου.",
      noData: "Δεν επιστράφηκαν δεδομένα ακινήτου.",
      backToProperty: "Επιστροφή στο ακίνητο",
      pageEyebrow: "Διαχείριση λιστών ακινήτου",
      pageTitleFallback: "Ακίνητο",
      pageSubtitle:
        "Αυτή η σελίδα κρατά τις τρεις βασικές λίστες του ακινήτου: μία βασική λίστα καθαριότητας, μία δυναμική λίστα αναλωσίμων που χτίζεται από τα ενεργά αναλώσιμα και μία βασική λίστα αναφοράς ζημιών / βλαβών.",
      propertyCode: "Κωδικός",
      cleaningSummary: "Λίστα καθαριότητας",
      suppliesSummary: "Λίστα αναλωσίμων",
      issuesSummary: "Λίστα ζημιών / βλαβών",
      activeSupplies: "Ενεργά αναλώσιμα",
      configured: "Ρυθμισμένη",
      missing: "Δεν έχει οριστεί",
      activeBadge: "Ενεργή",
      inactiveBadge: "Ανενεργή",
      cleaningSectionTitle: "Βασική λίστα καθαριότητας",
      cleaningSectionSubtitle:
        "Αυτή η λίστα χρησιμοποιείται μόνο για καθαρισμούς. Πρέπει να παραμένει καθαρή και εστιασμένη στους ελέγχους καθαριότητας και στην απόδειξη καθαρισμού.",
      cleaningGuide1Title: "Τι ανήκει εδώ",
      cleaningGuide1Text:
        "Χρησιμοποίησέ τη μόνο για εργασίες καθαρισμού, απόδειξη καθαριότητας, ελέγχους χώρων και βήματα καθαρισμού. Μην ανακατεύεις εδώ λογική αναλωσίμων ή αναφορά ζημιών.",
      cleaningGuide2Title: "Πώς τη χρησιμοποιούν οι εργασίες",
      cleaningGuide2Text:
        "Όταν μια εργασία ενεργοποιεί τη λίστα καθαριότητας, δημιουργείται δικό της run εκτέλεσης από αυτή τη βασική λίστα του ακινήτου. Η εργασία δεν πρέπει να αλλάζει τη βασική λίστα ακινήτου.",
      cleaningGuide3Title: "Προτεινόμενη δομή",
      cleaningGuide3Text:
        "Προτίμησε απλά και σαφή στοιχεία: χώροι, επιφάνειες, λευκά είδη, μπάνιο, κουζίνα, τελικός οπτικός έλεγχος και φωτογραφική απόδειξη μόνο όπου χρειάζεται πραγματικά.",
      cleaningPrimaryTemplate: "Κύριο πρότυπο",
      cleaningItemsCount: "Στοιχεία",
      cleaningStatus: "Κατάσταση",
      checklistItems: "Στοιχεία λίστας",
      noCleaningTitle: "Δεν έχει οριστεί ακόμη βασική λίστα καθαριότητας.",
      noCleaningSubtitle:
        "Δημιούργησε μία βασική λίστα καθαριότητας για το ακίνητο. Αυτή θα είναι η προεπιλεγμένη πηγή για τα cleaning runs στις εργασίες.",
      createCleaning: "Δημιουργία λίστας καθαριότητας",
      editCleaning: "Επεξεργασία λίστας καθαριότητας",
      suppliesSectionTitle: "Δυναμική λίστα αναλωσίμων",
      suppliesSectionSubtitle:
        "Τα αναλώσιμα είναι σωστά ως ξεχωριστή δυναμική λίστα. Μένουν κλειστά από προεπιλογή και ανοίγουν από τους μετρητές παρακάτω.",
      suppliesGuide1Title: "Γιατί είναι κλειστά",
      suppliesGuide1Text:
        "Η περιοχή αναλωσίμων είναι δευτερεύουσα σε σχέση με τη βασική λίστα καθαριότητας. Παραμένει κλειστή για να μένει καθαρή η σελίδα και ανοίγει μόνο όταν θέλεις να ελέγξεις επίπεδα.",
      suppliesGuide2Title: "Πώς δουλεύει",
      suppliesGuide2Text:
        "Η λίστα αναλωσίμων χτίζεται αυτόματα από τα ενεργά αναλώσιμα του ακινήτου. Δεν επεξεργάζεται εδώ σαν κανονικό template checklist.",
      suppliesGuide3Title: "Πώς τη χρησιμοποιούν οι εργασίες",
      suppliesGuide3Text:
        "Όταν μια εργασία ενεργοποιεί τη λίστα αναλωσίμων, δημιουργείται supplies run από τα ενεργά αναλώσιμα του ακινήτου. Το run της εργασίας δεν ξαναγράφει τη βασική ρύθμιση αναλωσίμων του ακινήτου.",
      openSupplies: "Άνοιγμα λίστας αναλωσίμων",
      closeSupplies: "Κλείσιμο λίστας αναλωσίμων",
      suppliesReadyTitle: "Η λίστα αναλωσίμων είναι έτοιμη.",
      suppliesReadySubtitle:
        "Το σύστημα τη χτίζει δυναμικά από τα ενεργά αναλώσιμα του ακινήτου.",
      activeSuppliesCount: "Πλήθος ενεργών αναλωσίμων",
      sampleItems: "Ενδεικτικά ενεργά αναλώσιμα",
      allSupplies: "Όλα τα αναλώσιμα",
      missingSupplies: "Έλλειψη",
      mediumSupplies: "Μέτρια",
      fullSupplies: "Πλήρης",
      allSuppliesHelper: "Όλα τα ενεργά αναλώσιμα",
      missingSuppliesHelper: "Θέλουν άμεσο γέμισμα",
      mediumSuppliesHelper: "Θέλουν σύντομα γέμισμα",
      fullSuppliesHelper: "Επαρκές επίπεδο",
      visibleGroup: "Ορατή ομάδα",
      noSuppliesForFilter: "Δεν υπάρχουν αναλώσιμα για το επιλεγμένο φίλτρο.",
      manageSupplies: "Διαχείριση αναλωσίμων",
      issuesSectionTitle: "Βασική λίστα αναφοράς ζημιών / βλαβών",
      issuesSectionSubtitle:
        "Αυτή είναι η τρίτη βασική λίστα και είναι αφιερωμένη στην αναφορά ζημιών και βλαβών. Δεν πρέπει να ανακατεύεται με ελέγχους καθαριότητας ή αναλωσίμων.",
      issuesGuide1Title: "Τι ανήκει εδώ",
      issuesGuide1Text:
        "Χρησιμοποίησέ τη για βλάβες, ζημιές, φθορές, κινδύνους που επηρεάζουν φιλοξενία, ελλείψεις εξοπλισμού, ευρήματα συντήρησης και δομημένες ερωτήσεις αναφοράς προβλημάτων.",
      issuesGuide2Title: "Επιχειρησιακός σκοπός",
      issuesGuide2Text:
        "Αυτή η λίστα τροφοδοτεί τη δομή αναφοράς για ζημιές και βλάβες. Βοηθά τον συνεργάτη να στείλει δομημένη απόδειξη αντί για ελεύθερες σημειώσεις μόνο.",
      issuesGuide3Title: "Προτεινόμενη δομή",
      issuesGuide3Text:
        "Προτίμησε αναφορά ανά τοποθεσία: μπάνιο, κουζίνα, υπνοδωμάτιο, σαλόνι, είσοδος, εξωτερικός χώρος, συσκευές, ασφάλεια και γενικές παρατηρήσεις.",
      issuesPrimaryTemplate: "Κύριο πρότυπο",
      issueItemsCount: "Στοιχεία",
      issueStatus: "Κατάσταση",
      issueItems: "Στοιχεία αναφοράς",
      noIssuesTitle: "Δεν έχει οριστεί ακόμη βασική λίστα αναφοράς ζημιών / βλαβών.",
      noIssuesSubtitle:
        "Δημιούργησε μία βασική λίστα ζημιών / βλαβών για το ακίνητο ώστε οι εργασίες να χρησιμοποιούν σωστή δομημένη ροή αναφοράς.",
      createIssues: "Δημιουργία λίστας ζημιών / βλαβών",
      editIssues: "Επεξεργασία λίστας ζημιών / βλαβών",
    }
  }, [language])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [property, setProperty] = useState<PropertyPageData | null>(null)
  const [suppliesOpen, setSuppliesOpen] = useState(false)
  const [supplyFilter, setSupplyFilter] = useState<SupplyFilter>("all")

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch(`/api/properties/${propertyId}`, {
        method: "GET",
        cache: "no-store",
      })

      const data: PropertyDetailResponse = await response.json()

      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : t.loadError)
      }

      const normalized = normalizeProperty(data?.property ?? data?.data ?? data)

      if (!normalized) {
        throw new Error(t.noData)
      }

      setProperty(normalized)
    } catch (err) {
      console.error("Property checklists page load error:", err)
      setError(err instanceof Error ? err.message : t.loadError)
      setProperty(null)
    } finally {
      setLoading(false)
    }
  }, [propertyId, t.loadError, t.noData])

  useEffect(() => {
    if (!propertyId) return
    void loadData()
  }, [propertyId, loadData])

  const primaryCleaningTemplate = useMemo(() => {
    if (property?.cleaningTemplate) return property.cleaningTemplate

    return (
      safeArray(property?.checklistTemplates)
        .filter((template) => {
          const type = String(template.templateType || "").trim().toLowerCase()
          return template.isActive && type === "cleaning"
        })
        .sort((a, b) => {
          if (a.isPrimary && !b.isPrimary) return -1
          if (!a.isPrimary && b.isPrimary) return 1
          const aTime = normalizeDate(a.updatedAt)?.getTime() || 0
          const bTime = normalizeDate(b.updatedAt)?.getTime() || 0
          return bTime - aTime
        })[0] || null
    )
  }, [property])

  const primaryIssueTemplate = useMemo(() => {
    if (property?.issuesTemplate) return property.issuesTemplate

    return (
      safeArray(property?.issueTemplates)
        .filter((template) => template.isActive)
        .sort((a, b) => {
          if (a.isPrimary && !b.isPrimary) return -1
          if (!a.isPrimary && b.isPrimary) return 1
          const aTime = normalizeDate(a.updatedAt)?.getTime() || 0
          const bTime = normalizeDate(b.updatedAt)?.getTime() || 0
          return bTime - aTime
        })[0] || null
    )
  }, [property])

  const supplyRows = useMemo(() => {
    return safeArray(property?.propertySupplies)
      .map((row) => {
        const current = Number(row.currentStock || 0)
        const threshold =
          row.minimumThreshold ??
          row.reorderThreshold ??
          row.supplyItem?.minimumStock ??
          null

        const effectiveState: SupplyState =
          row.derivedState === "missing" ||
          row.derivedState === "medium" ||
          row.derivedState === "full"
            ? row.derivedState
            : getSupplyStateThree(current, row.targetStock ?? null, threshold)

        const displayName = getSupplyDisplayName(language, {
          code: row.supplyItem?.code,
          fallbackName:
            row.supplyItem?.nameEn || row.supplyItem?.nameEl || row.supplyItem?.name,
        })

        return {
          ...row,
          displayName,
          effectiveState,
        }
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName, locale))
  }, [property, language, locale])

  const supplyCounters = useMemo(() => {
    return {
      all: supplyRows.length,
      missing: supplyRows.filter((row) => row.effectiveState === "missing").length,
      medium: supplyRows.filter((row) => row.effectiveState === "medium").length,
      full: supplyRows.filter((row) => row.effectiveState === "full").length,
    }
  }, [supplyRows])

  const visibleSupplies = useMemo(() => {
    if (supplyFilter === "all") return supplyRows
    return supplyRows.filter((row) => row.effectiveState === supplyFilter)
  }, [supplyRows, supplyFilter])

  const suppliesPreview = useMemo(() => {
    return supplyRows.slice(0, 6)
  }, [supplyRows])

  const cleaningHint =
    property?.checklistHints?.cleaning ||
    (language === "en"
      ? "Cleaning confirmation and space readiness proof."
      : "Επιβεβαίωση καθαριότητας και απόδειξη ετοιμότητας χώρου.")

  const suppliesHint =
    property?.checklistHints?.supplies ||
    (language === "en"
      ? "Supplies level recording."
      : "Καταγραφή επιπέδου αναλωσίμων.")

  const issuesHint =
    property?.checklistHints?.issues ||
    (language === "en"
      ? "Damage, fault or problem reporting."
      : "Αναφορά ζημιών, βλαβών ή προβλημάτων.")

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        {t.loading}
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{t.loadError}</h1>
        <p className="mt-2 text-sm text-red-600">{error || t.noData}</p>
        <div className="mt-4">
          <Link
            href="/properties"
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t.backToProperty}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">{t.pageEyebrow}</p>

            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                {property.name || t.pageTitleFallback}
              </h1>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                {t.pageSubtitle}
              </p>

              <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                {property.code ? <span>{t.propertyCode}: {property.code}</span> : null}
                {property.address ? <span>• {property.address}</span> : null}
                {property.city ? <span>• {property.city}</span> : null}
                {property.region ? <span>• {property.region}</span> : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {getPropertyTypeLabel(language, property.type)}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {getPropertyStatusLabel(language, property.status)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/properties/${propertyId}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t.backToProperty}
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title={t.cleaningSummary}
          value={primaryCleaningTemplate ? t.configured : t.missing}
        />
        <SummaryCard
          title={t.suppliesSummary}
          value={supplyRows.length > 0 ? t.configured : t.missing}
        />
        <SummaryCard
          title={t.issuesSummary}
          value={primaryIssueTemplate ? t.configured : t.missing}
        />
        <SummaryCard title={t.activeSupplies} value={String(supplyRows.length)} />
      </div>

      <Card>
        <SectionHeader
          icon={<IconClipboardList className="h-5 w-5" />}
          title={t.cleaningSectionTitle}
          description={t.cleaningSectionSubtitle}
          action={
            primaryCleaningTemplate ? (
              <Link
                href={`/property-checklists/${propertyId}/templates/cleaning`}
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t.editCleaning}
              </Link>
            ) : (
              <Link
                href={`/property-checklists/${propertyId}/templates/cleaning`}
                className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {t.createCleaning}
              </Link>
            )
          }
          guides={
            <>
              <HoverGuide title={t.cleaningGuide1Title} description={t.cleaningGuide1Text} />
              <HoverGuide title={t.cleaningGuide2Title} description={t.cleaningGuide2Text} />
              <HoverGuide title={t.cleaningGuide3Title} description={t.cleaningGuide3Text} />
              <HoverGuide
                title={language === "en" ? "Core hint" : "Βασική οδηγία"}
                description={cleaningHint}
              />
            </>
          }
        />

        <div className="p-5 sm:p-6">
          {primaryCleaningTemplate ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard label={t.cleaningPrimaryTemplate} value={primaryCleaningTemplate.title} />
                <InfoCard
                  label={t.cleaningItemsCount}
                  value={String(primaryCleaningTemplate.items.length)}
                />
                <InfoCard
                  label={t.cleaningStatus}
                  value={primaryCleaningTemplate.isActive ? t.activeBadge : t.inactiveBadge}
                />
                <InfoCard
                  label={language === "en" ? "Last update" : "Τελευταία ενημέρωση"}
                  value={formatDateTime(primaryCleaningTemplate.updatedAt, locale)}
                />
              </div>

              {primaryCleaningTemplate.description ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {primaryCleaningTemplate.description}
                </div>
              ) : null}

              {primaryCleaningTemplate.items.length > 0 ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-800">{t.checklistItems}</p>

                  <div className="space-y-3">
                    {primaryCleaningTemplate.items.map((item) => (
                      <ChecklistItemCard key={item.id} item={item} language={language} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  {t.noCleaningSubtitle}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-base font-semibold text-amber-900">{t.noCleaningTitle}</h3>
              <p className="mt-2 text-sm text-amber-800">{t.noCleaningSubtitle}</p>

              <div className="mt-4">
                <Link
                  href={`/property-checklists/${propertyId}/templates/cleaning`}
                  className="inline-flex items-center rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                >
                  {t.createCleaning}
                </Link>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader
          icon={<IconPackage2 className="h-5 w-5" />}
          title={t.suppliesSectionTitle}
          description={t.suppliesSectionSubtitle}
          action={
            <button
              type="button"
              onClick={() => setSuppliesOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {suppliesOpen ? t.closeSupplies : t.openSupplies}
              {suppliesOpen ? (
                <IconChevronUp className="h-4 w-4" />
              ) : (
                <IconChevronDown className="h-4 w-4" />
              )}
            </button>
          }
          guides={
            <>
              <HoverGuide title={t.suppliesGuide1Title} description={t.suppliesGuide1Text} />
              <HoverGuide title={t.suppliesGuide2Title} description={t.suppliesGuide2Text} />
              <HoverGuide title={t.suppliesGuide3Title} description={t.suppliesGuide3Text} />
              <HoverGuide
                title={language === "en" ? "Core hint" : "Βασική οδηγία"}
                description={suppliesHint}
              />
            </>
          }
        />

        <div className="p-5 sm:p-6">
          {supplyRows.length > 0 ? (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="text-base font-semibold text-emerald-900">{t.suppliesReadyTitle}</h3>
                <p className="mt-2 text-sm text-emerald-800">{t.suppliesReadySubtitle}</p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <InfoCard
                    label={t.activeSuppliesCount}
                    value={String(supplyRows.length)}
                  />
                  <InfoCard label={t.suppliesSummary} value={t.configured} />
                </div>

                {suppliesPreview.length > 0 ? (
                  <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-800">{t.sampleItems}</p>

                    <div className="flex flex-wrap gap-2">
                      {suppliesPreview.map((supply) => (
                        <span
                          key={supply.id}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {supply.displayName}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SupplyCounterButton
                  title={t.allSupplies}
                  count={supplyCounters.all}
                  active={suppliesOpen && supplyFilter === "all"}
                  onClick={() => {
                    setSuppliesOpen(true)
                    setSupplyFilter("all")
                  }}
                  tone="slate"
                  helper={t.allSuppliesHelper}
                />

                <SupplyCounterButton
                  title={t.missingSupplies}
                  count={supplyCounters.missing}
                  active={suppliesOpen && supplyFilter === "missing"}
                  onClick={() => {
                    setSuppliesOpen(true)
                    setSupplyFilter("missing")
                  }}
                  tone="red"
                  helper={t.missingSuppliesHelper}
                />

                <SupplyCounterButton
                  title={t.mediumSupplies}
                  count={supplyCounters.medium}
                  active={suppliesOpen && supplyFilter === "medium"}
                  onClick={() => {
                    setSuppliesOpen(true)
                    setSupplyFilter("medium")
                  }}
                  tone="amber"
                  helper={t.mediumSuppliesHelper}
                />

                <SupplyCounterButton
                  title={t.fullSupplies}
                  count={supplyCounters.full}
                  active={suppliesOpen && supplyFilter === "full"}
                  onClick={() => {
                    setSuppliesOpen(true)
                    setSupplyFilter("full")
                  }}
                  tone="emerald"
                  helper={t.fullSuppliesHelper}
                />
              </div>

              {suppliesOpen ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">{t.visibleGroup}:</span>{" "}
                    {supplyFilter === "all"
                      ? t.allSupplies
                      : supplyFilter === "missing"
                        ? t.missingSupplies
                        : supplyFilter === "medium"
                          ? t.mediumSupplies
                          : t.fullSupplies}
                  </div>

                  {visibleSupplies.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                      {t.noSuppliesForFilter}
                    </div>
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-2">
                      {visibleSupplies.map((row) => (
                        <SupplyRowCard
                          key={row.id}
                          row={row}
                          language={language}
                          locale={locale}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="mt-5 flex justify-end">
                <Link
                  href={`/properties/${propertyId}/supplies`}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {t.manageSupplies}
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-base font-semibold text-amber-900">
                {language === "en"
                  ? "No active supplies have been defined yet."
                  : "Δεν έχουν οριστεί ακόμη ενεργά αναλώσιμα."}
              </h3>
              <p className="mt-2 text-sm text-amber-800">
                {language === "en"
                  ? "Go to supplies and activate the supplies that belong to this property. The dynamic supplies list will then be built automatically."
                  : "Πήγαινε στα αναλώσιμα και ενεργοποίησε όσα ανήκουν σε αυτό το ακίνητο. Η δυναμική λίστα αναλωσίμων θα χτιστεί αυτόματα."}
              </p>

              <div className="mt-4">
                <Link
                  href={`/properties/${propertyId}/supplies`}
                  className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                >
                  {t.manageSupplies}
                </Link>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader
          icon={<IconWrench className="h-5 w-5" />}
          title={t.issuesSectionTitle}
          description={t.issuesSectionSubtitle}
          action={
            primaryIssueTemplate ? (
              <Link
                href={`/property-checklists/${propertyId}/templates/issues`}
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t.editIssues}
              </Link>
            ) : (
              <Link
                href={`/property-checklists/${propertyId}/templates/issues`}
                className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {t.createIssues}
              </Link>
            )
          }
          guides={
            <>
              <HoverGuide title={t.issuesGuide1Title} description={t.issuesGuide1Text} />
              <HoverGuide title={t.issuesGuide2Title} description={t.issuesGuide2Text} />
              <HoverGuide title={t.issuesGuide3Title} description={t.issuesGuide3Text} />
              <HoverGuide
                title={language === "en" ? "Core hint" : "Βασική οδηγία"}
                description={issuesHint}
              />
            </>
          }
        />

        <div className="p-5 sm:p-6">
          {primaryIssueTemplate ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard label={t.issuesPrimaryTemplate} value={primaryIssueTemplate.title} />
                <InfoCard
                  label={t.issueItemsCount}
                  value={String(primaryIssueTemplate.items.length)}
                />
                <InfoCard
                  label={t.issueStatus}
                  value={primaryIssueTemplate.isActive ? t.activeBadge : t.inactiveBadge}
                />
                <InfoCard
                  label={language === "en" ? "Last update" : "Τελευταία ενημέρωση"}
                  value={formatDateTime(primaryIssueTemplate.updatedAt, locale)}
                />
              </div>

              {primaryIssueTemplate.description ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {primaryIssueTemplate.description}
                </div>
              ) : null}

              {primaryIssueTemplate.items.length > 0 ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-800">{t.issueItems}</p>

                  <div className="space-y-3">
                    {primaryIssueTemplate.items.map((item) => (
                      <IssueItemCard key={item.id} item={item} language={language} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  {t.noIssuesSubtitle}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-base font-semibold text-amber-900">{t.noIssuesTitle}</h3>
              <p className="mt-2 text-sm text-amber-800">{t.noIssuesSubtitle}</p>

              <div className="mt-4">
                <Link
                  href={`/property-checklists/${propertyId}/templates/issues`}
                  className="inline-flex items-center rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                >
                  {t.createIssues}
                </Link>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}