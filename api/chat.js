export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const messages = req.body.messages || [];
    const maxTokens = req.body.max_tokens || 4000;

    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://lucidwrites.vercel.app',
        'X-Title': 'Lucid'
      },
      body: JSON.stringify({
        model: 'openrouter/auto',
        messages: messages,
        max_tokens: maxTokens
      })
    });

    const data = await openRouterRes.json();

    if (!openRouterRes.ok) {
      const errMsg = data?.error?.message || 'OpenRouter API error';
      return res.status(openRouterRes.status).json({ error: { message: errMsg } });
    }

    // Convert to Anthropic format so lucid.html needs no changes
    const text = data?.choices?.[0]?.message?.content || '';
    return res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: { message: err.message } });
  }
}

