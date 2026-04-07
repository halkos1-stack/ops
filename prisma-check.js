const prismaPromise = import("@prisma/client").then(
  ({ PrismaClient }) => new PrismaClient()
)

async function main() {
  const prisma = await prismaPromise
  console.log("bookingPropertyMapping" in prisma, typeof prisma.bookingPropertyMapping)
  console.log("bookingSyncEvent" in prisma, typeof prisma.bookingSyncEvent)
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  process.exit(1)
})
