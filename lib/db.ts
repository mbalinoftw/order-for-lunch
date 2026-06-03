import { Redis } from "@upstash/redis"
import { randomUUID } from "crypto"
import type { MenuItem, MagicTokenPayload, Order, OrdersMap, TeamMember } from "./types"

const redis = Redis.fromEnv()

function weekKey(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  // ISO 8601: shift to the Thursday of the current week, then compute week number
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-${String(week).padStart(2, "0")}`
}

export async function saveOrder(
  personName: string,
  itemId: string,
  selectedBread?: string,
  selectedDressing?: string[],
  slackUserId?: string,
): Promise<void> {
  const key = `orders:${weekKey()}`
  const order: Order = {
    name: personName,
    ...(slackUserId && { slack_user_id: slackUserId }),
    item_id: itemId,
    ...(selectedBread && { selected_bread: selectedBread }),
    ...(selectedDressing && { selected_dressing: selectedDressing }),
    created_at: new Date().toISOString(),
  }
  const hashField = slackUserId ?? personName.toLowerCase()
  await redis.hset(key, { [hashField]: JSON.stringify(order) })
}

export async function generateTokensForTeam(
  filterIds?: string[],
): Promise<Map<string, string>> {
  const allMembers = await getTeamMembers()
  const members = filterIds
    ? allMembers.filter((m) => filterIds.includes(m.slack_user_id))
    : allMembers
  const tokenMap = new Map<string, string>()
  for (const member of members) {
    const token = randomUUID()
    const payload: MagicTokenPayload = { slack_user_id: member.slack_user_id, name: member.name }
    await redis.set(`token:${token}`, JSON.stringify(payload), { ex: 86400 })
    tokenMap.set(member.slack_user_id, token)
  }
  return tokenMap
}

export async function validateToken(token: string): Promise<MagicTokenPayload | null> {
  const raw = await redis.get<string>(`token:${token}`)
  if (!raw) return null
  try {
    return typeof raw === "string" ? JSON.parse(raw) : (raw as MagicTokenPayload)
  } catch {
    return null
  }
}

export async function getAndConsumeToken(token: string): Promise<MagicTokenPayload | null> {
  const raw = await redis.getdel<string>(`token:${token}`)
  if (!raw) return null
  try {
    return typeof raw === "string" ? JSON.parse(raw) : (raw as MagicTokenPayload)
  } catch {
    return null
  }
}

export async function getOrdersForWeek(week?: string): Promise<OrdersMap> {
  const key = `orders:${week ?? weekKey()}`
  const raw = await redis.hgetall<Record<string, string>>(key)
  if (!raw) return {}

  const result: OrdersMap = {}
  for (const [personKey, value] of Object.entries(raw)) {
    try {
      result[personKey] = typeof value === "string" ? JSON.parse(value) : (value as Order)
    } catch {
      // skip malformed entries
    }
  }
  return result
}

export async function deleteOrder(personName: string): Promise<void> {
  const key = `orders:${weekKey()}`
  await redis.hdel(key, personName.toLowerCase())
}

export async function resetWeekOrders(week?: string): Promise<void> {
  const key = `orders:${week ?? weekKey()}`
  await redis.del(key)
}

export async function getMenuItems(): Promise<MenuItem[] | null> {
  return redis.get<MenuItem[]>("menu:items")
}

export async function saveMenuItems(items: MenuItem[]): Promise<void> {
  await redis.set("menu:items", JSON.stringify(items))
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const members = await redis.get<TeamMember[]>("team:members")
  return members ?? []
}

export async function saveTeamMembers(members: TeamMember[]): Promise<void> {
  await redis.set("team:members", JSON.stringify(members))
}

export async function skipUser(slackUserId: string): Promise<void> {
  await redis.sadd(`skipped:${weekKey()}`, slackUserId)
}

export async function getSkippedUsers(): Promise<string[]> {
  return redis.smembers(`skipped:${weekKey()}`)
}

export interface WeekSnapshot {
  week: string
  orders: OrdersMap
  skipped: string[]
}

export async function getAllWeeksData(): Promise<WeekSnapshot[]> {
  const orderKeys: string[] = []
  let cursor = 0
  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: "orders:*", count: 100 })
    orderKeys.push(...(keys as string[]))
    cursor = Number(nextCursor)
  } while (cursor !== 0)

  if (orderKeys.length === 0) return []

  const weeks = orderKeys
    .map((k) => k.replace("orders:", ""))
    .sort((a, b) => b.localeCompare(a))

  const snapshots = await Promise.all(
    weeks.map(async (week) => {
      const [orders, skipped] = await Promise.all([
        getOrdersForWeek(week),
        redis.smembers(`skipped:${week}`) as Promise<string[]>,
      ])
      return { week, orders, skipped }
    })
  )

  return snapshots
}

export { weekKey }
