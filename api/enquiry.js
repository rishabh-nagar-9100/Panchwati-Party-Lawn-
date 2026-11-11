import { hasStore, redis, clean, isDate, clientIp, overLimit } from "./_store.js";
import { sendAlerts } from "./_alerts.js";

// Public endpoint: the enquiry form on the homepage posts here.
export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  if (!hasStore()) return res.status(503).json({ error: "Enquiry storage is not set up yet" });

  const b = req.body || {};
  // honeypot: real people never fill the hidden "website" box
  if (b.website) return res.status(200).json({ ok: true, id: "ignored" });

  const phone = clean(b.phone, 20).replace(/\D/g, "");
  if (!clean(b.name, 80) || phone.length < 10 || !isDate(b.date)) {
    return res.status(400).json({ error: "Name, a 10-digit mobile number and a date are required" });
  }
  // light spam guard: max 5 enquiries per phone per day, 20 per IP per day
  const day = new Date().toISOString().slice(0, 10);
  if (await overLimit(`rate:${phone}:${day}`, 5, 86400) || await overLimit(`rate:ip:${clientIp(req)}:${day}`, 20, 86400)) {
    return res.status(429).json({ error: "Too many enquiries today. Please call us instead." });
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const enquiry = {
    id, createdAt: new Date().toISOString(), status: "new",
    name: clean(b.name, 80), phone, date: b.date,
    slot: clean(b.slot, 20), type: clean(b.type, 40), guests: clean(b.guests, 40),
    space: clean(b.space, 40), note: clean(b.note, 800), lang: b.lang === "hi" ? "hi" : "en"
  };
  await redis(["HSET", "enquiries", id, JSON.stringify(enquiry)]);

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const siteUrl = process.env.SITE_URL || `${proto}://${host}`;
  const alerts = await sendAlerts(enquiry, siteUrl);     // awaited so the function does not exit before sending
  return res.status(200).json({ ok: true, id, alerts });
}
