// Instant alerts for a new enquiry. Each channel is used only when its settings exist:
//   Telegram: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
//   Email:    RESEND_API_KEY + ALERT_EMAIL   (optional RESEND_FROM, default onboarding@resend.dev)
// Failures are logged, never shown to the customer.

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const niceDate = d => new Date(d + "T00:00:00+05:30").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function lines(e) {
  return [
    ["Name", e.name], ["Mobile", e.phone], ["Date", `${niceDate(e.date)} · ${e.slot}`],
    ["Function", e.type], ["Guests", e.guests], ["Space", e.space], ["Note", e.note]
  ].filter(([, v]) => v);
}

async function telegram(e, siteUrl) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return "telegram: not configured";
  const text = `🪷 <b>New enquiry · Panchwati</b>\n\n` +
    lines(e).map(([k, v]) => `<b>${k}:</b> ${esc(v)}`).join("\n") +
    `\n\n<a href="https://wa.me/91${e.phone.slice(-10)}">WhatsApp ${esc(e.name)}</a> · <a href="${siteUrl}/admin">Open admin</a>`;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
    signal: AbortSignal.timeout(6000)
  });
  if (!r.ok) throw new Error("telegram " + r.status + " " + (await r.text()).slice(0, 200));
  return "telegram: sent";
}

async function email(e, siteUrl) {
  const key = process.env.RESEND_API_KEY, to = process.env.ALERT_EMAIL;
  if (!key || !to) return "email: not configured";
  const rows = lines(e).map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6f655b">${k}</td><td style="padding:6px 0"><b>${esc(v)}</b></td></tr>`).join("");
  const html = `<div style="font-family:system-ui,sans-serif;color:#2b2420;max-width:560px"><h2 style="font-weight:500">New enquiry · Panchwati Party Lawn</h2><table>${rows}</table>
    <p style="margin-top:18px"><a href="https://wa.me/91${e.phone.slice(-10)}">WhatsApp ${esc(e.name)}</a> &nbsp;·&nbsp; <a href="${siteUrl}/admin">Open the owner panel</a></p></div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.RESEND_FROM || "Panchwati Party Lawn <onboarding@resend.dev>", to: [to], subject: `New enquiry: ${e.name}, ${niceDate(e.date)}`, html }),
    signal: AbortSignal.timeout(6000)
  });
  if (!r.ok) throw new Error("resend " + r.status + " " + (await r.text()).slice(0, 200));
  return "email: sent";
}

export async function sendAlerts(enquiry, siteUrl) {
  const results = await Promise.allSettled([telegram(enquiry, siteUrl), email(enquiry, siteUrl)]);
  for (const r of results) {
    if (r.status === "rejected") console.error("alert failed:", r.reason?.message || r.reason);
  }
  return results.map(r => r.status === "fulfilled" ? r.value : "failed");
}
