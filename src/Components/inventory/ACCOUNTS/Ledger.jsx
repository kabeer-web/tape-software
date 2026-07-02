import { useState, useEffect, useMemo, useContext } from 'react';
import { AccountsContext } from "./AccountsContext";
import { getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry } from "../../../api";
import { 
  Plus, Trash2, Pencil, Search, Calendar, ChevronLeft, 
  X, AlertCircle, Printer, Download, TrendingUp, TrendingDown, Wallet 
} from 'lucide-react';

export default function Ledger() {
  const { partiesSummary } = useContext(AccountsContext);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeParty, setActiveParty] = useState(null);
  const [activeType, setActiveType] = useState('Sale');
  const [searchTerm, setSearchTerm] = useState('');
  const [modals, setModals] = useState({ add: false, edit: false, delete: false });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState({ 
    date: new Date().toLocaleDateString('en-GB'), 
    description: '', 
    amount: '', 
    type: 'credit' 
  });

  useEffect(() => { 
    getLedgerEntries().then(d => {
      setEntries(d || []);
      setLoading(false);
    });
  }, []);

  // CRP Logic: Get all parties from entries + bills dynamically
  const dynamicParties = useMemo(() => {
    const fromLedger = Array.from(new Set(entries.map(e => JSON.stringify({name: e.party_name, type: e.party_type}))));
    const ledgerParties = fromLedger.map(s => JSON.parse(s));
    
    const all = [...ledgerParties];
    Object.values(partiesSummary).forEach(p => {
      if(!all.find(x => x.name === p.name)) all.push({name: p.name, type: p.type});
    });
    return all.filter(p => p.type === activeType).sort((a,b) => a.name.localeCompare(b.name));
  }, [entries, partiesSummary, activeType]);

  // Professional Running Balance & Date Sorting
  const processedData = useMemo(() => {
    if (!activeParty) return [];
    let running = 0;
    return entries
      .filter(e => e.party_name === activeParty)
      .filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a,b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateA - dateB;
      })
      .map(e => {
        if (e.entry_type === 'debit') running += Number(e.amount);
        else running -= Number(e.amount);
        return { ...e, runningBalance: running };
      }).reverse(); // Latest on top for UI
  }, [entries, activeParty, searchTerm]);

  const handlePost = async () => {
    if (!formData.amount || !formData.description) return;
    try {
      const payload = {
        party_name: activeParty,
        party_type: activeType,
        entry_type: formData.type,
        description: formData.description.toUpperCase(),
        amount: Number(formData.amount),
        date: formData.date
      };
      const saved = await addLedgerEntry(payload);
      setEntries([saved, ...entries]);
      setModals({ ...modals, add: false });
      setFormData({ date: new Date().toLocaleDateString('en-GB'), description: '', amount: '', type: 'credit' });
    } catch (e) { alert("Posting Failed"); }
  };

  const handlePrintLedger = () => {
    const win = window.open('', '_blank');
    const rows = [...processedData].reverse().map(e => `
      <tr>
        <td>${e.date}</td>
        <td>${e.description}</td>
        <td align="right">${e.entry_type==='debit' ? e.amount.toLocaleString() : '-'}</td>
        <td align="right">${e.entry_type==='credit' ? e.amount.toLocaleString() : '-'}</td>
        <td align="right"><b>${e.runningBalance.toLocaleString()}</b></td>
      </tr>
    `).join('');
    
    win.document.write(`
      <html><head><title>Ledger - ${activeParty}</title>
      <style>body{font-family:sans-serif; padding:40px;} table{width:100%; border-collapse:collapse;} th,td{border:1px solid #ddd; padding:10px; font-size:12px;}</style>
      </head><body>
      <h2>Party Ledger Statement</h2>
      <p><b>Party:</b> ${activeParty} | <b>Type:</b> ${activeType}</p>
      <table><thead><tr><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
      <tbody>${rows}</tbody></table>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#070707] text-emerald-500 font-black tracking-widest">ESTABLISHING SECURE CONNECTION...</div>;

  return (
    <div className="flex h-screen bg-[#070707] text-white overflow-hidden font-sans">
      
      {/* Sidebar: Dynamic Party Explorer */}
      <div className="w-80 border-r border-white/5 bg-[#0c0c0c] flex flex-col">
        <div className="p-8 border-b border-white/5">
          <h2 className="text-emerald-500 font-black uppercase tracking-tighter text-xl mb-6">Fin-Manager Pro</h2>
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

      {/* Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeParty ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20">
            <Wallet size={80} className="mb-6"/>
            <p className="font-black text-4xl tracking-tighter uppercase italic">Select Party to View Statement</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-10 overflow-hidden">
            {/* Executive Header */}
            <div className="flex justify-between items-start mb-10">
              <div>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-2 block">Accounts Statement</span>
                <h1 className="text-6xl font-black tracking-tighter uppercase italic">{activeParty}</h1>
              </div>
              <div className="flex gap-3">
                <button onClick={handlePrintLedger} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/10"><Printer size={20}/></button>
                <button onClick={()=>setModals({...modals, add:true})} className="bg-emerald-500 text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-emerald-500/20">New Transaction</button>
              </div>
            </div>

            {/* Financial Vitals */}
            <div className="grid grid-cols-3 gap-6 mb-10">
              <div className="bg-[#111] p-8 rounded-[2.5rem] border border-white/5">
                <div className="flex items-center gap-3 mb-4 text-red-500"><TrendingUp size={18}/><span className="text-[10px] font-black uppercase text-gray-500">Total Receivables</span></div>
                <div className="text-3xl font-black">Rs. {processedData.filter(e=>e.entry_type==='debit').reduce((s,e)=>s+e.amount,0).toLocaleString()}</div>
              </div>
              <div className="bg-[#111] p-8 rounded-[2.5rem] border border-white/5">
                <div className="flex items-center gap-3 mb-4 text-emerald-500"><TrendingDown size={18}/><span className="text-[10px] font-black uppercase text-gray-500">Total Recovered</span></div>
                <div className="text-3xl font-black">Rs. {processedData.filter(e=>e.entry_type==='credit').reduce((s,e)=>s+e.amount,0).toLocaleString()}</div>
              </div>
              <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-black">
                <div className="flex items-center gap-3 mb-4 opacity-60"><Wallet size={18}/><span className="text-[10px] font-black uppercase">Net Balance</span></div>
                <div className="text-3xl font-black">Rs. {processedData[0]?.runningBalance.toLocaleString() || 0}</div>
              </div>
            </div>

            {/* Transaction Journal */}
            <div className="flex-1 bg-[#111] rounded-[3rem] border border-white/5 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl">
                  <Search size={14} className="text-gray-500"/>
                  <input placeholder="Search Journal..." className="bg-transparent outline-none text-xs font-bold w-64" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                </div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{processedData.length} Records Found</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 bg-[#161616] z-10 shadow-xl">
                    <tr>
                      <th className="p-6 text-[10px] font-black text-gray-500 uppercase border-b border-white/5">Date</th>
                      <th className="p-6 text-[10px] font-black text-gray-500 uppercase border-b border-white/5">Particulars</th>
                      <th className="p-6 text-[10px] font-black text-gray-500 uppercase border-b border-white/5 text-right">Debit</th>
                      <th className="p-6 text-[10px] font-black text-gray-500 uppercase border-b border-white/5 text-right">Credit</th>
                      <th className="p-6 text-[10px] font-black text-gray-500 uppercase border-b border-white/5 text-right">Running Net</th>
                      <th className="p-6 border-b border-white/5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {processedData.map(e => (
                      <tr key={e._id} className="hover:bg-white/[0.02] group transition-colors">
                        <td className="p-6 text-xs font-mono text-gray-400">{e.date}</td>
                        <td className="p-6">
                          <p className="font-bold text-sm">{e.description}</p>
                          {e.bill_id && <span className="text-[8px] text-emerald-500 font-black uppercase bg-emerald-500/10 px-2 py-0.5 rounded mt-1 inline-block border border-emerald-500/20">Official Invoice</span>}
                        </td>
                        <td className="p-6 text-right font-black text-red-400">{e.entry_type==='debit' ? e.amount.toLocaleString() : '—'}</td>
                        <td className="p-6 text-right font-black text-emerald-400">{e.entry_type==='credit' ? e.amount.toLocaleString() : '—'}</td>
                        <td className="p-6 text-right font-black text-lg tracking-tighter">Rs. {e.runningBalance.toLocaleString()}</td>
                        <td className="p-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                           {!e.bill_id && (
                             <button onClick={()=>{setSelectedEntry(e); setModals({...modals, delete:true})}} className="p-2 hover:text-red-500"><Trash2 size={16}/></button>
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

      {/* Modal: New Posting */}
      {modals.add && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[2000] flex items-center justify-center p-6 animate-in fade-in duration-500">
           <div className="bg-[#111] border border-white/10 w-full max-w-xl rounded-[3rem] p-12 shadow-3xl">
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-3xl font-black italic tracking-tighter uppercase">New Journal Entry</h3>
                 <button onClick={()=>setModals({...modals, add:false})} className="p-4 bg-white/5 rounded-full hover:bg-red-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="space-y-8">
                 <div className="flex p-1 bg-white/5 rounded-2xl">
                    <button onClick={()=>setFormData({...formData, type:'debit'})} className={`flex-1 py-4 rounded-xl font-black text-[10px] tracking-widest transition-all ${formData.type==='debit' ? 'bg-red-500 text-black' : 'text-gray-500'}`}>DEBIT (OUT)</button>
                    <button onClick={()=>setFormData({...formData, type:'credit'})} className={`flex-1 py-4 rounded-xl font-black text-[10px] tracking-widest transition-all ${formData.type==='credit' ? 'bg-emerald-500 text-black' : 'text-gray-500'}`}>CREDIT (IN)</button>
                 </div>
                 <div className="space-y-4">
                    <input value={formData.description} onChange={e=>setFormData({...formData, description:e.target.value})} placeholder="Transaction Narrative (e.g. CASH PAID)" className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none font-bold focus:border-emerald-500" />
                    <input type="number" value={formData.amount} onChange={e=>setFormData({...formData, amount:e.target.value})} placeholder="0.00" className="w-full bg-black border border-white/10 p-6 rounded-2xl outline-none font-black text-3xl text-emerald-500 focus:border-emerald-500" />
                 </div>
                 <button onClick={handlePost} className="w-full bg-emerald-500 text-black py-6 rounded-[2rem] font-black tracking-widest uppercase shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all">Execute Posting</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal: Delete */}
      {modals.delete && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[3000] flex items-center justify-center p-6">
           <div className="bg-[#111] border border-red-500/20 w-full max-w-md rounded-[3rem] p-12 text-center shadow-3xl">
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle size={40}/></div>
              <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter">Reverse Entry?</h3>
              <p className="text-gray-500 text-sm mb-8">Official system entries cannot be restored once reversed. Proceed with caution.</p>
              <div className="flex gap-4">
                 <button onClick={()=>setModals({...modals, delete:false})} className="flex-1 py-5 rounded-2xl bg-white/5 font-black text-[10px] uppercase">Cancel</button>
                 <button onClick={async ()=>{
                   await deleteLedgerEntry(selectedEntry._id);
                   setEntries(entries.filter(e => e._id !== selectedEntry._id));
                   setModals({...modals, delete:false});
                 }} className="flex-1 py-5 rounded-2xl bg-red-600 font-black text-[10px] uppercase">Reverse</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
