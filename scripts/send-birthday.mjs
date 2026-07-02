// Sends the right message for the current hour:
//   9:00 AM Mountain  -> the big birthday alert
//   10:00 AM..10:00 PM -> that hour's quote
// Run hourly by the GitHub Action. Only sends on July 7 (Mountain), unless you
// pass TEST_HOUR to force a specific hour for testing.
//
// Needs env: SUPABASE_URL, SUPABASE_SERVICE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
import webpush from 'web-push';
import { readFile } from 'node:fs/promises';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT = 'mailto:teben55@gmail.com',
  BIRTHDAY_TABLE = 'birthday_subs',
  READS_TABLE = 'birthday_reads',
  TEST_HOUR, // optional: force an hour (0-23) and skip the date check
  MODE = 'send', // 'send' = first alert to everyone; 'remind' = +5min, only if unread
} = process.env;
const mode = String(MODE).toLowerCase() === 'remind' ? 'remind' : 'send';

function required(name, val) {
  if (!val) { console.error(`Missing env: ${name}`); process.exit(1); }
}
required('SUPABASE_URL', SUPABASE_URL);
required('SUPABASE_SERVICE_KEY', SUPABASE_SERVICE_KEY);
required('VAPID_PUBLIC_KEY', VAPID_PUBLIC_KEY);
required('VAPID_PRIVATE_KEY', VAPID_PRIVATE_KEY);

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ---- what time is it in Mountain? ----
function mountainParts() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Edmonton', month: 'numeric', day: 'numeric', hour: 'numeric', hour12: false,
  }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  let hour = get('hour');
  if (hour === 24) hour = 0;
  return { month: get('month'), day: get('day'), hour };
}
const now = mountainParts();
const forced = TEST_HOUR !== undefined && TEST_HOUR !== '';
const hour = forced ? Number(TEST_HOUR) : now.hour;
const isBirthday = now.month === 7 && now.day === 7;

if (!forced && !isBirthday) {
  console.log(`Not July 7 in Mountain (${now.month}/${now.day}). Nothing to send.`);
  process.exit(0);
}

// ---- pick the message for this hour ----
const schedule = JSON.parse(await readFile(new URL('../public/schedule.json', import.meta.url)));
let msg = null;
if (hour === schedule.birthday.hour) {
  msg = { title: schedule.birthday.title, body: schedule.birthday.body };
} else {
  const q = (schedule.quotes || []).find((x) => x.hour === hour);
  if (q && q.text && !/^PLACEHOLDER/.test(q.text)) {
    msg = { title: schedule.quoteTitle || '💖 Happy Birthday 💖', body: q.text };
  }
}
if (!msg) {
  console.log(`No message scheduled for hour ${hour}. Nothing to send.`);
  process.exit(0);
}
console.log(`[${mode}] Hour ${hour} -> "${msg.title}" / "${msg.body}"`);
const payload = JSON.stringify({ title: msg.title, body: msg.body, url: '/' });

const headers = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
const restBase = `${SUPABASE_URL}/rest/v1/${BIRTHDAY_TABLE}`;

// ---- who to send to ----
const res = await fetch(`${restBase}?select=id,endpoint,subscription`, { headers });
if (!res.ok) {
  console.error('Failed to read subscriptions:', res.status, await res.text());
  process.exit(1);
}
let rows = await res.json();
console.log(`${rows.length} subscription(s) total.`);

// In "remind" mode, skip anyone who already opened this hour's note.
if (mode === 'remind') {
  const readRes = await fetch(`${SUPABASE_URL}/rest/v1/${READS_TABLE}?hour=eq.${hour}&select=endpoint`, { headers });
  const readRows = readRes.ok ? await readRes.json() : [];
  const readSet = new Set(readRows.map((r) => r.endpoint));
  const before = rows.length;
  rows = rows.filter((r) => !readSet.has(r.endpoint));
  console.log(`${before - rows.length} already opened it; ${rows.length} still need a nudge.`);
  if (!rows.length) { console.log('Everyone already saw it. No follow-up needed.'); process.exit(0); }
}

let ok = 0, gone = 0, failed = 0;
for (const row of rows) {
  const sub = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
  try {
    await webpush.sendNotification(sub, payload);
    ok++;
    console.log(`sent -> id ${row.id}`);
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      gone++;
      await fetch(`${restBase}?id=eq.${row.id}`, { method: 'DELETE', headers }).catch(() => {});
      console.log(`expired, removed -> id ${row.id}`);
    } else {
      failed++;
      console.error(`failed -> id ${row.id}:`, err.statusCode, err.body || err.message);
    }
  }
}
console.log(`\nDone. sent=${ok} expired=${gone} failed=${failed}`);
if (ok === 0 && rows.length > 0) process.exit(1); // fail the Action so you notice
