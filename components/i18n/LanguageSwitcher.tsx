"use client"

import { AppLanguage, useAppLanguage } from "./LanguageProvider"

type LanguageSwitcherProps = {
  compact?: boolean
}

function LanguageButton({
  value,
  label,
  isActive,
  onClick,
}: {
  value: AppLanguage
  label: string
  isActive: boolean
  onClick: (value: AppLanguage) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={[
        "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition",
        isActive
          ? "bg-slate-950 text-white shadow-sm"
          : "bg-white text-slate-700 hover:bg-slate-100",
      ].join(" ")}
      aria-pressed={isActive}
    >
      {label}
    </button>
  )
}

export default function LanguageSwitcher({
  compact = false,
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useAppLanguage()

  return (
    <div
      className={[
        "inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1",
        compact ? "gap-1" : "gap-1.5",
      ].join(" ")}
    >
      <LanguageButton
        value="el"
        label={compact ? "EL" : "Ελληνικά"}
        isActive={language === "el"}
        onClick={setLanguage}
      />
      <LanguageButton
        value="en"
        label={compact ? "EN" : "English"}
        isActive={language === "en"}
        onClick={setLanguage}
      />
    </div>
  )
}