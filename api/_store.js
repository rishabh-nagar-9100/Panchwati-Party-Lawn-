// Tiny helper around Upstash Redis (added from the Vercel Marketplace).
// Vercel injects KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / _TOKEN).
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

export function isAdmin(req) {
  const key = req.headers["x-admin-key"];
  return Boolean(process.env.ADMIN_PASSWORD) && key === process.env.ADMIN_PASSWORD;
}

export const clean = (v, max = 300) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
export const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || "");
