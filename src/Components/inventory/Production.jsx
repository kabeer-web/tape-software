import { useState, useContext, useEffect, useMemo } from 'react';
import { StockContext, displayRoll, rollMatches } from './StockContext';
import {
  getInventoryByRoll, getProductions,
  addProduction, updateProduction, deleteProduction
} from '../../api';
// ICONS IMPORT
import {
  Factory, Search, Plus, Trash2, Pencil, Check, X, 
  AlertTriangle, Info, Database, History, ArrowRight,
  TrendingDown, CheckCircle2, Calculator, Calendar, Layers 
} from 'lucide-react';

const CORE_BRANDS = ['Bell', 'Race', 'Tesco', 'Jhonson'];
const PLY_OPTIONS  = ['5', '6', '8', '10'];

// Jambo categories list (StockContext wali)
const JAMBO_CATS = ['Clear','Tan','Cloth','Masking','Tissue','SuperYellow','SuperClear','Color','Foam','Lemon'];

const sideMatch = (inventorySide, formSide) => {
  if (!inventorySide || !formSide) return false;
  const map = { 'D/S': ['Double', 'D/S', 'double'], 'S/S': ['Single', 'S/S', 'single'] };
  return (map[formSide] || []).includes(inventorySide);
};

const emptyForm = {
  date: new Date().toLocaleDateString('en-GB'),
  coreSide: '', coreBrand: '', corePly: '', coreQty: '', yardsPerCore: '',
};

