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
api/analyze.js         Serverless function: validation, BLS fetch, AI call, persistence
lib/soc-codes.js       Job title → BLS SOC code lookup
lib/bls.js             BLS OES API helper
lib/ai.js              AI provider abstraction (DeepSeek / Qwen / Groq)
lib/rate-limit.js      In-memory rate limiter (cost-abuse protection)
lib/supabase.js        Optional secure analytics persistence
supabase/schema.sql    Table + Row Level Security policy
vercel.json            Function config + security headers
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
| DeepSeek | `deepseek`    | `deepseek-chat`          | Cheap, strong. **Default.**            |
| Qwen     | `qwen`        | `qwen-plus`              | Alibaba DashScope, OpenAI-compatible.  |
| Groq     | `groq`        | `llama-3.1-8b-instant`   | Fast free tier (14,400 req/day).       |

Override the model for any provider with `AI_MODEL` (e.g. `qwen-turbo`, `deepseek-chat`,
`llama-3.3-70b-versatile`).

---

## Cost

- **BLS API:** free, no key required.
- **DeepSeek / Qwen / Groq:** all have free tiers or sub-cent per-analysis pricing
  (~$0.0001–0.0005 per report). Target is well under $0.001 per analysis.

---

## Security & privacy

This app is built so **no one can access your tokens** and user data is handled safely:

- **Keys never reach the browser.** All AI / Supabase keys are read from server-side
  environment variables inside the serverless function only. Nothing secret is in
  `public/index.html`.
- **`.env` is git-ignored.** Only `.env.example` (placeholders) is committed.
- **Input validation & size caps** on every field; resume text is hard-capped and only used
  transiently for the prompt.
- **Rate limiting** per IP guards the AI key against cost-abuse.
- **Origin enforcement** — the API only answers same-origin requests (plus any origins you
  explicitly allow via `ALLOWED_ORIGINS`).
- **Security headers** (CSP, `X-Frame-Options`, HSTS, `nosniff`, etc.) via `vercel.json`.
- **No HTML injection** — model output is rendered with `textContent`, never `innerHTML`.
- **Resume never stored.** PDF parsing happens entirely in the browser; resume text is sent
  only for the analysis and is never written to any database.

### Optional secure data storage (Supabase)

Persistence is **off** unless you configure it. To store anonymous analytics:

1. Create a free project at [supabase.com](https://supabase.com).
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor. It creates the
   `analyses` table with **Row Level Security enabled and no public policies**.
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (the **service role** key) to your Vercel
   environment variables.

How it stays secure:

- Writes happen **server-side only** using the service role key, which bypasses RLS.
- The browser never talks to Supabase and never sees the key.
- Because RLS is on with no anon/authenticated policies, even a leaked anon key can't read or
  write the table.
- Only coarse, non-identifying fields are stored — **no resume text, name, email, or files.**

---

## Customize

- Add SOC mappings in `lib/soc-codes.js`.
- Tune the rate limit window in `lib/rate-limit.js`.
- Adjust the stored columns in `lib/supabase.js` + `supabase/schema.sql`.

> Estimates are AI-assisted and for informational purposes only — not financial advice.
