import { useState, useEffect, useMemo } from 'react';
// Correct Path: ../../../api
import {
  getLedgerEntries, addLedgerEntry,
  updateLedgerEntry, deleteLedgerEntry,
  updateBill, deleteBill
} from "../../../api";
import {
  Users, Plus, Trash2, Pencil, Check, X,
  TrendingUp, TrendingDown, Search, Calendar, DollarSign, FileText,
  ChevronLeft, ChevronRight, FileDown
} from 'lucide-react';

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

const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
];

const today = () => new Date().toLocaleDateString('en-GB');

const emptyEntry = {
  entry_type:  'credit',
  description: '',
  amount:      '',
  date:        today(),
  ref_bill_no: '',
};

const parseDate = (d) => {
  if (!d) return new Date(0);
  const [dd,mm,yyyy] = String(d).split('/');
  return new Date(`${yyyy}-${mm}-${dd}`);
};

const getMonthName = (d) => {
  const dt = parseDate(d);
  return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

export default function Ledger() {
  const [entries,      setEntries]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeParty,  setActiveParty]  = useState(null);
  const [activeType,   setActiveType]   = useState('Sale');
  const [search,       setSearch]       = useState('');
  
  // Sidebar State
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('erp_ledger_sidebar') === 'true');
  
  // Filtering
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthFilter,  setMonthFilter]  = useState('All');
  
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [form,         setForm]         = useState(emptyEntry);
  const [editId,       setEditId]       = useState(null);
  const [editData,     setEditData]     = useState({});
  const [msg,          setMsg]          = useState('');
  const [saving,       setSaving]       = useState(false);

  useEffect(() => {
    getLedgerEntries()
      .then(d => setEntries(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('erp_ledger_sidebar', isCollapsed);
  }, [isCollapsed]);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3000); };

  const partyList = useMemo(() => {
    return ALL_PARTIES
      .filter(p => p.type === activeType)
      .filter(p => search === '' || p.name.toLowerCase().includes(search.toLowerCase()))
      .map(p => {
        const pEntries = entries.filter(e =>
          e.party_name?.toUpperCase() === p.name.toUpperCase()
        );
        const totalDebit  = pEntries.filter(e => e.entry_type === 'debit' ).reduce((s,e) => s+(Number(e.amount)||0), 0);
        const totalCredit = pEntries.filter(e => e.entry_type === 'credit').reduce((s,e) => s+(Number(e.amount)||0), 0);
        const balance     = totalDebit - totalCredit;
        return { ...p, entries: pEntries, totalDebit, totalCredit, balance };
      });
  }, [entries, activeType, search]);

  const activePartyData = useMemo(() => {
    if (!activeParty) return null;
    return partyList.find(p => p.name === activeParty);
  }, [partyList, activeParty]);

  const filteredEntries = useMemo(() => {
    if (!activePartyData) return [];
    let items = activePartyData.entries.filter(e => {
        const d = parseDate(e.date);
        return d.getFullYear() === selectedYear;
    });
    
    if (monthFilter !== 'All') {
        items = items.filter(e => getMonthName(e.date).startsWith(monthFilter));
    }
    
    return [...items].sort((a,b) => parseDate(a.date)-parseDate(b.date));
  }, [activePartyData, monthFilter, selectedYear]);

  const withRunningBalance = useMemo(() => {
    let bal = 0; // In Sales Ledger: Opening is usually treated per month or lifetime. We'll do current view balance.
    return filteredEntries.map(e => {
      if (e.entry_type === 'debit')  bal += Number(e.amount)||0;
      if (e.entry_type === 'credit') bal -= Number(e.amount)||0;
      return { ...e, runningBalance: bal };
    });
  }, [filteredEntries]);

  const handleAdd = async () => {
    if (!activeParty || !form.amount || !form.entry_type) {
      flash('❌ Amount aur type zaroori hai'); return;
    }
    setSaving(true);
    try {
      const partyData = ALL_PARTIES.find(p => p.name === activeParty);
      const saved = await addLedgerEntry({
        party_name:   activeParty,
        party_type:   partyData?.type || activeType,
        entry_type:   form.entry_type,
        description:  form.description || (form.entry_type === 'credit' ? 'Payment Received' : 'Manual Bill Entry'),
        amount:       parseFloat(form.amount),
        date:         form.date || today(),
        ref_bill_no:  form.ref_bill_no,
      });
      setEntries(prev => [...prev, saved]);
      setForm(emptyEntry);
      setShowAddForm(false);
      flash('✅ Entry add ho gayi!');
    } catch (err) {
      flash('❌ Error: ' + err.message);
    } finally { setSaving(false); }
  };

  const startEdit = (entry) => { setEditId(entry._id); setEditData({ ...entry }); };
  const cancelEdit = () => { setEditId(null); setEditData({}); };

  const saveEdit = async (id) => {
    try {
      const updated = await updateLedgerEntry(id, {
        entry_type:  editData.entry_type,
        description: editData.description,
        amount:      parseFloat(editData.amount),
        date:        editData.date,
        ref_bill_no: editData.ref_bill_no,
      });
      setEntries(prev => prev.map(e => e._id === id ? updated : e));
      cancelEdit();
      flash('✅ Updated!');
    } catch (err) { flash('❌ Error: ' + err.message); }
  };

  const handleDelete = async (id, bill_id) => {
    if (!window.confirm('Entry delete karna hai?')) return;
    try {
      if (bill_id) {
          await deleteBill(bill_id);
      }
      await deleteLedgerEntry(id);
      setEntries(prev => prev.filter(e => e._id !== id));
      flash('✅ Deleted!');
    } catch (err) { flash('❌ Error: ' + err.message); }
  };

  const handleExportPDF = () => {
      const logo = localStorage.getItem('erp_invoice_logo');
      const html = `
        <html>
          <head>
            <title>Ledger - ${activeParty}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #22c55e; padding-bottom: 15px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
              th { background: #f4f4f4; padding: 10px; border: 1px solid #ddd; }
              td { padding: 8px; border: 1px solid #ddd; }
              .summary { margin-top: 20px; border-top: 2px solid #eee; padding-top: 10px; text-align: right; }
            </style>
          </head>
          <body>
            <div class="header">
               <div>
                ${logo ? `<img src="${logo}" style="height: 50px;" />` : '<h1>HS PACKAGES</h1>'}
                <p>Party Ledger: <strong>${activeParty}</strong></p>
               </div>
               <div style="text-align: right;">
                 <p>Year: ${selectedYear} | Month: ${monthFilter}</p>
                 <p>Generated: ${new Date().toLocaleString()}</p>
               </div>
            </div>
            <table>
              <thead>
                <tr><th>Date</th><th>Ref</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr>
              </thead>
              <tbody>
                ${withRunningBalance.map(e => `
                  <tr>
                    <td>${e.date}</td>
                    <td>${e.ref_bill_no || ''}</td>
                    <td>${e.description}</td>
                    <td style="text-align: right;">${e.entry_type === 'debit' ? Number(e.amount).toLocaleString() : ''}</td>
                    <td style="text-align: right;">${e.entry_type === 'credit' ? Number(e.amount).toLocaleString() : ''}</td>
                    <td style="text-align: right;">${e.runningBalance.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="summary">
              <p>Closing Balance: <strong>Rs. ${activePartyData?.balance.toLocaleString()}</strong></p>
            </div>
          </body>
        </html>
      `;
      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
  };

  const inp = 'w-full bg-black/40 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm focus:border-[#22c55e]/50 transition';

  if (loading) return <div className="flex items-center justify-center h-64 text-[#22c55e] font-bold">Loading Ledger...</div>;

  return (
    <div className="text-white min-h-screen">

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="text-[#22c55e]" size={24}/>
          <div>
            <h1 className="text-2xl font-black">PARTY <span className="text-[#22c55e]">LEDGER</span></h1>
            <p className="text-gray-500 text-xs mt-0.5">Management & Financial Records</p>
          </div>
        </div>
        <button onClick={handleExportPDF} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs flex items-center gap-2 hover:bg-white/10 transition">
          <FileDown size={14}/> EXPORT PDF
        </button>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-bold border ${msg.startsWith('✅')?'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]':'bg-red-500/10 border-red-500/40 text-red-400'}`}>
          {msg}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">

        {/* Collapsible Sidebar */}
        <div className={`transition-all duration-300 ${isCollapsed ? 'w-16' : 'lg:w-72'} shrink-0`}>
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-4 h-full relative">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="absolute -right-3 top-10 bg-[#22c55e] text-black p-1 rounded-full shadow-lg z-10"
            >
              {isCollapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
            </button>

            {!isCollapsed && (
              <div className="animate-in fade-in duration-300">
                <div className="flex gap-1 mb-4 bg-white/[0.03] p-1 rounded-2xl border border-white/10">
                  <button onClick={() => { setActiveType('Sale'); setActiveParty(null); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${activeType==='Sale'?'bg-[#22c55e] text-black':'text-gray-400 hover:text-white'}`}>
                    <TrendingUp size={13}/> Sales
                  </button>
                  <button onClick={() => { setActiveType('Purchase'); setActiveParty(null); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${activeType==='Purchase'?'bg-[#22c55e] text-black':'text-gray-400 hover:text-white'}`}>
                    <TrendingDown size={13}/> Purchase
                  </button>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14}/>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 p-2.5 bg-white/[0.03] rounded-xl border border-[#22c55e]/20 outline-none text-xs"
                  />
                </div>

                <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
                  {partyList.map(party => {
                    const isActive = activeParty === party.name;
                    return (
                      <button
                        key={party.name}
                        onClick={() => { setActiveParty(party.name); setMonthFilter('All'); setShowAddForm(false); }}
                        className={`w-full text-left p-3 rounded-xl border transition ${
                          isActive
                            ? 'bg-[#22c55e]/10 border-[#22c55e]/40'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-bold truncate ${isActive ? 'text-[#22c55e]' : 'text-white'}`}>
                            {party.name}
                          </p>
                          {party.balance !== 0 && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ml-1 ${
                              party.balance > 0 ? 'bg-red-500/20 text-red-400' : 'bg-[#22c55e]/20 text-[#22c55e]'
                            }`}>
                              {party.balance > 0 ? `DR` : `CR`}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          {!activeParty ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Users size={48} className="opacity-20 mb-4"/>
              <p className="font-bold">Party select karo ledger dekhne ke liye</p>
            </div>
          ) : (
            <>
              {/* Stats Section */}
              <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20 mb-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-[#22c55e]">{activeParty}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{activeType} Account</p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <div className="bg-white/5 p-3 rounded-xl min-w-[100px]">
                      <p className="text-[9px] text-gray-500 uppercase">Total Sales</p>
                      <p className="text-sm font-bold text-red-400">{activePartyData?.totalDebit.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl min-w-[100px]">
                      <p className="text-[9px] text-gray-500 uppercase">Payments</p>
                      <p className="text-sm font-bold text-[#22c55e]">{activePartyData?.totalCredit.toLocaleString()}</p>
                    </div>
                    <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 p-3 rounded-xl min-w-[100px]">
                      <p className="text-[9px] text-[#22c55e] uppercase">Current Balance</p>
                      <p className="text-sm font-black text-white">{activePartyData?.balance.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Switching */}
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/10 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <select 
                        value={selectedYear} 
                        onChange={e => setSelectedYear(parseInt(e.target.value))}
                        className="bg-black/40 text-xs p-2 rounded-lg border border-white/10"
                    >
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <div className="flex gap-1 overflow-x-auto max-w-[500px] scrollbar-hide">
                        <button onClick={() => setMonthFilter('All')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${monthFilter === 'All' ? 'bg-[#22c55e] text-black' : 'hover:bg-white/5 text-gray-500'}`}>All</button>
                        {MONTHS.map(m => (
                            <button key={m} onClick={() => setMonthFilter(m)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${monthFilter === m ? 'bg-[#22c55e] text-black' : 'hover:bg-white/5 text-gray-500'}`}>{m}</button>
                        ))}
                    </div>
                </div>
                <button onClick={() => setShowAddForm(!showAddForm)} className="bg-[#22c55e] text-black font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2">
                  <Plus size={14}/> MANUAL ENTRY
                </button>
              </div>

              {showAddForm && (
                <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/30 mb-4 animate-in slide-in-from-top duration-300">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Entry Type</label>
                      <select value={form.entry_type} onChange={e => setForm(p=>({...p, entry_type: e.target.value}))} className={inp}>
                          <option value="debit">Debit (Bill / Out)</option>
                          <option value="credit">Credit (Payment / In)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Amount *</label>
                      <input type="number" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} placeholder="0" className={inp}/>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Date</label>
                      <input value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} placeholder="dd/mm/yyyy" className={inp}/>
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Description</label>
                      <input value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} placeholder="Details..." className={inp}/>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAdd} disabled={saving || !form.amount} className="bg-[#22c55e] text-black font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 hover:bg-[#1db954] transition">
                      <Check size={13}/> SAVE ENTRY
                    </button>
                    <button onClick={() => setShowAddForm(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-gray-400">Cancel</button>
                  </div>
                </div>
              )}

              <div className="bg-white/[0.03] rounded-2xl border border-white/10 overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-black/40 text-gray-500 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Debit (Sale)</th>
                      <th className="p-3 text-right">Credit (Paid)</th>
                      <th className="p-3 text-right">Running Balance</th>
                      <th className="p-3 text-right w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withRunningBalance.map((entry) => {
                      const isEdit = editId === entry._id;
                      return (
                        <tr key={entry._id} className="border-t border-white/5 text-sm hover:bg-white/[0.02]">
                          <td className="p-3 text-xs text-gray-500">{entry.date}</td>
                          <td className="p-3">
                            {isEdit ? <input value={editData.description} onChange={e=>setEditData({...editData, description: e.target.value})} className={inp}/> : 
                              <span className="text-gray-200">{entry.description}</span>
                            }
                            {entry.bill_id && <span className="ml-2 text-[8px] border border-emerald-500/30 text-emerald-500 px-1 rounded">AUTO-BILL</span>}
                          </td>
                          <td className="p-3 text-right text-red-400 font-bold">{entry.entry_type === 'debit' ? Number(entry.amount).toLocaleString() : ''}</td>
                          <td className="p-3 text-right text-[#22c55e] font-bold">{entry.entry_type === 'credit' ? Number(entry.amount).toLocaleString() : ''}</td>
                          <td className="p-3 text-right font-black text-white">{entry.runningBalance.toLocaleString()}</td>
                          <td className="p-3 text-right flex gap-2">
                             {isEdit ? (
                                 <button onClick={() => saveEdit(entry._id)} className="text-[#22c55e]"><Check size={14}/></button>
                             ) : (
                                 <button onClick={() => startEdit(entry)} className="text-gray-500 hover:text-white"><Pencil size={14}/></button>
                             )}
                             <button onClick={() => handleDelete(entry._id, entry.bill_id)} className="text-gray-500 hover:text-red-500"><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      );
                    })}
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
