import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-options"

export type SessionSystemRole = "SUPER_ADMIN" | "USER"
export type SessionOrganizationRole = "ORG_ADMIN" | "MANAGER" | "PARTNER" | null

export type AuthContext = {
  userId: string
  email: string
  name: string | null
  systemRole: SessionSystemRole
  organizationId: string | null
  organizationRole: SessionOrganizationRole
}

function normalizeSystemRole(value: unknown): SessionSystemRole {
  if (value === "SUPER_ADMIN") return "SUPER_ADMIN"
  return "USER"
}

function normalizeOrganizationRole(value: unknown): SessionOrganizationRole {
  if (value === "ORG_ADMIN") return "ORG_ADMIN"
  if (value === "MANAGER") return "MANAGER"
  if (value === "PARTNER") return "PARTNER"
  return null
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  const user = session.user as {
    id?: string
    email?: string | null
    name?: string | null
    systemRole?: unknown
    organizationId?: string | null
    organizationRole?: unknown
  }

  if (!user.id || !user.email) {
    return null
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name ?? null,
    systemRole: normalizeSystemRole(user.systemRole),
    organizationId: user.organizationId ?? null,
    organizationRole: normalizeOrganizationRole(user.organizationRole),
  }
}

export async function requireUser(): Promise<AuthContext> {
  const auth = await getAuthContext()

  if (!auth) {
    redirect("/login")
  }

  return auth
}

export async function requireSuperAdmin(): Promise<AuthContext> {
  const auth = await requireUser()

  if (auth.systemRole !== "SUPER_ADMIN") {
    redirect("/")
  }

  return auth
}

export async function requirePartner(): Promise<AuthContext> {
  const auth = await requireUser()

  if (!auth.organizationId || auth.organizationRole !== "PARTNER") {
    redirect("/")
  }

  return auth
}

export async function requireManager(): Promise<AuthContext> {
  const auth = await requireUser()

  if (auth.systemRole === "SUPER_ADMIN") {
    return auth
  }

  if (!auth.organizationId || auth.organizationRole !== "MANAGER") {
    redirect("/")
  }

  return auth
}

export async function requireOrgAdmin(): Promise<AuthContext> {
  const auth = await requireUser()

  if (auth.systemRole === "SUPER_ADMIN") {
    return auth
  }

  if (!auth.organizationId || auth.organizationRole !== "ORG_ADMIN") {
    redirect("/")
  }

  return auth
}

export async function requireManagerOrOrgAdmin(): Promise<AuthContext> {
  const auth = await requireUser()

  if (auth.systemRole === "SUPER_ADMIN") {
    return auth
  }

  if (!auth.organizationId) {
    redirect("/")
  }

  if (auth.organizationRole !== "MANAGER" && auth.organizationRole !== "ORG_ADMIN") {
    redirect("/")
  }

  return auth
}

export async function requireAppAccess(): Promise<AuthContext> {
  const auth = await requireUser()

  if (auth.systemRole === "SUPER_ADMIN") {
    return auth
  }

  if (!auth.organizationId) {
    redirect("/")
  }

  if (auth.organizationRole === "ORG_ADMIN" || auth.organizationRole === "MANAGER") {
    return auth
  }

  redirect("/")
}

export async function getCurrentOrganizationId(): Promise<string | null> {
  const auth = await getAuthContext()
  return auth?.organizationId ?? null
}

export async function getCurrentUserId(): Promise<string | null> {
  const auth = await getAuthContext()
  return auth?.userId ?? null
}

export async function isSuperAdmin(): Promise<boolean> {
  const auth = await getAuthContext()
  return auth?.systemRole === "SUPER_ADMIN"
}

export async function isPartner(): Promise<boolean> {
  const auth = await getAuthContext()
  return auth?.organizationRole === "PARTNER"
}

export async function isManagerOrOrgAdmin(): Promise<boolean> {
  const auth = await getAuthContext()

  if (!auth) return false
  if (auth.systemRole === "SUPER_ADMIN") return true
  if (!auth.organizationId) return false

  return auth.organizationRole === "MANAGER" || auth.organizationRole === "ORG_ADMIN"
}

export async function hasAppAccess(): Promise<boolean> {
  const auth = await getAuthContext()

  if (!auth) return false
  if (auth.systemRole === "SUPER_ADMIN") return true
  if (!auth.organizationId) return false

  return auth.organizationRole === "ORG_ADMIN" || auth.organizationRole === "MANAGER"
}