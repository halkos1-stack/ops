"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type NavItem = {
  label: string
  href: string
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function DashboardSidebar() {
  const pathname = usePathname()
  const { language } = useAppLanguage()

  const items: NavItem[] =
    language === "en"
      ? [
          { label: "AI assistant", href: "/ai-assistant" },
          { label: "Task control board", href: "/dashboard" },
          { label: "Bookings", href: "/bookings" },
          { label: "Properties", href: "/properties" },
          { label: "Tasks", href: "/tasks" },
          { label: "Calendar", href: "/calendar" },
          { label: "Partners", href: "/partners" },
          { label: "My account", href: "/account" },
          { label: "Settings", href: "/settings" },
        ]
      : [
          { label: "AI βοηθός", href: "/ai-assistant" },
          { label: "Πίνακας ελέγχου εργασιών", href: "/dashboard" },
          { label: "Κρατήσεις", href: "/bookings" },
          { label: "Ακίνητα", href: "/properties" },
          { label: "Εργασίες", href: "/tasks" },
          { label: "Ημερολόγιο", href: "/calendar" },
          { label: "Συνεργάτες", href: "/partners" },
          { label: "Ο λογαριασμός μου", href: "/account" },
          { label: "Ρυθμίσεις", href: "/settings" },
        ]

  const navTitle = language === "en" ? "Navigation" : "Πλοήγηση"
  const navDescription =
    language === "en"
      ? "Central access to the main sections of the system."
      : "Κεντρική πρόσβαση στις βασικές ενότητες του συστήματος."

  return (
    <aside className="hidden xl:flex xl:w-[280px] xl:flex-col">
      <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {navTitle}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {navDescription}
          </p>
        </div>

        <nav className="mt-4 space-y-2">
          {items.map((item) => {
            const active = isActivePath(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "flex items-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm"
                    : "flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                }
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
