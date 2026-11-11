import { hasStore, redis, hgetallJson, isAdmin, clean } from "./_store.js";
import defaults from "../data/events.json" with { type: "json" };

// Event tabs: the text comes from data/events.json; the photos of each tab can be
// replaced from /admin and are then kept in Redis (hash "eventphotos", field = tab id).
//   GET            public: tabs with their current photos
//   POST  (owner)  { id, photos: [{ src, caption }] }   replace a tab's photo list
//   DELETE(owner)  { id }                                go back to the default photos

const MAX_PHOTOS = 24;
const okSrc = s => /^img\/[\w./-]+\.(webp|jpe?g|png)$/i.test(s) || /^https:\/\/[\w.-]+\.public\.blob\.vercel-storage\.com\/[^\s"<>]+$/i.test(s) || /^http:\/\/localhost:\d+\/\.dev-uploads\/[\w.-]+$/.test(s);

export async function currentCategories() {
  const over = hasStore() ? await hgetallJson("eventphotos").catch(() => ({})) : {};
  return defaults.categories.map(c => ({ ...c, photos: Array.isArray(over[c.id]) && over[c.id].length ? over[c.id] : c.photos }));
}

async function removeBlobs(urls) {
  const gone = urls.filter(u => /vercel-storage\.com/.test(u));
  if (!gone.length || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try { const { del } = await import("@vercel/blob"); await del(gone); } catch (e) { console.error("blob delete failed:", e.message); }
}

export default async function handler(req, res) {
  if (req.method === "GET") return res.status(200).json({ categories: await currentCategories() });

  if (!hasStore()) return res.status(503).json({ error: "Storage is not set up yet. Add Upstash Redis in Vercel." });
  if (!(await isAdmin(req))) return res.status(401).json({ error: "Wrong password" });
  const { id } = req.body || {};
  const cat = defaults.categories.find(c => c.id === id);
  if (!cat) return res.status(400).json({ error: "Unknown event tab" });

  if (req.method === "POST") {
    const list = (Array.isArray(req.body.photos) ? req.body.photos : []).slice(0, MAX_PHOTOS)
      .map(p => ({ src: clean(p?.src, 400), caption: clean(p?.caption, 80) || cat.name }))
      .filter(p => okSrc(p.src));
    if (!list.length) return res.status(400).json({ error: "Keep at least one photo, or use Reset to go back to the defaults" });
    const before = (await currentCategories()).find(c => c.id === id).photos.map(p => p.src);
    await redis(["HSET", "eventphotos", id, JSON.stringify(list)]);
    await removeBlobs(before.filter(s => !list.some(p => p.src === s)));
    return res.status(200).json({ ok: true, photos: list });
  }
  if (req.method === "DELETE") {
    const before = (await currentCategories()).find(c => c.id === id).photos.map(p => p.src);
    await redis(["HDEL", "eventphotos", id]);
    await removeBlobs(before.filter(s => !cat.photos.some(p => p.src === s)));
    return res.status(200).json({ ok: true, photos: cat.photos });
  }
  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
