import { useState, useEffect, useMemo } from 'react';
// Correct Path: ../../../api
import {
  getLedgerEntries, addLedgerEntry,
  updateLedgerEntry, deleteLedgerEntry
} from "../../../api";
import {
  Users, Plus, Trash2, Pencil, Check, X,
  TrendingUp, TrendingDown, Search, Calendar, DollarSign, FileText 
} from 'lucide-react';
// ── Pre-loaded Parties ─────────────────────────────────
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

// ── Month names ────────────────────────────────────────
const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
];

const today = () => new Date().toLocaleDateString('en-GB');

const emptyEntry = {
  entry_type:  'credit', // Payment receive k liye default credit
  description: '',
  amount:      '',
  date:        today(),
  ref_bill_no: '',
};

// ── Helper: parse dd/mm/yyyy ───────────────────────────
const parseDate = (d) => {
  if (!d) return new Date(0);
  const [dd,mm,yyyy] = String(d).split('/');
  return new Date(`${yyyy}-${mm}-${dd}`);
};

const getMonth = (d) => {
  const dt = parseDate(d);
  return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

export default function Ledger() {
  const [entries,      setEntries]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeParty,  setActiveParty]  = useState(null);
  const [activeType,   setActiveType]   = useState('Sale');
  const [search,       setSearch]       = useState('');
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

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3000); };

  // ── Party list with balance ────────────────────────────
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

  // ── Active party entries ───────────────────────────────
  const activePartyData = useMemo(() => {
    if (!activeParty) return null;
    return partyList.find(p => p.name === activeParty);
  }, [partyList, activeParty]);

  // ── Filtered entries by month ──────────────────────────
  const filteredEntries = useMemo(() => {
    if (!activePartyData) return [];
    if (monthFilter === 'All') return [...activePartyData.entries].sort((a,b) => parseDate(a.date)-parseDate(b.date));
    return activePartyData.entries
      .filter(e => getMonth(e.date) === monthFilter)
      .sort((a,b) => parseDate(a.date)-parseDate(b.date));
  }, [activePartyData, monthFilter]);

  // ── All months for this party ──────────────────────────
  const availableMonths = useMemo(() => {
    if (!activePartyData) return [];
    const months = [...new Set(activePartyData.entries.map(e => getMonth(e.date)))];
    return months.sort((a,b) => {
      const [ma,ya] = a.split(' '); const [mb,yb] = b.split(' ');
      return new Date(`${ma} 1, ${ya}`) - new Date(`${mb} 1, ${yb}`);
    });
  }, [activePartyData]);

  // ── Running balance for filtered entries ───────────────
  const withRunningBalance = useMemo(() => {
    let bal = 0;
    return filteredEntries.map(e => {
      if (e.entry_type === 'debit')  bal += Number(e.amount)||0;
      if (e.entry_type === 'credit') bal -= Number(e.amount)||0;
      return { ...e, runningBalance: bal };
    });
  }, [filteredEntries]);

  // ── Add Manual Payment/Entry ───────────────────────────
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

  // ── Edit entry ─────────────────────────────────────────
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

  // ── Delete entry ───────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Entry delete karna hai?')) return;
    try {
      await deleteLedgerEntry(id);
      setEntries(prev => prev.filter(e => e._id !== id));
      flash('✅ Deleted!');
    } catch (err) { flash('❌ Error: ' + err.message); }
  };

  // ── Monthly summary ────────────────────────────────────
  const monthlySummary = useMemo(() => {
    if (!activePartyData) return [];
    const grouped = {};
    activePartyData.entries.forEach(e => {
      const m = getMonth(e.date);
      if (!grouped[m]) grouped[m] = { month: m, debit: 0, credit: 0 };
      if (e.entry_type === 'debit')  grouped[m].debit  += Number(e.amount)||0;
      if (e.entry_type === 'credit') grouped[m].credit += Number(e.amount)||0;
    });
    return Object.values(grouped).map(g => ({
      ...g, balance: g.debit - g.credit
    })).sort((a,b) => {
      const [ma,ya] = a.month.split(' '); const [mb,yb] = b.month.split(' ');
      return new Date(`${ma} 1, ${ya}`) - new Date(`${mb} 1, ${yb}`);
    });
  }, [activePartyData]);

  const inp = 'w-full bg-black/40 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm focus:border-[#22c55e]/50 transition';

  if (loading) return <div className="flex items-center justify-center h-64 text-[#22c55e] font-bold">Loading Ledger...</div>;

  return (
    <div className="text-white min-h-screen">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Users className="text-[#22c55e]" size={24}/>
        <div>
          <h1 className="text-2xl font-black">PARTY <span className="text-[#22c55e]">LEDGER</span></h1>
          <p className="text-gray-500 text-xs mt-0.5">Auto-Bills Sync & Manual Payments Hisaab Kitaab</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-bold border ${msg.startsWith('✅')?'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]':'bg-red-500/10 border-red-500/40 text-red-400'}`}>
          {msg}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ════ LEFT — Party List ════ */}
        <div className="lg:w-72 shrink-0">

          {/* Type toggle */}
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

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14}/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Party search..."
              className="w-full pl-8 p-2.5 bg-white/[0.03] rounded-xl border border-[#22c55e]/20 outline-none text-xs"
            />
          </div>

          {/* Party list */}
          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {partyList.map(party => {
              const isActive = activeParty === party.name;
              const hasBalance = party.balance !== 0;
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
                    {hasBalance && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ml-1 ${
                        party.balance > 0
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-[#22c55e]/20 text-[#22c55e]'
                      }`}>
                        {party.balance > 0 ? `DR ${party.balance.toLocaleString()}` : `CR ${Math.abs(party.balance).toLocaleString()}`}
                      </span>
                    )}
                  </div>
                  {party.entries.length > 0 && (
                    <p className="text-[10px] text-gray-500 mt-0.5">{party.entries.length} entries</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ════ RIGHT — Ledger Detail ════ */}
        <div className="flex-1">

          {!activeParty ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Users size={48} className="opacity-20 mb-4"/>
              <p className="font-bold">Party select karo ledger dekhne ke liye</p>
              <p className="text-xs mt-1 text-gray-600">Left side se koi bhi party click karo</p>
            </div>
          ) : (
            <>
              {/* Party header */}
              <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20 mb-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-[#22c55e]">{activeParty}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{activeType} Party — {activePartyData?.entries.length || 0} total entries</p>
                  </div>

                  {/* Summary cards */}
                  <div className="flex gap-3 flex-wrap">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-center">
                      <p className="text-[9px] text-gray-500 uppercase font-bold">Total Debit</p>
                      <p className="text-base font-black text-red-400">{(activePartyData?.totalDebit||0).toLocaleString()}</p>
                    </div>
                    <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl px-4 py-2.5 text-center">
                      <p className="text-[9px] text-gray-500 uppercase font-bold">Total Credit (Payments)</p>
                      <p className="text-base font-black text-[#22c55e]">{(activePartyData?.totalCredit||0).toLocaleString()}</p>
                    </div>
                    <div className={`border rounded-xl px-4 py-2.5 text-center ${
                      (activePartyData?.balance||0) > 0
                        ? 'bg-orange-500/10 border-orange-500/20'
                        : 'bg-[#22c55e]/10 border-[#22c55e]/20'
                    }`}>
                      <p className="text-[9px] text-gray-500 uppercase font-bold">Net Balance</p>
                      <p className={`text-base font-black ${(activePartyData?.balance||0) > 0 ? 'text-orange-400' : 'text-[#22c55e]'}`}>
                        {(activePartyData?.balance||0) > 0
                          ? `${(activePartyData?.balance||0).toLocaleString()} DR (Lene)`
                          : `${Math.abs(activePartyData?.balance||0).toLocaleString()} CR (Dene)`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Summary */}
              {monthlySummary.length > 0 && (
                <div className="bg-white/[0.03] p-4 rounded-2xl border border-[#22c55e]/10 mb-4 overflow-x-auto">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">Monthly Summary</p>
                  <div className="flex gap-3 min-w-max">
                    <button
                      onClick={() => setMonthFilter('All')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${monthFilter==='All'?'bg-[#22c55e] text-black border-[#22c55e]':'bg-black/30 text-gray-400 border-white/10 hover:border-[#22c55e]/40'}`}
                    >
                      All
                    </button>
                    {monthlySummary.map(m => (
                      <button
                        key={m.month}
                        onClick={() => setMonthFilter(m.month)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition whitespace-nowrap ${monthFilter===m.month?'bg-[#22c55e] text-black border-[#22c55e]':'bg-black/30 text-gray-400 border-white/10 hover:border-[#22c55e]/40'}`}
                      >
                        <span>{m.month}</span>
                        <span className={`ml-1.5 text-[9px] ${m.balance>0?'text-red-400':monthFilter===m.month?'text-black':'text-[#22c55e]'}`}>
                          {m.balance>0?`DR ${m.balance.toLocaleString()}`:`CR ${Math.abs(m.balance).toLocaleString()}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Entry Button */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-400">
                  {monthFilter === 'All' ? 'All Entries' : monthFilter}
                  <span className="text-gray-600 ml-2">({filteredEntries.length})</span>
                </p>
                <button
                  onClick={() => { setShowAddForm(p=>!p); setForm(emptyEntry); }}
                  className="bg-[#22c55e] text-black font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 hover:bg-[#1db954] transition"
                >
                  <Plus size={13}/> Manual Payment / Entry
                </button>
              </div>

              {/* Add Entry Form */}
              {showAddForm && (
                <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/30 mb-4">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-4">New Ledger Entry — {activeParty}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">

                    {/* Entry type */}
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Entry Type</label>
                      <div className="flex rounded-xl overflow-hidden border border-[#22c55e]/20">
                        <button
                          type="button"
                          onClick={() => setForm(p=>({...p, entry_type:'credit'}))}
                          className={`flex-1 py-2.5 text-xs font-bold transition ${form.entry_type==='credit'?'bg-[#22c55e] text-black':'bg-black/30 text-gray-400 hover:text-white'}`}
                        >
                          Credit (In)
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(p=>({...p, entry_type:'debit'}))}
                          className={`flex-1 py-2.5 text-xs font-bold transition ${form.entry_type==='debit'?'bg-red-500 text-white':'bg-black/30 text-gray-400 hover:text-white'}`}
                        >
                          Debit (Out)
                        </button>
                      </div>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Amount *</label>
                      <input
                        type="number"
                        value={form.amount}
                        onChange={e => setForm(p=>({...p,amount:e.target.value}))}
                        placeholder="0"
                        className={inp}
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Date</label>
                      <input
                        value={form.date}
                        onChange={e => setForm(p=>({...p,date:e.target.value}))}
                        placeholder="dd/mm/yyyy"
                        className={inp}
                      />
                    </div>

                    {/* Bill No */}
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Bill/Ref No</label>
                      <input
                        value={form.ref_bill_no}
                        onChange={e => setForm(p=>({...p,ref_bill_no:e.target.value}))}
                        placeholder="Optional"
                        className={inp}
                      />
                    </div>

                    {/* Description */}
                    <div className="col-span-2">
                      <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Description</label>
                      <input
                        value={form.description}
                        onChange={e => setForm(p=>({...p,description:e.target.value}))}
                        placeholder="e.g. Cash received, Online Transfer, etc."
                        className={inp}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAdd}
                      disabled={saving || !form.amount}
                      className="bg-[#22c55e] text-black font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 hover:bg-[#1db954] transition disabled:opacity-40"
                    >
                      {saving
                        ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"/>
                        : <><Check size={13}/> Save Entry</>
                      }
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Ledger Table */}
              <div className="bg-white/[0.03] rounded-2xl border border-white/10 overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-black/40 text-gray-500 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Ref / Bill #</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Debit (Sale)</th>
                      <th className="p-3 text-right">Credit (Paid)</th>
                      <th className="p-3 text-right">Balance</th>
                      <th className="p-3 text-right w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withRunningBalance.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-gray-600">
                          <DollarSign size={32} className="mx-auto mb-2 opacity-20"/>
                          <p>Koi entry nahi mili.</p>
                          <p className="text-xs mt-1">"Add Entry" se manual entry karo ya bill save karo.</p>
                        </td>
                      </tr>
                    ) : withRunningBalance.map((entry, idx) => {
                      const isEdit = editId === entry._id;
                      return (
                        <tr key={entry._id}
                          className={`border-t border-white/5 text-sm transition ${
                            isEdit ? 'bg-[#22c55e]/5' : 'hover:bg-white/[0.02]'
                          } ${entry.entry_type === 'debit' ? 'border-l-2 border-l-red-500/30' : 'border-l-2 border-l-[#22c55e]/30'}`}
                        >
                          {/* Date */}
                          <td className="p-3">
                            {isEdit
                              ? <input value={editData.date||''} onChange={e=>setEditData(d=>({...d,date:e.target.value}))} className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none text-xs w-24"/>
                              : <span className="text-gray-400 text-xs">{entry.date}</span>
                            }
                          </td>

                          {/* Ref */}
                          <td className="p-3">
                            {isEdit
                              ? <input value={editData.ref_bill_no||''} onChange={e=>setEditData(d=>({...d,ref_bill_no:e.target.value}))} className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none text-xs w-20"/>
                              : <span className="text-xs text-gray-300 font-mono">{entry.ref_bill_no || '—'}</span>
                            }
                          </td>

                          {/* Description (With Auto Bill Tag Support) */}
                          <td className="p-3 max-w-[200px]">
                            {isEdit
                              ? <input value={editData.description||''} onChange={e=>setEditData(d=>({...d,description:e.target.value}))} className="bg-black/30 p-1.5 rounded border border-[#22c55e]/20 outline-none text-xs w-full"/>
                              : <div>
                                  <span className="text-xs text-gray-300 truncate block">{entry.description || '—'}</span>
                                  {entry.bill_id && (
                                    <span className="text-[9px] text-[#22c55e] bg-[#22c55e]/10 inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded border border-[#22c55e]/20">
                                      <FileText size={9}/> System Bill
                                    </span>
                                  )}
                                </div>
                            }
                          </td>

                          {/* Debit */}
                          <td className="p-3 text-right">
                            {isEdit && editData.entry_type === 'debit'
                              ? <input type="number" value={editData.amount||''} onChange={e=>setEditData(d=>({...d,amount:e.target.value}))} className="bg-black/30 p-1.5 rounded border border-red-500/30 outline-none text-xs w-24 text-right"/>
                              : entry.entry_type === 'debit'
                                ? <span className="font-bold text-red-400">{Number(entry.amount).toLocaleString()}</span>
                                : <span className="text-gray-700">—</span>
                            }
                          </td>

                          {/* Credit */}
                          <td className="p-3 text-right">
                            {isEdit && editData.entry_type === 'credit'
                              ? <input type="number" value={editData.amount||''} onChange={e=>setEditData(d=>({...d,amount:e.target.value}))} className="bg-black/30 p-1.5 rounded border border-[#22c55e]/30 outline-none text-xs w-24 text-right"/>
                              : entry.entry_type === 'credit'
                                ? <span className="font-bold text-[#22c55e]">{Number(entry.amount).toLocaleString()}</span>
                                : <span className="text-gray-700">—</span>
                            }
                          </td>

                          {/* Running Balance */}
                          <td className="p-3 text-right">
                            <span className={`font-black text-sm ${entry.runningBalance > 0 ? 'text-orange-400' : entry.runningBalance < 0 ? 'text-[#22c55e]' : 'text-gray-500'}`}>
                              {entry.runningBalance > 0
                                ? `${entry.runningBalance.toLocaleString()} DR`
                                : entry.runningBalance < 0
                                  ? `${Math.abs(entry.runningBalance).toLocaleString()} CR`
                                  : '0'
                              }
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isEdit ? (
                                <>
                                  <button onClick={() => saveEdit(entry._id)} className="p-1.5 text-[#22c55e] hover:bg-[#22c55e]/10 rounded-lg transition"><Check size={12}/></button>
                                  <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"><X size={12}/></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEdit(entry)} className="p-1.5 text-gray-500 hover:text-[#22c55e] hover:bg-[#22c55e]/10 rounded-lg transition"><Pencil size={12}/></button>
                                  <button onClick={() => handleDelete(entry._id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 size={12}/></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total row */}
                    {withRunningBalance.length > 0 && (
                      <tr className="border-t-2 border-[#22c55e]/30 bg-[#22c55e]/5">
                        <td colSpan={3} className="p-3 font-black text-sm">
                          {monthFilter === 'All' ? 'TOTAL' : `TOTAL — ${monthFilter}`}
                        </td>
                        <td className="p-3 text-right font-black text-red-400">
                          {filteredEntries.filter(e=>e.entry_type==='debit').reduce((s,e)=>s+(Number(e.amount)||0),0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-black text-[#22c55e]">
                          {filteredEntries.filter(e=>e.entry_type==='credit').reduce((s,e)=>s+(Number(e.amount)||0),0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          {(() => {
                            const bal = filteredEntries.filter(e=>e.entry_type==='debit').reduce((s,e)=>s+(Number(e.amount)||0),0)
                                      - filteredEntries.filter(e=>e.entry_type==='credit').reduce((s,e)=>s+(Number(e.amount)||0),0);
                            return (
                              <span className={`font-black text-sm ${bal > 0 ? 'text-orange-400' : 'text-[#22c55e]'}`}>
                                {bal > 0 ? `${bal.toLocaleString()} DR` : `${Math.abs(bal).toLocaleString()} CR`}
                              </span>
                            );
                          })()}
                        </td>
                        <td></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Monthly Detail Cards */}
              {monthFilter === 'All' && monthlySummary.length > 1 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {monthlySummary.map(m => (
                    <button
                      key={m.month}
                      onClick={() => setMonthFilter(m.month)}
                      className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-left hover:border-[#22c55e]/30 transition"
                    >
                      <p className="text-xs text-gray-500 font-bold uppercase flex items-center gap-1">
                        <Calendar size={11}/> {m.month}
                      </p>
                      <div className="grid grid-cols-2 gap-1 mt-2">
                        <div>
                          <p className="text-[9px] text-gray-600">Debit (Sales)</p>
                          <p className="text-xs font-black text-red-400">{m.debit.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-600">Credit (Payments)</p>
                          <p className="text-xs font-black text-[#22c55e]">{m.credit.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className={`mt-2 text-xs font-black ${m.balance>0?'text-orange-400':'text-[#22c55e]'}`}>
                        {m.balance>0?`${m.balance.toLocaleString()} DR`:`${Math.abs(m.balance).toLocaleString()} CR`}
                      </div>
                    </button>
                  ))}
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
}
