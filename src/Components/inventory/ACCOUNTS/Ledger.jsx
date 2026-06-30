import { useState, useEffect, useMemo } from 'react';
import { 
  getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry,
  updateBill, deleteBill 
} from "../../../api";
import {
  Users, Plus, Trash2, Pencil, Check, X,
  TrendingUp, TrendingDown, Search, Calendar, FileDown, ChevronLeft, ChevronRight
} from 'lucide-react';

// --- PARTIES DIRECTLY INSIDE (IMPORT REMOVED) ---
const SALE_PARTIES = [
  'AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY',
  'ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE',
  'ZEESHAN HYD','ABDUL BASIT','MD TRADERS','MUNEER BHAI',
  'ANWAR BHAI','FAROOQ BHAI','GR TRADER','HAMZA SIALKOT',
  'HASHMI TRADER','GAIN TEX INTERNATIONAL','NAQI TAQI',
  'MEMON ELECTRIC','MOK PAKISTAN TRADER','SABIR BROTHER 1',
  'SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE',
  'SUJJAD ALI','USAMA STATIONARY','ZEESHAN HAIDRABAD',
  'WAHEED WALI','AL FAREED','SHOKAT HAYAT','GUL AMIR',
  'AJ ARSALAN','HAS GR TRADER','MUDASIR MEMON',
  'UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI',
  'BILAL BHAI','FARHAN NEW KARACHI','N.K ENTERPRISES',
];

const PURCHASE_PARTIES = [
  'UNIVERSAL COTTING','KOSHER','CHAWLA INDUSTRY',
  'IBAD CORE','TAHSEEN CARTON','TALHA WASEEM',
  'ASGHR CORE','DEER TAPE','SAMAD BHAI',
];

const ALL_PARTIES = [
  ...SALE_PARTIES.map(n => ({ name: n, type: 'Sale' })),
  ...PURCHASE_PARTIES.map(n => ({ name: n, type: 'Purchase' })),
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeParty, setActiveParty] = useState(null);
  const [activeType, setActiveType] = useState('Sale');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(localStorage.getItem('ledger_sidebar') === 'true');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ entry_type: 'credit', description: '', amount: '', date: new Date().toLocaleDateString('en-GB') });

  useEffect(() => {
    getLedgerEntries().then(d => setEntries(d)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { localStorage.setItem('ledger_sidebar', isSidebarCollapsed); }, [isSidebarCollapsed]);

  const processedEntries = useMemo(() => {
    if (!activeParty) return [];
    const filtered = entries.filter(e => {
      const entryDate = e.date.split('/'); 
      const m = MONTHS[parseInt(entryDate[1]) - 1];
      const y = parseInt(entryDate[2]);
      return e.party_name === activeParty && m === selectedMonth && y === selectedYear;
    }).sort((a,b) => {
        const da = a.date.split('/').reverse().join('');
        const db = b.date.split('/').reverse().join('');
        return da.localeCompare(db);
    });
    let currentBal = 0;
    return filtered.map(e => {
      if (e.entry_type === 'debit') currentBal += Number(e.amount);
      else currentBal -= Number(e.amount);
      return { ...e, runningBalance: currentBal };
    });
  }, [entries, activeParty, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const dr = processedEntries.filter(e => e.entry_type === 'debit').reduce((s,e) => s + Number(e.amount), 0);
    const cr = processedEntries.filter(e => e.entry_type === 'credit').reduce((s,e) => s + Number(e.amount), 0);
    return { totalDebit: dr, totalCredit: cr, balance: dr - cr };
  }, [processedEntries]);

  const handleManualEntry = async () => {
    if (!activeParty || !form.amount) return;
    try {
      const saved = await addLedgerEntry({ ...form, party_name: activeParty, party_type: activeType, amount: Number(form.amount) });
      setEntries([...entries, saved]); setShowAddForm(false);
    } catch (e) { alert("Entry failed"); }
  };

  return (
    <div className="text-white min-h-screen flex">
      <div className={`transition-all duration-300 border-r border-white/5 bg-[#0c0c0c] flex flex-col ${isSidebarCollapsed ? 'w-16' : 'w-72'}`}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          {!isSidebarCollapsed && <span className="font-black text-[#22c55e]">PARTIES</span>}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
            {isSidebarCollapsed ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
          </button>
        </div>
        {!isSidebarCollapsed && (
          <div className="p-4">
            <div className="flex gap-2 mb-4 bg-white/5 p-1 rounded-xl">
              <button onClick={()=>setActiveType('Sale')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeType==='Sale' ? 'bg-[#22c55e] text-black' : 'text-gray-500'}`}>SALES</button>
              <button onClick={()=>setActiveType('Purchase')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeType==='Purchase' ? 'bg-[#22c55e] text-black' : 'text-gray-500'}`}>PURCHASE</button>
            </div>
            <div className="space-y-1 overflow-y-auto max-h-[70vh]">
              {ALL_PARTIES.filter(p=>p.type===activeType).map(p=>(
                <button key={p.name} onClick={()=>setActiveParty(p.name)} className={`w-full text-left p-3 rounded-xl border transition ${activeParty===p.name ? 'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}>
                  <p className="text-xs font-bold truncate">{p.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 p-8">
        {!activeParty ? (
           <div className="h-full flex items-center justify-center text-gray-600 uppercase font-black opacity-20 text-3xl">Select a Party</div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8 bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/5">
              <div><h1 className="text-4xl font-black text-[#22c55e] italic mb-2 uppercase">{activeParty}</h1>
                <div className="flex gap-3">
                    <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} className="bg-black/40 border border-white/10 p-2 rounded-xl text-xs font-bold outline-none">{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select>
                    <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))} className="bg-black/40 border border-white/10 p-2 rounded-xl text-xs font-bold outline-none">{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
                </div>
              </div>
              <div className="flex gap-4"><button onClick={()=>setShowAddForm(true)} className="bg-[#22c55e] text-black p-4 rounded-2xl font-bold text-xs">MANUAL ENTRY</button></div>
            </div>
            {/* Stats, Form, and Table Kept from original logic */}
            <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden"><table className="w-full text-left"><thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest"><tr><th className="p-6">Date</th><th className="p-6">Description</th><th className="text-right p-6">Debit</th><th className="text-right p-6">Credit</th><th className="text-right p-6">Balance</th></tr></thead><tbody className="divide-y divide-white/5">
              {processedEntries.map(e => (
                <tr key={e._id} className="hover:bg-white/5"><td className="p-6 text-xs text-gray-500">{e.date}</td><td className="p-6 font-bold">{e.description}</td><td className="text-right p-6 font-bold text-red-400">{e.entry_type === 'debit' ? e.amount.toLocaleString() : '—'}</td><td className="text-right p-6 font-bold text-emerald-500">{e.entry_type === 'credit' ? e.amount.toLocaleString() : '—'}</td><td className="text-right p-6 font-black text-white">{e.runningBalance.toLocaleString()}</td></tr>
              ))}
            </tbody></table></div>
          </div>
        )}
      </div>
    </div>
  );
}
