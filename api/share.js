// Per-result share page (served at /s via a rewrite).
// Returns HTML whose Open Graph tags point at the unique /api/og card image, so
// when someone shares their link, X/LinkedIn/etc. unfurl THAT person's card.
// Human visitors see the card image plus a CTA to run their own analysis.
// The payload never contains an email.

function decodePayload(d) {
  const b64 = String(d).replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(escape(atob(b64)));
  return JSON.parse(json);
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const fmt = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');

module.exports = function handler(req, res) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const base = `${proto}://${host}`;

  const url = new URL(req.url, base);
  const d = url.searchParams.get('d') || '';

  let p = null;
  try { p = decodePayload(d); } catch { p = null; }

  // Build OG metadata.
  let title = 'Am I Underpaid?';
  let description = "Find out if you're being paid what you're worth — free salary report in 10 seconds.";
  if (p && typeof p === 'object') {
    const gap = Math.abs(Number(p.g) || 0);
    if (p.v === 'underpaid') {
      title = `Underpaid by ${fmt(gap)} — ${esc(p.t || 'this role')}`;
      description = `${esc(p.t || 'This role')} in ${esc(p.c || 'their city')} is earning ${fmt(gap)} below market. Check yours free.`;
    } else if (p.v === 'overpaid') {
      title = `Paid ${fmt(gap)} above market — ${esc(p.t || 'this role')}`;
      description = `Above the market range for ${esc(p.t || 'this role')} in ${esc(p.c || 'their city')}. Check yours free.`;
    } else if (p.v === 'fairly_paid') {
      title = `Fairly paid — ${esc(p.t || 'this role')}`;
      description = `On target with the market for ${esc(p.t || 'this role')} in ${esc(p.c || 'their city')}. Check yours free.`;
    }
  }

  // Absolute image URL (so crawlers can fetch it).
  const ogImage = d ? `${base}/api/og?d=${encodeURIComponent(d)}` : `${base}/api/og`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(ogImage)}" />
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:#0A0A0A;color:#F0F0F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 16px;gap:24px;}
  img.card{width:100%;max-width:600px;border:1px solid #1E1E1E;border-radius:16px;}
  a.cta{background:#F0F0F0;color:#000;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:10px;}
  a.cta:hover{opacity:.88;}
  p.sub{color:#888;font-size:14px;}
</style>
</head>
<body>
  <img class="card" src="${esc(ogImage)}" alt="Salary report card" />
  <a class="cta" href="${base}/">Check your salary — free →</a>
  <p class="sub">Real BLS data + AI · estimates only, not financial advice</p>
</body>
</html>`);
};
