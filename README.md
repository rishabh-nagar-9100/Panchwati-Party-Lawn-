# Panchwati Party Lawn website

Static website + three small Vercel functions. No build step.

| Path | What it is |
|---|---|
| `index.html` | The public website (logo intro, walk-in, spaces, feasts, booking calendar, enquiry form, location, events tabs) |
| `admin.html` | Owner panel at `/admin`: mark dates booked / on hold, see and manage enquiries |
| `api/bookings.js` | `GET` booked dates (public sees status only) · `POST` change a date (owner) |
| `api/enquiry.js` | `POST` save an enquiry from the website |
| `api/enquiries.js` | `GET / PATCH / DELETE` enquiries (owner) |
| `data/events.json` | The event tabs (Weddings, Receptions, …) and their photos |
| `api/events.js` | `GET` event tabs with their current photos · `POST / DELETE` change a tab's photos (owner) |
| `api/upload.js` | `POST` a photo to Vercel Blob (owner) |
| `api/_alerts.js` | Telegram / Resend alert for each new enquiry |
| `data/hi.json` | Hindi text for the language switch |
| `img/` | Venue photos (`-640` and `-1024` are smaller copies for phones), Open Graph image |
| `scripts/dev.mjs` | Local runner for testing without a Vercel login (`npm run dev`, admin password `test`) |
| `OWNER-GUIDE.md` | How the owner uses the site day to day |

## Deploy on Vercel (about 10 minutes, no coding)

1. Create a free account at vercel.com (sign in with GitHub or Google).
2. Put this folder on GitHub: github.com → New repository `panchwati-party-lawn` → "uploading an existing file" → drag in everything inside this folder → Commit.
3. In Vercel: **Add New → Project → Import** the `panchwati-party-lawn` repo. Framework preset: **Other**. Click **Deploy**.
4. Add the database: Vercel project → **Storage** (or Marketplace) → **Upstash → Redis** → Create → connect it to this project. Vercel adds the `KV_REST_API_URL` and `KV_REST_API_TOKEN` settings for you.
5. Add photo storage: **Storage → Blob → Create** and connect it. Vercel adds `BLOB_STORE_ID`; the code signs in with Vercel OIDC (a `BLOB_READ_WRITE_TOKEN` also works if present).
6. Set your owner password: project → **Settings → Environment Variables** → add `ADMIN_PASSWORD` = a strong password.
7. Optional alerts: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` for Telegram, `RESEND_API_KEY` + `ALERT_EMAIL` for an email copy (see OWNER-GUIDE.md).
8. **Deployments → Redeploy** so the new settings take effect.

Your site is now live at `https://panchwati-party-lawn.vercel.app`, and the owner panel at `/admin`.
To use your own domain (e.g. panchwatipartylawn.com): project → Settings → Domains → Add.

Using the command line instead: `npm i -g vercel`, then in this folder run `vercel` and later `vercel --prod`.

## Daily use

- Open `/admin`, log in, tap a date, choose **Booked** or **On hold**, pick the slot, save. The public calendar updates immediately.
- New enquiries from the website appear under **Enquiries**. Use WhatsApp / Call, change the status, or press **Mark date booked**.

## Things you can change

In `index.html`, at the top of the `<script>` section, edit `CONFIG`: contact numbers, address, capacity, `prices` (set `show: true` to display "starting from" prices), `social` links and the `faq` list. Hindi copy for the rest of the page is in `data/hi.json`.

## Venue photos (hero and cards)

Put full-resolution originals in `originals/` (`gate.jpg`, `welcome.jpg`, `corridor.jpg`, `stage.jpg`, `lawn.jpg`, `banquet.jpg`, `booth.jpg`), then run:

```bash
npm i --no-save sharp && node scripts/build-images.mjs
```

It writes WebP and AVIF at 640, 1024, 1280, 1920, 2560 and 3200 px (never larger than the original) into `img/`. The hero walk-in shows each photo at up to 135% of the screen, so a 3200 px original keeps it sharp on a 2x laptop. Without `originals/` the script uses the current `img/*.webp` files (960 to 1500 px), which is the limit of what the hero can show today.

## Event photos

Upload them from `/admin → Photos`; they go to Vercel Blob and the list is kept in Redis. `data/events.json` only holds the defaults.

## Secrets

The admin password and all tokens live only in Vercel environment variables. Never put them in the code or in git.
