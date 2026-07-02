// ---- Birthday countdown config ----
// The one spot you edit. (VAPID public key is already filled in for you.)
window.BDAY_CONFIG = {
  // The big moment: July 7, 2026 at 9:00 AM Mountain Time (-06:00 in July / MDT).
  // This is an exact instant, so the countdown is correct from any timezone.
  targetDate: '2026-07-07T09:00:00-06:00',

  name: 'Natalie',
  age: 12,
  // The birthday message + the hourly quotes live in public/schedule.json
  // (shared by the page and the notification sender).

  // Web Push public key (safe to expose). Generated for you with `npm run gen-vapid`.
  vapidPublicKey: 'BJHmbYOJwcx9-wz3mFWFllzijYWuavSNlAaNjYfbY0f1yFMbJbeIOPCYoraUz_WgZj3CsmcK-vnUVz8sRzWD4Jk',

  // Supabase (stores the phone's push subscription). URL is yours already.
  // Paste your project's ANON PUBLIC key below (Supabase -> Settings -> API).
  supabaseUrl: 'https://ereapnbfdftvbhyjxxnw.supabase.co',
  supabaseAnonKey: 'PASTE_YOUR_SUPABASE_ANON_PUBLIC_KEY_HERE',
  table: 'birthday_subs',
  readsTable: 'birthday_reads',
};
