import { useState, useEffect, useMemo } from 'react';
import { 
  getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry 
} from "../../../api";
import { 
  Users, Plus, Trash2, Pencil, Search, Filter, Calendar, 
  ArrowUpRight, ArrowDownLeft, Wallet, ChevronLeft, 
  ChevronRight, MoreHorizontal, X, AlertCircle, CheckCircle2,
  Download, FilterX, Receipt
} from 'lucide-react';

const SALE_PARTIES = ['AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY','ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE','ZEESHAN HYD','ABDUL BASIT','MD TRADERS','MUNEER BHAI','ANWAR BHAI','FAROOQ BHAI','GR TRADER','HAMZA SIALKOT','HASHMI TRADER','GAIN TEX INTERNATIONAL','NAQI TAQI','MEMON ELECTRIC','MOK PAKISTAN TRADER','SABIR BROTHER 1','SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE','SUJJAD ALI','USAMA STATIONARY','ZEESHAN HAIDRABAD','WAHEED WALI','AL FAREED','SHOKAT HAYAT','GUL AMIR','AJ ARSALAN','HAS GR TRADER','MUDASIR MEMON','UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI','BILAL BHAI','FARHAN NEW KARACHI','N.K ENTERPRISES'];
const PURCHASE_PARTIES = ['UNIVERSAL COTTING','KOSHER','CHAWLA INDUSTRY','IBAD CORE','TAHSEEN CARTON','TALHA WASEEM','ASGHR CORE','DEER TAPE','SAMAD BHAI'];
const ALL_PARTIES = [...SALE_PARTIES.map(n => ({ name: n, type: 'Sale' })), ...PURCHASE_PARTIES.map(n => ({ name: n, type: 'Purchase' }))];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeParty, setActiveParty] = useState(null);
  const [activeType, setActiveType] = useState('Sale');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(2026);

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

  const stats = useMemo(() => {
    const dr = processedData.filter(e=>e.entry_type==='debit').reduce((s,e)=>s+Number(e.amount),0);
    const cr = processedData.filter(e=>e.entry_type==='credit').reduce((s,e)=>s+Number(e.amount),0);
    return { dr, cr, bal: dr - cr };
  }, [processedData]);

  if (loading) return <div className="h-screen flex items-center justify-center text-emerald-500 font-black tracking-widest animate-pulse">LOADING SYSTEM...</div>;

  return (
    <div className="flex h-screen bg-[#070707] text-white overflow-hidden">
      
      {/* Sidebar */}
      <div className={`transition-all duration-300 border-r border-white/5 bg-[#0c0c0c] flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-80'}`}>
         <div className="p-6 border-b border-white/5 flex items-center justify-between">
            {!isSidebarCollapsed && <span className="font-black text-emerald-500 italic tracking-tighter">LEDGER PRO</span>}
            <button onClick={()=>setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-white/5 rounded-xl"><ChevronLeft size={18}/></button>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {ALL_PARTIES.filter(p=>p.type===activeType).map(p => (
              <button key={p.name} onClick={()=>setActiveParty(p.name)} className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition-all ${activeParty===p.name ? 'bg-emerald-500 text-black' : 'text-gray-500 hover:bg-white/5'}`}>
                {p.name}
              </button>
            ))}
         </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {toast && <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-6 py-3 rounded-2xl font-black shadow-2xl z-[500] animate-in fade-in slide-in-from-top-4">{toast}</div>}

        {!activeParty ? (
           <div className="flex-1 flex items-center justify-center opacity-10 font-black text-6xl italic">SELECT PARTY</div>
        ) : (
          <div className="flex-1 flex flex-col p-8 gap-8 overflow-hidden">
             
             {/* Header */}
             <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-6xl font-black italic tracking-tighter text-emerald-500 uppercase leading-none">{activeParty}</h1>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-4 flex items-center gap-2"><Calendar size={12}/> Account Statement — {selectedMonth} {selectedYear}</p>
                </div>
                <div className="flex gap-3">
                   <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14}/><input placeholder="Search records..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-white/5 border border-white/10 p-3 pl-10 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500 w-64"/></div>
                   <button onClick={()=>setModals({...modals, add:true})} className="bg-emerald-500 text-black px-6 rounded-2xl font-black text-xs hover:scale-105 transition-all flex items-center gap-2"><Plus size={16}/> NEW ENTRY</button>
                </div>
             </div>

             {/* Stats */}
             <div className="grid grid-cols-3 gap-6">
                <div className="bg-[#121212] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                   <span className="text-[10px] font-black text-gray-500 uppercase block mb-2">Total Debit (Sales)</span>
                   <span className="text-3xl font-black">Rs. {stats.dr.toLocaleString()}</span>
                </div>
                <div className="bg-[#121212] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                   <span className="text-[10px] font-black text-gray-500 uppercase block mb-2">Total Credit (Paid)</span>
                   <span className="text-3xl font-black">Rs. {stats.cr.toLocaleString()}</span>
                </div>
                <div className="bg-emerald-500 p-8 rounded-[2.5rem] shadow-xl shadow-emerald-500/10 text-black">
                   <span className="text-[10px] font-black opacity-40 uppercase block mb-2">Net Balance</span>
                   <span className="text-3xl font-black">Rs. {stats.bal.toLocaleString()}</span>
                </div>
             </div>

             {/* Table */}
             <div className="flex-1 bg-[#121212] rounded-[3rem] border border-white/5 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto">
                   <table className="w-full text-left">
                      <thead className="sticky top-0 bg-[#1a1a1a] z-10">
                         <tr>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase">Date</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase">Description</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase text-right">Debit</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase text-right">Credit</th>
                            <th className="p-6 text-[10px] font-black text-gray-500 uppercase text-right">Running</th>
                            <th className="p-6 text-center"></th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {processedData.map(e => (
                           <tr key={e._id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="p-6 font-mono text-xs text-gray-500">{e.date}</td>
                              <td className="p-6 font-bold text-sm">{e.description}</td>
                              <td className="p-6 text-right font-black text-red-500">Rs. {e.entry_type==='debit' ? e.amount.toLocaleString() : '—'}</td>
                              <td className="p-6 text-right font-black text-emerald-500">Rs. {e.entry_type==='credit' ? e.amount.toLocaleString() : '—'}</td>
                              <td className="p-6 text-right font-black text-xl tracking-tighter italic">Rs. {e.runningBalance.toLocaleString()}</td>
                              <td className="p-6">
                                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-center">
                                    <button className="p-2 hover:bg-white/10 rounded-lg text-emerald-500"><Pencil size={14}/></button>
                                    <button className="p-2 hover:bg-white/10 rounded-lg text-red-500"><Trash2 size={14}/></button>
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

      {/* Manual Entry Modal */}
      {modals.add && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
           <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-10 shadow-3xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-2xl font-black italic tracking-tighter">NEW <span className="text-emerald-500">TRANSACTION</span></h3>
                 <button onClick={()=>setModals({...modals, add:false})}><X/></button>
              </div>
              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={()=>setFormData({...formData, type:'debit'})} className={`p-4 rounded-2xl font-black text-xs border ${formData.type==='debit' ? 'bg-red-500 text-black border-red-500' : 'bg-white/5 border-white/10'}`}>DEBIT (SALE)</button>
                    <button onClick={()=>setFormData({...formData, type:'credit'})} className={`p-4 rounded-2xl font-black text-xs border ${formData.type==='credit' ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 border-white/10'}`}>CREDIT (PAID)</button>
                 </div>
                 <input placeholder="Transaction Description" className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none font-bold" />
                 <input type="number" placeholder="Amount (PKR)" className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none font-bold" />
                 <button className="w-full bg-emerald-500 text-black p-5 rounded-[1.5rem] font-black tracking-widest text-xs hover:scale-105 transition-all">SAVE TRANSACTION</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
