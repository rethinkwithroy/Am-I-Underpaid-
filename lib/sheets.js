// Optional lead/data capture via a Google Apps Script web app.
//
// Why Apps Script instead of a service account:
//   - No Google Cloud project, no API keys, no OAuth juggling.
//   - The script runs AS YOU, so it can write to your Sheet and save files to
//     your Drive with permissions you already have.
//   - The only secret is the deployment URL, kept server-side in SHEETS_WEBHOOK_URL.
//
// Security:
//   - Called ONLY from the server (never the browser), so the webhook URL stays secret.
//   - A shared SHEETS_WEBHOOK_TOKEN is sent and checked by the script to reject
//     anyone who guesses the URL.
//   - Only invoked when the user ticks the consent box.
//
// If SHEETS_WEBHOOK_URL is unset, this is a no-op (app stays fully stateless).

async function saveLead({ input, result, meta }) {
  const webhook = process.env.SHEETS_WEBHOOK_URL;
  if (!webhook) return { saved: false, reason: 'not_configured' };

  const payload = {
    token: process.env.SHEETS_WEBHOOK_TOKEN || '',
    timestamp: new Date().toISOString(),
    email: clip(input.email, 200),
    jobTitle: clip(input.title, 120),
    socLabel: clip(meta.socLabel, 120),
    salary: toInt(input.salary),
    experience: toInt(input.experience),
    city: clip(input.city, 120),
    industry: clip(input.industry, 120),
    companySize: clip(input.companySize, 40),
    verdict: clip(result.verdict, 40),
    gap: toInt(result.gap),
    marketMedian: toInt(result.marketMedian),
    seniorityLevel: clip(result.seniorityLevel, 40),
    provider: clip(meta.providerLabel, 40),
    // Resume file (base64, no data: prefix) — Apps Script saves it to Drive and
    // writes the link into the row. Only present when the user consented + uploaded.
    resumeFileName: clip(input.resumeFileName, 200),
    resumeFileData: input.resumeFileData || '',
  };

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { saved: false, reason: `http_${res.status}`, detail: body.slice(0, 200) };
    }
    return { saved: true };
  } catch (err) {
    // Capture must never break the user-facing response.
    return { saved: false, reason: err.message };
  }
}

function clip(v, max) {
  if (v == null) return '';
  return String(v).slice(0, max);
}
function toInt(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : null;
}

module.exports = { saveLead };
