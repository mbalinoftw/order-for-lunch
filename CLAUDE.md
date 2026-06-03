@AGENTS.md

# lunch-orders — Pedido Sangucheto

## Project Overview

Weekly lunch coordination app for a small office team (~10-20 people). Replaces fragmented workflow across Slack, Google Sheets, and WhatsApp. Coordinator manages the flow from a protected admin panel; team members order via web app or Slack magic links.

Core business flow: coordinator announces → team members receive DMs with personalized links → each person orders via web form → coordinator exports summary for WhatsApp → restaurant receives order.

---

## Tech Stack

- **Next.js 16.2.6** — App Router, React Server Components, file-based routing
- **React 19.2.4** — client components use `"use client"` directive
- **TypeScript 5** — strict mode, path alias `@/*` → root
- **Tailwind CSS 4** — via `@tailwindcss/postcss`
- **Upstash Redis 1.38.0** — REST API client, sole database
- **@slack/bolt 4.7.3** — HTTP mode (`socketMode: false`) for serverless compatibility
- **@vercel/analytics 2.0.1** — custom event tracking

---

## Architecture

```
Admin Panel (/admin)
  └── POST /api/slack/announce     → Slack channel message
  └── POST /api/slack/send-links   → DMs with magic tokens
  └── POST /api/slack/remind       → DMs to pending users
  └── DELETE /api/orders           → reset week orders

User App (/page.tsx — 4-step state machine)
  └── GET  /api/auth/token         → validate magic token (peek, no consume)
  └── POST /api/orders             → save order (consumes token)

Slack Webhook (/api/slack/interactions)
  └── remind_later  → schedule 15min DM
  └── opt_out_order → skipUser() in Redis

Redis (Upstash)
  orders:{YYYY-WW}      HASH   field = slackUserId or name.toLowerCase()
  token:{uuid}          STRING TTL=86400s  MagicTokenPayload
  team:members          STRING JSON array  TeamMember[]
  skipped:{YYYY-WW}     SET    slackUserIds who opted out
  login_attempts:{ip}   STRING counter     TTL=900s rate limit
```

---

## Key Files

| File | Responsibility |
|---|---|
| `app/page.tsx` | 4-step order flow, client state machine, all analytics calls |
| `app/admin/page.tsx` | Coordinator dashboard, order grouping, action buttons |
| `app/summary/page.tsx` | WhatsApp-ready text export with copy-to-clipboard |
| `app/components/MenuCard.tsx` | Menu item card (photo, price, bread/dressing/veggie badges) |
| `app/api/orders/route.ts` | GET (fetch week orders) / POST (save order) / DELETE (admin reset) |
| `app/api/auth/token/route.ts` | GET — validate token, return `{ name, slack_user_id }`, no consume |
| `app/api/slack/interactions/route.ts` | Slack button webhook, signature verification |
| `app/api/slack/send-links/route.ts` | Generate tokens + send DMs to team |
| `app/api/admin/login/route.ts` | HMAC-SHA256 auth + rate limiting |
| `app/api/dashboard/route.ts` | Historical analytics aggregation over all weeks |
| `middleware.ts` | Protects `/admin/*` and `/dashboard` with admin cookie |
| `lib/db.ts` | All Redis operations — NEVER import client-side (instantiates Redis at module level) |
| `lib/auth.ts` | `computeAdminToken()`, `isValidAdminCookie()`, `ADMIN_COOKIE` constant |
| `lib/slack.ts` | Slack Bot: announce, sendMagicLink, sendReminder, sendOrderConfirmation, sendLinks |
| `lib/analytics.ts` | Vercel Analytics typed wrappers — safe to import client-side |
| `lib/types.ts` | `MenuItem`, `Order`, `MagicTokenPayload`, `TeamMember`, `OrdersMap` |
| `lib/menu.ts` | `MENU_ITEMS` array (11 sandwiches), `getMenuItem(id)` |
| `lib/order.ts` | `getOrderPhrase()` (20 confirmation phrases), `getOptOutPhrase()` (15 opt-out phrases) |

---

## Redis Schema