const Production = () => {
  const { inventory, adjustStock, refreshInventory } = useContext(StockContext);
  const [form, setForm] = useState(emptyForm);
  const [productions, setProductions] = useState([]);
  const [pgLoad, setPgLoad] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('entry');
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [rollInput, setRollInput] = useState('');
  const [rollFound, setRollFound] = useState(null);
  const [rollErr, setRollErr] = useState('');
  const [rollLoading, setRollLoading] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  useEffect(() => {
    getProductions()
      .then(d => setProductions(d))
      .catch(e => console.error(e))
      .finally(() => setPgLoad(false));
  }, []);

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: '', ok: true }), 6000);
  };

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ✅ UPDATED SMART SEARCH (1 likhne par 001 khud banayega)
const handleSearch = async () => {
  const raw = rollInput.trim();
  setRollErr(''); setRollFound(null);
  if (!raw) { setRollErr('Roll number likhein pehle'); return; }

  setRollLoading(true);
  try {
    // getInventoryByRoll (api.js) already tries exact match plus 6/3/2-digit
    // padding fallbacks — no need to duplicate that here.
    const found = await getInventoryByRoll(raw);

    if (!found) {
      setRollErr(`Roll #${raw} inventory mein nahi mila.`);
    } else {
      const cat = found.category || found.type || '';
      const isJambo = JAMBO_CATS.includes(cat);

      if (!isJambo) {
        setRollErr(`Roll #${raw} ek ${cat} hai — Jambo roll search karein.`);
      } else if (Number(found.yards || 0) <= 0) {
        setRollErr(`Roll #${raw} ka stock khatam hai.`);
      } else {
        setRollFound(found);
        flash(`✅ Roll Found: #${displayRoll(found.roll_no || found.rollNo)}`, true);
      }
    }
  } catch (err) {
    setRollErr('Search error: ' + err.message);
  } finally {
    setRollLoading(false);
  }
};
  const clearRoll = () => { setRollInput(''); setRollFound(null); setRollErr(''); };

  const coreItem = useMemo(() => {
    if (!form.coreBrand || !form.coreSide || !form.corePly) return null;
    return inventory.find(i => 
      i.category === 'Core' && 
      i.brand === form.coreBrand && 
      sideMatch(i.side, form.coreSide) && 
      String(i.ply) === String(form.corePly)
    ) || null;
  }, [inventory, form]);

  // Logs tab: search by Jambo roll #, then group all entries for the same
  // roll together (instead of pure created_at order) — e.g. Roll #1 today,
  // then #2/#3/#4, then another #1 entry later: all #1 entries now sit next
  // to each other instead of the second one landing at the top on its own.
  const visibleProductions = (() => {
    const q = logSearch.trim();
    const base = q ? productions.filter(p => rollMatches(p.roll_no, q)) : productions;
    const groups = new Map();
    for (const p of base) {
      const key = displayRoll(p.roll_no) || '—';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    return Array.from(groups.values()).flat();
  })();

  const coreQty = parseFloat(form.coreQty) || 0;
  const yardsPerCore = parseFloat(form.yardsPerCore) || 0;
  const totalYards = parseFloat((coreQty * yardsPerCore).toFixed(2));
  const availYards = rollFound ? Number(rollFound.yards || 0) : 0;
  const tooMany = rollFound && totalYards > 0 && totalYards > availYards;
  const coreShortage = coreItem && coreQty > 0 && coreQty > Number(coreItem.qty || 0);
  // Jambo shortage no longer blocks submission — it's allowed to go
  // negative (see `tooMany` styling below, which still warns visually).
  // Core shortage still blocks, untouched from before.
  const isReady = Boolean(rollFound && coreItem && !coreShortage && coreQty > 0 && yardsPerCore > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isReady) return;
    setSaving(true);
    try {
      // Update Stock
      await adjustStock(rollFound, 'yards', -totalYards);
      await adjustStock(coreItem, 'qty', -coreQty);

      const record = {
        date: form.date,
        roll_no: String(rollFound.roll_no || rollFound.rollNo || ''),
        jambo_type: rollFound.category || rollFound.type || '',
        micron: String(rollFound.micron || ''),
        width: String(rollFound.width || ''),
        core_side: form.coreSide,
        core_brand: form.coreBrand,
        core_ply: form.corePly,
        core_qty_used: coreQty,
        yards_per_core: yardsPerCore,
        yards_used: totalYards,
        roll_snapshot: { ...rollFound },
        core_snapshot: { ...coreItem },
      };

      const saved = await addProduction(record);
      setProductions(prev => [saved, ...prev]);
      flash(`✅ Success: Recorded ${totalYards} yds from Roll #${displayRoll(record.roll_no)}`);
      setForm(emptyForm); clearRoll(); setTab('history');
    } catch (err) { 
      flash('❌ Error: ' + err.message, false); 
      await refreshInventory(); 
    }
    finally { setSaving(false); }
  };

  // Deleting a log entry ONLY removes the log — it does NOT push yards/core
  // qty back into the Jambo/Core stock. (Previously it did, which meant
  // deleting a mistaken entry silently re-inflated stock that may have
  // already moved on elsewhere — confusing and not wanted.) If stock genuinely
  // needs correcting, do that directly on the Jambo/Core page.
  const handleDelete = async (p) => {
    if (!window.confirm('Delete this production log entry? (Stock will NOT be restored — edit it directly on the Jambo page if needed.)')) return;
    try {
      await deleteProduction(p._id);
      setProductions(prev => prev.filter(x => x._id !== p._id));
      flash('✅ Record deleted');
    } catch (err) { flash('❌ Delete error: ' + err.message, false); }
  };

  // ── Inline edit of a saved log entry ─────────────────────────────
  // Editing a log is a pure record correction — like delete, it does NOT
  // touch Jambo/Core stock. It just fixes what was written down.
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState({});

  const startRowEdit = (p) => {
    setEditId(p._id);
    setEditRow({
      date: p.date || '',
      roll_no: displayRoll(p.roll_no),
      core_brand: p.core_brand || '',
      core_side: p.core_side || '',
      core_ply: p.core_ply || '',
      core_qty_used: String(p.core_qty_used ?? ''),
      yards_per_core: String(p.yards_per_core ?? ''),
      yards_used: String(p.yards_used ?? ''),
    });
  };
  const cancelRowEdit = () => { setEditId(null); setEditRow({}); };

  const saveRowEdit = async (p) => {
    const coreQtyUsed = parseFloat(editRow.core_qty_used) || 0;
    const yardsPerCore = parseFloat(editRow.yards_per_core) || 0;
    // Recompute yards_used from qty × yards-per-core unless the user
    // overrode it directly.
    const yardsUsedTyped = parseFloat(editRow.yards_used);
    const yardsUsed = !isNaN(yardsUsedTyped) ? yardsUsedTyped : parseFloat((coreQtyUsed * yardsPerCore).toFixed(2));
    try {
      const updated = await updateProduction(p._id, {
        date: editRow.date,
        roll_no: editRow.roll_no,
        core_brand: editRow.core_brand,
        core_side: editRow.core_side,
        core_ply: editRow.core_ply,
        core_qty_used: coreQtyUsed,
        yards_per_core: yardsPerCore,
        yards_used: yardsUsed,
      });
      setProductions(prev => prev.map(x => x._id === p._id ? updated : x));
      flash('✅ Log entry updated');
      cancelRowEdit();
    } catch (err) {
      flash('❌ Update error: ' + err.message, false);
    }
  };

  const InputLabel = ({ children }) => <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">{children}</label>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-slate-200">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white flex items-center gap-3">
            <Factory className="text-[#10b981]" size={36} />
            PRODUCTION <span className="text-[#10b981] italic text-5xl">HUB</span>
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Slitting & Core Management</p>
        </div>
        
        <div className="flex p-1.5 bg-white/[0.02] border border-white/10 rounded-[2rem] backdrop-blur-xl">
          <button onClick={() => setTab('entry')} className={`px-8 py-3 rounded-[1.6rem] text-xs font-black uppercase transition-all duration-300 ${tab === 'entry' ? 'bg-[#10b981] text-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}>Entry Mode</button>
          <button onClick={() => setTab('history')} className={`px-8 py-3 rounded-[1.6rem] text-xs font-black uppercase transition-all duration-300 ${tab === 'history' ? 'bg-[#10b981] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>Logs ({productions.length})</button>
        </div>
      </header>

      {msg.text && (
        <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 border animate-in slide-in-from-top-4 duration-500 ${msg.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {msg.ok ? <CheckCircle2 size={20}/> : <AlertTriangle size={20}/>}
          <span className="font-bold text-sm tracking-tight">{msg.text}</span>
        </div>
      )}

      {tab === 'entry' ? (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
          
          <div className="lg:col-span-2 space-y-6">
            
            {/* STEP 1: ROLL SEARCH */}
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#10b981]/10 text-[#10b981] flex items-center justify-center border border-[#10b981]/20"><Search size={20}/></div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">1. Find Jambo Roll</h2>
                 </div>
                 <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                    <Calendar size={14} className="text-slate-500"/>
                    <input value={form.date} onChange={e=>upd('date', e.target.value)} className="bg-transparent border-none outline-none text-[11px] font-black text-slate-400 w-24" />
                 </div>
              </div>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input 
                    value={rollInput} 
                    onChange={e => {setRollInput(e.target.value); setRollErr(''); if(rollFound) clearRoll();}}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                    placeholder="Enter Roll Number (e.g. 042)" 
                    className={`w-full bg-black/40 p-5 rounded-2xl border transition-all outline-none text-lg font-black tracking-tight ${rollFound ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 focus:border-[#10b981]'}`}
                  />
                  {rollFound && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#10b981]" size={24} />}
                </div>
                <button type="button" onClick={handleSearch} disabled={rollLoading} className="bg-[#10b981] text-black px-10 rounded-2xl font-black text-xs uppercase hover:scale-105 active:scale-95 transition-all">
                  {rollLoading ? 'Searching...' : 'Fetch Roll'}
                </button>
              </div>

              {rollErr && <p className="text-red-400 text-xs mt-3 font-bold flex items-center gap-1"><AlertTriangle size={14}/> {rollErr}</p>}

              {rollFound && (
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in zoom-in-95">
                  {[
                    { label: 'Category', val: rollFound.category || rollFound.type, icon: Database },
                    { label: 'Micron', val: `${rollFound.micron}μ`, icon: Layers },
                    { label: 'Width', val: `${rollFound.width}mm`, icon: ArrowRight },
                    { label: 'In Stock', val: `${rollFound.yards} yds`, icon: TrendingDown, color: '#10b981' }
                  ].map((item, i) => (
                    <div key={i} className="bg-black/30 border border-white/5 p-4 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">{item.label}</p>
                      <p className="text-lg font-black text-white" style={{ color: item.color }}>{item.val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* STEP 2: CORE DETAILS */}
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-[#10b981]/10 text-[#10b981] flex items-center justify-center border border-[#10b981]/20"><Plus size={20}/></div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">2. Core Configuration</h2>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <InputLabel>Core Brand</InputLabel>
                    <select value={form.coreBrand} onChange={e => upd('coreBrand', e.target.value)} className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#10b981] font-bold text-sm cursor-pointer">
                      <option value="">Select Brand</option>
                      {CORE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <InputLabel>Core Side</InputLabel>
                    <div className="flex p-1 bg-black/40 rounded-2xl border border-white/10 h-[54px]">
                      {['D/S', 'S/S'].map(s => (
                        <button key={s} type="button" onClick={() => upd('coreSide', s)} className={`flex-1 rounded-xl text-[10px] font-black transition-all ${form.coreSide === s ? 'bg-[#10b981] text-black shadow-lg' : 'text-slate-500'}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <InputLabel>Core Ply</InputLabel>
                    <select value={form.corePly} onChange={e => upd('corePly', e.target.value)} className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#10b981] font-bold text-sm cursor-pointer">
                      <option value="">Select Ply</option>
                      {PLY_OPTIONS.map(p => <option key={p} value={p}>{p} Ply</option>)}
                    </select>
                  </div>
                  <div><InputLabel>Quantity (Pcs)</InputLabel><input type="number" value={form.coreQty} onChange={e => upd('coreQty', e.target.value)} placeholder="0" className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#10b981] font-bold" /></div>
                  <div><InputLabel>Yards Per Core</InputLabel><input type="number" value={form.yardsPerCore} onChange={e => upd('yardsPerCore', e.target.value)} placeholder="0.00" className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#10b981] font-bold" /></div>
               </div>

               {form.coreBrand && form.coreSide && form.corePly && (
                <div className={`mt-8 p-4 rounded-2xl border-2 flex items-center gap-4 transition-all duration-500 ${!coreItem ? 'bg-red-500/5 border-red-500/20 text-red-400' : coreShortage ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'}`}>
                  <div className={`p-2 rounded-xl ${!coreItem ? 'bg-red-500/20' : coreShortage ? 'bg-yellow-500/20' : 'bg-emerald-500/20'}`}>
                    {!coreItem ? <X size={20}/> : coreShortage ? <AlertTriangle size={20}/> : <CheckCircle2 size={20}/>}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">{!coreItem ? 'Core Not Found' : coreShortage ? 'Not Enough Core Stock' : 'Matching Core Linked'}</p>
                    <p className="text-[11px] opacity-70 font-bold">
                      {!coreItem
                        ? 'Please add core in inventory.'
                        : coreShortage
                          ? `Only ${coreItem.qty} pcs available — need ${coreQty}.`
                          : `${coreItem.qty} pcs available.`}
                    </p>
                  </div>
                </div>
               )}
            </div>
          </div>

          {/* SUMMARY SIDEBAR */}
          <div className="space-y-6">
            <div className={`p-8 rounded-[3rem] border-2 transition-all duration-500 sticky top-8 ${tooMany || coreShortage ? 'bg-red-500/5 border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]' : 'bg-emerald-500/5 border-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.05)]'}`}>
              <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
                <Calculator className="text-slate-500" size={18} />
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Live Calculation</h3>
              </div>
              <div className="space-y-8">
                <div><p className="text-6xl font-black tracking-tighter text-white font-mono">{totalYards}</p><p className="text-xs font-bold text-slate-500 uppercase mt-3 tracking-widest">Total Yards Needed</p></div>
                <div className="space-y-4 pt-6 border-t border-white/5 text-sm">
                   <div className="flex justify-between font-bold text-slate-400"><span>Roll Current</span><span>{availYards} yds</span></div>
                   <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-xs font-black text-slate-500">Remaining</span>
                      <span className={`text-2xl font-black font-mono ${tooMany ? 'text-red-500' : 'text-[#10b981]'}`}>{(availYards - totalYards).toFixed(2)} yds</span>
                   </div>
                </div>
                <button 
                   onClick={handleSubmit} 
                   disabled={!isReady || saving} 
                   className="w-full bg-[#10b981] disabled:bg-white/5 disabled:text-slate-700 text-black py-6 rounded-[2rem] font-black text-xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
                >
                  {saving ? <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin"/> : <><Check size={24} strokeWidth={3}/> SAVE ENTRY</>}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* HISTORY LOGS */
        <div className="space-y-4 animate-in slide-in-from-bottom-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
              placeholder="Search logs by Jambo roll #..."
              className="w-full pl-11 pr-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl outline-none focus:border-[#10b981]/50 text-sm font-bold text-white placeholder:text-slate-600"
            />
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <tr><th className="p-6">Date</th><th className="p-6">Identity</th><th className="p-6">Core Specs</th><th className="p-6 text-center">Batch Size</th><th className="p-6 text-center">Net Yards</th><th className="p-6 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visibleProductions.length === 0 ? (
                    <tr><td colSpan={6} className="p-32 text-center text-slate-700 font-bold uppercase tracking-widest italic">No activity recorded yet.</td></tr>
                  ) : visibleProductions.map(p => {
                    const isEditingRow = editId === p._id;
                    return (
                    <tr key={p._id || p.id} className="hover:bg-white/5 transition-all group">
                      <td className="p-6 text-sm font-bold text-slate-500 font-mono">
                        {isEditingRow ? (
                          <input value={editRow.date} onChange={e => setEditRow(r => ({ ...r, date: e.target.value }))} className="w-24 bg-black/40 p-2 rounded-lg border border-[#10b981]/40 outline-none text-xs" />
                        ) : p.date}
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center font-black text-[#10b981] border border-white/5 shadow-inner text-lg shrink-0">
                            #{isEditingRow ? (
                              <input value={editRow.roll_no} onChange={e => setEditRow(r => ({ ...r, roll_no: e.target.value }))} className="w-10 bg-transparent outline-none text-center" />
                            ) : displayRoll(p.roll_no)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-white">{p.jambo_type}</p>
                            <p className="text-[10px] font-black text-slate-500 uppercase">{p.micron}μ • {p.width}mm</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        {isEditingRow ? (
                          <div className="flex flex-col gap-1.5">
                            <select value={editRow.core_brand} onChange={e => setEditRow(r => ({ ...r, core_brand: e.target.value }))} className="bg-black/40 p-1.5 rounded-lg border border-[#10b981]/40 outline-none text-xs">
                              {CORE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <div className="flex gap-1.5">
                              <select value={editRow.core_side} onChange={e => setEditRow(r => ({ ...r, core_side: e.target.value }))} className="bg-black/40 p-1.5 rounded-lg border border-[#10b981]/40 outline-none text-xs">
                                {['D/S', 'S/S'].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <select value={editRow.core_ply} onChange={e => setEditRow(r => ({ ...r, core_ply: e.target.value }))} className="bg-black/40 p-1.5 rounded-lg border border-[#10b981]/40 outline-none text-xs">
                                {PLY_OPTIONS.map(pl => <option key={pl} value={pl}>{pl} Ply</option>)}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-black text-white uppercase tracking-tight">{p.core_brand}</span>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                              <span className="text-[#10b981] bg-[#10b981]/10 px-1.5 rounded-md">{p.core_side}</span>
                              <span>• {p.core_ply} Ply</span>
                            </div>
                          </>
                        )}
                      </td>
                      <td className="p-6 text-center font-black text-xl">
                        {isEditingRow ? (
                          <input type="number" value={editRow.core_qty_used} onChange={e => setEditRow(r => ({ ...r, core_qty_used: e.target.value }))} className="w-16 bg-black/40 p-1.5 rounded-lg border border-[#10b981]/40 outline-none text-sm text-center" />
                        ) : (<>{p.core_qty_used} <small className="text-[9px] opacity-40 uppercase tracking-tighter">pcs</small></>)}
                      </td>
                      <td className="p-6 text-center font-black text-xl text-[#10b981]">
                        {isEditingRow ? (
                          <input type="number" step="0.01" value={editRow.yards_used} onChange={e => setEditRow(r => ({ ...r, yards_used: e.target.value }))} className="w-20 bg-black/40 p-1.5 rounded-lg border border-[#10b981]/40 outline-none text-sm text-center" />
                        ) : (<>{p.yards_used} <small className="text-[9px] opacity-40 uppercase tracking-tighter">yds</small></>)}
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditingRow ? (
                            <>
                              <button onClick={() => saveRowEdit(p)} className="p-3 bg-[#10b981]/10 text-[#10b981] rounded-xl hover:bg-[#10b981] hover:text-black transition-all"><Check size={18}/></button>
                              <button onClick={cancelRowEdit} className="p-3 bg-white/5 text-slate-400 rounded-xl hover:bg-white/10 transition-all"><X size={18}/></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startRowEdit(p)} className="p-3 bg-white/5 text-slate-400 rounded-xl hover:bg-[#10b981] hover:text-black transition-all opacity-0 group-hover:opacity-100"><Pencil size={16}/></button>
                              <button onClick={() => handleDelete(p)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg shadow-red-500/20">
                                <Trash2 size={18}/>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Production;
