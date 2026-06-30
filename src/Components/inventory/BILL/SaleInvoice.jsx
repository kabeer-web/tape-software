import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry 
} from "../../../api";
import { 
  Users, Plus, Trash2, Pencil, Search, Calendar, 
  Wallet, ChevronLeft, ChevronRight, X, AlertCircle, 
  CheckCircle2, Download, ChevronDown
} from 'lucide-react';

const SALE_PARTIES = ['AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY','ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE','ZEESHAN HYD','ABDUL BASIT','MD TRADERS','MUNEER BHAI','ANWAR BHAI','FAROOQ BHAI','GR TRADER','HAMZA SIALKOT','HASHMI TRADER','GAIN TEX INTERNATIONAL','NAQI TAQI','MEMON ELECTRIC','MOK PAKistan TRADER','SABIR BROTHER 1','SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE','SUJJAD ALI','USAMA STATIONARY','ZEESHAN HAIDRABAD','WAHEED WALI','AL FAREED','SHOKAT HAYAT','GUL AMIR','AJ ARSALAN','HAS GR TRADER','MUDASIR MEMON','UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI','BILAL BHAI','FARHAN NEW KARACHI','N.K ENTERPRISES'];
const PURCHASE_PARTIES = ['UNIVERSAL COTTING','KOSHER','CHAWLA INDUSTRY','IBAD CORE','TAHSEEN CARTON','TALHA WASEEM','ASGHR CORE','DEER TAPE','SAMAD BHAI'];

