// Outbound email for developer keys, over an HTTPS API rather than SMTP.
// Brevo is used because the same account already sends for AgentX, so there is
// no new provider to verify. Nothing is sent unless BREVO_API_KEY is present:
// callers must ask `available()` first and tell the truth in their response
// instead of promising an email that will never arrive.
const TIMEOUT_MS = 8000;

function apiKey() {
  return String(process.env.BREVO_API_KEY || '').trim();
}

function available() {
  return Boolean(apiKey());
}

function sender() {
  const from = String(process.env.MAIL_FROM || '').trim() || 'no-reply@ilm-api.vercel.app';
  const m = from.match(/^(.*)<([^>]+)>$/);
  if (m) return { name: m[1].trim().replace(/^"|"$/g, ''), email: m[2].trim() };
  return { name: 'Ilm API', email: from };
}

async function send({ to, subject, text, html }) {
  if (!available()) return { sent: false, reason: 'not-configured' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'api-key': apiKey(),
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: sender(),
        to: [{ email: to }],
        subject,
        textContent: text,
        ...(html ? { htmlContent: html } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { sent: false, reason: `provider-${res.status}`, detail: body.slice(0, 200) };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err && err.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

function keyEmail({ key, tier }) {
  const masked = `${key.slice(0, 8)}…${key.slice(-4)}`;
  const text = [
    'Your Ilm API key',
    '',
    key,
    '',
    `Tier: ${tier || 'free'} (60 requests a minute, 2,000 a day)`,
    '',
    'Send it as the x-api-key header:',
    `  curl -H "x-api-key: ${key}" https://ilm-api.vercel.app/v1/quran/2/255`,
    '',
    'Keep this message: anyone with the key can spend your quota.',
    'If it leaks, replace it with POST /v1/developers/keys/rotate using the key itself.',
    'Lost it again? POST /v1/developers/keys/recover with this address.',
    '',
    `Key hint for recognition: ${masked}`,
    '',
    'Ilm API: Quran, hadith, tafsir, duas, fiqh and prayer times.',
    'https://ilm-api.vercel.app/docs',
  ].join('\n');
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5;color:#1b1b1b">
  <h2 style="margin:0 0 8px">Your Ilm API key</h2>
  <p style="margin:0 0 12px">Tier: <strong>${tier || 'free'}</strong> — 60 requests a minute, 2,000 a day.</p>
  <pre style="background:#f4f4f2;padding:12px;border-radius:8px;font-size:13px;overflow:auto">${key}</pre>
  <p style="margin:12px 0 6px">Send it as the <code>x-api-key</code> header:</p>
  <pre style="background:#f4f4f2;padding:12px;border-radius:8px;font-size:12px;overflow:auto">curl -H "x-api-key: ${key}" https://ilm-api.vercel.app/v1/quran/2/255</pre>
  <p style="margin:12px 0 0;font-size:13px;color:#555">Anyone with this key can spend your quota. If it leaks, replace it with
  <code>POST /v1/developers/keys/rotate</code> using the key itself. Lost it again?
  <code>POST /v1/developers/keys/recover</code> with this address.</p>
  <p style="margin:12px 0 0;font-size:13px;color:#555">Hint for recognition: <code>${masked}</code></p>
  <p style="margin:16px 0 0;font-size:12px;color:#777">Ilm API — Quran, hadith, tafsir, duas, fiqh and prayer times.<br>
  <a href="https://ilm-api.vercel.app/docs">Documentation</a></p>
</div>`;
  return { subject: 'Your Ilm API key', text, html };
}

module.exports = { available, send, keyEmail, sender };
