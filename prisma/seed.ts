import {
  PrismaClient,
  OrganizationRole,
  SystemRole,
} from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = "admin@ops.local"
  const password = "12345678"
  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Κεντρικός Διαχειριστής",
      passwordHash,
      systemRole: SystemRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      email,
      name: "Κεντρικός Διαχειριστής",
      passwordHash,
      systemRole: SystemRole.SUPER_ADMIN,
      isActive: true,
    },
  })

  const organization = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {
      name: "Demo Organization",
      isActive: true,
    },
    create: {
      name: "Demo Organization",
      slug: "demo-org",
      isActive: true,
    },
  })

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id,
      },
    },
    update: {
      role: OrganizationRole.ORG_ADMIN,
      isActive: true,
    },
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: OrganizationRole.ORG_ADMIN,
      isActive: true,
    },
  })

  await prisma.settings.upsert({
    where: {
      organizationId: organization.id,
    },
    update: {},
    create: {
      organizationId: organization.id,
      companyName: "Demo Organization",
      companyEmail: "admin@ops.local",
      companyPhone: "",
      companyAddress: "",
    },
  })

  console.log("Seed completed")
  console.log("Email:", email)
  console.log("Password:", password)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })