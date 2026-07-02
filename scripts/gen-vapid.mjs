// Generates a VAPID key pair for Web Push.
// Run once:  npm run gen-vapid
// - Put the PUBLIC key in public/config.js (VAPID_PUBLIC_KEY)
// - Keep the PRIVATE key secret: in .env locally, and as a GitHub Actions secret.
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('VAPID_PUBLIC_KEY =', keys.publicKey);
console.log('VAPID_PRIVATE_KEY =', keys.privateKey);
