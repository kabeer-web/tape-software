// Vercel serverless function — runs on the server, never in the browser, so
// the Groq API key stays hidden. Set GROQ_API_KEY in Vercel Project
// Settings → Environment Variables (get a free key at console.groq.com —
// no credit card needed). Optionally set GROQ_MODEL to override the model.
//
// Frontend calls: POST /api/ai-bill  { prompt, billType, brands, plyOptions, cartonSizeOptions, existingItems }
// Returns: { operations: [...], partyName?, billNo? }
//
// IMPORTANT DESIGN NOTE: this used to ask the model to return the FULL,
// final item list every time (existing + edited + new, minus deleted).
// That was fragile — the model would sometimes drop, duplicate, or
// mis-transcribe untouched items when re-stating a long list, so a bill
// could silently lose or corrupt entries it was never even asked to touch.
// Now the model only describes WHAT CHANGED — a small list of operations
// ("add this new item", "edit entry 3 to X", "delete entry 2") — and the
// frontend applies those operations to its own existing rows array. Items
// the user didn't mention are never re-transcribed by the model, so they
// can't be corrupted by it.

const JAMBO_CATEGORIES = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam','Lemon'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server (Vercel → Settings → Environment Variables). Free key: console.groq.com' });
    return;
  }

  const { prompt, billType, brands, plyOptions, cartonSizeOptions, existingItems } = req.body || {};
  if (!prompt || !billType) {
    res.status(400).json({ error: 'prompt and billType are required' });
    return;
  }

  const itemSchema = billType === 'Sale'
    ? `{
  "sizeMm": string (optional — e.g. "1280"),
  "sizeInch": string (optional — ALWAYS include the inch mark, e.g. "1/2\\"", "1\\"", "2\\"", "3\\"", "4\\"", "6\\""),
  "yards": string (optional),
  "colour": string,
  "brand": string,
  "micron": string,
  "totalCarton": number,
  "perCtnQty": number,
  "rate": number
}
Don't compute totalQty/total — the app does that.`
    : `ONE of these three shapes, chosen by category:
Core:   { "mainCategory":"Core", "brand": string, "side": "Single"|"Double", "ply": string, "weight": number, "qty": number, "rate": number }
Carton: { "mainCategory":"Carton", "brand": string, "cartonType": "Small"|"Large", "size": string, "weight": number, "qty": number, "rate": number }
Jambo:  { "mainCategory":"Jambo", "jamboCategory": one of [${JAMBO_CATEGORIES.join(', ')}], "micron": string, "width": string, "color": string (optional), "weight": number, "qty": number, "rate": number }
"weight" is in KG, "qty" is piece count. Don't compute "amount" — the app does that. If the user doesn't mention a weight, use 1.`;

  const existingItemsBlock = (existingItems && existingItems.length)
    ? `\n\nBill mein already ye items hain (number se refer karo agar user kisi existing item ko edit ya delete karne ko kahe):\n${JSON.stringify(existingItems, null, 0)}`
    : '\n\nBill abhi khali hai — jo bhi user bole, wo sab "add" operations honge.';

  const systemPrompt = `Tum ek tape/packaging factory ke billing assistant ho, jo user ke Roman Urdu/Hindi ya English free-text instruction ko bill operations mein badalte ho.

Return JSON EXACTLY in this shape:
{
  "operations": [
    { "type": "add", "item": <ek item object, iska shape neeche diya hai> },
    { "type": "edit", "targetNumber": <entry number>, "item": <sirf wo fields jo badalni hain> },
    { "type": "delete", "targetNumber": <entry number> }
  ],
  "partyName"?: string,
  "billNo"?: string
}

Each "item" object (for "add" and "edit" operations) has this shape:
${itemSchema}

RULES:
- Agar user sirf naya item bata raha hai (koi entry number ka zikar nahi) → ek ya zyada "add" operations do, ek item ke liye ek operation.
- Agar user kisi existing entry ka number leke usmein tabdeeli maange ("entry 3 ka rate 20 kar do") → EK "edit" operation do, targetNumber us entry ka number, aur "item" mein SIRF wahi fields do jo badli hain (baaki fields chodo — mat bhejo).
- Agar user kisi entry ko hatane ko kahe ("entry 2 delete karo", "2nd wala hata do") → EK "delete" operation do, sirf targetNumber ke sath, "item" ki zaroorat nahi.
- Ek hi prompt mein multiple operations ho sakte hain (jaise "entry 2 delete karo aur Tesco 5 large add karo") — dono operations array mein daal do.
- Kabhi bhi kisi aisi entry ko mat chuna jiska zikar user ne nahi kiya — sirf jo directly mention ho ya jo naya add karna ho, uske operations do.
- Koi bhi zaroori field clear nahi hai to reasonable best-guess karo (sirf color/chalanNo/billNo jaise optional fields khali reh sakte hain).
Known existing brands (agar prompt mein koi brand mile jo is list mein hai to wahi spelling use karo, warna jo user ne likha wahi use karo): ${(brands||[]).join(', ') || 'abhi koi nahi'}.
Ply options: ${(plyOptions||[]).join(', ') || 'N/A'}. Carton sizes: ${(cartonSizeOptions||[]).join(', ') || 'N/A'}.${existingItemsBlock}
STRICT RULE: sirf valid JSON return karo — na koi extra text, na markdown code fences, na explanation.`;

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
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
      res.status(502).json({ error: `Groq error (${upstream.status}): ${errText.slice(0, 500)}` });
      return;
    }

    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      res.status(502).json({ error: 'Groq returned no content' });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      res.status(502).json({ error: 'AI ne valid JSON nahi diya, dobara try karo.' });
      return;
    }

    // Defensive normalization: some models occasionally wrap a single
    // operation as a bare object, or return "items" instead of
    // "operations" out of habit. Coerce into the expected shape rather
    // than failing the whole request over a shape mismatch.
    if (!Array.isArray(parsed.operations)) {
      if (Array.isArray(parsed.items)) {
        parsed.operations = parsed.items.map(item => ({ type: 'add', item }));
      } else {
        parsed.operations = [];
      }
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
