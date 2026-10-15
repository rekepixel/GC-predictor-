import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { getDB, migrate } from "./db";
import { remoteOnly } from "./cloud";
const ephemeral = randomBytes(32).toString("hex");
export const COOKIE = "gc-session";
function secret() {
  return process.env.SESSION_SECRET || ephemeral;
}
export function secureEqual(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function configured() {
  return (
    (!remoteOnly() && process.env.NODE_ENV !== "production") ||
    !!(
      process.env.PRIVATE_APP_PASSWORD &&
      process.env.SESSION_SECRET &&
      process.env.SESSION_SECRET.length >= 32 &&
      (!remoteOnly() || process.env.PRIVATE_APP_PASSWORD.length >= 16)
    )
  );
}
export function sessionToken() {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + 7 * 86400000,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", secret()).update(payload).digest("base64url")
  );
}
export function verifySession(value: string | undefined) {
  if (!value || !configured()) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  const expected = createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  if (!secureEqual(signature, expected)) return false;
  try {
    return (
      JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now()
    );
  } catch {
    return false;
  }
}
export function localOpen(host: string) {
  return (
    process.env.NODE_ENV !== "production" &&
    !process.env.PRIVATE_APP_PASSWORD &&
    /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)
  );
}
export function authorized(req: NextRequest) {
  if (!configured()) return false;
  if (verifySession(req.cookies.get(COOKIE)?.value)) return true;
  if (localOpen(req.headers.get("host") || "")) return true;
  const token = process.env.IMPORT_API_TOKEN;
  return (
    !!token &&
    secureEqual(req.headers.get("authorization") || "", `Bearer ${token}`)
  );
}
export function safeOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
/** Atomic, shared across serverless instances. Includes a global cap against forged IPs. */
export async function reserveLoginAttempt(ip: string, now = Date.now()) {
  if (!remoteOnly()) await migrate();
  const db = getDB();
  return db.transaction(async (tx) => {
    await tx.run("DELETE FROM login_limits WHERE window_start<?", [
      now - 15 * 60000,
    ]);
    for (const [identity, limit] of [
      ["global", 100],
      [ip.slice(0, 200), 10],
    ] as const) {
      const id = createHmac("sha256", secret()).update(identity).digest("hex");
      const rows = await tx.query<{ attempts: number }>(
        "INSERT INTO login_limits(id,attempts,window_start) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=login_limits.attempts+1 RETURNING attempts",
        [id, now],
      );
      if (rows[0].attempts > limit) return false;
    }
    return true;
  });
}
