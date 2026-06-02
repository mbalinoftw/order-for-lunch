import { NextRequest, NextResponse } from "next/server"
import { saveOrder, getOrdersForWeek, resetWeekOrders, getAndConsumeToken } from "@/lib/db"
import { getMenuItem, MENU_ITEMS } from "@/lib/menu"

export async function GET(request: NextRequest) {
  const week = request.nextUrl.searchParams.get("week") ?? undefined
  const orders = await getOrdersForWeek(week)
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
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const { isValidAdminCookie, ADMIN_COOKIE } = await import("@/lib/auth")
  if (!await isValidAdminCookie(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const week = request.nextUrl.searchParams.get("week") ?? undefined
  await resetWeekOrders(week)
  return NextResponse.json({ ok: true })
}
