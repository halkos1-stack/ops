import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {

  const org = await prisma.organization.create({
    data: {
      name: "OPS Demo Organization"
    }
  })

  return Response.json(org)
}
