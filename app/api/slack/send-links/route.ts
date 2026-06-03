import { NextRequest, NextResponse } from "next/server"
import { sendLinks } from "@/lib/slack"
import { recordLinksSent } from "@/lib/db"

export async function POST(request: NextRequest) {
  const { isValidAdminCookie, ADMIN_COOKIE } = await import("@/lib/auth")
  if (!await isValidAdminCookie(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const slackUserIds: string[] | undefined = body.slack_user_ids

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const sent = await sendLinks(appUrl, slackUserIds)
  if (slackUserIds?.length) {
    await recordLinksSent(slackUserIds)
  }
  return NextResponse.json({ sent })
}
