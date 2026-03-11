"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode, useEffect, useState } from "react"

type DashboardLayoutProps = {
  children: ReactNode
}

const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    shortLabel: "DB",
  },
  {
    label: "Ακίνητα",
    href: "/properties",
    shortLabel: "ΑΚ",
  },
  {
    label: "Κρατήσεις",
    href: "/bookings",
    shortLabel: "ΚΡ",
  },
  {
    label: "Εργασίες",
    href: "/tasks",
    shortLabel: "ΕΡ",
  },
  {
    label: "Συνεργάτες",
    href: "/partners",
    shortLabel: "ΣΥ",
  },
  {
    label: "Ημερολόγιο",
    href: "/calendar",
    shortLabel: "ΗΜ",
  },
  {
    label: "Ρυθμίσεις",
    href: "/settings",
    shortLabel: "ΡΥ",
  },
  {
  label: "Checklists",
  href: "/checklists",
  shortLabel: "CL",
},
]

function getPageTitle(pathname: string) {
  if (pathname === "/dashboard") return "Dashboard"
  if (pathname === "/properties") return "Ακίνητα"
  if (pathname === "/tasks") return "Εργασίες"
  if (pathname === "/partners") return "Συνεργάτες"
  if (pathname === "/calendar") return "Ημερολόγιο"
  if (pathname === "/settings") return "Ρυθμίσεις"
  if (pathname === "/bookings") return "Κρατήσεις"
  return "OPS"
}

function isItemActive(pathname: string, href: string) {
  return pathname === href
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const currentPageTitle = getPageTitle(pathname)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-800 bg-[#06153a] text-white lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-900/30">
                OPS
              </div>

              <div>
                <p className="text-lg font-semibold tracking-tight">OPS SaaS</p>
                <p className="text-xs text-slate-300">
                  Σύστημα διαχείρισης λειτουργιών
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Πλοήγηση
            </p>

            <nav className="space-y-1.5">
              {navigationItems.map((item) => {
                const active = isItemActive(pathname, item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-white/10 text-white shadow-inner"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold transition ${
                        active
                          ? "bg-blue-600 text-white"
                          : "bg-white/5 text-slate-300 group-hover:bg-white/10 group-hover:text-white"
                      }`}
                    >
                      {item.shortLabel}
                    </div>

                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">OPS Workspace</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                Κεντρικός πίνακας διαχείρισης ακινήτων, εργασιών και συνεργατών.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
                  aria-label="Άνοιγμα μενού"
                >
                  ☰
                </button>

                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                    {currentPageTitle}
                  </h1>
                  <p className="hidden text-xs text-slate-500 sm:block">
                    Επιχειρησιακή διαχείριση OPS
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 sm:block">
                  <p className="text-xs font-medium text-slate-500">
                    Περιβάλλον
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    Παραγωγή
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  K
                </div>
              </div>
            </div>
          </header>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                type="button"
                aria-label="Κλείσιμο μενού"
                className="absolute inset-0 bg-slate-950/50"
                onClick={() => setMobileMenuOpen(false)}
              />

              <div className="relative h-full w-[86%] max-w-xs border-r border-slate-800 bg-[#06153a] text-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white">
                      OPS
                    </div>

                    <div>
                      <p className="text-base font-semibold">OPS SaaS</p>
                      <p className="text-xs text-slate-300">Μενού πλοήγησης</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                    aria-label="Κλείσιμο"
                  >
                    ✕
                  </button>
                </div>

                <div className="px-4 py-5">
                  <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Πλοήγηση
                  </p>

                  <nav className="space-y-1.5">
                    {navigationItems.map((item) => {
                      const active = isItemActive(pathname, item.href)

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                            active
                              ? "bg-white/10 text-white"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold ${
                              active
                                ? "bg-blue-600 text-white"
                                : "bg-white/5 text-slate-300"
                            }`}
                          >
                            {item.shortLabel}
                          </div>

                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </nav>
                </div>
              </div>
            </div>
          )}

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}