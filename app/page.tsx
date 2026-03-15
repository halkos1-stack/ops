import { redirect } from "next/navigation"
import { getAuthContext } from "@/lib/auth"

export default async function HomePage() {
  const auth = await getAuthContext()

  if (!auth) {
    redirect("/login")
  }

  if (auth.systemRole === "SUPER_ADMIN") {
    redirect("/super-admin/organizations")
  }

  if (
    auth.organizationRole === "MANAGER" ||
    auth.organizationRole === "ORG_ADMIN"
  ) {
    redirect("/properties")
  }

  if (auth.organizationRole === "PARTNER") {
    redirect("/login")
  }

  redirect("/login")
}