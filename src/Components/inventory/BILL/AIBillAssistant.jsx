import { useState } from 'react';
import { Bot, X, Sparkles, Send } from 'lucide-react';

// Button + prompt modal for AI-managing bill rows from a free-text
// instruction — add new items, edit an existing numbered entry, or delete
// one, all in one go. Calls the /api/ai-bill serverless function (keeps
// the Groq key server-side — see api/ai-bill.js) and hands the raw parsed
// result back to the caller via onResult, since Sale and Purchase items
// have different shapes and each invoice knows how to apply add/edit/
// delete to its own `rows`. This never saves anything by itself — it only
// fills/updates the form, same as if you'd typed it in yourself, so you
// can review before hitting Save Bill.
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
      if (!res.ok) throw new Error(data.error || 'AI request failed');
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
        title="Manage this bill with AI"
        className="group flex items-center gap-2 bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600/30 px-4 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wide transition"
      >
        <Bot size={16} className="transition-transform group-hover:-rotate-6 group-hover:scale-110"/> AI Bill
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-gradient-to-b from-[#161020] to-[#0d0a13] border border-purple-500/30 rounded-3xl p-6 w-full max-w-lg shadow-2xl shadow-purple-950/50 relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Soft glow accents */}
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

            <button onClick={() => !loading && setOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition">
              <X size={18}/>
            </button>

            {/* Robot avatar — idle float, or a livelier bounce/spin while processing */}
            <div className="flex flex-col items-center mb-5">
              <div className={`relative w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mb-3 ${loading ? 'animate-bounce' : 'animate-[float_3s_ease-in-out_infinite]'}`}>
                <Bot size={30} className={`text-purple-300 ${loading ? 'animate-pulse' : ''}`}/>
                {loading && (
                  <>
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-fuchsia-400 rounded-full animate-ping"/>
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-fuchsia-400 rounded-full"/>
                  </>
                )}
              </div>
              <p className="font-black text-white flex items-center gap-1.5 text-sm">
                <Sparkles size={14} className="text-purple-400"/> AI Bill Assistant
              </p>
              <p className="text-[11px] text-gray-500 mt-1 text-center">
                {loading ? 'Reading your bill and working on it...' : 'Add, edit, or delete entries just by describing what you want.'}
              </p>
            </div>

            <textarea
              autoFocus
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={billType === 'Sale'
                ? 'e.g. Sell 3 cartons of Tesco 2 inch 48mm red, 24 per carton, rate 15 — or "change entry 2 rate to 20", or "delete entry 1"'
                : 'e.g. Buy 5 large cartons of Bell 12 inch, qty 10, rate 50, weight 20kg — or "change entry 2 qty to 8", or "delete entry 1"'}
              rows={4}
              disabled={loading}
              className="w-full bg-black/40 p-3 rounded-xl border border-white/10 outline-none text-sm text-white resize-none mb-3 disabled:opacity-50 focus:border-purple-500/50 transition"
            />

            {loading && (
              <div className="flex items-center justify-center gap-1.5 mb-3 h-4">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}

            {error && <p className="text-red-400 text-xs mb-3">❌ {error}</p>}

            <button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition"
            >
              {loading ? 'Working on it...' : <><Send size={14}/> Generate</>}
            </button>

            <p className="text-[10px] text-gray-500 mt-3 text-center">AI can make mistakes — review the rows before saving.</p>
          </div>

          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-6px); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
