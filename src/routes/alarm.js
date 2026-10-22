// Salat Alarm push routes — let Ilm Daily ring at every prayer time,
// even when the app is closed, via Web Push notifications.
//
// Public (no API key, mounted before the global gate like prayer-times):
//   GET  /v1/alarm/vapid        — the Web Push VAPID public key for subscribing
//   GET  /v1/alarm/tick         — dispatch due prayer pushes (called every 5 min by GitHub Actions)
//
// API-key protected:
//   POST /v1/alarm/subscribe    — register a browser push subscription + location
//   POST /v1/alarm/unsubscribe  — remove it
//
// Tables are created lazily on first use (CREATE TABLE IF NOT EXISTS) on the
// existing Neon Postgres database.

const express = require('express');
const router = express.Router();
const adhan = require('adhan');
const webpush = require('web-push');
const db = require('../config/db');
const apiKeyAuth = require('../middleware/apiKeyAuth');

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const METHODS = adhan.CalculationMethod;

// ---- lazy schema ----
let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS alarm_push_subs (
          id SERIAL PRIMARY KEY,
          endpoint TEXT UNIQUE NOT NULL,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          lat DOUBLE PRECISION NOT NULL,
          lng DOUBLE PRECISION NOT NULL,
          method TEXT DEFAULT 'MuslimWorldLeague',
          timezone TEXT DEFAULT 'UTC',
          prayers JSONB DEFAULT '{"fajr":true,"dhuhr":true,"asr":true,"maghrib":true,"isha":true}',
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS alarm_push_fired (
          sub_id INT NOT NULL,
          day TEXT NOT NULL,
          prayer TEXT NOT NULL,
          fired_at TIMESTAMPTZ DEFAULT now(),
          PRIMARY KEY (sub_id, day, prayer)
        );
        CREATE TABLE IF NOT EXISTS alarm_vapid (
          id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
          public_key TEXT NOT NULL,
          private_key TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);
    })().catch((e) => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

// ---- VAPID keys: generated once, stored in the DB so no env vars are needed ----
async function getVapid() {
  await ensureSchema();
  const { rows } = await db.query('SELECT * FROM alarm_vapid WHERE id = 1');
  if (rows.length) return rows[0];
  const keys = webpush.generateVAPIDKeys();
  await db.query(
    'INSERT INTO alarm_vapid (id, public_key, private_key) VALUES (1, $1, $2) ON CONFLICT (id) DO NOTHING',
    [keys.publicKey, keys.privateKey]
  );
  const again = await db.query('SELECT * FROM alarm_vapid WHERE id = 1');
  return again.rows[0];
}

router.get('/vapid', async (req, res) => {
  try {
    const v = await getVapid();
    res.json({ publicKey: v.public_key });
  } catch (e) {
    console.error('alarm vapid error:', e.message);
    res.status(500).json({ error: 'Could not load push keys' });
  }
});

// ---- subscribe / unsubscribe (require the developer API key) ----
router.post('/subscribe', apiKeyAuth, async (req, res) => {
  try {
    const { endpoint, p256dh, auth, lat, lng, timezone, method, prayers } = req.body || {};
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: 'endpoint, p256dh and auth are required (from pushManager.subscribe)' });
    }
    const la = Number(lat), ln = Number(lng);
    if (!Number.isFinite(la) || la < -90 || la > 90 || !Number.isFinite(ln) || ln < -180 || ln > 180) {
      return res.status(400).json({ error: 'lat and lng are required (valid coordinates)' });
    }
    let methodName = method || 'MuslimWorldLeague';
    if (!METHODS[methodName]) methodName = 'MuslimWorldLeague';
    const sel = {};
    for (const p of PRAYERS) sel[p] = !prayers || prayers[p] === undefined ? true : !!prayers[p];
    const tz = (timezone && /^[A-Za-z0-9_+/\-]+$/.test(timezone)) ? timezone : 'UTC';

    await ensureSchema();
    await db.query(
      `INSERT INTO alarm_push_subs (endpoint, p256dh, auth, lat, lng, method, timezone, prayers, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
       ON CONFLICT (endpoint) DO UPDATE SET
         p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
         method = EXCLUDED.method, timezone = EXCLUDED.timezone, prayers = EXCLUDED.prayers, updated_at = now()`,
      [String(endpoint).slice(0, 2048), String(p256dh), String(auth), la, ln, methodName, tz, JSON.stringify(sel)]
    );
    res.json({ ok: true, method: methodName, prayers: sel, timezone: tz });
  } catch (e) {
    console.error('alarm subscribe error:', e.message);
    res.status(500).json({ error: 'Could not save alarm subscription' });
  }
});

