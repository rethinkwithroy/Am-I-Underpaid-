// Lightweight in-memory rate limiter to protect the AI key from cost-abuse.
//
// Note: serverless functions are ephemeral and may run as multiple instances, so
// this is a best-effort first line of defence (it caps bursts hitting a warm
// instance), not a global guarantee. For hard global limits, back it with a
// shared store (e.g. Supabase / Upstash). It is intentionally dependency-free.

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // per IP per window

const hits = new Map(); // ip -> number[] (timestamps)

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Returns { allowed, retryAfter } and records the hit when allowed.
function checkRateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    return { allowed: false, retryAfter };
  }

  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic cleanup so the map doesn't grow unbounded on a warm instance.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  return { allowed: true };
}

module.exports = { checkRateLimit };
