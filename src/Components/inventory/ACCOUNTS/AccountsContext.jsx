import { useState, useMemo, useContext } from 'react';
import { useAccounts } from "./AccountsContext";
import { 
  Wallet, Search, Plus, Trash2, Pencil, Calendar, 
  ArrowUpRight, ArrowDownLeft, Menu, X, Printer, Filter, ChevronRight
} from 'lucide-react';

export default function Ledger() {
  const { ledger, partiesSummary, updateEntry, deleteEntry, postLedger, loading } = useAccounts();
  
  const [activeParty, setActiveParty] = useState(null);
  const [activeType, setActiveType] = useState('Sale');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Sidebar State
  const [editModal, setEditModal] = useState(null);
  const [addModal, setAddModal] = useState(false);

  // Parties Filtering
  const filteredParties = useMemo(() => {
    return Object.values(partiesSummary)
      .filter(p => p.type === activeType)
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [partiesSummary, activeType]);

  // Entry Processing
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

  const selectParty = (name) => {
    setActiveParty(name);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#070707]">
      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
      <p className="text-emerald-500 font-black tracking-widest animate-pulse">LOADING LEDGER...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#070707] text-slate-200 overflow-hidden relative">
      
      {/* --- MOBILE SIDEBAR OVERLAY --- */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR (Parties List) --- */}
      <aside className={`
        fixed lg:relative z-50 h-full w-[280px] bg-[#0c0c0c] border-r border-white/5 transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-black text-white italic tracking-tighter">PARTIES LIST</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex bg-white/5 p-1 rounded-xl mb-4">
            <button 
              onClick={()=>{setActiveType('Sale'); setActiveParty(null);}} 
              className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${activeType === 'Sale' ? 'bg-emerald-500 text-black' : 'text-gray-500'}`}
            >SALES</button>
            <button 
              onClick={()=>{setActiveType('Purchase'); setActiveParty(null);}} 
              className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${activeType === 'Purchase' ? 'bg-emerald-500 text-black' : 'text-gray-500'}`}
            >PURCHASE</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-20 space-y-1 custom-scrollbar h-[calc(100vh-160px)]">
          {filteredParties.map(p => (
            <button 
              key={p.name} 
              onClick={() => selectParty(p.name)}
              className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${activeParty === p.name ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'hover:bg-white/5'}`}
            >
              <div className="truncate pr-2">
                <p className={`text-xs font-black truncate ${activeParty === p.name ? 'text-black' : 'text-slate-300'}`}>{p.name}</p>
                <p className={`text-[9px] font-bold ${activeParty === p.name ? 'text-black/60' : 'text-gray-500'}`}>BAL: Rs. {Math.abs(p.balance).toLocaleString()}</p>
              </div>
              <ChevronRight size={14} className={activeParty === p.name ? 'text-black' : 'text-gray-700'} />
            </button>
          ))}
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* TOP NAV */}
        <header className="h-20 border-b border-white/5 bg-[#070707]/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-white/5 rounded-xl text-emerald-500">
              <Menu size={20} />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-sm font-black text-white truncate uppercase tracking-widest">
                {activeParty ? `Ledger: ${activeParty}` : 'Financial Overview'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
             {activeParty && (
               <button onClick={()=>setAddModal(true)} className="bg-emerald-500 text-black px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-emerald-500/20">
                 <span className="hidden sm:inline">New Posting</span>
                 <Plus size={16} className="sm:hidden" />
               </button>
             )}
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          {!activeParty ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-24 h-24 bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-white/5">
                <Wallet size={40} className="text-gray-700" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Account Not Selected</h2>
              <p className="text-gray-500 text-xs max-w-xs mt-2">Please select a party from the sidebar to view detailed financial transactions and history.</p>
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden mt-6 text-emerald-500 font-bold text-sm uppercase tracking-widest">Open Parties List</button>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
              
              {/* STATS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Debit (Sales)', val: partiesSummary[activeParty]?.debit, color: 'text-rose-500', icon: ArrowUpRight, bg: 'bg-rose-500/5' },
                  { label: 'Credit (Payments)', val: partiesSummary[activeParty]?.credit, color: 'text-emerald-500', icon: ArrowDownLeft, bg: 'bg-emerald-500/5' },
                  { label: 'Net Balance', val: partiesSummary[activeParty]?.balance, color: 'text-white', icon: Wallet, bg: 'bg-emerald-500 shadow-xl shadow-emerald-500/10 !text-black' }
                ].map((s, i) => (
                  <div key={i} className={`p-6 rounded-[2rem] border border-white/5 flex flex-col justify-between min-h-[140px] ${s.bg}`}>
                    <div className="flex items-center gap-2 opacity-60">
                      <s.icon size={14} />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">{s.label}</span>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-black font-mono mt-4 ${s.color}`}>Rs.{Number(s.val || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* TRANSACTIONS TABLE */}
              <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.01]">
                   <div className="relative w-full sm:w-80">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                      <input 
                        placeholder="Search narrative..." 
                        value={searchTerm}
                        onChange={e=>setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-3 pl-10 rounded-xl text-xs font-bold focus:border-emerald-500 outline-none"
                      />
                   </div>
                   <div className="flex items-center gap-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {processedData.length} Records
                   </div>
                </div>

                <div className="overflow-x-auto">
                   <table className="w-full text-left border-separate border-spacing-0">
                      <thead className="bg-white/[0.02]">
                         <tr className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">
                            <th className="p-6 border-b border-white/5">Date</th>
                            <th className="p-6 border-b border-white/5">Details</th>
                            <th className="p-6 border-b border-white/5 text-right">Debit</th>
                            <th className="p-6 border-b border-white/5 text-right">Credit</th>
                            <th className="p-6 border-b border-white/5 text-right">Running</th>
                            <th className="p-6 border-b border-white/5"></th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {processedData.map(e => (
                           <tr key={e._id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="p-6 text-[11px] font-mono text-gray-500 whitespace-nowrap">{e.date}</td>
                              <td className="p-6">
                                <p className="text-xs font-bold text-white uppercase">{e.description}</p>
                                {e.bill_id && <span className="text-[7px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block border border-emerald-500/20 uppercase tracking-tighter">System Generated</span>}
                              </td>
                              <td className="p-6 text-right font-black text-rose-500 text-sm">{e.entry_type==='debit' ? `-${e.amount.toLocaleString()}` : ''}</td>
                              <td className="p-6 text-right font-black text-emerald-500 text-sm">{e.entry_type==='credit' ? `+${e.amount.toLocaleString()}` : ''}</td>
                              <td className="p-6 text-right font-black text-white text-sm italic tracking-tighter">Rs.{e.runningBalance.toLocaleString()}</td>
                              <td className="p-6 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={()=>setEditModal(e)} className="p-2 bg-white/5 hover:bg-emerald-500 hover:text-black rounded-lg transition-all"><Pencil size={12}/></button>
                                   {!e.bill_id && <button onClick={()=>deleteEntry(e._id)} className="p-2 bg-white/5 hover:bg-red-500 hover:text-white rounded-lg transition-all"><Trash2 size={12}/></button>}
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
        </div>
      </main>

      {/* --- MODALS --- */}
      {addModal && <EntryModal title="New Posting" onClose={()=>setAddModal(false)} onSave={postLedger} party={activeParty} type={activeType} />}
      {editModal && <EntryModal title="Edit Record" onClose={()=>setEditModal(null)} onSave={(data)=>updateEntry(editModal._id, data)} initialData={editModal} party={activeParty} type={activeType} />}
      
    </div>
  );
}

// REDESIGNED PROFESSIONAL MODAL
function EntryModal({ title, onClose, onSave, initialData, party, type }) {
  const [data, setData] = useState(initialData || { date: new Date().toLocaleDateString('en-GB'), description: '', amount: '', entry_type: 'credit' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if(!data.amount || !data.description) return;
    setIsSubmitting(true);
    await onSave({ ...data, party_name: party, party_type: type, amount: Number(data.amount) });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 sm:p-10 shadow-3xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black uppercase italic text-white tracking-tighter">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-red-500 rounded-full text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
        </div>
        
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2 bg-black p-1 rounded-2xl border border-white/5">
             <button onClick={()=>setData({...data, entry_type: 'debit'})} className={`py-3 rounded-xl text-[9px] font-black tracking-widest transition-all ${data.entry_type==='debit'?'bg-rose-600 text-white shadow-lg':'text-gray-600 hover:text-gray-400'}`}>DEBIT (OUT)</button>
             <button onClick={()=>setData({...data, entry_type: 'credit'})} className={`py-3 rounded-xl text-[9px] font-black tracking-widest transition-all ${data.entry_type==='credit'?'bg-emerald-600 text-white shadow-lg':'text-gray-600 hover:text-gray-400'}`}>CREDIT (IN)</button>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-500 ml-2 uppercase">Posting Date</label>
            <input value={data.date} onChange={e=>setData({...data, date: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-500 ml-2 uppercase">Transaction Narrative</label>
            <input value={data.description} onChange={e=>setData({...data, description: e.target.value.toUpperCase()})} placeholder="e.g. CASH RECEIVED" className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-500 ml-2 uppercase">Amount (PKR)</label>
            <input type="number" value={data.amount} onChange={e=>setData({...data, amount: e.target.value})} placeholder="0.00" className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 font-black text-2xl text-emerald-500" />
          </div>

          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full bg-emerald-500 text-black py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-emerald-400 active:scale-95 transition-all mt-4 disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : 'Confirm Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}
