import { NextRequest, NextResponse } from "next/server"
import { getTeamMembers, getOrdersForDay, getSkippedUsers, teamMemberHasOrdered } from "@/lib/db"
import { sendReminder } from "@/lib/slack"

export async function POST(request: NextRequest) {
  const { isValidAdminCookie, ADMIN_COOKIE } = await import("@/lib/auth")
  if (!await isValidAdminCookie(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [members, orders, skipped] = await Promise.all([
    getTeamMembers(), getOrdersForDay(), getSkippedUsers()
  ])
  const skippedSet = new Set(skipped)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const pending = members.filter(
    (m) => !teamMemberHasOrdered(m, orders) && !skippedSet.has(m.slack_user_id)
  )

  const results = await Promise.allSettled(
    pending.map((m) => sendReminder(m.slack_user_id, appUrl))
  )

  const sent = results.filter((r) => r.status === "fulfilled").length
  const failed = results.filter((r) => r.status === "rejected").length

  return NextResponse.json({ sent, failed, pending: pending.map((m) => m.name) })
}
