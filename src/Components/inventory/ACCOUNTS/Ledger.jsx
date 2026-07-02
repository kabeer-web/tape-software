import { useState, useEffect, useMemo, useContext } from 'react';
import { AccountsContext } from "./AccountsContext";
import { getLedgerEntries, addLedgerEntry, deleteLedgerEntry } from "../../../api";
import { Wallet, Search, Plus, Trash2, Calendar } from 'lucide-react';

export default function Ledger() {
  const accountCtx = useContext(AccountsContext);
  // Total protection: If context is somehow missing
  const partiesSummary = accountCtx?.partiesSummary || {};
  
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeParty, setActiveParty] = useState(null);
  const [activeType, setActiveType] = useState('Sale');
  const [searchTerm, setSearchTerm] = useState('');
  const [modals, setModals] = useState({ add: false });

  useEffect(() => { 
    getLedgerEntries().then(d => {
      setEntries(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const dynamicParties = useMemo(() => {
    const names = new Set();
    const list = [];

    // 1. Ledger se naam uthao
    if (entries && Array.isArray(entries)) {
      entries.forEach(e => {
        if (e.party_type === activeType && e.party_name) names.add(e.party_name);
      });
    }

    // 2. Summary se naam uthao
    if (partiesSummary) {
      Object.keys(partiesSummary).forEach(name => {
        if (partiesSummary[name].type === activeType) names.add(name);
      });
    }

    names.forEach(n => list.push({ name: n }));
    return list.sort((a,b) => a.name.localeCompare(b.name));
  }, [entries, partiesSummary, activeType]);

  const processedData = useMemo(() => {
    if (!activeParty || !entries) return [];
    let running = 0;
    return entries
      .filter(e => e.party_name === activeParty)
      .sort((a,b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')))
      .map(e => {
        if (e.entry_type === 'debit') running += Number(e.amount);
        else running -= Number(e.amount);
        return { ...e, runningBalance: running };
      }).reverse();
  }, [entries, activeParty]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#070707] text-emerald-500 font-bold">LOADING DATA...</div>;

  return (
    <div className="flex h-screen bg-[#070707] text-white">
      <div className="w-80 border-r border-white/5 bg-[#0c0c0c] flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex bg-white/5 p-1 rounded-xl">
            <button onClick={()=>setActiveType('Sale')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeType==='Sale'?'bg-emerald-500 text-black':'text-gray-500'}`}>SALES</button>
            <button onClick={()=>setActiveType('Purchase')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeType==='Purchase'?'bg-emerald-500 text-black':'text-gray-500'}`}>PURCHASE</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {dynamicParties.map(p => (
            <button key={p.name} onClick={()=>setActiveParty(p.name)} className={`w-full text-left p-4 rounded-xl text-xs font-bold ${activeParty===p.name?'bg-emerald-500 text-black':'text-gray-500 hover:bg-white/5'}`}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col p-10 overflow-hidden">
        {!activeParty ? (
          <div className="flex-1 flex items-center justify-center opacity-20 font-black text-4xl uppercase italic">Select Party</div>
        ) : (
          <div className="flex flex-col h-full">
            <h1 className="text-5xl font-black italic mb-10">{activeParty}</h1>
            <div className="flex-1 bg-[#111] rounded-[3rem] border border-white/5 overflow-y-auto p-8">
              {processedData.map(e => (
                <div key={e._id} className="flex justify-between items-center p-6 border-b border-white/5 hover:bg-white/[0.02]">
                  <div>
                    <p className="text-xs text-gray-500">{e.date}</p>
                    <p className="font-bold uppercase">{e.description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-xl ${e.entry_type==='debit'?'text-red-500':'text-emerald-500'}`}>
                      {e.entry_type==='debit' ? '-' : '+'} Rs. {e.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 italic">Bal: Rs. {e.runningBalance.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
