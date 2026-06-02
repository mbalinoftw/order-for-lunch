import { NextRequest, NextResponse } from "next/server"
import { postOrderAnnouncement, sendLinks } from "@/lib/slack"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  await postOrderAnnouncement()
  const sent = await sendLinks(appUrl)
  return NextResponse.json({ ok: true, links_sent: sent })
}
