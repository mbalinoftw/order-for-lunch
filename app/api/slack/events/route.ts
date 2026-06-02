import { NextRequest, NextResponse } from "next/server"

// Este endpoint recibe eventos de Slack (challenge de verificación).
// Expandir con handlers de eventos si se necesitan más integraciones.
export async function POST(request: NextRequest) {
  const body = await request.json()

  // Slack URL verification challenge
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge })
  }

  return NextResponse.json({ ok: true })
}
