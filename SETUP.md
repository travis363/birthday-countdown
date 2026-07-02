# 🎀 Birthday Countdown — Setup (about 20 minutes)

A pink countdown site your daughter opens on her Android phone. She taps **"Remind
me on my birthday!"** once. Then on **July 7, 2026 (all Mountain time)** she gets push
notifications to her phone through the whole day:

- **9:00 AM** — the big birthday alert:
  > **HAPPY 12th BDAY BABY GIRL!!!!** — HOPE YOU HAVE AN AMAZING DAY 💖 LOVE DAD & KRISTEN
- **10:00 AM, 11:00 AM … 10:00 PM** — a new quote every hour on the hour (13 quotes).
- If she doesn't open an alert, she gets **one gentle reminder 5 minutes later**
  (max 2 alerts per note — it stops once she's opened it).
- Each note she's received shows on the page in a **"Notes from Dad" gallery** she can
  scroll back through. Future notes stay locked 🔒 until their hour. **After her birthday,
  all the notes stay unlocked forever** so she can reread them any time.

Everything is free (GitHub Pages + GitHub Actions + Supabase). Your VAPID keys are
already generated and filled in — you only need to paste **two Supabase keys** and
**your quotes**.

---

## The pieces
- **public/** — the pink site (countdown + celebration + current quote). On GitHub Pages.
- **public/schedule.json** — the birthday message + your 13 hourly quotes (you edit this).
- **Supabase** — stores which phone(s) to notify.
- **GitHub Action `Birthday push`** — runs hourly on July 7 and sends that hour's message.
- **GitHub Action `Deploy site`** — publishes `public/` to GitHub Pages on every push.

## ⭐ Add your quotes
Open **`public/schedule.json`** and replace each `PLACEHOLDER …` with a real quote,
one per hour from 10 AM to 10 PM (keep the `hour` numbers as they are). Any hour still
left as a PLACEHOLDER simply won't send. Push the change and the site + schedule update.

---

## Step 1 — Put this folder on GitHub
Create a new repo (e.g. `birthday-countdown`) and push this folder to it.

```bash
cd "Birthday Countdown"
git init
git add .
git commit -m "Pink birthday countdown"
git branch -M main
git remote add origin https://github.com/<you>/birthday-countdown.git
git push -u origin main
```
> `.env` and `node_modules/` are gitignored, so your private key is NOT uploaded. Good.

## Step 2 — Supabase table
1. Supabase → your project → **SQL Editor** → New query.
2. Paste all of **`supabase/schema.sql`** and click **Run**. (Creates `birthday_subs`
   for phones and `birthday_reads` for the "already opened it" tracking.)
3. Supabase → **Settings → API** and copy two values:
   - **`anon` `public`** key
   - **`service_role`** key (secret — never commit it)

## Step 3 — Paste the anon key into the site
Open **`public/config.js`** and replace `PASTE_YOUR_SUPABASE_ANON_PUBLIC_KEY_HERE`
with your **anon public** key. Commit + push.

## Step 4 — Add GitHub secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Add these (values for the VAPID + URL ones are in your local **`.env`** file):

| Secret | Value |
|---|---|
| `SUPABASE_URL` | `https://plvrtfstjymwwjcsbhnd.supabase.co` |
| `SUPABASE_SERVICE_KEY` | your **service_role** key (from Step 2) |
| `VAPID_PUBLIC_KEY` | copy from your local **`.env`** (`VAPID_PUBLIC_KEY=…`) |
| `VAPID_PRIVATE_KEY` | copy from your local **`.env`** (`VAPID_PRIVATE_KEY=…`) — keep secret |
| `VAPID_SUBJECT` | `mailto:teben55@gmail.com` |

> 🔒 The VAPID keys live only in your local `.env` (which is gitignored) — open that
> file to copy their values into GitHub Secrets. Never paste the **private** key into
> any file that gets committed.

## Step 5 — Turn on GitHub Pages
Repo → **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.
Then push once (or re-run the **Deploy site** action). Your site will be live at:

```
https://<you>.github.io/birthday-countdown/
```

## Step 6 — Subscribe her phone (do this BEFORE July 7)
On her **Android phone, in Chrome**, open the Pages URL and:
1. Tap **"🔔 Remind me on my birthday!"**
2. Tap **Allow** on the notification prompt.
3. You should see **"All set! 🎉"** (this saved her phone to Supabase).
4. Optional but nice: Chrome menu **⋮ → Add to Home screen** so she has the app icon.

> Tip: do the same on your own phone too, so you both get the surprise and you can
> confirm it works.

## Step 7 — TEST it now (highly recommended)
Repo → **Actions → "Birthday push" → Run workflow**, and type `9` in **test_hour**
(or `10` for the first quote). Within a few seconds her phone (and yours) should get
the notification — even with the browser closed. 🎉

If it works, you're done. On July 7 it fires **automatically every hour**: the birthday
alert at 9 AM, then a quote each hour from 10 AM to 10 PM.

---

## Good to know
- **Timezone / schedule:** the Action runs on the hour (first alert) and at :05
  (follow-up-if-unread), sending the message for the current **Mountain** hour
  (9 AM birthday, 10 AM–10 PM quotes), only on July 7. Crons are UTC.
- **Surprise:** the page only *shows* notes whose hour has arrived; she can't peek ahead
  in the app. (The quote text does live in the public `schedule.json`, so it's hidden from
  the app, not encrypted — fine for a 12-year-old, just don't hand her the repo link. 😉)
- **GitHub Actions timing:** scheduled runs can be a few minutes late under load — a
  notification may arrive a couple minutes after the hour. That's normal.
- **Test any hour:** Actions → "Birthday push" → Run workflow, and put a number in
  **test_hour** (9 = birthday, 10 = first quote, … 22 = last quote) to send that one now.
- **Fallback:** even if a push ever failed, if she just opens the site on her birthday it
  automatically shows the celebration + confetti + a local notification.
- **Re-subscribing:** tapping the button again is safe — it updates, never duplicates.
- **Change the quotes/message later:** edit `public/schedule.json` (birthday message +
  the 13 quotes). Change the date/name in `public/config.js`. Then push.
- **Local preview:** `npm run dev` → http://localhost:4321
- **Test the sender locally:** put your service key in `.env`, then
  `node --env-file=.env scripts/send-birthday.mjs`
