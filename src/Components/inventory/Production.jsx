import { useState, useContext, useEffect, useMemo } from 'react';
import { StockContext } from './StockContext';
import {
  getInventoryByRoll, getProductions,
  addProduction, updateProduction, deleteProduction
} from '../../api';
// YAHAN LAYERS ADD KAR DIYA HAI
import {
  Factory, Search, Plus, Trash2, Pencil, Check, X, 
  AlertTriangle, Info, Database, History, ArrowRight,
  TrendingDown, CheckCircle2, Calculator, Calendar, Layers 
} from 'lucide-react';

const CORE_BRANDS = ['Bell', 'Race', 'Tesco', 'Jhonson'];
const PLY_OPTIONS  = ['5', '6', '8', '10'];

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
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    getProductions().then(d => setProductions(d)).catch(e => console.error(e)).finally(() => setPgLoad(false));
  }, []);

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: '', ok: true }), 6000);
  };

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSearch = async () => {
    const raw = rollInput.trim();
    setRollErr(''); setRollFound(null);
    if (!raw) { setRollErr('Roll number likhein pehle'); return; }
    setRollLoading(true);
    try {
      const found = await getInventoryByRoll(raw);
      if (!found) setRollErr(`Roll #${raw} inventory mein nahi mila`);
      else if (['Core', 'Carton'].includes(found.category)) setRollErr(`Roll #${raw} ek ${found.category} hai — Jambo roll chahiye`);
      else if (Number(found.yards || 0) <= 0) setRollErr(`Roll #${raw} ki yards khatam ho gayi hain`);
      else setRollFound(found);
    } catch (err) { setRollErr('Search error: ' + err.message); }
    finally { setRollLoading(false); }
  };

  const clearRoll = () => { setRollInput(''); setRollFound(null); setRollErr(''); };

  const coreItem = useMemo(() => {
    if (!form.coreBrand || !form.coreSide || !form.corePly) return null;
    return inventory.find(i => i.category === 'Core' && i.brand === form.coreBrand && sideMatch(i.side, form.coreSide) && String(i.ply) === String(form.corePly)) || null;
  }, [inventory, form]);

  const coreQty = parseFloat(form.coreQty) || 0;
  const yardsPerCore = parseFloat(form.yardsPerCore) || 0;
  const totalYards = parseFloat((coreQty * yardsPerCore).toFixed(2));
  const availYards = rollFound ? Number(rollFound.yards || 0) : 0;
  const tooMany = rollFound && totalYards > 0 && totalYards > availYards;
  const isReady = Boolean(rollFound && !tooMany && coreItem && coreQty > 0 && yardsPerCore > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isReady) return;
    setSaving(true);
    try {
      const rollSnap = JSON.parse(JSON.stringify(rollFound));
      const coreSnap = JSON.parse(JSON.stringify(coreItem));
      await adjustStock(rollFound, 'yards', -totalYards);
      await adjustStock(coreItem, 'qty', -coreQty);
      const record = {
        date: form.date,
        roll_no: String(rollFound.rollNo || rollFound.roll_no || ''),
        jambo_type: rollFound.category || rollFound.type || '',
        micron: String(rollFound.micron || ''),
        width: String(rollFound.width || ''),
        core_side: form.coreSide,
        core_brand: form.coreBrand,
        core_ply: form.corePly,
        core_qty_used: coreQty,
        yards_per_core: yardsPerCore,
        yards_used: totalYards,
        roll_snapshot: rollSnap,
        core_snapshot: coreSnap,
      };
      const saved = await addProduction(record);
      setProductions(prev => [saved, ...prev]);
      flash(`✅ Success: Issued ${totalYards} yds from Roll #${rollSnap.rollNo || rollSnap.roll_no}`);
      setForm(emptyForm); clearRoll(); setTab('history');
    } catch (err) { flash('❌ Error: ' + err.message, false); await refreshInventory(); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p) => {
    if (!window.confirm('Delete and restore stock?')) return;
    try {
      if (p.roll_snapshot) await adjustStock(p.roll_snapshot, 'yards', Number(p.yards_used || 0));
      if (p.core_snapshot) await adjustStock(p.core_snapshot, 'qty', Number(p.core_qty_used || 0));
      await deleteProduction(p._id);
      setProductions(prev => prev.filter(x => x._id !== p._id));
      flash('✅ Record deleted and stock restored');
    } catch (err) { flash('❌ Delete error: ' + err.message, false); await refreshInventory(); }
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
                  {rollLoading ? 'Syncing...' : 'Fetch Roll'}
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
                  <div><InputLabel>Quantity</InputLabel><input type="number" value={form.coreQty} onChange={e => upd('coreQty', e.target.value)} placeholder="0" className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#10b981] font-bold" /></div>
                  <div><InputLabel>Yards Per Core</InputLabel><input type="number" value={form.yardsPerCore} onChange={e => upd('yardsPerCore', e.target.value)} placeholder="0.00" className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#10b981] font-bold" /></div>
               </div>

               {form.coreBrand && form.coreSide && form.corePly && (
                <div className={`mt-8 p-4 rounded-2xl border-2 flex items-center gap-4 transition-all duration-500 ${coreItem ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
                  <div className={`p-2 rounded-xl ${coreItem ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    {coreItem ? <CheckCircle2 size={20}/> : <X size={20}/>}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">{coreItem ? 'Matching Core Linked' : 'Core Not Found'}</p>
                    <p className="text-[11px] opacity-70 font-bold">{coreItem ? `${coreItem.qty} pcs available.` : 'Please add core in inventory.'}</p>
                  </div>
                </div>
               )}
            </div>
          </div>

          {/* SUMMARY */}
          <div className="space-y-6">
            <div className={`p-8 rounded-[3rem] border-2 transition-all duration-500 sticky top-8 ${tooMany ? 'bg-red-500/5 border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]' : 'bg-emerald-500/5 border-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.05)]'}`}>
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
                <button onClick={handleSubmit} disabled={!isReady || saving} className="w-full bg-[#10b981] disabled:bg-white/5 disabled:text-slate-700 text-black py-6 rounded-[2rem] font-black text-xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3">
                  {saving ? <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin"/> : <><Check size={24} strokeWidth={3}/> SAVE ENTRY</>}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* HISTORY LOGS */
        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                <tr><th className="p-6">Date</th><th className="p-6">Identity</th><th className="p-6">Core Specs</th><th className="p-6 text-center">Batch Size</th><th className="p-6 text-center">Net Yards</th><th className="p-6 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {productions.length === 0 ? (<tr><td colSpan={6} className="p-32 text-center text-slate-700 font-bold uppercase tracking-widest italic">No activity recorded yet.</td></tr>) : productions.map(p => (
                  <tr key={p._id} className="hover:bg-white/5 transition-all group">
                    <td className="p-6 text-sm font-bold text-slate-500 font-mono">{p.date}</td>
                    <td className="p-6"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center font-black text-[#10b981] border border-white/5 shadow-inner text-lg">#{p.roll_no}</div><div><p className="text-sm font-black text-white">{p.jambo_type}</p><p className="text-[10px] font-black text-slate-500 uppercase">{p.micron}μ • {p.width}mm</p></div></div></td>
                    <td className="p-6"><span className="text-xs font-black text-white uppercase tracking-tight">{p.core_brand}</span><div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mt-0.5"><span className="text-[#10b981] bg-[#10b981]/10 px-1.5 rounded-md">{p.core_side}</span><span>• {p.core_ply} Ply</span></div></td>
                    <td className="p-6 text-center font-black text-xl">{p.core_qty_used} <small className="text-[9px] opacity-40 uppercase tracking-tighter">pcs</small></td>
                    <td className="p-6 text-center font-black text-xl text-[#10b981]">{p.yards_used} <small className="text-[9px] opacity-40 uppercase tracking-tighter">yds</small></td>
                    <td className="p-6 text-right"><button onClick={() => handleDelete(p)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg shadow-red-500/20"><Trash2 size={18}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Production;
