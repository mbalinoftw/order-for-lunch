import { NextRequest, NextResponse } from "next/server"
import { skipUser } from "@/lib/db"
import { getOptOutPhrase } from "@/lib/order"
import { slackApp } from "@/lib/slack"

async function verifySlackSignature(request: NextRequest, rawBody: string): Promise<boolean> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET ?? ""
  const timestamp = request.headers.get("x-slack-request-timestamp") ?? ""
  const signature = request.headers.get("x-slack-signature") ?? ""

  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(signingSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`v0:${timestamp}:${rawBody}`))
  const computed = "v0=" + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
  return computed === signature
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (!await verifySlackSignature(request, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const payloadStr = new URLSearchParams(rawBody).get("payload")
  if (!payloadStr) return new NextResponse(null, { status: 200 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = JSON.parse(payloadStr)

  if (payload.type === "block_actions") {
    const action = payload.actions?.[0]
    if (action?.action_id === "remind_later") {
      const slackUserId: string = payload.user.id

      // Extraer la URL del pedido del botón original para incluirla en el recordatorio
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actionsBlock = payload.message.blocks?.find((b: any) => b.type === "actions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderUrl: string = actionsBlock?.elements?.find((e: any) => e.url)?.url ?? ""

      const postAt = Math.floor(Date.now() / 1000) + 900 // 15 minutos

      await slackApp.client.chat.scheduleMessage({
        channel: slackUserId,
        post_at: postAt,
        text: `:alarm_clock: *¡No te olvides del pedido!* Tu link sigue siendo válido: ${orderUrl}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: ":alarm_clock: *¡No te olvides del pedido!*\nTe lo dejamos acá para que no tengas excusa.",
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Cargar mi pedido", emoji: true },
                style: "primary",
                url: orderUrl,
              },
            ],
          },
        ],
      })

      await slackApp.client.chat.update({
        channel: payload.channel.id,
        ts: payload.message.ts,
        text: "⏰ Te mando un recordatorio en 15 minutos.",
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: "⏰ Dale, te mando un recordatorio en 15 minutos. No te duermas :index_pointing_at_the_viewer:." },
          },
        ],
      })
    }

    if (action?.action_id === "opt_out_order") {
      const slackUserId: string = payload.user.id
      await skipUser(slackUserId)

      const phrase = getOptOutPhrase()

      await slackApp.client.chat.update({
        channel: payload.channel.id,
        ts: payload.message.ts,
        text: `✅ ${phrase.replaceAll("*", "")}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `✅ ${phrase}`,
            },
          },
        ],
      })
    }
  }

  return new NextResponse(null, { status: 200 })
}
