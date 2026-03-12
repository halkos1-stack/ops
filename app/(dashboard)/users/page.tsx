"use client"

import { useEffect, useMemo, useState } from "react"

type OrganizationInfo = {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: string
}

type UserRow = {
  membershipId: string
  userId: string
  name: string | null
  email: string
  systemRole: string
  userIsActive: boolean
  membershipIsActive: boolean
  isActive: boolean
  organizationRole: "ORG_ADMIN" | "MANAGER" | "PARTNER"
  isPrimaryOrgAdmin: boolean
  createdAt: string
  updatedAt: string
  userCreatedAt: string
}

type CreateUserFormState = {
  name: string
  email: string
  password: string
  isActive: boolean
}

type EditUserFormState = {
  userId: string
  name: string
  email: string
  organizationRole: "ORG_ADMIN" | "MANAGER"
  isActive: boolean
  isPrimaryOrgAdmin: boolean
}

type SupportContactFormState = {
  subject: string
  message: string
}

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE"

type UsersApiResponse = {
  organization: OrganizationInfo | null
  primaryOrgAdmin: UserRow | null
  users: UserRow[]
  supportContact: {
    email: string
    label: string
  }
}

const initialFormState: CreateUserFormState = {
  name: "",
  email: "",
  password: "",
  isActive: true,
}

