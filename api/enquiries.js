import { hasStore, redis, hgetallJson, isAdmin, clean } from "./_store.js";

const STATUSES = ["new", "contacted", "site visit", "booked", "lost"];

// Owner-only: list enquiries, change their status, delete them.
export default async function handler(req, res) {
  if (!hasStore()) return res.status(503).json({ error: "Storage is not set up yet. Add Upstash Redis in Vercel." });
  if (!(await isAdmin(req))) return res.status(401).json({ error: "Wrong password" });

  if (req.method === "GET") {
    const all = Object.values(await hgetallJson("enquiries"));
    all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return res.status(200).json({ enquiries: all });
  }
  if (req.method === "PATCH") {
    const { id, status, ownerNote } = req.body || {};
    const raw = await redis(["HGET", "enquiries", clean(id, 40)]);
    if (!raw) return res.status(404).json({ error: "Enquiry not found" });
    const e = JSON.parse(raw);
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return res.status(400).json({ error: "Unknown status" });
      e.status = status;
    }
    if (ownerNote !== undefined) e.ownerNote = clean(ownerNote, 800);
    e.updatedAt = new Date().toISOString();
    await redis(["HSET", "enquiries", e.id, JSON.stringify(e)]);
    return res.status(200).json({ ok: true, enquiry: e });
  }
  if (req.method === "DELETE") {
    const { id } = req.body || {};
    await redis(["HDEL", "enquiries", clean(id, 40)]);
    return res.status(200).json({ ok: true });
  }
  res.setHeader("Allow", "GET, PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
