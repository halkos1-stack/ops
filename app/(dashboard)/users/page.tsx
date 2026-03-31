"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

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

type UsersApiSuccessResponse = {
  organization: OrganizationInfo | null
  primaryOrgAdmin: UserRow | null
  users: UserRow[]
  supportContact: {
    email: string
    label: string
  }
}

type UsersApiErrorResponse = {
  error: string
}

type UsersApiResponse = UsersApiSuccessResponse | UsersApiErrorResponse

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

function isUsersApiError(data: unknown): data is UsersApiErrorResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  )
}

function formatDate(value: string, language: "el" | "en") {
  try {
    return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "el-GR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function getTexts(language: "el" | "en") {
  if (language === "en") {
    return {
      loadError: "Failed to load users.",
      unknownLoadError: "Unknown error while loading users.",
      createError: "Failed to create user.",
      unknownCreateError: "Unknown error while creating user.",
      updateError: "Failed to update user.",
      unknownUpdateError: "Unknown error while updating user.",
      inviteError: "Failed to send invitation.",
      unknownInviteError: "Unknown error while sending invitation.",
      deleteError: "Failed to delete manager.",
      unknownDeleteError: "Unknown error while deleting manager.",
      editError: "Failed to edit user.",
      unknownEditError: "Unknown error while editing user.",
      supportError: "Failed to send support message.",
      unknownSupportError: "Unknown error while sending support message.",

      organizationUsers: "Organization users",
      loadingOrganization: "Loading organization...",
      pageDescription:
        "The primary organization admin can create and manage only organization managers.",
      refresh: "Refresh",
      hideForm: "Hide form",
      newManager: "New manager",

      totalUsers: "Total users",
      activeUsers: "Active",
      inactiveUsers: "Inactive",
      orgAdmins: "Organization admins",
      managers: "Managers",

      filtersTitle: "User management filters",
      filtersDescription:
        "Search and control users by access status.",
      clearFilters: "Clear filters",
      search: "Search",
      searchPlaceholder: "Name or email...",
      status: "Status",
      all: "All",
      activeOnly: "Only active",
      inactiveOnly: "Only inactive",

      primaryOrgAdminBadge: "Primary organization admin",
      primaryOrgAdminTitle: "Main user management owner",
      primaryOrgAdminDescription:
        "The primary admin permanently keeps the Organization Admin role, cannot change role, cannot be disabled and does not show invitation or temporary password actions.",
      active: "Active",
      inactive: "Inactive",
      role: "Role",
      organizationAdmin: "Organization admin",
      createdAt: "Created",
      allowedAction: "Allowed action",
      editDetails: "Edit details",

      otherUsersTitle: "Other organization users",
      otherUsersDescription:
        "From here you manage only organization managers.",
      visibleUsers: "Visible",
      loadingUsers: "Loading users...",
      noUsersWithFilters: "No users found with the current filters.",

      currentRole: "Current role",
      manager: "Manager",
      organizationRole: "Organization role",
      organizationRoleLocked:
        "Users from this page remain managers only.",
      userActions: "User actions",
      edit: "Edit",
      invite: "Invite",
      saving: "Saving...",
      disable: "Disable",
      enable: "Enable",
      deleting: "Deleting...",
      delete: "Delete",

      editUser: "Edit user",
      editUserDescription:
        "Update basic user details. The primary organization admin has locked role and status.",
      close: "Close",
      fullName: "Full name",
      email: "Email",
      userIsActive: "User is active",
      primaryAdminLocked:
        "The primary organization admin cannot change role or be disabled.",
      saveChanges: "Save changes",

      createManagerTitle: "New manager",
      createManagerDescription:
        "Create a new manager account for your organization.",
      showForm: "Show form",
      firstAccessPassword: "First access password",
      passwordPlaceholder: "at least 6 characters",
      activeFromStart: "User should be active from the start",
      createManager: "Create manager",
      createFormHidden: "The create form is hidden.",

      supportTitle: "Platform support",
      contactSupport: "Contact support",
      closeSupportForm: "Close form",
      supportDescription: "Contact support",
      subject: "Subject",
      subjectPlaceholder: "e.g. User access problem",
      message: "Message",
      messagePlaceholder: "Write your support request...",
      sending: "Sending...",
      sendMessage: "Send message",

      successManagerCreated: "The manager was created successfully.",
      successUserEnabled: "The user was enabled successfully.",
      successUserDisabled: "The user was disabled successfully.",
      successInviteSent: "Activation invitation was sent successfully.",
      successInviteCreated: "The invitation was created.",
      successUserUpdated: "User details were updated successfully.",
      successSupportSent: "Support message was sent successfully.",
      successSupportLogged:
        "The message was logged, but no email was sent because SMTP is not configured.",

      confirmDelete:
        'Are you sure you want to delete manager "{name}"? This action is permanent.',
      systemUserId: "User ID",
    }
  }

  return {
    loadError: "Αποτυχία φόρτωσης χρηστών.",
    unknownLoadError: "Άγνωστο σφάλμα φόρτωσης χρηστών.",
    createError: "Αποτυχία δημιουργίας χρήστη.",
    unknownCreateError: "Άγνωστο σφάλμα δημιουργίας χρήστη.",
    updateError: "Αποτυχία ενημέρωσης χρήστη.",
    unknownUpdateError: "Άγνωστο σφάλμα ενημέρωσης χρήστη.",
    inviteError: "Αποτυχία αποστολής πρόσκλησης.",
    unknownInviteError: "Άγνωστο σφάλμα αποστολής πρόσκλησης.",
    deleteError: "Αποτυχία διαγραφής manager.",
    unknownDeleteError: "Άγνωστο σφάλμα διαγραφής manager.",
    editError: "Αποτυχία επεξεργασίας χρήστη.",
    unknownEditError: "Άγνωστο σφάλμα επεξεργασίας χρήστη.",
    supportError: "Αποτυχία αποστολής μηνύματος προς την υποστήριξη.",
    unknownSupportError:
      "Άγνωστο σφάλμα αποστολής μηνύματος προς την υποστήριξη.",

    organizationUsers: "Χρήστες οργανισμού",
    loadingOrganization: "Φόρτωση οργανισμού...",
    pageDescription:
      "Ο βασικός διαχειριστής οργανισμού μπορεί να δημιουργεί και να διαχειρίζεται μόνο managers του οργανισμού.",
    refresh: "Ανανέωση",
    hideForm: "Απόκρυψη φόρμας",
    newManager: "Νέος manager",

    totalUsers: "Σύνολο χρηστών",
    activeUsers: "Ενεργοί",
    inactiveUsers: "Ανενεργοί",
    orgAdmins: "Διαχειριστές οργανισμού",
    managers: "Managers",

    filtersTitle: "Φίλτρα διαχείρισης χρηστών",
    filtersDescription:
      "Αναζήτηση και έλεγχος χρηστών ανά κατάσταση πρόσβασης.",
    clearFilters: "Καθαρισμός φίλτρων",
    search: "Αναζήτηση",
    searchPlaceholder: "Όνομα ή email...",
    status: "Κατάσταση",
    all: "Όλοι",
    activeOnly: "Μόνο ενεργοί",
    inactiveOnly: "Μόνο ανενεργοί",

    primaryOrgAdminBadge: "Βασικός διαχειριστής οργανισμού",
    primaryOrgAdminTitle: "Κύριος υπεύθυνος διαχείρισης χρηστών",
    primaryOrgAdminDescription:
      "Ο βασικός διαχειριστής έχει μόνιμα ρόλο «Διαχειριστής οργανισμού», δεν αλλάζει ρόλο, δεν απενεργοποιείται και δεν εμφανίζει ενέργειες πρόσκλησης ή προσωρινού κωδικού.",
    active: "Ενεργός",
    inactive: "Ανενεργός",
    role: "Ρόλος",
    organizationAdmin: "Διαχειριστής οργανισμού",
    createdAt: "Δημιουργία",
    allowedAction: "Επιτρεπόμενη ενέργεια",
    editDetails: "Επεξεργασία στοιχείων",

    otherUsersTitle: "Υπόλοιποι χρήστες οργανισμού",
    otherUsersDescription:
      "Από εδώ διαχειρίζεσαι μόνο managers του οργανισμού.",
    visibleUsers: "Εμφανίζονται",
    loadingUsers: "Φόρτωση χρηστών...",
    noUsersWithFilters: "Δεν βρέθηκαν χρήστες με τα τρέχοντα φίλτρα.",

    currentRole: "Τρέχων ρόλος",
    manager: "Manager",
    organizationRole: "Ρόλος οργανισμού",
    organizationRoleLocked:
      "Οι χρήστες από αυτή τη σελίδα παραμένουν μόνο managers.",
    userActions: "Ενέργειες χρήστη",
    edit: "Επεξεργασία",
    invite: "Πρόσκληση",
    saving: "Αποθήκευση...",
    disable: "Απενεργοποίηση",
    enable: "Ενεργοποίηση",
    deleting: "Διαγραφή...",
    delete: "Διαγραφή",

    editUser: "Επεξεργασία χρήστη",
    editUserDescription:
      "Ενημέρωσε βασικά στοιχεία χρήστη. Ο βασικός διαχειριστής έχει κλειδωμένο ρόλο και κατάσταση.",
    close: "Κλείσιμο",
    fullName: "Ονοματεπώνυμο",
    email: "Email",
    userIsActive: "Ο χρήστης είναι ενεργός",
    primaryAdminLocked:
      "Ο βασικός διαχειριστής οργανισμού δεν μπορεί να αλλάξει ρόλο ή να απενεργοποιηθεί.",
    saveChanges: "Αποθήκευση αλλαγών",

    createManagerTitle: "Νέος manager",
    createManagerDescription:
      "Δημιουργία νέου λογαριασμού manager για τον οργανισμό σου.",
    showForm: "Εμφάνιση φόρμας",
    firstAccessPassword: "Κωδικός πρώτης εισόδου",
    passwordPlaceholder: "τουλάχιστον 6 χαρακτήρες",
    activeFromStart: "Ο χρήστης να είναι ενεργός από την αρχή",
    createManager: "Δημιουργία manager",
    createFormHidden: "Η φόρμα δημιουργίας είναι κρυφή.",

    supportTitle: "Υποστήριξη πλατφόρμας",
    contactSupport: "Επικοινωνία με υποστήριξη",
    closeSupportForm: "Κλείσιμο φόρμας",
    supportDescription: "Επικοινωνία με υποστήριξη",
    subject: "Θέμα",
    subjectPlaceholder: "π.χ. Πρόβλημα πρόσβασης χρήστη",
    message: "Μήνυμα",
    messagePlaceholder: "Γράψε το αίτημά σου προς την υποστήριξη...",
    sending: "Αποστολή...",
    sendMessage: "Αποστολή μηνύματος",

    successManagerCreated: "Ο manager δημιουργήθηκε επιτυχώς.",
    successUserEnabled: "Ο χρήστης ενεργοποιήθηκε επιτυχώς.",
    successUserDisabled: "Ο χρήστης απενεργοποιήθηκε επιτυχώς.",
    successInviteSent: "Η πρόσκληση ενεργοποίησης στάλθηκε επιτυχώς.",
    successInviteCreated: "Η πρόσκληση δημιουργήθηκε.",
    successUserUpdated: "Τα στοιχεία χρήστη ενημερώθηκαν επιτυχώς.",
    successSupportSent: "Το μήνυμα προς την υποστήριξη στάλθηκε επιτυχώς.",
    successSupportLogged:
      "Το μήνυμα καταγράφηκε, αλλά δεν στάλθηκε email επειδή το SMTP δεν είναι ρυθμισμένο.",

    confirmDelete:
      'Θέλεις σίγουρα να διαγράψεις τον manager "{name}"; Η ενέργεια είναι οριστική.',
    systemUserId: "User ID",
  }
}

export default function OrganizationUsersPage() {
  const { language } = useAppLanguage()
  const texts = getTexts(language)

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
  const [supportContact, setSupportContact] = useState<UsersApiSuccessResponse["supportContact"]>({
    email: "admin@ops.local",
    label: language === "en" ? "Platform support" : "Υποστήριξη πλατφόρμας",
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

      const data = (await res.json()) as UsersApiResponse

      if (!res.ok || isUsersApiError(data)) {
        throw new Error(
          isUsersApiError(data) ? data.error : texts.loadError
        )
      }

      const safePrimary =
        data.primaryOrgAdmin && data.primaryOrgAdmin.systemRole !== "SUPER_ADMIN"
          ? data.primaryOrgAdmin
          : null

      const safeUsers = (data.users ?? []).filter(
        (user: UserRow) => user.systemRole !== "SUPER_ADMIN"
      )

      setOrganization(data.organization ?? null)
      setPrimaryOrgAdmin(safePrimary)
      setUsers(safeUsers)
      setSupportContact(
        data.supportContact ?? {
          email: "admin@ops.local",
          label: language === "en" ? "Platform support" : "Υποστήριξη πλατφόρμας",
        }
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : texts.unknownLoadError
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [language])

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

      const data = (await res.json()) as Record<string, unknown>

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : texts.createError
        )
      }

      setForm(initialFormState)
      setSuccess(texts.successManagerCreated)
      await loadUsers()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : texts.unknownCreateError
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

      const data = (await res.json()) as Record<string, unknown>

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : texts.updateError
        )
      }

      setSuccess(!user.isActive ? texts.successUserEnabled : texts.successUserDisabled)
      await loadUsers()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : texts.unknownUpdateError
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

      const data = (await res.json()) as Record<string, unknown>

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : texts.inviteError
        )
      }

      if (data?.sent) {
        setSuccess(texts.successInviteSent)
      } else if (typeof data?.activationUrl === "string") {
        setSuccess(`${texts.successInviteCreated} ${data.activationUrl}`)
      } else {
        setSuccess(
          typeof data?.message === "string"
            ? data.message
            : texts.successInviteCreated
        )
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : texts.unknownInviteError
      setError(message)
    } finally {
      setUpdatingUserId(null)
    }
  }

  async function handleDeleteUser(user: UserRow) {
    const confirmed = window.confirm(
      texts.confirmDelete.replace("{name}", user.name ?? user.email)
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

      const data = (await res.json()) as Record<string, unknown>

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : texts.deleteError
        )
      }

      setSuccess(
        typeof data?.message === "string"
          ? data.message
          : language === "en"
            ? "The manager was deleted successfully."
            : "Ο manager διαγράφηκε επιτυχώς."
      )
      await loadUsers()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : texts.unknownDeleteError
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

      const data = (await res.json()) as Record<string, unknown>

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : texts.editError
        )
      }

      setSuccess(texts.successUserUpdated)
      setEditForm(null)
      await loadUsers()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : texts.unknownEditError
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

      const data = (await res.json()) as Record<string, unknown>

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : texts.supportError
        )
      }

      setSupportForm(initialSupportFormState)
      setShowSupportForm(false)

      if (data?.sent) {
        setSuccess(texts.successSupportSent)
      } else {
        setSuccess(
          typeof data?.message === "string"
            ? data.message
            : texts.successSupportLogged
        )
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : texts.unknownSupportError
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
              {texts.organizationUsers}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {organization?.name ?? texts.loadingOrganization}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {texts.pageDescription}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadUsers}
              className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {texts.refresh}
            </button>

            <button
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {showCreateForm ? texts.hideForm : texts.newManager}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{texts.totalUsers}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{texts.activeUsers}</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.active}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{texts.inactiveUsers}</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{stats.inactive}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{texts.orgAdmins}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.orgAdmins}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{texts.managers}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.managers}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {texts.filtersTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {texts.filtersDescription}
            </p>
          </div>

          <button
            onClick={resetFilters}
            className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {texts.clearFilters}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.search}
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={texts.searchPlaceholder}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {texts.status}
            </label>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            >
              <option value="ALL">{texts.all}</option>
              <option value="ACTIVE">{texts.activeOnly}</option>
              <option value="INACTIVE">{texts.inactiveOnly}</option>
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
              {texts.primaryOrgAdminBadge}
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              {texts.primaryOrgAdminTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {texts.primaryOrgAdminDescription}
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
                      {primaryOrgAdmin.isActive ? texts.active : texts.inactive}
                    </span>

                    <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700">
                      {texts.primaryOrgAdminBadge}
                    </span>
                  </div>

                  <p className="mt-2 break-all text-sm text-slate-700">
                    {primaryOrgAdmin.email}
                  </p>

                  <p className="mt-1 break-all text-xs text-slate-500">
                    {texts.systemUserId}: {primaryOrgAdmin.userId}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {texts.role}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {texts.organizationAdmin}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {texts.createdAt}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(primaryOrgAdmin.userCreatedAt, language)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="mb-3 text-sm font-medium text-slate-700">
                  {texts.allowedAction}
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openEditUser(primaryOrgAdmin)}
                    disabled={updatingUserId === primaryOrgAdmin.userId}
                    className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {texts.editDetails}
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
              {texts.otherUsersTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {texts.otherUsersDescription}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
            {texts.visibleUsers}: {filteredUsers.length}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            {texts.loadingUsers}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            {texts.noUsersWithFilters}
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
                          {user.isActive ? texts.active : texts.inactive}
                        </span>
                      </div>

                      <p className="mt-2 break-all text-sm text-slate-700">
                        {user.email}
                      </p>

                      <p className="mt-1 break-all text-xs text-slate-500">
                        {texts.systemUserId}: {user.userId}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {texts.currentRole}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {texts.manager}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {texts.createdAt}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatDate(user.userCreatedAt, language)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        {texts.organizationRole}
                      </label>

                      <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
                        {texts.manager}
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        {texts.organizationRoleLocked}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="mb-3 text-sm font-medium text-slate-700">
                        {texts.userActions}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEditUser(user)}
                          disabled={updatingUserId === user.userId}
                          className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {texts.edit}
                        </button>

                        <button
                          onClick={() => handleSendInvite(user)}
                          disabled={updatingUserId === user.userId}
                          className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {texts.invite}
                        </button>

                        <button
                          onClick={() => handleToggleUser(user)}
                          disabled={updatingUserId === user.userId}
                          className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingUserId === user.userId
                            ? texts.saving
                            : user.isActive
                              ? texts.disable
                              : texts.enable}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={deletingUserId === user.userId}
                          className="inline-flex rounded-xl border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingUserId === user.userId
                            ? texts.deleting
                            : texts.delete}
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
              <h2 className="text-xl font-bold text-slate-900">{texts.editUser}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {texts.editUserDescription}
              </p>
            </div>

            <button
              onClick={() => setEditForm(null)}
              className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {texts.close}
            </button>
          </div>

          <form
            onSubmit={handleSaveEditUser}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.fullName}
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
                {texts.email}
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
                {texts.organizationRole}
              </label>
              <select
                value={editForm.isPrimaryOrgAdmin ? "ORG_ADMIN" : "MANAGER"}
                disabled
                className="w-full rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:text-slate-500"
              >
                <option value="ORG_ADMIN">{texts.organizationAdmin}</option>
                <option value="MANAGER">{texts.manager}</option>
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
                  {texts.userIsActive}
                </span>
              </label>
            </div>

            {editForm.isPrimaryOrgAdmin ? (
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-blue-700">
                  {texts.primaryAdminLocked}
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
                  ? texts.saving
                  : texts.saveChanges}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{texts.createManagerTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {texts.createManagerDescription}
            </p>
          </div>

          <button
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {showCreateForm ? texts.hideForm : texts.showForm}
          </button>
        </div>

        {showCreateForm ? (
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.fullName}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder={
                  language === "en" ? "e.g. Nick Papadakis" : "π.χ. Νίκος Παπαδάκης"
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.email}
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
                {texts.firstAccessPassword}
              </label>
              <input
                type="text"
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder={texts.passwordPlaceholder}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.organizationRole}
              </label>
              <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                {texts.manager}
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
                {texts.activeFromStart}
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? texts.saving : texts.createManager}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            {texts.createFormHidden}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              {supportContact.label || texts.supportTitle}
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              {texts.contactSupport}
            </h2>
          </div>

          <button
            onClick={() => setShowSupportForm((prev) => !prev)}
            className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {showSupportForm ? texts.closeSupportForm : texts.contactSupport}
          </button>
        </div>

        {showSupportForm ? (
          <form
            onSubmit={handleSendSupportMessage}
            className="mt-6 grid grid-cols-1 gap-4"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.subject}
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
                placeholder={texts.subjectPlaceholder}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {texts.message}
              </label>
              <textarea
                value={supportForm.message}
                onChange={(event) =>
                  setSupportForm((prev) => ({
                    ...prev,
                    message: event.target.value,
                  }))
                }
                placeholder={texts.messagePlaceholder}
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
                {sendingSupportMessage ? texts.sending : texts.sendMessage}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  )
}