import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAppAccess, buildTenantWhere } from "@/lib/route-access"

function parseDateParam(value: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function GET(req: NextRequest) {
  const access = await requireApiAppAccess()
  if (!access.ok) return access.response

  const auth = access.auth
  const url = new URL(req.url)

  const propertyId = url.searchParams.get("propertyId")?.trim() || ""
  const fromDate = url.searchParams.get("fromDate")?.trim() || ""
  const toDate = url.searchParams.get("toDate")?.trim() || ""

  const from = fromDate ? parseDateParam(`${fromDate}T00:00:00`) : null
  const to = toDate ? parseDateParam(`${toDate}T23:59:59`) : null

  const properties = await prisma.property.findMany({
    where: buildTenantWhere(auth, {}),
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  })

  let logs: unknown[] = []
  try {
    const where = buildTenantWhere(auth, {
      ...(propertyId ? { propertyId } : {}),
      ...((from || to)
        ? {
            loggedAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    })

    logs = await (
      prisma as unknown as {
        supplyReplenishmentLog: {
          findMany: (args: unknown) => Promise<unknown[]>
        }
      }
    ).supplyReplenishmentLog.findMany({
      where,
      orderBy: { loggedAt: "desc" },
      take: 300,
      select: {
        id: true,
        propertyId: true,
        propertySupplyId: true,
        supplyItemId: true,
        taskId: true,
        quantityBefore: true,
        quantityAdded: true,
        quantityAfter: true,
        stateBefore: true,
        stateAfter: true,
        performedBy: true,
        notes: true,
        loggedAt: true,
        property: {
          select: { id: true, code: true, name: true },
        },
        supplyItem: {
          select: {
            id: true,
            code: true,
            name: true,
            nameEl: true,
            nameEn: true,
            unit: true,
          },
        },
      },
    })
  } catch {
    logs = []
  }

  return NextResponse.json({ logs, properties })
}
