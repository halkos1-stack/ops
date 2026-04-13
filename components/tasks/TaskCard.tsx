"use client"

import Link from "next/link"

type TaskCardBadge = {
  id?: string
  label: string
  className: string
  tooltip?: string
}

type TaskCardInfoItem = {
  id?: string
  label: string
  value: string
  tooltip?: string
}

type TaskCardStatePanel = {
  className: string
  titleClassName: string
  textClassName: string
  title: string
  description: string
  helper?: string
  nextStepLabel?: string
  nextStepValue?: string
}

type TaskCardProps = {
  className?: string
  title: string
  titleHref?: string
  subtitle?: string
  badges?: TaskCardBadge[]
  infoItems: TaskCardInfoItem[]
  checklistItems?: TaskCardBadge[]
  statePanel?: TaskCardStatePanel
  primaryAction: {
    href: string
    label: string
    className: string
  }
  secondaryAction?: {
    href: string
    label: string
    className: string
  }
}

function getStableItemKey(
  explicitId: string | undefined,
  parts: Array<string | undefined>,
  index: number
) {
  const cleanId = explicitId?.trim()
  if (cleanId) return cleanId

  const fallback = parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join("-")

  return fallback ? `${fallback}-${index}` : `task-card-item-${index}`
}

function dedupeBadges(items: TaskCardBadge[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    const signature = `${String(item.label || "").trim()}|${String(item.className || "").trim()}`

    if (!signature) return true
    if (seen.has(signature)) return false

    seen.add(signature)
    return true
  })
}

export function TaskCard({
  className = "",
  title,
  titleHref,
  subtitle,
  badges = [],
  infoItems,
  checklistItems = [],
  statePanel,
  primaryAction,
  secondaryAction,
}: TaskCardProps) {
  const infoGridClass =
    infoItems.length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2"

  const visibleBadges = dedupeBadges(badges)
  const visibleChecklistItems = dedupeBadges(checklistItems)

  return (
    <article className={`rounded-3xl border p-4 shadow-sm ${className}`.trim()}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {titleHref ? (
                <Link
                  href={titleHref}
                  className="text-base font-semibold text-slate-900 underline-offset-4 hover:underline"
                >
                  {title}
                </Link>
              ) : (
                <div className="text-base font-semibold text-slate-950">{title}</div>
              )}

              {visibleBadges.map((badge, index) => (
                <span
                  key={getStableItemKey(badge.id, [badge.label, badge.className], index)}
                  title={badge.tooltip}
                  className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`.trim()}
                >
                  {badge.label}
                </span>
              ))}
            </div>

            {subtitle ? <div className="mt-2 text-sm text-slate-500">{subtitle}</div> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {secondaryAction ? (
              <Link
                href={secondaryAction.href}
                className={`inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${secondaryAction.className}`.trim()}
              >
                {secondaryAction.label}
              </Link>
            ) : null}

            <Link
              href={primaryAction.href}
              className={`inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${primaryAction.className}`.trim()}
            >
              {primaryAction.label}
            </Link>
          </div>
        </div>

        {statePanel ? (
          <div className={statePanel.className}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className={statePanel.titleClassName}>{statePanel.title}</div>
                <div className={statePanel.textClassName}>{statePanel.description}</div>
                {statePanel.helper ? (
                  <div className={statePanel.textClassName}>{statePanel.helper}</div>
                ) : null}
              </div>

              {statePanel.nextStepLabel && statePanel.nextStepValue ? (
                <div className="shrink-0 rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm font-medium text-slate-900">
                  {statePanel.nextStepLabel}{" "}
                  <span className="font-semibold">{statePanel.nextStepValue}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className={`grid gap-3 ${infoGridClass}`}>
          {infoItems.map((item, index) => (
            <div
              key={getStableItemKey(item.id, [item.label, item.value], index)}
              className="rounded-2xl border border-slate-200 bg-white p-3"
              title={item.tooltip}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {item.label}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">{item.value}</div>
            </div>
          ))}
        </div>

        {visibleChecklistItems.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
            {visibleChecklistItems.map((item, index) => (
              <span
                key={getStableItemKey(item.id, [item.label, item.className], index)}
                title={item.tooltip}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ${item.className}`.trim()}
              >
                {item.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}
