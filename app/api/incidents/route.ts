import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const propertyId = searchParams.get("propertyId")
    const status = searchParams.get("status")
    const type = searchParams.get("type")

    const incidents = await prisma.incident.findMany({
      where: {
        ...(propertyId ? { propertyId } : {}),
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(incidents)
  } catch (error) {
    console.error("GET /api/incidents error:", error)

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης συμβάντων." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const propertyId = String(body.propertyId || "").trim()
    const type = String(body.type || "").trim()
    const title = String(body.title || "").trim()
    const description = String(body.description || "").trim()
    const severity = String(body.severity || "Μεσαία").trim()
    const status = String(body.status || "Ανοιχτό").trim()
    const linkedTaskId =
      body.linkedTaskId && String(body.linkedTaskId).trim() !== ""
        ? String(body.linkedTaskId).trim()
        : null

    if (!propertyId) {
      return NextResponse.json(
        { error: "Το propertyId είναι υποχρεωτικό." },
        { status: 400 }
      )
    }

    if (!type) {
      return NextResponse.json(
        { error: "Ο τύπος συμβάντος είναι υποχρεωτικός." },
        { status: 400 }
      )
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, code: true },
    })

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      )
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

    const count = await prisma.incident.count({
      where: {
        propertyId,
      },
    })

    const incidentCode = `INC-${property.code}-${String(count + 1).padStart(4, "0")}`

    const incident = await prisma.incident.create({
      data: {
        code: incidentCode,
        propertyId,
        type,
        title: title || null,
        description: description || null,
        severity,
        status,
        linkedTaskId,
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

    return NextResponse.json(incident, { status: 201 })
  } catch (error) {
    console.error("POST /api/incidents error:", error)

    return NextResponse.json(
      { error: "Αποτυχία δημιουργίας συμβάντος." },
      { status: 500 }
    )
  }
}