```
orders:{YYYY-WW}
  Type: HASH
  Field: slack_user_id (preferred) or name.toLowerCase() (manual entry)
  Value: JSON Order { name, slack_user_id?, item_id, selected_bread?, selected_dressing?, created_at }
  TTL: none — persists permanently, reset manually via DELETE /api/orders

token:{uuid}
  Type: STRING (JSON)
  Value: { slack_user_id: string, name: string }
  TTL: 86400s (24h)
  Consumed via: GETDEL (atomic) — getAndConsumeToken() in lib/db.ts
  Peek via: GET — validateToken() does NOT consume

team:members
  Type: STRING (JSON array)
  Value: [{ name: string, slack_user_id: string }]
  TTL: none

skipped:{YYYY-WW}
  Type: SET
  Members: slack_user_id strings
  TTL: none — used to exclude opted-out users from reminders

login_attempts:{ip}
  Type: STRING (integer)
  TTL: 900s — auto-expires, no manual cleanup needed
  Limit: 10 attempts per window
```

**Week key algorithm (ISO 8601, Thursday-based):**
- Shift date to Thursday of current week: `d += (4 - (d.getDay() || 7))`
- Week = `ceil((daysSinceYearStart + 1) / 7)`
- Format: `YYYY-WW` (e.g. `2026-23`)
- Defined in `lib/db.ts:weekKey()` AND duplicated in `lib/analytics.ts:getWeekKey()` — the latter exists because `lib/db.ts` cannot be imported client-side (Redis instantiation at module level breaks the browser bundle)

---

## Authentication

### Magic Tokens (users)

1. Admin calls `sendLinks()` → generates `crypto.randomUUID()` per user
2. Token stored: `token:{uuid}` → `{ slack_user_id, name }` TTL 24h
3. User receives DM with `{APP_URL}?token={uuid}`
4. Client: `GET /api/auth/token?token={uuid}` → `validateToken()` (peek only, returns payload)
5. Order submission: `POST /api/orders` with `token` → `getAndConsumeToken()` (GETDEL, atomic)
6. `slackUserId` extracted from token and used as Redis HASH field key

### Admin Session (HMAC-SHA256)

- Token = `HMAC-SHA256(ADMIN_PASSWORD, key=ADMIN_SECRET)` → 64-char hex
- Computed fresh each request for comparison — no DB storage
- `timingSafeEqual` with 1024-byte padding prevents timing attacks
- Cookie: `admin_session`, httpOnly, secure (prod only), sameSite=strict, 7d TTL
- Rate limit: 10 attempts / 15min per IP via Redis counter

---

## Slack Integration

**Mode:** HTTP (not socket mode) — required for Vercel serverless.

**Signature verification** (all incoming Slack webhooks):
- Header `x-slack-request-timestamp` must be within 300s of now
- `x-slack-signature` = `HMAC-SHA256("v0:{timestamp}:{body}", SLACK_SIGNING_SECRET)` prefixed with `v0=`

**Messages sent:**

| Function | Target | Content |
|---|---|---|
| `postOrderAnnouncement()` | Channel (`SLACK_CHANNEL_ID`) | Block Kit + "Ver menú" button → `APP_URL` |
| `sendMagicLink()` | User DM | Block Kit + 3 buttons: "Cargar pedido" (URL), "Recordame 15min" (action), "No voy a pedir" (action) |
| `sendReminder()` | User DM | Markdown with magic link |
| `sendOrderConfirmation()` | User DM | Block Kit: item, price, bread, dressing, optional bank transfer info |

**Slack interactions handled:**

| `action_id` | Effect |
|---|---|
| `remind_later` | Schedules DM 15min later (`chat.scheduleMessage`), updates original message |
| `opt_out_order` | `skipUser(slackUserId)`, updates original message with `getOptOutPhrase()` |

**`sendLinks()` is fire-and-forget for each DM** — `Promise.allSettled` used internally, order submission doesn't await confirmation delivery.

---

## API Routes

| Method | Path | Auth | Effect |
|---|---|---|---|
| GET | `/api/orders` | none | Returns `OrdersMap` for `?week=YYYY-WW` (default: current) |
| POST | `/api/orders` | none (token optional) | Validates + saves order, sends Slack DM (fire-and-forget) |
| DELETE | `/api/orders` | admin cookie | `resetWeekOrders()` |
| GET | `/api/auth/token` | none | Validates token, returns `{ name, slack_user_id }` (no consume) |
| POST | `/api/admin/login` | none | HMAC validate + set cookie, rate limited |
| POST | `/api/admin/logout` | none | Clears cookie |
| GET | `/api/team` | admin cookie | Returns `TeamMember[]` |
| POST | `/api/slack/announce` | admin cookie | Posts to Slack channel |
| POST | `/api/slack/send-links` | admin cookie | Generates tokens + sends DMs |
| POST | `/api/slack/remind` | admin cookie | DMs pending users |
| POST | `/api/slack/interactions` | Slack signature | Handles button actions |
| GET | `/api/dashboard` | admin cookie | Historical analytics aggregation |
| GET | `/api/cron` | — | Returns 410 (deprecated) |

