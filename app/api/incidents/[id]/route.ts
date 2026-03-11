import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            city: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            date: true,
          },
        },
      },
    })

    if (!incident) {
      return NextResponse.json(
        { error: "Το συμβάν δεν βρέθηκε." },
        { status: 404 }
      )
    }

    return NextResponse.json(incident)
  } catch (error) {
    console.error("GET /api/incidents/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης συμβάντος." },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()

    const existingIncident = await prisma.incident.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingIncident) {
      return NextResponse.json(
        { error: "Το συμβάν δεν βρέθηκε." },
        { status: 404 }
      )
    }

    const propertyId =
      body.propertyId !== undefined ? String(body.propertyId || "").trim() : undefined

    const type =
      body.type !== undefined ? String(body.type || "").trim() : undefined

    const title =
      body.title !== undefined ? String(body.title || "").trim() : undefined

    const description =
      body.description !== undefined
        ? String(body.description || "").trim()
        : undefined

    const severity =
      body.severity !== undefined ? String(body.severity || "").trim() : undefined

    const status =
      body.status !== undefined ? String(body.status || "").trim() : undefined

    const linkedTaskId =
      body.linkedTaskId !== undefined
        ? body.linkedTaskId && String(body.linkedTaskId).trim() !== ""
          ? String(body.linkedTaskId).trim()
          : null
        : undefined

    if (propertyId !== undefined && !propertyId) {
      return NextResponse.json(
        { error: "Το propertyId δεν μπορεί να είναι κενό." },
        { status: 400 }
      )
    }

    if (type !== undefined && !type) {
      return NextResponse.json(
        { error: "Ο τύπος συμβάντος δεν μπορεί να είναι κενός." },
        { status: 400 }
      )
    }

    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true },
      })

      if (!property) {
        return NextResponse.json(
          { error: "Το ακίνητο δεν βρέθηκε." },
          { status: 404 }
        )
      }
    }

    if (linkedTaskId) {
      const task = await prisma.task.findUnique({
        where: { id: linkedTaskId },
        select: { id: true },
      })

      if (!task) {
        return NextResponse.json(
          { error: "Η συνδεδεμένη εργασία δεν βρέθηκε." },
          { status: 404 }
        )
      }
    }

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: {
        ...(propertyId !== undefined ? { propertyId } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(title !== undefined ? { title: title || null } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(severity !== undefined ? { severity } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(linkedTaskId !== undefined ? { linkedTaskId } : {}),
      },
      include: {
        property: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json(updatedIncident)
  } catch (error) {
    console.error("PUT /api/incidents/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία ενημέρωσης συμβάντος." },
      { status: 500 }
    )
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const existingIncident = await prisma.incident.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingIncident) {
      return NextResponse.json(
        { error: "Το συμβάν δεν βρέθηκε." },
        { status: 404 }
      )
    }

    await prisma.incident.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/incidents/[id] error:", error)

    return NextResponse.json(
      { error: "Αποτυχία διαγραφής συμβάντος." },
      { status: 500 }
    )
  }
}