// --- RESTORED SEARCHABLE DROPDOWN COMPONENT ---
const PartyPicker = ({ value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const filtered = options.filter(o => o.toLowerCase().includes(value.toLowerCase()));

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <input 
          value={value} onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} placeholder={placeholder}
          className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm"
        />
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16}/>
      </div>
      {open && (
        <div className="absolute z-[3000] mt-2 w-full max-h-60 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl">
          {filtered.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }} className="w-full text-left p-4 hover:bg-emerald-500 hover:text-black transition-colors text-xs font-bold border-b border-white/5">
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeParty, setActiveParty] = useState(null);
  const [activeType, setActiveType] = useState('Sale');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  const [modals, setModals] = useState({ add: false, edit: false, delete: false });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState({ 
    date: new Date().toLocaleDateString('en-GB'), 
    party_name: '', 
    description: '', 
    amount: '', 
    type: 'credit' 
  });

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    try { const d = await getLedgerEntries(); setEntries(d); } 
    catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleAction = async (action) => {
    try {
      if (action === 'add') {
        const payload = { ...formData, party_name: formData.party_name || activeParty, party_type: activeType, entry_type: formData.type, amount: Number(formData.amount) };
        const saved = await addLedgerEntry(payload);
        setEntries([...entries, saved]);
        setModals({ ...modals, add: false });
      } else if (action === 'update') {
        const updated = await updateLedgerEntry(selectedEntry._id, { ...formData, amount: Number(formData.amount), entry_type: formData.type });
        setEntries(entries.map(e => e._id === selectedEntry._id ? updated : e));
        setModals({ ...modals, edit: false });
      } else if (action === 'delete') {
        await deleteLedgerEntry(selectedEntry._id);
        setEntries(entries.filter(e => e._id !== selectedEntry._id));
        setModals({ ...modals, delete: false });
      }
      showToast(`Entry ${action === 'delete' ? 'Deleted' : 'Saved'} Successfully!`);
      setFormData({ date: new Date().toLocaleDateString('en-GB'), party_name: '', description: '', amount: '', type: 'credit' });
    } catch (e) { showToast("Operation Failed"); }
  };

  const processedData = useMemo(() => {
    if (!activeParty) return [];
    let running = 0;
    return entries
      .filter(e => e.party_name === activeParty)
      .filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a,b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')))
      .map((e, idx) => {
        // Screenshot Logic: Credit increases total, Debit decreases total
        if (e.entry_type === 'credit') running += Number(e.amount);
        else running -= Number(e.amount);
        return { ...e, index: idx + 1, runningBalance: running };
      });
  }, [entries, activeParty, searchTerm]);

  if (loading) return <div className="h-screen flex items-center justify-center text-emerald-500 font-black animate-pulse">SYSTEM LOADING...</div>;

  return (
    <div className="flex h-screen bg-[#070707] text-white overflow-hidden font-sans">
      {/* Toast */}
      {toast && <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-10 py-4 rounded-full font-black shadow-3xl z-[5000]">{toast}</div>}

      {/* Sidebar */}
      <div className={`transition-all duration-500 border-r border-white/5 bg-[#0c0c0c] flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-80'}`}>
         <div className="p-8 border-b border-white/5 flex items-center justify-between">
            {!isSidebarCollapsed && <span className="font-black text-emerald-500 tracking-tighter uppercase">Ledger Account</span>}
            <button onClick={()=>setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-white/5 rounded-xl"><ChevronLeft size={20}/></button>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-1">
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl mb-6">
                <button onClick={()=>{setActiveType('Sale'); setActiveParty(null);}} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${activeType==='Sale' ? 'bg-emerald-500 text-black' : 'text-gray-500'}`}>SALES</button>
                <button onClick={()=>{setActiveType('Purchase'); setActiveParty(null);}} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${activeType==='Purchase' ? 'bg-emerald-500 text-black' : 'text-gray-500'}`}>PURCHASE</button>
            </div>
            {(activeType === 'Sale' ? SALE_PARTIES : PURCHASE_PARTIES).map(p => (
              <button key={p} onClick={()=>setActiveParty(p)} className={`w-full text-left p-4 rounded-2xl text-xs font-bold transition-all ${activeParty===p ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:bg-white/5'}`}>
                {p}
              </button>
            ))}
         </div>
      </div>

      {/* Main View */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {!activeParty ? (
           <div className="flex-1 flex items-center justify-center opacity-10 font-black text-7xl italic">BANK ACCOUNT JUNE</div>
        ) : (
          <div className="flex-1 flex flex-col p-10 gap-8 overflow-hidden">
             
             {/* Header */}
             <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-6xl font-black italic tracking-tighter text-white uppercase leading-none">{activeParty}</h1>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-4">Transactions & Financial Statement</p>
                </div>
                <div className="flex gap-4">
                   <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16}/><input placeholder="Search Narration..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500 w-80"/></div>
                   <button onClick={()=>setModals({...modals, add:true})} className="bg-emerald-500 text-black px-8 rounded-2xl font-black text-[10px] tracking-widest hover:scale-105 transition-all flex items-center gap-2 uppercase shadow-xl"><Plus size={18} strokeWidth={3}/> New Entry</button>
                </div>
             </div>

             {/* Table - Exact columns from screenshot */}
             <div className="flex-1 bg-[#111] rounded-[3rem] border border-white/5 overflow-hidden flex flex-col shadow-inner">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <table className="w-full text-left border-separate border-spacing-0">
                      <thead className="sticky top-0 bg-[#1a1a1a] z-50">
                         <tr>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase">ID NO</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase">DATE</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase">PARTY&FACTORY</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase">CASH & CHQ</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase text-right">DEBIT</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase text-right">CREDIT</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase text-right">TOTAL</th>
                            <th className="p-6"></th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {processedData.map((e, i) => (
                           <tr key={e._id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="p-6 font-mono text-xs text-gray-500">{e.index}</td>
                              <td className="p-6 font-mono text-xs text-gray-400">{e.date}</td>
                              <td className="p-6 font-bold text-sm uppercase">{e.party_name}</td>
                              <td className="p-6 text-sm text-gray-300">{e.description}</td>
                              <td className="p-6 text-right font-black text-red-500">{e.entry_type==='debit' ? e.amount.toLocaleString() : ''}</td>
                              <td className="p-6 text-right font-black text-emerald-500">{e.entry_type==='credit' ? e.amount.toLocaleString() : ''}</td>
                              <td className="p-6 text-right font-black text-lg tracking-tighter">Rs. {e.runningBalance.toLocaleString()}</td>
                              <td className="p-6 text-right">
                                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                    <button onClick={() => { setSelectedEntry(e); setFormData({date:e.date, description:e.description, amount:e.amount, type:e.entry_type}); setModals({...modals, edit:true}); }} className="p-2 hover:bg-white/10 rounded-lg text-emerald-500"><Pencil size={14}/></button>
                                    <button onClick={() => { setSelectedEntry(e); setModals({...modals, delete:true}); }} className="p-2 hover:bg-white/10 rounded-lg text-red-500"><Trash2 size={14}/></button>
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

      {/* --- ADD / EDIT MODAL --- */}
      {(modals.add || modals.edit) && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[2000] flex items-center justify-center p-6">
           <div className="bg-[#111] border border-white/10 w-full max-w-xl rounded-[3rem] p-12 shadow-3xl">
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-3xl font-black italic tracking-tighter uppercase">{modals.add ? 'New Posting' : 'Edit Entry'}</h3>
                 <button onClick={()=>setModals({add:false, edit:false})} className="p-4 bg-white/5 rounded-full hover:bg-red-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="space-y-6">
                 {modals.add && <PartyPicker value={formData.party_name} onChange={(v)=>setFormData({...formData, party_name:v})} options={activeType === 'Sale' ? SALE_PARTIES : PURCHASE_PARTIES} placeholder="SELECT PARTY" />}
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={()=>setFormData({...formData, type:'debit'})} className={`p-5 rounded-2xl font-black text-xs border ${formData.type==='debit' ? 'bg-red-500 text-black border-red-500' : 'bg-white/5 border-white/10 text-gray-500'}`}>DEBIT (OUT)</button>
                    <button onClick={()=>setFormData({...formData, type:'credit'})} className={`p-5 rounded-2xl font-black text-xs border ${formData.type==='credit' ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 border-white/10 text-gray-500'}`}>CREDIT (IN)</button>
                 </div>
                 <input placeholder="DATE (DD/MM/YYYY)" value={formData.date} onChange={e=>setFormData({...formData, date:e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none font-bold" />
                 <input placeholder="CASH / CHQ DESCRIPTION" value={formData.description} onChange={e=>setFormData({...formData, description:e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none font-bold" />
                 <input type="number" placeholder="AMOUNT" value={formData.amount} onChange={e=>setFormData({...formData, amount:e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none font-black text-2xl focus:border-emerald-500" />
                 <button onClick={()=>handleAction(modals.add ? 'add' : 'update')} className="w-full bg-emerald-500 text-black p-6 rounded-[2rem] font-black uppercase tracking-widest">Execute Entry</button>
              </div>
           </div>
        </div>
      )}

      {/* --- DELETE MODAL --- */}
      {modals.delete && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[3000] flex items-center justify-center p-6">
           <div className="bg-[#111] border border-red-500/20 w-full max-w-md rounded-[3rem] p-12 text-center shadow-3xl">
              <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><AlertCircle size={48}/></div>
              <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter text-white">Reverse Entry?</h3>
              <p className="text-gray-500 text-sm font-bold mb-12 px-4 leading-relaxed">This record will be permanently removed from the ledger database.</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={()=>setModals({...modals, delete:false})} className="p-6 rounded-3xl bg-white/5 font-black text-[10px] uppercase tracking-widest">Cancel</button>
                 <button onClick={()=>handleAction('delete')} className="p-6 rounded-3xl bg-red-600 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-600/20">Confirm</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
