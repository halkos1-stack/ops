import type { ReactNode } from "react"
import { requirePartner } from "@/lib/auth"

export default async function PartnerLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePartner()

  return <>{children}</>
}