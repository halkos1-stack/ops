import Link from "next/link"
import DashboardSidebar from "./DashboardSidebar"
import DashboardLogoutButton from "@/components/layout/DashboardLogoutButton"
import SuperAdminBackToManagementLink from "@/components/layout/SuperAdminBackToManagementLink"
import { requireAppAccess } from "@/lib/auth"

function getRoleLabel(
  systemRole: "SUPER_ADMIN" | "USER",
  organizationRole: "ORG_ADMIN" | "MANAGER" | "PARTNER" | null
) {
  if (systemRole === "SUPER_ADMIN") return "SUPER ADMIN"
  if (organizationRole === "ORG_ADMIN") return "ΔΙΑΧΕΙΡΙΣΤΗΣ ΟΡΓΑΝΙΣΜΟΥ"
  if (organizationRole === "MANAGER") return "MANAGER"
  if (organizationRole === "PARTNER") return "ΣΥΝΕΡΓΑΤΗΣ"
  return "ΧΡΗΣΤΗΣ"
}

function getInitials(name: string | null, email: string) {
  const source = (name && name.trim()) || email.trim()

  if (!source) return "U"

  const parts = source.split(" ").filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await requireAppAccess()

  const roleLabel = getRoleLabel(auth.systemRole, auth.organizationRole)
  const initials = getInitials(auth.name, auth.email)
  const isSuperAdmin = auth.systemRole === "SUPER_ADMIN"

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 xl:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Link href="/dashboard" className="block min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  OPS SAAS
                </div>
                <div className="truncate text-2xl font-bold tracking-tight text-slate-950">
                  Πίνακας ελέγχου
                </div>
              </Link>

              <div className="hidden h-10 w-px bg-slate-200 lg:block" />

              <div className="hidden min-w-0 lg:block">
                {isSuperAdmin ? (
                  <p className="text-sm text-slate-600">
                    Πρόσβαση στο κεντρικό OPS από περιοχή πλατφόρμας.
                  </p>
                ) : (
                  <p className="text-sm text-slate-600">
                    Κεντρική προβολή λειτουργίας οργανισμού, ακινήτων, εργασιών και συνεργατών.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap items-center gap-2">
                {isSuperAdmin ? <SuperAdminBackToManagementLink /> : null}
                <DashboardLogoutButton />
              </div>

              <div className="flex items-center gap-3 self-start xl:self-end">
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold text-slate-900">
                    {auth.name || auth.email}
                  </div>

                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {roleLabel}
                  </div>

                  {auth.organizationId && !isSuperAdmin ? (
                    <div className="mt-1 text-xs text-slate-500">
                      Οργανισμός: {auth.organizationId}
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
          <DashboardSidebar />

          <main className="min-w-0 flex-1">
            {isSuperAdmin ? (
              <div className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900 shadow-sm">
                Βρίσκεσαι στο κεντρικό OPS ως <span className="font-semibold">SUPER ADMIN</span>. Μπορείς να επιστρέψεις οποιαδήποτε στιγμή στη
                <span className="font-semibold"> διαχείριση οργανισμών</span> από το αντίστοιχο κουμπί στο πάνω μέρος.
              </div>
            ) : null}

            <div className="space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}