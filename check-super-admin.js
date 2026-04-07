const prismaPromise = import("@prisma/client").then(
  ({ PrismaClient }) => new PrismaClient()
)

async function main() {
  const prisma = await prismaPromise
  const users = await prisma.user.findMany({
    where: { systemRole: "SUPER_ADMIN" },
    select: {
      email: true,
      name: true,
      isActive: true,
    },
  })

  console.log(JSON.stringify(users, null, 2))
}

main()
  .catch(console.error)
  .finally(async () => {
    const prisma = await prismaPromise
    await prisma.$disconnect()
  })
