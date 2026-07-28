// Vercel serverless function — runs on the server, never in the browser, so
// the Groq API key stays hidden. Set GROQ_API_KEY in Vercel Project
// Settings → Environment Variables (get a free key at console.groq.com —
// no credit card needed). Optionally set GROQ_MODEL to override the model.
//
// Frontend calls: POST /api/ai-bill
//   { prompt, billType, brands, plyOptions, cartonSizeOptions, entries }
//   `entries` is the CURRENT numbered list of rows already on the bill
//   (1-based, matching what's shown on screen) — lets the user say things
//   like "entry 3 ka rate 50 kar do" or "delete entry 2".
//
// Returns: { add: [...new items...], edit: [{entryNumber, changes}], delete: [entryNumber,...], partyName/supplierName?, billNo/chalanNo? }
// The frontend applies add/edit/delete against its own `rows` state.

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

  const { prompt, billType, brands, plyOptions, cartonSizeOptions, entries } = req.body || {};
  if (!prompt || !billType) {
    res.status(400).json({ error: 'prompt and billType are required' });
    return;
  }

  const itemShape = billType === 'Sale'
    ? `{
  "sizeMm": string (optional),
  "sizeInch": string (optional),
  "yards": string (optional),
  "colour": string,
  "brand": string,
  "micron": string,
  "totalCarton": number,
  "perCtnQty": number,
  "rate": number,
  "rateMode": "piece" | "carton" (optional, default "piece" — "carton" means the rate given is for one whole carton, not per individual piece)
}
Don't compute totalQty/total yourself — the app does that.`
    : `ONE of these three shapes, chosen by category:
Core:   { "mainCategory":"Core", "brand": string, "side": "Single"|"Double", "ply": string, "weight": number, "qty": number, "rate": number }
Carton: { "mainCategory":"Carton", "brand": string, "cartonType": "Small"|"Large", "size": string, "weight": number, "qty": number, "rate": number }
Jambo:  { "mainCategory":"Jambo", "jamboCategory": one of [${JAMBO_CATEGORIES.join(', ')}], "micron": string, "width": string, "color": string (optional), "weight": number, "qty": number, "rate": number }
"weight" is in KG, "qty" is piece count. Amount = weight × qty × rate. If no weight is mentioned, use 1. Don't compute "amount" yourself.`;

  const partyField = billType === 'Sale' ? 'partyName' : 'supplierName';
  const billNoField = billType === 'Sale' ? 'billNo' : 'chalanNo';

  const entriesBlock = (entries && entries.length)
    ? `\nCurrent entries already on this bill (1-based entryNumber, exactly as shown on screen):\n${JSON.stringify(entries)}\nIf the user refers to an entry by number (e.g. "entry 3", "3rd item", "entry number 2 delete karo"), use that exact entryNumber in "edit" or "delete". If they describe an entry by its details instead of a number, match it to the closest one in this list.`
    : '\nThere are no existing entries on this bill yet — anything the user describes should go in "add".';

  const systemPrompt = `Tum ek tape/packaging factory ke billing assistant ho, jo user ke Roman Urdu/Hindi ya English free-text instruction se bill manage karte ho — naye items add karna, maujooda entries edit karna, ya delete karna.

Return STRICTLY this JSON shape (omit keys that don't apply, don't invent extra ones):
{
  "add": [ ...zero or more NEW items, each shaped like: ${itemShape} ],
  "edit": [ { "entryNumber": number, "changes": { ...only the fields being changed, same shape as above... } } ],
  "delete": [ number, number, ... ],
  "${partyField}"?: string,
  "${billNoField}"?: string
}
${entriesBlock}

Known existing brands (agar prompt mein koi brand mile jo is list mein hai to wahi spelling use karo, warna jo user ne likha wahi use karo): ${(brands||[]).join(', ') || 'abhi koi nahi'}.
Ply options: ${(plyOptions||[]).join(', ') || 'N/A'}. Carton sizes: ${(cartonSizeOptions||[]).join(', ') || 'N/A'}.
Agar koi zaroori field naye item ke liye clear nahi hai to reasonable best-guess karo — required field kabhi khali mat chodo (sirf color/chalanNo/billNo jaise optional fields khali reh sakte hain).
Agar user ek se zyada naya item bataye, to har ek "add" array mein alag entry ke tor par daalo.
Edit karte waqt sirf wahi fields "changes" mein daalo jo user ne badalne ko kaha — baaki fields chhod do, app khud purani values ke sath merge kar legi.
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
      res.status(502).json({ error: 'AI did not return valid JSON — try rephrasing.' });
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
