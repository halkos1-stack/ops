import { BookingSyncStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type BookingSyncEventParams = {
  bookingId: string
  organizationId: string
  eventType: string
  sourcePlatform: string
  resultStatus?: BookingSyncStatus | null
  message?: string | null
  payload?: unknown
  propertyId?: string | null
  taskId?: string | null
  actorType?: string | null
  actorName?: string | null
  activityAction?: string | null
  activityMetadata?: Record<string, unknown> | null
}

export async function createBookingSyncEvent(params: BookingSyncEventParams) {
  const {
    bookingId,
    organizationId,
    eventType,
    sourcePlatform,
    resultStatus,
    message,
    payload,
    propertyId,
    taskId,
    actorType,
    actorName,
    activityAction,
    activityMetadata,
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

  await prisma.activityLog.create({
    data: {
      organizationId,
      propertyId: propertyId ?? null,
      bookingId,
      taskId: taskId ?? null,
      entityType: "BOOKING",
      entityId: bookingId,
      action: activityAction ?? eventType,
      message: message ?? null,
      actorType: actorType ?? "SYSTEM",
      actorName: actorName ?? "Booking Service",
      metadata: {
        eventType,
        sourcePlatform,
        resultStatus: resultStatus ?? null,
        ...(activityMetadata ?? {}),
      },
    },
  })
}

export async function createBookingSyncEvents(params: {
  events: BookingSyncEventParams[]
}) {
  for (const event of params.events) {
    await createBookingSyncEvent(event)
  }
}
