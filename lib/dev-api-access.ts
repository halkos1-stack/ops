import { NextRequest, NextResponse } from "next/server"
import { requireApiAppAccess, RouteAccessContext } from "@/lib/route-access"

type DevAccessResult =
  | { ok: true; auth: RouteAccessContext }
  | { ok: false; response: NextResponse }

export async function requireApiAppAccessWithDevBypass(
  req: NextRequest
): Promise<DevAccessResult> {
  const realAccess = await requireApiAppAccess()

  if (realAccess.ok) {
    return realAccess
  }

  const isDevelopment = process.env.NODE_ENV === "development"
  const allowDevBypass = process.env.ALLOW_DEV_API_BYPASS === "true"

  if (!isDevelopment || !allowDevBypass) {
    return realAccess
  }

  const systemRoleHeader = req.headers.get("x-system-role")
  const organizationIdHeader = req.headers.get("x-organization-id")
  const emailHeader = req.headers.get("x-dev-email")

  if (!systemRoleHeader) {
    return realAccess
  }

  const systemRole =
    systemRoleHeader === "SUPER_ADMIN" ? "SUPER_ADMIN" : "USER"

  const auth: RouteAccessContext = {
    userId: "dev-local-user",
    email: emailHeader || "dev@local.test",
    systemRole,
    organizationId: organizationIdHeader || null,
    organizationRole: "ORG_ADMIN",
    isSuperAdmin: systemRole === "SUPER_ADMIN",
  }

  if (!auth.isSuperAdmin && !auth.organizationId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Στο τοπικό bypass απαιτείται x-organization-id όταν δεν είσαι SUPER_ADMIN.",
        },
        { status: 400 }
      ),
    }
  }

  return {
    ok: true,
    auth,
  }
}