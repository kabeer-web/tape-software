import { useState, useEffect, useMemo, useRef } from 'react';
import {
  getLedgerEntries, addLedgerEntry,
  updateLedgerEntry, deleteLedgerEntry
} from '../../../api';
import { useAccounts } from './AccountsContext';
import {
  Users, Plus, Trash2, Pencil, Check, X,
  TrendingUp, TrendingDown, Search, Calendar,
  DollarSign, FileText, Download, ChevronDown,
  AlertCircle, Wallet, CreditCard, ReceiptText, Printer
} from 'lucide-react';

// ── Parties ────────────────────────────────────────────────
const SALE_PARTIES = [
  'AR PACKAGES','ROSHAN TRADER','HUZAIFA TRADER','SHAMS STATIONARY',
  'ABDUL RAUF','HAMZULLAH','ANEES STATIONARY','A ONE','ZEESHAN HYD',
  'ABDUL BASIT','MD TRADERS','MUNEER BHAI','ANWAR BHAI','FAROOQ BHAI',
  'GR TRADER','HAMZA SIALKOT','HASHMI TRADER','GAIN TEX INTERNATIONAL',
  'NAQI TAQI','MEMON ELECTRIC','MOK PAKISTAN TRADER','SABIR BROTHER 1',
  'SABIR BROTHER 2','SHERAZ HABIB','SANAULLAH TEXTILE','SUJJAD ALI',
  'USAMA STATIONARY','ZEESHAN HAIDRABAD','WAHEED WALI','AL FAREED',
  'SHOKAT HAYAT','GUL AMIR','AJ ARSALAN','HAS GR TRADER','MUDASIR MEMON',
  'UMAIR FISHERY','AMEER AKBAR','ISMAIL BHAI','BILAL BHAI',
  'FARHAN NEW KARACHI','N.K ENTERPRISES',
];

const PURCHASE_PARTIES = [
  'UNIVERSAL COTTING','KOSHER','CHAWLA INDUSTRY','IBAD CORE',
  'TAHSEEN CARTON','TALHA WASEEM','ASGHR CORE','DEER TAPE','SAMAD BHAI',
];

