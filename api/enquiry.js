import { hasStore, redis, clean, isDate } from "./_store.js";

// Public endpoint: the enquiry form on the homepage posts here.
export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  if (!hasStore()) return res.status(503).json({ error: "Enquiry storage is not set up yet" });

  const b = req.body || {};
  const phone = clean(b.phone, 20).replace(/\D/g, "");
  if (!clean(b.name, 80) || phone.length < 10 || !isDate(b.date)) {
    return res.status(400).json({ error: "Name, a 10-digit mobile number and a date are required" });
  }
  // light spam guard: max 5 enquiries per phone per day
  const day = new Date().toISOString().slice(0, 10);
  const count = await redis(["INCR", `rate:${phone}:${day}`]);
  if (count === 1) await redis(["EXPIRE", `rate:${phone}:${day}`, 86400]);
  if (count > 5) return res.status(429).json({ error: "Too many enquiries today. Please call us instead." });

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const enquiry = {
    id, createdAt: new Date().toISOString(), status: "new",
    name: clean(b.name, 80), phone, date: b.date,
    slot: clean(b.slot, 20), type: clean(b.type, 40), guests: clean(b.guests, 40),
    space: clean(b.space, 40), note: clean(b.note, 800)
  };
  await redis(["HSET", "enquiries", id, JSON.stringify(enquiry)]);
  return res.status(200).json({ ok: true, id });
}
