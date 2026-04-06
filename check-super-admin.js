const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { systemRole: "SUPER_ADMIN" },
    select: {
      email: true,
      name: true,
      isActive: true,
    },
  });

  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
