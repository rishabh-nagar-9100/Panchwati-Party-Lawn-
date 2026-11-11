// Tiny helper around Upstash Redis (added from the Vercel Marketplace).
// Vercel injects KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / _TOKEN).
import { createHash, timingSafeEqual } from "node:crypto";

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const hasStore = () => Boolean(URL_ && TOKEN);

export async function redis(command) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

// HGETALL returns [field, value, field, value, ...]
export async function hgetallJson(key) {
  const flat = (await redis(["HGETALL", key])) || [];
  const out = {};
  for (let i = 0; i < flat.length; i += 2) {
    try { out[flat[i]] = JSON.parse(flat[i + 1]); } catch { /* skip bad rows */ }
  }
  return out;
}

export const clean = (v, max = 300) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
export const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || "");

export function clientIp(req) {
  const f = req.headers["x-forwarded-for"];
  return (Array.isArray(f) ? f[0] : (f || "")).split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
}

// Counts hits for `key` inside a window; true when over the limit.
export async function overLimit(key, max, ttlSeconds) {
  const n = await redis(["INCR", key]);
  if (n === 1) await redis(["EXPIRE", key, ttlSeconds]);
  return n > max;
}

const sha = s => createHash("sha256").update(String(s)).digest();

// Owner check: the x-admin-key header must equal ADMIN_PASSWORD.
// Constant-time compare, and at most 20 wrong attempts per IP per 15 minutes.
export async function isAdmin(req) {
  const key = req.headers["x-admin-key"];
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || !key) return false;
  const ip = clientIp(req);
  const locked = await overLimit(`fail:${ip}`, 20, 900).catch(() => false);
  if (locked) return false;
  const ok = timingSafeEqual(sha(key), sha(pw));
  if (ok) await redis(["DEL", `fail:${ip}`]).catch(() => {});   // a good login clears the counter (the INCR above still counted it)
  return ok;
}
