import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      systemRole: "SUPER_ADMIN" | "USER"
      organizationId: string | null
      organizationRole: "ORG_ADMIN" | "MANAGER" | "PARTNER" | null
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    systemRole: "SUPER_ADMIN" | "USER"
    organizationId: string | null
    organizationRole: "ORG_ADMIN" | "MANAGER" | "PARTNER" | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    systemRole?: "SUPER_ADMIN" | "USER"
    organizationId?: string | null
    organizationRole?: "ORG_ADMIN" | "MANAGER" | "PARTNER" | null
  }
}