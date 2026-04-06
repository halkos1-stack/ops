"use client"

import type { ReactNode } from "react"

type ChecklistOption = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

type TaskChecklistPanelProps = {
  title: string
  options: ChecklistOption[]
  className?: string
  footer?: ReactNode
}

export function TaskChecklistPanel({
  title,
  options,
  className = "",
  footer,
}: TaskChecklistPanelProps) {
  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-slate-50 p-4 ${className}`.trim()}
    >
      <div className="mb-3 font-semibold text-slate-950">{title}</div>

      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.label}
            className={`flex items-center gap-2 text-sm ${
              option.disabled ? "cursor-not-allowed text-slate-400" : "text-slate-700"
            }`}
          >
            <input
              type="checkbox"
              checked={option.checked}
              disabled={option.disabled}
              onChange={(e) => option.onChange(e.target.checked)}
            />
            {option.label}
          </label>
        ))}
      </div>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  )
}
