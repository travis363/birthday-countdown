# 🎀 Birthday Countdown

A pink, flowery countdown web app + a true push notification for a very special
**12th birthday** on **July 7, 2026 at 9:00 AM Mountain**.

- Live countdown screen (days / hours / mins / secs) with floating flowers & sparkles.
- She taps one button to subscribe her phone to birthday reminders.
- On July 7 a GitHub Action pushes to her phone all day (even if the app is closed):
  - **9:00 AM** — **HAPPY 12th BDAY BABY GIRL!!!!** — HOPE YOU HAVE AN AMAZING DAY 💖 LOVE DAD & KRISTEN
  - **10:00 AM – 10:00 PM** — a new quote every hour (edit them in `public/schedule.json`).
  - If she doesn't open an alert, one reminder follows 5 min later (2 alerts max per note).
- At zero the site bursts into confetti and opens a **"Notes from Dad" gallery** — each
  note unlocks at its hour, past notes stay browsable, and after her birthday they all
  stay unlocked so she can reread them forever.

100% free stack: **GitHub Pages** (site) + **GitHub Actions** (scheduler) + **Supabase** (stores the subscription).

👉 **Setup instructions: see [SETUP.md](SETUP.md).**

## Layout
```
public/            the site (index.html, styles.css, app.js, sw.js, config.js, manifest, icons)
public/schedule.json  birthday message + the 13 hourly quotes (edit this)
scripts/           gen-vapid.mjs, make-icons.mjs, send-birthday.mjs
supabase/schema.sql   the subscriptions table + row-level security
.github/workflows/    birthday.yml (the push) + pages.yml (deploy)
server.mjs         tiny local static server for `npm run dev`
```
