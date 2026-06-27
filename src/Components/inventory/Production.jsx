import { useState, useContext, useEffect, useMemo } from 'react';
import { StockContext } from './StockContext';
import {
  getInventoryByRoll, getProductions,
  addProduction, updateProduction, deleteProduction
} from '../../api';
import {
  Factory, Search, Plus, Trash2,
  Pencil, Check, X, AlertTriangle, Info
} from 'lucide-react';

const CORE_BRANDS = ['Bell', 'Race', 'Tesco', 'Jhonson'];
const PLY_OPTIONS  = ['5', '6', '8', '10'];

// Inventory mein 'Double'/'Single', form mein 'D/S'/'S/S'
const sideMatch = (inventorySide, formSide) => {
  if (!inventorySide || !formSide) return false;
  const map = {
    'D/S': ['Double', 'D/S', 'double'],
    'S/S': ['Single', 'S/S', 'single'],
  };
  return (map[formSide] || []).includes(inventorySide);
};

const emptyForm = {
  date:         new Date().toLocaleDateString('en-GB'),
  coreSide:     '',
  coreBrand:    '',
  corePly:      '',
  coreQty:      '',
  yardsPerCore: '',
};

const Production = () => {
  const { inventory, adjustStock, refreshInventory } = useContext(StockContext);

  const [form,        setForm]        = useState(emptyForm);
  const [productions, setProductions] = useState([]);
  const [pgLoad,      setPgLoad]      = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [tab,         setTab]         = useState('entry');
  const [msg,         setMsg]         = useState({ text: '', ok: true });

  // Roll search
  const [rollInput,   setRollInput]   = useState('');
  const [rollFound,   setRollFound]   = useState(null);
  const [rollErr,     setRollErr]     = useState('');
  const [rollLoading, setRollLoading] = useState(false);

  // Edit
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    getProductions()
      .then(d  => setProductions(d))
      .catch(e => console.error('getProductions:', e))
      .finally(()=> setPgLoad(false));
  }, []);

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: '', ok: true }), 6000);
  };

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Roll Search — Supabase se direct fetch ───────────────
  const handleSearch = async () => {
    const raw = rollInput.trim();
    setRollErr('');
    setRollFound(null);
    if (!raw) { setRollErr('Roll number likhein pehle'); return; }

    setRollLoading(true);
    try {
      const found = await getInventoryByRoll(raw);

      if (!found) {
        setRollErr(`Roll #${raw} inventory mein nahi mila`);
        return;
      }
      if (['Core', 'Carton'].includes(found.category)) {
        setRollErr(`Roll #${raw} ek ${found.category} hai — Jambo roll chahiye`);
        return;
      }
      if (Number(found.yards || 0) <= 0) {
        setRollErr(`Roll #${raw} ki yards khatam ho gayi hain`);
        return;
      }
      setRollFound(found);
    } catch (err) {
      setRollErr('Search error: ' + err.message);
    } finally {
      setRollLoading(false);
    }
  };

  const clearRoll = () => {
    setRollInput('');
    setRollFound(null);
    setRollErr('');
  };

  // ── Core match from inventory ────────────────────────────
  const coreItem = useMemo(() => {
    if (!form.coreBrand || !form.coreSide || !form.corePly) return null;
    return inventory.find(i =>
      i.category === 'Core' &&
      i.brand    === form.coreBrand &&
      sideMatch(i.side, form.coreSide) &&
      String(i.ply) === String(form.corePly)
    ) || null;
  }, [inventory, form.coreBrand, form.coreSide, form.corePly]);

  // ── Calculations ─────────────────────────────────────────
  const coreQty      = parseFloat(form.coreQty)      || 0;
  const yardsPerCore = parseFloat(form.yardsPerCore)  || 0;
  const totalYards   = parseFloat((coreQty * yardsPerCore).toFixed(2));
  const availYards   = rollFound ? Number(rollFound.yards || 0) : 0;
  const tooMany      = rollFound && totalYards > 0 && totalYards > availYards;

  const isReady = Boolean(
    rollFound &&
    !tooMany  &&
    coreItem  &&
    coreQty > 0 &&
    yardsPerCore > 0
  );

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rollFound)      { flash('❌ Roll search karo pehle', false); return; }
    if (!coreItem)       { flash('❌ Matching core nahi mila — inventory mein add karo', false); return; }
    if (coreQty <= 0)    { flash('❌ Core qty daalen', false); return; }
    if (yardsPerCore<=0) { flash('❌ Yards/Core daalen', false); return; }
    if (tooMany)         { flash(`❌ Total yards (${totalYards}) available (${availYards}) se zyada`, false); return; }

    setSaving(true);
    try {
      // Snapshots lene se pehle (before adjustStock changes live values)
      const rollSnap = JSON.parse(JSON.stringify(rollFound));
      const coreSnap = JSON.parse(JSON.stringify(coreItem));

      // 1️⃣ Jambo yards minus
      await adjustStock(rollFound, 'yards', -totalYards);

      // 2️⃣ Core qty minus
      await adjustStock(coreItem, 'qty', -coreQty);

      // 3️⃣ Save production record
      const record = {
        date:           form.date,
        roll_no:        String(rollFound.rollNo || rollFound.roll_no || ''),
        jambo_type:     rollFound.category || rollFound.type || '',
        micron:         String(rollFound.micron || ''),
        width:          String(rollFound.width  || ''),
        core_side:      form.coreSide,
        core_brand:     form.coreBrand,
        core_ply:       form.corePly,
        core_qty_used:  coreQty,
        yards_per_core: yardsPerCore,
        yards_used:     totalYards,
        roll_snapshot:  rollSnap,
        core_snapshot:  coreSnap,
      };

      const saved = await addProduction(record);
      setProductions(prev => [saved, ...prev]);

      flash(
        `✅ Production saved! Roll #${rollSnap.rollNo || rollSnap.roll_no} se ${totalYards} yds minus. Core ${coreQty} pcs minus.`
      );

      setForm(emptyForm);
      clearRoll();
      setTab('history');
    } catch (err) {
      console.error('handleSubmit error:', err);
      flash('❌ Error: ' + err.message, false);
      await refreshInventory();
    } finally {
      setSaving(false);
    }
  };

  // ── Delete with stock restore ────────────────────────────
  const handleDelete = async (p) => {
    if (!window.confirm('Record delete karna hai?\nStock wapas restore hoga.')) return;
    try {
      if (p.roll_snapshot) {
        await adjustStock(p.roll_snapshot, 'yards', Number(p.yards_used || 0));
      }
      if (p.core_snapshot) {
        await adjustStock(p.core_snapshot, 'qty', Number(p.core_qty_used || 0));
      }
      await deleteProduction(p._id);
      setProductions(prev => prev.filter(x => x._id !== p._id));
      flash('✅ Record deleted aur stock restore ho gaya');
    } catch (err) {
      flash('❌ Delete error: ' + err.message, false);
      await refreshInventory();
    }
  };

  // ── Edit ─────────────────────────────────────────────────
  const saveEdit = async (id) => {
    const old    = productions.find(x => x._id === id);
    const newQty = parseFloat(editData.core_qty_used)  || 0;
    const newYpC = parseFloat(editData.yards_per_core) || 0;
    const newYds = parseFloat((newQty * newYpC).toFixed(2));

    try {
      // Restore old quantities then apply new
      if (old?.roll_snapshot) {
        await adjustStock(old.roll_snapshot, 'yards',  Number(old.yards_used    || 0));
        await adjustStock(old.roll_snapshot, 'yards', -newYds);
      }
      if (old?.core_snapshot) {
        await adjustStock(old.core_snapshot, 'qty',    Number(old.core_qty_used || 0));
        await adjustStock(old.core_snapshot, 'qty',   -newQty);
      }
      const updated = await updateProduction(id, { ...editData, yards_used: newYds });
      setProductions(prev => prev.map(x => x._id === id ? updated : x));
      setEditId(null);
      flash('✅ Production updated!');
    } catch (err) {
      flash('❌ Update error: ' + err.message, false);
      await refreshInventory();
    }
  };

  // ── Styles ───────────────────────────────────────────────
  const inp   = 'w-full bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none focus:border-[#22c55e]/50 text-sm transition';
  const editI = 'bg-black/30 p-1.5 rounded-lg border border-[#22c55e]/20 outline-none text-xs';

  return (
    <div className="text-white min-h-screen">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <Factory className="text-[#22c55e]" size={24}/>
        <div>
          <h1 className="text-2xl font-black">
            PRODUCTION <span className="text-[#22c55e]">ENTRY</span>
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">
            Roll number likhein → Search → Auto fetch → Stock minus
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-5 bg-white/[0.03] p-1 rounded-2xl border border-white/10">
        <button onClick={() => setTab('entry')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
            tab==='entry' ? 'bg-[#22c55e] text-black' : 'text-gray-400 hover:text-white'
          }`}>
          New Entry
        </button>
        <button onClick={() => setTab('history')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
            tab==='history' ? 'bg-[#22c55e] text-black' : 'text-gray-400 hover:text-white'
          }`}>
          History ({productions.length})
        </button>
      </div>

      {/* ── Flash message ── */}
      {msg.text && (
        <div className={`mb-5 p-3 rounded-xl text-sm font-bold border ${
          msg.ok
            ? 'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]'
            : 'bg-red-500/10  border-red-500/40  text-red-400'
        }`}>
          {msg.text}
        </div>
      )}

      {/* ════════════════ ENTRY TAB ════════════════ */}
      {tab === 'entry' && (
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Date */}
          <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20">
            <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block tracking-wider">
              Date
            </label>
            <input
              value={form.date}
              onChange={e => upd('date', e.target.value)}
              className="bg-black/30 p-2.5 rounded-xl border border-[#22c55e]/20 outline-none text-sm w-48"
            />
          </div>

          {/* ── STEP 1: Roll Search ── */}
          <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-[#22c55e] text-black text-xs font-black flex items-center justify-center shrink-0">
                1
              </span>
              <p className="text-[10px] text-[#22c55e] uppercase font-bold tracking-wider">
                Jambo Roll Number Daalen aur Search Karein
              </p>
            </div>

            <div className="flex gap-2 mb-2">
              <input
                value={rollInput}
                onChange={e => {
                  setRollInput(e.target.value);
                  setRollErr('');
                  if (rollFound) clearRoll();
                }}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                placeholder="e.g. 1, 01, 001"
                className={`flex-1 bg-black/30 p-2.5 rounded-xl border outline-none text-sm transition ${
                  rollErr    ? 'border-red-500/50' :
                  rollFound  ? 'border-[#22c55e]/60' :
                               'border-[#22c55e]/20 focus:border-[#22c55e]/50'
                }`}
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={rollLoading}
                className="bg-[#22c55e] text-black font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm hover:bg-[#1db954] transition shrink-0 disabled:opacity-60"
              >
                {rollLoading
                  ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"/>
                  : <Search size={15}/>
                }
                Search
              </button>
              {rollFound && (
                <button
                  type="button"
                  onClick={clearRoll}
                  className="p-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-red-500 hover:border-red-500/30 transition shrink-0"
                >
                  <X size={15}/>
                </button>
              )}
            </div>

            {rollErr && (
              <p className="text-red-400 text-xs flex items-center gap-1 mb-2">
                <AlertTriangle size={11}/> {rollErr}
              </p>
            )}

            {/* Roll details — auto fetched */}
            {rollFound && (
              <div className="mt-3 p-4 bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-xl">
                <p className="text-[9px] text-[#22c55e] uppercase font-bold mb-3 tracking-wider">
                  ✓ Roll Found — Auto Fetched
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[
                    { label: 'Roll #',    val: rollFound.rollNo || rollFound.roll_no },
                    { label: 'Type',      val: rollFound.category || rollFound.type || '—' },
                    { label: 'Micron',    val: rollFound.micron ? `${rollFound.micron}μ` : '—' },
                    { label: 'Width',     val: rollFound.width  ? `${rollFound.width}mm`  : '—' },
                    { label: 'Available', val: `${rollFound.yards} yds`, big: true },
                  ].map(({ label, val, big }) => (
                    <div
                      key={label}
                      className={`rounded-xl p-2.5 border ${
                        big
                          ? 'bg-[#22c55e]/15 border-[#22c55e]/40'
                          : 'bg-black/20 border-white/5'
                      }`}
                    >
                      <p className="text-[8.5px] text-gray-500 uppercase font-bold">{label}</p>
                      <p className={`font-black mt-0.5 ${big ? 'text-[#22c55e] text-xl' : 'text-white text-sm'}`}>
                        {val}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── STEP 2: Core ── */}
          <div className="bg-white/[0.03] p-5 rounded-2xl border border-[#22c55e]/20">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-[#22c55e] text-black text-xs font-black flex items-center justify-center shrink-0">
                2
              </span>
              <p className="text-[10px] text-[#22c55e] uppercase font-bold tracking-wider">
                Core Details
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

              {/* Side */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 block">Side</label>
                <div className="flex rounded-xl overflow-hidden border border-[#22c55e]/20">
                  {['D/S', 'S/S'].map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => upd('coreSide', s)}
                      className={`flex-1 py-2.5 text-sm font-bold transition ${
                        form.coreSide === s
                          ? 'bg-[#22c55e] text-black'
                          : 'bg-black/30 text-gray-400 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 block">Brand</label>
                <select value={form.coreBrand} onChange={e => upd('coreBrand', e.target.value)} className={inp}>
                  <option value="">Select Brand</option>
                  {CORE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Ply */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 block">Ply</label>
                <select value={form.corePly} onChange={e => upd('corePly', e.target.value)} className={inp}>
                  <option value="">Select Ply</option>
                  {PLY_OPTIONS.map(p => <option key={p} value={p}>{p} Ply</option>)}
                </select>
              </div>

              {/* Core Qty */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 block">Core Qty Used</label>
                <input
                  type="number" min="1"
                  value={form.coreQty}
                  onChange={e => upd('coreQty', e.target.value)}
                  placeholder="0" className={inp}
                />
              </div>

              {/* Yards per Core */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 block">Yards / Core</label>
                <input
                  type="number" min="0" step="0.1"
                  value={form.yardsPerCore}
                  onChange={e => upd('yardsPerCore', e.target.value)}
                  placeholder="0" className={inp}
                />
              </div>
            </div>

            {/* Core stock status */}
            {form.coreBrand && form.coreSide && form.corePly && (
              <div className={`mt-4 p-3 rounded-xl border text-xs flex items-start gap-2 ${
                coreItem
                  ? 'bg-[#22c55e]/5 border-[#22c55e]/20 text-[#22c55e]'
                  : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400'
              }`}>
                {coreItem ? (
                  <>
                    <Check size={13} className="mt-0.5 shrink-0"/>
                    <div>
                      <p className="font-bold">Core mila!</p>
                      <p className="text-gray-400 mt-0.5">
                        {coreItem.brand} — {coreItem.side} — {coreItem.ply} Ply
                        — <strong className="text-[#22c55e]">{coreItem.qty} pcs available</strong>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={13} className="mt-0.5 shrink-0"/>
                    <div>
                      <p className="font-bold">Core nahi mila</p>
                      <p className="text-gray-500 mt-0.5">
                        {form.coreBrand} / {form.coreSide} / {form.corePly}ply inventory mein nahi hai.
                        Core section mein pehle add karo.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── STEP 3: Summary ── */}
          {coreQty > 0 && yardsPerCore > 0 && (
            <div className={`p-5 rounded-2xl border ${
              tooMany
                ? 'bg-red-500/5 border-red-500/40'
                : 'bg-[#22c55e]/5 border-[#22c55e]/30'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-[#22c55e] text-black text-xs font-black flex items-center justify-center shrink-0">
                  3
                </span>
                <p className="text-[10px] text-[#22c55e] uppercase font-bold tracking-wider">Summary</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase font-bold">Core Qty</p>
                  <p className="text-2xl font-black text-[#22c55e] mt-1">{coreQty}</p>
                </div>
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase font-bold">× Yds/Core</p>
                  <p className="text-2xl font-black text-[#22c55e] mt-1">{yardsPerCore}</p>
                </div>
                <div className={`col-span-2 rounded-xl p-3 border ${
                  tooMany
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-[#22c55e]/10 border-[#22c55e]/30'
                }`}>
                  <p className="text-[9px] text-gray-500 uppercase font-bold">= Total Yards (Jambo se minus)</p>
                  <p className={`text-3xl font-black mt-1 ${tooMany ? 'text-red-400' : 'text-[#22c55e]'}`}>
                    {totalYards}
                    <span className="text-base font-normal text-gray-400 ml-1">yds</span>
                  </p>
                  {tooMany ? (
                    <p className="text-xs text-red-400 mt-1">
                      ⚠️ Available ({availYards}) se {(totalYards - availYards).toFixed(2)} zyada!
                    </p>
                  ) : rollFound ? (
                    <p className="text-xs text-gray-500 mt-1">
                      Baad mein bachenge: {(availYards - totalYards).toFixed(2)} yds
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Why disabled hints */}
          {!isReady && (
            <div className="space-y-1 pl-1">
              {!rollFound && (
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <Info size={10}/> Roll search karo
                </p>
              )}
              {rollFound && !coreItem && form.coreBrand && form.coreSide && form.corePly && (
                <p className="text-xs text-yellow-600 flex items-center gap-1">
                  <Info size={10}/> Core inventory mein nahi mila
                </p>
              )}
              {rollFound && coreItem && coreQty <= 0 && (
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <Info size={10}/> Core qty daalen
                </p>
              )}
              {rollFound && coreItem && coreQty > 0 && yardsPerCore <= 0 && (
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <Info size={10}/> Yards per core daalen
                </p>
              )}
              {tooMany && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <Info size={10}/> Total yards available se zyada hain
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !isReady}
            className="w-full bg-[#22c55e] text-black font-black py-4 rounded-2xl hover:bg-[#1db954] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
          >
            {saving
              ? <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin"/>
              : <><Plus size={20}/> SAVE PRODUCTION & UPDATE STOCK</>
            }
          </button>
        </form>
      )}

      {/* ════════════════ HISTORY TAB ════════════════ */}
      {tab === 'history' && (
        <div>
          {pgLoad ? (
            <div className="text-center py-10 text-[#22c55e] font-bold">Loading...</div>
          ) : productions.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Factory size={40} className="mx-auto mb-3 opacity-20"/>
              <p className="font-semibold">Koi production record nahi mila.</p>
              <p className="text-xs mt-1 text-gray-600">New Entry tab se pehla record banao.</p>
            </div>
          ) : (
            <div className="bg-white/[0.03] rounded-2xl border border-white/10 overflow-x-auto">
              <table className="w-full text-left min-w-[860px]">
                <thead className="bg-black/40 text-[10px] text-gray-500 uppercase">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Roll #</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">MIC/Width</th>
                    <th className="p-3">Side</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3">Ply</th>
                    <th className="p-3 text-center">Core Qty</th>
                    <th className="p-3 text-center">Yds/Core</th>
                    <th className="p-3 text-center">Total Yds</th>
                    <th className="p-3 text-right w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {productions.map(p => {
                    const isEd   = editId === p._id;
                    const calcY  = parseFloat((
                      (parseFloat(editData.core_qty_used)||0) *
                      (parseFloat(editData.yards_per_core)||0)
                    ).toFixed(2));

                    return (
                      <tr
                        key={p._id}
                        className={`border-t border-white/5 text-sm transition ${
                          isEd ? 'bg-[#22c55e]/5' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Date */}
                        <td className="p-3">
                          {isEd
                            ? <input
                                value={editData.date || ''}
                                onChange={e => setEditData(d => ({...d, date: e.target.value}))}
                                className={`${editI} w-24`}
                              />
                            : <span className="text-gray-400">{p.date}</span>
                          }
                        </td>

                        {/* Roll # */}
                        <td className="p-3 font-bold text-[#22c55e]">
                          #{p.roll_no}
                        </td>

                        {/* Type */}
                        <td className="p-3 text-gray-300">{p.jambo_type || '—'}</td>

                        {/* MIC / Width */}
                        <td className="p-3 text-gray-400 text-xs">
                          {p.micron ? `${p.micron}μ` : '—'}
                          {p.width  ? ` / ${p.width}mm` : ''}
                        </td>

                        {/* Side */}
                        <td className="p-3">
                          {isEd
                            ? <select
                                value={editData.core_side || ''}
                                onChange={e => setEditData(d => ({...d, core_side: e.target.value}))}
                                className={editI}
                              >
                                <option value="D/S">D/S</option>
                                <option value="S/S">S/S</option>
                              </select>
                            : <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10">
                                {p.core_side}
                              </span>
                          }
                        </td>

                        {/* Brand */}
                        <td className="p-3">{p.core_brand}</td>

                        {/* Ply */}
                        <td className="p-3">
                          {isEd
                            ? <select
                                value={editData.core_ply || ''}
                                onChange={e => setEditData(d => ({...d, core_ply: e.target.value}))}
                                className={editI}
                              >
                                {PLY_OPTIONS.map(pl =>
                                  <option key={pl} value={pl}>{pl}</option>
                                )}
                              </select>
                            : p.core_ply ? `${p.core_ply}ply` : '—'
                          }
                        </td>

                        {/* Core Qty */}
                        <td className="p-3 text-center">
                          {isEd
                            ? <input
                                type="number"
                                value={editData.core_qty_used || ''}
                                onChange={e => setEditData(d => ({...d, core_qty_used: e.target.value}))}
                                className={`${editI} w-14 text-center`}
                              />
                            : p.core_qty_used
                          }
                        </td>

                        {/* Yds/Core */}
                        <td className="p-3 text-center">
                          {isEd
                            ? <input
                                type="number"
                                value={editData.yards_per_core || ''}
                                onChange={e => setEditData(d => ({...d, yards_per_core: e.target.value}))}
                                className={`${editI} w-14 text-center`}
                              />
                            : p.yards_per_core
                          }
                        </td>

                        {/* Total Yards */}
                        <td className="p-3 text-center">
                          <span className="font-black text-[#22c55e]">
                            {isEd ? calcY : p.yards_used}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isEd ? (
                              <>
                                <button
                                  onClick={() => saveEdit(p._id)}
                                  className="p-1.5 rounded-lg text-[#22c55e] hover:bg-[#22c55e]/10 transition"
                                >
                                  <Check size={13}/>
                                </button>
                                <button
                                  onClick={() => setEditId(null)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition"
                                >
                                  <X size={13}/>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => { setEditId(p._id); setEditData({...p}); }}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition"
                                >
                                  <Pencil size={13}/>
                                </button>
                                <button
                                  onClick={() => handleDelete(p)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition"
                                >
                                  <Trash2 size={13}/>
                                </button>
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
          )}
        </div>
      )}
    </div>
  );
};

export default Production;
