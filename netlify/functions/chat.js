exports.handler = async (ev) => {
  if (ev.httpMethod !== 'POST') return { statusCode: 405, body: '' };
  try {
    const m = ((JSON.parse(ev.body || '{}')).messages || []).slice(-12);
    while (m.length && m[0].role !== 'user') m.shift();
    const contents = m.map(x => ({ role: x.role === 'assistant' ? 'model' : 'user', parts: [{ text: x.content }] }));
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 300 } })
    });
    const d = await r.json();
    if (!r.ok) return { statusCode: 502, body: JSON.stringify({ error: d }) };
    const text = (((d.candidates || [])[0] || {}).content || { parts: [] }).parts.map(p => p.text || '').join('');
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) };
  } catch (e) { return { statusCode: 500, body: JSON.stringify({ error: String(e) }) }; }
};