const ALL_PARTIES = [
  ...SALE_PARTIES.map(n => ({ name: n, type: 'Sale' })),
  ...PURCHASE_PARTIES.map(n => ({ name: n, type: 'Purchase' })),
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const todayStr = () => new Date().toLocaleDateString('en-GB');

// dd/mm/yyyy → Date
const parseDate = (d) => {
  if (!d) return new Date(0);
  const parts = String(d).split('/');
  if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  return new Date(0);
};

const getMonth = (d) => {
  const dt = parseDate(d);
  if (isNaN(dt.getTime())) return 'Unknown';
  return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

// ── PDF Export (Browser Print based) ───────────────────────
const generatePDF = (partyName, entries, openingBal, monthFilter) => {
  let bal = openingBal;
  const rowsHtml = entries.map(e => {
    if (e.entry_type === 'debit')  bal += Number(e.amount) || 0;
    if (e.entry_type === 'credit') bal -= Number(e.amount) || 0;
    return `
      <tr>
        <td>${e.date || ''}</td>
        <td>${e.ref_bill_no || ''}</td>
        <td>${e.description || ''}</td>
        <td style="text-align:right">${e.entry_type === 'debit' ? Number(e.amount).toLocaleString() : '-'}</td>
        <td style="text-align:right">${e.entry_type === 'credit' ? Number(e.amount).toLocaleString() : '-'}</td>
        <td style="text-align:right; font-weight:bold">${bal.toLocaleString()} ${bal >= 0 ? 'DR' : 'CR'}</td>
      </tr>`;
  }).join('');

  const win = window.open('', '_blank');
  win.document.write(`
    <html>
      <head>
        <title>Ledger - ${partyName}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #333; }
          h1 { margin-bottom: 5px; }
          .header-info { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
          th { background: #f8f8f8; }
          .summary { margin-top: 20px; text-align: right; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header-info">
          <h1>${partyName}</h1>
          <p>Ledger Report | Month: ${monthFilter} | Generated: ${todayStr()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Ref #</th>
              <th>Description</th>
              <th style="text-align:right">Debit</th>
              <th style="text-align:right">Credit</th>
              <th style="text-align:right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>-</td>
              <td>-</td>
              <td><b>Opening Balance</b></td>
              <td style="text-align:right">${openingBal > 0 ? openingBal.toLocaleString() : '-'}</td>
              <td style="text-align:right">${openingBal < 0 ? Math.abs(openingBal).toLocaleString() : '-'}</td>
              <td style="text-align:right"><b>${openingBal.toLocaleString()} ${openingBal >= 0 ? 'DR' : 'CR'}</b></td>
            </tr>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="summary">
          <p>Final Net Balance: <b>${bal.toLocaleString()} ${bal >= 0 ? 'DR (Receivable)' : 'CR (Payable)'}</b></p>
        </div>
        <script>window.print(); window.onafterprint = () => window.close();</script>
      </body>
    </html>
  `);
  win.document.close();
};

// ── CSV Export ─────────────────────────────────────────────
const exportCSV = (partyName, entries, openingBal) => {
  let bal = openingBal;
  const header = 'Date,Ref #,Description,Type,Debit,Credit,Balance\n';
  const openRow = `Opening,,Opening Balance,opening,,,${openingBal}\n`;
  const rows = entries.map(e => {
    if (e.entry_type === 'debit')  bal += Number(e.amount) || 0;
    if (e.entry_type === 'credit') bal -= Number(e.amount) || 0;
    return `${e.date||''},${e.ref_bill_no||''},"${(e.description||'').replace(/"/g,"''")}",${e.entry_type},${e.entry_type==='debit'?Number(e.amount):''},${e.entry_type==='credit'?Number(e.amount):''},${bal}`;
  }).join('\n');
  const blob = new Blob([header + openRow + rows], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${partyName.replace(/\s+/g,'-')}-ledger.csv`; a.click();
  URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────
export default function Ledger() {
  const { refreshAll } = useAccounts(); // so AccountsContext (Sale/Purchase invoice party suggestions) stays in sync after a rename/delete here
  const [entries,     setEntries]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeParty, setActiveParty] = useState(null);
  const [activeType,  setActiveType]  = useState('Sale');
  const [search,      setSearch]      = useState('');
  const [monthFilter, setMonthFilter] = useState('All');

  // Rename / delete party
  const [renamingParty, setRenamingParty] = useState(false);
  const [renameInput,   setRenameInput]   = useState('');
  const [busyPartyOp,   setBusyPartyOp]   = useState(false);

  // Forms
  const [showPayment,  setShowPayment]  = useState(false); // Manual payment form
  const [showOpening,  setShowOpening]  = useState(false); // Opening balance form
  const [payForm,      setPayForm]      = useState({ entry_type:'credit', description:'', amount:'', date:todayStr(), ref_bill_no:'' });
  const [openingAmt,   setOpeningAmt]   = useState('');
  const [openingDate,  setOpeningDate]  = useState(todayStr());
  const [openingType,  setOpeningType]  = useState('debit'); // DR = party ne lena hai; CR = party ne dena hai

  // Edit
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({});

  // Parties added via the new "+ New Party" box below but that don't have
  // any ledger entry yet (a brand-new party has nothing in `entries` until
  // an opening balance / payment is posted for them, so without this they'd
  // vanish from the sidebar the moment you clicked away).
  const [customParties, setCustomParties] = useState([]); // [{ name, type }]
  const [showAddParty, setShowAddParty]   = useState(false);
  const [newPartyName, setNewPartyName]   = useState('');

  const [msg,    setMsg]    = useState('');
  const [msgOk,  setMsgOk]  = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLedgerEntries()
      .then(d => setEntries(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const flash = (t, ok = true) => {
    setMsg(t); setMsgOk(ok);
    setTimeout(() => setMsg(''), 3500);
  };

  // ── Party list with balances ───────────────────────────
  // Was: ALL_PARTIES.filter(...) — a pure hardcoded array, so a party who
  // only exists because a Sale/Purchase bill was raised for them (which DOES
  // save a real ledger_entries row) never showed up here, since this list
  // never looked at `entries` at all. Now it's the hardcoded starter names
  // UNION whatever party names actually have entries in the DB UNION anyone
  // just added via "+ New Party" — so a brand-new party is visible as soon
  // as they're billed, with no code edit needed.
  const partyDirectory = useMemo(() => {
    const dir = new Map(ALL_PARTIES.map(p => [p.name, p.type]));
    entries.forEach(e => {
      const n = (e.party_name || '').trim().toUpperCase();
      if (n && !dir.has(n)) dir.set(n, e.party_type || 'Sale');
    });
    customParties.forEach(p => { if (!dir.has(p.name)) dir.set(p.name, p.type); });
    return Array.from(dir.entries()).map(([name, type]) => ({ name, type }));
  }, [entries, customParties]);

  const partyList = useMemo(() =>
    partyDirectory
      .filter(p => p.type === activeType)
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .map(p => {
        const pE = entries.filter(e =>
          (e.party_name || '').toUpperCase() === p.name.toUpperCase()
        );
        const openingEntry = pE.find(e => e.entry_type === 'opening');
        const openingBal   = openingEntry
          ? (openingEntry.opening_type === 'credit'
              ? -(Number(openingEntry.amount) || 0)
              : Number(openingEntry.amount) || 0)
          : 0;

        const normalEntries = pE.filter(e => e.entry_type !== 'opening');
        const totalDebit    = normalEntries.filter(e => e.entry_type === 'debit' ).reduce((s,e) => s+(Number(e.amount)||0), 0);
        const totalCredit   = normalEntries.filter(e => e.entry_type === 'credit').reduce((s,e) => s+(Number(e.amount)||0), 0);
        const balance       = openingBal + totalDebit - totalCredit;

        return { ...p, entries: normalEntries, openingEntry, openingBal, totalDebit, totalCredit, balance };
      })
  , [partyDirectory, activeType, search, entries]);

  // Type a name, hit Add — selects it immediately (with zero balance) and
  // opens the Opening Balance box so it gets its first real DB row right away.
  const handleAddNewParty = () => {
    const name = newPartyName.trim().toUpperCase();
    if (!name) return;
    setCustomParties(prev => prev.some(p => p.name === name) ? prev : [...prev, { name, type: activeType }]);
    setNewPartyName('');
    setShowAddParty(false);
    handlePartySelect(name);
    setShowOpening(true);
  };

  const activeData = useMemo(() =>
    activeParty ? partyList.find(p => p.name === activeParty) : null
  , [partyList, activeParty]);

  // ── Filter by month ────────────────────────────────────
  const filteredEntries = useMemo(() => {
    if (!activeData) return [];
    const list = monthFilter === 'All'
      ? [...activeData.entries]
      : activeData.entries.filter(e => getMonth(e.date) === monthFilter);
    return list.sort((a, b) => parseDate(a.date) - parseDate(b.date));
  }, [activeData, monthFilter]);

  // ── Running balance (with opening) ────────────────────
  const withBal = useMemo(() => {
    if (!activeData) return [];
    let bal = activeData.openingBal; 
    return filteredEntries.map(e => {
      if (e.entry_type === 'debit')  bal += Number(e.amount) || 0;
      if (e.entry_type === 'credit') bal -= Number(e.amount) || 0;
      return { ...e, runningBalance: bal };
    });
  }, [filteredEntries, activeData]);

  // ── Months list ────────────────────────────────────────
  const months = useMemo(() => {
    if (!activeData) return [];
    return [...new Set(activeData.entries.map(e => getMonth(e.date)).filter(m => m !== 'Unknown'))]
      .sort((a, b) => {
        const [ma,ya] = a.split(' '); const [mb,yb] = b.split(' ');
        return new Date(`${ma} 1,${ya}`) - new Date(`${mb} 1,${yb}`);
      });
  }, [activeData]);

  // ── Monthly summary ────────────────────────────────────
  const monthlySummary = useMemo(() => {
    if (!activeData) return [];
    const g = {};
    activeData.entries.forEach(e => {
      const m = getMonth(e.date); if (m === 'Unknown') return;
      if (!g[m]) g[m] = { month:m, debit:0, credit:0 };
      if (e.entry_type === 'debit')  g[m].debit  += Number(e.amount)||0;
      if (e.entry_type === 'credit') g[m].credit += Number(e.amount)||0;
    });
    return Object.values(g).map(x => ({ ...x, net: x.debit - x.credit }))
      .sort((a,b) => { const [ma,ya]=a.month.split(' ');const[mb,yb]=b.month.split(' '); return new Date(`${ma} 1,${ya}`) - new Date(`${mb} 1,${yb}`); });
  }, [activeData]);

  // ── Set/Update Opening Balance ─────────────────────────
  const handleSetOpening = async () => {
    if (!activeParty || !openingAmt) { flash('❌ Amount daalen', false); return; }
    setSaving(true);
    try {
      const partyMeta = ALL_PARTIES.find(p => p.name === activeParty);
      const payload = {
        party_name:    activeParty,
        party_type:    partyMeta?.type || activeType,
        entry_type:    'opening',
        opening_type:  openingType,
        description:   `Opening Balance`,
        amount:        parseFloat(openingAmt),
        date:          openingDate || todayStr(),
        ref_bill_no:   '',
      };

      const existing = activeData?.openingEntry;
      if (existing) {
        const upd = await updateLedgerEntry(existing._id, payload);
        setEntries(prev => prev.map(e => e._id === existing._id ? upd : e));
      } else {
        const saved = await addLedgerEntry(payload);
        setEntries(prev => [...prev, saved]);
      }
      setShowOpening(false); setOpeningAmt('');
      flash('✅ Opening balance set ho gaya!');
      refreshAll?.();
    } catch (e) { flash('❌ ' + e.message, false); }
    finally { setSaving(false); }
  };

  // ── Add Manual Payment / Entry ─────────────────────────
  const handleAddPayment = async () => {
    if (!activeParty || !payForm.amount) { flash('❌ Amount daalen', false); return; }
    setSaving(true);
    try {
      const partyMeta = ALL_PARTIES.find(p => p.name === activeParty);
      const saved = await addLedgerEntry({
        party_name:  activeParty,
        party_type:  partyMeta?.type || activeType,
        entry_type:  payForm.entry_type,
        description: payForm.description ||
          (payForm.entry_type === 'credit' ? 'Payment Received' : 'Manual Debit'),
        amount:      parseFloat(payForm.amount),
        date:        payForm.date || todayStr(),
        ref_bill_no: payForm.ref_bill_no,
      });
      setEntries(prev => [...prev, saved]);
      setPayForm({ entry_type:'credit', description:'', amount:'', date:todayStr(), ref_bill_no:'' });
      setShowPayment(false);
      flash('✅ Entry add ho gayi!');
      refreshAll?.();
    } catch (e) { flash('❌ ' + e.message, false); }
    finally { setSaving(false); }
  };

  // ── Edit ───────────────────────────────────────────────
  const startEdit = e  => { setEditId(e._id); setEditData({ ...e }); };
  const cancelEdit = () => { setEditId(null); setEditData({}); };
  const saveEdit = async (id) => {
    try {
      const upd = await updateLedgerEntry(id, {
        entry_type:   editData.entry_type,
        opening_type: editData.opening_type,
        description:  editData.description,
        amount:       parseFloat(editData.amount),
        date:         editData.date,
        ref_bill_no:  editData.ref_bill_no,
      });
      setEntries(prev => prev.map(e => e._id === id ? upd : e));
      cancelEdit(); flash('✅ Updated!');
    } catch (e) { flash('❌ ' + e.message, false); }
  };

  // ── Delete ─────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Entry delete karna hai?')) return;
    try {
      await deleteLedgerEntry(id);
      setEntries(prev => prev.filter(e => e._id !== id));
      flash('✅ Deleted!');
    } catch (e) { flash('❌ ' + e.message, false); }
  };

  const handlePartySelect = (name) => {
    setActiveParty(name); setMonthFilter('All');
    setShowPayment(false); setShowOpening(false);
    const pE = entries.filter(e => (e.party_name||'').toUpperCase() === name.toUpperCase());
    const oe = pE.find(e => e.entry_type === 'opening');
    if (oe) {
      setOpeningAmt(String(oe.amount || ''));
      setOpeningDate(oe.date || todayStr());
      setOpeningType(oe.opening_type || 'debit');
    } else {
      setOpeningAmt(''); setOpeningDate(todayStr()); setOpeningType('debit');
    }
  };

  const inp = 'w-full bg-black/40 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm focus:border-[#22c55e]/50 transition';

  const startRenameParty = () => { setRenameInput(activeParty || ''); setRenamingParty(true); };
  const cancelRenameParty = () => { setRenamingParty(false); setRenameInput(''); };

  // Renaming = bulk-update every ledger entry for this party to the new
  // name (there's no separate "parties" table — a party only exists as the
  // party_name on its entries), then flip activeParty over to the new name.
  const handleRenameParty = async () => {
    const newName = renameInput.trim().toUpperCase();
    if (!newName || newName === activeParty) { cancelRenameParty(); return; }
    if (partyDirectory.some(p => p.name === newName)) { flash('❌ Ye naam pehle se kisi aur party ka hai', false); return; }
    setBusyPartyOp(true);
    try {
      const partyEntries = entries.filter(e => (e.party_name || '').toUpperCase() === activeParty.toUpperCase());
      for (const e of partyEntries) {
        await updateLedgerEntry(e._id, { party_name: newName });
      }
      setEntries(prev => prev.map(e => (e.party_name || '').toUpperCase() === activeParty.toUpperCase() ? { ...e, party_name: newName } : e));
      setCustomParties(prev => prev.map(p => p.name === activeParty ? { ...p, name: newName } : p));
      setActiveParty(newName);
      cancelRenameParty();
      flash(`✅ Party rename ho gayi: ${newName}`);
      refreshAll?.();
    } catch (e) {
      flash('❌ Rename fail: ' + e.message, false);
    } finally { setBusyPartyOp(false); }
  };

  // Deleting a party = deleting every ledger entry that belongs to it. This
  // does NOT touch any Sale/Purchase bills already saved for that party —
  // only their ledger trail. Confirmed with a typed name, since this can't
  // be undone.
  const handleDeleteParty = async () => {
    const partyEntries = entries.filter(e => (e.party_name || '').toUpperCase() === activeParty.toUpperCase());
    const typed = window.prompt(`"${activeParty}" ki ${partyEntries.length} ledger entries permanently delete ho jayengi. Confirm karne ke liye party ka naam type karo:`);
    if (!typed || typed.trim().toUpperCase() !== activeParty.toUpperCase()) { if (typed !== null) flash('❌ Naam match nahi hua — cancel kar diya', false); return; }
    setBusyPartyOp(true);
    try {
      for (const e of partyEntries) {
        await deleteLedgerEntry(e._id);
      }
      setEntries(prev => prev.filter(e => (e.party_name || '').toUpperCase() !== activeParty.toUpperCase()));
      setCustomParties(prev => prev.filter(p => p.name !== activeParty));
      flash(`✅ Party delete ho gayi: ${activeParty}`);
      setActiveParty(null);
      refreshAll?.();
    } catch (e) {
      flash('❌ Delete fail: ' + e.message, false);
    } finally { setBusyPartyOp(false); }
  };

  const filtDebit  = filteredEntries.filter(e=>e.entry_type==='debit' ).reduce((s,e)=>s+(Number(e.amount)||0),0);
  const filtCredit = filteredEntries.filter(e=>e.entry_type==='credit').reduce((s,e)=>s+(Number(e.amount)||0),0);
  const finalBal   = activeData ? activeData.openingBal + activeData.totalDebit - activeData.totalCredit : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-[#22c55e] font-bold">
      <div className="w-6 h-6 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin mr-3"/>
      Loading Ledger…
    </div>
  );

  return (
    <div className="text-white min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <Users className="text-[#22c55e]" size={24}/>
        <div>
          <h1 className="text-2xl font-black">PARTY <span className="text-[#22c55e]">LEDGER</span></h1>
          <p className="text-gray-500 text-xs mt-0.5">Opening Balance · Auto Bills · Manual Payments · Running Balance</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-bold border flex items-center gap-2 ${msgOk ? 'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]' : 'bg-red-500/10 border-red-500/40 text-red-400'}`}>
          {msgOk ? <Check size={15}/> : <AlertCircle size={15}/>} {msg}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-72 shrink-0">
          <div className="flex gap-1 mb-4 bg-white/[0.03] p-1 rounded-2xl border border-white/10">
            {['Sale','Purchase'].map(t => (
              <button key={t} onClick={() => { setActiveType(t); setActiveParty(null); }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${activeType===t?'bg-[#22c55e] text-black':'text-gray-400 hover:text-white'}`}>
                {t==='Sale'?<TrendingUp size={13}/>:<TrendingDown size={13}/>} {t}
              </button>
            ))}
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Party search…"
              className="w-full pl-8 p-2.5 bg-white/[0.03] rounded-xl border border-[#22c55e]/20 outline-none text-xs"/>
          </div>

          {showAddParty ? (
            <div className="flex gap-1.5 mb-3">
              <input
                autoFocus
                value={newPartyName}
                onChange={e => setNewPartyName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddNewParty(); if (e.key === 'Escape') setShowAddParty(false); }}
                placeholder={`New ${activeType} party name...`}
                className="flex-1 min-w-0 p-2.5 bg-white/[0.03] rounded-xl border border-[#22c55e]/40 outline-none text-xs"
              />
              <button onClick={handleAddNewParty} className="px-3 rounded-xl bg-[#22c55e] text-black font-bold text-xs shrink-0">Add</button>
              <button onClick={() => { setShowAddParty(false); setNewPartyName(''); }} className="px-2 rounded-xl bg-white/5 text-gray-400 shrink-0"><X size={14}/></button>
            </div>
          ) : (
            <button onClick={() => setShowAddParty(true)}
              className="w-full mb-3 flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-[#22c55e]/30 text-[#22c55e] text-xs font-bold hover:bg-[#22c55e]/5 transition">
              <Plus size={14}/> New {activeType} Party
            </button>
          )}

          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {partyList.map(party => {
              const isAct = activeParty === party.name;
              return (
                <button key={party.name} onClick={() => handlePartySelect(party.name)}
                  className={`w-full text-left p-3 rounded-xl border transition ${isAct ? 'bg-[#22c55e]/10 border-[#22c55e]/40' : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold truncate ${isAct?'text-[#22c55e]':'text-white'}`}>{party.name}</p>
                    {party.balance !== 0 && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ml-1 ${party.balance>0?'bg-orange-500/20 text-orange-400':'bg-[#22c55e]/20 text-[#22c55e]'}`}>
                        {party.balance>0?`DR ${party.balance.toLocaleString()}`:`CR ${Math.abs(party.balance).toLocaleString()}`}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {!activeParty ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Users size={48} className="opacity-20 mb-4"/>
              <p className="font-bold">Party select karo ledger dekhne ke liye</p>
            </div>
          ) : (
            <>
              <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20 mb-4">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    {renamingParty ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameInput}
                          onChange={e => setRenameInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRenameParty(); if (e.key === 'Escape') cancelRenameParty(); }}
                          className="bg-black/40 p-2 rounded-lg border border-[#22c55e]/40 outline-none text-lg font-black text-[#22c55e]"
                        />
                        <button onClick={handleRenameParty} disabled={busyPartyOp} className="text-[#22c55e] p-1.5 disabled:opacity-40"><Check size={16}/></button>
                        <button onClick={cancelRenameParty} className="text-gray-500 p-1.5"><X size={16}/></button>
                      </div>
                    ) : (
                      <h2 className="text-xl font-black text-[#22c55e] flex items-center gap-2 group">
                        {activeParty}
                        <button onClick={startRenameParty} title="Party ka naam edit karo" className="text-gray-600 hover:text-[#22c55e] opacity-0 group-hover:opacity-100 transition"><Pencil size={14}/></button>
                        <button onClick={handleDeleteParty} disabled={busyPartyOp} title="Party delete karo" className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition disabled:opacity-40"><Trash2 size={14}/></button>
                      </h2>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">{activeType} Party</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setShowOpening(p=>!p); setShowPayment(false); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition ${showOpening?'bg-purple-500/20 border-purple-500/40 text-purple-300':'bg-white/5 border-white/10 text-gray-400 hover:text-purple-400 hover:border-purple-500/30'}`}>
                      <Wallet size={13}/> Opening Balance
                    </button>
                    <button onClick={() => { setShowPayment(p=>!p); setShowOpening(false); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition ${showPayment?'bg-[#22c55e]/20 border-[#22c55e]/40 text-[#22c55e]':'bg-white/5 border-white/10 text-gray-400 hover:text-[#22c55e] hover:border-[#22c55e]/30'}`}>
                      <CreditCard size={13}/> Manual Payment
                    </button>
                    {filteredEntries.length > 0 && (
                      <>
                        <button onClick={() => exportCSV(activeParty, filteredEntries, activeData?.openingBal || 0)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-gray-400 hover:text-[#22c55e] hover:border-[#22c55e]/30 transition">
                          <Download size={13}/> CSV
                        </button>
                        {/* New PDF Button */}
                        <button onClick={() => generatePDF(activeParty, filteredEntries, activeData?.openingBal || 0, monthFilter)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition">
                          <Printer size={13}/> PDF
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
                    <p className="text-[9px] text-gray-500 uppercase font-bold">Opening</p>
                    <p className="text-base font-black text-purple-400 mt-0.5">{(activeData?.openingBal||0).toLocaleString()}</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                    <p className="text-[9px] text-gray-500 uppercase font-bold">Total Debit</p>
                    <p className="text-base font-black text-red-400 mt-0.5">{(activeData?.totalDebit||0).toLocaleString()}</p>
                  </div>
                  <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl p-3 text-center">
                    <p className="text-[9px] text-gray-500 uppercase font-bold">Total Credit</p>
                    <p className="text-base font-black text-[#22c55e] mt-0.5">{(activeData?.totalCredit||0).toLocaleString()}</p>
                  </div>
                  <div className={`border rounded-xl p-3 text-center ${finalBal > 0 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-[#22c55e]/10 border-[#22c55e]/20'}`}>
                    <p className="text-[9px] text-gray-500 uppercase font-bold">Net Balance</p>
                    <p className={`text-base font-black mt-0.5 ${finalBal > 0 ? 'text-orange-400' : 'text-[#22c55e]'}`}>{finalBal.toLocaleString()} {finalBal >=0 ? 'DR' : 'CR'}</p>
                  </div>
                </div>
              </div>

              {/* Forms Section (Same as your code) */}
              {showOpening && (
                <div className="bg-purple-500/5 p-5 rounded-2xl border border-purple-500/30 mb-4">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Type</label>
                      <div className="flex rounded-xl overflow-hidden border border-purple-500/30">
                        <button type="button" onClick={() => setOpeningType('debit')} className={`flex-1 py-2.5 text-xs font-bold transition ${openingType==='debit'?'bg-orange-500 text-white':'bg-black/30 text-gray-400'}`}>DR</button>
                        <button type="button" onClick={() => setOpeningType('credit')} className={`flex-1 py-2.5 text-xs font-bold transition ${openingType==='credit'?'bg-[#22c55e] text-black':'bg-black/30 text-gray-400'}`}>CR</button>
                      </div>
                    </div>
                    <div><label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Amount</label><input type="number" value={openingAmt} onChange={e=>setOpeningAmt(e.target.value)} className="w-full bg-black/40 p-2.5 rounded-xl border border-purple-500/20 text-sm outline-none"/></div>
                    <div><label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Date</label><input value={openingDate} onChange={e=>setOpeningDate(e.target.value)} className="w-full bg-black/40 p-2.5 rounded-xl border border-purple-500/20 text-sm outline-none"/></div>
                  </div>
                  <button onClick={handleSetOpening} disabled={saving||!openingAmt} className="bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5">{saving ? 'Saving...' : 'Set Opening Balance'}</button>
                </div>
              )}

              {showPayment && (
                <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/30 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Type</label>
                      <div className="flex rounded-xl overflow-hidden border border-[#22c55e]/20">
                        <button type="button" onClick={() => setPayForm(p=>({...p,entry_type:'credit'}))} className={`flex-1 py-2.5 text-xs font-bold ${payForm.entry_type==='credit'?'bg-[#22c55e] text-black':'bg-black/30 text-gray-400'}`}>Credit</button>
                        <button type="button" onClick={() => setPayForm(p=>({...p,entry_type:'debit'}))} className={`flex-1 py-2.5 text-xs font-bold ${payForm.entry_type==='debit'?'bg-red-500 text-white':'bg-black/30 text-gray-400'}`}>Debit</button>
                      </div>
                    </div>
                    <div><label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Amount</label><input type="number" value={payForm.amount} onChange={e=>setPayForm(p=>({...p,amount:e.target.value}))} className={inp}/></div>
                    <div><label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Date</label><input value={payForm.date} onChange={e=>setPayForm(p=>({...p,date:e.target.value}))} className={inp}/></div>
                    <div className="col-span-3"><label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Description</label><input value={payForm.description} onChange={e=>setPayForm(p=>({...p,description:e.target.value}))} className={inp}/></div>
                  </div>
                  <button onClick={handleAddPayment} disabled={saving||!payForm.amount} className="bg-[#22c55e] text-black font-bold px-5 py-2.5 rounded-xl text-xs">{saving ? 'Saving...' : 'Save Entry'}</button>
                </div>
              )}

              {/* Monthly Tabs */}
              {months.length > 0 && (
                <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/10 mb-4 overflow-x-auto">
                  <div className="flex gap-2 min-w-max">
                    {['All', ...months].map(m => (
                      <button key={m} onClick={() => setMonthFilter(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${monthFilter===m?'bg-[#22c55e] text-black border-[#22c55e]':'bg-black/30 text-gray-400 border-white/10'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Table with Edit/Delete (Same logic as your code) */}
              <div className="bg-white/[0.03] rounded-2xl border border-white/10 overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-black/40 text-gray-500 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Debit</th>
                      <th className="p-3 text-right">Credit</th>
                      <th className="p-3 text-right">Balance</th>
                      <th className="p-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {withBal.map(entry => {
                      const isEd = editId === entry._id;
                      return (
                        <tr key={entry._id} className="border-t border-white/5 text-sm hover:bg-white/[0.02]">
                          <td className="p-3">
                            {isEd ? <input value={editData.date} onChange={e=>setEditData(d=>({...d,date:e.target.value}))} className="bg-black/30 p-1 rounded w-24 text-xs"/> : <span className="text-gray-400 text-xs">{entry.date}</span>}
                          </td>
                          <td className="p-3">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${entry.entry_type==='debit'?'bg-red-500/10 text-red-400 border-red-500/20':'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20'}`}>
                              {entry.entry_type}
                            </span>
                          </td>
                          <td className="p-3">
                            {isEd ? <input value={editData.description} onChange={e=>setEditData(d=>({...d,description:e.target.value}))} className="bg-black/30 p-1 rounded w-full text-xs"/> : <span className="text-xs text-gray-300">{entry.description}</span>}
                          </td>
                          <td className="p-3 text-right">
                            {entry.entry_type === 'debit' ? (isEd ? <input type="number" value={editData.amount} onChange={e=>setEditData(d=>({...d,amount:e.target.value}))} className="bg-black/30 p-1 w-20 text-right text-xs"/> : <span className="text-red-400 font-bold">{(entry.amount || 0).toLocaleString()}</span>) : '-'}
                          </td>
                          <td className="p-3 text-right">
                            {entry.entry_type === 'credit' ? (isEd ? <input type="number" value={editData.amount} onChange={e=>setEditData(d=>({...d,amount:e.target.value}))} className="bg-black/30 p-1 w-20 text-right text-xs"/> : <span className="text-emerald-400 font-bold">{(entry.amount || 0).toLocaleString()}</span>) : '-'}
                          </td>
                          <td className="p-3 text-right font-black text-orange-400">
                            {(entry.runningBalance || 0).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              {isEd ? (
                                <button onClick={()=>saveEdit(entry._id)} className="text-emerald-500"><Check size={14}/></button>
                              ) : (
                                <>
                                  <button onClick={()=>startEdit(entry)} className="text-gray-500 hover:text-white"><Pencil size={14}/></button>
                                  <button onClick={()=>handleDelete(entry._id)} className="text-gray-500 hover:text-red-500"><Trash2 size={14}/></button>
                                </>
                              )}
                            </div>
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
