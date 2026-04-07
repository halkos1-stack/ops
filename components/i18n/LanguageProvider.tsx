"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

export type AppLanguage = "el" | "en"

type LanguageContextValue = {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
}

const STORAGE_KEY = "ops-language"

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
)

function normalizeLanguage(value: unknown): AppLanguage {
  return value === "en" ? "en" : "el"
}

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window === "undefined") {
      return "el"
    }

    return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY))
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage: AppLanguage) => {
        const normalized = normalizeLanguage(nextLanguage)
        setLanguageState(normalized)
      },
    }),
    [language]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useAppLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error("useAppLanguage must be used inside LanguageProvider")
  }

  return context
}
