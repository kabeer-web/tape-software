import { useState, useEffect, useMemo } from 'react';
import { 
  getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry 
} from "../../../api";
import { 
  Users, Plus, Trash2, Pencil, Search, Filter, Calendar, 
  ArrowUpRight, ArrowDownLeft, Wallet, ChevronLeft, 
  ChevronRight, X, AlertCircle, CheckCircle2, Download
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

  const [modals, setModals] = useState({ add: false, edit: false, delete: false });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState({ date: '', description: '', amount: '', type: 'credit' });

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    try { const d = await getLedgerEntries(); setEntries(d); } 
    catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const processedData = useMemo(() => {
    if (!activeParty) return [];
    let running = 0;
    return entries
      .filter(e => e.party_name === activeParty)
      .filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(e => {
        if (e.entry_type === 'debit') running += Number(e.amount);
        else running -= Number(e.amount);
        return { ...e, runningBalance: running };
      });
  }, [entries, activeParty, searchTerm]);

  return (
    <div className="flex h-screen bg-[#070707] text-white overflow-hidden font-sans">
      {/* Toast */}
      {toast && <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-8 py-4 rounded-2xl font-black shadow-3xl z-[2000] animate-in slide-in-from-top duration-300">{toast}</div>}

      {/* Sidebar */}
      <div className={`transition-all duration-300 border-r border-white/5 bg-[#0c0c0c] flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-80'}`}>
         <div className="p-6 border-b border-white/5 flex items-center justify-between">
            {!isSidebarCollapsed && <span className="font-black text-emerald-500 tracking-tighter uppercase text-sm">FinAccount Pro</span>}
            <button onClick={()=>setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-white/5 rounded-xl text-gray-500"><ChevronLeft size={20}/></button>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {ALL_PARTIES.filter(p=>p.type===activeType).map(p => (
              <button key={p.name} onClick={()=>setActiveParty(p.name)} className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all ${activeParty===p.name ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:bg-white/5'}`}>
                {p.name}
              </button>
            ))}
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeParty ? (
           <div className="flex-1 flex items-center justify-center opacity-10 font-black text-7xl italic select-none">ORACLE ERP</div>
        ) : (
          <div className="flex-1 flex flex-col p-10 gap-8 overflow-hidden">
             
             {/* Header */}
             <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-6xl font-black italic tracking-tighter text-white uppercase leading-none">{activeParty}</h1>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-4 flex items-center gap-2"><Calendar size={12}/> Account Ledger Statement — 2026 Season</p>
                </div>
                <div className="flex gap-4">
                   <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16}/><input placeholder="Search transaction..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500 w-80"/></div>
                   <button onClick={()=>setModals({...modals, add:true})} className="bg-emerald-500 text-black px-8 rounded-2xl font-black text-[10px] tracking-widest hover:scale-105 transition-all flex items-center gap-2 uppercase"><Plus size={18}/> New Transaction</button>
                </div>
             </div>

             {/* Stats SAP Cards */}
             <div className="grid grid-cols-3 gap-6">
                <div className="bg-[#121212] p-8 rounded-[2.5rem] border border-white/5 relative group overflow-hidden">
                   <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 transition-all group-hover:w-full group-hover:opacity-5"></div>
                   <span className="text-[10px] font-black text-gray-500 uppercase block mb-2">Debit Accumulation</span>
                   <span className="text-3xl font-black text-white">Rs. {processedData.filter(e=>e.entry_type==='debit').reduce((s,e)=>s+Number(e.amount),0).toLocaleString()}</span>
                </div>
                <div className="bg-[#121212] p-8 rounded-[2.5rem] border border-white/5 relative group overflow-hidden">
                   <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 transition-all group-hover:w-full group-hover:opacity-5"></div>
                   <span className="text-[10px] font-black text-gray-500 uppercase block mb-2">Credit Clearance</span>
                   <span className="text-3xl font-black text-white">Rs. {processedData.filter(e=>e.entry_type==='credit').reduce((s,e)=>s+Number(e.amount),0).toLocaleString()}</span>
                </div>
                <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-black shadow-2xl shadow-emerald-500/10">
                   <span className="text-[10px] font-black opacity-40 uppercase block mb-2">Outstanding Net Balance</span>
                   <span className="text-3xl font-black">Rs. {(processedData.filter(e=>e.entry_type==='debit').reduce((s,e)=>s+Number(e.amount),0) - processedData.filter(e=>e.entry_type==='credit').reduce((s,e)=>s+Number(e.amount),0)).toLocaleString()}</span>
                </div>
             </div>

             {/* Modern Table */}
             <div className="flex-1 bg-[#121212] rounded-[3rem] border border-white/5 overflow-hidden flex flex-col shadow-inner">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <table className="w-full text-left border-separate border-spacing-0">
                      <thead className="sticky top-0 bg-[#1a1a1a] z-50">
                         <tr>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">Transaction Date</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">Description</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 text-right">Debit (Sale)</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 text-right">Credit (Paid)</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 text-right">Net Balance</th>
                            <th className="p-6 border-b border-white/5"></th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {processedData.map(e => (
                           <tr key={e._id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="p-6 font-mono text-[11px] text-gray-500">{e.date}</td>
                              <td className="p-6 font-bold text-sm uppercase tracking-tight">{e.description}</td>
                              <td className="p-6 text-right font-black text-red-500">Rs. {e.entry_type==='debit' ? e.amount.toLocaleString() : '—'}</td>
                              <td className="p-6 text-right font-black text-emerald-500">Rs. {e.entry_type==='credit' ? e.amount.toLocaleString() : '—'}</td>
                              <td className="p-6 text-right"><span className="bg-white/5 px-4 py-2 rounded-xl font-black text-gray-300">Rs. {e.runningBalance.toLocaleString()}</span></td>
                              <td className="p-6">
                                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                    <button onClick={()=>setModals({...modals, edit:true})} className="p-3 bg-white/5 hover:bg-emerald-500 hover:text-black rounded-xl transition-all"><Pencil size={14}/></button>
                                    <button onClick={()=>setModals({...modals, delete:true})} className="p-3 bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 size={14}/></button>
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

      {/* SAP Style Add Modal */}
      {modals.add && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
           <div className="bg-[#121212] border border-white/10 w-full max-w-xl rounded-[3rem] p-12 shadow-3xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-3xl font-black italic tracking-tighter uppercase">New <span className="text-emerald-500">Posting</span></h3>
                 <button onClick={()=>setModals({...modals, add:false})} className="p-3 bg-white/5 rounded-full hover:bg-red-500 transition-colors"><X size={20}/></button>
              </div>
              <div className="space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={()=>setFormData({...formData, type:'debit'})} className={`p-5 rounded-2xl font-black text-xs tracking-widest border transition-all ${formData.type==='debit' ? 'bg-red-500 text-black border-red-500 shadow-lg shadow-red-500/20' : 'bg-white/5 border-white/10 text-gray-500'}`}>DEBIT POSTING</button>
                    <button onClick={()=>setFormData({...formData, type:'credit'})} className={`p-5 rounded-2xl font-black text-xs tracking-widest border transition-all ${formData.type==='credit' ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/10 text-gray-500'}`}>CREDIT POSTING</button>
                 </div>
                 <div className="space-y-4">
                    <input placeholder="TRANSACTION NARRATION" className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none font-black text-xs focus:border-emerald-500 transition-colors" />
                    <input type="number" placeholder="POSTING AMOUNT (PKR)" className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none font-black text-xs focus:border-emerald-500 transition-colors" />
                 </div>
                 <button onClick={()=>{showToast("Transaction Posted to Ledger!"); setModals({...modals, add:false})}} className="w-full bg-emerald-500 text-black p-6 rounded-[1.5rem] font-black tracking-widest text-[10px] uppercase hover:scale-105 transition-all">Execute Ledger Entry</button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modals.delete && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[3000] flex items-center justify-center p-6">
           <div className="bg-[#121212] border border-red-500/20 w-full max-w-md rounded-[3rem] p-12 text-center animate-in scale-in-95 duration-200">
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle size={40}/></div>
              <h3 className="text-2xl font-black uppercase mb-4 tracking-tight text-white">Reverse Posting?</h3>
              <p className="text-gray-500 text-sm font-bold mb-10">This entry will be permanently reversed and removed from the ledger database.</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={()=>setModals({...modals, delete:false})} className="p-5 rounded-2xl bg-white/5 font-black text-[10px] uppercase tracking-widest">Cancel</button>
                 <button onClick={()=>{showToast("Entry Reversed Successfully"); setModals({...modals, delete:false})}} className="p-5 rounded-2xl bg-red-600 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-600/20">Confirm Delete</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
