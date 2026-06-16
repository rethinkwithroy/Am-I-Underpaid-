// AI provider abstraction.
// All supported providers expose an OpenAI-compatible /chat/completions endpoint,
// so a single call shape works across them. The API key lives ONLY in server-side
// environment variables and is never sent to the browser.
//
// Select with AI_PROVIDER env: "deepseek" (default), "qwen", or "groq".
// Override the model with AI_MODEL env if desired.

const PROVIDERS = {
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    keyEnv: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    label: 'DeepSeek',
  },
  qwen: {
    // Alibaba DashScope OpenAI-compatible endpoint (international).
    url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    keyEnv: 'QWEN_API_KEY',
    defaultModel: 'qwen-plus',
    label: 'Qwen',
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    keyEnv: 'GROQ_API_KEY',
    defaultModel: 'llama-3.1-8b-instant',
    label: 'Groq',
  },
};

function resolveProvider() {
  const name = (process.env.AI_PROVIDER || 'deepseek').toLowerCase();
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unknown AI_PROVIDER "${name}". Use deepseek, qwen, or groq.`);
  }
  const apiKey = process.env[provider.keyEnv];
  if (!apiKey) {
    throw new Error(`Missing ${provider.keyEnv} for AI_PROVIDER "${name}".`);
  }
  return {
    ...provider,
    apiKey,
    model: process.env.AI_MODEL || provider.defaultModel,
  };
}

// Calls the selected provider and returns the parsed JSON object from the model.
// Throws on transport / auth / parse errors so the caller can map to a clean message.
async function callAI({ systemPrompt, userPrompt, timeoutMs = 15000 }) {
  const provider = resolveProvider();

  const res = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    // Read the body for server logs only — never returned to the client.
    const errText = await res.text().catch(() => '');
    const err = new Error(`AI provider ${provider.label} returned ${res.status}`);
    err.providerStatus = res.status;
    err.providerBody = errText.slice(0, 500);
    throw err;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from AI provider');

  return { result: JSON.parse(content), providerLabel: provider.label, model: provider.model };
}

module.exports = { callAI };
