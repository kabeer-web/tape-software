import { useState } from 'react';
import { Bot, X, Sparkles, Send } from 'lucide-react';

// Button + prompt modal for AI-generating/editing bill rows from a
// free-text description. Calls the /api/ai-bill serverless function
// (keeps the Groq key server-side — see api/ai-bill.js).
//
// Beyond just adding new items, this also supports conversational
// editing of what's already on the bill — "change entry 3's rate to 20",
// "delete entry 2" — by sending the current `existingItems` (from
// `context`) along with the prompt. The API always replies with the full,
// final item list (existing + edited + new, minus deleted), so `onResult`
// should REPLACE the bill's rows with what comes back, not append to them.
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
      if (!res.ok) throw new Error(data.error || 'The AI request failed.');
      onResult(data);
      setPrompt('');
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasExisting = (context?.existingItems?.length || 0) > 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Add or edit bill items with AI"
        className="flex items-center gap-2 bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600/30 px-4 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wide transition"
      >
        <Bot size={14}/> AI Bill
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-[#0d0d0d] border border-purple-500/30 rounded-[1.75rem] p-6 w-full max-w-lg shadow-[0_0_60px_-15px_rgba(168,85,247,0.35)] relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* subtle glow accent */}
            <div className="absolute -top-24 -right-24 w-56 h-56 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-1 relative">
              <p className="font-black text-white flex items-center gap-2 text-lg">
                <span className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                  <Sparkles size={16} className="text-purple-400"/>
                </span>
                AI Bill Assistant
              </p>
              <button onClick={() => !loading && setOpen(false)} className="text-gray-500 hover:text-white transition">
                <X size={18}/>
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mb-4 relative">
              {hasExisting
                ? 'Describe a new item, or refer to an entry by its number to edit or delete it.'
                : 'Describe the item(s) in your own words — the AI will fill in the bill.'}
            </p>

            {loading ? (
              <RobotThinking />
            ) : (
              <>
                <textarea
                  autoFocus
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate(); }}
                  placeholder={
                    hasExisting
                      ? 'e.g. "change entry 3 rate to 20" or "delete entry 2" or "add Tesco 5 large carton rate 50"'
                      : billType === 'Sale'
                        ? 'e.g. Tesco ko 2 inch 48mm colour red 3 carton, 24 per carton, rate 15 par sale karo'
                        : 'e.g. Bell se 5 large carton 12 inch, qty 10, rate 50, weight 20kg purchase kya'
                  }
                  rows={4}
                  className="w-full bg-black/40 p-3 rounded-xl border border-white/10 outline-none text-sm text-white resize-none mb-3"
                />

                {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

                <button
                  onClick={generate}
                  disabled={!prompt.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition"
                >
                  <Send size={15}/> Generate
                </button>

                <p className="text-[10px] text-gray-500 mt-3">AI can make mistakes — double-check the entries before saving.</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Small animated robot + "thinking" dots shown while the request is in
// flight — replaces the plain spinner so waiting for a response feels less
// like a stalled page and more like something is actually happening.
const RobotThinking = () => (
  <div className="flex flex-col items-center justify-center py-8 gap-4">
    <div className="relative">
      <div
        className="w-16 h-16 rounded-2xl bg-purple-600/15 border-2 border-purple-500/50 flex items-center justify-center"
        style={{ animation: 'aibot-bounce 1.1s ease-in-out infinite' }}
      >
        <Bot size={30} className="text-purple-400" />
      </div>
      {/* orbiting spark */}
      <div
        className="absolute inset-0"
        style={{ animation: 'aibot-orbit 1.6s linear infinite' }}
      >
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_2px_rgba(168,85,247,0.7)]" />
      </div>
    </div>
    <div className="flex items-center gap-1.5 text-purple-300 text-sm font-bold">
      <span>Working on it</span>
      <span className="flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" style={{ animation: 'aibot-dot 1s ease-in-out infinite', animationDelay: '0s' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" style={{ animation: 'aibot-dot 1s ease-in-out infinite', animationDelay: '0.15s' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" style={{ animation: 'aibot-dot 1s ease-in-out infinite', animationDelay: '0.3s' }} />
      </span>
    </div>
    <style>{`
      @keyframes aibot-bounce {
        0%, 100% { transform: translateY(0) rotate(-3deg); }
        50% { transform: translateY(-8px) rotate(3deg); }
      }
      @keyframes aibot-orbit {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes aibot-dot {
        0%, 100% { opacity: 0.25; transform: translateY(0); }
        50% { opacity: 1; transform: translateY(-3px); }
      }
    `}</style>
  </div>
);
