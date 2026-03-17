import { prisma } from "@/lib/prisma"

export async function resolveBookingPropertyMatch(params: {
  organizationId: string
  sourcePlatform: string
  propertyId?: string | null
  externalListingId?: string | null
}) {
  const { organizationId, sourcePlatform, propertyId, externalListingId } = params

  if (propertyId) {
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        organizationId,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    })

    if (property) {
      return {
        matched: true,
        propertyId: property.id,
        property,
        mappingId: null as string | null,
      }
    }
  }

  if (externalListingId) {
    const mapping = await prisma.bookingPropertyMapping.findFirst({
      where: {
        organizationId,
        sourcePlatform,
        externalListingId,
        status: "ACTIVE",
      },
      include: {
        property: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    })

    if (mapping?.property) {
      return {
        matched: true,
        propertyId: mapping.property.id,
        property: mapping.property,
        mappingId: mapping.id,
      }
    }
  }

  return {
    matched: false,
    propertyId: null,
    property: null,
    mappingId: null,
  }
}