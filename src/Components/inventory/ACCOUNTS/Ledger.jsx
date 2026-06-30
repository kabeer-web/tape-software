import { useState, useEffect, useMemo } from 'react';
import { getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry } from "../../../api";
import {
  Users, Plus, Trash2, Pencil, Check, X,
  TrendingUp, TrendingDown, Search, Calendar, DollarSign, FileText 
} from 'lucide-react';

// --- COMBINED PARTIES FOR SIDEBAR ---
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

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const today = () => new Date().toLocaleDateString('en-GB');
const parseDate = (d) => { if (!d) return new Date(0); const [dd,mm,yyyy] = String(d).split('/'); return new Date(`${yyyy}-${mm}-${dd}`); };
const getMonth = (d) => { const dt = parseDate(d); return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`; };

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeParty, setActiveParty] = useState(null);
  const [activeType, setActiveType] = useState('Sale');
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ entry_type: 'credit', description: '', amount: '', date: today(), ref_bill_no: '' });
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getLedgerEntries().then(d => setEntries(d)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3000); };

  const partyList = useMemo(() => {
    return ALL_PARTIES
      .filter(p => p.type === activeType)
      .filter(p => search === '' || p.name.toLowerCase().includes(search.toLowerCase()))
      .map(p => {
        const pEntries = entries.filter(e => e.party_name?.toUpperCase() === p.name.toUpperCase());
        const totalDebit  = pEntries.filter(e => e.entry_type === 'debit' ).reduce((s,e) => s+(Number(e.amount)||0), 0);
        const totalCredit = pEntries.filter(e => e.entry_type === 'credit').reduce((s,e) => s+(Number(e.amount)||0), 0);
        return { ...p, entries: pEntries, balance: totalDebit - totalCredit };
      });
  }, [entries, activeType, search]);

  const activePartyData = useMemo(() => activeParty ? partyList.find(p => p.name === activeParty) : null, [partyList, activeParty]);

  const withRunningBalance = useMemo(() => {
    if (!activePartyData) return [];
    const filtered = monthFilter === 'All' ? activePartyData.entries : activePartyData.entries.filter(e => getMonth(e.date) === monthFilter);
    const sorted = [...filtered].sort((a,b) => parseDate(a.date) - parseDate(b.date));
    let bal = 0;
    return sorted.map(e => {
      if (e.entry_type === 'debit') bal += Number(e.amount); else bal -= Number(e.amount);
      return { ...e, runningBalance: bal };
    });
  }, [activePartyData, monthFilter]);

  const handleAdd = async () => {
    if (!activeParty || !form.amount) return;
    try {
      const saved = await addLedgerEntry({ party_name: activeParty, party_type: activeType, ...form, amount: parseFloat(form.amount) });
      setEntries(prev => [...prev, saved]);
      setForm({ entry_type: 'credit', description: '', amount: '', date: today(), ref_bill_no: '' });
      setShowAddForm(false); flash('✅ Entry Saved!');
    } catch (err) { flash('❌ Error'); }
  };

  const handleDelete = async (id) => { if (window.confirm('Delete entry?')) { try { await deleteLedgerEntry(id); setEntries(prev => prev.filter(e => e._id !== id)); flash('✅ Deleted'); } catch (err) { flash('❌ Error'); } } };

  if (loading) return <div className="flex items-center justify-center h-64 text-[#22c55e] font-bold text-xl animate-pulse">LOADING LEDGER...</div>;

  return (
    <div className="text-white min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <Users className="text-[#22c55e]" size={24}/>
        <div><h1 className="text-2xl font-black">PARTY <span className="text-[#22c55e]">LEDGER</span></h1></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-72 shrink-0">
          <div className="flex gap-1 mb-4 bg-white/[0.03] p-1 rounded-2xl border border-white/10">
            <button onClick={() => {setActiveType('Sale'); setActiveParty(null);}} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${activeType==='Sale'?'bg-[#22c55e] text-black':'text-gray-400'}`}>SALES</button>
            <button onClick={() => {setActiveType('Purchase'); setActiveParty(null);}} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${activeType==='Purchase'?'bg-[#22c55e] text-black':'text-gray-400'}`}>PURCHASE</button>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search party..." className="w-full mb-3 p-2.5 bg-white/[0.03] rounded-xl border border-white/10 text-xs outline-none focus:border-[#22c55e]"/>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {partyList.map(p => (
              <button key={p.name} onClick={()=>{setActiveParty(p.name); setMonthFilter('All');}} className={`w-full text-left p-3 rounded-xl border transition ${activeParty===p.name ? 'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}>
                <div className="flex justify-between items-center"><p className="text-xs font-bold truncate">{p.name}</p><span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${p.balance > 0 ? 'bg-red-500/20 text-red-400' : 'bg-[#22c55e]/20 text-[#22c55e]'}`}>{p.balance !== 0 ? Math.abs(p.balance).toLocaleString() : 'Clear'}</span></div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {!activeParty ? <div className="h-64 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-white/5 rounded-[2rem]"><Users size={48} className="opacity-10 mb-4"/><p className="font-bold uppercase tracking-widest">Select a party to view ledger</p></div> : (
            <>
              <div className="bg-white/[0.03] p-6 rounded-[2rem] border border-[#22c55e]/20 mb-6 flex justify-between items-center">
                <div><h2 className="text-2xl font-black text-[#22c55e] uppercase italic">{activeParty}</h2><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{activeType} Account</p></div>
                <div className="bg-black/40 px-6 py-3 rounded-2xl border border-white/5"><p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Current Balance</p><p className={`text-xl font-black ${activePartyData?.balance > 0 ? 'text-orange-400' : 'text-[#22c55e]'}`}>{Math.abs(activePartyData?.balance || 0).toLocaleString()} {activePartyData?.balance > 0 ? 'DR' : 'CR'}</p></div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <button onClick={()=>setShowAddForm(!showAddForm)} className="bg-[#22c55e] text-black font-black px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all"><Plus size={14} className="inline mr-1"/> Add Manual Entry</button>
              </div>

              {showAddForm && (
                <div className="bg-white/[0.03] p-6 rounded-2xl border border-[#22c55e]/30 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <select value={form.entry_type} onChange={e=>setForm(p=>({...p,entry_type:e.target.value}))} className="bg-black/40 p-3 rounded-xl border border-white/10 text-xs font-bold"><option value="credit">Credit (In/Paid)</option><option value="debit">Debit (Out/Sale)</option></select>
                  <input type="number" placeholder="Amount" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} className="bg-black/40 p-3 rounded-xl border border-white/10 text-xs font-bold outline-none focus:border-[#22c55e]"/>
                  <input placeholder="Description" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className="bg-black/40 p-3 rounded-xl border border-white/10 text-xs font-bold outline-none focus:border-[#22c55e]"/>
                  <button onClick={handleAdd} className="bg-[#22c55e] text-black font-black rounded-xl text-[10px] uppercase tracking-widest">Save Entry</button>
                </div>
              )}

              <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/40 text-[10px] font-black text-gray-500 uppercase tracking-widest"><tr><th className="p-4">Date</th><th className="p-4">Description</th><th className="p-4 text-right">Debit</th><th className="p-4 text-right">Credit</th><th className="p-4 text-right">Balance</th><th className="p-4"></th></tr></thead>
                  <tbody>
                    {withRunningBalance.map(e => (
                      <tr key={e._id} className="border-t border-white/5 hover:bg-white/[0.02]">
                        <td className="p-4 text-gray-500 font-mono text-xs">{e.date}</td>
                        <td className="p-4 font-bold">{e.description} {e.bill_id && <span className="ml-2 text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded uppercase">Auto-Bill</span>}</td>
                        <td className="p-4 text-right font-black text-red-400">{e.entry_type==='debit' ? Number(e.amount).toLocaleString() : '—'}</td>
                        <td className="p-4 text-right font-black text-[#22c55e]">{e.entry_type==='credit' ? Number(e.amount).toLocaleString() : '—'}</td>
                        <td className="p-4 text-right font-black text-white">{Math.abs(e.runningBalance).toLocaleString()} <span className="text-[9px] text-gray-500 uppercase">{e.runningBalance > 0 ? 'DR' : 'CR'}</span></td>
                        <td className="p-4 text-right"><button onClick={()=>handleDelete(e._id)} className="text-gray-600 hover:text-red-500"><Trash2 size={14}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
