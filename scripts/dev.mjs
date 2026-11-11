// Local runner: serves the static site and the real api/*.js functions, with an
// in-memory stand-in for Upstash Redis and Vercel Blob. For local testing only.
//   node scripts/dev.mjs            → http://localhost:3000  (admin password: "test")
import http from "node:http";
import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number(process.env.PORT || 3000);
const KV_PORT = PORT + 1;
const UPLOAD_DIR = path.join(ROOT, ".dev-uploads");

process.env.ADMIN_PASSWORD ||= "test";
process.env.KV_REST_API_URL = `http://127.0.0.1:${KV_PORT}`;
process.env.KV_REST_API_TOKEN = "local";
process.env.DEV_BLOB_DIR = UPLOAD_DIR;
process.env.DEV_BLOB_BASE = `http://localhost:${PORT}/.dev-uploads`;

// ---- tiny Redis over REST (only the commands the API uses) ----
const hashes = new Map(), strings = new Map();
function run(cmd) {
  const [c, k, ...a] = cmd;
  const h = () => hashes.get(k) || hashes.set(k, new Map()).get(k);
  switch (String(c).toUpperCase()) {
    case "HGETALL": return [...h().entries()].flat();
    case "HGET": return h().get(a[0]) ?? null;
    case "HSET": { let n = 0; for (let i = 0; i < a.length; i += 2) { if (!h().has(a[i])) n++; h().set(a[i], a[i + 1]); } return n; }
    case "HDEL": { let n = 0; for (const f of a) n += h().delete(f) ? 1 : 0; return n; }
    case "INCR": { const v = Number(strings.get(k) || 0) + 1; strings.set(k, String(v)); return v; }
    case "GET": return strings.get(k) ?? null;
    case "SET": strings.set(k, a[0]); return "OK";
    case "DEL": return strings.delete(k) ? 1 : 0;
    case "EXPIRE": return 1;
    default: throw new Error("unsupported command " + c);
  }
}
http.createServer(async (req, res) => {
  let body = ""; for await (const ch of req) body += ch;
  try { res.end(JSON.stringify({ result: run(JSON.parse(body)) })); }
  catch (e) { res.end(JSON.stringify({ error: e.message })); }
}).listen(KV_PORT);

// ---- Vercel-style req/res shims ----
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".txt": "text/plain", ".xml": "application/xml", ".ico": "image/x-icon" };
function shimRes(res) {
  res.status = c => { res.statusCode = c; return res; };
  res.json = o => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); return res; };
  res.send = s => { res.end(s); return res; };
  return res;
}
async function serveApi(req, res, name) {
  const file = path.join(ROOT, "api", name + ".js");
  try { await stat(file); } catch { return res.status(404).json({ error: "No such API" }); }
  const mod = await import(pathToFileURL(file).href + "?t=" + Date.now());
  const url = new URL(req.url, "http://x");
  req.query = Object.fromEntries(url.searchParams);
  req.cookies = {};
  if (mod.config?.api?.bodyParser === false) {
    // leave the stream alone
  } else {
    const chunks = []; for await (const ch of req) chunks.push(ch);
    const raw = Buffer.concat(chunks).toString();
    const ct = req.headers["content-type"] || "";
    req.body = raw ? (ct.includes("json") ? JSON.parse(raw) : raw) : undefined;
  }
  try { await mod.default(req, res); }
  catch (e) { console.error(e); if (!res.headersSent) res.status(500).json({ error: e.message }); }
}
async function serveStatic(req, res, p) {
  if (p === "/") p = "/index.html";
  let file = path.join(ROOT, decodeURIComponent(p));
  if (!file.startsWith(ROOT)) return res.status(403).end();
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = path.join(file, "index.html");
  } catch {
    if (!path.extname(file)) file += ".html";               // cleanUrls: /admin → admin.html
  }
  try { await stat(file); } catch { res.statusCode = 404; return res.end("Not found"); }
  res.setHeader("Content-Type", MIME[path.extname(file)] || "application/octet-stream");
  createReadStream(file).pipe(res);
}
await mkdir(UPLOAD_DIR, { recursive: true });
http.createServer(async (req, res) => {
  shimRes(res);
  const p = new URL(req.url, "http://x").pathname;
  if (p.startsWith("/api/")) return serveApi(req, res, p.slice(5).replace(/\.js$/, ""));
  return serveStatic(req, res, p);
}).listen(PORT, () => console.log(`Panchwati local: http://localhost:${PORT}  (admin password: ${process.env.ADMIN_PASSWORD})`));
