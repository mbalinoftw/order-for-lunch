export const ADMIN_COOKIE = "admin_session"

export async function computeAdminToken(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD!
  const secret = process.env.ADMIN_SECRET!
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(password))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function isValidAdminCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false
  const expected = await computeAdminToken()
  return value === expected
}
