import { useState, useEffect, useMemo, useContext } from 'react';
import { AccountsContext } from "./AccountsContext";
import { getLedgerEntries, addLedgerEntry, deleteLedgerEntry } from "../../../api";
import { Wallet, Search, Plus, Trash2 } from 'lucide-react';

export default function Ledger() {
  const accountCtx = useContext(AccountsContext);
  const partiesSummary = accountCtx?.partiesSummary || {}; // Safe Fallback
  
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeParty, setActiveParty] = useState(null);
  const [activeType, setActiveType] = useState('Sale');

  useEffect(() => { 
    getLedgerEntries().then(d => {
      setEntries(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const dynamicParties = useMemo(() => {
    const names = new Set();
    // Ledger se naam lo
    entries.forEach(e => {
      if (e.party_type === activeType) names.add(e.party_name);
    });
    // Summary (Bills) se naam lo
    Object.keys(partiesSummary).forEach(name => {
      if (partiesSummary[name].type === activeType) names.add(name);
    });

    return Array.from(names).map(n => ({ name: n })).sort((a,b) => a.name.localeCompare(b.name));
  }, [entries, partiesSummary, activeType]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#070707] text-emerald-500 font-bold italic animate-pulse">SYNCING LEDGER DATA...</div>;

  return (
    <div className="flex h-screen bg-[#070707] text-white overflow-hidden">
      <aside className="w-80 border-r border-white/5 bg-[#0c0c0c] flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex bg-white/5 p-1 rounded-xl">
            {['Sale', 'Purchase'].map(t => (
              <button key={t} onClick={()=>setActiveType(t)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeType === t ? 'bg-emerald-500 text-black' : 'text-gray-500'}`}>{t.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {dynamicParties.map(p => (
            <button key={p.name} onClick={()=>setActiveParty(p.name)} className={`w-full text-left p-4 rounded-xl text-xs font-bold transition-all ${activeParty === p.name ? 'bg-white/10 text-emerald-400 border-l-4 border-emerald-500' : 'text-gray-500 hover:bg-white/5'}`}>
              {p.name}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col p-10 overflow-hidden">
        {!activeParty ? (
          <div className="flex-1 flex items-center justify-center opacity-10 font-black text-6xl italic uppercase italic tracking-tighter">Financial Ledger</div>
        ) : (
          <div className="flex flex-col h-full animate-in fade-in duration-500">
             <h1 className="text-6xl font-black italic mb-10 tracking-tighter">{activeParty}</h1>
             <div className="flex-1 bg-[#111] rounded-[3rem] border border-white/5 overflow-y-auto p-8 shadow-inner">
                {entries.filter(e => e.party_name === activeParty).length === 0 ? (
                   <p className="text-gray-600 font-bold uppercase text-center mt-20 italic">No transactions recorded.</p>
                ) : (
                  entries.filter(e => e.party_name === activeParty).map(e => (
                    <div key={e._id} className="flex justify-between items-center p-6 border-b border-white/5 hover:bg-white/[0.02] transition-all">
                       <span className="font-mono text-xs text-gray-500">{e.date}</span>
                       <span className="font-bold text-sm uppercase">{e.description}</span>
                       <span className={`font-black text-lg ${e.entry_type === 'debit' ? 'text-red-500' : 'text-emerald-500'}`}>
                         {e.entry_type === 'debit' ? '-' : '+'} Rs. {e.amount.toLocaleString()}
                       </span>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
