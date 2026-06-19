// Dynamic Open Graph card image — one unique PNG per result.
// Reads the encoded result from ?d= (same payload the /s share page uses) and
// renders a 1200x630 PNG that social platforms show when the link is shared.
// The payload NEVER contains the user's email.

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const COLORS = { underpaid: '#FF4444', fairly_paid: '#22C55E', overpaid: '#A78BFA' };

function decodePayload(d) {
  const b64 = String(d).replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(escape(atob(b64)));
  return JSON.parse(json);
}

const fmt = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
const fmtK = (n) => '$' + Math.round((Number(n) || 0) / 1000) + 'K';
const clip = (s, n) => (String(s || '').length > n ? String(s).slice(0, n - 1) + '…' : String(s || ''));

const node = (style, children) => ({ type: 'div', props: { style, children } });

export default function handler(req) {
  let p = null;
  try {
    const { searchParams } = new URL(req.url);
    p = decodePayload(searchParams.get('d'));
  } catch {
    p = null;
  }
  if (!p || typeof p !== 'object') {
    p = { v: 'underpaid', g: 0, s: 0, lo: 0, hi: 0, md: 0, t: 'Your role', c: '', sl: 'Mid' };
  }

  const verdict = COLORS[p.v] ? p.v : 'underpaid';
  const color = COLORS[verdict];
  const gap = Math.abs(Number(p.g) || 0);

  const verdictText =
    verdict === 'underpaid' ? "YOU'RE UNDERPAID" : verdict === 'overpaid' ? 'ABOVE MARKET' : 'FAIRLY PAID';
  const gapLabel =
    verdict === 'fairly_paid' ? 'on target with the market'
    : verdict === 'overpaid' ? 'above market per year'
    : 'below market per year';
  const bigNumber = verdict === 'fairly_paid' ? 'On Target' : fmt(gap);

  const labelParts = ['SALARY REPORT', clip(p.t, 34), clip(p.c, 24)].filter(Boolean);

  const box = (k, v) =>
    node(
      { display: 'flex', flexDirection: 'column', background: '#111111', border: '1px solid #1E1E1E', borderRadius: 16, padding: '20px 26px' },
      [
        node({ fontSize: 18, color: '#888888', marginBottom: 6 }, k),
        node({ fontSize: 30, fontWeight: 700, color: '#F0F0F0' }, v),
      ]
    );

  const tree = node(
    {
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: '#0A0A0A',
      color: '#F0F0F0',
      padding: '70px 80px',
      fontFamily: 'sans-serif',
    },
    [
      // brand
      node({ display: 'flex', fontSize: 26, fontWeight: 700 }, [
        node({ color: '#F0F0F0' }, 'Am I Underpaid'),
        node({ color: color }, '?'),
      ]),
      // main block
      node({ display: 'flex', flexDirection: 'column' }, [
        node({ fontSize: 20, letterSpacing: 2, color: '#888888', marginBottom: 16 }, labelParts.join('   ·   ').toUpperCase()),
        node({ fontSize: 34, fontWeight: 700, letterSpacing: 1, color: color, marginBottom: 6 }, verdictText),
        node({ fontSize: verdict === 'fairly_paid' ? 96 : 140, fontWeight: 800, letterSpacing: -4, color: color, lineHeight: 1 }, bigNumber),
        node({ fontSize: 28, color: '#888888', marginTop: 14 }, gapLabel),
      ]),
      // stats
      node({ display: 'flex', gap: 24 }, [
        box('Your salary', fmt(p.s)),
        box('Market range', fmtK(p.lo) + '–' + fmtK(p.hi)),
        box('Market median', fmt(p.md)),
      ]),
      // footer
      node({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, [
        node({ fontSize: 18, color: '#4A4A4A' }, 'Based on Glassdoor · LinkedIn Salary · BLS OES'),
        node({ display: 'flex', fontSize: 20, color: '#888888' }, [
          node({ color: '#F0F0F0', fontWeight: 700 }, 'Check yours free →'),
        ]),
      ]),
    ]
  );

  return new ImageResponse(tree, {
    width: 1200,
    height: 630,
    headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
