import type { ReactNode } from "react"
import Link from "next/link"
import { requireSuperAdmin } from "@/lib/auth"
import SuperAdminLogoutButton from "@/components/layout/SuperAdminLogoutButton"

export default async function SuperAdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const auth = await requireSuperAdmin()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              OPS SaaS
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Περιοχή SUPER ADMIN
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Κεντρική διαχείριση πλατφόρμας, οργανισμών και κατάστασης λειτουργίας.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="text-left lg:text-right">
              <p className="text-sm font-semibold text-slate-900">{auth.email}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                SUPER_ADMIN
              </p>
            </div>

            <SuperAdminLogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Πλοήγηση
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Κεντρικές λειτουργίες επιπέδου πλατφόρμας.
            </p>
          </div>

          <nav className="mt-4 space-y-2">
            <Link
              href="/super-admin/organizations"
              className="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            >
              Οργανισμοί
            </Link>

            <Link
              href="/properties"
              className="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            >
              Επιστροφή στην εφαρμογή
            </Link>
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  )
}