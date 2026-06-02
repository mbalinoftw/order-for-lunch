import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { computeAdminToken, ADMIN_COOKIE } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  if (!password) return NextResponse.json({ error: "Contraseña requerida" }, { status: 400 })

  const expected = process.env.ADMIN_PASSWORD ?? ""
  const aBuffer = Buffer.from(password)
  const bBuffer = Buffer.from(expected)
  const match =
    aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer)

  if (!match) return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 })

  const token = await computeAdminToken()
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })
  return response
}
