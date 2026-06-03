import { Redis } from "@upstash/redis"
import { randomUUID } from "crypto"
import type { MenuItem, MagicTokenPayload, Order, OrdersMap, TeamMember, OutreachStats } from "./types"

const redis = Redis.fromEnv()

function dayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function saveOrder(
  personName: string,
  itemId: string,
  selectedBread?: string,
  selectedDressing?: string[],
  slackUserId?: string,
): Promise<void> {
  const key = `orders:${dayKey()}`
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

export function teamMemberHasOrdered(member: TeamMember, orders: OrdersMap): boolean {
  if (member.slack_user_id in orders) return true
  if (member.name.toLowerCase() in orders) return true
  return Object.values(orders).some((o) => o.slack_user_id === member.slack_user_id)
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

export async function getOrdersForDay(day?: string): Promise<OrdersMap> {
  const key = `orders:${day ?? dayKey()}`
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
  const key = `orders:${dayKey()}`
  await redis.hdel(key, personName.toLowerCase())
}

export async function resetDayOrders(day?: string): Promise<void> {
  const d = day ?? dayKey()
  await Promise.all([
    redis.del(`orders:${d}`),
    redis.del(`links:sent:${d}`),
    redis.del(`skipped:${d}`),
  ])
}

export async function recordLinksSent(slackUserIds: string[]): Promise<void> {
  if (slackUserIds.length === 0) return
  const key = `links:sent:${dayKey()}`
  await Promise.all(slackUserIds.map((id) => redis.sadd(key, id)))
}

export async function getLinksSentForDay(day?: string): Promise<string[]> {
  return redis.smembers(`links:sent:${day ?? dayKey()}`) as Promise<string[]>
}

export type { OutreachStats } from "./types"

export async function getOutreachStats(day?: string): Promise<OutreachStats> {
  const d = day ?? dayKey()
  const [sentIds, orders, skipped] = await Promise.all([
    getLinksSentForDay(d),
    getOrdersForDay(d),
    getSkippedUsers(d),
  ])
  const skippedSet = new Set(skipped)
  const sent = sentIds.length
  const confirmed = sentIds.filter((id) => id in orders || skippedSet.has(id)).length
  const percent = sent > 0 ? Math.round((confirmed / sent) * 100) : 0
  return { sent, confirmed, percent }
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
  await redis.sadd(`skipped:${dayKey()}`, slackUserId)
}

export async function getSkippedUsers(day?: string): Promise<string[]> {
  return redis.smembers(`skipped:${day ?? dayKey()}`)
}

export interface DaySnapshot {
  day: string
  orders: OrdersMap
  skipped: string[]
}

export async function getAllDaysData(): Promise<DaySnapshot[]> {
  const orderKeys: string[] = []
  let cursor = 0
  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: "orders:*", count: 100 })
    orderKeys.push(...(keys as string[]))
    cursor = Number(nextCursor)
  } while (cursor !== 0)

  if (orderKeys.length === 0) return []

  const days = orderKeys
    .map((k) => k.replace("orders:", ""))
    .sort((a, b) => b.localeCompare(a))

  const snapshots = await Promise.all(
    days.map(async (day) => {
      const [orders, skipped] = await Promise.all([
        getOrdersForDay(day),
        redis.smembers(`skipped:${day}`) as Promise<string[]>,
      ])
      return { day, orders, skipped }
    })
  )

  return snapshots
}

export { dayKey }
