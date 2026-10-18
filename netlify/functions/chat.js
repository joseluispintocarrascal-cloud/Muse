exports.handler = async (ev) => {
  const ok = (text) => ({ statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
  if (ev.httpMethod !== 'POST') return { statusCode: 405, body: '' };
  try {
    if (!process.env.GEMINI_API_KEY) return ok('[triste] Falta la clave de Gemini en Netlify.');
    const b = JSON.parse(ev.body || '{}');
    const m = (b.messages || []).slice(-16);
    while (m.length && m[0].role !== 'user') m.shift();
    const contents = m.map(x => ({ role: x.role === 'assistant' ? 'model' : 'user', parts: [{ text: x.content }] }));
    const payload = { contents, generationConfig: { maxOutputTokens: 2000, temperature: 0.8 } };
    if (b.system) payload.system_instruction = { parts: [{ text: String(b.system).slice(0, 4000) }] };
    const tries = [['gemini-3.5-flash', 6000], ['gemini-3.5-flash-lite', 3500]];
    let last = 'Sin respuesta';
    for (const [model, ms] of tries) {
      try {
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(ms)
        });
        const d = await r.json();
        if (!r.ok) { last = 'Error de Gemini ' + r.status + ': ' + String((d.error && d.error.message) || '').slice(0, 140); continue; }
        const text = (((d.candidates || [])[0] || {}).content || { parts: [] }).parts.map(p => p.text || '').join('');
        if (text) return ok(text);
        last = 'Gemini no devolvió respuesta.';
      } catch (e) { last = 'Tiempo de espera agotado (' + model + ').'; }
    }
    return ok('[triste] ' + last);
  } catch (e) { return ok('[triste] Error en la función: ' + String(e).slice(0, 120)); }
};
