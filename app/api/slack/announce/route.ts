import { NextRequest, NextResponse } from "next/server"
import { postOrderAnnouncement } from "@/lib/slack"
import { isValidAdminCookie, ADMIN_COOKIE } from "@/lib/auth"

export async function POST(request: NextRequest) {
  if (!await isValidAdminCookie(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await postOrderAnnouncement()
  return NextResponse.json({ ok: true })
}
