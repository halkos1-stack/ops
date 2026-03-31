import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth"

export type RouteAccessContext = {
  userId: string
  name: string | null
  email: string
  systemRole: "SUPER_ADMIN" | "USER"
  organizationId: string | null
  organizationRole: "ORG_ADMIN" | "MANAGER" | "PARTNER" | null
  isSuperAdmin: boolean
}

export async function requireApiUser(): Promise<
  { ok: true; auth: RouteAccessContext } | { ok: false; response: NextResponse }
> {
  const auth = await getAuthContext()

  if (!auth) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Μη εξουσιοδοτημένη πρόσβαση." },
        { status: 401 }
      ),
    }
  }

  return {
    ok: true,
    auth: {
      userId: auth.userId,
      name: auth.name ?? null,
      email: auth.email,
      systemRole: auth.systemRole,
      organizationId: auth.organizationId,
      organizationRole: auth.organizationRole,
      isSuperAdmin: auth.systemRole === "SUPER_ADMIN",
    },
  }
}

export async function requireApiAppAccess(): Promise<
  { ok: true; auth: RouteAccessContext } | { ok: false; response: NextResponse }
> {
  const result = await requireApiUser()

  if (!result.ok) {
    return result
  }

  const { auth } = result

  if (auth.isSuperAdmin) {
    return result
  }

  if (!auth.organizationId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Δεν βρέθηκε οργανισμός χρήστη." },
        { status: 403 }
      ),
    }
  }

  if (
    auth.organizationRole !== "ORG_ADMIN" &&
    auth.organizationRole !== "MANAGER"
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Δεν έχετε πρόσβαση στην εφαρμογή." },
        { status: 403 }
      ),
    }
  }

  return result
}

export async function requireApiSuperAdmin(): Promise<
  { ok: true; auth: RouteAccessContext } | { ok: false; response: NextResponse }
> {
  const result = await requireApiUser()

  if (!result.ok) {
    return result
  }

  if (!result.auth.isSuperAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Η πρόσβαση επιτρέπεται μόνο σε SUPER_ADMIN." },
        { status: 403 }
      ),
    }
  }

  return result
}

export async function requireApiOrgAdminOnly(): Promise<
  { ok: true; auth: RouteAccessContext } | { ok: false; response: NextResponse }
> {
  const result = await requireApiUser()

  if (!result.ok) {
    return result
  }

  const { auth } = result

  if (!auth.organizationId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Δεν βρέθηκε οργανισμός χρήστη." },
        { status: 403 }
      ),
    }
  }

  if (auth.organizationRole !== "ORG_ADMIN") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Η πρόσβαση επιτρέπεται μόνο σε ORG_ADMIN." },
        { status: 403 }
      ),
    }
  }

  return result
}

export function buildTenantWhere<T extends Record<string, unknown>>(
  auth: RouteAccessContext,
  extraWhere?: T
): T & { organizationId?: string } {
  const base = (extraWhere ?? {}) as T

  if (auth.isSuperAdmin || !auth.organizationId) {
    return {
      ...base,
    } as T & { organizationId?: string }
  }

  return {
    ...base,
    organizationId: auth.organizationId,
  } as T & { organizationId?: string }
}

export function buildTenantCreateData<T extends Record<string, unknown>>(
  auth: RouteAccessContext,
  data: T
): T & { organizationId?: string } {
  if (auth.isSuperAdmin || !auth.organizationId) {
    return {
      ...data,
    } as T & { organizationId?: string }
  }

  return {
    ...data,
    organizationId: auth.organizationId,
  } as T & { organizationId?: string }
}

export function canAccessOrganization(
  auth: RouteAccessContext,
  organizationId: string | null | undefined
) {
  if (auth.isSuperAdmin) return true
  if (!auth.organizationId) return false
  return auth.organizationId === organizationId
}