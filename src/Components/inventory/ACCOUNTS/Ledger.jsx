import { useState, useEffect, useMemo, useContext } from 'react';
import { AccountsContext } from "./AccountsContext";
import { getLedgerEntries, addLedgerEntry, deleteLedgerEntry } from "../../../api";
import { Plus, Trash2, Search, Wallet, Calculator } from 'lucide-react';

export default function Ledger() {
  const accountCtx = useContext(AccountsContext);
  const partiesSummary = accountCtx?.partiesSummary || {}; // Safe check
  
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeParty, setActiveParty] = useState(null);
  const [activeType, setActiveType] = useState('Sale');
  const [searchTerm, setSearchTerm] = useState('');
  const [modals, setModals] = useState({ add: false });
  const [formData, setFormData] = useState({ 
    date: new Date().toLocaleDateString('en-GB'), 
    description: '', amount: '', type: 'credit' 
  });

  useEffect(() => { 
    getLedgerEntries().then(d => {
      setEntries(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const dynamicParties = useMemo(() => {
    const list = [];
    const namesInLedger = new Set();
    
    // Safety check for entries
    if (Array.isArray(entries)) {
      entries.forEach(e => {
        if (e.party_type === activeType) namesInLedger.add(e.party_name);
      });
    }

    namesInLedger.forEach(n => list.push({ name: n, type: activeType }));

    // Safety check for partiesSummary (This was the crash point)
    if (partiesSummary) {
      Object.values(partiesSummary).forEach(p => {
        if (p.type === activeType && !namesInLedger.has(p.name)) {
          list.push({ name: p.name, type: p.type });
        }
      });
    }

    return list.sort((a,b) => a.name.localeCompare(b.name));
  }, [entries, partiesSummary, activeType]);

  const processedData = useMemo(() => {
    if (!activeParty || !Array.isArray(entries)) return [];
    let running = 0;
    return entries
      .filter(e => e.party_name === activeParty)
      .filter(e => e.description?.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a,b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')))
      .map(e => {
        if (e.entry_type === 'debit') running += Number(e.amount);
        else running -= Number(e.amount);
        return { ...e, runningBalance: running };
      }).reverse();
  }, [entries, activeParty, searchTerm]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#070707] text-emerald-500 font-black italic">LOADING ACCOUNTS...</div>;

  return (
    <div className="flex h-screen bg-[#070707] text-white">
      {/* Sidebar */}
      <div className="w-80 border-r border-white/5 bg-[#0c0c0c] flex flex-col">
        <div className="p-8 border-b border-white/5">
          <h2 className="text-emerald-500 font-black text-xl mb-6">FIN-MANAGER</h2>
          <div className="flex bg-white/5 p-1 rounded-xl">
            {['Sale', 'Purchase'].map(t => (
              <button key={t} onClick={()=>{setActiveType(t); setActiveParty(null);}} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeType===t ? 'bg-emerald-500 text-black' : 'text-gray-500'}`}>{t.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {dynamicParties.map(p => (
            <button key={p.name} onClick={()=>setActiveParty(p.name)} className={`w-full text-left p-4 rounded-xl text-xs font-bold transition-all ${activeParty===p.name ? 'bg-white/10 text-emerald-400 border-l-4 border-emerald-500' : 'text-gray-500 hover:bg-white/5'}`}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main content area (Aapka existing UI yahan aayega) */}
      <div className="flex-1 flex flex-col overflow-hidden">
         {!activeParty ? (
           <div className="flex-1 flex items-center justify-center opacity-20 font-black text-4xl">SELECT ACCOUNT</div>
         ) : (
           <div className="p-10 overflow-hidden flex flex-col h-full">
              <h1 className="text-6xl font-black italic mb-10">{activeParty}</h1>
              {/* List and table logic same as before... */}
              <div className="flex-1 bg-[#111] rounded-[3rem] border border-white/5 overflow-y-auto p-6">
                 {processedData.map(e => (
                   <div key={e._id} className="flex justify-between p-6 border-b border-white/5">
                      <span>{e.date} - {e.description}</span>
                      <span className="font-bold">Rs. {e.amount.toLocaleString()} ({e.entry_type})</span>
                   </div>
                 ))}
              </div>
           </div>
         )}
      </div>
    </div>
  );
}
