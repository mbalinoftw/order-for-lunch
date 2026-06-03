import { NextRequest, NextResponse } from "next/server"
import { saveOrder, getOrdersForDay, resetDayOrders, getAndConsumeToken, getOutreachStats } from "@/lib/db"
import { getMenuItem, MENU_ITEMS } from "@/lib/menu"
import { sendOrderConfirmation } from "@/lib/slack"

export async function GET(request: NextRequest) {
  const day = request.nextUrl.searchParams.get("day") ?? undefined
  const orders = await getOrdersForDay(day)

  const { isValidAdminCookie, ADMIN_COOKIE } = await import("@/lib/auth")
  if (await isValidAdminCookie(request.cookies.get(ADMIN_COOKIE)?.value)) {
    const outreach = await getOutreachStats(day)
    return NextResponse.json({ orders, outreach })
  }

  return NextResponse.json(orders)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, item_id, selected_bread, selected_dressing, token } = body as {
    name: string
    item_id: string
    selected_bread?: string
    selected_dressing?: string[]
    token?: string
  }

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 })
  }

  const item = getMenuItem(item_id) ?? MENU_ITEMS.find((m) => m.id === item_id)
  if (!item) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 400 })
  }

  if (item.bread && !selected_bread) {
    return NextResponse.json({ error: "Tenés que elegir el pan" }, { status: 400 })
  }

  let slackUserId: string | undefined
  if (token) {
    const payload = await getAndConsumeToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Tu link expiró. Pedile uno nuevo al coordinador." }, { status: 401 })
    }
    slackUserId = payload.slack_user_id
  }

  await saveOrder(name.trim(), item_id, selected_bread, selected_dressing, slackUserId)

  if (slackUserId) {
    sendOrderConfirmation(slackUserId, {
      name: name.trim(),
      itemName: item.name,
      price: item.price,
      bread: selected_bread,
      dressing: selected_dressing,
    }).catch((err) => console.error("Slack confirmation failed:", err))
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const { isValidAdminCookie, ADMIN_COOKIE } = await import("@/lib/auth")
  if (!await isValidAdminCookie(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const day = request.nextUrl.searchParams.get("day") ?? undefined
  await resetDayOrders(day)
  return NextResponse.json({ ok: true })
}
