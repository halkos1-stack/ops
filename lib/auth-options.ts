import { PrismaAdapter } from "@next-auth/prisma-adapter"
import type { NextAuthOptions } from "next-auth"
import type { JWT } from "next-auth/jwt"
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
        token.id = user.id
        token.systemRole = user.systemRole ?? "USER"
        token.organizationId = user.organizationId ?? null
        token.organizationRole = user.organizationRole ?? null
        token.organizationName = user.organizationName ?? null
        token.organizationSlug = user.organizationSlug ?? null
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
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

        token.systemRole = dbUser.systemRole

        if (dbUser.systemRole === "SUPER_ADMIN") {
          token.organizationId = null
          token.organizationRole = null
          token.organizationName = null
          token.organizationSlug = null
          return token
        }

        const membership =
          dbUser.memberships.find((item) => item.organization.isActive) ?? null

        if (!membership) {
          return {}
        }

        token.organizationId = membership.organizationId
        token.organizationRole = membership.role
        token.organizationName = membership.organization.name
        token.organizationSlug = membership.organization.slug
      }

      return token
    },

    async session({ session, token }) {
      if (!session.user) {
        return session
      }

      const authToken = token as JWT

      if (!authToken.id) {
        session.expires = new Date(0).toISOString()
        return session
      }

      session.user.id = authToken.id
      session.user.systemRole = authToken.systemRole ?? "USER"
      session.user.organizationId = authToken.organizationId ?? null
      session.user.organizationRole = authToken.organizationRole ?? null
      session.user.organizationName = authToken.organizationName ?? null
      session.user.organizationSlug = authToken.organizationSlug ?? null

      return session
    },
  },
}
