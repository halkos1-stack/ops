"use client"

import Link from "next/link"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

export default function SuperAdminBackToManagementLink() {
  const { language } = useAppLanguage()

  return (
    <Link
      href="/super-admin/organizations"
      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {language === "en"
        ? "Back to organization management"
        : "Επιστροφή στη διαχείριση οργανισμών"}
    </Link>
  )
}