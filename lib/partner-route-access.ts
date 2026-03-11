import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type PartnerRouteAccessContext = {
  userId: string
  email: string
  organizationId: string
  organizationRole: "PARTNER"
  partnerId: string
  partnerFullName: string
}

export async function requireApiPartnerAccess(): Promise<
  | { ok: true; auth: PartnerRouteAccessContext }
  | { ok: false; response: NextResponse }
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

  if (!auth.organizationId || auth.organizationRole !== "PARTNER") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Η πρόσβαση επιτρέπεται μόνο σε συνεργάτες." },
        { status: 403 }
      ),
    }
  }

  const partner = await prisma.partner.findFirst({
    where: {
      organizationId: auth.organizationId,
      userId: auth.userId,
    },
    select: {
      id: true,
      fullName: true,
      organizationId: true,
    },
  })

  if (!partner) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Δεν βρέθηκε εγγραφή συνεργάτη για τον τρέχοντα χρήστη." },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true,
    auth: {
      userId: auth.userId,
      email: auth.email,
      organizationId: partner.organizationId,
      organizationRole: "PARTNER",
      partnerId: partner.id,
      partnerFullName: partner.fullName,
    },
  }
}

export function buildPartnerTaskWhere(
  auth: PartnerRouteAccessContext,
  extraWhere?: Record<string, unknown>
) {
  return {
    organizationId: auth.organizationId,
    assignments: {
      some: {
        partnerId: auth.partnerId,
      },
    },
    ...(extraWhere ?? {}),
  }
}

export function buildPartnerChecklistRunWhere(
  auth: PartnerRouteAccessContext,
  extraWhere?: Record<string, unknown>
) {
  return {
    organizationId: auth.organizationId,
    task: {
      assignments: {
        some: {
          partnerId: auth.partnerId,
        },
      },
    },
    ...(extraWhere ?? {}),
  }
}

export async function canPartnerAccessTask(
  auth: PartnerRouteAccessContext,
  taskId: string
) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId: auth.organizationId,
      assignments: {
        some: {
          partnerId: auth.partnerId,
        },
      },
    },
    select: {
      id: true,
    },
  })

  return Boolean(task)
}

export async function canPartnerAccessChecklistRun(
  auth: PartnerRouteAccessContext,
  runId: string
) {
  const run = await prisma.taskChecklistRun.findFirst({
    where: {
      id: runId,
      organizationId: auth.organizationId,
      task: {
        assignments: {
          some: {
            partnerId: auth.partnerId,
          },
        },
      },
    },
    select: {
      id: true,
    },
  })

  return Boolean(run)
}