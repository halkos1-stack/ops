"use client"

import Link from "next/link"
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"
import {
  getDashboardLayoutTexts,
  getRoleLabel,
} from "@/lib/i18n/translations"

type DashboardLayoutShellProps = {
  name: string | null
  email: string
  organizationId: string | null
  systemRole: "SUPER_ADMIN" | "USER"
  organizationRole: "ORG_ADMIN" | "MANAGER" | "PARTNER" | null
  initials: string
  sidebar: React.ReactNode
  headerActions: React.ReactNode
  children: React.ReactNode
}

export default function DashboardLayoutShell({
  name,
  email,
  organizationId,
  systemRole,
  organizationRole,
  initials,
  sidebar,
  headerActions,
  children,
}: DashboardLayoutShellProps) {
  const { language } = useAppLanguage()

  const texts = getDashboardLayoutTexts(language)
  const isSuperAdmin = systemRole === "SUPER_ADMIN"
  const roleLabel = getRoleLabel(language, {
    systemRole,
    organizationRole,
  })

  const brand = "OPS"
  const title = language === "en" ? "Dashboard" : "Πίνακας ελέγχου"
  const superAdminDescription =
    language === "en"
      ? "Central access to the OPS core and organization management."
      : "Κεντρική πρόσβαση στον πυρήνα του OPS και στη διαχείριση οργανισμών."

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 xl:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Link
                href="/dashboard"
                className="block min-w-0"
                aria-label={texts.dashboardHrefLabel}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {brand}
                </div>
                <div className="truncate text-2xl font-bold tracking-tight text-slate-950">
                  {title}
                </div>
              </Link>

              <div className="hidden h-10 w-px bg-slate-200 lg:block" />

              <div className="hidden min-w-0 lg:block">
                {isSuperAdmin ? (
                  <p className="text-sm text-slate-600">
                    {superAdminDescription}
                  </p>
                ) : (
                  <p className="text-sm text-slate-600">
                    {texts.organizationDescription}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <LanguageSwitcher />
                {headerActions}
              </div>

              <div className="flex items-center gap-3 self-start xl:self-end">
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold text-slate-900">
                    {name || email}
                  </div>

                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {roleLabel}
                  </div>

                  {organizationId && !isSuperAdmin ? (
                    <div className="mt-1 text-xs text-slate-500">
                      {texts.organizationLabel}: {organizationId}
                    </div>
                  ) : null}
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                  {initials}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 xl:px-8">
        <div className="flex gap-6">
          {sidebar}

          <main className="min-w-0 flex-1">
            {isSuperAdmin ? (
              <div className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900 shadow-sm">
                {texts.superAdminBannerPrefix}{" "}
                <span className="font-semibold">
                  {texts.superAdminBannerRole}
                </span>{" "}
                {texts.superAdminBannerSuffix}{" "}
                <span className="font-semibold">
                  {texts.superAdminBannerManagement}
                </span>
                .
              </div>
            ) : null}

            <div className="space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}