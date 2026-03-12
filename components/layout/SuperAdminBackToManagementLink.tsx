import Link from "next/link"

export default function SuperAdminBackToManagementLink() {
  return (
    <Link
      href="/super-admin/organizations"
      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      Επιστροφή στη διαχείριση οργανισμών
    </Link>
  )
}