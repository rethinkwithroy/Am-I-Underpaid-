# Am I Underpaid?

Find out if you're being paid what you're worth. Enter your job details (optionally upload a
resume PDF) and get an AI-generated salary report card in ~10 seconds, grounded in real
**Bureau of Labor Statistics (BLS OES)** data. One-click sharing to X and LinkedIn.

- **No framework** — vanilla HTML/CSS/JS, no build step.
- **No database required** — fully stateless by default (Supabase persistence is optional).
- **Cheap AI** — defaults to DeepSeek; Qwen and Groq are drop-in alternates.

## Deploy in one click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frethinkwithroy%2FAm-I-Underpaid-&env=AI_PROVIDER,DEEPSEEK_API_KEY&envDescription=Set%20AI_PROVIDER%20to%20deepseek%20and%20paste%20your%20DeepSeek%20API%20key&envLink=https%3A%2F%2Fplatform.deepseek.com)

Clicking the button imports this repo into Vercel and prompts you for two environment
variables (`AI_PROVIDER=deepseek` and your `DEEPSEEK_API_KEY`). That's the whole deploy.

---

## Architecture

```
public/index.html      Full landing page + app (all CSS/JS inline)
api/analyze.js         Serverless function: validation, BLS fetch, AI call, capture
api/og.js              Dynamic per-result OG card image (PNG via @vercel/og)
api/share.js           Per-result share page (/s) with unique OG meta tags
lib/soc-codes.js       Job title → BLS SOC code lookup
lib/bls.js             BLS OES API helper
lib/ai.js              AI provider abstraction (DeepSeek / Qwen / Groq)
lib/rate-limit.js      In-memory rate limiter (cost-abuse protection)
lib/sheets.js          Optional Google Sheets + Drive capture (consent-gated)
apps-script/Code.gs    Google Apps Script to paste into your Sheet
vercel.json            Routes, function config + security headers
```

---

## Setup

1. **Get an AI key** (pick one, free tiers available):
   - **DeepSeek** (default) — https://platform.deepseek.com → `DEEPSEEK_API_KEY`
   - **Qwen / Alibaba DashScope** — https://dashscope.console.aliyun.com → `QWEN_API_KEY`
   - **Groq** — https://console.groq.com → `GROQ_API_KEY`
2. Copy `.env.example` → `.env` and fill in your key. Set `AI_PROVIDER` to `deepseek`,
   `qwen`, or `groq`.
3. **Deploy to Vercel:**
   - Push to GitHub, import the repo on [vercel.com](https://vercel.com).
   - In **Project Settings → Environment Variables**, add your key(s) and `AI_PROVIDER`.
   - Deploy. `APP_URL` resolves automatically from the deployment — no manual edit needed.

### Local development

```bash
npm i -g vercel
vercel dev      # http://localhost:3000
```

---

## Choosing / switching the AI model

Set two env vars — that's it:

| Provider | `AI_PROVIDER` | Default model            | Notes                                  |
|----------|---------------|--------------------------|----------------------------------------|
| DeepSeek | `deepseek`    | `deepseek-v4-flash`      | Cheap, strong. **Default.**            |
| Qwen     | `qwen`        | `qwen-plus`              | Alibaba DashScope, OpenAI-compatible.  |
| Groq     | `groq`        | `llama-3.1-8b-instant`   | Fast free tier (14,400 req/day).       |

Override the model for any provider with `AI_MODEL` (e.g. `qwen-turbo`, `deepseek-chat`,
`llama-3.3-70b-versatile`). DeepSeek's legacy `deepseek-chat` alias is deprecated after
2026-07-24, so the default is pinned to `deepseek-v4-flash`.

---

## Cost

- **BLS API:** free, no key required.
- **DeepSeek / Qwen / Groq:** all have free tiers or sub-cent per-analysis pricing
  (~$0.0001–0.0005 per report). Target is well under $0.001 per analysis.

---

## Security & privacy

This app is built so **no one can access your tokens** and user data is handled safely:

- **Keys never reach the browser.** All AI keys and the Sheets webhook URL are read from
  server-side environment variables inside the serverless function only. Nothing secret is in
  `public/index.html`.
- **`.env` is git-ignored.** Only `.env.example` (placeholders) is committed.
- **Input validation & size caps** on every field; resume text is hard-capped and the resume
  file upload is size-limited.
- **Rate limiting** per IP guards the AI key against cost-abuse.
- **Origin enforcement** — the API only answers same-origin requests (plus any origins you
  explicitly allow via `ALLOWED_ORIGINS`).
- **Security headers** (CSP, HSTS, `nosniff`, frame-ancestors none, etc.) via `vercel.json`.
- **No HTML injection** — model output is rendered with `textContent`; the share page
  HTML-escapes all injected values.
- **Email is private.** It is never placed in the share URL, the OG card, or the share page —
  only stored (with consent) for sending opportunities.
- **Consent-gated capture.** Data and resumes are saved *only* when the user ticks the box.

### Per-result social share card

Each analysis produces a unique share link `…/s?d=<encoded result>`:

- `api/share.js` serves that URL with per-result Open Graph tags so X/LinkedIn unfurl the
  right card, and shows a human-friendly card + CTA.
- `api/og.js` renders the card as a 1200×630 PNG on the fly (via `@vercel/og`).
- The encoded payload contains only role/city/salary/range/verdict — **never the email.**

### Optional data storage — Google Sheets + Drive

Capture is **off** unless you configure it, and only fires with user consent.

1. Create a Google Sheet → **Extensions → Apps Script**.
2. Paste [`apps-script/Code.gs`](apps-script/Code.gs); set `SECRET_TOKEN` (and optionally a
   `DRIVE_FOLDER_ID` to store resume PDFs).
3. **Deploy → New deployment → Web app** (Execute as *Me*, Access *Anyone*). Copy the URL.
4. In Vercel, set `SHEETS_WEBHOOK_URL` (the Web app URL) and `SHEETS_WEBHOOK_TOKEN` (the same
   `SECRET_TOKEN`).

How it stays secure:

- The site posts to the webhook **server-side only** — the browser never sees the URL.
- The shared `SHEETS_WEBHOOK_TOKEN` is checked by the script, so guessing the URL isn't enough.
- The script runs as you, so no Google Cloud service account or key files are needed.

---

## Customize

- Add SOC mappings in `lib/soc-codes.js`.
- Tune the rate limit window in `lib/rate-limit.js`.
- Adjust stored columns in `lib/sheets.js` + `apps-script/Code.gs`.
- Restyle the share card in `api/og.js`.

> Estimates are AI-assisted and for informational purposes only — not financial advice.
