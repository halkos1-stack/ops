import { BookingSyncStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function createBookingSyncEvent(params: {
  bookingId: string
  organizationId: string
  eventType: string
  sourcePlatform: string
  resultStatus?: BookingSyncStatus | null
  message?: string | null
  payload?: unknown
}) {
  const {
    bookingId,
    organizationId,
    eventType,
    sourcePlatform,
    resultStatus,
    message,
    payload,
  } = params

  await prisma.bookingSyncEvent.create({
    data: {
      bookingId,
      organizationId,
      eventType,
      sourcePlatform,
      resultStatus: resultStatus ?? null,
      message: message ?? null,
      payload:
        payload === undefined
          ? Prisma.JsonNull
          : (payload as Prisma.InputJsonValue),
    },
  })
}