import { hasStore, redis, hgetallJson, isAdmin, clean, isDate } from "./_store.js";

const STATUSES = ["booked", "tentative"];
const SLOTS = ["Full day", "Day", "Evening"];

export default async function handler(req, res) {
  if (!hasStore()) return res.status(200).json({ configured: false, dates: {} });

  if (req.method === "GET") {
    const all = await hgetallJson("bookings");
    const admin = await isAdmin(req);
    const dates = {};
    for (const [d, b] of Object.entries(all)) {
      // the public only sees status and slot, never the owner's private notes
      dates[d] = admin ? b : { status: b.status, slot: b.slot };
    }
    return res.status(200).json({ configured: true, dates });
  }

  if (req.method === "POST") {
    if (!(await isAdmin(req))) return res.status(401).json({ error: "Wrong password" });
    const { date, status, slot, note, name, phone } = req.body || {};
    if (!isDate(date)) return res.status(400).json({ error: "Date must look like 2026-12-05" });
    if (status === "available") {
      await redis(["HDEL", "bookings", date]);
      return res.status(200).json({ ok: true });
    }
    if (!STATUSES.includes(status)) return res.status(400).json({ error: "Status must be booked, tentative or available" });
    const record = {
      status,
      slot: SLOTS.includes(slot) ? slot : "Full day",
      note: clean(note, 500), name: clean(name, 80), phone: clean(phone, 20),
      updatedAt: new Date().toISOString()
    };
    await redis(["HSET", "bookings", date, JSON.stringify(record)]);
    return res.status(200).json({ ok: true, record });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
