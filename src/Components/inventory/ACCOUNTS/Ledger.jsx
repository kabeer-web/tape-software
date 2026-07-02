import { useState, useEffect, useMemo, useContext } from 'react';
import { AccountsContext } from "./AccountsContext";
import { getLedgerEntries, addLedgerEntry, deleteLedgerEntry } from "../../../api";
import { 
  Plus, Trash2, Search, Calendar, ChevronLeft, 
  X, AlertCircle, Printer, Wallet, TrendingUp, TrendingDown 
} from 'lucide-react';

export default function Ledger() {
  const accountCtx = useContext(AccountsContext);
  // Safe check if context is ready
  const partiesSummary = accountCtx?.partiesSummary || {};
  
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeParty, setActiveParty] = useState(null);
  const [activeType, setActiveType] = useState('Sale');
  const [searchTerm, setSearchTerm] = useState('');
  const [modals, setModals] = useState({ add: false, delete: false });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState({ date: new Date().toLocaleDateString('en-GB'), description: '', amount: '', type: 'credit' });

  useEffect(() => { 
    getLedgerEntries().then(d => {
      setEntries(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Safe Dynamic Parties logic
  const dynamicParties = useMemo(() => {
    const list = [];
    // 1. Get from ledger entries
    const namesInLedger = new Set();
    (entries || []).forEach(e => {
       if (e.party_type === activeType) {
         namesInLedger.add(e.party_name);
       }
    });
    namesInLedger.forEach(n => list.push({ name: n, type: activeType }));

    // 2. Get from bills summary
    Object.values(partiesSummary).forEach(p => {
      if (p.type === activeType && !namesInLedger.has(p.name)) {
        list.push({ name: p.name, type: p.type });
      }
    });

    return list.sort((a,b) => a.name.localeCompare(b.name));
  }, [entries, partiesSummary, activeType]);

  const processedData = useMemo(() => {
    if (!activeParty) return [];
    let running = 0;
    const filtered = (entries || [])
      .filter(e => e.party_name === activeParty)
      .filter(e => e.description?.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a,b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')));
    
    return filtered.map(e => {
      if (e.entry_type === 'debit') running += Number(e.amount);
      else running -= Number(e.amount);
      return { ...e, runningBalance: running };
    }).reverse();
  }, [entries, activeParty, searchTerm]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#070707] text-emerald-500 font-black italic animate-pulse">FIN-SYSTEM SECURE LINK ESTABLISHING...</div>;

  return (
    <div className="flex h-screen bg-[#070707] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-white/5 bg-[#0c0c0c] flex flex-col">
        <div className="p-8 border-b border-white/5">
          <h2 className="text-emerald-500 font-black tracking-tighter text-xl mb-6 uppercase">Ledger Hub</h2>
          <div className="flex bg-white/5 p-1 rounded-xl">
            {['Sale', 'Purchase'].map(t => (
              <button key={t} onClick={()=>{setActiveType(t); setActiveParty(null);}} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${activeType===t ? 'bg-emerald-500 text-black' : 'text-gray-500'}`}>{t.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {dynamicParties.map(p => (
            <button key={p.name} onClick={()=>setActiveParty(p.name)} className={`w-full text-left p-4 rounded-xl text-xs font-bold transition-all ${activeParty===p.name ? 'bg-white/10 text-emerald-400 border-l-4 border-emerald-500' : 'text-gray-500 hover:bg-white/5'}`}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeParty ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20 select-none">
            <Wallet size={80} className="mb-6"/>
            <p className="font-black text-4xl tracking-tighter uppercase italic">Select Account to View</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-10 overflow-hidden">
             {/* Header */}
             <div className="flex justify-between items-start mb-10">
                <div>
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-2 block">Account Statement</span>
                  <h1 className="text-6xl font-black tracking-tighter uppercase italic">{activeParty}</h1>
                </div>
                <div className="flex gap-4">
                   <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16}/><input placeholder="Search Journal..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500 w-64 transition-all"/></div>
                   <button onClick={()=>setModals({...modals, add:true})} className="bg-emerald-500 text-black px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl shadow-emerald-500/20 uppercase">Add Posting</button>
                </div>
             </div>

             {/* Financial Vitals */}
             <div className="grid grid-cols-3 gap-6 mb-10">
                <div className="bg-[#111] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-1 h-full bg-red-500 opacity-50"></div>
                   <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-4">Account Receivables</span>
                   <span className="text-3xl font-black">Rs. {processedData.filter(e=>e.entry_type==='debit').reduce((s,e)=>s+e.amount,0).toLocaleString()}</span>
                </div>
                <div className="bg-[#111] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-50"></div>
                   <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-4">Total Recovered</span>
                   <span className="text-3xl font-black">Rs. {processedData.filter(e=>e.entry_type==='credit').reduce((s,e)=>s+e.amount,0).toLocaleString()}</span>
                </div>
                <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-black shadow-2xl">
                   <span className="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-4">Net Balance</span>
                   <span className="text-3xl font-black">Rs. {processedData[0]?.runningBalance.toLocaleString() || 0}</span>
                </div>
             </div>

             {/* Table */}
             <div className="flex-1 bg-[#111] rounded-[3rem] border border-white/5 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <table className="w-full text-left border-separate border-spacing-0">
                      <thead className="sticky top-0 bg-[#161616] z-10">
                         <tr>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase border-b border-white/5">Date</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase border-b border-white/5">Narrative</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase border-b border-white/5 text-right">Debit</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase border-b border-white/5 text-right">Credit</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase border-b border-white/5 text-right">Balance</th>
                            <th className="p-6 border-b border-white/5"></th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {processedData.map(e => (
                           <tr key={e._id} className="hover:bg-white/[0.02] group transition-all">
                              <td className="p-6 text-xs font-mono text-gray-500">{e.date}</td>
                              <td className="p-6">
                                <p className="font-bold text-sm uppercase">{e.description}</p>
                                {e.bill_id && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-black mt-1 inline-block border border-emerald-500/20">OFFICIAL INVOICE</span>}
                              </td>
                              <td className="p-6 text-right font-black text-red-500">Rs. {e.entry_type==='debit' ? e.amount.toLocaleString() : '—'}</td>
                              <td className="p-6 text-right font-black text-emerald-500">Rs. {e.entry_type==='credit' ? e.amount.toLocaleString() : '—'}</td>
                              <td className="p-6 text-right font-black text-lg italic opacity-80">Rs. {e.runningBalance.toLocaleString()}</td>
                              <td className="p-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                 {!e.bill_id && (
                                   <button onClick={()=>{setSelectedEntry(e); setModals({...modals, delete:true})}} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                 )}
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Posting Modal */}
      {modals.add && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[2000] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#111] border border-white/10 w-full max-w-xl rounded-[3rem] p-12 shadow-3xl">
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-3xl font-black italic tracking-tighter uppercase">New <span className="text-emerald-500">Posting</span></h3>
                 <button onClick={()=>setModals({...modals, add:false})} className="p-4 bg-white/5 rounded-full hover:bg-red-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="space-y-8">
                 <div className="flex p-1 bg-white/5 rounded-2xl">
                    <button onClick={()=>setFormData({...formData, type:'debit'})} className={`flex-1 py-4 rounded-xl font-black text-[10px] tracking-widest transition-all ${formData.type==='debit' ? 'bg-red-500 text-black' : 'text-gray-500'}`}>DEBIT (OUT)</button>
                    <button onClick={()=>setFormData({...formData, type:'credit'})} className={`flex-1 py-4 rounded-xl font-black text-[10px] tracking-widest transition-all ${formData.type==='credit' ? 'bg-emerald-500 text-black' : 'text-gray-500'}`}>CREDIT (IN)</button>
                 </div>
                 <div className="space-y-4">
                    <input value={formData.description} onChange={e=>setFormData({...formData, description:e.target.value.toUpperCase()})} placeholder="Transaction Narrative (e.g. CASH PAID)" className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none font-bold focus:border-emerald-500" />
                    <input type="number" value={formData.amount} onChange={e=>setFormData({...formData, amount:e.target.value})} placeholder="0.00" className="w-full bg-black border border-white/10 p-6 rounded-2xl outline-none font-black text-3xl text-emerald-500 focus:border-emerald-500" />
                 </div>
                 <button onClick={async ()=>{
                    if(!formData.amount || !formData.description) return;
                    await addLedgerEntry({
                       party_name: activeParty,
                       party_type: activeType,
                       entry_type: formData.type,
                       description: formData.description,
                       amount: Number(formData.amount),
                       date: formData.date
                    });
                    window.location.reload(); // Quick refresh for consistency
                 }} className="w-full bg-emerald-500 text-black py-6 rounded-[2rem] font-black tracking-widest uppercase shadow-2xl active:scale-95 transition-all">Execute Posting</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
