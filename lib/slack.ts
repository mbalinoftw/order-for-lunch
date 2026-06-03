import { App } from "@slack/bolt"

// Inicializado en modo HTTP para funcionar como serverless function
export const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  socketMode: false,
})

export const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function postOrderAnnouncement(): Promise<void> {
  await slackApp.client.chat.postMessage({
    channel: SLACK_CHANNEL_ID,
    text: ":fork_and_knife: *¡Hora del pedido!* Elegí tu almuerzo antes de que cierre.",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":fork_and_knife: *¡Hora del pedido!*\nElegí tu almuerzo y confirmá tu pedido.",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Ver menú y pedir", emoji: true },
            style: "primary",
            url: APP_URL,
          },
        ],
      },
    ],
  })
}

export async function sendReminder(slackUserId: string, appUrl: string): Promise<void> {
  await slackApp.client.chat.postMessage({
    channel: slackUserId,
    text: `:wave: ¡Hola! Todavía no cargaste tu pedido del almuerzo. <${appUrl}|Hacé click acá> para elegir antes de que cierre.`,
  })
}

export async function sendMagicLink(slackUserId: string, token: string, appUrl: string): Promise<void> {
  const url = `${appUrl}?token=${token}`
  await slackApp.client.chat.postMessage({
    channel: slackUserId,
    text: `:sandwich: *¡Hora del pedido!* Tu link personal: ${url}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":sandwich: *¡Hora del pedido!*\nTu link es personal — entrá y elegí tu sangucheto, rey.",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Cargar mi pedido", emoji: true },
            style: "primary",
            url,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Recordame en 15 min", emoji: true },
            action_id: "remind_later",
          },
          {
            type: "button",
            text: { type: "plain_text", text: "No voy a pedir, gracias", emoji: true },
            action_id: "opt_out_order",
            style: "danger",
          },
        ],
      },
    ],
  })
}

export async function sendOrderConfirmation(
  slackUserId: string,
  order: {
    name: string
    itemName: string
    price: number
    bread?: string
    dressing?: string[]
  },
): Promise<void> {
  const bankInfo = process.env.BANK_INFO
  const extras = [
    order.bread ? `Pan: ${order.bread}` : null,
    order.dressing?.length ? `Aderezo: ${order.dressing.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `✅ ¡Pedido confirmado, ${order.name}!`, emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*:sandwich: ${order.itemName}*  —  $${order.price.toLocaleString("es-AR")}${extras ? `\n${extras}` : ""}`,
      },
    },
  ]

  if (bankInfo) {
    blocks.push({ type: "divider" })
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:credit_card: *Datos para la transferencia:*\n${bankInfo}`,
      },
    })
  }

  await slackApp.client.chat.postMessage({
    channel: slackUserId,
    text: `✅ Pedido confirmado: ${order.itemName} — $${order.price.toLocaleString("es-AR")}`,
    blocks,
  })
}

export async function sendLinks(appUrl: string, filterIds?: string[]): Promise<number> {
  const { generateTokensForTeam } = await import("./db")
  const tokenMap = await generateTokensForTeam(filterIds)
  const results = await Promise.allSettled(
    Array.from(tokenMap.entries()).map(([slackUserId, token]) =>
      sendMagicLink(slackUserId, token, appUrl)
    )
  )
  return results.filter((r) => r.status === "fulfilled").length
}
