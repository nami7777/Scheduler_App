// netlify/functions/chat.mjs
// Netlify function using ESM syntax. Node 18+ required (fetch is built-in).

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const API_KEY = process.env.GOOGLE_API_KEY;

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server misconfigured: GOOGLE_API_KEY missing' }),
      };
    }

    const { message, systemPrompt } = JSON.parse(event.body || '{}');
    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing message' }) };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        contents: [{ role: 'user', parts: [{ text: message }] }],
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      const msg = data?.error?.message || `Upstream error (${upstream.status})`;
      return { statusCode: upstream.status, body: JSON.stringify({ error: msg }) };
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('') || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e?.message || 'Server error' }),
    };
  }
}
