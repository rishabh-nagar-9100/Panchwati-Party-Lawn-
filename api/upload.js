import { isAdmin, clean, hasBlob } from "./_store.js";

// Owner-only photo upload to Vercel Blob. The admin page shrinks the photo to WebP
// in the browser first, then POSTs the bytes here:  POST /api/upload?name=weddings-1.webp
// Auth: BLOB_READ_WRITE_TOKEN if present, otherwise Vercel OIDC + BLOB_STORE_ID
// (what the dashboard adds when a Blob store is connected with OIDC). @vercel/blob picks it.

export const config = { api: { bodyParser: false } };
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  if (!(await isAdmin(req))) return res.status(401).json({ error: "Wrong password" });
  const type = String(req.headers["content-type"] || "").split(";")[0].trim();
  const ext = TYPES[type];
  if (!ext) return res.status(400).json({ error: "Only WebP, JPG or PNG photos" });

  const chunks = []; let size = 0;
  for await (const ch of req) { size += ch.length; if (size > MAX_BYTES) return res.status(413).json({ error: "Photo is bigger than 4 MB" }); chunks.push(ch); }
  const body = Buffer.concat(chunks);
  if (!body.length) return res.status(400).json({ error: "Empty upload" });

  const url = new URL(req.url, "http://x");
  const base = clean(url.searchParams.get("name"), 60).toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "photo";
  const name = `events/${base}-${Date.now().toString(36)}.${ext}`;

  if (process.env.DEV_BLOB_DIR) {      // local runner: keep the file on disk
    const { writeFile } = await import("node:fs/promises");
    const file = name.replace("/", "-");
    await writeFile(`${process.env.DEV_BLOB_DIR}/${file}`, body);
    return res.status(200).json({ ok: true, url: `${process.env.DEV_BLOB_BASE}/${file}` });
  }
  if (!hasBlob()) return res.status(503).json({ error: "Photo storage is not set up yet. Connect a Vercel Blob store to this project." });
  try {
    const { put } = await import("@vercel/blob");
    const blob = await put(name, body, { access: "public", contentType: type, addRandomSuffix: true, cacheControlMaxAge: 31536000 });
    return res.status(200).json({ ok: true, url: blob.url });
  } catch (e) {
    console.error("blob upload failed:", e.message);
    return res.status(502).json({ error: "Upload failed: " + e.message });
  }
}