router.post('/unsubscribe', apiKeyAuth, async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });
    await ensureSchema();
    await db.query('DELETE FROM alarm_push_subs WHERE endpoint = $1', [String(endpoint).slice(0, 2048)]);
    res.json({ ok: true });
  } catch (e) {
    console.status && console.status(500);
    res.status(500).json({ error: 'Could not remove alarm subscription' });
  }
});

// ---- the tick: fire pushes for any prayer that just became due ----
// GitHub Actions hits this every 5 minutes; a catch-up window means a late
// tick still rings, and the fired-marker makes repeats harmless.
const FIRE_WINDOW_MIN = 15;

function tzParts(date, tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(date);
    const o = {};
    for (const p of parts) o[p.type] = p.value;
    if (o.hour === '24') o.hour = '0';
    return {
      day: `${o.year}-${o.month}-${o.day}`,
      minutes: (parseInt(o.hour, 10)) * 60 + parseInt(o.minute, 10),
    };
  } catch (e) {
    return null;
  }
}

async function sendPush(sub, prayer, vapid) {
  webpush.setVapidDetails(
    'mailto:salam@alhaqq-digital.vercel.app',
    vapid.public_key,
    vapid.private_key
  );
  const payload = JSON.stringify({
    prayer,
    title: `Ilm Daily — it is time for ${prayer.charAt(0).toUpperCase() + prayer.slice(1)}`,
  });
  return webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    payload
  );
}

router.get('/tick', async (req, res) => {
  try {
    await ensureSchema();
    const vapid = await getVapid();
    const { rows: subs } = await db.query('SELECT * FROM alarm_push_subs');
    const now = new Date();
    let sent = 0, purged = 0, skipped = 0;

    if (req.query.test === '1') {
      const errors = [];
      for (const sub of subs) {
        try { await sendPush(sub, 'test', vapid); sent++; }
        catch (e) {
          const status = e.statusCode || (e.body && e.body.statusCode);
          errors.push({ id: sub.id, status: status || null, message: String(e.message || '').slice(0, 200) });
          if (status === 404 || status === 410) { await db.query('DELETE FROM alarm_push_subs WHERE id = $1', [sub.id]); purged++; }
        }
      }
      return res.json({ ok: true, mode: 'test', checked: subs.length, sent, purged, errors });
    }

    for (const sub of subs) {
      const here = tzParts(now, sub.timezone || 'UTC');
      if (!here) continue;
      // compute prayer times for the subscriber's local day (noon UTC anchor is
      // accurate enough for a solar-day calculation)
      const anchor = new Date(`${here.day}T12:00:00Z`);
      const times = new adhan.PrayerTimes(
        new adhan.Coordinates(sub.lat, sub.lng),
        anchor,
        METHODS[sub.method] ? METHODS[sub.method]() : METHODS.MuslimWorldLeague()
      );
      const sel = sub.prayers || {};
      for (const prayer of PRAYERS) {
        if (sel[prayer] === false) continue;
        const t = tzParts(times[prayer], sub.timezone || 'UTC');
        if (!t || t.day !== here.day) continue;
        const diff = here.minutes - t.minutes;
        if (diff < 0 || diff > FIRE_WINDOW_MIN) continue;
        // claim: only one tick ever fires a given (sub, day, prayer)
        const ins = await db.query(
          'INSERT INTO alarm_push_fired (sub_id, day, prayer) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [sub.id, here.day, prayer]
        );
        if (ins.rowCount === 0) { skipped++; continue; }
        try {
          await sendPush(sub, prayer, vapid);
          sent++;
        } catch (e) {
          const status = e.statusCode || (e.body && e.body.statusCode);
          if (status === 404 || status === 410) {
            await db.query('DELETE FROM alarm_push_subs WHERE id = $1', [sub.id]);
            purged++;
          }
          // other errors: retry on the next tick within the window
          await db.query('DELETE FROM alarm_push_fired WHERE sub_id = $1 AND day = $2 AND prayer = $3', [sub.id, here.day, prayer]);
        }
      }
    }
    res.json({ ok: true, checked: subs.length, sent, skipped, purged, window: FIRE_WINDOW_MIN });
  } catch (e) {
    console.error('alarm tick error:', e.message);
    res.status(500).json({ error: 'Alarm tick failed' });
  }
});

// Recent alarm activity — used to verify prayers actually fired
router.get('/stats', async (req, res) => {
  try {
    await ensureSchema();
    const { rows: fired } = await db.query(
      'SELECT f.prayer, f.day, f.fired_at, s.timezone FROM alarm_push_fired f JOIN alarm_push_subs s ON s.id = f.sub_id ORDER BY f.fired_at DESC LIMIT 20'
    );
    const { rows: subs } = await db.query('SELECT count(*)::int AS c FROM alarm_push_subs');
    res.json({ subscribers: subs[0].c, recently_fired: fired });
  } catch (e) {
    res.status(500).json({ error: 'Could not load alarm stats' });
  }
});

module.exports = router;
