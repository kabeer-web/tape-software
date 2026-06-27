import { useState, useContext, useEffect, useMemo } from 'react';
import { StockContext } from './StockContext';
import {
  getInventoryByRoll, getProductions,
  addProduction, updateProduction, deleteProduction
} from '../../api';
import {
  Factory, Search, Plus, Trash2, Pencil, Check, X, 
  AlertTriangle, Info, Database, History, ArrowRight,
  TrendingDown, CheckCircle2, Calculator
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
    getProductions()
      .then(d => setProductions(d))
      .catch(e => console.error(e))
      .finally(() => setPgLoad(false));
  }, []);

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: '', ok: true }), 6000);
  };

  const handleSearch = async () => {
    const raw = rollInput.trim();
    if (!raw) return;
    setRollLoading(true);
    setRollErr('');
    try {
      const found = await getInventoryByRoll(raw);
      if (!found) setRollErr(`Roll #${raw} not found in database.`);
      else if (Number(found.yards) <= 0) setRollErr(`Roll #${raw} is empty (0 Yards).`);
      else setRollFound(found);
    } catch (err) { setRollErr('Error: ' + err.message); }
    finally { setRollLoading(false); }
  };

  const coreItem = useMemo(() => {
    if (!form.coreBrand || !form.coreSide || !form.corePly) return null;
    return inventory.find(i =>
      i.category === 'Core' && i.brand === form.coreBrand &&
      sideMatch(i.side, form.coreSide) && String(i.ply) === String(form.corePly)
    ) || null;
  }, [inventory, form]);

  const totalYards = parseFloat(((parseFloat(form.coreQty) || 0) * (parseFloat(form.yardsPerCore) || 0)).toFixed(2));
  const availYards = rollFound ? Number(rollFound.yards || 0) : 0;
  const tooMany = totalYards > availYards;
  const isReady = rollFound && coreItem && !tooMany && totalYards > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isReady || saving) return;
    setSaving(true);

    try {
      const rollSnap = { ...rollFound };
      const coreSnap = { ...coreItem };

      await adjustStock(rollFound, 'yards', -totalYards);
      await adjustStock(coreItem, 'qty', -parseFloat(form.coreQty));

      const record = {
        date: form.date,
        roll_no: String(rollFound.rollNo || rollFound.roll_no),
        jambo_type: rollFound.category || rollFound.type,
        micron: String(rollFound.micron || ''),
        width: String(rollFound.width || ''),
        core_side: form.coreSide,
        core_brand: form.coreBrand,
        core_ply: form.corePly,
        core_qty_used: parseFloat(form.coreQty),
        yards_per_core: parseFloat(form.yardsPerCore),
        yards_used: totalYards,
        roll_snapshot: rollSnap,
        core_snapshot: coreSnap,
      };

      const saved = await addProduction(record);
      setProductions(prev => [saved, ...prev]);
      flash(`Production Success! Issued ${totalYards} yds from Roll #${rollFound.roll_no}`);
      setForm(emptyForm);
      setRollFound(null);
      setRollInput('');
      setTab('history');
    } catch (err) {
      flash('Error: ' + err.message, false);
      await refreshInventory();
    } finally { setSaving(false); }
  };

  const handleDelete = async (p) => {
    if (!window.confirm('Delete and restore stock?')) return;
    try {
      if (p.roll_snapshot) await adjustStock(p.roll_snapshot, 'yards', p.yards_used);
      if (p.core_snapshot) await adjustStock(p.core_snapshot, 'qty', p.core_qty_used);
      await deleteProduction(p._id);
      setProductions(prev => prev.filter(x => x._id !== p._id));
      flash('Record deleted and stock restored.');
    } catch (err) { flash('Restore failed: ' + err.message, false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* --- Page Header --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white flex items-center gap-3">
            <Factory className="text-[#10b981]" size={36} />
            PRODUCTION <span className="text-[#10b981] italic">HUB</span>
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1 ml-1">Daily Slitting & Core Issuance</p>
        </div>
        
        <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
          <button onClick={() => setTab('entry')} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${tab === 'entry' ? 'bg-[#10b981] text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}>New Entry</button>
          <button onClick={() => setTab('history')} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${tab === 'history' ? 'bg-[#10b981] text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}>History</button>
        </div>
      </header>

      {msg.text && (
        <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 border animate-in slide-in-from-top-4 duration-300 ${msg.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {msg.ok ? <CheckCircle2 size={20}/> : <AlertTriangle size={20}/>}
          <span className="font-bold text-sm">{msg.text}</span>
        </div>
      )}

      {tab === 'entry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
          
          {/* Left Side: Inputs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Step 1: Jambo Search */}
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#10b981] text-black flex items-center justify-center text-xs font-black">1</div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Select Jambo Roll</h2>
              </div>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input 
                    value={rollInput} 
                    onChange={e => setRollInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Enter Roll Number (e.g. 042)" 
                    className="w-full bg-black/40 pl-12 pr-4 py-4 rounded-2xl border border-white/10 outline-none focus:border-[#10b981] transition-all font-bold text-white placeholder:text-slate-600"
                  />
                </div>
                <button onClick={handleSearch} disabled={rollLoading} className="bg-white/5 border border-white/10 hover:bg-[#10b981] hover:text-black px-8 rounded-2xl font-black text-xs transition-all uppercase whitespace-nowrap">
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
                    { label: 'Available', val: `${rollFound.yards} yds`, icon: TrendingDown, color: '#10b981' }
                  ].map((item, i) => (
                    <div key={i} className="bg-black/20 border border-white/5 p-4 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">{item.label}</p>
                      <p className="text-lg font-black text-white" style={{ color: item.color }}>{item.val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Core Details */}
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#10b981] text-black flex items-center justify-center text-xs font-black">2</div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Core Specifications</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Brand</label>
                  <select value={form.coreBrand} onChange={e => setForm({...form, coreBrand: e.target.value})} className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#10b981] font-bold text-sm">
                    <option value="">Select Brand</option>
                    {CORE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Side</label>
                  <div className="flex p-1 bg-black/40 rounded-2xl border border-white/10">
                    {['D/S', 'S/S'].map(s => (
                      <button key={s} onClick={() => setForm({...form, coreSide: s})} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${form.coreSide === s ? 'bg-[#10b981] text-black shadow-lg' : 'text-slate-500'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Ply</label>
                  <select value={form.corePly} onChange={e => setForm({...form, corePly: e.target.value})} className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#10b981] font-bold text-sm">
                    <option value="">Select Ply</option>
                    {PLY_OPTIONS.map(p => <option key={p} value={p}>{p} Ply</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Cores to Issue</label>
                  <input type="number" value={form.coreQty} onChange={e => setForm({...form, coreQty: e.target.value})} placeholder="0" className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#10b981] font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Yards per Core</label>
                  <input type="number" value={form.yardsPerCore} onChange={e => setForm({...form, yardsPerCore: e.target.value})} placeholder="0.00" className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-[#10b981] font-bold" />
                </div>
                <div className="flex flex-col justify-end">
                   <input type="text" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="bg-white/5 border border-white/5 p-4 rounded-2xl text-xs font-bold text-slate-500 outline-none" />
                </div>
              </div>

              {form.coreBrand && form.coreSide && form.corePly && (
                <div className={`mt-6 p-4 rounded-2xl border flex items-center gap-3 transition-all ${coreItem ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
                  {coreItem ? <CheckCircle2 size={18}/> : <X size={18}/>}
                  <span className="text-xs font-bold uppercase tracking-tight">
                    {coreItem ? `Database Sync: ${coreItem.qty} Cores currently in stock.` : `Inventory Error: No matching ${form.coreBrand} ${form.corePly}p ${form.coreSide} found.`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Summary & Actions */}
          <div className="space-y-6">
            <div className={`p-8 rounded-[3rem] border-2 transition-all duration-500 sticky top-6 ${tooMany ? 'bg-red-500/5 border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]' : 'bg-emerald-500/5 border-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.05)]'}`}>
              <div className="flex items-center gap-2 mb-8">
                <Calculator className="text-slate-500" size={18} />
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Calculation</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-5xl font-black tracking-tighter text-white leading-none">{totalYards}</p>
                  <p className="text-xs font-bold text-slate-500 uppercase mt-2">Total Yards Required</p>
                </div>

                <div className="space-y-3 pt-6 border-t border-white/5 text-sm">
                   <div className="flex justify-between font-bold text-slate-400"><span>Jambo Available</span><span>{availYards} yds</span></div>
                   <div className="flex justify-between font-bold text-slate-400"><span>Cores Issued</span><span>{form.coreQty || 0} pcs</span></div>
                   <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-xs font-black uppercase text-slate-500">Remaining</span>
                      <span className={`text-xl font-black ${tooMany ? 'text-red-500' : 'text-[#10b981]'}`}>
                        {(availYards - totalYards).toFixed(2)} yds
                      </span>
                   </div>
                </div>

                {tooMany && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 animate-pulse">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-[10px] font-black uppercase tracking-tight leading-tight">Insufficient Stock in Roll. Reduce Quantity.</p>
                  </div>
                )}

                <button 
                  onClick={handleSubmit} 
                  disabled={!isReady || saving}
                  className="w-full bg-[#10b981] disabled:bg-white/5 disabled:text-slate-600 text-black py-5 rounded-[2rem] font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-500/20"
                >
                  {saving ? 'PROCESSING...' : 'SAVE PRODUCTION'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <tr>
                  <th className="p-6">Date</th>
                  <th className="p-6">Jambo Identity</th>
                  <th className="p-6">Core Specs</th>
                  <th className="p-6 text-center">Batch Issued</th>
                  <th className="p-6 text-center">Total Yards</th>
                  <th className="p-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {productions.length === 0 ? (
                  <tr><td colSpan={6} className="p-20 text-center text-slate-700 font-bold uppercase tracking-widest">No production records found</td></tr>
                ) : productions.map(p => (
                  <tr key={p._id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-6 text-sm font-bold text-slate-400">{p.date}</td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center font-black text-[#10b981] border border-white/5">#{p.roll_no}</div>
                         <div><p className="text-sm font-black text-white">{p.jambo_type}</p><p className="text-[10px] font-bold text-slate-500 uppercase">{p.micron}μ • {p.width}mm</p></div>
                      </div>
                    </td>
                    <td className="p-6">
                       <span className="text-xs font-black text-white uppercase">{p.core_brand}</span>
                       <p className="text-[10px] font-bold text-slate-500 uppercase">{p.core_side} • {p.core_ply} Ply</p>
                    </td>
                    <td className="p-6 text-center font-black text-lg">{p.core_qty_used} <small className="text-[10px] opacity-40 font-bold uppercase">pcs</small></td>
                    <td className="p-6 text-center font-black text-lg text-[#10b981]">{p.yards_used} <small className="text-[10px] opacity-40 font-bold uppercase">yds</small></td>
                    <td className="p-6 text-right">
                      <button onClick={() => handleDelete(p)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={16}/>
                      </button>
                    </td>
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
