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
          { label: "Dashboard", href: "/dashboard" },
          { label: "AI assistant", href: "/ai-assistant" },
          { label: "Properties", href: "/properties" },
          { label: "Bookings", href: "/bookings" },
          { label: "Tasks", href: "/tasks" },
          { label: "Partners", href: "/partners" },
          { label: "Organization users", href: "/users" },
          { label: "Calendar", href: "/calendar" },
          { label: "Checklists", href: "/checklists" },
          { label: "My account", href: "/account" },
          { label: "Settings", href: "/settings" },
        ]
      : [
          { label: "Πίνακας ελέγχου", href: "/dashboard" },
          { label: "AI βοηθός", href: "/ai-assistant" },
          { label: "Ακίνητα", href: "/properties" },
          { label: "Κρατήσεις", href: "/bookings" },
          { label: "Εργασίες", href: "/tasks" },
          { label: "Συνεργάτες", href: "/partners" },
          { label: "Χρήστες οργανισμού", href: "/users" },
          { label: "Ημερολόγιο", href: "/calendar" },
          { label: "Λίστες ελέγχου", href: "/checklists" },
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