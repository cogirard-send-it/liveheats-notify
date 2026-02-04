// notifier/notify.js
// Requires: npm i web-push node-fetch@2
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
const fetch = require('node-fetch');

const {
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  EVENT_ID,
  MESSAGE_OVERRIDE,
  SUBSCRIPTIONS_FILE = 'data/subscriptions.json'
} = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('Missing VAPID keys. Add secrets VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
  process.exit(1);
}
if (!EVENT_ID) {
  console.error('Missing EVENT_ID. Provide it via workflow input or env.');
  process.exit(1);
}

webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:you@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Minimal event fetch (public data endpoint used by liveheats.com)
async function fetchEventInfo(eventId) {
  const url = 'https://liveheats.com/api/graphql';
  const q = `
    query Event($id: ID!) {
      event(id: $id) {
        id
        name
        status
      }
    }`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: q, variables: { id: eventId } })
  });
  if (!res.ok) throw new Error(`LiveHeats API HTTP ${res.status}`);
  const body = await res.json();
  if (body.errors) throw new Error(`LiveHeats API error: ${JSON.stringify(body.errors)}`);
  return body.data.event;
}

function loadSubscriptions(filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(abs)) return [];
  try {
    const arr = JSON.parse(fs.readFileSync(abs, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

(async () => {
  let eventInfo = null;
  try {
    eventInfo = await fetchEventInfo(EVENT_ID);
  } catch (e) {
    console.warn(`[warn] Could not fetch event ${EVENT_ID}: ${e.message}`);
  }

  const title = eventInfo?.name ? `LiveHeats: ${eventInfo.name}` : 'LiveHeats Update';
  const body =
    MESSAGE_OVERRIDE ||
    (eventInfo?.status ? `Event ${EVENT_ID} status: ${eventInfo.status}` : `Update for event ${EVENT_ID}`);
  const url = `https://liveheats.com/events/${EVENT_ID}`;

  const payload = JSON.stringify({ title, body, url });

  const subscriptions = loadSubscriptions(SUBSCRIPTIONS_FILE);
  if (!subscriptions.length) {
    console.log('[info] No subscriptions found.');
    return;
  }

  console.log(`[info] Sending to ${subscriptions.length} subscription(s) for Event ${EVENT_ID}`);

  const results = { ok: 0, gone: 0, failed: 0 };
  const stillValid = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
      results.ok++;
      stillValid.push(sub);
    } catch (err) {
      const code = err?.statusCode || err?.status || 0;
      if (code === 410 || code === 404) {
        results.gone++;
        console.log(`[gone] ${sub.endpoint}`);
      } else {
        results.failed++;
        console.warn(`[fail] ${code} for ${sub.endpoint}: ${err.message}`);
        stillValid.push(sub);
      }
    }
  }

  if (stillValid.length !== subscriptions.length) {
    try {
      fs.mkdirSync(path.dirname(SUBSCRIPTIONS_FILE), { recursive: true });
      fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(stillValid, null, 2));
      console.log(`[info] Pruned ${subscriptions.length - stillValid.length} subscription(s).`);
    } catch (e) {
      console.warn('[warn] Failed to write pruned subscriptions file:', e.message);
    }
  }

  console.log(`[done] Sent=${results.ok}, Pruned=${results.gone}, Failed=${results.failed}`);
})();
