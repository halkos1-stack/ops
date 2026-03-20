"use client"

import { signOut } from "next-auth/react"
import { useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

export default function DashboardLogoutButton() {
  const { language } = useAppLanguage()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    try {
      setLoading(true)
      await signOut({
        callbackUrl: "/login",
      })
    } catch (error) {
      console.error("Logout error:", error)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading
        ? language === "en"
          ? "Signing out..."
          : "Αποσύνδεση..."
        : language === "en"
          ? "Sign out"
          : "Αποσύνδεση"}
    </button>
  )
}