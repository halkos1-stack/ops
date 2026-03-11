import Link from "next/link"
import DashboardSidebar from "./DashboardSidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6 xl:px-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="block">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                OPS SAAS
              </div>
              <div className="text-2xl font-bold tracking-tight text-slate-950">
                Πίνακας ελέγχου
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-slate-900">
                admin@ops.local
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                SUPER ADMIN
              </div>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
              A
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 xl:px-8">
        <div className="flex gap-6">
          <DashboardSidebar />

          <main className="min-w-0 flex-1">
            <div className="space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}