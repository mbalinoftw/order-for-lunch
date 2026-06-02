import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { Redis } from "@upstash/redis"
import { computeAdminToken, ADMIN_COOKIE } from "@/lib/auth"

const redis = Redis.fromEnv()
const MAX_ATTEMPTS = 10
const WINDOW_SECONDS = 900 // 15 minutes

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  const rateLimitKey = `login_attempts:${ip}`
  const attempts = await redis.incr(rateLimitKey)
  if (attempts === 1) await redis.expire(rateLimitKey, WINDOW_SECONDS)
  if (attempts > MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Demasiados intentos. Intentá en 15 minutos." }, { status: 429 })
  }

  const { password } = await request.json()
  if (!password) return NextResponse.json({ error: "Contraseña requerida" }, { status: 400 })

  const expected = process.env.ADMIN_PASSWORD ?? ""
  const MAX = 1024
  const a = Buffer.alloc(MAX)
  const b = Buffer.alloc(MAX)
  Buffer.from(password).copy(a)
  Buffer.from(expected).copy(b)
  const match = timingSafeEqual(a, b) && password.length === expected.length

  if (!match) return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 })

  await redis.del(rateLimitKey)
  const token = await computeAdminToken()
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })
  return response
}
