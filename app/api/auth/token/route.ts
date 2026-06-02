import { NextRequest, NextResponse } from "next/server"
import { validateToken } from "@/lib/db"

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 })
  }

  const payload = await validateToken(token)
  if (!payload) {
    return NextResponse.json({ error: "Token inválido o expirado" }, { status: 404 })
  }

  return NextResponse.json(payload)
}
