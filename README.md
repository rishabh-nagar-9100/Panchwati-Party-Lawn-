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
| `img/` | Venue photos |

## Deploy on Vercel (about 10 minutes, no coding)

1. Create a free account at vercel.com (sign in with GitHub or Google).
2. Put this folder on GitHub: github.com → New repository `panchwati-party-lawn` → "uploading an existing file" → drag in everything inside this folder → Commit.
3. In Vercel: **Add New → Project → Import** the `panchwati-party-lawn` repo. Framework preset: **Other**. Click **Deploy**.
4. Add the database: Vercel project → **Storage** (or Marketplace) → **Upstash → Redis** → Create → connect it to this project. Vercel adds the `KV_REST_API_URL` and `KV_REST_API_TOKEN` settings for you.
5. Set your owner password: project → **Settings → Environment Variables** → add `ADMIN_PASSWORD` = a strong password.
6. **Deployments → Redeploy** so the new settings take effect.

Your site is now live at `https://panchwati-party-lawn.vercel.app`, and the owner panel at `/admin`.
To use your own domain (e.g. panchwatipartylawn.com): project → Settings → Domains → Add.

Using the command line instead: `npm i -g vercel`, then in this folder run `vercel` and later `vercel --prod`.

## Daily use

- Open `/admin`, log in, tap a date, choose **Booked** or **On hold**, pick the slot, save. The public calendar updates immediately.
- New enquiries from the website appear under **Enquiries**. Use WhatsApp / Call, change the status, or press **Mark date booked**.

## Things to fill in

In `index.html`, at the top of the `<script>` section, edit `CONFIG`:
- `whatsapp`: your number with country code, no + (e.g. `919876543210`)
- `phoneDisplay`: how the number should look (e.g. `+91 98765 43210`)
- `address`: full street address

## Adding event photos

Put photos in `img/events/` and list them in `data/events.json` under the right category:
`{ "src": "img/events/sharma-wedding-1.webp", "caption": "Sharma wedding, Dec 2026" }`
