import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/auth"
import {
  getPartnerStatusLabel,
  getPropertyStatusLabel,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from "@/lib/i18n/labels"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

function formatDate(value: Date | string | null) {
  if (!value) return "—"

  try {
    return new Intl.DateTimeFormat("el-GR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return "—"
  }
}

export default async function SuperAdminOrganizationDetailPage({
  params,
}: PageProps) {
  await requireSuperAdmin()
  const { id } = await params

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          memberships: true,
          properties: true,
          partners: true,
          tasks: true,
          issues: true,
          events: true,
        },
      },
      memberships: {
        where: {
          isPrimaryOrgAdmin: true,
        },
        take: 1,
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          isActive: true,
          isPrimaryOrgAdmin: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              systemRole: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      },
      properties: {
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          status: true,
          createdAt: true,
        },
      },
      partners: {
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          createdAt: true,
        },
      },
      tasks: {
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          title: true,
          taskType: true,
          status: true,
          createdAt: true,
          property: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
  })

  if (!organization) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
        Ο οργανισμός δεν βρέθηκε.
      </div>
    )
  }

  const primaryMembership =
    organization.memberships.find(
      (membership) => membership.user.systemRole !== "SUPER_ADMIN"
    ) || null

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Λεπτομέρεια οργανισμού
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {organization.name}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Slug: <span className="font-medium">{organization.slug}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Δημιουργία: {formatDate(organization.createdAt)}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                organization.isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {organization.isActive
                ? "Ενεργός οργανισμός"
                : "Ανενεργός οργανισμός"}
            </span>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/super-admin/organizations/${organization.id}/overview`}
                className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Κεντρικό οργανισμού
              </Link>

              <Link
                href={`/super-admin/organizations/${organization.id}/users`}
                className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Χρήστες οργανισμού
              </Link>

              <Link
                href="/super-admin/organizations"
                className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Επιστροφή στους οργανισμούς
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Μέλη</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {organization._count.memberships}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ακίνητα</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {organization._count.properties}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Συνεργάτες</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {organization._count.partners}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Εργασίες</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {organization._count.tasks}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ζητήματα</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {organization._count.issues}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Συμβάντα</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {organization._count.events}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              Βασικός διαχειριστής οργανισμού
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Πρόσκληση ενεργοποίησης και onboarding
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Από εδώ ελέγχεις αν υπάρχει ο βασικός διαχειριστής οργανισμού και
              μεταβαίνεις άμεσα στη σελίδα χρηστών για αποστολή ή επαναποστολή
              πρόσκλησης ενεργοποίησης.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/super-admin/organizations/${organization.id}/users`}
              className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Χρήστες οργανισμού
            </Link>

            <Link
              href={`/super-admin/organizations/${organization.id}/users`}
              className="inline-flex rounded-2xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Πρόσκληση ενεργοποίησης
            </Link>
          </div>
        </div>

        {primaryMembership ? (
          <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {primaryMembership.user.name ?? "—"}
                    </h3>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                        primaryMembership.user.isActive && primaryMembership.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {primaryMembership.user.isActive && primaryMembership.isActive
                        ? "Ενεργός"
                        : "Ανενεργός"}
                    </span>

                    <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700">
                      Βασικός διαχειριστής οργανισμού
                    </span>
                  </div>

                  <p className="mt-2 break-all text-sm text-slate-700">
                    {primaryMembership.user.email}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Δημιουργία χρήστη: {formatDate(primaryMembership.user.createdAt)}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Email
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                      {primaryMembership.user.email}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Δημιουργία
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(primaryMembership.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="mb-3 text-sm font-medium text-slate-700">
                  Ενέργειες onboarding
                </p>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/super-admin/organizations/${organization.id}/users`}
                    className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Προβολή χρήστη
                  </Link>

                  <Link
                    href={`/super-admin/organizations/${organization.id}/users`}
                    className="inline-flex rounded-xl border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    Αποστολή / επαναποστολή πρόσκλησης ενεργοποίησης
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Δεν έχει βρεθεί ακόμα βασικός διαχειριστής οργανισμού για αυτόν τον
            οργανισμό. Πήγαινε στη σελίδα «Χρήστες οργανισμού» για να ελέγξεις τη
            δημιουργία χρήστη και να συνεχίσεις το onboarding.
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Πρόσφατα ακίνητα
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Τελευταίες εγγραφές ακινήτων του οργανισμού.
              </p>
            </div>
          </div>

          {organization.properties.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              Δεν υπάρχουν ακίνητα.
            </div>
          ) : (
            <div className="space-y-3">
              {organization.properties.map((property) => (
                <div
                  key={property.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {property.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Κωδικός: {property.code ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Διεύθυνση: {property.address ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Δημιουργία: {formatDate(property.createdAt)}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {property.status != null
                        ? getPropertyStatusLabel("el", property.status)
                        : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Πρόσφατοι συνεργάτες
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Τελευταίες εγγραφές συνεργατών του οργανισμού.
            </p>
          </div>

          {organization.partners.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              Δεν υπάρχουν συνεργάτες.
            </div>
          ) : (
            <div className="space-y-3">
              {organization.partners.map((partner) => (
                <div
                  key={partner.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {partner.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Email: {partner.email ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Τηλέφωνο: {partner.phone ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Δημιουργία: {formatDate(partner.createdAt)}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {partner.status != null
                        ? getPartnerStatusLabel("el", partner.status)
                        : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Πρόσφατες εργασίες οργανισμού
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Γρήγορη επιχειρησιακή εικόνα του οργανισμού από το επίπεδο της
              πλατφόρμας.
            </p>
          </div>

          <Link
            href={`/super-admin/organizations/${organization.id}/overview`}
            className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Άνοιγμα κεντρικού οργανισμού
          </Link>
        </div>

        {organization.tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            Δεν υπάρχουν εργασίες.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Εργασία</th>
                    <th className="px-4 py-3 font-semibold">Τύπος</th>
                    <th className="px-4 py-3 font-semibold">Ακίνητο</th>
                    <th className="px-4 py-3 font-semibold">Κατάσταση</th>
                    <th className="px-4 py-3 font-semibold">Δημιουργία</th>
                  </tr>
                </thead>

                <tbody>
                  {organization.tasks.map((task) => (
                    <tr key={task.id} className="border-t border-slate-200">
                      <td className="px-4 py-4 align-top">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {task.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            ID: {task.id}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top text-slate-700">
                        {task.taskType != null
                          ? getTaskTypeLabel("el", task.taskType)
                          : "—"}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div>
                          <p className="font-medium text-slate-900">
                            {task.property?.name ?? "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {task.property?.code ?? "—"}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top text-slate-700">
                        {task.status != null
                          ? getTaskStatusLabel("el", task.status)
                          : "—"}
                      </td>

                      <td className="px-4 py-4 align-top text-slate-600">
                        {formatDate(task.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}