import { prisma } from "@/lib/prisma"
import { requireManagerOrOrgAdmin } from "@/lib/auth"

export default async function DashboardHomePage() {
  const auth = await requireManagerOrOrgAdmin()

  const organizationId = auth.organizationId!

  const [propertiesCount, partnersCount, tasksCount, issuesCount] =
    await Promise.all([
      prisma.property.count({
        where: {
          organizationId,
        },
      }),
      prisma.partner.count({
        where: {
          organizationId,
        },
      }),
      prisma.task.count({
        where: {
          organizationId,
        },
      }),
      prisma.issue.count({
        where: {
          organizationId,
        },
      }),
    ])

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          OPS Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Πίνακας οργανισμού
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Εδώ ο διαχειριστής βλέπει όλα τα δεδομένα του δικού του οργανισμού.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ακίνητα</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {propertiesCount}
          </p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Συνεργάτες</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {partnersCount}
          </p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Εργασίες</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{tasksCount}</p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ζητήματα</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {issuesCount}
          </p>
        </div>
      </div>
    </div>
  )
}