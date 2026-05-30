export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    // Extract the prompt from Anthropic-style request body
    const messages = req.body.messages || [];
    const promptText = messages.map(m =>
      typeof m.content === 'string' ? m.content : ''
    ).join('\n');

    const maxTokens = req.body.max_tokens || 4000;

    // Call Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { maxOutputTokens: maxTokens }
        })
      }
    );

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      const errMsg = geminiData?.error?.message || 'Gemini API error';
      return res.status(geminiRes.status).json({ error: { message: errMsg } });
    }

    // Convert Gemini response → Anthropic format so lucid.html needs no changes
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: { message: err.message } });
  }
}
