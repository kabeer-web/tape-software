// Vercel serverless function — runs on the server, never in the browser, so
// the xAI (Grok) API key stays hidden. Set XAI_API_KEY in Vercel Project
// Settings → Environment Variables. Optionally set XAI_MODEL to override
// the default model.
//
// Frontend calls: POST /api/ai-bill  { prompt, billType, brands, plyOptions, cartonSizeOptions }
// Returns: parsed JSON straight from the model (see the schema instructions
// below) — the frontend turns that into `rows` for the invoice being edited.

const JAMBO_CATEGORIES = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam','Lemon'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'XAI_API_KEY is not configured on the server (Vercel → Settings → Environment Variables).' });
    return;
  }

  const { prompt, billType, brands, plyOptions, cartonSizeOptions } = req.body || {};
  if (!prompt || !billType) {
    res.status(400).json({ error: 'prompt and billType are required' });
    return;
  }

  const schema = billType === 'Sale'
    ? `Return JSON: { "items": [...], "partyName"?: string, "billNo"?: string }
Each item in "items":
{
  "sizeMm": string (optional),
  "sizeInch": string (optional),
  "yards": string (optional),
  "colour": string,
  "brand": string,
  "micron": string,
  "totalCarton": number,
  "perCtnQty": number,
  "rate": number
}
Don't compute totalQty/total — the app does that (totalQty = totalCarton × perCtnQty, total = totalQty × rate).`
    : `Return JSON: { "items": [...], "supplierName"?: string, "chalanNo"?: string }
Each item in "items" is ONE of these three shapes, chosen by category:
Core:   { "mainCategory":"Core", "brand": string, "side": "Single"|"Double", "ply": string, "weight": number, "qty": number, "rate": number }
Carton: { "mainCategory":"Carton", "brand": string, "cartonType": "Small"|"Large", "size": string, "weight": number, "qty": number, "rate": number }
Jambo:  { "mainCategory":"Jambo", "jamboCategory": one of [${JAMBO_CATEGORIES.join(', ')}], "micron": string, "width": string, "color": string (optional), "weight": number, "qty": number, "rate": number }
"weight" is in KG, "qty" is piece count. Amount for every item = weight × qty × rate. If the user doesn't mention a weight, use 1 for weight (so amount just becomes qty × rate). Don't compute "amount" yourself — the app does that.`;

  const systemPrompt = `Tum ek tape/packaging factory ke billing assistant ho, jo user ke Roman Urdu/Hindi ya English free-text description se bill ke items nikalte ho.
${schema}
Known existing brands (agar prompt mein koi brand mile jo is list mein hai to wahi spelling use karo, warna jo user ne likha wahi use karo): ${(brands||[]).join(', ') || 'abhi koi nahi'}.
Ply options: ${(plyOptions||[]).join(', ') || 'N/A'}. Carton sizes: ${(cartonSizeOptions||[]).join(', ') || 'N/A'}.
Agar koi zaroori field prompt mein clear nahi hai to reasonable best-guess karo — kabhi bhi required field khali mat chodo (sirf color/chalanNo/billNo jaise optional fields khali reh sakte hain).
Agar user ek se zyada item ka zikar kare (jaise "Bell 5 large aur Tesco 3 small"), to har ek alag item ke tor par array mein daalo.
STRICT RULE: sirf valid JSON return karo — nka koi exktra text, na markdown code fences, na explanation.`;

  try {
    const upstream = await fetch('api not working', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || 'grok-3-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      res.status(502).json({ error: `xAI error (${upstream.status}): ${errText.slice(0, 500)}` });
      return;
    }

    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      res.status(502).json({ error: 'xAI returned no content' });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      res.status(502).json({ error: 'AI ne valid JSON nahi diya, dobara try karo.' });
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}