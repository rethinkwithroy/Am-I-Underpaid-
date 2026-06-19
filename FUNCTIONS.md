# Functionality Tracker

Status of each piece of the app, so we can build/verify them one at a time.

Legend: ✅ done · 🟡 built, not yet verified end-to-end with real keys · ⬜ not started

---

## UI / Frontend
- ✅ Landing page layout (header, form card, footer) — reviewed via screenshots
- ✅ Form fields (title, salary, experience, city, industry, company size)
- ✅ Result card (verdict, gap number, stat boxes, skills, summary, sources)
- ✅ Dark theme + verdict colors (underpaid / fairly_paid / overpaid)
- ✅ Mobile responsive (single column < 480px) — reviewed via screenshots
- ✅ Loading state (animated dots) — built, not yet seen live
- 🟡 PDF resume upload + client-side text extraction (PDF.js) — built, untested with a real PDF
- 🟡 Section switching (form → loading → result) — logic built, untested in a real browser flow

## Sharing
- 🟡 Share on X — built, not clicked live
- 🟡 Share on LinkedIn (copy + open) — built, not clicked live
- 🟡 Copy text button — built, not clicked live
- ⬜ **Dynamic OG share image** — design mocked (`.preview/og-card.png`), NOT wired up.
      Today only the catchy text line + a static link card are shared. To make the
      personalized result render as an image in the social unfurl we need:
      (a) an `/api/og` image-generation endpoint, and
      (b) per-result OG tags (encode result in the share URL).

## Backend / API (`/api/analyze`)
- 🟡 Request validation + error responses — unit-tested with mocks ✅, not run on Vercel
- 🟡 SOC code lookup (`lib/soc-codes.js`) — unit-tested ✅
- 🟡 BLS OES salary fetch (`lib/bls.js`) — NOT tested against the real BLS API yet
- 🟡 AI call (`lib/ai.js`, DeepSeek default) — mock-tested ✅, NOT called with a real key yet
- 🟡 End-to-end analyze flow — mock-tested ✅, not run live

## AI providers
- 🟡 DeepSeek (default) — needs real `DEEPSEEK_API_KEY` to verify
- ⬜ Qwen — code path ready, never exercised
- ⬜ Groq — code path ready, never exercised

## Security
- ✅ Keys server-side only (verified by inspection)
- ✅ Origin/CORS enforcement — unit-tested (403 on bad origin)
- ✅ Rate limiting — unit-tested (429 after limit)
- ✅ Input validation + size caps — unit-tested (400 on missing fields)
- ✅ Security headers + CSP (`vercel.json`) — NOT yet verified on a live deploy
- ✅ No-innerHTML rendering of model output

## Data storage (Supabase, optional)
- 🟡 `supabase/schema.sql` (table + RLS) — written, not run on a real project
- 🟡 Server-side insert (`lib/supabase.js`) — written, never executed against real Supabase

## Deployment
- ⬜ Live Vercel deployment + public URL
- ⬜ Env vars set in Vercel (AI key, AI_PROVIDER, optional Supabase)
- ⬜ Verify security headers live
- ⬜ Verify real BLS + AI round-trip on production

---

## Suggested order to tackle next
1. Deploy to Vercel to get a live URL (so we can click through the real flow).
2. Add a DeepSeek key → verify the end-to-end analyze round-trip.
3. Verify BLS returns real numbers for a few job titles.
4. Test PDF resume upload with a real resume.
5. Test the three share buttons.
6. (Optional) Wire up Supabase and confirm a row is written.
