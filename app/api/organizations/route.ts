import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {

  const organizations = await prisma.organization.findMany()

  return Response.json(organizations)

}