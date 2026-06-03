import { track } from "@vercel/analytics"
import type { MenuItem } from "./types"

function getWeekKey(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-${String(week).padStart(2, "0")}`
}

export function trackItemClicked(
  item: MenuItem,
  userName: string,
  slackUserId: string | null,
): void {
  track("item_clicked", {
    item_id: item.id,
    item_name: item.name,
    item_price: item.price,
    is_veggie: item.veggie ?? false,
    user_name: userName,
    slack_user_id: slackUserId,
    week: getWeekKey(),
  })
}

export function trackOrderConfirmed(
  item: MenuItem,
  bread: string | null,
  dressings: string[],
  userName: string,
  slackUserId: string | null,
  usedMagicLink: boolean,
): void {
  track("order_confirmed", {
    item_id: item.id,
    item_name: item.name,
    item_price: item.price,
    bread: bread,
    dressings: dressings.length > 0 ? JSON.stringify(dressings) : null,
    user_name: userName,
    slack_user_id: slackUserId,
    week: getWeekKey(),
    used_magic_link: usedMagicLink,
  })
}

export function trackStepChanged(
  fromStep: string,
  toStep: string,
  userName: string,
): void {
  track("step_changed", {
    from_step: fromStep,
    to_step: toStep,
    user_name: userName,
    week: getWeekKey(),
  })
}

export function trackSortChanged(
  sortKey: "default" | "price" | "name",
  previousSort: string,
  userName: string,
): void {
  track("sort_changed", {
    sort_key: sortKey,
    previous_sort: previousSort,
    user_name: userName,
    week: getWeekKey(),
  })
}

export function trackMagicLinkUsed(
  userName: string,
  slackUserId: string,
): void {
  track("magic_link_used", {
    user_name: userName,
    slack_user_id: slackUserId,
    week: getWeekKey(),
  })
}

export function trackOrderError(
  errorMessage: string,
  itemId: string,
  userName: string,
): void {
  track("order_error", {
    error_message: errorMessage,
    item_id: itemId,
    user_name: userName,
    week: getWeekKey(),
  })
}

export function trackBreadSelected(
  itemId: string,
  bread: string,
  userName: string,
): void {
  track("bread_selected", {
    item_id: itemId,
    bread,
    user_name: userName,
    week: getWeekKey(),
  })
}

export function trackDressingToggled(
  itemId: string,
  dressing: string,
  action: "add" | "remove",
  userName: string,
  slackUserId: string | null,
): void {
  track("dressing_toggled", {
    item_id: itemId,
    dressing,
    action,
    user_name: userName,
    slack_user_id: slackUserId,
    week: getWeekKey(),
  })
}