const initialSupportFormState: SupportContactFormState = {
  subject: "",
  message: "",
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("el-GR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default function OrganizationUsersPage() {
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null)
  const [primaryOrgAdmin, setPrimaryOrgAdmin] = useState<UserRow | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [showCreateForm, setShowCreateForm] = useState(true)
  const [showSupportForm, setShowSupportForm] = useState(false)
  const [sendingSupportMessage, setSendingSupportMessage] = useState(false)
  const [form, setForm] = useState<CreateUserFormState>(initialFormState)
  const [supportForm, setSupportForm] = useState<SupportContactFormState>(
    initialSupportFormState
  )
  const [editForm, setEditForm] = useState<EditUserFormState | null>(null)
  const [supportContact, setSupportContact] = useState<UsersApiResponse["supportContact"]>({
    email: "admin@ops.local",
    label: "Υποστήριξη πλατφόρμας",
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function loadUsers() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch("/api/users", {
        method: "GET",
        cache: "no-store",
      })

      const data = (await res.json()) as UsersApiResponse | { error?: string }

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία φόρτωσης χρηστών.")
      }

      const safePrimary =
        data?.primaryOrgAdmin &&
        data.primaryOrgAdmin.systemRole !== "SUPER_ADMIN"
          ? data.primaryOrgAdmin
          : null

      const safeUsers = (data?.users ?? []).filter(
        (user) => user.systemRole !== "SUPER_ADMIN"
      )

      setOrganization(data?.organization ?? null)
      setPrimaryOrgAdmin(safePrimary)
      setUsers(safeUsers)
      setSupportContact(
        data?.supportContact ?? {
          email: "admin@ops.local",
          label: "Υποστήριξη πλατφόρμας",
        }
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα φόρτωσης χρηστών."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const stats = useMemo(() => {
    const allUsers = primaryOrgAdmin ? [primaryOrgAdmin, ...users] : users
    const total = allUsers.length
    const active = allUsers.filter((user) => user.isActive).length
    const inactive = total - active
    const orgAdmins = allUsers.filter(
      (user) => user.organizationRole === "ORG_ADMIN"
    ).length
    const managers = allUsers.filter(
      (user) => user.organizationRole === "MANAGER"
    ).length

    return {
      total,
      active,
      inactive,
      orgAdmins,
      managers,
    }
  }, [primaryOrgAdmin, users])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()

    let result = [...users]

    if (q) {
      result = result.filter((user) => {
        return (
          (user.name ?? "").toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q)
        )
      })
    }

    if (statusFilter === "ACTIVE") {
      result = result.filter((user) => user.isActive)
    }

    if (statusFilter === "INACTIVE") {
      result = result.filter((user) => !user.isActive)
    }

    return result
  }, [users, search, statusFilter])

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          organizationRole: "MANAGER",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία δημιουργίας χρήστη.")
      }

      setForm(initialFormState)
      setSuccess("Ο manager δημιουργήθηκε επιτυχώς.")
      await loadUsers()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα δημιουργίας χρήστη."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleUser(user: UserRow) {
    try {
      setUpdatingUserId(user.userId)
      setError(null)
      setSuccess(null)

      const res = await fetch(`/api/users/${user.userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !user.isActive,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία ενημέρωσης χρήστη.")
      }

      setSuccess(
        !user.isActive
          ? "Ο χρήστης ενεργοποιήθηκε επιτυχώς."
          : "Ο χρήστης απενεργοποιήθηκε επιτυχώς."
      )

      await loadUsers()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα ενημέρωσης χρήστη."
      setError(message)
    } finally {
      setUpdatingUserId(null)
    }
  }

  async function handleSendInvite(user: UserRow) {
    try {
      setUpdatingUserId(user.userId)
      setError(null)
      setSuccess(null)

      const res = await fetch(`/api/users/${user.userId}/send-invite`, {
        method: "POST",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία αποστολής πρόσκλησης.")
      }

      if (data?.sent) {
        setSuccess("Η πρόσκληση ενεργοποίησης στάλθηκε επιτυχώς.")
      } else if (data?.activationUrl) {
        setSuccess(
          `Το SMTP δεν είναι ρυθμισμένο. Link ενεργοποίησης: ${data.activationUrl}`
        )
      } else {
        setSuccess(data?.message || "Η πρόσκληση δημιουργήθηκε.")
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα αποστολής πρόσκλησης."
      setError(message)
    } finally {
      setUpdatingUserId(null)
    }
  }

  async function handleDeleteUser(user: UserRow) {
    const confirmed = window.confirm(
      `Θέλεις σίγουρα να διαγράψεις τον manager "${user.name ?? user.email}"; Η ενέργεια είναι οριστική.`
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingUserId(user.userId)
      setError(null)
      setSuccess(null)

      const res = await fetch(`/api/users/${user.userId}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία διαγραφής manager.")
      }

      setSuccess(data?.message || "Ο manager διαγράφηκε επιτυχώς.")
      await loadUsers()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα διαγραφής manager."
      setError(message)
    } finally {
      setDeletingUserId(null)
    }
  }

  function openEditUser(user: UserRow) {
    setEditForm({
      userId: user.userId,
      name: user.name ?? "",
      email: user.email,
      organizationRole:
        user.organizationRole === "ORG_ADMIN" ? "ORG_ADMIN" : "MANAGER",
      isActive: user.isActive,
      isPrimaryOrgAdmin: user.isPrimaryOrgAdmin,
    })
    setError(null)
    setSuccess(null)
  }

  async function handleSaveEditUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editForm) return

    try {
      setUpdatingUserId(editForm.userId)
      setError(null)
      setSuccess(null)

      const payload: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
      }

      if (!editForm.isPrimaryOrgAdmin) {
        payload.organizationRole = "MANAGER"
        payload.isActive = editForm.isActive
      }

      const res = await fetch(`/api/users/${editForm.userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Αποτυχία επεξεργασίας χρήστη.")
      }

      setSuccess("Τα στοιχεία χρήστη ενημερώθηκαν επιτυχώς.")
      setEditForm(null)
      await loadUsers()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Άγνωστο σφάλμα επεξεργασίας χρήστη."
      setError(message)
    } finally {
      setUpdatingUserId(null)
    }
  }

  async function handleSendSupportMessage(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    try {
      setSendingSupportMessage(true)
      setError(null)
      setSuccess(null)

      const res = await fetch("/api/users/support-contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(supportForm),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data?.error || "Αποτυχία αποστολής μηνύματος προς την υποστήριξη."
        )
      }

      setSupportForm(initialSupportFormState)
      setShowSupportForm(false)

      if (data?.sent) {
        setSuccess("Το μήνυμα προς την υποστήριξη στάλθηκε επιτυχώς.")
      } else {
        setSuccess(
          data?.message ||
            "Το μήνυμα καταγράφηκε, αλλά δεν στάλθηκε email επειδή το SMTP δεν είναι ρυθμισμένο."
        )
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Άγνωστο σφάλμα αποστολής μηνύματος προς την υποστήριξη."
      setError(message)
    } finally {
      setSendingSupportMessage(false)
    }
  }

  function resetFilters() {
    setSearch("")
    setStatusFilter("ALL")
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Χρήστες οργανισμού
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {organization?.name ?? "Φόρτωση οργανισμού..."}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Ο βασικός διαχειριστής οργανισμού μπορεί να δημιουργεί και να
              διαχειρίζεται μόνο managers του οργανισμού.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadUsers}
              className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ανανέωση
            </button>

            <button
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {showCreateForm ? "Απόκρυψη φόρμας" : "Νέος manager"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Σύνολο χρηστών</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ενεργοί</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.active}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ανενεργοί</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{stats.inactive}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Διαχειριστές οργανισμού</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.orgAdmins}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Managers</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.managers}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Φίλτρα διαχείρισης χρηστών
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Αναζήτηση και έλεγχος χρηστών ανά κατάσταση πρόσβασης.
            </p>
          </div>

          <button
            onClick={resetFilters}
            className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Καθαρισμός φίλτρων
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Αναζήτηση
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Όνομα ή email..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Κατάσταση
            </label>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            >
              <option value="ALL">Όλοι</option>
              <option value="ACTIVE">Μόνο ενεργοί</option>
              <option value="INACTIVE">Μόνο ανενεργοί</option>
            </select>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="break-all rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {primaryOrgAdmin ? (
        <section className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              Βασικός διαχειριστής οργανισμού
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Κύριος υπεύθυνος διαχείρισης χρηστών
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Ο βασικός διαχειριστής έχει μόνιμα ρόλο «Διαχειριστής οργανισμού»,
              δεν αλλάζει ρόλο, δεν απενεργοποιείται και δεν εμφανίζει ενέργειες
              πρόσκλησης ή προσωρινού κωδικού.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {primaryOrgAdmin.name ?? "—"}
                    </h3>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                        primaryOrgAdmin.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {primaryOrgAdmin.isActive ? "Ενεργός" : "Ανενεργός"}
                    </span>

                    <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700">
                      Βασικός διαχειριστής
                    </span>
                  </div>

                  <p className="mt-2 break-all text-sm text-slate-700">
                    {primaryOrgAdmin.email}
                  </p>

                  <p className="mt-1 break-all text-xs text-slate-500">
                    User ID: {primaryOrgAdmin.userId}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Ρόλος
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      Διαχειριστής οργανισμού
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Δημιουργία
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(primaryOrgAdmin.userCreatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="mb-3 text-sm font-medium text-slate-700">
                  Επιτρεπόμενη ενέργεια
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openEditUser(primaryOrgAdmin)}
                    disabled={updatingUserId === primaryOrgAdmin.userId}
                    className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Επεξεργασία στοιχείων
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Υπόλοιποι χρήστες οργανισμού
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Από εδώ διαχειρίζεσαι μόνο managers του οργανισμού.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
            Εμφανίζονται: {filteredUsers.length}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            Φόρτωση χρηστών...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            Δεν βρέθηκαν χρήστες με τα τρέχοντα φίλτρα.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.userId}
                className="rounded-2xl border border-slate-200 p-4 sm:p-5"
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {user.name ?? "—"}
                        </h3>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                            user.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {user.isActive ? "Ενεργός" : "Ανενεργός"}
                        </span>
                      </div>

                      <p className="mt-2 break-all text-sm text-slate-700">
                        {user.email}
                      </p>

                      <p className="mt-1 break-all text-xs text-slate-500">
                        User ID: {user.userId}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Τρέχων ρόλος
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          Manager
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Δημιουργία
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatDate(user.userCreatedAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Ρόλος οργανισμού
                      </label>

                      <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
                        Manager
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        Οι χρήστες από αυτή τη σελίδα παραμένουν μόνο managers.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="mb-3 text-sm font-medium text-slate-700">
                        Ενέργειες χρήστη
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEditUser(user)}
                          disabled={updatingUserId === user.userId}
                          className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Επεξεργασία
                        </button>

                        <button
                          onClick={() => handleSendInvite(user)}
                          disabled={updatingUserId === user.userId}
                          className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Πρόσκληση
                        </button>

                        <button
                          onClick={() => handleToggleUser(user)}
                          disabled={updatingUserId === user.userId}
                          className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingUserId === user.userId
                            ? "Αποθήκευση..."
                            : user.isActive
                              ? "Απενεργοποίηση"
                              : "Ενεργοποίηση"}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={deletingUserId === user.userId}
                          className="inline-flex rounded-xl border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingUserId === user.userId
                            ? "Διαγραφή..."
                            : "Διαγραφή"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editForm ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Επεξεργασία χρήστη</h2>
              <p className="mt-1 text-sm text-slate-600">
                Ενημέρωσε βασικά στοιχεία χρήστη. Ο βασικός διαχειριστής έχει
                κλειδωμένο ρόλο και κατάσταση.
              </p>
            </div>

            <button
              onClick={() => setEditForm(null)}
              className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Κλείσιμο
            </button>
          </div>

          <form
            onSubmit={handleSaveEditUser}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Ονοματεπώνυμο
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev
                      ? {
                          ...prev,
                          name: event.target.value,
                        }
                      : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev
                      ? {
                          ...prev,
                          email: event.target.value,
                        }
                      : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Ρόλος οργανισμού
              </label>
              <select
                value={editForm.isPrimaryOrgAdmin ? "ORG_ADMIN" : "MANAGER"}
                disabled
                className="w-full rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:text-slate-500"
              >
                <option value="ORG_ADMIN">Διαχειριστής οργανισμού</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            isActive: event.target.checked,
                          }
                        : prev
                    )
                  }
                  disabled={editForm.isPrimaryOrgAdmin}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700">
                  Ο χρήστης είναι ενεργός
                </span>
              </label>
            </div>

            {editForm.isPrimaryOrgAdmin ? (
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-blue-700">
                  Ο βασικός διαχειριστής οργανισμού δεν μπορεί να αλλάξει ρόλο ή
                  να απενεργοποιηθεί.
                </p>
              </div>
            ) : null}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={updatingUserId === editForm.userId}
                className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatingUserId === editForm.userId
                  ? "Αποθήκευση..."
                  : "Αποθήκευση αλλαγών"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Νέος manager</h2>
            <p className="mt-1 text-sm text-slate-600">
              Δημιουργία νέου λογαριασμού manager για τον οργανισμό σου.
            </p>
          </div>

          <button
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {showCreateForm ? "Απόκρυψη φόρμας" : "Εμφάνιση φόρμας"}
          </button>
        </div>

        {showCreateForm ? (
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Ονοματεπώνυμο
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="π.χ. Νίκος Παπαδάκης"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="name@example.com"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Κωδικός πρώτης εισόδου
              </label>
              <input
                type="text"
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="τουλάχιστον 6 χαρακτήρες"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Ρόλος οργανισμού
              </label>
              <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                Manager
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-slate-700">
                Ο χρήστης να είναι ενεργός από την αρχή
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Αποθήκευση..." : "Δημιουργία manager"}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            Η φόρμα δημιουργίας είναι κρυφή.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              Υποστήριξη πλατφόρμας
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Επικοινωνία με υποστήριξη
            </h2>
          </div>

          <button
            onClick={() => setShowSupportForm((prev) => !prev)}
            className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {showSupportForm ? "Κλείσιμο φόρμας" : "Επικοινωνία με υποστήριξη"}
          </button>
        </div>

        {showSupportForm ? (
          <form
            onSubmit={handleSendSupportMessage}
            className="mt-6 grid grid-cols-1 gap-4"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Θέμα
              </label>
              <input
                type="text"
                value={supportForm.subject}
                onChange={(event) =>
                  setSupportForm((prev) => ({
                    ...prev,
                    subject: event.target.value,
                  }))
                }
                placeholder="π.χ. Πρόβλημα πρόσβασης χρήστη"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Μήνυμα
              </label>
              <textarea
                value={supportForm.message}
                onChange={(event) =>
                  setSupportForm((prev) => ({
                    ...prev,
                    message: event.target.value,
                  }))
                }
                placeholder="Γράψε το αίτημά σου προς την υποστήριξη..."
                rows={6}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                required
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={sendingSupportMessage}
                className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingSupportMessage
                  ? "Αποστολή..."
                  : "Αποστολή μηνύματος"}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  )
}