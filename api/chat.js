export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const messages = req.body.messages || [];
    const maxTokens = req.body.max_tokens || 4000;

    // Try models in order — if one fails, try the next
    const models = [
      'meta-llama/llama-3.1-8b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
      'openrouter/auto'
    ];

    let lastError = 'All models failed';

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

        // Safe parse — check if response is actually JSON
        const rawText = await openRouterRes.text();
        let data;
        try {
          data = JSON.parse(rawText);
        } catch {
          lastError = `Model ${model} returned non-JSON response`;
          continue; // try next model
        }

        if (!openRouterRes.ok || !data?.choices?.[0]?.message?.content) {
          lastError = data?.error?.message || `Model ${model} failed`;
          continue; // try next model
        }

        const text = data.choices[0].message.content;
        return res.status(200).json({
          content: [{ type: 'text', text }]
        });

      } catch (modelErr) {
        lastError = modelErr.message;
        continue;
      }
    }

    // All models failed
    return res.status(503).json({ error: { message: lastError } });

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: { message: err.message } });
  }
}
