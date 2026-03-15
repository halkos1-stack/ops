import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Το route /api/create-user δεν χρησιμοποιείται πλέον.",
    },
    { status: 410 }
  )
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Το route /api/create-user δεν χρησιμοποιείται πλέον.",
    },
    { status: 410 }
  )
}