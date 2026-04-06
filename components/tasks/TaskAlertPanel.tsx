"use client"

type TaskAlertPanelProps = {
  title: string
  description: string
  enabledLabel: string
  timeLabel: string
  enabled: boolean
  value: string
  onEnabledChange: (checked: boolean) => void
  onValueChange: (value: string) => void
  className?: string
}

export function TaskAlertPanel({
  title,
  description,
  enabledLabel,
  timeLabel,
  enabled,
  value,
  onEnabledChange,
  onValueChange,
  className = "",
}: TaskAlertPanelProps) {
  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-slate-50 p-4 ${className}`.trim()}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-slate-950">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{description}</div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          {enabledLabel}
        </label>
      </div>

      {enabled ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            {timeLabel}
          </label>
          <input
            type="datetime-local"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
          />
        </div>
      ) : null}
    </div>
  )
}
