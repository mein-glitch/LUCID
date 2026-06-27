export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const messages = req.body.messages || [];
    const maxTokens = req.body.max_tokens || 4000;

    // 6 fallback models — tries each in order until one works
    const models = [
      'meta-llama/llama-3.3-70b-instruct:free',
      'meta-llama/llama-3.1-8b-instruct:free',
      'google/gemma-2-9b-it:free',
      'mistralai/mistral-7b-instruct:free',
      'qwen/qwen-2-7b-instruct:free',
      'openrouter/auto'
    ];

    let lastError = 'All models are currently unavailable. Please try again in a moment.';

    for (const model of models) {
      try {
        const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://lucidwrites.vercel.app',
            'X-Title': 'Lucid'
          },
          body: JSON.stringify({ model, messages, max_tokens: maxTokens })
        });

        // Safe parse — never crash on HTML error pages
        const rawText = await openRouterRes.text();
        let data;
        try {
          data = JSON.parse(rawText);
        } catch {
          lastError = `Model unavailable, trying next...`;
          continue;
        }

        const content = data?.choices?.[0]?.message?.content;
        if (!openRouterRes.ok || !content) {
          lastError = data?.error?.message || 'Model failed, trying next...';
          continue;
        }

        return res.status(200).json({
          content: [{ type: 'text', text: content }]
        });

      } catch (modelErr) {
        lastError = modelErr.message;
        continue;
      }
    }

    return res.status(503).json({ error: { message: lastError } });

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: { message: err.message } });
  }
}
