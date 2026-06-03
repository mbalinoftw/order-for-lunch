import { NextRequest, NextResponse } from "next/server"
import { getAllWeeksData, getTeamMembers } from "@/lib/db"
import { MENU_ITEMS, getMenuItem } from "@/lib/menu"
import { isValidAdminCookie, ADMIN_COOKIE } from "@/lib/auth"

export const revalidate = 300 // 5 minutes

export async function GET(request: NextRequest) {
  if (!await isValidAdminCookie(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [weeksData, teamMembers] = await Promise.all([getAllWeeksData(), getTeamMembers()])
  const teamSize = teamMembers.length

  // ── A. Popularidad del menú ──────────────────────────────────────────
  const itemCounts: Record<string, number> = {}
  const breadCounts: Record<string, number> = {}
  const dressingCounts: Record<string, number> = {}

  for (const { orders } of weeksData) {
    for (const order of Object.values(orders)) {
      itemCounts[order.item_id] = (itemCounts[order.item_id] ?? 0) + 1
      if (order.selected_bread) {
        breadCounts[order.selected_bread] = (breadCounts[order.selected_bread] ?? 0) + 1
      }
      for (const d of order.selected_dressing ?? []) {
        dressingCounts[d] = (dressingCounts[d] ?? 0) + 1
      }
    }
  }

  const totalOrders = Object.values(itemCounts).reduce((s, n) => s + n, 0)

  const menu_ranking = MENU_ITEMS.map((item) => ({
    item_id: item.id,
    name: item.name,
    count: itemCounts[item.id] ?? 0,
    percentage: totalOrders > 0 ? Math.round(((itemCounts[item.id] ?? 0) / totalOrders) * 100) : 0,
  })).sort((a, b) => b.count - a.count)

  const bread_ranking = Object.entries(breadCounts)
    .map(([option, count]) => ({ option, count }))
    .sort((a, b) => b.count - a.count)

  const dressing_ranking = Object.entries(dressingCounts)
    .map(([option, count]) => ({ option, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // ── B. Participación semanal ─────────────────────────────────────────
  const weekly_participation = weeksData.map(({ week, orders, skipped }) => {
    const ordered = Object.keys(orders).length
    const skippedCount = skipped.length
    const no_response = Math.max(0, teamSize - ordered - skippedCount)
    const spend = Object.values(orders).reduce((sum, o) => {
      const item = getMenuItem(o.item_id)
      return sum + (item?.price ?? 0)
    }, 0)
    return { week, ordered, skipped: skippedCount, no_response, total: teamSize, spend }
  })

  const avgParticipation = weekly_participation.length > 0
    ? Math.round(
        weekly_participation.reduce((s, w) => s + (teamSize > 0 ? w.ordered / teamSize : 0), 0)
        / weekly_participation.length * 100
      )
    : 0

  // ── C. Perfil por usuario ────────────────────────────────────────────
  const userMap: Record<string, {
    name: string
    itemCounts: Record<string, number>
    breadCounts: Record<string, number>
    dressingCounts: Record<string, number>
    weeksParticipated: Set<string>
    totalOrders: number
  }> = {}

  for (const { week, orders } of weeksData) {
    for (const order of Object.values(orders)) {
      const key = order.slack_user_id ?? order.name.toLowerCase()
      if (!userMap[key]) {
        userMap[key] = {
          name: order.name,
          itemCounts: {},
          breadCounts: {},
          dressingCounts: {},
          weeksParticipated: new Set(),
          totalOrders: 0,
        }
      }
      const u = userMap[key]
      u.totalOrders++
      u.weeksParticipated.add(week)
      u.itemCounts[order.item_id] = (u.itemCounts[order.item_id] ?? 0) + 1
      if (order.selected_bread) {
        u.breadCounts[order.selected_bread] = (u.breadCounts[order.selected_bread] ?? 0) + 1
      }
      for (const d of order.selected_dressing ?? []) {
        u.dressingCounts[d] = (u.dressingCounts[d] ?? 0) + 1
      }
    }
  }

  const user_profiles = Object.values(userMap).map((u) => {
    const uniqueItems = Object.keys(u.itemCounts).length
    const favoriteItemId = Object.entries(u.itemCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    const favoriteBread = Object.entries(u.breadCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    const favoriteDressing = Object.entries(u.dressingCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    const varietyIndex = u.totalOrders >= 3
      ? Math.round((uniqueItems / u.totalOrders) * 100) / 100
      : null
    return {
      name: u.name,
      total_orders: u.totalOrders,
      weeks_participated: u.weeksParticipated.size,
      favorite_item: getMenuItem(favoriteItemId)?.name ?? favoriteItemId,
      variety_index: varietyIndex,
      favorite_bread: favoriteBread ?? null,
      favorite_dressing: favoriteDressing ?? null,
    }
  }).sort((a, b) => b.total_orders - a.total_orders)

  // ── Summary ──────────────────────────────────────────────────────────
  const mostExpensiveWeek = weekly_participation.reduce(
    (max, w) => (w.spend > (max?.spend ?? 0) ? w : max),
    weekly_participation[0] ?? null
  )

  const summary = {
    total_weeks: weeksData.length,
    total_orders: totalOrders,
    avg_participation_pct: avgParticipation,
    most_popular_item: menu_ranking[0]?.name ?? null,
    most_expensive_week: mostExpensiveWeek?.week ?? null,
    most_expensive_week_spend: mostExpensiveWeek?.spend ?? 0,
  }

  return NextResponse.json({
    menu_ranking,
    bread_ranking,
    dressing_ranking,
    weekly_participation,
    user_profiles,
    summary,
  })
}
