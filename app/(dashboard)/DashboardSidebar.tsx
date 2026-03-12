"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

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

  const items: NavItem[] = [
    { label: "Πίνακας ελέγχου", href: "/dashboard" },
    { label: "Ακίνητα", href: "/properties" },
    { label: "Εργασίες", href: "/tasks" },
    { label: "Συνεργάτες", href: "/partners" },
    { label: "Χρήστες οργανισμού", href: "/users" },
    { label: "Ημερολόγιο", href: "/calendar" },
    { label: "Checklists", href: "/checklists" },
    { label: "Ο λογαριασμός μου", href: "/account" },
    { label: "Ρυθμίσεις", href: "/settings" },
  ]

  return (
    <aside className="hidden xl:flex xl:w-[280px] xl:flex-col">
      <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Πλοήγηση
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Κεντρική πρόσβαση στις βασικές ενότητες του συστήματος.
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