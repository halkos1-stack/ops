import DashboardSidebar from "./DashboardSidebar"
import DashboardLogoutButton from "@/components/layout/DashboardLogoutButton"
import SuperAdminBackToManagementLink from "@/components/layout/SuperAdminBackToManagementLink"
import DashboardLayoutShell from "@/components/layout/DashboardLayoutShell"
import { requireAppAccess } from "@/lib/auth"

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

  const initials = getInitials(auth.name, auth.email)
  const isSuperAdmin = auth.systemRole === "SUPER_ADMIN"

  return (
    <DashboardLayoutShell
      name={auth.name}
      email={auth.email}
      organizationId={auth.organizationId}
      systemRole={auth.systemRole}
      organizationRole={auth.organizationRole}
      initials={initials}
      sidebar={<DashboardSidebar />}
      headerActions={
        <>
          {isSuperAdmin ? <SuperAdminBackToManagementLink /> : null}
          <DashboardLogoutButton />
        </>
      }
    >
      {children}
    </DashboardLayoutShell>
  )
}