---

## UI Flow (app/page.tsx)

State machine: `"name"` → `"menu"` → `"confirm"` → `"done"`

```
name:    input (min 2 chars) or auto-filled from magic token
          goToStep("menu") tracks step_changed + sets step

menu:    grid of MENU_ITEMS, sort by default/price/name
          handleSortChange() → trackSortChanged
          handleSelectItem() → trackItemClicked → goToStep("confirm")

confirm: bread selection (required if item.bread exists)
          handleBreadSelect() → trackBreadSelected
          toggleDressing() → trackDressingToggled (max 2, detects add/remove pre-setState)
          submitOrder() → POST /api/orders → trackOrderConfirmed → goToStep("done")
          on error → trackOrderError

done:    random phrase from getOrderPhrase()
```

**goToStep(next)** wraps every `setStep()` call and fires `trackStepChanged(currentStep, next, name)`. Exception: token validation effect calls `trackStepChanged("name", "menu", data.name)` directly because React state `name` hasn't updated yet at call time.

---

## Analytics Events

All events include `week: getWeekKey()`. Defined in `lib/analytics.ts`.

| Event | Key properties |
|---|---|
| `item_clicked` | item_id, item_name, item_price, is_veggie, user_name, slack_user_id |
| `order_confirmed` | item_id, item_name, item_price, bread, dressings (JSON string), user_name, slack_user_id, used_magic_link |
| `step_changed` | from_step, to_step, user_name |
| `sort_changed` | sort_key, previous_sort, user_name |
| `magic_link_used` | user_name, slack_user_id |
| `order_error` | error_message, item_id, user_name |
| `bread_selected` | item_id, bread, user_name |
| `dressing_toggled` | item_id, dressing, action ("add"\|"remove"), user_name, slack_user_id |

`dressings` in `order_confirmed` is `JSON.stringify(string[])` because Vercel Analytics doesn't accept array values.

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `SLACK_BOT_TOKEN` | yes | OAuth bot token (`xoxb-...`) for API calls |
| `SLACK_SIGNING_SECRET` | yes | Webhook signature verification |
| `SLACK_CHANNEL_ID` | yes | Channel ID (`C...`) for announcements |
| `ADMIN_PASSWORD` | yes | Coordinator login password |
| `ADMIN_SECRET` | yes | HMAC key — must differ from `ADMIN_PASSWORD` |
| `UPSTASH_REDIS_REST_URL` | yes | Upstash Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | yes | Upstash auth token |
| `NEXT_PUBLIC_APP_URL` | yes | Full URL for magic links (e.g. `https://lunch.vercel.app`) |
| `BANK_INFO` | no | Bank transfer info appended to order confirmation DMs |

---

## Conventions

**TypeScript:**
- All types in `lib/types.ts` — no inline type declarations in components
- `import type { ... }` for type-only imports
- Optional fields use `?`, not `| undefined`
- API handlers: `export async function GET/POST/DELETE(...)`
- No `any` — strict mode enforced

**React:**
- `"use client"` only when component uses hooks or browser APIs
- `useRef` for one-time effect guards (e.g. `tokenChecked` prevents double-fetch on StrictMode)
- Handler functions extracted from JSX (no inline business logic in onClick)
- State setter called after tracking — track is always first line of handlers

**Imports:**
- Path alias `@/` for all `lib/` and `app/` imports
- Relative imports only within same directory

**Redis keys:** `namespace:identifier` format with colons. Week keys always `YYYY-WW` (zero-padded).

**lib/db.ts constraint:** Cannot be imported in client components — Redis client instantiates at module level. Any shared logic needed client-side must be extracted to a separate module (see `getWeekKey` duplication in `lib/analytics.ts`).

---

## Commands

```bash
npm run dev      # dev server on :3000
npm run build    # production build
npm run lint     # ESLint
```

No tests exist. No cron jobs configured — all actions are manually triggered from `/admin`.
