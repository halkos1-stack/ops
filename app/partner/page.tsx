import { prisma } from "@/lib/prisma"
import { requirePartner } from "@/lib/auth"

export default async function PartnerHomePage() {
  const auth = await requirePartner()

  const [tasksCount, checklistRunsCount] = await Promise.all([
    prisma.task.count({
      where: {
        organizationId: auth.organizationId!,
        assignments: {
          some: {
            partner: {
              userId: auth.userId,
            },
          },
        },
      },
    }),
    prisma.taskChecklistRun.count({
      where: {
        organizationId: auth.organizationId!,
        task: {
          assignments: {
            some: {
              partner: {
                userId: auth.userId,
              },
            },
          },
        },
      },
    }),
  ])

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Partner Area
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Πίνακας συνεργάτη
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Εδώ ο συνεργάτης βλέπει μόνο τις δικές του εργασίες και τις δικές του
          εκτελέσεις λιστών.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Δικές μου εργασίες</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{tasksCount}</p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Δικά μου checklist runs</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {checklistRunsCount}
          </p>
        </div>
      </div>
    </div>
  )
}