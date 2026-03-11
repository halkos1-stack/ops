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
              where: { isActive: true },
              include: {
                organization: true,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        })

        if (!user || !user.passwordHash || !user.isActive) {
          return null
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)

        if (!isValid) {
          return null
        }

        const membership = user.memberships[0] ?? null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? null,
          systemRole: user.systemRole,
          organizationId: membership?.organizationId ?? null,
          organizationRole: membership?.role ?? null,
          organizationName: membership?.organization?.name ?? null,
          organizationSlug: membership?.organization?.slug ?? null,
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

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = (token as any).id
        ;(session.user as any).systemRole = (token as any).systemRole
        ;(session.user as any).organizationId = (token as any).organizationId
        ;(session.user as any).organizationRole = (token as any).organizationRole
        ;(session.user as any).organizationName = (token as any).organizationName
        ;(session.user as any).organizationSlug = (token as any).organizationSlug
      }

      return session
    },
  },
}