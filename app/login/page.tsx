"use client"

import { signIn, getSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { FormEvent, Suspense, useState } from "react"

type SessionUser = {
  id?: string
  email?: string | null
  name?: string | null
  systemRole?: "SUPER_ADMIN" | "USER"
  organizationId?: string | null
  organizationRole?: "ORG_ADMIN" | "MANAGER" | "PARTNER" | null
}

function LoginPageContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Λάθος email ή κωδικός.")
      setLoading(false)
      return
    }

    const session = await getSession()
    const user = session?.user as SessionUser | undefined

    if (!user) {
      setError("Δεν ήταν δυνατή η ανάκτηση της συνεδρίας.")
      setLoading(false)
      return
    }

    if (callbackUrl) {
      window.location.href = callbackUrl
      return
    }

    if (user.systemRole === "SUPER_ADMIN") {
      window.location.href = "/super-admin/organizations"
      return
    }

    if (user.organizationRole === "PARTNER") {
      window.location.href = "/partner/tasks"
      return
    }

    if (
      user.organizationRole === "MANAGER" ||
      user.organizationRole === "ORG_ADMIN"
    ) {
      window.location.href = "/dashboard"
      return
    }

    window.location.href = "/dashboard"
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Σύνδεση</h1>
          <p className="mt-2 text-sm text-slate-600">
            Είσοδος στο OPS SaaS
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              placeholder="name@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Κωδικός
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Σύνδεση..." : "Είσοδος"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}
