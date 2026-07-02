/* eslint-disable no-console */
const CFG = window.BDAY_CONFIG;
const $ = (id) => document.getElementById(id);

const target = new Date(CFG.targetDate).getTime();

// Fill in personalized bits
$('who').textContent = `${CFG.name}'s`;
$('target-line').textContent = '🎂 ' + new Date(CFG.targetDate).toLocaleString(undefined, {
  month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
}) + ' 🎂';

// ---------------- Schedule (birthday message + hourly quotes) ----------------
// After this date (Mountain time), every quote unlocks so she can reread them forever.
const BDAY = { y: 2026, m: 7, d: 7 };

let SCHED = null;
const FALLBACK_BDAY = {
  hour: 9,
  title: 'HAPPY 12th BDAY BABY GIRL!!!!',
  body: 'HOPE YOU HAVE AN AMAZING DAY 💖 LOVE DAD & KRISTEN',
};
function birthdayObj() { return (SCHED && SCHED.birthday) || FALLBACK_BDAY; }
function bdayText() { const b = birthdayObj(); return `${b.title}\n${b.body}`; }
$('bday-msg').textContent = bdayText();
fetch('schedule.json')
  .then((r) => r.json())
  .then((s) => { SCHED = s; $('bday-msg').textContent = bdayText(); if (partyStarted) { renderQuotes(); markReadCurrentHour(); } })
  .catch(() => {});

