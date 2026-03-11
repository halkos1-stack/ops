import type { ReactNode } from "react"
import Link from "next/link"
import { requireSuperAdmin } from "@/lib/auth"

export default async function SuperAdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const auth = await requireSuperAdmin()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              OPS SaaS
            </p>
            <h1 className="text-xl font-bold text-slate-900">
              Περιοχή SUPER ADMIN
            </h1>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{auth.email}</p>
            <p className="text-xs text-slate-500">SUPER_ADMIN</p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border bg-white p-4 shadow-sm">
          <nav className="space-y-2">
            <Link
              href="/super-admin/organizations"
              className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Οργανισμοί
            </Link>

            <Link
              href="/properties"
              className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
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