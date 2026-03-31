import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/auth"
import {
  getAssignmentStatusLabel,
  getIssuePriorityLabel,
  getIssueStatusLabel,
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


function getMembershipRoleLabel(role: string | null | undefined) {
  switch (String(role ?? "").toUpperCase()) {
    case "ORG_ADMIN":
      return "Διαχειριστής οργανισμού"
    case "MANAGER":
      return "Manager"
    case "PARTNER":
      return "Συνεργάτης"
    default:
      return role || "—"
  }
}

export default async function SuperAdminOrganizationOverviewPage({
  params,
}: PageProps) {
  await requireSuperAdmin()
  const { id } = await params

  const organization = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      createdAt: true,
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
          isActive: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          role: true,
          isActive: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              systemRole: true,
              isActive: true,
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
          city: true,
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
          email: true,
          phone: true,
          specialty: true,
          status: true,
          createdAt: true,
        },
      },
      tasks: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
        select: {
          id: true,
          title: true,
          taskType: true,
          status: true,
          scheduledDate: true,
          createdAt: true,
          property: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          assignments: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              status: true,
              partner: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      issues: {
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          title: true,
          status: true,
          severity: true,
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
      events: {
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          title: true,
          eventType: true,
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

  const openTasks = organization.tasks.filter((task) => {
    const status = String(task.status ?? "").toUpperCase()
    return !["COMPLETED", "CANCELLED"].includes(status)
  }).length

  const activeUsers = organization.memberships.filter((membership) => {
    return membership.user.isActive && membership.isActive
  }).length

  const activeProperties = organization.properties.filter((property) => {
    return String(property.status ?? "").toLowerCase() === "active"
  }).length

  const activePartners = organization.partners.filter((partner) => {
    return String(partner.status ?? "").toLowerCase() === "active"
  }).length

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Κεντρικό οργανισμού
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

          <div className="flex flex-col items-start gap-3 xl:items-end">
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
                href={`/super-admin/organizations/${organization.id}`}
                className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Στοιχεία οργανισμού
              </Link>

              <Link
                href={`/super-admin/organizations/${organization.id}/users`}
                className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Χρήστες οργανισμού
              </Link>

              <Link
                href="/super-admin/organizations"
                className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Όλοι οι οργανισμοί
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ενεργοί χρήστες</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{activeUsers}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Σύνολο χρηστών</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {organization._count.memberships}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ενεργά ακίνητα</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {activeProperties}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Σύνολο ακινήτων</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {organization._count.properties}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ενεργοί συνεργάτες</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {activePartners}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Σύνολο εργασιών</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {organization._count.tasks}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ανοικτές εργασίες</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{openTasks}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ζητήματα / Συμβάντα</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {organization._count.issues + organization._count.events}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Link
          href={`/super-admin/organizations/${organization.id}/users`}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <p className="text-sm font-semibold text-slate-500">Διαχείριση</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Χρήστες οργανισμού
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Ρόλοι, προσκλήσεις, ενεργοποιήσεις και λογαριασμοί χρηστών.
          </p>
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Λειτουργία</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Ακίνητα</h2>
          <p className="mt-2 text-sm text-slate-600">
            Σύνολο ακινήτων οργανισμού: {organization._count.properties}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Λειτουργία</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Συνεργάτες</h2>
          <p className="mt-2 text-sm text-slate-600">
            Σύνολο συνεργατών οργανισμού: {organization._count.partners}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Λειτουργία</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Εργασίες</h2>
          <p className="mt-2 text-sm text-slate-600">
            Σύνολο εργασιών οργανισμού: {organization._count.tasks}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Πρόσφατοι χρήστες οργανισμού
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Γρήγορη εικόνα των τελευταίων ενεργών προσβάσεων.
            </p>
          </div>

          {organization.memberships.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              Δεν υπάρχουν χρήστες.
            </div>
          ) : (
            <div className="space-y-3">
              {organization.memberships.map((membership) => (
                <div
                  key={membership.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {membership.user.name || "—"}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {membership.user.email}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Ρόλος: {getMembershipRoleLabel(membership.role)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          membership.user.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {membership.user.isActive ? "Ενεργός" : "Ανενεργός"}
                      </span>

                      {membership.user.systemRole === "SUPER_ADMIN" ? (
                        <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          SUPER_ADMIN
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Πρόσφατα ακίνητα
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Τα τελευταία ακίνητα που έχουν καταχωρηθεί στον οργανισμό.
            </p>
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
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
                        Πόλη: {property.city ?? "—"}
                      </p>
                    </div>

                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {property.status != null ? getPropertyStatusLabel("el", property.status) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Πρόσφατοι συνεργάτες
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Οι τελευταίοι συνεργάτες του οργανισμού.
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {partner.name}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        Email: {partner.email ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Τηλέφωνο: {partner.phone ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Ειδικότητα: {partner.specialty ?? "—"}
                      </p>
                    </div>

                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {partner.status != null ? getPartnerStatusLabel("el", partner.status) : "—"}
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
              Πρόσφατα ζητήματα / συμβάντα
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Γρήγορη επιχειρησιακή ένδειξη προβλημάτων και καταγραφών.
            </p>
          </div>

          {organization.issues.length === 0 && organization.events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              Δεν υπάρχουν πρόσφατα ζητήματα ή συμβάντα.
            </div>
          ) : (
            <div className="space-y-3">
              {organization.issues.map((issue) => (
                <div
                  key={`issue-${issue.id}`}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <p className="font-semibold text-slate-900">{issue.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ακίνητο: {issue.property?.name ?? "—"} /{" "}
                    {issue.property?.code ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Κατάσταση: {issue.status != null ? getIssueStatusLabel("el", issue.status) : "—"} • Σοβαρότητα:{" "}
                    {issue.severity != null ? getIssuePriorityLabel("el", issue.severity) : "—"}
                  </p>
                </div>
              ))}

              {organization.events.map((event) => (
                <div
                  key={`event-${event.id}`}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <p className="font-semibold text-slate-900">{event.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Τύπος: {event.eventType ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ακίνητο: {event.property?.name ?? "—"} /{" "}
                    {event.property?.code ?? "—"}
                  </p>
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
              Επιχειρησιακή εικόνα μόνο για τον επιλεγμένο οργανισμό.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
            Εργασίες που εμφανίζονται: {organization.tasks.length}
          </div>
        </div>

        {organization.tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            Δεν υπάρχουν εργασίες.
          </div>
        ) : (
          <div className="space-y-3">
            {organization.tasks.map((task) => {
              const latestAssignment = task.assignments[0]

              return (
                <div
                  key={task.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Τύπος: {task.taskType != null ? getTaskTypeLabel("el", task.taskType) : "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Ακίνητο: {task.property?.name ?? "—"} /{" "}
                        {task.property?.code ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Προγραμματισμός: {formatDate(task.scheduledDate)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Δημιουργία: {formatDate(task.createdAt)}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[320px]">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Κατάσταση εργασίας
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {task.status != null ? getTaskStatusLabel("el", task.status) : "—"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Τελευταία ανάθεση
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {latestAssignment?.partner?.name ?? "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {latestAssignment?.status != null ? getAssignmentStatusLabel("el", latestAssignment.status) : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}