// Current year/month/day/hour in Mountain time, wherever the viewer is.
function mountainNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Edmonton', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hour12: false,
  }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  let hour = get('hour');
  if (hour === 24) hour = 0;
  return { year: get('year'), month: get('month'), day: get('day'), hour };
}
// Once her birthday day has passed, unlock all the quotes for keeps.
function afterBirthday() {
  const n = mountainNow();
  return n.year > BDAY.y || (n.year === BDAY.y && (n.month > BDAY.m || (n.month === BDAY.m && n.day > BDAY.d)));
}
function realQuotes() {
  return SCHED && Array.isArray(SCHED.quotes)
    ? SCHED.quotes.filter((q) => q.text && !/^PLACEHOLDER/.test(q.text))
    : [];
}
function fmtHour(h) {
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:00 ${h < 12 ? 'AM' : 'PM'}`;
}

// Show every quote she's ALLOWED to see (already delivered), newest first.
// Future quotes stay locked; after her birthday everything is unlocked.
function renderQuotes() {
  const wrap = $('quotes');
  const list = $('quote-list');
  const lockNote = $('locked-note');
  const all = realQuotes();
  if (!all.length) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');

  const unlockAll = afterBirthday();
  const { hour } = mountainNow();
  const unlocked = all.filter((q) => unlockAll || q.hour <= hour);
  const lockedCount = all.length - unlocked.length;

  list.innerHTML = '';
  if (!unlocked.length) {
    const p = document.createElement('p');
    p.className = 'soon';
    p.textContent = 'Your first little note arrives at 10:00 AM 💕';
    list.appendChild(p);
  } else {
    [...unlocked].reverse().forEach((q, i) => {
      const card = document.createElement('div');
      card.className = 'quote-card' + (i === 0 ? ' newest' : '');
      card.innerHTML = '<span class="quote-mark">❝</span><p class="quote-text"></p><span class="quote-when"></span>';
      card.querySelector('.quote-text').textContent = q.text;
      card.querySelector('.quote-when').textContent = fmtHour(q.hour);
      list.appendChild(card);
    });
  }
  lockNote.textContent = lockedCount > 0
    ? `🔒 ${lockedCount} more note${lockedCount > 1 ? 's' : ''} unlock through the day…`
    : '';
}

// ---- Read receipts: tell the server she has seen this hour's note ----
let MY_ENDPOINT = null;
async function loadEndpoint() {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    MY_ENDPOINT = sub ? sub.endpoint : null;
  } catch { /* ignore */ }
}
loadEndpoint();

async function markReadCurrentHour() {
  if (!MY_ENDPOINT || !CFG.supabaseAnonKey || CFG.supabaseAnonKey.includes('PASTE_')) return;
  const { hour } = mountainNow();
  const isMsgHour = hour === birthdayObj().hour || realQuotes().some((q) => q.hour === hour);
  if (!isMsgHour) return;
  try {
    await fetch(`${CFG.supabaseUrl}/rest/v1/${CFG.readsTable}?on_conflict=endpoint,hour`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CFG.supabaseAnonKey,
        Authorization: `Bearer ${CFG.supabaseAnonKey}`,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ endpoint: MY_ENDPOINT, hour }),
    });
  } catch { /* ignore */ }
}

// ---------------- Countdown ----------------
let partyStarted = false;
function tick() {
  const now = Date.now();
  let diff = target - now;
  if (diff <= 0) {
    setNums(0, 0, 0, 0);
    if (!partyStarted) startParty(true);
    return;
  }
  const days = Math.floor(diff / 86400000); diff -= days * 86400000;
  const hours = Math.floor(diff / 3600000); diff -= hours * 3600000;
  const mins = Math.floor(diff / 60000); diff -= mins * 60000;
  const secs = Math.floor(diff / 1000);
  setNums(days, hours, mins, secs);
}
function setNums(d, h, m, s) {
  $('days').textContent = d;
  $('hours').textContent = String(h).padStart(2, '0');
  $('mins').textContent = String(m).padStart(2, '0');
  $('secs').textContent = String(s).padStart(2, '0');
}
tick();
setInterval(tick, 1000);

// ---------------- Party reveal ----------------
function startParty(fireLocalNotification) {
  partyStarted = true;
  $('countdown-view').classList.add('hidden');
  $('party-view').classList.remove('hidden');
  launchConfetti(6000);
  try { chime(); } catch {}
  renderQuotes();
  markReadCurrentHour();
  // Keep the gallery in step with the hour if she leaves it open, and keep
  // marking the current note as read.
  clearInterval(startParty._quoteTimer);
  startParty._quoteTimer = setInterval(() => { renderQuotes(); markReadCurrentHour(); }, 60000);
  // Fallback: if the page happens to be open at the moment, also pop a notification.
  if (fireLocalNotification && 'serviceWorker' in navigator && Notification.permission === 'granted') {
    const b = (SCHED && SCHED.birthday) || FALLBACK_BDAY;
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(b.title, {
        body: b.body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        vibrate: [200, 100, 200, 100, 300],
        tag: 'birthday',
      });
    }).catch(() => {});
  }
}
$('celebrate-btn').addEventListener('click', () => { launchConfetti(4000); try { chime(); } catch {} });

// When she comes back to the app (e.g. tapping the notification), refresh the
// gallery and record that she has seen this hour's note.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && partyStarted) { renderQuotes(); markReadCurrentHour(); }
});

// ---------------- Push subscription ----------------
const btn = $('notify-btn');
const statusEl = $('notify-status');
function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = 'status' + (kind ? ' ' + kind : '');
}

async function registerSW() {
  if (!('serviceWorker' in navigator)) throw new Error('no-sw');
  return navigator.serviceWorker.register('sw.js');
}
// Register SW early so the fallback notification can work too.
registerSW().catch(() => {});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function saveSubscription(sub) {
  const url = `${CFG.supabaseUrl}/rest/v1/${CFG.table}?on_conflict=endpoint`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: CFG.supabaseAnonKey,
      Authorization: `Bearer ${CFG.supabaseAnonKey}`,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ endpoint: sub.endpoint, subscription: sub.toJSON() }),
  });
  if (!res.ok) throw new Error(`save ${res.status}: ${await res.text()}`);
}

async function enableNotifications() {
  try {
    btn.disabled = true;
    setStatus('Setting up… 🎀');

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus("This browser can't do reminders. Open in Chrome and try again 💕", 'err');
      btn.disabled = false;
      return;
    }
    if (!CFG.supabaseAnonKey || CFG.supabaseAnonKey.includes('PASTE_')) {
      setStatus('Almost ready — the Supabase key still needs to be added. (See SETUP.md)', 'err');
      btn.disabled = false;
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setStatus('No worries — you can still open this on your birthday for the surprise! 💗', 'err');
      btn.disabled = false;
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(CFG.vapidPublicKey),
      });
    }
    await saveSubscription(sub);
    MY_ENDPOINT = sub.endpoint;
    markReadCurrentHour();

    setStatus("All set! 🎉 You'll get a birthday surprise. You can close this now 💖", 'ok');
    btn.textContent = "🔔 You're all set!";
    launchConfetti(2500);
  } catch (err) {
    console.error(err);
    setStatus('Hmm, something hiccuped. Try again in a sec 💕', 'err');
    btn.disabled = false;
  }
}
btn.addEventListener('click', enableNotifications);

// ---------------- Confetti (tiny canvas) ----------------
const canvas = $('confetti');
const ctx = canvas.getContext('2d');
let pieces = [];
let confettiUntil = 0;
let rafOn = false;
const COLORS = ['#ff4fa3', '#ff8fc7', '#ffc2e2', '#b06ab3', '#fff0f7', '#ffd9ec'];
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
resize(); addEventListener('resize', resize);

function launchConfetti(durationMs) {
  confettiUntil = Date.now() + durationMs;
  for (let i = 0; i < 120; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      r: 4 + Math.random() * 7,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      vx: -1.5 + Math.random() * 3,
      vy: 2 + Math.random() * 3.5,
      rot: Math.random() * Math.PI,
      vr: -0.2 + Math.random() * 0.4,
      heart: Math.random() < 0.4,
    });
  }
  if (!rafOn) { rafOn = true; requestAnimationFrame(draw); }
}
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pieces.forEach((p) => {
    p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
    if (p.heart) {
      ctx.font = `${p.r * 2.4}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💗', 0, 0);
    } else {
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
    }
    ctx.restore();
  });
  pieces = pieces.filter((p) => p.y < canvas.height + 30);
  if (Date.now() < confettiUntil || pieces.length) {
    requestAnimationFrame(draw);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    rafOn = false;
  }
}

// ---------------- Little chime ----------------
function chime() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ac = new AC();
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime + i * 0.18;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.start(t); o.stop(t + 0.42);
  });
}
