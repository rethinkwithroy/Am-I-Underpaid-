const { getSocCode } = require('../lib/soc-codes');
const { fetchBLSSalary } = require('../lib/bls');
const { callAI } = require('../lib/ai');
const { saveLead } = require('../lib/sheets');
const { checkRateLimit } = require('../lib/rate-limit');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Security: decide which origins may call this endpoint ──
// Same-origin requests (the deployed page calling its own /api) are always allowed.
// Set ALLOWED_ORIGINS to additionally permit specific external origins.
function resolveAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return null; // non-CORS (same-origin / server) request — fine

  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Always allow the request's own host (same deployment) and localhost dev.
  const host = req.headers.host;
  const selfOrigins = host ? [`https://${host}`, `http://${host}`] : [];
  const localhost = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');

  if (configured.includes(origin) || selfOrigins.includes(origin) || localhost) {
    return origin;
  }
  return false; // explicitly disallowed
}

function validateInput(body) {
  const errors = [];
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const city = typeof body.city === 'string' ? body.city.trim() : '';
  const salary = Number(body.salary);
  const experience = Number(body.experience);

  if (!title || title.length > 120) errors.push('title');
  if (!city || city.length > 120) errors.push('city');
  if (!Number.isFinite(salary) || salary <= 0 || salary > 100_000_000) errors.push('salary');

  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 200) : '';
  if (email && !EMAIL_RE.test(email)) errors.push('email');

  // Resume file is only accepted for storage, capped to ~5MB of base64.
  const resumeFileData =
    typeof body.resumeFileData === 'string' && body.resumeFileData.length <= 7_000_000
      ? body.resumeFileData
      : '';

  return {
    errors,
    clean: {
      title,
      city,
      salary,
      experience: Number.isFinite(experience) && experience >= 0 ? Math.min(experience, 80) : 0,
      industry: typeof body.industry === 'string' ? body.industry.trim().slice(0, 120) : '',
      companySize: typeof body.companySize === 'string' ? body.companySize.trim().slice(0, 40) : '',
      email,
      consent: body.consent === true,
      // Hard cap resume text; it is used transiently for the prompt and never stored.
      resumeText: typeof body.resumeText === 'string' ? body.resumeText.slice(0, 3000) : '',
      resumeFileName: typeof body.resumeFileName === 'string' ? body.resumeFileName.slice(0, 200) : '',
      resumeFileData,
    },
  };
}

module.exports = async function handler(req, res) {
  // ── CORS / origin enforcement ──
  const allowedOrigin = resolveAllowedOrigin(req);
  if (allowedOrigin === false) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Rate limiting (cost-abuse protection) ──
  const rl = checkRateLimit(req);
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' });
  }

  // ── Parse + validate input ──
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { errors, clean } = validateInput(body);
  if (errors.length) {
    return res.status(400).json({ error: `Missing or invalid fields: ${errors.join(', ')}` });
  }

  // ── Real BLS reference data ──
  const { code: socCode, label: socLabel } = getSocCode(clean.title);
  const blsData = await fetchBLSSalary(socCode);

  const blsContext = blsData
    ? `Real BLS OES data for ${socLabel}: national median annual salary is $${blsData.median.toLocaleString()} (${blsData.year} data).`
    : `No BLS data available. Use your training knowledge of Glassdoor, LinkedIn Salary, and Levels.fyi for this role.`;

  const systemPrompt =
    'You are a senior compensation analyst with access to real salary data from ' +
    'Glassdoor, LinkedIn Salary Insights, Levels.fyi, and the Bureau of Labor Statistics. ' +
    'Your estimates are accurate and specific to the role, location, and experience level provided. ' +
    'Return ONLY valid JSON with no markdown formatting.';

  const userPrompt = `Analyze this person's compensation:
Job title: ${clean.title}
Current annual salary: $${clean.salary.toLocaleString()}
Years of experience: ${clean.experience}
City/Location: ${clean.city}
Industry: ${clean.industry || 'Technology'}
Company size: ${clean.companySize || 'Medium'}
${blsContext}
${clean.resumeText ? `\nResume text (use for skills/seniority):\n${clean.resumeText}` : ''}

Using the BLS reference data above AND your knowledge of Glassdoor, LinkedIn Salary, and Levels.fyi for ${clean.city}, return this exact JSON:
{
  "marketRateMin": <integer, 10th percentile annual USD for this role in ${clean.city}>,
  "marketRateMax": <integer, 90th percentile annual USD for this role in ${clean.city}>,
  "marketMedian": <integer, 50th percentile annual USD>,
  "gap": <integer, marketMedian minus ${clean.salary}, positive means underpaid>,
  "verdict": <"underpaid" | "fairly_paid" | "overpaid">,
  "percentGap": <integer, absolute percent difference from median>,
  "seniorityLevel": <"Junior" | "Mid" | "Senior" | "Staff" | "Principal">,
  "skills": [<4 to 6 skills inferred from title and resume>],
  "summary": "<2 sentences: specific insight about their situation and what's driving the gap>",
  "catchyLine": "<punchy first-person social share line, max 15 words, include the dollar gap amount>",
  "dataSources": ["Glassdoor", "LinkedIn Salary", "BLS OES"]
}`;

  let result;
  let providerLabel = null;
  try {
    const ai = await callAI({ systemPrompt, userPrompt });
    result = ai.result;
    providerLabel = ai.providerLabel;
  } catch (err) {
    // Log details server-side only; return a generic message to the client.
    console.error('AI call failed:', err.message, err.providerBody || '');
    const status = err.message?.includes('Missing') ? 500 : 502;
    return res.status(status).json({ error: 'Could not generate an analysis right now. Please try again.' });
  }

  result.blsMedian = blsData?.median || null;

  // ── Optional lead/data capture — ONLY with explicit consent. Never blocks the response. ──
  if (clean.consent) {
    saveLead({
      input: clean,
      result,
      meta: { socLabel, providerLabel },
    }).catch(() => {});
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(result);
};
