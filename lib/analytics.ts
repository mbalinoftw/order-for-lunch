import { track } from "@vercel/analytics"
import type { MenuItem } from "./types"

function getDayKey(): string {
  return new Date().toISOString().slice(0, 10)
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
    day: getDayKey(),
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
    day: getDayKey(),
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
    day: getDayKey(),
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
    day: getDayKey(),
  })
}

export function trackMagicLinkUsed(
  userName: string,
  slackUserId: string,
): void {
  track("magic_link_used", {
    user_name: userName,
    slack_user_id: slackUserId,
    day: getDayKey(),
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
    day: getDayKey(),
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
    day: getDayKey(),
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
    day: getDayKey(),
  })
}
