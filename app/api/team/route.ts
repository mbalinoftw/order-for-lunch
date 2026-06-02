import { NextRequest, NextResponse } from "next/server"
import { getTeamMembers } from "@/lib/db"
import { isValidAdminCookie, ADMIN_COOKIE } from "@/lib/auth"

export async function GET(request: NextRequest) {
  if (!await isValidAdminCookie(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const members = await getTeamMembers()
  return NextResponse.json(members)
}
