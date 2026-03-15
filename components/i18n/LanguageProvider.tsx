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
  const [language, setLanguageState] = useState<AppLanguage>("el")
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const storedValue =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null

    const normalized = normalizeLanguage(storedValue)
    setLanguageState(normalized)
    document.documentElement.lang = normalized
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    window.localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language, isHydrated])

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