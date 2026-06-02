import { NextRequest, NextResponse } from "next/server"
import { ADMIN_COOKIE, isValidAdminCookie } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next()

  const cookie = request.cookies.get(ADMIN_COOKIE)?.value
  const valid = await isValidAdminCookie(cookie)
  if (!valid) {
    return NextResponse.redirect(new URL("/admin/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
