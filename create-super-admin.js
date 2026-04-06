const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@ops.local";
  const password = "Admin1234!";
  const name = "Super Admin";

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        name,
        passwordHash,
        systemRole: "SUPER_ADMIN",
        isActive: true,
      },
    });

    console.log(" super admin ενημερώθηκε:");
    console.log(JSON.stringify({ email, password }, null, 2));
    return;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      systemRole: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log(" super admin δημιουργήθηκε:");
  console.log(JSON.stringify({ email, password }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
