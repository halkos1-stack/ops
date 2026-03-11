"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useMemo, useState } from "react"

type DashboardShellProps = {
  children: React.ReactNode
  user: {
    name: string
    email: string
    systemRole: string
    organizationName: string
    organizationRole: string
  }
}

type NavigationItem = {
  href: string
  label: string
  description: string
  icon: React.ReactNode
}

const navigation: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Γενική εικόνα λειτουργίας",
    icon: <DashboardIcon />,
  },
  {
    href: "/properties",
    label: "Ακίνητα",
    description: "Διαχείριση ακινήτων",
    icon: <PropertyIcon />,
  },
  {
    href: "/tasks",
    label: "Εργασίες",
    description: "Αναθέσεις και ιστορικό",
    icon: <TaskIcon />,
  },
  {
    href: "/partners",
    label: "Συνεργάτες",
    description: "Ομάδα και συνεργεία",
    icon: <PartnerIcon />,
  },
  {
    href: "/calendar",
    label: "Ημερολόγιο",
    description: "Πρόγραμμα και ημερομηνίες",
    icon: <CalendarIcon />,
  },
  {
    href: "/settings",
    label: "Ρυθμίσεις",
    description: "Παράμετροι οργανισμού",
    icon: <SettingsIcon />,
  },
]

export default function DashboardShell({
  children,
  user,
}: DashboardShellProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const currentPage = useMemo(() => {
    return (
      navigation.find((item) =>
        item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname === item.href || pathname.startsWith(`${item.href}/`)
      ) || navigation[0]
    )
  }, [pathname])

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-[290px] shrink-0 border-r border-slate-200 bg-white xl:flex xl:flex-col">
          <div className="border-b border-slate-200 px-7 py-7">
            <Link href="/dashboard" className="block">
              <div className="text-3xl font-bold tracking-tight text-slate-950">
                OPS SaaS
              </div>
              <div className="mt-3 text-sm font-medium text-slate-600">
                {user.organizationName}
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                {user.organizationRole}
              </div>
            </Link>
          </div>

          <div className="flex-1 px-4 py-6">
            <div className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Κύρια Πλοήγηση
            </div>

            <nav className="space-y-2">
              {navigation.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "group flex items-center gap-3 rounded-2xl px-3 py-3 transition",
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition",
                        isActive
                          ? "border-slate-700 bg-slate-800 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 group-hover:border-slate-300 group-hover:bg-white",
                      ].join(" ")}
                    >
                      {item.icon}
                    </span>

                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {item.label}
                      </span>
                      <span
                        className={[
                          "block text-xs",
                          isActive ? "text-slate-300" : "text-slate-500",
                        ].join(" ")}
                      >
                        {item.description}
                      </span>
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="border-t border-slate-200 p-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Συνδεδεμένος χρήστης
              </div>

              <div className="mt-3 text-base font-semibold text-slate-950">
                {user.name}
              </div>

              <div className="mt-1 text-sm text-slate-500">{user.email}</div>

              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  {user.systemRole}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Αποσύνδεση
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex min-h-[84px] items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 xl:hidden"
                    aria-label="Άνοιγμα μενού"
                  >
                    <MenuIcon />
                  </button>

                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Πίνακας Ελέγχου
                    </div>
                    <div className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-950">
                      {currentPage.label}
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-500">
                      {currentPage.description} · {user.organizationName}
                    </div>
                  </div>
                </div>

                <div className="hidden items-center gap-3 md:flex">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Χρήστης
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {user.name}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="border-b border-slate-200 bg-white">
            <div className="px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-950">
                    Workspace
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Διαχείριση ακινήτων, εργασιών, συνεργατών και συνολικής
                    λειτουργίας οργανισμού.
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/properties"
                    className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Νέο ακίνητο
                  </Link>

                  <Link
                    href="/tasks"
                    className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Νέα εργασία
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-[340px] flex-col border-r border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
              <div>
                <div className="text-2xl font-bold tracking-tight text-slate-950">
                  OPS SaaS
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {user.organizationName}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
                aria-label="Κλείσιμο μενού"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Κύρια Πλοήγηση
              </div>

              <nav className="space-y-2">
                {navigation.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={[
                        "group flex items-center gap-3 rounded-2xl px-3 py-3 transition",
                        isActive
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition",
                          isActive
                            ? "border-slate-700 bg-slate-800 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-600",
                        ].join(" ")}
                      >
                        {item.icon}
                      </span>

                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {item.label}
                        </span>
                        <span
                          className={[
                            "block text-xs",
                            isActive ? "text-slate-300" : "text-slate-500",
                          ].join(" ")}
                        >
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  )
                })}
              </nav>
            </div>

            <div className="border-t border-slate-200 p-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Συνδεδεμένος χρήστης
                </div>

                <div className="mt-3 text-base font-semibold text-slate-950">
                  {user.name}
                </div>

                <div className="mt-1 text-sm text-slate-500">{user.email}</div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Αποσύνδεση
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DashboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="10" width="8" height="11" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </svg>
  )
}

function PropertyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 10.5L12 4l8 6.5" />
      <path d="M6.5 9.5V20h11V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  )
}

function TaskIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M9 11l2 2 4-4" />
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
  )
}

function PartnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="10" r="3" />
      <path d="M5 19a3.5 3.5 0 0 1 2-3.2" />
      <path d="M19 19a3.5 3.5 0 0 0-2-3.2" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2H9a1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1V9c0 .4.2.8.6.9h.2H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.4.1Z" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6l-12 12" />
    </svg>
  )
}