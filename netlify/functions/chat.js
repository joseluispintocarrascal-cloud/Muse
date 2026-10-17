
exports.handler = async (ev) => {
  const ok = (text) => ({ statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
  if (ev.httpMethod !== 'POST') return { statusCode: 405, body: '' };
  try {
    if (!process.env.GEMINI_API_KEY) return ok('[triste] Falta la clave de Gemini en Netlify.');
    const m = ((JSON.parse(ev.body || '{}')).messages || []).slice(-12);
    while (m.length && m[0].role !== 'user') m.shift();
    const contents = m.map(x => ({ role: x.role === 'assistant' ? 'model' : 'user', parts: [{ text: x.content }] }));
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 300 } })
    });
    const d = await r.json();
    if (!r.ok) return ok('[triste] Error de Gemini ' + r.status + ': ' + String((d.error && d.error.message) || '').slice(0, 140));
    const text = (((d.candidates || [])[0] || {}).content || { parts: [] }).parts.map(p => p.text || '').join('');
    return ok(text || '[triste] Gemini no devolvió respuesta.');
  } catch (e) { return ok('[triste] Error en la función: ' + String(e).slice(0, 120)); }
};
