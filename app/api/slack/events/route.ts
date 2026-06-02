import { NextRequest, NextResponse } from "next/server"

async function verifySlackSignature(request: NextRequest, rawBody: string): Promise<boolean> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET ?? ""
  const timestamp = request.headers.get("x-slack-request-timestamp") ?? ""
  const signature = request.headers.get("x-slack-signature") ?? ""

  // Reject requests older than 5 minutes (replay attack protection)
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false

  const baseString = `v0:${timestamp}:${rawBody}`
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(signingSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(baseString))
  const computed = "v0=" + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
  return computed === signature
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (!await verifySlackSignature(request, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const body = JSON.parse(rawBody)

  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge })
  }

  return NextResponse.json({ ok: true })
}
