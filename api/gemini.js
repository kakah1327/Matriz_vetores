// Proxy serverless: mantém a chave do Gemini no servidor, nunca exposta ao navegador.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor' });
    return;
  }

  const { prompt, mediaType, base64 } = req.body || {};
  if (!prompt || !mediaType || !base64) {
    res.status(400).json({ error: 'Parâmetros inválidos: prompt, mediaType e base64 são obrigatórios' });
    return;
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mediaType, data: base64 } }
            ]
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 1000 }
        })
      }
    );

    const data = await geminiResponse.json();
    res.status(geminiResponse.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Falha ao contatar a API do Gemini' });
  }
}
