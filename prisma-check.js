const { PrismaClient } = require("@prisma/client");

async function main() {
  const p = new PrismaClient();
  console.log("bookingPropertyMapping" in p, typeof p.bookingPropertyMapping);
  console.log("bookingSyncEvent" in p, typeof p.bookingSyncEvent);
  await p.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
