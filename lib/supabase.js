// Optional, secure analytics persistence via Supabase REST.
//
// Security model:
//   - Uses the SERVICE ROLE key, which lives ONLY in server-side env vars.
//   - Never exposed to the browser; the frontend never talks to Supabase directly.
//   - The table has Row Level Security ON with NO public policies, so even if the
//     anon key leaked, rows are unreadable/unwritable by the public.
//   - We deliberately DO NOT store resume text or any uploaded file — only the
//     coarse, non-identifying fields needed for aggregate insight.
//
// If SUPABASE_URL / SUPABASE_SERVICE_KEY are not set, persistence is skipped
// silently and the app runs fully stateless.

async function saveAnalysis({ input, result, meta }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { saved: false, reason: 'not_configured' };

  // Whitelist exactly what we persist. No resume text, no raw PII blobs.
  const row = {
    job_title: clip(input.title, 120),
    soc_label: clip(meta.socLabel, 120),
    salary: toInt(input.salary),
    experience: toInt(input.experience),
    city: clip(input.city, 120),
    industry: clip(input.industry, 120),
    company_size: clip(input.companySize, 40),
    verdict: clip(result.verdict, 40),
    gap: toInt(result.gap),
    market_median: toInt(result.marketMedian),
    seniority_level: clip(result.seniorityLevel, 40),
    provider: clip(meta.providerLabel, 40),
  };

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/analyses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { saved: false, reason: `http_${res.status}`, detail: body.slice(0, 200) };
    }
    return { saved: true };
  } catch (err) {
    // Persistence must never break the user-facing response.
    return { saved: false, reason: err.message };
  }
}

function clip(v, max) {
  if (v == null) return null;
  return String(v).slice(0, max);
}
function toInt(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : null;
}

module.exports = { saveAnalysis };
