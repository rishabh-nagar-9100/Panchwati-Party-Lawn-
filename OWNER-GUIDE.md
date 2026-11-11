# Panchwati Party Lawn · Owner guide

Your website: **https://panchwati-party-lawn.vercel.app**
Your owner panel: **https://panchwati-party-lawn.vercel.app/admin**

Everything below works from a phone or a computer. Nothing needs to be installed.

---

## 1. Log in

1. Open **/admin** (the link above).
2. Type the admin password and press **Log in**.
3. You stay logged in until you close the browser tab. Press **Log out** when you use a shared phone.

Forgot the password? It is the `ADMIN_PASSWORD` setting in Vercel: open vercel.com → your project → **Settings → Environment Variables**. Change it there, then **Deployments → Redeploy**.

---

## 2. Block a date (booked or on hold)

1. In the owner panel, open **Booking calendar**.
2. Tap the date. Use **‹ Prev** and **Next ›** to move between months.
3. On the right, choose:
   - **Status**: *Booked* (the family has paid the advance), *On hold* (not yet confirmed), or *Available* (free the date again).
   - **Slot**: *Full day*, *Day* or *Evening*. If only the evening is booked, the website shows the day as still free.
4. Write the client's name, phone and a private note if you like. **Customers never see these.** They only see "Booked" or "On hold".
5. Press **Save date**. The website calendar changes immediately.

The **Upcoming** list under the form shows your next bookings. Tap one to open it.

---

## 3. Handle an enquiry

When someone fills the form on the website, two things happen:

- They are sent to WhatsApp with their message ready to send to **+91 81307 17313**.
- The enquiry is saved in the owner panel, and you get a **Telegram alert** (and an email copy if that is set up).

To work through enquiries:

1. In the owner panel, open **Enquiries**. New ones are at the top with a green **new** tag.
2. Each card shows the date, slot, function, guests, space and mobile number.
3. Press **WhatsApp** or **Call** to reply.
4. Change the **Status** as you go: *new → contacted → site visit → booked* or *lost*. The filter buttons at the top count each status.
5. When the family confirms, press **Mark date booked**. This blocks that date on the calendar with their name and phone, and sets the enquiry to *booked*.

---

## 4. Add photos to an event tab

The website has eight event tabs (Weddings, Receptions, Engagements, Haldi & Mehendi, Birthdays, Anniversaries, Corporate dinners, Family parties). Each can show its own photos.

1. In the owner panel, open **Photos**.
2. Tap the event tab you want, for example **Weddings**.
3. Press **Add photos** and pick one or more photos from your phone or computer. Big photos are shrunk automatically, so you can pick them straight from the camera roll.
4. Write a short **caption** under each photo, for example "Sharma wedding, Dec 2026".
5. Use **◀ ▶** to change the order and **Remove** to take one out.
6. Press **Save photos**. The website shows the new photos straight away.

**Reset to default photos** brings back the original venue photos for that tab and deletes the uploaded ones.

Tips: landscape or portrait both work. Photos look best when the main subject is in the middle. Keep 3 to 9 photos per tab.

---

## 5. Change text, prices or the FAQ

These live in one place at the top of the website code (`index.html`, the `CONFIG` block). Ask whoever maintains the site to change them, or edit on GitHub and Vercel redeploys on its own:

| What | Where in `CONFIG` |
|---|---|
| WhatsApp numbers, phone, address | `whatsapp`, `whatsappAlt`, `phoneDisplay`, `phoneTel`, `address` |
| Guest and parking capacity | `capacity` |
| Show "starting from" prices | `prices` → set `show: true` and fill `rent`, `vegPlate`, `nonVegPlate`, `decor` |
| Instagram, Facebook, Google links | `social` (empty = hidden) |
| FAQ questions and answers (English and Hindi) | `faq` |

The Hindi text of the rest of the page is in `data/hi.json`.

---

## 6. Telegram alerts (one-time setup, about 5 minutes)

1. In Telegram, open **@BotFather**, send `/newbot`, give it a name (for example *Panchwati Alerts*) and a username ending in `bot`. BotFather replies with a **token** like `123456789:ABC-...`. Keep it private.
2. Open your new bot in Telegram and press **Start**, then send it any message (for example "hi").
3. In a browser open `https://api.telegram.org/bot<TOKEN>/getUpdates` (put your token in place of `<TOKEN>`). Find `"chat":{"id":123456789` — that number is your **chat ID**.
4. In Vercel → project → **Settings → Environment Variables**, add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, then **Redeploy**.
5. Send a test enquiry from the website. The alert arrives within a few seconds.

Email copy (optional): create a free account at resend.com, make an API key, and add `RESEND_API_KEY` and `ALERT_EMAIL` (the address that should receive the copy) in the same place. Until you verify your own domain in Resend, emails come from `onboarding@resend.dev` and can only be sent to the email address of your Resend account.

---

## 7. If something looks wrong

- **Calendar shows "Live availability could not be loaded"**: the database is not connected. In Vercel → project → **Storage**, make sure the Upstash Redis store is connected, then Redeploy.
- **"Photo storage is not set up yet"** in the Photos tab: in Vercel → project → **Storage**, make sure the Blob store (panchwati-photos) is connected to the project, then Redeploy. No token needs copying: the site signs in to Blob with Vercel's built-in OIDC and the store id.
- **"That password is not right"** after many tries: wait 15 minutes (wrong attempts are limited for safety) and try again.
- Anything else: open vercel.com → project → **Deployments** and press **Redeploy** on the latest one. Nothing is lost; bookings, enquiries and photos stay in the database.
