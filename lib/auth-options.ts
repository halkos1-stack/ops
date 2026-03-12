import { PrismaAdapter } from "@next-auth/prisma-adapter"
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Κωδικός",
          type: "password",
        },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase()
        const password = String(credentials?.password ?? "")

        if (!email || !password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              where: {
                isActive: true,
              },
              include: {
                organization: true,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        })

        if (!user) {
          return null
        }

        if (!user.passwordHash) {
          return null
        }

        if (!user.isActive) {
          return null
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)

        if (!isValid) {
          return null
        }

        if (user.systemRole === "SUPER_ADMIN") {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image ?? null,
            systemRole: user.systemRole,
            organizationId: null,
            organizationRole: null,
            organizationName: null,
            organizationSlug: null,
          }
        }

        const membership =
          user.memberships.find((item) => item.organization.isActive) ?? null

        if (!membership) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? null,
          systemRole: user.systemRole,
          organizationId: membership.organizationId,
          organizationRole: membership.role,
          organizationName: membership.organization.name,
          organizationSlug: membership.organization.slug,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        ;(token as any).id = user.id
        ;(token as any).systemRole = (user as any).systemRole ?? "USER"
        ;(token as any).organizationId = (user as any).organizationId ?? null
        ;(token as any).organizationRole = (user as any).organizationRole ?? null
        ;(token as any).organizationName = (user as any).organizationName ?? null
        ;(token as any).organizationSlug = (user as any).organizationSlug ?? null
      }

      if ((token as any).id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String((token as any).id) },
          include: {
            memberships: {
              where: {
                isActive: true,
              },
              include: {
                organization: true,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        })

        if (!dbUser || !dbUser.isActive) {
          return {}
        }

        ;(token as any).systemRole = dbUser.systemRole

        if (dbUser.systemRole === "SUPER_ADMIN") {
          ;(token as any).organizationId = null
          ;(token as any).organizationRole = null
          ;(token as any).organizationName = null
          ;(token as any).organizationSlug = null
          return token
        }

        const membership =
          dbUser.memberships.find((item) => item.organization.isActive) ?? null

        if (!membership) {
          return {}
        }

        ;(token as any).organizationId = membership.organizationId
        ;(token as any).organizationRole = membership.role
        ;(token as any).organizationName = membership.organization.name
        ;(token as any).organizationSlug = membership.organization.slug
      }

      return token
    },

    async session({ session, token }) {
      if (!session.user) {
        return session
      }

      if (!(token as any).id) {
        session.expires = new Date(0).toISOString()
        return session
      }

      ;(session.user as any).id = (token as any).id
      ;(session.user as any).systemRole = (token as any).systemRole ?? "USER"
      ;(session.user as any).organizationId =
        (token as any).organizationId ?? null
      ;(session.user as any).organizationRole =
        (token as any).organizationRole ?? null
      ;(session.user as any).organizationName =
        (token as any).organizationName ?? null
      ;(session.user as any).organizationSlug =
        (token as any).organizationSlug ?? null

      return session
    },
  },
}