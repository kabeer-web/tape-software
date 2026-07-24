import { useState } from 'react';
import { Bot, X, Sparkles, Loader2 } from 'lucide-react';

// Button + prompt modal for AI-generating bill rows from a free-text
// description. Calls the /api/ai-bill serverless function (keeps the xAI
// key server-side — see api/ai-bill.js) and hands the raw parsed result
// back to the caller via onResult, since Sale and Purchase items have
// different shapes and each invoice knows how to turn that into its own
// `rows`. This never saves anything by itself — it only fills the form,
// same as if you'd typed it in yourself, so you can review/edit before
// hitting Save Bill.
export default function AIBillAssistant({ billType, context, onResult }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/ai-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, billType, ...context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request fail ho gayi');
      onResult(data);
      setPrompt('');
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="AI se bill items generate karo"
        className="flex items-center gap-2 bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600/30 px-4 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wide transition"
      >
        <Bot size={14}/> AI Bill
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-[#111] border border-purple-500/30 rounded-2xl p-6 w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-black text-white flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400"/> AI Bill Assistant
              </p>
              <button onClick={() => !loading && setOpen(false)} className="text-gray-500 hover:text-white">
                <X size={18}/>
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mb-4">Jaisा bolte ho waisा likh do, AI bill ke items bana dega.</p>

            <textarea
              autoFocus
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={billType === 'Sale'
                ? 'e.g. Tesco ko 2 inch 48mm colour red 3 carton, 24 per carton, rate 15 par sale karo'
                : 'e.g. Bell se 5 large carton 12 inch, qty 10, rate 50, weight 20kg purchase kya'}
              rows={4}
              disabled={loading}
              className="w-full bg-black/40 p-3 rounded-xl border border-white/10 outline-none text-sm text-white resize-none mb-3 disabled:opacity-50"
            />

            {error && <p className="text-red-400 text-xs mb-3">❌ {error}</p>}

            <button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition"
            >
              {loading ? <><Loader2 size={16} className="animate-spin"/> Ban raha hai...</> : 'Generate'}
            </button>

            <p className="text-[10px] text-gray-500 mt-3">AI kabhi galti bhi kar sakta hai — Save karne se pehle rows check kar lena.</p>
          </div>
        </div>
      )}
    </>
  );
}