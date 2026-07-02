import { useState, useMemo } from 'react';
import { useAccounts } from "./AccountsContext";
import { 
  Wallet, Search, Plus, Trash2, Pencil, Calendar, 
  ArrowUpRight, ArrowDownLeft, Filter, X, Check, Download
} from 'lucide-react';

export default function Ledger() {
  const { ledger, partiesSummary, updateEntry, deleteEntry, postLedger, loading } = useAccounts();
  
  const [activeParty, setActiveParty] = useState(null);
  const [activeType, setActiveType] = useState('Sale');
  const [searchTerm, setSearchTerm] = useState('');
  const [editModal, setEditModal] = useState(null); // Entry being edited
  const [addModal, setAddModal] = useState(false);

  // Filter parties based on search and type
  const filteredParties = useMemo(() => {
    return Object.values(partiesSummary)
      .filter(p => p.type === activeType)
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [partiesSummary, activeType]);

  // Party entries with running balance
  const processedData = useMemo(() => {
    if (!activeParty) return [];
    let running = 0;
    return ledger
      .filter(e => e.party_name === activeParty)
      .sort((a,b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')))
      .map(e => {
        if (e.entry_type === 'debit') running += Number(e.amount);
        else running -= Number(e.amount);
        return { ...e, runningBalance: running };
      }).reverse();
  }, [ledger, activeParty]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#070707] text-emerald-500 font-black animate-pulse">ESTABLISHING FINANCIAL CONSOLE...</div>;

  return (
    <div className="flex h-screen bg-[#070707] text-white overflow-hidden font-sans">
      
      {/* Sidebar: Party Explorer */}
      <aside className="w-80 border-r border-white/5 bg-[#0c0c0c] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-black text-emerald-500 italic tracking-tighter mb-6 uppercase">Fin-Manager Pro</h2>
          <div className="flex bg-white/5 p-1 rounded-2xl">
            {['Sale', 'Purchase'].map(t => (
              <button key={t} onClick={()=>{setActiveType(t); setActiveParty(null);}} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeType === t ? 'bg-emerald-500 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>{t.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {filteredParties.map(p => (
            <button key={p.name} onClick={()=>setActiveParty(p.name)} className={`w-full text-left p-4 rounded-2xl transition-all group ${activeParty === p.name ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-white/5'}`}>
              <div className="flex justify-between items-center">
                <span className={`text-xs font-bold ${activeParty === p.name ? 'text-emerald-400' : 'text-gray-400'}`}>{p.name}</span>
                <span className={`text-[9px] font-mono ${p.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>Rs.{Math.abs(p.balance).toLocaleString()}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {!activeParty ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-10 select-none">
            <Wallet size={120} strokeWidth={1} />
            <h2 className="text-4xl font-black tracking-tighter mt-4 italic uppercase">Select Ledger Account</h2>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-8 overflow-hidden">
            
            {/* Executive Header */}
            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Global Statement
                </p>
                <h1 className="text-6xl font-black italic tracking-tighter uppercase">{activeParty}</h1>
              </div>
              <div className="flex gap-3">
                <button onClick={()=>setAddModal(true)} className="bg-emerald-500 text-black px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl shadow-emerald-500/20 uppercase">Manual Entry</button>
              </div>
            </div>

            {/* Account Vitals Card */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Total Receivables', val: partiesSummary[activeParty]?.debit, color: 'text-rose-500', icon: ArrowUpRight },
                { label: 'Total Recovered', val: partiesSummary[activeParty]?.credit, color: 'text-emerald-500', icon: ArrowDownLeft },
                { label: 'Net Outstanding', val: partiesSummary[activeParty]?.balance, color: 'text-white', icon: Wallet, bg: 'bg-emerald-500 !text-black' }
              ].map((s, i) => (
                <div key={i} className={`p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] ${s.bg}`}>
                   <div className="flex items-center gap-3 mb-4 opacity-60">
                      <s.icon size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                   </div>
                   <span className="text-3xl font-black font-mono">Rs. {Number(s.val || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Ledger Journal */}
            <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                   <Search size={14} className="text-gray-500" />
                   <input placeholder="Search transactions..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-transparent outline-none text-xs font-bold w-64" />
                </div>
                <div className="flex gap-2">
                   <button className="p-2.5 hover:bg-white/5 rounded-xl text-gray-500"><Download size={16}/></button>
                   <button className="p-2.5 hover:bg-white/5 rounded-xl text-gray-500"><Filter size={16}/></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 bg-[#0c0c0c] z-10">
                    <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      <th className="p-6 border-b border-white/5">Date</th>
                      <th className="p-6 border-b border-white/5">Narrative</th>
                      <th className="p-6 border-b border-white/5 text-right">Debit (-)</th>
                      <th className="p-6 border-b border-white/5 text-right">Credit (+)</th>
                      <th className="p-6 border-b border-white/5 text-right">Closing</th>
                      <th className="p-6 border-b border-white/5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {processedData.map(e => (
                      <tr key={e._id} className="hover:bg-white/[0.03] transition-all group">
                        <td className="p-6 text-xs font-mono text-gray-500">{e.date}</td>
                        <td className="p-6">
                           <p className="font-bold text-sm uppercase">{e.description}</p>
                           {e.bill_id && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-black mt-1 inline-block border border-emerald-500/20">SYSTEM INVOICE</span>}
                        </td>
                        <td className="p-6 text-right font-black text-rose-500 text-lg">{e.entry_type==='debit' ? `Rs. ${e.amount.toLocaleString()}` : '—'}</td>
                        <td className="p-6 text-right font-black text-emerald-500 text-lg">{e.entry_type==='credit' ? `Rs. ${e.amount.toLocaleString()}` : '—'}</td>
                        <td className="p-6 text-right font-black text-xl italic tracking-tighter">Rs. {e.runningBalance.toLocaleString()}</td>
                        <td className="p-6 text-right">
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                             <button onClick={()=>setEditModal(e)} className="p-2.5 bg-white/5 hover:bg-emerald-500 hover:text-black rounded-xl transition-all"><Pencil size={14}/></button>
                             {!e.bill_id && <button onClick={()=>deleteEntry(e._id)} className="p-2.5 bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 size={14}/></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Manual Add */}
        {addModal && <EntryModal title="New Posting" onClose={()=>setAddModal(false)} onSave={postLedger} party={activeParty} type={activeType} />}
        
        {/* Modal: Edit Entry */}
        {editModal && <EntryModal title="Edit Record" onClose={()=>setEditModal(null)} onSave={(data)=>updateEntry(editModal._id, data)} initialData={editModal} party={activeParty} type={activeType} />}
        
      </main>
    </div>
  );
}

// Reusable Professional Modal
function EntryModal({ title, onClose, onSave, initialData, party, type }) {
  const [data, setData] = useState(initialData || { date: new Date().toLocaleDateString('en-GB'), description: '', amount: '', entry_type: 'credit' });

  const handleSubmit = async () => {
    if(!data.amount || !data.description) return alert("Fill all fields");
    await onSave({ ...data, party_name: party, party_type: type, amount: Number(data.amount) });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-6">
      <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-[3rem] p-10 shadow-3xl">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black uppercase italic tracking-tighter">{title}</h3>
          <button onClick={onClose} className="p-3 hover:bg-red-500 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl">
             <button onClick={()=>setData({...data, entry_type: 'debit'})} className={`py-3 rounded-xl text-[10px] font-black transition-all ${data.entry_type==='debit'?'bg-rose-600':'text-gray-500'}`}>DEBIT (OUT)</button>
             <button onClick={()=>setData({...data, entry_type: 'credit'})} className={`py-3 rounded-xl text-[10px] font-black transition-all ${data.entry_type==='credit'?'bg-emerald-600':'text-gray-500'}`}>CREDIT (IN)</button>
          </div>
          <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 ml-2">DATE</label><input value={data.date} onChange={e=>setData({...data, date: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 font-bold" /></div>
          <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 ml-2">DESCRIPTION</label><input value={data.description} onChange={e=>setData({...data, description: e.target.value.toUpperCase()})} className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 font-bold" /></div>
          <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 ml-2">AMOUNT (PKR)</label><input type="number" value={data.amount} onChange={e=>setData({...data, amount: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 font-black text-2xl text-emerald-500" /></div>
          <button onClick={handleSubmit} className="w-full bg-emerald-500 text-black py-5 rounded-[2rem] font-black uppercase tracking-widest hover:scale-95 transition-all">Confirm Posting</button>
        </div>
      </div>
    </div>
  );
}
