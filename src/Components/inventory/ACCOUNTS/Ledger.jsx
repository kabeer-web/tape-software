import { useState, useEffect, useMemo } from 'react';
import { 
  getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry 
} from "../../../api";
import { 
  Users, Plus, Trash2, Pencil, Search, Filter, Calendar, 
  ArrowUpRight, ArrowDownLeft, Wallet, ChevronLeft, 
  ChevronRight, X, AlertCircle, CheckCircle2, Download, Trash
} from 'lucide-react';

const SALE_PARTIES = ['AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY','ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE','ZEESHAN HYD','ABDUL BASIT','MD TRADERS','MUNEER BHAI','ANWAR BHAI','FAROOQ BHAI','GR TRADER','HAMZA SIALKOT','HASHMI TRADER','GAIN TEX INTERNATIONAL','NAQI TAQI','MEMON ELECTRIC','MOK PAKistan TRADER','SABIR BROTHER 1','SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE','SUJJAD ALI','USAMA STATIONARY','ZEESHAN HAIDRABAD','WAHEED WALI','AL FAREED','SHOKAT HAYAT','GUL AMIR','AJ ARSALAN','HAS GR TRADER','MUDASIR MEMON','UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI','BILAL BHAI','FARHAN NEW KARACHI','N.K ENTERPRISES'];
const PURCHASE_PARTIES = ['UNIVERSAL COTTING','KOSHER','CHAWLA INDUSTRY','IBAD CORE','TAHSEEN CARTON','TALHA WASEEM','ASGHR CORE','DEER TAPE','SAMAD BHAI'];
const ALL_PARTIES = [...SALE_PARTIES.map(n => ({ name: n, type: 'Sale' })), ...PURCHASE_PARTIES.map(n => ({ name: n, type: 'Purchase' }))];

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeParty, setActiveParty] = useState(null);
  const [activeType, setActiveType] = useState('Sale');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  // Modal States
  const [modals, setModals] = useState({ add: false, edit: false, delete: false });
  const [selectedEntry, setSelectedEntry] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({ date: new Date().toLocaleDateString('en-GB'), description: '', amount: '', type: 'credit' });

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    try { 
      setLoading(true);
      const d = await getLedgerEntries(); 
      setEntries(d); 
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // --- CRUD FUNCTIONS ---
  const handleAddEntry = async () => {
    if (!formData.amount || !formData.description) return showToast("Please fill all fields");
    try {
      const payload = {
        party_name: activeParty,
        party_type: activeType,
        entry_type: formData.type,
        description: formData.description,
        amount: Number(formData.amount),
        date: formData.date
      };
      const saved = await addLedgerEntry(payload);
      setEntries([...entries, saved]);
      setModals({...modals, add: false});
      showToast("Entry Posted Successfully");
      setFormData({ date: new Date().toLocaleDateString('en-GB'), description: '', amount: '', type: 'credit' });
    } catch (e) { showToast("Error saving entry"); }
  };

  const handleUpdateEntry = async () => {
    try {
      const updated = await updateLedgerEntry(selectedEntry._id, {
        description: formData.description,
        amount: Number(formData.amount),
        date: formData.date,
        entry_type: formData.type
      });
      setEntries(entries.map(e => e._id === selectedEntry._id ? updated : e));
      setModals({...modals, edit: false});
      showToast("Entry Updated");
    } catch (e) { showToast("Update failed"); }
  };

  const confirmDelete = async () => {
    try {
      await deleteLedgerEntry(selectedEntry._id);
      setEntries(entries.filter(e => e._id !== selectedEntry._id));
      setModals({...modals, delete: false});
      showToast("Entry Deleted Permanently");
    } catch (e) { showToast("Delete failed"); }
  };

  const openEdit = (e) => {
    setSelectedEntry(e);
    setFormData({ date: e.date, description: e.description, amount: e.amount, type: e.entry_type });
    setModals({...modals, edit: true});
  };

  const openDelete = (e) => {
    setSelectedEntry(e);
    setModals({...modals, delete: true});
  };

  const processedData = useMemo(() => {
    if (!activeParty) return [];
    let running = 0;
    return entries
      .filter(e => e.party_name === activeParty)
      .filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a,b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')))
      .map(e => {
        if (e.entry_type === 'debit') running += Number(e.amount);
        else running -= Number(e.amount);
        return { ...e, runningBalance: running };
      });
  }, [entries, activeParty, searchTerm]);

  if (loading) return <div className="h-screen flex items-center justify-center text-emerald-500 font-black animate-pulse bg-[#070707]">CORE FIN-SYSTEM LOADING...</div>;

  return (
    <div className="flex h-screen bg-[#070707] text-white overflow-hidden">
      {/* Sidebar */}
      <div className={`transition-all duration-500 border-r border-white/5 bg-[#0c0c0c] flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-80'}`}>
         <div className="p-8 border-b border-white/5 flex items-center justify-between">
            {!isSidebarCollapsed && <span className="font-black text-emerald-500 tracking-tighter uppercase text-lg">FinAccount Pro</span>}
            <button onClick={()=>setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-transform active:scale-90"><ChevronLeft size={20}/></button>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-1">
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl mb-6">
                <button onClick={()=>{setActiveType('Sale'); setActiveParty(null);}} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${activeType==='Sale' ? 'bg-emerald-500 text-black' : 'text-gray-500'}`}>SALES</button>
                <button onClick={()=>{setActiveType('Purchase'); setActiveParty(null);}} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${activeType==='Purchase' ? 'bg-emerald-500 text-black' : 'text-gray-500'}`}>PURCHASE</button>
            </div>
            {ALL_PARTIES.filter(p=>p.type===activeType).map(p => (
              <button key={p.name} onClick={()=>setActiveParty(p.name)} className={`w-full text-left p-4 rounded-2xl text-xs font-bold transition-all ${activeParty===p.name ? 'bg-emerald-500 text-black shadow-2xl shadow-emerald-500/20 scale-[1.02]' : 'text-gray-500 hover:bg-white/5'}`}>
                {p.name}
              </button>
            ))}
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {toast && <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-10 py-4 rounded-full font-black shadow-3xl z-[2000] animate-in slide-in-from-top duration-500">{toast}</div>}

        {!activeParty ? (
           <div className="flex-1 flex items-center justify-center opacity-10 font-black text-8xl italic select-none tracking-tighter">LEDGER SYSTEM</div>
        ) : (
          <div className="flex-1 flex flex-col p-10 gap-10 overflow-hidden">
             {/* Header */}
             <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-7xl font-black italic tracking-tighter text-white uppercase leading-tight">{activeParty}</h1>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-2 flex items-center gap-3"><Calendar size={12} className="text-emerald-500"/> Statement Period: 2026-2027 Financial Year</p>
                </div>
                <div className="flex gap-4">
                   <div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors" size={16}/><input placeholder="Search records..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500 w-80 transition-all"/></div>
                   <button onClick={()=>setModals({...modals, add:true})} className="bg-emerald-500 text-black px-8 rounded-2xl font-black text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 uppercase shadow-xl shadow-emerald-500/20"><Plus size={18} strokeWidth={3}/> New Posting</button>
                </div>
             </div>

             {/* Oracle Style Stats */}
             <div className="grid grid-cols-3 gap-8">
                <div className="bg-[#111] p-10 rounded-[3rem] border border-white/5 relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]"></div>
                   <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-4">Account Receivables (Debit)</span>
                   <span className="text-4xl font-black">Rs. {processedData.filter(e=>e.entry_type==='debit').reduce((s,e)=>s+Number(e.amount),0).toLocaleString()}</span>
                </div>
                <div className="bg-[#111] p-10 rounded-[3rem] border border-white/5 relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div>
                   <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-4">Total Realized (Credit)</span>
                   <span className="text-4xl font-black">Rs. {processedData.filter(e=>e.entry_type==='credit').reduce((s,e)=>s+Number(e.amount),0).toLocaleString()}</span>
                </div>
                <div className="bg-emerald-500 p-10 rounded-[3rem] text-black shadow-2xl shadow-emerald-500/20">
                   <span className="text-[10px] font-black opacity-40 uppercase tracking-widest block mb-4">Total Net Outstanding</span>
                   <span className="text-4xl font-black">Rs. {(processedData.filter(e=>e.entry_type==='debit').reduce((s,e)=>s+Number(e.amount),0) - processedData.filter(e=>e.entry_type==='credit').reduce((s,e)=>s+Number(e.amount),0)).toLocaleString()}</span>
                </div>
             </div>

             {/* SAP Table Container */}
             <div className="flex-1 bg-[#111] rounded-[3.5rem] border border-white/5 overflow-hidden flex flex-col shadow-inner">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <table className="w-full text-left border-separate border-spacing-0">
                      <thead className="sticky top-0 bg-[#1a1a1a] z-50">
                         <tr>
                            <th className="p-8 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">Posting Date</th>
                            <th className="p-8 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">Narrative</th>
                            <th className="p-8 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 text-right">Debit</th>
                            <th className="p-8 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 text-right">Credit</th>
                            <th className="p-8 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 text-right">Running</th>
                            <th className="p-8 border-b border-white/5"></th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {processedData.map(e => (
                           <tr key={e._id} className="hover:bg-white/[0.02] transition-all group">
                              <td className="p-8 font-mono text-xs text-gray-400">{e.date}</td>
                              <td className="p-8">
                                <p className="font-bold text-sm uppercase">{e.description}</p>
                                {e.bill_id && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-black mt-1 inline-block border border-emerald-500/20">SYSTEM INVOICE</span>}
                              </td>
                              <td className="p-8 text-right font-black text-red-500 text-lg">Rs. {e.entry_type==='debit' ? e.amount.toLocaleString() : '—'}</td>
                              <td className="p-8 text-right font-black text-emerald-500 text-lg">Rs. {e.entry_type==='credit' ? e.amount.toLocaleString() : '—'}</td>
                              <td className="p-8 text-right"><span className="bg-white/5 px-6 py-3 rounded-2xl font-black text-xl tracking-tighter italic text-gray-200">Rs. {e.runningBalance.toLocaleString()}</span></td>
                              <td className="p-8 text-right">
                                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                    <button onClick={()=>openEdit(e)} className="p-3 bg-white/5 hover:bg-emerald-500 hover:text-black rounded-xl transition-all"><Pencil size={16}/></button>
                                    <button onClick={()=>openDelete(e)} className="p-3 bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 size={16}/></button>
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

      {/* --- ADD MODAL --- */}
      {modals.add && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[2000] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#111] border border-white/10 w-full max-w-xl rounded-[3rem] p-12 shadow-3xl scale-in-center">
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-3xl font-black italic tracking-tighter uppercase">New <span className="text-emerald-500">Posting</span></h3>
                 <button onClick={()=>setModals({...modals, add:false})} className="p-4 bg-white/5 rounded-full hover:bg-red-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={()=>setFormData({...formData, type:'debit'})} className={`p-6 rounded-3xl font-black text-[10px] tracking-widest border transition-all ${formData.type==='debit' ? 'bg-red-500 text-black border-red-500' : 'bg-white/5 border-white/10 text-gray-500'}`}>DEBIT (SALE)</button>
                    <button onClick={()=>setFormData({...formData, type:'credit'})} className={`p-6 rounded-3xl font-black text-[10px] tracking-widest border transition-all ${formData.type==='credit' ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 border-white/10 text-gray-500'}`}>CREDIT (PAID)</button>
                 </div>
                 <div className="space-y-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-500 ml-4">NARRATION</label><input value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} placeholder="ENTER TRANSACTION DETAILS" className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none font-bold text-sm focus:border-emerald-500" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-500 ml-4">POSTING AMOUNT</label><input type="number" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} placeholder="0.00" className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none font-black text-2xl focus:border-emerald-500" /></div>
                 </div>
                 <button onClick={handleAddEntry} className="w-full bg-emerald-500 text-black p-6 rounded-[2rem] font-black tracking-widest text-xs uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-emerald-500/20">Execute Posting</button>
              </div>
           </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {modals.edit && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[2000] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#111] border border-white/10 w-full max-w-xl rounded-[3rem] p-12 shadow-3xl scale-in-center">
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-3xl font-black italic tracking-tighter uppercase">Edit <span className="text-emerald-500">Posting</span></h3>
                 <button onClick={()=>setModals({...modals, edit:false})} className="p-4 bg-white/5 rounded-full hover:bg-red-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="space-y-6">
                 <input value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} placeholder="DD/MM/YYYY" className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none font-bold" />
                 <input value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} placeholder="Narrative" className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none font-bold" />
                 <input type="number" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} placeholder="Amount" className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none font-black text-2xl" />
                 <button onClick={handleUpdateEntry} className="w-full bg-emerald-500 text-black p-6 rounded-[2rem] font-black tracking-widest text-xs uppercase">Commit Changes</button>
              </div>
           </div>
        </div>
      )}

      {/* --- DELETE CONFIRM --- */}
      {modals.delete && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[3000] flex items-center justify-center p-6 animate-in zoom-in-95">
           <div className="bg-[#111] border border-red-500/20 w-full max-w-md rounded-[3rem] p-12 text-center shadow-3xl">
              <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><AlertCircle size={48}/></div>
              <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter text-white">Reverse Posting?</h3>
              <p className="text-gray-500 text-sm font-bold mb-12 px-4 leading-relaxed">This action cannot be undone. This entry will be permanently reversed and removed from the financial database.</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={()=>setModals({...modals, delete:false})} className="p-6 rounded-3xl bg-white/5 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors">Abort</button>
                 <button onClick={confirmDelete} className="p-6 rounded-3xl bg-red-600 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-600/20 hover:bg-red-700 transition-all">Confirm Delete</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
